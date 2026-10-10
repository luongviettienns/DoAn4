import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import createApp from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

describe('Admin lifecycle, BR-13 showtime cancellation, and pricing management', () => {
  let f: CoreFixture;

  beforeEach(async () => {
    requireDedicatedTestDatabase();
    f = await CoreFixture.create();
  });

  afterEach(async () => {
    await f.cleanup();
  });

  describe('Movie deactivation and rule BR-13', () => {
    it('deactivating a movie cancels all future showtimes and pending orders, releasing seats', async () => {
      // 1. Create a future showtime with a pending hold
      const futureStartTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const futureShowtimeId = await f.addShowtime(futureStartTime);

      // Place a hold on seat A1
      const holdRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({
          showtimeId: futureShowtimeId,
          seatIds: [f.seats[0].id],
          ageConfirmed: true,
          source: 'ONLINE',
        });
      expect(holdRes.status).toBe(201);
      const orderId = holdRes.body.data.id;

      // Verify seat is HELD
      const seatBefore = await prisma.showtimeSeat.findUnique({
        where: { showtimeId_seatId: { showtimeId: futureShowtimeId, seatId: f.seats[0].id } },
      });
      expect(seatBefore?.status).toBe('HELD');

      // 2. Admin deletes (soft-deactivates) the movie
      const delRes = await request(app)
        .delete(`/api/v1/movies/${f.movieId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // 3. Verify movie is deactivated
      const movie = await prisma.movie.findUnique({ where: { id: f.movieId } });
      expect(movie?.isActive).toBe(false);
      expect(movie?.status).toBe('ENDED');

      // 4. Verify future showtime is cancelled with reason
      const showtime = await prisma.showtime.findUnique({ where: { id: futureShowtimeId } });
      expect(showtime?.status).toBe('CANCELLED');
      expect(showtime?.cancellationReason).toContain('BR-13');
      expect(showtime?.cancelledAt).toBeInstanceOf(Date);

      // 5. Verify pending order was cancelled and seat released
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('CANCELLED');
      expect(order?.cancellationReason).toContain('BR-13');

      const seatAfter = await prisma.showtimeSeat.findUnique({
        where: { showtimeId_seatId: { showtimeId: futureShowtimeId, seatId: f.seats[0].id } },
      });
      expect(seatAfter?.status).toBe('AVAILABLE');
      expect(seatAfter?.orderId).toBeNull();

      // Guard should be removed
      const guard = await prisma.pendingOrderGuard.findUnique({ where: { orderId } });
      expect(guard).toBeNull();

      // Audit log should be recorded
      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'Movie', entityId: f.movieId, action: 'MOVIE_DEACTIVATE_BR13' },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe(f.accounts.admin.id);
    });

    it('cancelling future showtimes on movie hide cancels paid tickets, creates 100% refund request, and reverts points', async () => {
      const futureStartTime = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      const futureShowtimeId = await f.addShowtime(futureStartTime);

      // 1. Create order and pay
      const holdRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({
          showtimeId: futureShowtimeId,
          seatIds: [f.seats[1].id],
          ageConfirmed: true,
          source: 'ONLINE',
        });
      const orderId = holdRes.body.data.id;

      // Simulate payment success (in dev/test) - hệ thống tự động cộng điểm loyalty
      const payRes = await request(app)
        .post('/api/v1/payment/simulate-success')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({ orderId });
      expect(payRes.status).toBe(200);

      // Verify ticket is VALID
      const ticketBefore = await prisma.ticket.findFirst({ where: { orderId } });
      expect(ticketBefore?.status).toBe('VALID');

      // 2. Admin soft-deletes movie
      const delRes = await request(app)
        .delete(`/api/v1/movies/${f.movieId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(delRes.status).toBe(200);

      // 3. Verify order is CANCELLED with refundStatus PENDING
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      expect(order?.status).toBe('CANCELLED');
      expect(order?.refundStatus).toBe('PENDING');

      // 4. Verify ticket is CANCELLED
      const ticketAfter = await prisma.ticket.findFirst({ where: { orderId } });
      expect(ticketAfter?.status).toBe('CANCELLED');

      // 5. Verify RefundRequest is created for 100% amount with cancellationFee = 0
      const refund = await prisma.refundRequest.findFirst({ where: { orderId } });
      expect(refund).not.toBeNull();
      expect(refund?.reason).toBe('SHOWTIME_CANCELLED');
      expect(refund?.status).toBe('PENDING');
      expect(refund?.amount).toBe(order?.total);
      expect(refund?.cancellationFee).toBe(0);

      // 6. Verify loyalty points reverted to 0
      const user = await prisma.user.findUnique({ where: { id: f.accounts.buyer.id } });
      expect(user?.points).toBe(0);
      const loyaltyTx = await prisma.loyaltyTransaction.findFirst({ where: { orderId, type: 'REVERT' } });
      expect(loyaltyTx).not.toBeNull();
      expect(loyaltyTx?.points).toBe(order?.pointsEarned);
    });
  });

  describe('Showtime cancellation endpoint', () => {
    it('cancels showtime with explicit reason, creates refund requests and records AuditLog', async () => {
      const showtimeId = await f.addShowtime(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));

      // Buyer places order and pays
      const holdRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({ showtimeId, seatIds: [f.seats[2].id], ageConfirmed: true, source: 'ONLINE' });
      const orderId = holdRes.body.data.id;

      await request(app)
        .post('/api/v1/payment/simulate-success')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({ orderId });

      // Foreign staff cannot cancel showtime of another cinema
      const foreignRes = await request(app)
        .post(`/api/v1/showtimes/${showtimeId}/cancel`)
        .set('Authorization', `Bearer ${f.accounts.foreignStaff.token}`)
        .send({ reason: 'Sự cố phòng chiếu kỹ thuật' });
      expect(foreignRes.status).toBe(403);

      // Assigned staff / manager / admin cancels showtime
      const cancelRes = await request(app)
        .post(`/api/v1/showtimes/${showtimeId}/cancel`)
        .set('Authorization', `Bearer ${f.accounts.staff.token}`)
        .send({ reason: 'Sự cố máy chiếu IMAX hỏng đèn chiếu' });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe('CANCELLED');

      // Verify showtime status
      const st = await prisma.showtime.findUnique({ where: { id: showtimeId } });
      expect(st?.status).toBe('CANCELLED');
      expect(st?.cancellationReason).toBe('Sự cố máy chiếu IMAX hỏng đèn chiếu');

      // Verify refund request
      const refund = await prisma.refundRequest.findFirst({ where: { orderId } });
      expect(refund?.status).toBe('PENDING');
      expect(refund?.reason).toBe('SHOWTIME_CANCELLED');

      // Calling cancel again on already cancelled showtime returns 400
      const repeatRes = await request(app)
        .post(`/api/v1/showtimes/${showtimeId}/cancel`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({ reason: 'Hủy lại lần hai' });
      expect(repeatRes.status).toBe(400);
      expect(repeatRes.body.error.code).toBe('SHOWTIME_ALREADY_CANCELLED');
    });
  });

  describe('Pricing rules, surcharges, and holidays API', () => {
    it('creates, lists, and prevents deleting price rules currently referenced by order items', async () => {
      // 1. List price rules
      const listRes = await request(app)
        .get(`/api/v1/pricing/rules?cinemaId=${f.cinemaId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      // 2. Upsert a new rule
      const upsertRes = await request(app)
        .post('/api/v1/pricing/rules')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({
          cinemaId: f.cinemaId,
          roomFormat: 'THREE_D',
          dayType: 'WEEKDAY',
          timeSlot: 'EVENING',
          basePrice: 150000,
          effectiveFrom: '2026-10-01',
        });
      expect(upsertRes.status).toBe(200);
      expect(upsertRes.body.data.basePrice).toBe(150000);
      const ruleId = upsertRes.body.data.id;

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'PriceRule', entityId: ruleId, action: 'PRICE_RULE_UPSERT' },
      });
      expect(audit).not.toBeNull();

      // 3. Delete unreferenced rule
      const delRes = await request(app)
        .delete(`/api/v1/pricing/rules/${ruleId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(delRes.status).toBe(200);

      // 4. Now create an order item that references an active rule
      // Place order referencing a rule
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`)
        .send({ showtimeId: f.showtimeId, seatIds: [f.seats[3].id], ageConfirmed: true, source: 'ONLINE' });

      const inUseItem = await prisma.orderItem.findFirst({ where: { showtimeId: f.showtimeId } });
      expect(inUseItem).not.toBeNull();

      // Attempting to delete in-use price rule is rejected
      const delInUse = await request(app)
        .delete(`/api/v1/pricing/rules/${inUseItem!.priceRuleId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(delInUse.status).toBe(400);
      expect(delInUse.body.error.code).toBe('PRICE_RULE_IN_USE');
    });

    it('creates, lists, and manages seat surcharges', async () => {
      // 1. List surcharges
      const listRes = await request(app)
        .get(`/api/v1/pricing/surcharges?cinemaId=${f.cinemaId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(3);

      // 2. Upsert surcharge
      const upsertRes = await request(app)
        .post('/api/v1/pricing/surcharges')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({
          cinemaId: f.cinemaId,
          seatType: 'VIP',
          amount: 25000,
          effectiveFrom: '2026-11-01',
        });
      expect(upsertRes.status).toBe(200);
      expect(upsertRes.body.data.amount).toBe(25000);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { entity: 'SeatSurcharge', action: 'SEAT_SURCHARGE_UPSERT' },
      });
      expect(audit).not.toBeNull();
    });

    it('creates, lists, and deletes holidays', async () => {
      const holidayDate = '2028-09-02';

      // 1. Create holiday
      const createRes = await request(app)
        .post('/api/v1/pricing/holidays')
        .set('Authorization', `Bearer ${f.accounts.admin.token}`)
        .send({
          date: holidayDate,
          name: 'Quốc Khánh 2/9 Test',
        });
      expect(createRes.status).toBe(200);
      expect(createRes.body.data.name).toBe('Quốc Khánh 2/9 Test');
      const holidayId = createRes.body.data.id;

      // 2. List holidays
      const listRes = await request(app)
        .get('/api/v1/pricing/holidays')
        .set('Authorization', `Bearer ${f.accounts.buyer.token}`);
      expect(listRes.status).toBe(200);
      const found = listRes.body.data.some((h: any) => h.id === holidayId);
      expect(found).toBe(true);

      // 3. Delete holiday
      const delRes = await request(app)
        .delete(`/api/v1/pricing/holidays/${holidayId}`)
        .set('Authorization', `Bearer ${f.accounts.admin.token}`);
      expect(delRes.status).toBe(200);

      const checkDel = await prisma.holiday.findUnique({ where: { id: holidayId } });
      expect(checkDel).toBeNull();
    });
  });
});
