import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';

const app = createApp();

describe('Phase 5: Ticket Check-in (F08), Booking History (F06), Worker Sweeper (F19)', () => {
  let customerToken: string;
  let customerId: string;
  let staffToken: string;
  let staffId: string;
  let orderId: string;
  let testTicketCode: string;
  let testShowtimeId: string;

  beforeAll(async () => {
    // 1. Tạo hoặc đăng nhập tài khoản Khách hàng
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const registerCustomer = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `customer_p5_${randomSuffix}@gmail.com`,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        fullName: 'Khách Hàng Phase 5',
        password: 'Password123',
      });
    customerToken = registerCustomer.body.data.accessToken;
    customerId = registerCustomer.body.data.user.id;

    // 2. Đăng nhập tài khoản Nhân viên rạp (Staff)
    const staffUser = await prisma.user.findFirst({
      where: { role: 'STAFF' },
    });

    if (staffUser) {
      staffId = staffUser.id;
      // Đăng nhập nhân viên với mật khẩu seed 12345678
      const loginStaff = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: staffUser.email,
          password: '12345678',
        });

      if (loginStaff.body.data?.accessToken) {
        staffToken = loginStaff.body.data.accessToken;
      } else {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash('Password123!', 10);
        await prisma.user.update({
          where: { id: staffUser.id },
          data: { passwordHash: hash },
        });
        const retry = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: staffUser.email,
            password: 'Password123!',
          });
        staffToken = retry.body.data.accessToken;
      }
    }

    // 3. Chuẩn bị 1 đơn hàng đã thanh toán và có vé Ticket
    // Tạo 1 showtime độc lập riêng cho test suite này tại rạp của nhân viên
    const staffCinema = await prisma.userCinema.findFirst({ where: { userId: staffId } });
    const cinemaId = staffCinema!.cinemaId;
    const movie = await prisma.movie.findFirst();
    const room = await prisma.room.findFirst({
      where: { cinemaId },
      include: { seats: true },
    });

    testShowtimeId = crypto.randomUUID();
    // startTime = now + 20 phút: đủ điều kiện đặt vé (> now + 15m) và nằm trong cửa sổ soát vé ([-30m, +15m])
    const startTime = new Date(Date.now() + 20 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 120 * 60 * 1000);

    await prisma.showtime.create({
      data: {
        id: testShowtimeId,
        movieId: movie!.id,
        roomId: room!.id,
        format: room!.format,
        language: 'SUBTITLED',
        startTime,
        endTime,
        status: 'OPEN',
      },
    });

    await prisma.showtimeSeat.createMany({
      data: room!.seats.map((seat) => ({
        showtimeId: testShowtimeId,
        roomId: room!.id,
        seatId: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.type,
        x: seat.x,
        y: seat.y,
        columnSpan: seat.columnSpan,
        status: 'AVAILABLE',
      })),
    });

    const seatId = room!.seats[0].id;

    // Tạo đơn và thanh toán mock
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        showtimeId: testShowtimeId,
        seatIds: [seatId],
        ageConfirmed: true,
      });

    orderId = orderRes.body.data.id;

    // Kích hoạt mô phỏng thanh toán
    await request(app)
      .post('/api/v1/payment/simulate-mock')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId });

    // Lấy thông tin vé vừa phát hành
    const ticket = await prisma.ticket.findFirst({
      where: { orderId },
    });
    expect(ticket).not.toBeNull();
    testTicketCode = ticket!.ticketCode;
  });

  describe('F08: Quản lý & Soát vé QR (Check-in)', () => {
    it('Nhân viên soát vé hợp lệ thành công (status -> USED, ghi nhận checkedInAt & checkedInBy)', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          ticketCode: testTicketCode,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result).toBe('OK');
      expect(res.body.data.ticket.status).toBe('USED');
      expect(res.body.data.ticket.ticketCode).toBe(testTicketCode);
      expect(res.body.data.showtime.id).toBe(testShowtimeId);
    });

    it('Từ chối soát lại vé đã qua sử dụng (Quy tắc BR-11: Single-use check-in -> 409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          ticketCode: testTicketCode,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TICKET_ALREADY_USED');
    });

    it('Chặn tài khoản Khách hàng (CUSTOMER) thực hiện soát vé (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ticketCode: testTicketCode,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Trả về lỗi 404 khi mã vé không tồn tại trong hệ thống', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          ticketCode: 'TK0000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    it('Lấy thống kê lượt soát vé trong ngày (GET /api/v1/checkin/stats)', async () => {
      const res = await request(app)
        .get('/api/v1/checkin/stats')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkedInCount).toBeGreaterThanOrEqual(1);
    });

    it('Lấy danh sách lịch sử soát vé gần đây (GET /api/v1/checkin/history)', async () => {
      const res = await request(app)
        .get('/api/v1/checkin/history')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((t: any) => t.ticketCode === testTicketCode)).toBe(true);
    });
  });

  describe('F06: Lịch sử đặt vé khách hàng (/me/orders)', () => {
    it('Khách hàng xem được lịch sử đặt vé của mình (GET /api/v1/me/orders)', async () => {
      const res = await request(app)
        .get('/api/v1/me/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);

      const foundOrder = res.body.data.items.find((o: any) => o.id === orderId);
      expect(foundOrder).toBeDefined();
      expect(foundOrder.status).toBe('PAID');
      expect(foundOrder.items[0].ticket).not.toBeNull();
      expect(foundOrder.items[0].ticket.ticketCode).toBe(testTicketCode);
    });

    it('Khách hàng xem chi tiết đơn hàng (GET /api/v1/me/orders/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/me/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orderId);
    });
  });

  describe('F19: Background Worker giải phóng đơn & ghế quá hạn', () => {
    it('Tự động quét và giải phóng đơn hàng PENDING_PAYMENT đã hết hạn (status -> EXPIRED, ghế -> AVAILABLE)', async () => {
      // 1. Tìm bất kỳ suất chiếu OPEN nào có ghế AVAILABLE
      const showtimes = await prisma.showtime.findMany({
        where: { status: 'OPEN' },
        include: {
          slots: { where: { status: 'AVAILABLE' }, take: 1 },
        },
      });
      const showtime = showtimes.find((s) => s.slots.length > 0);

      if (!showtime || showtime.slots.length === 0) {
        console.warn('[F19 Worker Test] Bỏ qua: Không còn ghế AVAILABLE để kiểm thử sweeper');
        return;
      }

      const workerShowtimeId = showtime.id;
      const seatToHold = showtime.slots[0].seatId;

      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showtimeId: workerShowtimeId,
          seatIds: [seatToHold],
          ageConfirmed: true,
        });

      const tempOrderId = orderRes.body.data?.id;
      if (!tempOrderId) {
        console.warn('[F19 Worker Test] Bỏ qua: Không thể tạo đơn hàng tạm thời');
        return;
      }

      // Cố tình chuyển expiresAt và holdExpiresAt về 15 phút trước
      const pastDate = new Date(Date.now() - 15 * 60 * 1000);
      await prisma.order.update({
        where: { id: tempOrderId },
        data: { expiresAt: pastDate },
      });
      await prisma.showtimeSeat.updateMany({
        where: { orderId: tempOrderId },
        data: { holdExpiresAt: pastDate },
      });

      // 2. Gọi Worker Sweeper (F19)
      const adminLogin = await request(app).post('/api/v1/auth/login')
        .send({ email: 'admin@cinex.vn', password: '12345678' });
      expect(adminLogin.status).toBe(200);
      const sweepRes = await request(app)
        .post('/api/v1/ops/sweep-expired')
        .set('Authorization', `Bearer ${adminLogin.body.data.accessToken}`);

      expect(sweepRes.status).toBe(200);
      expect(sweepRes.body.success).toBe(true);
      expect(sweepRes.body.data.expiredOrdersCount).toBeGreaterThanOrEqual(1);
      expect(sweepRes.body.data.releasedSeatsCount).toBeGreaterThanOrEqual(1);

      // 3. Kiểm tra đơn hàng đã đổi sang EXPIRED
      const orderAfter = await prisma.order.findUnique({
        where: { id: tempOrderId },
      });
      expect(orderAfter?.status).toBe('EXPIRED');

      // 4. Kiểm tra ghế đã trả về AVAILABLE
      const seatAfter = await prisma.showtimeSeat.findFirst({
        where: { showtimeId: workerShowtimeId, seatId: seatToHold },
      });
      expect(seatAfter?.status).toBe('AVAILABLE');
      expect(seatAfter?.orderId).toBeNull();
      expect(seatAfter?.holdExpiresAt).toBeNull();
    });
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.ticket.deleteMany({ where: { orderId } });
      await prisma.order.updateMany({ where: { id: orderId }, data: { settledPaymentId: null } });
      await prisma.paymentLog.deleteMany({ where: { payment: { orderId } } });
      await prisma.loyaltyTransaction.deleteMany({ where: { orderId } });
      await prisma.pendingOrderGuard.deleteMany({ where: { orderId } });
      await prisma.showtimeSeat.updateMany({ where: { orderId }, data: { orderId: null } });
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (testShowtimeId) {
      await prisma.ticket.deleteMany({ where: { showtimeId: testShowtimeId } });
      await prisma.orderItem.deleteMany({ where: { showtimeId: testShowtimeId } });
      await prisma.pendingOrderGuard.deleteMany({ where: { showtimeId: testShowtimeId } });
      await prisma.paymentLog.deleteMany({ where: { payment: { order: { showtimeId: testShowtimeId } } } });
      await prisma.payment.deleteMany({ where: { order: { showtimeId: testShowtimeId } } });
      await prisma.order.deleteMany({ where: { showtimeId: testShowtimeId } });
      await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtimeId } });
      await prisma.showtime.deleteMany({ where: { id: testShowtimeId } });
    }
    if (customerId) {
      const userOrders = await prisma.order.findMany({ where: { createdBy: customerId }, select: { id: true } });
      const userOrderIds = userOrders.map((o) => o.id);
      if (userOrderIds.length > 0) {
        await prisma.ticket.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await prisma.order.updateMany({ where: { id: { in: userOrderIds } }, data: { settledPaymentId: null } });
        await prisma.paymentLog.deleteMany({ where: { payment: { orderId: { in: userOrderIds } } } });
        await prisma.loyaltyTransaction.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await prisma.pendingOrderGuard.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await prisma.showtimeSeat.updateMany({ where: { orderId: { in: userOrderIds } }, data: { orderId: null } });
        await prisma.payment.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: userOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: userOrderIds } } });
      }
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
  });
});
