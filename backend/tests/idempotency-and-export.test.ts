import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import createApp from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

describe('Idempotency Keys and Revenue Report CSV Export', () => {
  let f: CoreFixture;

  beforeEach(async () => {
    requireDedicatedTestDatabase();
    f = await CoreFixture.create();
  });

  afterEach(async () => {
    await f.cleanup();
  });

  describe('Idempotency Key mechanism on Orders and Payments', () => {
    it('returns the exact cached response on duplicate order creation with same idempotency key', async () => {
      const idempotencyKey = `order-key-${crypto.randomUUID()}`;
      const payload = {
        showtimeId: f.showtimeId,
        seatIds: [f.seats[0].id],
        ageConfirmed: true,
        source: 'ONLINE',
      };

      // 1. First request creates order
      const firstRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(firstRes.status).toBe(201);
      expect(firstRes.body.success).toBe(true);
      const originalOrderId = firstRes.body.data.id;

      // 2. Second duplicate request with SAME key and SAME payload
      // Without idempotency, this would fail with 409 Conflict due to pending_order_guard
      const secondRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(secondRes.status).toBe(201);
      expect(secondRes.body.success).toBe(true);
      expect(secondRes.body.data.id).toBe(originalOrderId);
      expect(secondRes.headers['x-idempotent-replay']).toBe('true');

      // Verify only 1 order exists in database for this customer and showtime
      const orderCount = await prisma.order.count({
        where: { userId: f.accounts.buyer.id, showtimeId: f.showtimeId },
      });
      expect(orderCount).toBe(1);

      // Verify idempotency record in DB
      const record = await prisma.idempotencyKey.findFirst({
        where: { key: idempotencyKey, actorId: f.accounts.buyer.id },
      });
      expect(record).not.toBeNull();
      expect(record?.status).toBe('COMPLETED');
      expect(record?.responseStatus).toBe(201);
    });

    it('rejects duplicate idempotency key when payload is different (mismatch)', async () => {
      const idempotencyKey = `order-key-mismatch-${crypto.randomUUID()}`;

      // First request
      const firstRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          showtimeId: f.showtimeId,
          seatIds: [f.seats[1].id],
          ageConfirmed: true,
          source: 'ONLINE',
        });
      expect(firstRes.status).toBe(201);

      // Second request with SAME key but DIFFERENT payload (seat 2 instead of 1)
      const secondRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          showtimeId: f.showtimeId,
          seatIds: [f.seats[2].id],
          ageConfirmed: true,
          source: 'ONLINE',
        });

      expect(secondRes.status).toBe(422);
      expect(secondRes.body.error.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
    });

    it('caches and replays payment simulation responses with idempotency key', async () => {
      // 1. Create order
      const holdRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({
          showtimeId: f.showtimeId,
          seatIds: [f.seats[3].id],
          ageConfirmed: true,
          source: 'ONLINE',
        });
      const orderId = holdRes.body.data.id;

      const payKey = `pay-key-${crypto.randomUUID()}`;

      // 2. First payment simulation request
      const payRes1 = await request(app)
        .post('/api/v1/payment/simulate-success')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .set('Idempotency-Key', payKey)
        .send({ orderId });
      expect(payRes1.status).toBe(200);
      expect(payRes1.body.success).toBe(true);

      // 3. Second duplicate payment request
      const payRes2 = await request(app)
        .post('/api/v1/payment/simulate-success')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .set('Idempotency-Key', payKey)
        .send({ orderId });
      expect(payRes2.status).toBe(200);
      expect(payRes2.body.success).toBe(true);
      expect(payRes2.headers['x-idempotent-replay']).toBe('true');
    });
  });

  describe('Revenue Report Export API (CSV/Excel)', () => {
    it('exports daily revenue report as UTF-8 CSV with BOM for Admin', async () => {
      // Create and pay an order to generate revenue data
      const holdRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({
          showtimeId: f.showtimeId,
          seatIds: [f.seats[4].id],
          ageConfirmed: true,
          source: 'ONLINE',
        });
      const orderId = holdRes.body.data.id;

      await request(app)
        .post('/api/v1/payment/simulate-success')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({ orderId });

      // Request export
      const today = new Date().toISOString().slice(0, 10);
      const exportRes = await request(app)
        .get(`/api/v1/admin/reports/export?type=DAILY&from=${today}&to=${today}&format=csv`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('text/csv');
      expect(exportRes.headers['content-disposition']).toContain('attachment');
      expect(exportRes.headers['content-disposition']).toContain('.csv');

      const csvText = exportRes.text;
      // Must start with UTF-8 BOM
      expect(csvText.charCodeAt(0)).toBe(0xFEFF);

      // Header row check
      expect(csvText).toContain('Ngày/Mã');
      expect(csvText).toContain('Doanh thu thuần (VNĐ)');
      expect(csvText).toContain('Số đơn hàng');
      expect(csvText).toContain('Số vé bán ra');

      // Data check: should contain today's date
      expect(csvText).toContain(today);
      const lines = csvText.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[1]).toContain(today);
    });

    it('exports movie revenue breakdown report as CSV', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const exportRes = await request(app)
        .get(`/api/v1/admin/reports/export?type=MOVIE&from=${today}&to=${today}&format=csv`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.headers['content-type']).toContain('text/csv');
      expect(exportRes.text).toContain('Phim');
    });

    it('forbids manager from exporting cross-cinema comparison reports', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const managerId = f.accounts.staff.id;
      await prisma.user.update({
        where: { id: managerId },
        data: { role: 'MANAGER' },
      });
      const managerToken = jwt.sign(
        { userId: managerId, role: 'MANAGER' },
        process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars',
        { expiresIn: '15m' }
      );

      const exportRes = await request(app)
        .get(`/api/v1/admin/reports/export?type=CINEMA&from=${today}&to=${today}&format=csv`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(exportRes.status).toBe(403);
      expect(exportRes.body.error.code).toBe('CINEMA_COMPARISON_FORBIDDEN');
    });
  });
});
