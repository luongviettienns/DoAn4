import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';

const app = createApp();

let adminToken = '';
let staffToken = '';
let customerToken = '';
let customerId = '';
let showtimeId = '';
let availableSeats: any[] = [];
let sampleCombo: any = null;

describe('Phase 6: Combos, Vouchers, Counter Sales & Admin Reports (F07, F13, F14, F16)', () => {
  beforeAll(async () => {
    // 1. Lấy token Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@cinex.vn', password: '12345678' });
    adminToken = adminRes.body.data.accessToken;

    // 2. Lấy token Staff
    const staffRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@cinex.vn', password: '12345678' });
    staffToken = staffRes.body.data.accessToken;

    // 3. Lấy token Customer
    const custRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'customer@gmail.com', password: '12345678' });
    customerToken = custRes.body.data.accessToken;
    customerId = custRes.body.data.user.id;

    // 4. Lấy suất chiếu mở bán với đủ ghế AVAILABLE
    const showtimes = await prisma.showtime.findMany({
      where: { status: 'OPEN' },
      include: {
        slots: { where: { status: 'AVAILABLE' } },
      },
    });
    // Pick showtime with most available seats (at least 4 needed)
    const showtime = showtimes.sort((a, b) => b.slots.length - a.slots.length)[0];
    expect(showtime).toBeDefined();
    if (!showtime || showtime.slots.length < 4) {
      throw new Error(`Cần ít nhất 4 ghế AVAILABLE cho kịch bản kiểm thử (có ${showtime?.slots.length ?? 0})`);
    }
    showtimeId = showtime.id;

    availableSeats = await prisma.showtimeSeat.findMany({
      where: { showtimeId, status: 'AVAILABLE' },
      take: 6,
    });

    // 5. Dọn sạch TẤT CẢ redemptions của customer để reset giới hạn sử dụng voucher
    await prisma.voucherRedemption.deleteMany({
      where: { userId: customerId },
    });
    // Dọn pendingOrderGuard
    await prisma.pendingOrderGuard.deleteMany({ where: { userId: customerId } });
  });

  describe('1. Quản lý Combos bắp nước (F13)', () => {
    it('GET /api/v1/combos - Khách hàng có thể xem danh sách combo đang mở bán', async () => {
      const res = await request(app).get('/api/v1/combos');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      sampleCombo = res.body.data[0];
      expect(sampleCombo).toHaveProperty('name');
      expect(sampleCombo).toHaveProperty('price');
      expect(sampleCombo.isActive).toBe(true);
    });

    it('POST /api/v1/combos - Admin có thể tạo mới combo', async () => {
      const newCombo = {
        name: 'Combo Test Vitest Phase 6',
        description: 'Bắp rang bơ caramel + Trà đào',
        price: 85000,
        isActive: true,
      };

      const res = await request(app)
        .post('/api/v1/combos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCombo);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newCombo.name);
      expect(res.body.data.price).toBe(85000);

      const createdId = res.body.data.id;

      // Cập nhật combo
      const updateRes = await request(app)
        .put(`/api/v1/combos/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 90000 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.price).toBe(90000);

      // Xóa/ngừng kích hoạt combo
      const delRes = await request(app)
        .delete(`/api/v1/combos/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });
  });

  describe('2. Xác thực và tính giảm giá Voucher (F13)', () => {
    it('POST /api/v1/vouchers/validate - Xác thực thành công voucher phần trăm có mức trần (CINEX20)', async () => {
      const res = await request(app)
        .post('/api/v1/vouchers/validate')
        .send({
          code: 'CINEX20',
          orderAmount: 300000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      // 20% của 300.000đ = 60.000đ, nhưng trần maxDiscount = 40.000đ
      expect(res.body.data.discount).toBe(40000);
      expect(res.body.data.finalAmount).toBe(260000);
    });

    it('POST /api/v1/vouchers/validate - Xác thực voucher giảm cố định (GIAM30K)', async () => {
      const res = await request(app)
        .post('/api/v1/vouchers/validate')
        .send({
          code: 'GIAM30K',
          orderAmount: 150000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.discount).toBe(30000);
      expect(res.body.data.finalAmount).toBe(120000);
    });

    it('POST /api/v1/vouchers/validate - Từ chối nếu đơn hàng chưa đạt giá trị tối thiểu minOrder', async () => {
      const res = await request(app)
        .post('/api/v1/vouchers/validate')
        .send({
          code: 'GIAM30K',
          orderAmount: 50000, // minOrder là 120.000đ
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VOUCHER_MIN_ORDER_NOT_MET');
    });

    it('POST /api/v1/vouchers/validate - Từ chối mã voucher không tồn tại', async () => {
      const res = await request(app)
        .post('/api/v1/vouchers/validate')
        .send({
          code: 'VOUCHER_KHONG_TON_TAI_999',
          orderAmount: 200000,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VOUCHER_NOT_FOUND');
    });
  });

  describe('3. Đặt vé trực tuyến kèm Combo và Voucher (F03, F13)', () => {
    let orderIdWithCombo = '';

    it('POST /api/v1/orders - Tạo đơn giữ vé kèm combo bắp nước và áp voucher giảm giá', async () => {
      const seat = availableSeats[0];

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showtimeId,
          seatIds: [seat.seatId],
          ageConfirmed: true,
          combos: [
            {
              comboId: sampleCombo.id,
              quantity: 2,
            },
          ],
          voucherCode: 'CINEX20',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      orderIdWithCombo = data.id;

      expect(data.status).toBe('PENDING_PAYMENT');
      expect(data.combos.length).toBe(1);
      expect(data.combos[0].quantity).toBe(2);
      expect(data.comboSubtotal).toBe(sampleCombo.price * 2);

      // Kiểm tra chuẩn phương trình tiền tệ
      expect(data.subtotal).toBe(data.ticketSubtotal + data.comboSubtotal);
      expect(data.discount).toBeGreaterThan(0);
      expect(data.total).toBe(data.subtotal - data.discount);

      // Kiểm tra bản ghi voucher redemption được giữ chỗ RESERVED
      const redemption = await prisma.voucherRedemption.findFirst({
        where: { orderId: orderIdWithCombo },
      });
      expect(redemption).toBeDefined();
      expect(redemption!.status).toBe('RESERVED');
    });

    it('Mô phỏng thanh toán hoàn tất đơn hàng có combo và voucher', async () => {
      const payRes = await request(app)
        .post(`/api/v1/payment/simulate/${orderIdWithCombo}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(payRes.status).toBe(200);

      // Kiểm tra voucher redemption đã chuyển sang CONSUMED
      const redemption = await prisma.voucherRedemption.findFirst({
        where: { orderId: orderIdWithCombo },
      });
      expect(redemption!.status).toBe('CONSUMED');
      expect(redemption!.consumedAt).toBeDefined();
    });
  });

  describe('4. Bán vé trực tiếp tại quầy (F07 - Counter Ticket Sales)', () => {
    it('POST /api/v1/orders/counter - Nhân viên quầy bán vé trực tiếp, thanh toán tiền mặt và xuất vé ngay', async () => {
      const seatsToSell = [availableSeats[1].seatId, availableSeats[2].seatId];

      const res = await request(app)
        .post('/api/v1/orders/counter')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          showtimeId,
          seatIds: seatsToSell,
          customerName: 'Khách hàng Vãng Lai',
          customerPhone: '0987654321',
          paymentMethod: 'CASH',
          combos: [
            {
              comboId: sampleCombo.id,
              quantity: 1,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.source).toBe('COUNTER');
      expect(data.status).toBe('PAID');
      expect(data.paidAt).toBeDefined();
      expect(data.customerName).toBe('Khách hàng Vãng Lai');

      // Vé đã được phát hành ngay lập tức với mã TK...
      expect(data.items.length).toBe(2);
      expect(data.items[0].ticket).toBeDefined();
      expect(data.items[0].ticket.ticketCode).toMatch(/^TK[A-Z0-9]{10}$/);
      expect(data.items[0].ticket.status).toBe('VALID');

      // Ghế trong phòng chiếu đã cập nhật sang SOLD
      const checkSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId, seatId: { in: seatsToSell } },
      });
      for (const s of checkSeats) {
        expect(s.status).toBe('SOLD');
      }
    });

    it('POST /api/v1/orders/counter - Từ chối nếu khách hàng thường cố tình gọi API bán vé tại quầy', async () => {
      const res = await request(app)
        .post('/api/v1/orders/counter')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showtimeId,
          seatIds: [availableSeats[3].seatId],
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('5. Hủy vé & Hoàn tiền theo chính sách (F16)', () => {
    it('POST /api/v1/orders/:id/cancel - Khách hàng hủy vé đã thanh toán trước giờ chiếu giải phóng ghế', async () => {
      // 1. Tạo 1 đơn mới và thanh toán
      const seat = availableSeats[4];
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          showtimeId,
          seatIds: [seat.seatId],
          ageConfirmed: true,
        });

      const orderId = orderRes.body.data.id;

      await request(app)
        .post(`/api/v1/payment/simulate/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      // 2. Thực hiện hủy vé
      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Bận việc gia đình đột xuất' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      // Kiểm tra trạng thái đơn và vé
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { ticket: true } } },
      });

      expect(updatedOrder!.status).toBe('CANCELLED');
      // Cancellation records a request; money is refunded only after an operator confirms it.
      expect(updatedOrder!.refundStatus).toBe('PENDING');
      expect(await prisma.refundRequest.findFirst({ where: { orderId } })).toMatchObject({ status: 'PENDING', amount: updatedOrder!.total });
      expect(updatedOrder!.items[0].ticket!.status).toBe('CANCELLED');

      // Ghế được trả về AVAILABLE
      const updatedSeat = await prisma.showtimeSeat.findUnique({
        where: { showtimeId_seatId: { showtimeId, seatId: seat.seatId } },
      });
      expect(updatedSeat!.status).toBe('AVAILABLE');
    });
  });

  describe('6. Báo cáo & Thống kê doanh thu, tỷ lệ lấp đầy (F14)', () => {
    it('GET /api/v1/admin/reports/overview - Quản trị viên xem báo cáo chỉ số tổng quan', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data).toHaveProperty('grossRevenue');
      expect(data).toHaveProperty('revenue');
      expect(data).toHaveProperty('refundAmount');
      expect(data).toHaveProperty('orderCount');
      expect(data).toHaveProperty('ticketCount');
      expect(data).toHaveProperty('comboRevenue');
      expect(data).toHaveProperty('occupancyPercent');

      expect(typeof data.revenue).toBe('number');
      expect(typeof data.occupancyPercent).toBe('number');
      expect(data.orderCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/reports - Báo cáo phân tích theo ngày và theo phim', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports?type=DAILY')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const row = res.body.data[0];
        expect(row).toHaveProperty('key');
        expect(row).toHaveProperty('revenue');
        expect(row).toHaveProperty('orderCount');
      }
    });

    it('GET /api/v1/admin/reports/top-movies - Thống kê phim ăn khách hàng đầu', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/top-movies?limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Từ chối khách hàng thông thường truy cập báo cáo quản trị', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/overview')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
