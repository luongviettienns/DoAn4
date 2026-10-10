import crypto from 'node:crypto';
import { Prisma, VoucherRedemptionStatus, VoucherScope } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, FixtureAccount, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

/** Only UUID names/codes owned by this case are cleanup selectors. */
class PromotionRecords {
  readonly comboNames = new Set<string>();
  readonly voucherCodes = new Set<string>();
  private sequence = 0;

  constructor(readonly core: CoreFixture) {}

  comboInput(extra: Record<string, unknown> = {}) {
    const name = `${this.core.namespace}-combo-${this.sequence++}`;
    this.comboNames.add(name);
    return { name, description: 'Fixture popcorn and drink', price: 40_000, ...extra };
  }

  async combo(extra: Partial<Prisma.ComboUncheckedCreateInput> = {}, cinemaIds: string[] = []) {
    const input = this.comboInput();
    const combo = await prisma.combo.create({ data: {
      name: input.name, description: input.description, price: input.price, ...extra,
    } });
    await prisma.comboCinema.createMany({ data: cinemaIds.map((cinemaId) => ({ comboId: combo.id, cinemaId })) });
    return combo;
  }

  voucherInput(extra: Record<string, unknown> = {}) {
    const code = `PROMO-${crypto.randomUUID()}`.toUpperCase();
    this.voucherCodes.add(code);
    return {
      code, name: `${this.core.namespace}-voucher-${this.sequence++}`, cinemaId: this.core.cinemaId,
      type: 'FIXED' as const, value: 30_000, minOrder: 0, scope: 'ORDER' as const,
      validFrom: new Date(Date.now() - 3_600_000).toISOString(),
      validTo: new Date(Date.now() + 86_400_000).toISOString(), totalLimit: 10, perUserLimit: 2,
      ...extra,
    };
  }

  async voucher(extra: Partial<Prisma.VoucherUncheckedCreateInput> = {}) {
    const input = this.voucherInput();
    return prisma.voucher.create({ data: {
      ...input, validFrom: new Date(input.validFrom), validTo: new Date(input.validTo), ...extra,
    } });
  }

  book(extra: Record<string, unknown> = {}, account: FixtureAccount = this.core.accounts.buyer, showtimeId = this.core.showtimeId) {
    return request(app).post('/api/v1/orders').set('Authorization', `Bearer ${account.token}`).send({
      showtimeId, seatIds: [this.core.seats[0].id], ageConfirmed: true, ...extra,
    });
  }

  async redemption(voucherId: string, status: VoucherRedemptionStatus, account = this.core.accounts.buyer, expired = false) {
    const showtimeId = await this.core.addShowtime();
    const order = await this.book({}, account, showtimeId);
    expect(order.status, JSON.stringify(order.body)).toBe(201);
    const now = new Date();
    await prisma.voucherRedemption.create({ data: {
      voucherId, orderId: order.body.data.id, userId: account.id, status, discount: 30_000,
      reservedUntil: new Date(Date.now() + (expired ? -60_000 : 600_000)),
      consumedAt: status === 'CONSUMED' ? now : null, releasedAt: status === 'RELEASED' ? now : null,
    } });
    return order.body.data.id as string;
  }

  async cleanup() {
    const combos = await prisma.combo.findMany({ where: { name: { in: [...this.comboNames] } }, select: { id: true } });
    const vouchers = await prisma.voucher.findMany({ where: { code: { in: [...this.voucherCodes] } }, select: { id: true } });
    const voucherIds = vouchers.map((voucher) => voucher.id);
    const comboIds = combos.map((combo) => combo.id);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.voucherRedemption.deleteMany({ where: { voucherId: { in: voucherIds } } });
        await tx.order.updateMany({ where: { showtimeId: { in: this.core.showtimeIds } }, data: { voucherId: null } });
        await tx.voucher.deleteMany({ where: { id: { in: voucherIds } } });
        await tx.comboCinema.deleteMany({ where: { comboId: { in: comboIds } } });
      });
    } finally {
      try {
        await this.core.cleanup();
      } finally {
        await prisma.combo.deleteMany({ where: { id: { in: comboIds } } });
      }
    }
  }
}

function promotionTest(name: string, scenario: (records: PromotionRecords) => Promise<void>) {
  it(name, async () => {
    requireDedicatedTestDatabase();
    const records = new PromotionRecords(await CoreFixture.create());
    try {
      await scenario(records);
    } finally {
      await records.cleanup();
    }
  }, 30_000);
}

function validate(r: PromotionRecords, code: string, amount = 150_000, account?: FixtureAccount, extra: Record<string, unknown> = {}) {
  const call = request(app).post('/api/v1/vouchers/validate');
  if (account) call.set('Authorization', `Bearer ${account.token}`);
  return call.send({ code, orderAmount: amount, cinemaId: r.core.cinemaId, ...extra });
}

function assertError(response: { status: number; body: any }, status: number, code?: string) {
  expect(response.status, JSON.stringify(response.body)).toBe(status);
  expect(response.body.success).toBe(false);
  if (code) expect(response.body.error.code).toBe(code);
}

describe('Combo integration: catalog, management and immutable order price (F13)', () => {
  promotionTest('public catalog contains global and local active combos, excluding foreign or inactive combos', async (r) => {
    const global = await r.combo({ price: 30_000 });
    const local = await r.combo({ price: 40_000 }, [r.core.cinemaId]);
    const foreign = await r.combo({ price: 20_000 }, [r.core.foreignCinemaId]);
    const inactive = await r.combo({ price: 10_000, isActive: false }, [r.core.cinemaId]);
    const response = await request(app).get('/api/v1/combos').query({ cinemaId: r.core.cinemaId });
    expect(response.status).toBe(200);
    const ownedIds = response.body.data.filter((item: { name: string }) => r.comboNames.has(item.name)).map((item: { id: string }) => item.id);
    expect(ownedIds).toEqual([global.id, local.id]);
    expect(response.body.data.map((item: { id: string }) => item.id)).not.toContain(foreign.id);
    expect(response.body.data.map((item: { id: string }) => item.id)).not.toContain(inactive.id);
  });

  promotionTest('activeOnly=false includes a deactivated combo for management views', async (r) => {
    const inactive = await r.combo({ isActive: false });
    const response = await request(app).get('/api/v1/combos').query({ activeOnly: 'false' });
    expect(response.status).toBe(200);
    expect(response.body.data.find((item: { id: string }) => item.id === inactive.id)).toMatchObject({ isActive: false, price: 40_000 });
  });

  promotionTest('public detail returns combo price and its cinema assignment', async (r) => {
    const combo = await r.combo({}, [r.core.cinemaId]);
    const response = await request(app).get(`/api/v1/combos/${combo.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: combo.id, name: combo.name, price: 40_000 });
    expect(response.body.data.cinemas.map((item: { cinemaId: string }) => item.cinemaId)).toEqual([r.core.cinemaId]);
  });

  promotionTest('admin creation trims text, defaults active state and persists cinema assignments', async (r) => {
    const input = r.comboInput({ cinemaIds: [r.core.cinemaId, r.core.foreignCinemaId], imageUrl: '' });
    const response = await request(app).post('/api/v1/combos').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ ...input, name: `  ${input.name}  ` });
    expect(response.status).toBe(201);
    const saved = await prisma.combo.findUniqueOrThrow({ where: { id: response.body.data.id }, include: { cinemas: true } });
    expect(saved).toMatchObject({ name: input.name, price: 40_000, imageUrl: null, isActive: true });
    expect(saved.cinemas.map((item) => item.cinemaId).sort()).toEqual([r.core.cinemaId, r.core.foreignCinemaId].sort());
  });

  promotionTest('admin update replaces cinema applicability and clears an image explicitly', async (r) => {
    const combo = await r.combo({ imageUrl: 'https://example.test/combo.png' }, [r.core.cinemaId]);
    const response = await request(app).put(`/api/v1/combos/${combo.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ price: 55_000, imageUrl: '', cinemaIds: [r.core.foreignCinemaId] });
    expect(response.status).toBe(200);
    const saved = await prisma.combo.findUniqueOrThrow({ where: { id: combo.id }, include: { cinemas: true } });
    expect(saved).toMatchObject({ price: 55_000, imageUrl: null });
    expect(saved.cinemas.map((item) => item.cinemaId)).toEqual([r.core.foreignCinemaId]);
  });

  promotionTest('an empty cinema assignment changes a local combo into a global combo', async (r) => {
    const combo = await r.combo({}, [r.core.cinemaId]);
    const response = await request(app).put(`/api/v1/combos/${combo.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ cinemaIds: [] });
    expect(response.status).toBe(200);
    const catalog = await request(app).get('/api/v1/combos').query({ cinemaId: r.core.foreignCinemaId });
    expect(catalog.body.data.map((item: { id: string }) => item.id)).toContain(combo.id);
  });

  promotionTest('changing catalog price and deactivating a combo preserves its ordered name and price snapshot', async (r) => {
    const combo = await r.combo();
    const order = await r.book({ combos: [{ comboId: combo.id, quantity: 2 }] });
    expect(order.status).toBe(201);
    const updatedName = `${r.core.namespace}-renamed-popcorn`;
    r.comboNames.add(updatedName);
    const update = await request(app).put(`/api/v1/combos/${combo.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ name: updatedName, price: 99_000 });
    expect(update.status).toBe(200);
    const removal = await request(app).delete(`/api/v1/combos/${combo.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`);
    expect(removal.status).toBe(200);
    const detail = await request(app).get(`/api/v1/orders/${order.body.data.id}`).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.comboSubtotal).toBe(80_000);
    expect(detail.body.data.total).toBe(180_000);
    expect(await prisma.orderCombo.findFirst({ where: { orderId: order.body.data.id } })).toMatchObject({ nameSnapshot: combo.name, quantity: 2, unitPrice: 40_000, lineTotal: 80_000 });
    expect(await prisma.combo.findUnique({ where: { id: combo.id } })).toMatchObject({ isActive: false });
  });

  for (const unavailable of ['inactive', 'missing', 'foreign'] as const) {
    promotionTest(`booking rejects a ${unavailable} combo and leaves its seat available`, async (r) => {
      const combo = unavailable === 'missing' ? { id: crypto.randomUUID() } : await r.combo({ isActive: unavailable !== 'inactive' }, unavailable === 'foreign' ? [r.core.foreignCinemaId] : []);
      const response = await r.book({ combos: [{ comboId: combo.id, quantity: 1 }] });
      assertError(response, 400);
      expect(await prisma.order.count({ where: { showtimeId: r.core.showtimeId } })).toBe(0);
      expect(await prisma.showtimeSeat.findFirst({ where: { showtimeId: r.core.showtimeId, seatId: r.core.seats[0].id } })).toMatchObject({ status: 'AVAILABLE', orderId: null });
    });
  }

  for (const method of ['post', 'put', 'delete'] as const) {
    promotionTest(`customer cannot ${method} combo management records`, async (r) => {
      const combo = await r.combo();
      const path = method === 'post' ? '/api/v1/combos' : `/api/v1/combos/${combo.id}`;
      const response = await request(app)[method](path).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`).send(r.comboInput());
      assertError(response, 403);
      expect(await prisma.combo.findUnique({ where: { id: combo.id } })).toMatchObject({ name: combo.name, price: 40_000, isActive: true });
    });
  }

  for (const price of [-1, 0.5]) {
    promotionTest(`combo creation rejects invalid price ${price} without writing a record`, async (r) => {
      const input = r.comboInput({ price });
      const response = await request(app).post('/api/v1/combos').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(input);
      assertError(response, 400, 'VALIDATION_ERROR');
      expect(await prisma.combo.count({ where: { name: input.name } })).toBe(0);
    });
  }

  for (const method of ['get', 'put', 'delete'] as const) {
    promotionTest(`combo ${method} returns not found for an unknown ID`, async (r) => {
      const response = await request(app)[method](`/api/v1/combos/${crypto.randomUUID()}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ price: 10_000 });
      assertError(response, 404, 'COMBO_NOT_FOUND');
    });
  }

  promotionTest('combo catalog rejects a malformed cinema filter', async () => {
    assertError(await request(app).get('/api/v1/combos').query({ cinemaId: 'not-a-uuid' }), 400, 'VALIDATION_ERROR');
  });

  for (const sample of [{ label: 'malformed ID', comboId: 'not-a-uuid' }, { label: 'unknown ID', comboId: crypto.randomUUID() }]) {
    promotionTest(`counter sales reject a combo with ${sample.label} instead of silently omitting it`, async (r) => {
      const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${r.core.accounts.staff.token}`).send({
        showtimeId: r.core.showtimeId, seatIds: [r.core.seats[0].id], ageConfirmed: true,
        paymentMethod: 'CASH', combos: [{ comboId: sample.comboId, quantity: 1 }],
      });
      assertError(response, 400);
      expect(await prisma.order.count({ where: { showtimeId: r.core.showtimeId } })).toBe(0);
      expect(await prisma.payment.count({ where: { order: { showtimeId: r.core.showtimeId } } })).toBe(0);
      expect(await prisma.showtimeSeat.findFirst({ where: { showtimeId: r.core.showtimeId, seatId: r.core.seats[0].id } })).toMatchObject({ status: 'AVAILABLE', orderId: null });
    });
  }
});

describe('Voucher integration: management, eligibility and quota (F13, BR09)', () => {
  promotionTest('admin creation normalizes a lowercase code and persists default scope and status', async (r) => {
    const input = r.voucherInput();
    const { scope: _scope, ...withoutScope } = input;
    const response = await request(app).post('/api/v1/vouchers/admin').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ ...withoutScope, code: `  ${input.code.toLowerCase()}  ` });
    expect(response.status).toBe(201);
    const detail = await request(app).get(`/api/v1/vouchers/admin/${response.body.data.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ code: input.code, type: 'FIXED', value: 30_000, scope: 'ORDER', status: 'ACTIVE', minOrder: 0 });
  });

  promotionTest('admin list combines global/local eligibility with the requested status', async (r) => {
    const global = await r.voucher({ cinemaId: null });
    const local = await r.voucher();
    await r.voucher({ cinemaId: r.core.foreignCinemaId });
    await r.voucher({ status: 'PAUSED' });
    const response = await request(app).get('/api/v1/vouchers/admin').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).query({ cinemaId: r.core.cinemaId, status: 'ACTIVE' });
    expect(response.status).toBe(200);
    const owned = response.body.data.filter((item: { code: string }) => r.voucherCodes.has(item.code)).map((item: { id: string }) => item.id).sort();
    expect(owned).toEqual([global.id, local.id].sort());
  });

  promotionTest('an unused voucher can change discount terms and suspending it immediately prevents validation', async (r) => {
    const voucher = await r.voucher();
    const updated = await request(app).put(`/api/v1/vouchers/admin/${voucher.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ type: 'PERCENT', value: 10, maxDiscount: 40_000 });
    expect(updated.status).toBe(200);
    const checked = await validate(r, voucher.code);
    expect(checked.status).toBe(200);
    expect(checked.body.data).toMatchObject({ discount: 15_000, finalAmount: 135_000 });
    const suspended = await request(app).put(`/api/v1/vouchers/admin/${voucher.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ status: 'PAUSED' });
    expect(suspended.status).toBe(200);
    assertError(await validate(r, voucher.code), 400, 'VOUCHER_INACTIVE');
  });

  for (const action of ['list', 'detail', 'create', 'update'] as const) {
    promotionTest(`customer is denied voucher admin ${action}`, async (r) => {
      const voucher = await r.voucher();
      const method = action === 'create' ? 'post' : action === 'update' ? 'put' : 'get';
      const path = action === 'detail' || action === 'update' ? `/api/v1/vouchers/admin/${voucher.id}` : '/api/v1/vouchers/admin';
      const response = await request(app)[method](path).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`).send(r.voucherInput({ value: 1 }));
      assertError(response, 403);
      expect(await prisma.voucher.findUnique({ where: { id: voucher.id } })).toMatchObject({ value: 30_000 });
    });
  }

  for (const method of ['get', 'put'] as const) {
    promotionTest(`voucher admin ${method} returns not found for an unknown ID`, async (r) => {
      const response = await request(app)[method](`/api/v1/vouchers/admin/${crypto.randomUUID()}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ name: 'No voucher' });
      assertError(response, 404, 'VOUCHER_NOT_FOUND');
    });
  }

  promotionTest('an unknown voucher code cannot be validated', async (r) => {
    assertError(await validate(r, `UNKNOWN-${crypto.randomUUID()}`), 404, 'VOUCHER_NOT_FOUND');
  });

  promotionTest('code uniqueness rejects a duplicate even when its input uses different casing', async (r) => {
    const voucher = await r.voucher();
    const input = r.voucherInput({ code: voucher.code.toLowerCase() });
    const response = await request(app).post('/api/v1/vouchers/admin').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(input);
    assertError(response, 409);
    expect(await prisma.voucher.count({ where: { code: voucher.code } })).toBe(1);
  });

  for (const invalid of [
    { label: 'percentage above 100', input: { type: 'PERCENT', value: 101 } },
    { label: 'reversed validity dates', input: { validFrom: '2027-02-02T00:00:00.000Z', validTo: '2027-02-01T00:00:00.000Z' } },
    { label: 'zero total usage limit', input: { totalLimit: 0 } },
    { label: 'negative order minimum', input: { minOrder: -1 } },
    { label: 'percentage missing its discount cap', input: { type: 'PERCENT', value: 20 } },
    { label: 'per-user quota exceeding global quota', input: { totalLimit: 1, perUserLimit: 2 } },
  ]) {
    promotionTest(`voucher creation rejects ${invalid.label} as client input`, async (r) => {
      const input = r.voucherInput(invalid.input);
      const response = await request(app).post('/api/v1/vouchers/admin').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(input);
      assertError(response, 400, 'VALIDATION_ERROR');
      expect(await prisma.voucher.count({ where: { code: input.code } })).toBe(0);
    });
  }

  for (const sample of [
    { label: 'fixed discount', options: { type: 'FIXED' as const, value: 30_000 }, amount: 150_000, discount: 30_000, final: 120_000 },
    { label: 'fixed discount clamped to the order amount', options: { type: 'FIXED' as const, value: 30_000 }, amount: 20_000, discount: 20_000, final: 0 },
    { label: 'percent discount with cap', options: { type: 'PERCENT' as const, value: 20, maxDiscount: 40_000 }, amount: 300_000, discount: 40_000, final: 260_000 },
    { label: 'percent discount below cap', options: { type: 'PERCENT' as const, value: 20, maxDiscount: 40_000 }, amount: 100_000, discount: 20_000, final: 80_000 },
    { label: 'percent discount rounded down to whole VND', options: { type: 'PERCENT' as const, value: 50, maxDiscount: 100 }, amount: 101, discount: 50, final: 51 },
    { label: 'percent discount with an explicit zero cap', options: { type: 'PERCENT' as const, value: 50, maxDiscount: 0 }, amount: 100, discount: 0, final: 100 },
    { label: 'zero payable order', options: { type: 'FIXED' as const, value: 30_000 }, amount: 0, discount: 0, final: 0 },
  ]) {
    promotionTest(`voucher computes ${sample.label} with literal monetary totals`, async (r) => {
      const voucher = await r.voucher(sample.options);
      const response = await validate(r, `  ${voucher.code.toLowerCase()}  `, sample.amount);
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ valid: true, discount: sample.discount, finalAmount: sample.final });
      expect(await prisma.voucherRedemption.count({ where: { voucherId: voucher.id } })).toBe(0);
    });
  }

  promotionTest('minimum order uses an inclusive threshold', async (r) => {
    const voucher = await r.voucher({ minOrder: 120_000 });
    assertError(await validate(r, voucher.code, 119_999), 400, 'VOUCHER_MIN_ORDER_NOT_MET');
    const eligible = await validate(r, voucher.code, 120_000);
    expect(eligible.status).toBe(200);
    expect(eligible.body.data).toMatchObject({ discount: 30_000, finalAmount: 90_000 });
  });

  promotionTest('voucher validity excludes the exact expiry instant', async (r) => {
    const voucher = await r.voucher();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(voucher.validTo);
    try {
      assertError(await validate(r, voucher.code), 400, 'VOUCHER_EXPIRED');
      expect(await prisma.voucherRedemption.count({ where: { voucherId: voucher.id } })).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  for (const state of [
    { label: 'inactive', options: { status: 'PAUSED' as const }, code: 'VOUCHER_INACTIVE' },
    { label: 'not started', options: { validFrom: new Date(Date.now() + 3_600_000) }, code: 'VOUCHER_NOT_STARTED' },
    { label: 'expired', options: { validFrom: new Date(Date.now() - 7_200_000), validTo: new Date(Date.now() - 3_600_000) }, code: 'VOUCHER_EXPIRED' },
  ]) {
    promotionTest(`validation rejects a ${state.label} voucher`, async (r) => {
      const voucher = await r.voucher(state.options);
      assertError(await validate(r, voucher.code), 400, state.code);
    });
  }

  promotionTest('a cinema-specific voucher rejects another cinema and a global voucher works there', async (r) => {
    const local = await r.voucher();
    assertError(await validate(r, local.code, 150_000, undefined, { cinemaId: r.core.foreignCinemaId }), 400, 'VOUCHER_CINEMA_MISMATCH');
    const global = await r.voucher({ cinemaId: null });
    const accepted = await validate(r, global.code, 150_000, undefined, { cinemaId: r.core.foreignCinemaId });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.discount).toBe(30_000);
  });

  for (const status of ['CONSUMED', 'RESERVED'] as const) {
    promotionTest(`global usage includes ${status.toLowerCase()} quota`, async (r) => {
      const voucher = await r.voucher({ totalLimit: 1, perUserLimit: 1 });
      await r.redemption(voucher.id, status);
      assertError(await validate(r, voucher.code, 150_000, r.core.accounts.other), 400, 'VOUCHER_LIMIT_EXCEEDED');
    });
    promotionTest(`authenticated validation enforces per-user ${status.toLowerCase()} quota`, async (r) => {
      const voucher = await r.voucher({ perUserLimit: 1 });
      await r.redemption(voucher.id, status);
      assertError(await validate(r, voucher.code, 150_000, r.core.accounts.buyer), 400, 'VOUCHER_USER_LIMIT_EXCEEDED');
      const other = await validate(r, voucher.code, 150_000, r.core.accounts.other);
      expect(other.status).toBe(200);
      expect(other.body.data.discount).toBe(30_000);
    });
  }

  for (const stale of ['expired reservation', 'released redemption'] as const) {
    promotionTest(`${stale} does not consume global or per-user quota`, async (r) => {
      const voucher = await r.voucher({ totalLimit: 1, perUserLimit: 1 });
      await r.redemption(voucher.id, stale === 'released redemption' ? 'RELEASED' : 'RESERVED', r.core.accounts.buyer, true);
      const response = await validate(r, voucher.code, 150_000, r.core.accounts.buyer);
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ discount: 30_000, finalAmount: 120_000 });
    });
  }

  promotionTest('discount terms of a consumed voucher cannot be changed while extending and suspending remains allowed', async (r) => {
    const voucher = await r.voucher();
    await r.redemption(voucher.id, 'CONSUMED');
    const changed = await request(app).put(`/api/v1/vouchers/admin/${voucher.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ type: 'PERCENT', value: 99, maxDiscount: 30_000 });
    expect(changed.status, JSON.stringify(changed.body)).toBe(409);
    expect(await prisma.voucher.findUnique({ where: { id: voucher.id } })).toMatchObject({ type: 'FIXED', value: 30_000 });
    const extended = new Date(Date.now() + 2 * 86_400_000);
    const allowed = await request(app).put(`/api/v1/vouchers/admin/${voucher.id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ validTo: extended.toISOString(), status: 'PAUSED' });
    expect(allowed.status).toBe(200);
    expect(await prisma.voucher.findUnique({ where: { id: voucher.id } })).toMatchObject({ type: 'FIXED', value: 30_000, status: 'PAUSED', validTo: extended });
  });

  for (const sample of [
    { scope: VoucherScope.TICKETS, discount: 50_000, total: 90_000 },
    { scope: VoucherScope.COMBOS, discount: 20_000, total: 120_000 },
    { scope: VoucherScope.ORDER, discount: 70_000, total: 70_000 },
  ]) {
    promotionTest(`booking applies a 50 percent voucher only to its ${sample.scope} scope`, async (r) => {
      const combo = await r.combo();
      const voucher = await r.voucher({ type: 'PERCENT', value: 50, maxDiscount: 100_000, scope: sample.scope });
      const response = await r.book({ combos: [{ comboId: combo.id, quantity: 1 }], voucherCode: voucher.code });
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      expect(response.body.data).toMatchObject({ ticketSubtotal: 100_000, comboSubtotal: 40_000, subtotal: 140_000, discount: sample.discount, total: sample.total });
      expect(await prisma.voucherRedemption.findFirst({ where: { orderId: response.body.data.id } })).toMatchObject({ status: 'RESERVED', discount: sample.discount });
    });
  }

  promotionTest('a combo-only voucher cannot reduce a ticket-only order', async (r) => {
    const voucher = await r.voucher({ scope: 'COMBOS' });
    const response = await r.book({ voucherCode: voucher.code });
    assertError(response, 400);
    expect(await prisma.order.count({ where: { showtimeId: r.core.showtimeId } })).toBe(0);
    expect(await prisma.voucherRedemption.count({ where: { voucherId: voucher.id } })).toBe(0);
  });

  promotionTest('two simultaneous buyers cannot reserve the final global voucher use twice', async (r) => {
    const voucher = await r.voucher({ totalLimit: 1, perUserLimit: 1 });
    const accounts = [r.core.accounts.buyer, r.core.accounts.other];
    const responses = await Promise.all(accounts.map((account, index) => r.book({
      seatIds: [r.core.seats[index].id], voucherCode: voucher.code,
    }, account)));
    expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);
    const winningIndex = responses.findIndex((response) => response.status === 201);
    const losingIndex = winningIndex === 0 ? 1 : 0;
    assertError(responses[losingIndex], 400, 'VOUCHER_LIMIT_EXCEEDED');
    expect(responses[winningIndex].body.data).toMatchObject({ subtotal: 100_000, discount: 30_000, total: 70_000 });
    expect(await prisma.order.count({ where: { showtimeId: r.core.showtimeId } })).toBe(1);
    expect(await prisma.voucherRedemption.findMany({ where: { voucherId: voucher.id } })).toEqual([
      expect.objectContaining({ userId: accounts[winningIndex].id, status: 'RESERVED', discount: 30_000 }),
    ]);
    expect(await prisma.pendingOrderGuard.count({ where: { userId: accounts[losingIndex].id, showtimeId: r.core.showtimeId } })).toBe(0);
    expect(await prisma.showtimeSeat.findFirst({ where: { showtimeId: r.core.showtimeId, seatId: r.core.seats[losingIndex].id } })).toMatchObject({ status: 'AVAILABLE', orderId: null, holdExpiresAt: null });
  });

  promotionTest('counter sales enforce the member quota identified by customerPhone', async (r) => {
    const voucher = await r.voucher({ perUserLimit: 1 });
    await r.redemption(voucher.id, 'CONSUMED');
    const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${r.core.accounts.staff.token}`).send({
      showtimeId: r.core.showtimeId, seatIds: [r.core.seats[0].id], ageConfirmed: true,
      paymentMethod: 'CASH', customerPhone: r.core.accounts.buyer.phone, voucherCode: voucher.code,
    });
    assertError(response, 400, 'VOUCHER_USER_LIMIT_EXCEEDED');
    expect(await prisma.order.count({ where: { showtimeId: r.core.showtimeId } })).toBe(0);
    expect(await prisma.voucherRedemption.count({ where: { voucherId: voucher.id } })).toBe(1);
    expect(await prisma.showtimeSeat.findFirst({ where: { showtimeId: r.core.showtimeId, seatId: r.core.seats[0].id } })).toMatchObject({ status: 'AVAILABLE', orderId: null });
  });

  promotionTest('walk-in counter sales cannot apply a voucher without an identified member', async (r) => {
    const voucher = await r.voucher({ perUserLimit: 1 });
    const response = await request(app).post('/api/v1/orders/counter').set('Authorization', `Bearer ${r.core.accounts.staff.token}`).send({
      showtimeId: r.core.showtimeId, seatIds: [r.core.seats[0].id], ageConfirmed: true,
      paymentMethod: 'CASH', voucherCode: voucher.code,
    });
    assertError(response, 400);
    expect(await prisma.order.count({ where: { showtimeId: r.core.showtimeId } })).toBe(0);
    expect(await prisma.payment.count({ where: { order: { showtimeId: r.core.showtimeId } } })).toBe(0);
    expect(await prisma.voucherRedemption.count({ where: { voucherId: voucher.id } })).toBe(0);
    expect(await prisma.showtimeSeat.findFirst({ where: { showtimeId: r.core.showtimeId, seatId: r.core.seats[0].id } })).toMatchObject({ status: 'AVAILABLE', orderId: null, holdExpiresAt: null });
  });
});
