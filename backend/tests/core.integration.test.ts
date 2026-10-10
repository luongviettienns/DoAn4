import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AgeRating } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { workerService } from '../src/modules/worker/worker.service';
import { CoreFixture, FixtureAccount, fixturePassword, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();
type OrderView = { id: string; total: number; expiresAt: string; items: { seatId: string }[] };
type PaymentView = { id: string; txnRef: string; amount: number };

function coreTest(name: string, scenario: (fixture: CoreFixture) => Promise<void>, ageRating: AgeRating = AgeRating.T18) {
  it(name, async () => {
    // The dedicated runner plus UUID fixtures are independent isolation layers.
    requireDedicatedTestDatabase();
    const fixture = await CoreFixture.create(ageRating);
    try {
      await scenario(fixture);
    } finally {
      await fixture.cleanup();
    }
  }, 30_000);
}

function booking(fixture: CoreFixture, account = fixture.accounts.buyer, seatIndices = [0], extra: Record<string, unknown> = {}) {
  return request(app).post('/api/v1/orders').set('Authorization', `Bearer ${account.token}`).send({
    showtimeId: fixture.showtimeId, seatIds: seatIndices.map((index) => fixture.seats[index].id), ageConfirmed: true, ...extra,
  });
}

async function reserve(fixture: CoreFixture, account = fixture.accounts.buyer, seats = [0], extra: Record<string, unknown> = {}): Promise<OrderView> {
  const response = await booking(fixture, account, seats, extra);
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body.data;
}

async function initiate(order: OrderView, account: FixtureAccount): Promise<PaymentView> {
  const response = await request(app).post(`/api/v1/orders/${order.id}/pay`).set('Authorization', `Bearer ${account.token}`).send({ method: 'VNPAY', locale: 'vn' });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  return response.body.data.payment;
}

function ipn(fixture: CoreFixture, payment: PaymentView, overrides: Record<string, string> = {}) {
  return request(app).get('/api/v1/payment/vnpay/ipn').query(fixture.signCallback(payment.txnRef, payment.amount, overrides));
}

async function paidOrder(fixture: CoreFixture, seats = [0], extra: Record<string, unknown> = {}) {
  const order = await reserve(fixture, fixture.accounts.buyer, seats, extra);
  const payment = await initiate(order, fixture.accounts.buyer);
  const response = await ipn(fixture, payment);
  expect(response.body.RspCode, JSON.stringify(response.body)).toBe('00');
  const tickets = await prisma.ticket.findMany({ where: { orderId: order.id }, orderBy: { seatId: 'asc' } });
  expect(tickets).toHaveLength(seats.length);
  return { order, payment, tickets };
}

async function assertReleased(orderId: string) {
  expect(await prisma.showtimeSeat.count({ where: { orderId } })).toBe(0);
  expect(await prisma.pendingOrderGuard.count({ where: { orderId } })).toBe(0);
}

describe('Core integration: authorization and ownership (F01, F06, F07, F08)', () => {
  coreTest('registration ignores an injected ADMIN role and issues a customer session', async (f) => {
    const input = f.registration();
    const response = await request(app).post('/api/v1/auth/register').send({ ...input, role: 'ADMIN' });
    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({ email: input.email, role: 'CUSTOMER' });
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${response.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe('CUSTOMER');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  coreTest('login accepts the real password and rejects a wrong password', async (f) => {
    const { buyer } = f.accounts;
    const valid = await request(app).post('/api/v1/auth/login').send({ email: buyer.email, password: fixturePassword });
    expect(valid.status).toBe(200);
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${valid.body.data.accessToken}`);
    expect(me.body.data.id).toBe(buyer.id);
    const invalid = await request(app).post('/api/v1/auth/login').send({ email: buyer.email, password: 'WrongPassword9' });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  for (const invalid of [
    { email: 'invalid-address' }, { phone: '123' }, { password: 'short' },
  ]) {
    coreTest(`registration rejects invalid ${Object.keys(invalid)[0]} without creating a user`, async (f) => {
      const input = { ...f.registration(), ...invalid };
      if ('email' in invalid) input.email = `invalid-${f.namespace}`;
      // Even if validation regresses and accepts the input, finally removes that account.
      f.extraEmails.push(input.email);
      const response = await request(app).post('/api/v1/auth/register').send(input);
      expect(response.status).toBe(400);
      expect(await prisma.user.count({ where: { email: input.email } })).toBe(0);
    });
  }

  for (const field of ['email', 'phone'] as const) {
    coreTest(`registration rejects a duplicate ${field}`, async (f) => {
      const input = { ...f.registration(), [field]: f.accounts.buyer[field] };
      expect((await request(app).post('/api/v1/auth/register').send(input)).status).toBe(409);
      expect(await prisma.user.count({ where: { email: { endsWith: `@${f.namespace}.example.test` } } })).toBe(6);
    });
  }

  coreTest('logout revokes the refresh cookie and prevents session renewal', async (f) => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: f.accounts.buyer.email, password: fixturePassword });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh')).status).toBe(401);
  });

  coreTest('protected routes reject missing, malformed, and expired access tokens', async (f) => {
    const expired = jwt.sign({ userId: f.accounts.buyer.id, role: 'CUSTOMER' }, process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars', { expiresIn: -1 });
    for (const token of [undefined, 'not-a-jwt', expired]) {
      const req = request(app).get('/api/v1/auth/me');
      if (token) req.set('Authorization', `Bearer ${token}`);
      expect((await req).status).toBe(401);
    }
  });

  coreTest('locking an account invalidates access despite an already issued JWT', async (f) => {
    await prisma.user.update({ where: { id: f.accounts.buyer.id }, data: { status: 'LOCKED' } });
    const response = await booking(f);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
  });

  coreTest('refresh rotates a session and reuse revokes the successor', async (f) => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: f.accounts.buyer.email, password: fixturePassword });
    const original = login.headers['set-cookie'][0].split(';')[0];
    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', original);
    expect(rotated.status).toBe(200);
    const successor = rotated.headers['set-cookie'][0].split(';')[0];
    expect(successor).not.toBe(original);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', original)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', successor)).status).toBe(401);
  });

  coreTest('another customer cannot read, pay, or cancel an owned order', async (f) => {
    const order = await reserve(f);
    for (const url of [`/api/v1/orders/${order.id}`, `/api/v1/me/orders/${order.id}`]) {
      expect((await request(app).get(url).set('Authorization', `Bearer ${f.accounts.other.token}`)).status).toBe(403);
    }
    for (const action of ['pay', 'cancel']) {
      expect((await request(app).post(`/api/v1/orders/${order.id}/${action}`).set('Authorization', `Bearer ${f.accounts.other.token}`).send({})).status).toBe(403);
    }
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('booking history and pending order lookups return only the signed-in customer orders', async (f) => {
    const owned = await reserve(f, f.accounts.buyer, [0]);
    const foreign = await reserve(f, f.accounts.other, [1]);
    const history = await request(app).get('/api/v1/me/orders').set('Authorization', `Bearer ${f.accounts.buyer.token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.items.map((order: { id: string }) => order.id)).toEqual([owned.id]);
    const pending = await request(app).get('/api/v1/orders/pending').set('Authorization', `Bearer ${f.accounts.buyer.token}`);
    expect(pending.body.data.id).toBe(owned.id);
    expect(pending.body.data.id).not.toBe(foreign.id);
  });

  coreTest('customers cannot sell counter tickets or check in tickets', async (f) => {
    const counter = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({
      showtimeId: f.showtimeId, seatIds: [f.seats[0].id], paymentMethod: 'CASH', ageConfirmed: true,
    });
    expect(counter.status).toBe(403);
    const checkin = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({ ticketCode: 'TK0123456789' });
    expect(checkin.status).toBe(403);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
  });

  for (const name of ['unassignedStaff', 'foreignStaff'] as const) {
    coreTest(`${name} cannot sell counter tickets at an unauthorized cinema`, async (f) => {
      const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${f.accounts[name].token}`).send({
        showtimeId: f.showtimeId, seatIds: [f.seats[0].id], paymentMethod: 'CASH', ageConfirmed: true,
      });
      expect(response.status).toBe(403);
      expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
    });

    coreTest(`${name} cannot read or cancel orders outside their cinema scope`, async (f) => {
      const order = await reserve(f);
      const read = await request(app).get(`/api/v1/orders/${order.id}`).set('Authorization', `Bearer ${f.accounts[name].token}`);
      expect(read.status).toBe(403);
      const cancel = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts[name].token}`).send({});
      expect(cancel.status).toBe(403);
      expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    });
  }

  coreTest('customers cannot read or pay for a guest counter order with no account owner', async (f) => {
    const created = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({
      showtimeId: f.showtimeId, seatIds: [f.seats[0].id], paymentMethod: 'CASH', ageConfirmed: true,
    });
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    expect((await prisma.order.findUnique({ where: { id: orderId } }))?.userId).toBeNull();
    const read = await request(app).get(`/api/v1/orders/${orderId}`).set('Authorization', `Bearer ${f.accounts.buyer.token}`);
    expect(read.status).toBe(403);
    const pay = await request(app).post(`/api/v1/orders/${orderId}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    expect(pay.status).toBe(403);
  });

  coreTest('counter POS payments are recorded as CARD and issue valid tickets', async (f) => {
    const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({
      showtimeId: f.showtimeId, seatIds: [f.seats[0].id], paymentMethod: 'POS', ageConfirmed: true,
    });
    expect(response.status).toBe(201);
    const orderId = response.body.data.id;
    expect(await prisma.payment.findFirst({ where: { orderId } })).toMatchObject({
      provider: 'COUNTER', method: 'CARD', status: 'SUCCESS', amount: 100_000,
    });
    expect(await prisma.ticket.findFirst({ where: { orderId } })).toMatchObject({ status: 'VALID' });
    expect(await prisma.showtimeSeat.count({ where: { orderId, status: 'SOLD' } })).toBe(1);
  });

  coreTest('counter sales reject a known underage member identified by customer phone', async (f) => {
    await prisma.user.update({ where: { id: f.accounts.buyer.id }, data: { birthDate: new Date(new Date().getUTCFullYear() - 12, 0, 1) } });
    const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({
      showtimeId: f.showtimeId, seatIds: [f.seats[0].id], customerPhone: f.accounts.buyer.phone,
      paymentMethod: 'CASH', ageConfirmed: true,
    });
    expect(response.status).toBe(400);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
    expect(await prisma.showtimeSeat.count({ where: { showtimeId: f.showtimeId, status: 'SOLD' } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
  });

  coreTest('anonymous users cannot simulate a payment', async (f) => {
    const order = await reserve(f);
    const response = await request(app).post('/api/v1/payment/simulate-mock').send({ orderId: order.id });
    expect(response.status).toBe(401);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });
});

describe('Core integration: seat reservation boundaries and races (F03, BR01, BR02, BR03, BR06, BR07)', () => {
  for (const count of [0, 9]) {
    coreTest(`rejects ${count} selected seats without creating an order or hold`, async (f) => {
      const response = await booking(f, f.accounts.buyer, Array.from({ length: count }, (_, index) => index));
      expect(response.status).toBe(400);
      expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
      expect(await prisma.showtimeSeat.count({ where: { showtimeId: f.showtimeId, status: 'HELD' } })).toBe(0);
    });
  }

  coreTest('accepts exactly eight seats with the stated prices and a ten-minute hold', async (f) => {
    const before = Date.now();
    const order = await reserve(f, f.accounts.buyer, [0, 1, 2, 3, 4, 5, 6, 7]);
    const after = Date.now();
    expect(order.items).toHaveLength(8);
    expect(order.total).toBe(800_000);
    expect(new Date(order.expiresAt).getTime()).toBeGreaterThanOrEqual(before + 600_000);
    expect(new Date(order.expiresAt).getTime()).toBeLessThanOrEqual(after + 600_000);
    const holds = await prisma.showtimeSeat.findMany({ where: { orderId: order.id } });
    expect(holds).toHaveLength(8);
    for (const hold of holds) {
      expect(hold.status).toBe('HELD');
      expect(hold.holdExpiresAt?.toISOString()).toBe(order.expiresAt);
    }
    expect(await prisma.pendingOrderGuard.count({ where: { orderId: order.id } })).toBe(1);
  });

  coreTest('rejects duplicate seats without charging twice or creating a hold', async (f) => {
    const response = await booking(f, f.accounts.buyer, [0, 0]);
    expect(response.status).toBe(400);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
    expect(await prisma.showtimeSeat.count({ where: { showtimeId: f.showtimeId, status: 'HELD' } })).toBe(0);
  });

  coreTest('rejects a seat that does not belong to the selected showtime', async (f) => {
    const response = await booking(f, f.accounts.buyer, [], { seatIds: [crypto.randomUUID()] });
    expect(response.status).toBe(400);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
  });

  coreTest('rejects a closed showtime without creating holds', async (f) => {
    await prisma.showtime.update({ where: { id: f.showtimeId }, data: { status: 'CLOSED' } });
    expect((await booking(f)).status).toBe(400);
    expect(await prisma.showtimeSeat.count({ where: { showtimeId: f.showtimeId, status: 'HELD' } })).toBe(0);
  });

  coreTest('a competing seat claim rolls back an entire multi-seat reservation', async (f) => {
    let availableSeatId = '';
    let competingSeatId = '';
    let competingOrderId = '';
    const originalRead = prisma.showtimeSeat.findMany.bind(prisma.showtimeSeat);
    const seatRead = vi.spyOn(prisma.showtimeSeat, 'findMany').mockImplementationOnce((args) => {
      return originalRead(args).then(async (selected) => {
        expect(selected).toHaveLength(2);
        // The competing order takes the LAST item returned by the real query, so
        // the first claim succeeds before the later conflict requires rollback.
        availableSeatId = selected[0].seatId;
        competingSeatId = selected[1].seatId;
        const index = f.seats.findIndex((seat) => seat.id === competingSeatId);
        competingOrderId = (await reserve(f, f.accounts.other, [index])).id;
        return selected;
      }) as ReturnType<typeof prisma.showtimeSeat.findMany>;
    });
    try {
      expect((await booking(f, f.accounts.buyer, [0, 1])).status).toBe(409);
    } finally {
      seatRead.mockRestore();
    }
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(1);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId, userId: f.accounts.buyer.id } })).toBe(0);
    expect(await prisma.pendingOrderGuard.count({ where: { showtimeId: f.showtimeId, userId: f.accounts.buyer.id } })).toBe(0);
    expect(await prisma.orderItem.count({ where: { showtimeId: f.showtimeId } })).toBe(1);
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: availableSeatId } } })).toMatchObject({ status: 'AVAILABLE', orderId: null });
    expect(await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: competingSeatId } } })).toMatchObject({ status: 'HELD', orderId: competingOrderId });
  });

  for (const ageConfirmed of [undefined, false]) {
    coreTest(`restricted movies reject ${ageConfirmed === undefined ? 'missing' : 'false'} age confirmation`, async (f) => {
      const response = await booking(f, f.accounts.buyer, [0], { ageConfirmed });
      expect(response.status).toBe(400);
      expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
    });
  }

  coreTest('restricted movies reject a known underage customer even when confirmation is checked', async (f) => {
    await prisma.user.update({ where: { id: f.accounts.buyer.id }, data: { birthDate: new Date(new Date().getUTCFullYear() - 12, 0, 1) } });
    const response = await booking(f);
    expect(response.status).toBe(400);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
  });

  coreTest('unrestricted movies allow an order without age confirmation', async (f) => {
    const order = await reserve(f, f.accounts.buyer, [0], { ageConfirmed: false });
    expect(order.total).toBe(100_000);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.ageConfirmedAt).toBeNull();
  }, AgeRating.P);

  coreTest('prohibited C-rated movies cannot be booked', async (f) => {
    expect((await booking(f)).status).toBe(400);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
  }, AgeRating.C);

  for (const minutesUntilStart of [-1, 10]) {
    coreTest(`rejects booking ${minutesUntilStart} minutes before start within the fifteen-minute cutoff`, async (f) => {
      const showtimeId = await f.addShowtime(new Date(Date.now() + minutesUntilStart * 60_000));
      expect((await booking(f, f.accounts.buyer, [0], { showtimeId })).status).toBe(400);
      expect(await prisma.order.count({ where: { showtimeId } })).toBe(0);
    });
  }

  coreTest('two customers racing for the same seat produce one order and one conflict', async (f) => {
    const responses = await Promise.all([booking(f, f.accounts.buyer), booking(f, f.accounts.other)]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const winner = responses.find((response) => response.status === 201)!.body.data;
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(1);
    const slot = await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[0].id } } });
    expect(slot).toMatchObject({ status: 'HELD', orderId: winner.id });
    expect(await prisma.orderItem.count({ where: { showtimeId: f.showtimeId } })).toBe(1);
  });

  coreTest('concurrent same-customer orders retain one pending guard and roll back losing holds', async (f) => {
    const responses = await Promise.all([booking(f, f.accounts.buyer, [0]), booking(f, f.accounts.buyer, [1])]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(1);
    expect(await prisma.pendingOrderGuard.count({ where: { userId: f.accounts.buyer.id, showtimeId: f.showtimeId } })).toBe(1);
    expect(await prisma.showtimeSeat.count({ where: { showtimeId: f.showtimeId, status: 'HELD' } })).toBe(1);
  });

  coreTest('stale pending-guard cleanup cannot overwrite an intervening completed payment', async (f) => {
    const old = await reserve(f);
    const payment = await initiate(old, f.accounts.buyer);
    const past = new Date(Date.now() - 60_000);
    await prisma.order.update({ where: { id: old.id }, data: { expiresAt: past } });
    await prisma.showtimeSeat.updateMany({ where: { orderId: old.id }, data: { holdExpiresAt: past } });

    // Return the original expired guard snapshot only after a real signed IPN
    // commits. Cleanup must recheck the current order under its transaction lock.
    const originalRead = prisma.pendingOrderGuard.findUnique.bind(prisma.pendingOrderGuard);
    const guardRead = vi.spyOn(prisma.pendingOrderGuard, 'findUnique').mockImplementationOnce((args) => {
      return originalRead(args).then(async (guard) => {
        expect(guard?.orderId).toBe(old.id);
        expect((await ipn(f, payment)).body.RspCode).toBe('00');
        return guard;
      }) as ReturnType<typeof prisma.pendingOrderGuard.findUnique>;
    });
    try {
      expect((await booking(f, f.accounts.buyer, [1])).status).toBe(201);
    } finally {
      guardRead.mockRestore();
    }
    expect(await prisma.order.findUnique({ where: { id: old.id } })).toMatchObject({ status: 'PAID_UNFULFILLED', refundStatus: 'PENDING' });
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('SUCCESS');
    expect(await prisma.ticket.count({ where: { orderId: old.id } })).toBe(0);
  });
});

describe('Core integration: payment lifecycle (F04, F05, F06, F16, BR08, BR12)', () => {
  coreTest('pending-only checkout cancellation releases a pending order normally', async (f) => {
    const order = await reserve(f);
    const response = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({ pendingOnly: true });
    expect(response.status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('CANCELLED');
    await assertReleased(order.id);
    expect(await prisma.refundRequest.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('pending-only checkout cancellation cannot refund a payment that already completed', async (f) => {
    const { order } = await paidOrder(f);
    const response = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({ pendingOnly: true });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ORDER_NOT_PENDING');
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: 'PAID', refundStatus: 'NONE' });
    expect(await prisma.showtimeSeat.count({ where: { orderId: order.id, status: 'SOLD' } })).toBe(1);
    expect(await prisma.ticket.findFirst({ where: { orderId: order.id } })).toMatchObject({ status: 'VALID' });
    expect(await prisma.refundRequest.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('cancelling a pending order releases seats, guard, payment attempt, and voucher', async (f) => {
    const voucher = await f.voucher();
    const order = await reserve(f, f.accounts.buyer, [0], { voucherCode: voucher.code });
    const payment = await initiate(order, f.accounts.buyer);
    const response = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({ reason: 'Core cancellation' });
    expect(response.status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('CANCELLED');
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('FAILED');
    expect(await prisma.voucherRedemption.findFirst({ where: { orderId: order.id } })).toMatchObject({ status: 'RELEASED' });
    await assertReleased(order.id);
    const replacement = await reserve(f);
    expect(replacement.id).not.toBe(order.id);
  });

  coreTest('a failed signed IPN leaves the order retryable without issuing tickets or points', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    const response = await ipn(f, payment, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
    expect(response.body.RspCode).toBe('00');
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('FAILED');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
    const retry = await initiate(order, f.accounts.buyer);
    expect(retry.txnRef).not.toBe(payment.txnRef);
    expect((await ipn(f, retry)).body.RspCode).toBe('00');
  });

  coreTest('a successful signed IPN sells every seat and issues one ticket per item', async (f) => {
    const voucher = await f.voucher();
    const { order, payment, tickets } = await paidOrder(f, [0, 10, 11], { voucherCode: voucher.code });
    expect(order.total).toBe(350_000);
    expect(tickets.every((ticket) => ticket.status === 'VALID')).toBe(true);
    const saved = await prisma.order.findUnique({ where: { id: order.id } });
    expect(saved).toMatchObject({ status: 'PAID', settledPaymentId: payment.id, pointsEarned: 35 });
    expect(saved?.paidAt).toBeInstanceOf(Date);
    expect(await prisma.showtimeSeat.count({ where: { orderId: order.id, status: 'SOLD', holdExpiresAt: null } })).toBe(3);
    expect(await prisma.pendingOrderGuard.count({ where: { orderId: order.id } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(35);
    expect(await prisma.voucherRedemption.findFirst({ where: { orderId: order.id } })).toMatchObject({ status: 'CONSUMED' });
  });

  coreTest('duplicate signed IPNs do not duplicate tickets, points, or settlement', async (f) => {
    const order = await reserve(f, f.accounts.buyer, [0, 1]);
    const payment = await initiate(order, f.accounts.buyer);
    const callback = f.signCallback(payment.txnRef, payment.amount);
    expect((await request(app).get('/api/v1/payment/vnpay/ipn').query(callback)).body.RspCode).toBe('00');
    expect((await request(app).get('/api/v1/payment/vnpay/ipn').query(callback)).body.RspCode).toBe('02');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(2);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(20);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.settledPaymentId).toBe(payment.id);
  });

  coreTest('simultaneous identical signed IPNs settle once without provider system errors', async (f) => {
    const order = await reserve(f, f.accounts.buyer, [0, 1]);
    const payment = await initiate(order, f.accounts.buyer);
    const callback = f.signCallback(payment.txnRef, payment.amount);
    const responses = await Promise.all(Array.from({ length: 4 }, () => request(app).get('/api/v1/payment/vnpay/ipn').query(callback)));
    const codes = responses.map((response) => response.body.RspCode);
    expect(codes.filter((code) => code === '00')).toHaveLength(1);
    expect(codes.filter((code) => code === '02')).toHaveLength(3);
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(2);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(20);
  });

  coreTest('an invalid IPN signature cannot mutate the payment or order', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    // Tamper the completed signed callback explicitly, after independent signing.
    const callback = f.signCallback(payment.txnRef, payment.amount);
    callback.vnp_SecureHash = '0'.repeat(128);
    const invalid = await request(app).get('/api/v1/payment/vnpay/ipn').query(callback);
    expect(invalid.body.RspCode).toBe('97');
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('PENDING');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('a correctly signed mismatched amount IPN cannot settle an order', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    const response = await ipn(f, payment, { vnp_Amount: '1' });
    expect(response.body.RspCode).toBe('04');
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('PENDING');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('an unsuccessful transaction status cannot issue tickets even with a success response code', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    expect((await ipn(f, payment, { vnp_TransactionStatus: '02' })).body.RspCode).toBe('00');
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('FAILED');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('missing payment references return not-found and cannot create an order', async (f) => {
    const response = await request(app).get('/api/v1/payment/vnpay/ipn').query(f.signCallback(`${f.namespace}-missing`, 100_000));
    expect(response.body.RspCode).toBe('01');
    expect(await prisma.order.count({ where: { showtimeId: f.showtimeId } })).toBe(0);
    expect((await request(app).post(`/api/v1/orders/${crypto.randomUUID()}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({})).status).toBe(404);
  });

  coreTest('payment initiation rejects an expired order without creating an attempt', async (f) => {
    const order = await reserve(f);
    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    const response = await request(app).post(`/api/v1/orders/${order.id}/pay`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    expect(response.status).toBe(410);
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('a successful Return redirect alone does not settle an order before IPN', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    const response = await request(app).get('/api/v1/payment/vnpay/return').set('Accept', 'application/json').query(f.signCallback(payment.txnRef, payment.amount));
    expect(response.status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING_PAYMENT');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
    expect((await ipn(f, payment)).body.RspCode).toBe('00');
  });

  coreTest('a late charged IPN after cancellation records an unfulfilled payment without issuing tickets', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    const response = await ipn(f, payment);
    expect(response.body.RspCode).toBe('00');
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: 'PAID_UNFULFILLED', refundStatus: 'PENDING' });
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('SUCCESS');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
    expect(await prisma.refundRequest.findUnique({ where: { paymentId: payment.id } })).toMatchObject({
      status: 'PENDING', reason: 'PAID_UNFULFILLED', amount: 100_000,
    });
    await assertReleased(order.id);
  });

  coreTest('a late charged IPN cannot steal a seat reallocated after the hold expired', async (f) => {
    const old = await reserve(f);
    const payment = await initiate(old, f.accounts.buyer);
    const past = new Date(Date.now() - 60_000);
    await prisma.order.update({ where: { id: old.id }, data: { expiresAt: past } });
    await prisma.showtimeSeat.updateMany({ where: { orderId: old.id }, data: { holdExpiresAt: past } });
    const replacement = await reserve(f, f.accounts.other);
    const response = await ipn(f, payment);
    expect(response.body.RspCode).toBe('00');
    expect(await prisma.order.findUnique({ where: { id: old.id } })).toMatchObject({ status: 'PAID_UNFULFILLED', refundStatus: 'PENDING' });
    const slot = await prisma.showtimeSeat.findUnique({ where: { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[0].id } } });
    expect(slot).toMatchObject({ status: 'HELD', orderId: replacement.id });
    expect(await prisma.ticket.count({ where: { orderId: old.id } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
  });

  coreTest('duplicate late callbacks retain a single unfulfilled settlement and no points', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    const callback = f.signCallback(payment.txnRef, payment.amount);
    expect((await request(app).get('/api/v1/payment/vnpay/ipn').query(callback)).body.RspCode).toBe('00');
    expect((await request(app).get('/api/v1/payment/vnpay/ipn').query(callback)).body.RspCode).toBe('02');
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: 'PAID_UNFULFILLED', refundStatus: 'PENDING', settledPaymentId: payment.id });
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
    expect(await prisma.refundRequest.count({ where: { paymentId: payment.id } })).toBe(1);
  });

  coreTest('a second charged payment attempt gets its own refund without duplicating tickets or settlement', async (f) => {
    const order = await reserve(f);
    const first = await initiate(order, f.accounts.buyer);
    const second = await initiate(order, f.accounts.buyer);
    expect((await ipn(f, first)).body.RspCode).toBe('00');
    expect((await ipn(f, second)).body.RspCode).toBe('00');
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({
      status: 'PAID', settledPaymentId: first.id, refundStatus: 'NONE',
    });
    expect((await prisma.payment.findUnique({ where: { id: second.id } }))?.status).toBe('SUCCESS');
    expect(await prisma.refundRequest.findUnique({ where: { paymentId: second.id } })).toMatchObject({
      reason: 'DUPLICATE_PAYMENT', status: 'PENDING', amount: 100_000,
    });
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(10);
  });

  coreTest('customer cancellation is denied within two hours of the showtime', async (f) => {
    const showtimeId = await f.addShowtime(new Date(Date.now() + 90 * 60_000));
    const { order } = await paidOrder(f, [0], { showtimeId });
    const response = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    expect(response.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PAID');
    expect(await prisma.showtimeSeat.count({ where: { orderId: order.id, status: 'SOLD' } })).toBe(1);
    expect(await prisma.refundRequest.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('paid cancellation outside two hours creates a pending refund and reverses tickets, voucher, and points', async (f) => {
    const voucher = await f.voucher();
    const { order, payment } = await paidOrder(f, [0], { voucherCode: voucher.code });
    const response = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({ reason: 'Core paid cancellation' });
    expect(response.status).toBe(200);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: 'CANCELLED', refundStatus: 'PENDING' });
    expect(await prisma.refundRequest.findUnique({ where: { paymentId: payment.id } })).toMatchObject({
      status: 'PENDING', reason: 'ORDER_CANCELLED', amount: 90_000,
    });
    expect(await prisma.ticket.findFirst({ where: { orderId: order.id } })).toMatchObject({ status: 'CANCELLED' });
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
    expect(await prisma.voucherRedemption.findFirst({ where: { orderId: order.id } })).toMatchObject({ status: 'RELEASED' });
    await assertReleased(order.id);
  });

  coreTest('concurrent cancellation cannot refund or reverse loyalty points twice', async (f) => {
    const { order, payment } = await paidOrder(f);
    const cancel = () => request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    const responses = await Promise.all([cancel(), cancel()]);
    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect(responses.every((response) => [200, 400, 409].includes(response.status))).toBe(true);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: 'CANCELLED', refundStatus: 'PENDING' });
    expect(await prisma.refundRequest.count({ where: { paymentId: payment.id } })).toBe(1);
    expect((await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } }))?.points).toBe(0);
  });

  coreTest('a used ticket prevents cancellation and retains its sold seat', async (f) => {
    const { order, tickets } = await paidOrder(f);
    await prisma.showtime.update({ where: { id: f.showtimeId }, data: { startTime: new Date() } });
    expect((await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: tickets[0].ticketCode })).status).toBe(200);
    const response = await request(app).post(`/api/v1/orders/${order.id}/cancel`).set('Authorization', `Bearer ${f.accounts.buyer.token}`).send({});
    expect(response.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PAID');
    expect(await prisma.showtimeSeat.count({ where: { orderId: order.id, status: 'SOLD' } })).toBe(1);
  });
});

describe('Core integration: ticket validation and check-in (F08, BR11)', () => {
  coreTest('valid tickets are single-use and record the assigned staff member', async (f) => {
    const { tickets } = await paidOrder(f);
    await prisma.showtime.update({ where: { id: f.showtimeId }, data: { startTime: new Date() } });
    const response = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: tickets[0].ticketCode });
    expect(response.status).toBe(200);
    const saved = await prisma.ticket.findUnique({ where: { id: tickets[0].id } });
    expect(saved).toMatchObject({ status: 'USED', checkedInBy: f.accounts.staff.id });
    expect(saved?.checkedInAt).toBeInstanceOf(Date);
    const repeat = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: tickets[0].ticketCode });
    expect(repeat.status).toBe(409);
    expect((await prisma.ticket.findUnique({ where: { id: tickets[0].id } }))?.checkedInAt).toEqual(saved?.checkedInAt);
  });

  for (const status of ['CANCELLED', 'EXPIRED'] as const) {
    coreTest(`${status.toLowerCase()} tickets cannot be checked in`, async (f) => {
      const { tickets } = await paidOrder(f);
      await prisma.showtime.update({ where: { id: f.showtimeId }, data: { startTime: new Date() } });
      await prisma.ticket.update({ where: { id: tickets[0].id }, data: { status } });
      const response = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: tickets[0].ticketCode });
      expect(response.status).toBe(400);
      expect(await prisma.ticket.findUnique({ where: { id: tickets[0].id } })).toMatchObject({ status, checkedInAt: null, checkedInBy: null });
    });
  }

  coreTest('unknown ticket codes return not-found', async (f) => {
    const response = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: `TK${crypto.randomBytes(5).toString('hex').toUpperCase()}` });
    expect(response.status).toBe(404);
  });

  coreTest('a ticket for another showtime cannot be consumed', async (f) => {
    const { tickets } = await paidOrder(f);
    await prisma.showtime.update({ where: { id: f.showtimeId }, data: { startTime: new Date() } });
    const otherShowtime = await f.addShowtime();
    const response = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: tickets[0].ticketCode, showtimeId: otherShowtime });
    expect(response.status).toBe(400);
    expect((await prisma.ticket.findUnique({ where: { id: tickets[0].id } }))?.status).toBe('VALID');
  });

  for (const name of ['unassignedStaff', 'foreignStaff'] as const) {
    coreTest(`${name} cannot consume tickets at an unauthorized cinema`, async (f) => {
      const { tickets } = await paidOrder(f);
      await prisma.showtime.update({ where: { id: f.showtimeId }, data: { startTime: new Date() } });
      const response = await request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts[name].token}`).send({ ticketCode: tickets[0].ticketCode });
      expect(response.status).toBe(403);
      expect((await prisma.ticket.findUnique({ where: { id: tickets[0].id } }))?.status).toBe('VALID');
    });
  }

  coreTest('two simultaneous scans yield one admission and one already-used conflict', async (f) => {
    const { tickets } = await paidOrder(f);
    await prisma.showtime.update({ where: { id: f.showtimeId }, data: { startTime: new Date() } });
    const scan = () => request(app).post('/api/v1/checkin').set('Authorization', `Bearer ${f.accounts.staff.token}`).send({ ticketCode: tickets[0].ticketCode });
    const responses = await Promise.all([scan(), scan()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await prisma.ticket.findUnique({ where: { id: tickets[0].id } }))?.status).toBe('USED');
  });
});

describe('Core integration: expiry cleanup (F19)', () => {
  coreTest('sweeper expires the order and releases its seats, pending payment, guard, and voucher', async (f) => {
    const voucher = await f.voucher();
    const order = await reserve(f, f.accounts.buyer, [0], { voucherCode: voucher.code });
    const payment = await initiate(order, f.accounts.buyer);
    const past = new Date(Date.now() - 60_000);
    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: past } });
    await prisma.showtimeSeat.updateMany({ where: { orderId: order.id }, data: { holdExpiresAt: past } });
    const result = await workerService.sweepExpiredHolds();
    expect(result.expiredOrdersCount).toBeGreaterThanOrEqual(1);
    expect(result.releasedSeatsCount).toBeGreaterThanOrEqual(1);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('EXPIRED');
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('EXPIRED');
    expect(await prisma.voucherRedemption.findFirst({ where: { orderId: order.id } })).toMatchObject({ status: 'RELEASED' });
    await assertReleased(order.id);
    expect((await workerService.sweepExpiredHolds()).expiredOrdersCount).toBe(0);
  });

  coreTest('sweeper preserves live holds and sold seats', async (f) => {
    const live = await reserve(f, f.accounts.other, [1]);
    const { order: paid } = await paidOrder(f, [0]);
    await workerService.sweepExpiredHolds();
    expect(await prisma.order.findUnique({ where: { id: live.id } })).toMatchObject({ status: 'PENDING_PAYMENT' });
    expect(await prisma.showtimeSeat.count({ where: { orderId: live.id, status: 'HELD' } })).toBe(1);
    expect(await prisma.order.findUnique({ where: { id: paid.id } })).toMatchObject({ status: 'PAID' });
    expect(await prisma.showtimeSeat.count({ where: { orderId: paid.id, status: 'SOLD' } })).toBe(1);
  });

  coreTest('sweeper releases an expired orphan hold without an order', async (f) => {
    const where = { showtimeId_seatId: { showtimeId: f.showtimeId, seatId: f.seats[0].id } };
    await prisma.showtimeSeat.update({ where, data: { status: 'HELD', orderId: null, holdExpiresAt: new Date(Date.now() - 60_000) } });
    const result = await workerService.sweepExpiredHolds();
    expect(result.releasedSeatsCount).toBeGreaterThanOrEqual(1);
    expect(await prisma.showtimeSeat.findUnique({ where })).toMatchObject({ status: 'AVAILABLE', orderId: null, holdExpiresAt: null });
  });

  coreTest('sweeper cannot overwrite a payment that settles after its expired-order scan', async (f) => {
    const order = await reserve(f);
    const payment = await initiate(order, f.accounts.buyer);
    const past = new Date(Date.now() - 60_000);
    await prisma.order.update({ where: { id: order.id }, data: { expiresAt: past } });
    await prisma.showtimeSeat.updateMany({ where: { orderId: order.id }, data: { holdExpiresAt: past } });

    // This scheduling seam returns the ORIGINAL real MySQL result after another real
    // operation commits. No query result, payment, or worker outcome is fabricated.
    const originalRead = prisma.order.findMany.bind(prisma.order);
    const scan = vi.spyOn(prisma.order, 'findMany').mockImplementationOnce((args) => {
      return originalRead(args).then(async (selected) => {
        expect(selected.some((candidate) => candidate.id === order.id)).toBe(true);
        expect((await ipn(f, payment)).body.RspCode).toBe('00');
        return selected;
      }) as ReturnType<typeof prisma.order.findMany>;
    });
    try {
      await workerService.sweepExpiredHolds();
    } finally {
      scan.mockRestore();
    }
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toMatchObject({ status: 'PAID_UNFULFILLED', refundStatus: 'PENDING' });
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe('SUCCESS');
    expect(await prisma.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });

  coreTest('sweep operations require an administrator and reject anonymous users or customers', async (f) => {
    expect((await request(app).post('/api/v1/ops/sweep-expired')).status).toBe(401);
    expect((await request(app).post('/api/v1/ops/sweep-expired').set('Authorization', `Bearer ${f.accounts.buyer.token}`)).status).toBe(403);
    expect((await request(app).post('/api/v1/ops/sweep-expired').set('Authorization', `Bearer ${f.accounts.admin.token}`)).status).toBe(200);
  });
});
