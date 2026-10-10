import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AgeRating, Role, SeatType } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { qrSignatureService } from '../src/shared/qr-signature.service';
import { requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

type Account = { id: string; role: Role; token: string; email: string };
type AccountKey = 'admin' | 'manager' | 'foreignManager' | 'staff' | 'foreignStaff' | 'customer';

class CheckinAdvancedFixture {
  readonly namespace = `chk-adv-${crypto.randomUUID().slice(0, 8)}`;
  readonly cinemaA = crypto.randomUUID();
  readonly cinemaB = crypto.randomUUID();
  readonly movieId = crypto.randomUUID();
  readonly roomA = crypto.randomUUID();
  readonly accounts: Record<AccountKey, Account>;
  readonly createdShowtimeIds: string[] = [];
  readonly createdOrderIds: string[] = [];
  readonly createdTicketIds: string[] = [];
  readonly seats: Array<{ id: string; rowLabel: string; seatNumber: number; type: SeatType }>;

  constructor() {
    this.accounts = Object.fromEntries(
      ([
        ['admin', Role.ADMIN],
        ['manager', Role.MANAGER],
        ['foreignManager', Role.MANAGER],
        ['staff', Role.STAFF],
        ['foreignStaff', Role.STAFF],
        ['customer', Role.CUSTOMER],
      ] as const).map(([name, role]) => {
        const id = crypto.randomUUID();
        const email = `${name}-${this.namespace}@example.test`.toLowerCase();
        const token = jwt.sign(
          { userId: id, role },
          process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars',
          { expiresIn: '15m' }
        );
        return [name, { id, role, token, email }];
      })
    ) as Record<AccountKey, Account>;

    this.seats = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      rowLabel: 'A',
      seatNumber: i + 1,
      type: SeatType.STANDARD,
    }));
  }

  static async create() {
    requireDedicatedTestDatabase();
    const fixture = new CheckinAdvancedFixture();
    const passwordHash = await bcrypt.hash('AdvCheckin123!', 10);

    await prisma.$transaction(async (tx) => {
      // 1. Cinemas
      await tx.cinema.createMany({
        data: [
          {
            id: fixture.cinemaA,
            name: `${fixture.namespace}-CinemaA`,
            address: '100 Cau Giay',
            city: 'Hà Nội',
            phone: '0901111111',
            openTime: new Date('1970-01-01T01:00:00Z'),
            closeTime: new Date('1970-01-01T16:00:00Z'),
            status: 'ACTIVE',
          },
          {
            id: fixture.cinemaB,
            name: `${fixture.namespace}-CinemaB`,
            address: '200 Ba Trieu',
            city: 'Hà Nội',
            phone: '0902222222',
            openTime: new Date('1970-01-01T01:00:00Z'),
            closeTime: new Date('1970-01-01T16:00:00Z'),
            status: 'ACTIVE',
          },
        ],
      });

      // 2. Users
      await tx.user.createMany({
        data: Object.entries(fixture.accounts).map(([name, acc]) => ({
          id: acc.id,
          email: acc.email,
          phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
          role: acc.role,
          fullName: `User ${name}`,
          passwordHash,
          status: 'ACTIVE',
          birthDate: new Date('1995-01-01'),
        })),
      });

      // 3. User Cinemas:
      // Manager & Staff belong to CinemaA
      // ForeignManager & ForeignStaff belong to CinemaB
      await tx.userCinema.createMany({
        data: [
          { userId: fixture.accounts.manager.id, cinemaId: fixture.cinemaA },
          { userId: fixture.accounts.staff.id, cinemaId: fixture.cinemaA },
          { userId: fixture.accounts.foreignManager.id, cinemaId: fixture.cinemaB },
          { userId: fixture.accounts.foreignStaff.id, cinemaId: fixture.cinemaB },
        ],
      });

      // 4. Movie
      await tx.movie.create({
        data: {
          id: fixture.movieId,
          title: `Movie-${fixture.namespace}`,
          posterUrl: 'https://example.test/poster.jpg',
          description: 'Advanced Checkin Movie',
          durationMin: 120,
          ageRating: AgeRating.P,
          releaseDate: new Date('2026-01-01'),
          status: 'NOW_SHOWING',
        },
      });

      // 5. Room & Seats for CinemaA
      await tx.room.create({
        data: {
          id: fixture.roomA,
          cinemaId: fixture.cinemaA,
          name: `Room-A-${fixture.namespace}`,
          format: 'TWO_D',
          rowCount: 1,
          columnCount: 10,
        },
      });

      await tx.seat.createMany({
        data: fixture.seats.map((s, idx) => ({
          id: s.id,
          roomId: fixture.roomA,
          rowLabel: s.rowLabel,
          seatNumber: s.seatNumber,
          type: s.type,
          x: idx,
          y: 0,
          columnSpan: 1,
        })),
      });

      // 6. Price rule & Seat Surcharge
      await tx.priceRule.createMany({
        data: (['WEEKDAY', 'WEEKEND', 'HOLIDAY'] as const).flatMap((dayType) =>
          (['MORNING', 'AFTERNOON', 'EVENING'] as const).map((timeSlot) => ({
            cinemaId: fixture.cinemaA,
            roomFormat: 'TWO_D' as const,
            dayType,
            timeSlot,
            basePrice: 90000,
            effectiveFrom: new Date('2020-01-01'),
          }))
        ),
      });

      await tx.seatSurcharge.create({
        data: {
          cinemaId: fixture.cinemaA,
          seatType: SeatType.STANDARD,
          amount: 0,
          effectiveFrom: new Date('2020-01-01'),
        },
      });
    });

    return fixture;
  }

  /**
   * Helper phát hành vé gắn với suất chiếu có thời gian bắt đầu xác định (offset phút so với hiện tại)
   */
  async issueTicket(offsetMinutes: number, seatIndex = 0) {
    const showtimeId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const orderItemId = crypto.randomUUID();
    const showtimeSeatId = crypto.randomUUID();
    const ticketId = crypto.randomUUID();
    const ticketCode = 'TK' + crypto.randomBytes(5).toString('hex').toUpperCase();

    const now = Date.now();
    const startTime = new Date(now + offsetMinutes * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);
    const seat = this.seats[seatIndex];

    this.createdShowtimeIds.push(showtimeId);
    this.createdOrderIds.push(orderId);
    this.createdTicketIds.push(ticketId);

    const priceRule = await prisma.priceRule.findFirst({ where: { cinemaId: this.cinemaA } });
    const surcharge = await prisma.seatSurcharge.findFirst({ where: { cinemaId: this.cinemaA } });

    await prisma.$transaction(async (tx) => {
      // Create showtime
      await tx.showtime.create({
        data: {
          id: showtimeId,
          movieId: this.movieId,
          roomId: this.roomA,
          format: 'TWO_D',
          language: 'SUBTITLED',
          startTime,
          endTime,
          status: 'OPEN',
        },
      });

      // Create Order
      await tx.order.create({
        data: {
          id: orderId,
          code: 'MV' + crypto.randomBytes(4).toString('hex').toUpperCase(),
          userId: this.accounts.customer.id,
          showtimeId,
          ticketSubtotal: 90000,
          comboSubtotal: 0,
          subtotal: 90000,
          discount: 0,
          total: 90000,
          status: 'PAID',
          paidAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          createdBy: this.accounts.customer.id,
          movieTitleSnapshot: 'Test Movie',
          cinemaNameSnapshot: 'Test Cinema A',
          cinemaAddressSnapshot: '100 Cau Giay',
          roomNameSnapshot: 'Room A',
          showtimeStartSnapshot: startTime,
          formatSnapshot: 'TWO_D',
          languageSnapshot: 'SUBTITLED',
          ageRatingSnapshot: AgeRating.P,
        },
      });

      // Create showtime seat
      await tx.showtimeSeat.create({
        data: {
          id: showtimeSeatId,
          showtimeId,
          roomId: this.roomA,
          seatId: seat.id,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          seatType: seat.type,
          x: 0,
          y: 0,
          columnSpan: 1,
          status: 'SOLD',
          orderId,
        },
      });

      // Create OrderItem
      await tx.orderItem.create({
        data: {
          id: orderItemId,
          orderId,
          showtimeId,
          showtimeSeatId,
          seatId: seat.id,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          seatType: seat.type,
          x: 0,
          y: 0,
          columnSpan: 1,
          basePrice: 90000,
          surcharge: 0,
          price: 90000,
          priceRuleId: priceRule!.id,
          surchargeId: surcharge!.id,
        },
      });

      // Create Ticket
      await tx.ticket.create({
        data: {
          id: ticketId,
          ticketCode,
          orderItemId,
          orderId,
          showtimeId,
          seatId: seat.id,
          status: 'VALID',
          qrKeyVersion: 1,
        },
      });
    });

    const signedQr = qrSignatureService.signTicketCode(ticketCode, 1);
    return { ticketId, ticketCode, signedQr, showtimeId, orderId };
  }

  async cleanup() {
    const userIds = Object.values(this.accounts).map((a) => a.id);
    await prisma.$transaction(async (tx) => {
      await tx.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
      await tx.ticket.deleteMany({ where: { id: { in: this.createdTicketIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: this.createdOrderIds } } });
      await tx.showtimeSeat.deleteMany({ where: { showtimeId: { in: this.createdShowtimeIds } } });
      await tx.order.deleteMany({ where: { id: { in: this.createdOrderIds } } });
      await tx.showtime.deleteMany({ where: { id: { in: this.createdShowtimeIds } } });
      await tx.seat.deleteMany({ where: { roomId: this.roomA } });
      await tx.room.deleteMany({ where: { id: this.roomA } });
      await tx.priceRule.deleteMany({ where: { cinemaId: this.cinemaA } });
      await tx.seatSurcharge.deleteMany({ where: { cinemaId: this.cinemaA } });
      await tx.movie.deleteMany({ where: { id: this.movieId } });
      await tx.userCinema.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.cinema.deleteMany({ where: { id: { in: [this.cinemaA, this.cinemaB] } } });
    });
  }
}

describe('Advanced Check-in: Signed QR & Checkin Window with Manager Bypass (Group C - Đợt 3)', () => {
  let fixture: CheckinAdvancedFixture;

  beforeAll(async () => {
    fixture = await CheckinAdvancedFixture.create();
  });

  afterAll(async () => {
    delete process.env.STRICT_QR_VERIFICATION;
    if (fixture) await fixture.cleanup();
  });

  describe('1. Signed QR Token (HMAC-SHA256 Truncated 16 bytes base64url)', () => {
    it('Định dạng signed QR tuân thủ chuẩn v<keyVersion>.<ticketCode>.<sig>', async () => {
      const ticketCode = 'TKTEST123456';
      const signed = qrSignatureService.signTicketCode(ticketCode, 1);

      expect(signed).toMatch(/^v1\.TKTEST123456\.[A-Za-z0-9_-]{22}$/);
      const parsed = qrSignatureService.verifyAndExtractTicketCode(signed);
      expect(parsed.valid).toBe(true);
      expect(parsed.ticketCode).toBe(ticketCode);
      expect(parsed.isSigned).toBe(true);
      expect(parsed.keyVersion).toBe(1);
    });

    it('Soát vé thành công bằng Signed QR token hợp lệ (HTTP 200, status -> USED)', async () => {
      // Suất chiếu đang diễn ra (-5 phút) nằm trong khoảng [-30m, +15m]
      const { ticketCode, signedQr } = await fixture.issueTicket(-5, 0);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: signedQr });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result).toBe('OK');
      expect(res.body.data.ticket.ticketCode).toBe(ticketCode);
      expect(res.body.data.ticket.status).toBe('USED');
    });

    it('Từ chối khi chữ ký bị chỉnh sửa (Tampered signature -> HTTP 400 INVALID_QR_SIGNATURE)', async () => {
      const { signedQr } = await fixture.issueTicket(-5, 1);
      // Thay đổi 1 ký tự cuối trong chữ ký
      const tamperedQr = signedQr.slice(0, -1) + (signedQr.endsWith('a') ? 'b' : 'a');

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: tamperedQr });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_QR_SIGNATURE');
    });

    it('Từ chối khi mã vé bị chỉnh sửa nhưng giữ nguyên chữ ký (HTTP 400 INVALID_QR_SIGNATURE)', async () => {
      const { signedQr } = await fixture.issueTicket(-5, 2);
      const parts = signedQr.split('.');
      // Thay đổi mã vé
      parts[1] = 'TKFAKE999999';
      const tamperedQr = parts.join('.');

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: tamperedQr });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_QR_SIGNATURE');
    });

    it('Từ chối khi keyVersion không được hỗ trợ (HTTP 400 KEY_VERSION_UNSUPPORTED)', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: 'v999.TK1234567890.abcdefghijklmnop123456' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('KEY_VERSION_UNSUPPORTED');
    });

    it('Cấu hình STRICT_QR_VERIFICATION: Khi bật, từ chối mã thô; khi tắt, cho phép fallback', async () => {
      const { ticketCode } = await fixture.issueTicket(-5, 3);

      // 1. Khi STRICT bật
      process.env.STRICT_QR_VERIFICATION = 'true';
      const strictRes = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ ticketCode });

      expect(strictRes.status).toBe(400);
      expect(strictRes.body.error.code).toBe('UNSIGNED_QR_NOT_ALLOWED');

      // 2. Khi STRICT tắt
      process.env.STRICT_QR_VERIFICATION = 'false';
      const fallbackRes = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ ticketCode });

      expect(fallbackRes.status).toBe(200);
      expect(fallbackRes.body.success).toBe(true);
      expect(fallbackRes.body.data.ticket.status).toBe('USED');
    });
  });

  describe('2. Cửa sổ soát vé (-30 phút đến +15 phút so với giờ chiếu)', () => {
    it('Suất chiếu còn quá sớm (> +30 phút nữa mới chiếu): Bị từ chối với HTTP 400 CHECKIN_WINDOW_EARLY', async () => {
      // Suất chiếu 45 phút nữa mới bắt đầu (ngoài cửa sổ sớm)
      const { signedQr } = await fixture.issueTicket(45, 4);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: signedQr });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CHECKIN_WINDOW_EARLY');
      expect(res.body.error.message).toContain('trước giờ chiếu 30 phút');
    });

    it('Suất chiếu trong cửa sổ hợp lệ trước giờ chiếu (-20 phút): Cho phép soát vé bình thường', async () => {
      // Suất chiếu 20 phút nữa bắt đầu (nằm trong [-30m, +15m])
      const { signedQr } = await fixture.issueTicket(20, 5);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: signedQr });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket.status).toBe('USED');
      expect(res.body.data.isBypassed).toBe(false);
    });

    it('Suất chiếu trong cửa sổ hợp lệ sau khi phim vừa bắt đầu (+10 phút): Cho phép soát vé bình thường', async () => {
      // Suất chiếu đã bắt đầu 10 phút trước (nằm trong [-30m, +15m])
      const { signedQr } = await fixture.issueTicket(-10, 6);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: signedQr });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket.status).toBe('USED');
      expect(res.body.data.isBypassed).toBe(false);
    });

    it('Suất chiếu đã bắt đầu quá 15 phút (+25 phút): Từ chối soát vé tiêu chuẩn với HTTP 400 CHECKIN_WINDOW_EXPIRED', async () => {
      // Suất chiếu đã bắt đầu 25 phút trước (quá hạn +15m)
      const { signedQr } = await fixture.issueTicket(-25, 7);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({ qrPayload: signedQr });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CHECKIN_WINDOW_EXPIRED');
      expect(res.body.error.message).toContain('bắt đầu quá 15 phút');
    });
  });

  describe('3. Cơ chế Quản lý Duyệt Ngoại lệ (Manager Bypass & Audit Logging)', () => {
    it('Nhân viên (STAFF) thử bypass khi quá 15 phút: Bị từ chối với HTTP 403 STAFF_CANNOT_BYPASS_WINDOW', async () => {
      const { signedQr } = await fixture.issueTicket(-30, 8);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.staff.token}`)
        .send({
          qrPayload: signedQr,
          bypassWindow: true,
          bypassReason: 'Khách đến trễ vì trời mưa to kẹt xe',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('STAFF_CANNOT_BYPASS_WINDOW');
    });

    it('Quản lý rạp khác (Foreign Manager) thử bypass rạp này: Bị từ chối với HTTP 403 CINEMA_SCOPE_DENIED', async () => {
      const { signedQr } = await fixture.issueTicket(-30, 9);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.foreignManager.token}`)
        .send({
          qrPayload: signedQr,
          bypassWindow: true,
          bypassReason: 'Quản lý rạp khác muốn duyệt ngoại lệ',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CINEMA_SCOPE_DENIED');
    });

    it('Quản lý đúng rạp gửi bypass nhưng thiếu lý do hoặc lý do quá ngắn (<5 chars): Bị từ chối HTTP 400', async () => {
      const { signedQr } = await fixture.issueTicket(-30, 0);

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.manager.token}`)
        .send({
          qrPayload: signedQr,
          bypassWindow: true,
          bypassReason: 'Late', // < 5 characters
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Quản lý đúng rạp (MANAGER) duyệt bypass thành công: Trả về 200, status USED, tạo AuditLog chi tiết', async () => {
      const { ticketId, ticketCode, signedQr, showtimeId } = await fixture.issueTicket(-35, 1);
      const bypassReason = 'Khách gặp sự cố giao thông, Manager xác nhận cho vào phòng';

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.manager.token}`)
        .send({
          qrPayload: signedQr,
          bypassWindow: true,
          bypassReason,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result).toBe('OK');
      expect(res.body.data.ticket.status).toBe('USED');
      expect(res.body.data.isBypassed).toBe(true);
      expect(res.body.data.bypassReason).toBe(bypassReason);

      // Verify Audit Log entry in DB
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          actorId: fixture.accounts.manager.id,
          action: 'CHECKIN_WINDOW_BYPASS',
          entityId: ticketId,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('CHECKIN_WINDOW_BYPASS');
      const payload = auditLog?.newValue as any;
      expect(payload.ticketCode).toBe(ticketCode);
      expect(payload.showtimeId).toBe(showtimeId);
      expect(payload.bypassReason).toBe(bypassReason);
      expect(payload.lateMinutes).toBeGreaterThanOrEqual(30);
    });

    it('Quản trị viên (ADMIN) duyệt bypass thành công: Trả về 200 và ghi nhận AuditLog', async () => {
      const { ticketId, signedQr } = await fixture.issueTicket(-40, 2);
      const bypassReason = 'Admin hệ thống can thiệp hỗ trợ đoàn khách đặc biệt';

      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${fixture.accounts.admin.token}`)
        .send({
          qrPayload: signedQr,
          bypassWindow: true,
          bypassReason,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isBypassed).toBe(true);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          actorId: fixture.accounts.admin.id,
          action: 'CHECKIN_WINDOW_BYPASS',
          entityId: ticketId,
        },
      });
      expect(auditLog).toBeDefined();
    });
  });

  describe('4. Order Service Integration (API trả về qrCode đã ký cho frontend)', () => {
    it('API chi tiết đơn hàng trả về qrCode signed và verify được bằng qrSignatureService', async () => {
      const { orderId, ticketCode } = await fixture.issueTicket(10, 3);

      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${fixture.accounts.customer.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const items = res.body.data.items;
      expect(items.length).toBeGreaterThan(0);
      const ticket = items[0].ticket;
      expect(ticket).toBeDefined();
      expect(ticket.ticketCode).toBe(ticketCode);
      expect(ticket.qrCode).toBeDefined();

      // Verify the returned qrCode is cryptographically valid
      const parsed = qrSignatureService.verifyAndExtractTicketCode(ticket.qrCode);
      expect(parsed.valid).toBe(true);
      expect(parsed.ticketCode).toBe(ticketCode);
      expect(parsed.isSigned).toBe(true);
    });
  });
});
