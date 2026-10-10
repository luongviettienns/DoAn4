import crypto from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import createApp from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

describe('Refund Management — Admin Workflow', () => {
  let f: CoreFixture;

  beforeEach(async () => {
    requireDedicatedTestDatabase();
    f = await CoreFixture.create();
  });

  afterEach(async () => {
    await f.cleanup();
  });

  /* ═══════════════════════════════════════════
   * Helper: create order → pay → cancel → yields a PENDING RefundRequest
   * ═══════════════════════════════════════════ */
  async function createPaidAndCancelledOrder() {
    // Create order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
      .send({ showtimeId: f.showtimeId, seatIds: [f.seats[0].id], ageConfirmed: true, source: 'ONLINE' });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    // Simulate payment success
    const payRes = await request(app)
      .post('/api/v1/payment/simulate-mock')
      .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
      .send({ orderId });
    expect(payRes.status).toBe(200);

    // Cancel (yields RefundRequest PENDING)
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
      .send({ reason: 'Đổi ý, muốn hoàn tiền' });
    expect(cancelRes.status).toBe(200);

    return orderId;
  }

  describe('GET /api/v1/admin/refunds — List refunds', () => {
    it('returns list of PENDING refunds for ADMIN', async () => {
      const orderId = await createPaidAndCancelledOrder();
      const res = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .query({ status: 'PENDING' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      const refund = res.body.data.items.find((r: any) => r.orderId === orderId);
      expect(refund).toBeDefined();
      expect(refund.status).toBe('PENDING');
      expect(refund.reason).toBe('ORDER_CANCELLED');
      expect(refund.order.code).toBeDefined();
      expect(refund.payment.provider).toBe('VNPAY');
    });

    it('denies CUSTOMER access', async () => {
      const res = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`);
      expect(res.status).toBe(403);
    });

    it('denies STAFF access', async () => {
      const res = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.staff.token}`);
      expect(res.status).toBe(403);
    });

    it('MANAGER without cinema assignment is rejected', async () => {
      // Create a manager account without cinema assignment
      const managerId = crypto.randomUUID();
      const managerEmail = `mgr-no-cinema@${f.namespace}.example.test`;
      f.extraEmails.push(managerEmail);
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars';
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('TestPass123!', 10);
      await prisma.user.create({
        data: {
          id: managerId, email: managerEmail, phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
          fullName: 'No Cinema Manager', role: 'MANAGER', passwordHash: hash,
          birthDate: new Date('1990-01-01'),
        },
      });
      const token = jwt.default.sign({ userId: managerId, role: 'MANAGER' }, secret, { expiresIn: '15m' });
      const res = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/refunds/:id — Refund detail', () => {
    it('returns detailed refund with tickets and payment logs', async () => {
      const orderId = await createPaidAndCancelledOrder();
      // Look up the refund
      const listRes = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .query({ status: 'PENDING' });
      const refund = listRes.body.data.items.find((r: any) => r.orderId === orderId);
      expect(refund).toBeDefined();

      const detailRes = await request(app)
        .get(`/api/v1/admin/refunds/${refund.id}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.id).toBe(refund.id);
      expect(detailRes.body.data.order.tickets.length).toBeGreaterThanOrEqual(1);
      expect(detailRes.body.data.order.tickets[0].ticketStatus).toBe('CANCELLED');
      expect(detailRes.body.data.payment.txnRef).toBeDefined();
    });

    it('returns 404 for non-existent refund', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/refunds/${crypto.randomUUID()}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/admin/refunds/:id/process — Process refund', () => {
    it('transitions PENDING → REFUNDED, creates AuditLog and OutboxEvent', async () => {
      const orderId = await createPaidAndCancelledOrder();
      const listRes = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .query({ status: 'PENDING' });
      const refund = listRes.body.data.items.find((r: any) => r.orderId === orderId);
      expect(refund).toBeDefined();

      const processRes = await request(app)
        .post(`/api/v1/admin/refunds/${refund.id}/process`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({ method: 'BANK_TRANSFER', externalReference: 'TX-REFUND-001', note: 'Hoàn tiền qua ngân hàng' });

      expect(processRes.status).toBe(200);
      expect(processRes.body.success).toBe(true);
      expect(processRes.body.data.status).toBe('REFUNDED');
      expect(processRes.body.data.method).toBe('BANK_TRANSFER');
      expect(processRes.body.data.externalReference).toBe('TX-REFUND-001');

      // Verify DB state: RefundRequest
      const dbRefund = await prisma.refundRequest.findUnique({ where: { id: refund.id } });
      expect(dbRefund!.status).toBe('REFUNDED');
      expect(dbRefund!.processedBy).toBe(f.accounts.admin.id);
      expect(dbRefund!.processedAt).not.toBeNull();
      expect(dbRefund!.method).toBe('BANK_TRANSFER');

      // Verify Order.refundStatus updated
      const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      expect(dbOrder!.refundStatus).toBe('REFUNDED');

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REFUND_PROCESS', entityId: refund.id },
      });
      expect(audit).not.toBeNull();
      expect(audit!.actorId).toBe(f.accounts.admin.id);

      // Verify OutboxEvent
      const outbox = await prisma.outboxEvent.findFirst({
        where: { eventType: 'REFUND_PROCESSED', aggregateId: refund.id },
      });
      expect(outbox).not.toBeNull();
      expect(outbox!.status).toBe('PENDING');
      expect((outbox!.payload as any).method).toBe('BANK_TRANSFER');
    });

    it('rejects processing an already-refunded request (idempotency)', async () => {
      const orderId = await createPaidAndCancelledOrder();
      const listRes = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .query({ status: 'PENDING' });
      const refund = listRes.body.data.items.find((r: any) => r.orderId === orderId);

      // Process first time
      await request(app)
        .post(`/api/v1/admin/refunds/${refund.id}/process`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({ method: 'CASH' });

      // Process second time — must fail
      const res = await request(app)
        .post(`/api/v1/admin/refunds/${refund.id}/process`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({ method: 'CASH' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REFUND_ALREADY_PROCESSED');
    });

    it('rejects invalid/missing method in body', async () => {
      const orderId = await createPaidAndCancelledOrder();
      const listRes = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .query({ status: 'PENDING' });
      const refund = listRes.body.data.items.find((r: any) => r.orderId === orderId);

      const res = await request(app)
        .post(`/api/v1/admin/refunds/${refund.id}/process`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({ method: 'INVALID_METHOD' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('returns 404 when processing non-existent refund', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/refunds/${crypto.randomUUID()}/process`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({ method: 'BANK_TRANSFER' });
      expect(res.status).toBe(404);
    });
  });

  describe('Cinema scope enforcement for MANAGER', () => {
    it('MANAGER with assigned cinema can list and process refunds from their cinema', async () => {
      // Create a MANAGER with cinema assignment to f.cinemaId
      const managerId = crypto.randomUUID();
      const managerEmail = `mgr-assigned@${f.namespace}.example.test`;
      f.extraEmails.push(managerEmail);
      const jwtMod = await import('jsonwebtoken');
      const secret = process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars';
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('TestPass123!', 10);
      await prisma.user.create({
        data: {
          id: managerId, email: managerEmail, phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
          fullName: 'Assigned Manager', role: 'MANAGER', passwordHash: hash,
          birthDate: new Date('1990-01-01'),
        },
      });
      await prisma.userCinema.create({ data: { userId: managerId, cinemaId: f.cinemaId } });
      const managerToken = jwtMod.default.sign({ userId: managerId, role: 'MANAGER' }, secret, { expiresIn: '15m' });

      // Create a refund
      const orderId = await createPaidAndCancelledOrder();

      // Manager can list refunds
      const listRes = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(listRes.status).toBe(200);
      const refund = listRes.body.data.items.find((r: any) => r.orderId === orderId);
      expect(refund).toBeDefined();

      // Manager can process
      const processRes = await request(app)
        .post(`/api/v1/admin/refunds/${refund.id}/process`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ method: 'CASH', note: 'Hoàn tiền mặt tại quầy' });
      expect(processRes.status).toBe(200);
      expect(processRes.body.data.status).toBe('REFUNDED');
    });

    it('MANAGER cannot process refund from cinema not assigned to them', async () => {
      // Create a MANAGER assigned to foreignCinema (NOT f.cinemaId)
      const managerId = crypto.randomUUID();
      const managerEmail = `mgr-foreign@${f.namespace}.example.test`;
      f.extraEmails.push(managerEmail);
      const jwtMod = await import('jsonwebtoken');
      const secret = process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars';
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('TestPass123!', 10);
      await prisma.user.create({
        data: {
          id: managerId, email: managerEmail, phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
          fullName: 'Foreign Manager', role: 'MANAGER', passwordHash: hash,
          birthDate: new Date('1990-01-01'),
        },
      });
      await prisma.userCinema.create({ data: { userId: managerId, cinemaId: f.foreignCinemaId } });
      const managerToken = jwtMod.default.sign({ userId: managerId, role: 'MANAGER' }, secret, { expiresIn: '15m' });

      // Create a refund for cinemaId
      const orderId = await createPaidAndCancelledOrder();

      // Foreign manager should not see the refund in list (filtered by scope)
      const listRes = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(listRes.status).toBe(200);
      const refund = listRes.body.data.items.find((r: any) => r.orderId === orderId);
      expect(refund).toBeUndefined(); // Not visible

      // Try to access detail via known ID (found by admin)
      const adminList = await request(app)
        .get('/api/v1/admin/refunds')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .query({ status: 'PENDING' });
      const refundFromAdmin = adminList.body.data.items.find((r: any) => r.orderId === orderId);
      expect(refundFromAdmin).toBeDefined();

      // Foreign manager can't get detail
      const detailRes = await request(app)
        .get(`/api/v1/admin/refunds/${refundFromAdmin.id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(detailRes.status).toBe(404);

      // Foreign manager can't process
      const processRes = await request(app)
        .post(`/api/v1/admin/refunds/${refundFromAdmin.id}/process`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ method: 'BANK_TRANSFER' });
      expect(processRes.status).toBe(400);
      expect(processRes.body.error.code).toBe('CINEMA_SCOPE_FORBIDDEN');
    });
  });
});
