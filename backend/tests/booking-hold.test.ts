import crypto from 'node:crypto';
import { AgeRating } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { voucherService } from '../src/modules/vouchers/voucher.service';
import { CoreFixture, FixtureAccount, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();
type OrderView = { id: string; expiresAt: string; total: number; items: { seatId: string; price: number }[] };

function holdTest(name: string, scenario: (fixture: CoreFixture, comboIds: string[]) => Promise<void>, rating: AgeRating = AgeRating.T18) {
  it(name, async () => {
    requireDedicatedTestDatabase();
    const fixture = await CoreFixture.create(rating);
    const comboIds: string[] = [];
    try { await scenario(fixture, comboIds); }
    finally {
      await fixture.cleanup();
      await prisma.combo.deleteMany({ where: { id: { in: comboIds } } });
    }
  }, 30_000);
}

async function hold(f: CoreFixture, seats = [0], account = f.accounts.buyer, extra: Record<string, unknown> = {}): Promise<OrderView> {
  const response = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${account.token}`).send({
    showtimeId: f.showtimeId, seatIds: seats.map(index => f.seats[index].id), ageConfirmed: true, ...extra,
  });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body.data;
}

function edit(order: OrderView, account: FixtureAccount, body: Record<string, unknown>) {
  return request(app).patch(`/api/v1/orders/${order.id}`).set('Authorization', `Bearer ${account.token}`).send(body);
}

async function combo(f: CoreFixture, ids: string[]) {
  const id = crypto.randomUUID(); ids.push(id);
  return prisma.combo.create({ data: { id, name: f.namespace, price: 30_000, isActive: true } });
}

describe('Interactive booking holds: owner editing and atomic seat selection', () => {
  holdTest('adding and removing seats updates the same order and frees only removed seats without extending its deadline', async f => {
    const order = await hold(f);
    const added = await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[10].id] });
    expect(added.status, JSON.stringify(added.body)).toBe(200);
    expect(added.body.data).toMatchObject({ id: order.id, total: 220_000, expiresAt: order.expiresAt });
    expect(added.body.data.items).toHaveLength(2);
    const removed = await edit(order, f.accounts.buyer, { seatIds: [f.seats[10].id] });
    expect(removed.status).toBe(200);
    expect(removed.body.data).toMatchObject({ total: 120_000, expiresAt: order.expiresAt });
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[0].id } } }))
      .toMatchObject({ status: 'AVAILABLE', orderId: null, holdExpiresAt: null });
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[10].id } } }))
      .toMatchObject({ status: 'HELD', orderId: order.id, holdExpiresAt: new Date(order.expiresAt) });
    expect(await prisma.pendingOrderGuard.count({ where: { orderId: order.id } })).toBe(1);
  });

  holdTest('another customer and even an administrator cannot modify an owner hold', async f => {
    const order = await hold(f);
    for (const account of [f.accounts.other, f.accounts.admin]) {
      expect((await edit(order, account, { seatIds: [f.seats[1].id] })).status).toBe(403);
    }
    expect((await request(app).patch(`/api/v1/orders/${order.id}`).send({ ageConfirmed: true })).status).toBe(401);
    expect(await prisma.orderItem.findMany({ where: { orderId: order.id } })).toHaveLength(1);
  });

  for (const mode of ['empty', 'duplicate', 'overLimit', 'foreign'] as const) {
    holdTest(`rejects ${mode} seat selection without releasing existing hold`, async f => {
      const order = await hold(f);
      const seatIds = mode === 'empty' ? [] : mode === 'duplicate' ? [f.seats[0].id, f.seats[0].id]
        : mode === 'overLimit' ? f.seats.slice(0, 9).map(seat => seat.id) : [crypto.randomUUID()];
      expect((await edit(order, f.accounts.buyer, { seatIds })).status).toBe(400);
      expect(await prisma.showtimeSeat.count({ where: { orderId: order.id, status: 'HELD' } })).toBe(1);
    });
  }

  holdTest('unavailable added seat rolls back the removal and preserves the original order total', async f => {
    const mine = await hold(f);
    const foreign = await hold(f, [2], f.accounts.other);
    const response = await edit(mine, f.accounts.buyer, { seatIds: [f.seats[1].id, f.seats[2].id] });
    expect(response.status).toBe(409);
    expect(await prisma.order.findUnique({ where: { id: mine.id } })).toMatchObject({ total: 100_000 });
    expect(await prisma.showtimeSeat.count({ where: { orderId: mine.id, status: 'HELD' } })).toBe(1);
    expect(await prisma.showtimeSeat.count({ where: { orderId: foreign.id, status: 'HELD' } })).toBe(1);
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[1].id } } }))
      .toMatchObject({ status: 'AVAILABLE', orderId: null });
  });

  holdTest('two owners racing to add the same available seat produce one winner and preserve the losing selection', async f => {
    const first = await hold(f, [0]);
    const second = await hold(f, [1], f.accounts.other);
    const results = await Promise.all([
      edit(first, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[2].id] }),
      edit(second, f.accounts.other, { seatIds: [f.seats[1].id, f.seats[2].id] }),
    ]);
    expect(results.map(response => response.status).sort()).toEqual([200, 409]);
    const winner = results[0].status === 200 ? first : second;
    const loser = winner === first ? second : first;
    expect(await prisma.showtimeSeat.count({ where: { orderId: winner.id, status: 'HELD' } })).toBe(2);
    expect(await prisma.showtimeSeat.count({ where: { orderId: loser.id, status: 'HELD' } })).toBe(1);
    expect(await prisma.orderItem.count({ where: { orderId: loser.id } })).toBe(1);
  });

  holdTest('unchanged ticket snapshots retain their charged price while newly added seats use current pricing', async f => {
    const order = await hold(f);
    await prisma.priceRule.updateMany({ where: { cinemaId: f.cinemaId }, data: { basePrice: 200_000 } });
    const response = await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id] });
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(300_000);
    expect(response.body.data.items.find((item: { seatId: string }) => item.seatId === f.seats[0].id).price).toBe(100_000);
    expect(response.body.data.items.find((item: { seatId: string }) => item.seatId === f.seats[1].id).price).toBe(200_000);
  });

  for (const status of ['EXPIRED', 'PAID', 'CANCELLED'] as const) {
    holdTest(`cannot modify an order after ${status}`, async f => {
      const order = await hold(f);
      if (status === 'EXPIRED') await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
      if (status === 'CANCELLED') await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({ pendingOnly: true });
      if (status === 'PAID') {
        const started = await request(app).post(`/api/v1/orders/${order.id}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
        const payment = started.body.data.payment;
        expect((await request(app).get('/api/v1/payment/vnpay/ipn').query(f.signCallback(payment.txnRef, payment.amount))).body.RspCode).toBe('00');
      }
      const response = await edit(order, f.accounts.buyer, { seatIds: [f.seats[1].id] });
      expect(response.status).toBe(status === 'EXPIRED' ? 410 : 409);
      expect(await prisma.orderItem.count({ where: { orderId: order.id } })).toBe(1);
    });
  }

  holdTest('locks edits once a gateway payment is pending, then permits edits after the failed IPN', async f => {
    const order = await hold(f);
    const started = await request(app).post(`/api/v1/orders/${order.id}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    const payment = started.body.data.payment;
    const blocked = await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id] });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('PAYMENT_IN_PROGRESS');
    expect((await request(app).get('/api/v1/payment/vnpay/ipn').query(f.signCallback(payment.txnRef, payment.amount, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }))).body.RspCode).toBe('00');
    expect((await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id] })).status).toBe(200);
  });

  holdTest('payment initiation never charges a stale total when editing completes between its read and write', async f => {
    const order = await hold(f);
    const read = prisma.order.findUnique.bind(prisma.order);
    let competingEdit: Awaited<ReturnType<typeof edit>> | undefined;
    const seam = vi.spyOn(prisma.order, 'findUnique').mockImplementation(args => read(args).then(async value => {
      // Preserve the real read, but allow a real edit to commit before a former unguarded payment write.
      if (!competingEdit && args.where?.id === order.id && args.include?.showtime === true) {
        competingEdit = await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id] });
      }
      return value;
    }) as ReturnType<typeof prisma.order.findUnique>);
    let started;
    try {
      started = await request(app).post(`/api/v1/orders/${order.id}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    } finally { seam.mockRestore(); }
    expect(started.status, JSON.stringify(started.body)).toBe(200);
    // A payment implementation that reads only inside the transaction has already locked edits.
    competingEdit ??= await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id] });
    expect([200, 409]).toContain(competingEdit.status);
    const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(started.body.data.payment.amount).toBe(current.total);
    expect(await prisma.payment.findUniqueOrThrow({ where: { id: started.body.data.payment.id } }))
      .toMatchObject({ amount: current.total, status: 'PENDING' });
  });

  holdTest('concurrent payment initiations use unique attempts and prevent subsequent seat edits', async f => {
    const order = await hold(f);
    const pay = () => request(app).post(`/api/v1/orders/${order.id}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    const responses = await Promise.all([pay(), pay()]);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    const payments = await prisma.payment.findMany({ where: { orderId: order.id }, orderBy: { attemptNo: 'asc' } });
    expect(payments.map(payment => payment.attemptNo)).toEqual([1, 2]);
    expect(payments.map(payment => payment.amount)).toEqual([100_000, 100_000]);
    expect((await edit(order, f.accounts.buyer, { seatIds: [f.seats[1].id] })).status).toBe(409);
  });

  holdTest('rechecks age confirmation when changing the hold', async f => {
    const order = await hold(f);
    expect((await edit(order, f.accounts.buyer, { ageConfirmed: false })).status).toBe(400);
    expect((await edit(order, f.accounts.buyer, { ageConfirmed: true })).status).toBe(200);
  });

  holdTest('BLOCKED seats remain unselectable when a stale database row still says AVAILABLE', async f => {
    await prisma.showtimeSeat.update({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[1].id } }, data: { seatType: 'BLOCKED', status: 'AVAILABLE' } });
    const order = await hold(f);
    expect((await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id] })).status).toBe(400);
    const created = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${f.accounts.other.token}`).send({ showtimeId: f.showtimeId, seatIds: [f.seats[1].id], ageConfirmed: true });
    expect(created.status).toBe(400);
    expect(created.body.error.code).toBe('INVALID_SEATS');
    const map = await request(app).get(`/api/v1/showtimes/${f.showtimeId}/seats`);
    expect(map.body.data.seats.find((seat: { seatId: string }) => seat.seatId === f.seats[1].id).status).toBe('BLOCKED');
  });

  holdTest('counter booking cannot sell a BLOCKED snapshot that accidentally says AVAILABLE', async f => {
    await prisma.showtimeSeat.update({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[1].id } }, data: { seatType: 'BLOCKED', status: 'AVAILABLE' } });
    const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({
      showtimeId: f.showtimeId, seatIds: [f.seats[1].id], paymentMethod: 'CASH', ageConfirmed: true,
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SEATS');
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
  });
});

describe('Interactive checkout: combos, vouchers, and owner-aware seat polling', () => {
  holdTest('adds combos and a voucher to an existing hold and computes totals on the server', async (f, ids) => {
    const order = await hold(f);
    const product = await combo(f, ids);
    const voucher = await f.voucher();
    const response = await edit(order, f.accounts.buyer, { combos: [{ comboId: product.id, quantity: 2 }], voucherCode: voucher.code });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toMatchObject({ ticketSubtotal: 100_000, comboSubtotal: 60_000, subtotal: 160_000, discount: 10_000, total: 150_000, expiresAt: order.expiresAt });
    expect(await prisma.voucherRedemption.findUnique({ where: { orderId_voucherId: { orderId: order.id, voucherId: voucher.id } } }))
      .toMatchObject({ status: 'RESERVED', discount: 10_000, reservedUntil: new Date(order.expiresAt) });
  });

  holdTest('preserves unchanged combo snapshots even if catalog price changes and combos are omitted', async (f, ids) => {
    const product = await combo(f, ids);
    const order = await hold(f, [0], f.accounts.buyer, { combos: [{ comboId: product.id, quantity: 2 }] });
    await prisma.combo.update({ where: { id: product.id }, data: { price: 80_000, name: 'Updated menu' } });
    for (const body of [{ seatIds: [f.seats[0].id, f.seats[1].id] }, { combos: [{ comboId: product.id, quantity: 2 }] }]) {
      const response = await edit(order, f.accounts.buyer, body);
      expect(response.status).toBe(200);
      expect(response.body.data.comboSubtotal).toBe(60_000);
      expect(response.body.data.combos[0]).toMatchObject({ name: f.namespace, unitPrice: 30_000, quantity: 2 });
    }
  });

  holdTest('retains its own final voucher quota and recomputes the discount after a seat change', async f => {
    const voucher = await f.voucher();
    await prisma.voucher.update({ where: { id: voucher.id }, data: { totalLimit: 1, perUserLimit: 1, type: 'PERCENT', value: 10 } });
    const order = await hold(f, [0], f.accounts.buyer, { voucherCode: voucher.code });
    const response = await edit(order, f.accounts.buyer, { seatIds: [f.seats[0].id, f.seats[1].id], voucherCode: voucher.code });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ discount: 20_000, total: 180_000 });
    expect(await prisma.voucherRedemption.count({ where: { orderId: order.id, status: 'RESERVED' } })).toBe(1);
  });

  holdTest('null voucher and an empty combo list release the reservation and remove their totals', async (f, ids) => {
    const product = await combo(f, ids);
    const voucher = await f.voucher();
    await prisma.voucher.update({ where: { id: voucher.id }, data: { totalLimit: 1 } });
    const order = await hold(f, [0], f.accounts.buyer, { combos: [{ comboId: product.id, quantity: 1 }], voucherCode: voucher.code });
    const response = await edit(order, f.accounts.buyer, { combos: [], voucherCode: null });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ combos: [], voucher: null, comboSubtotal: 0, discount: 0, total: 100_000 });
    expect(await prisma.voucherRedemption.findUnique({ where: { orderId_voucherId: { orderId: order.id, voucherId: voucher.id } } })).toMatchObject({ status: 'RELEASED' });
    const next = await hold(f, [1], f.accounts.other, { voucherCode: voucher.code });
    expect(next.total).toBe(90_000);
  });

  holdTest('two edits competing for the final voucher quota create exactly one reservation', async f => {
    const voucher = await f.voucher();
    await prisma.voucher.update({ where: { id: voucher.id }, data: { totalLimit: 1 } });
    const mine = await hold(f);
    const other = await hold(f, [1], f.accounts.other);
    const responses = await Promise.all([
      edit(mine, f.accounts.buyer, { voucherCode: voucher.code }),
      edit(other, f.accounts.other, { voucherCode: voucher.code }),
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 400]);
    expect(responses.find(response => response.status === 400)!.body.error.code).toBe('VOUCHER_LIMIT_EXCEEDED');
    expect(await prisma.voucherRedemption.count({ where: { voucherId: voucher.id, status: 'RESERVED' } })).toBe(1);
    const winner = responses[0].status === 200 ? mine : other;
    const loser = winner === mine ? other : mine;
    expect(await prisma.order.findUniqueOrThrow({ where: { id: winner.id } })).toMatchObject({ discount: 10_000, total: 90_000 });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: loser.id } })).toMatchObject({ discount: 0, total: 100_000 });
  });

  holdTest('switching vouchers releases the previous quota and returning to that voucher reuses only one reservation', async f => {
    const first = await f.voucher();
    const second = await prisma.voucher.create({ data: {
      cinemaId: f.cinemaId, code: `${f.namespace.toUpperCase()}-SECOND`, name: f.namespace,
      type: 'FIXED', value: 20_000, scope: 'ORDER', totalLimit: 1, perUserLimit: 1,
      validFrom: new Date(Date.now() - 60_000), validTo: new Date(Date.now() + 86_400_000),
    } });
    const order = await hold(f, [0], f.accounts.buyer, { voucherCode: first.code });
    const changed = await edit(order, f.accounts.buyer, { voucherCode: second.code });
    expect(changed.status).toBe(200);
    expect(changed.body.data.total).toBe(80_000);
    expect(await prisma.voucherRedemption.findUnique({ where: { orderId_voucherId: { orderId: order.id, voucherId: first.id } } })).toMatchObject({ status: 'RELEASED' });
    expect((await edit(order, f.accounts.buyer, { voucherCode: first.code })).status).toBe(200);
    expect(await prisma.voucherRedemption.count({ where: { orderId: order.id, status: 'RESERVED' } })).toBe(1);
    expect(await prisma.voucherRedemption.findUnique({ where: { orderId_voucherId: { orderId: order.id, voucherId: second.id } } })).toMatchObject({ status: 'RELEASED' });
  });

  holdTest('an edit whose deadline expires while validating its voucher rolls back all seat changes', async f => {
    const voucher = await f.voucher();
    const order = await hold(f);
    const validate = voucherService.lockAndValidate.bind(voucherService);
    const seam = vi.spyOn(voucherService, 'lockAndValidate').mockImplementationOnce(async (...args) => {
      const result = await validate(...args);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(order.expiresAt).getTime() + 1);
      return result;
    });
    let response;
    try { response = await edit(order, f.accounts.buyer, { seatIds: [f.seats[1].id], voucherCode: voucher.code }); }
    finally { seam.mockRestore(); vi.useRealTimers(); }
    expect(response.status).toBe(410);
    expect(await prisma.orderItem.findMany({ where: { orderId: order.id } })).toHaveLength(1);
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[0].id } } })).toMatchObject({ status: 'HELD', orderId: order.id });
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[1].id } } })).toMatchObject({ status: 'AVAILABLE', orderId: null });
    expect(await prisma.voucherRedemption.count({ where: { orderId: order.id } })).toBe(0);
  });

  holdTest('invalid combos or a failing voucher leave every existing seat and total intact', async f => {
    const order = await hold(f);
    for (const body of [{ combos: [{ comboId: crypto.randomUUID(), quantity: 1 }] }, { voucherCode: 'MISSING-' + f.namespace }]) {
      const response = await edit(order, f.accounts.buyer, { seatIds: [f.seats[1].id], ...body });
      expect(response.status).toBe('combos' in body ? 400 : 404);
      expect(response.body.error.code).toBe('combos' in body ? 'INVALID_COMBOS' : 'VOUCHER_NOT_FOUND');
      expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ total: 100_000 });
      expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[0].id } } })).toMatchObject({ status: 'HELD', orderId: order.id });
    }
  });

  holdTest('only the owner sees a live hold as theirs and the public map reveals no customer or order identifiers', async f => {
    const order = await hold(f);
    for (const account of [undefined, f.accounts.other, f.accounts.buyer]) {
      const req = request(app).get(`/api/v1/showtimes/${f.showtimeId}/seats`);
      if (account) req.set('Authorization', `Bearer ${account.token}`);
      const response = await req;
      expect(response.status).toBe(200);
      const seat = response.body.data.seats.find((item: { seatId: string }) => item.seatId === f.seats[0].id);
      expect(seat).toMatchObject({ status: 'HELD', heldByCurrentUser: account?.id === f.accounts.buyer.id });
      expect(seat).not.toHaveProperty('orderId');
      expect(seat).not.toHaveProperty('userId');
    }
    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    const expired = await request(app).get(`/api/v1/showtimes/${f.showtimeId}/seats`).set('Authorization', `Bearer ${f.accounts.buyer.token}`);
    expect(expired.body.data.seats.find((item: { seatId: string }) => item.seatId === f.seats[0].id))
      .toMatchObject({ status: 'AVAILABLE', heldByCurrentUser: false });
  });
});
