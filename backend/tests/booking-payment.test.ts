import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { vnpayAdapter } from '../src/modules/payments/vnpay.adapter';

const app = createApp();

describe('Phase 4: Booking & VNPay Payment Integration (F03, F04, F05)', () => {
  let customerToken: string;
  let customerId: string;
  let showtimeId: string;
  let availableSeatIds: string[] = [];

  beforeAll(async () => {
    // 1. Tạo tài khoản Khách hàng độc lập cho kịch bản kiểm thử
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `customer_bp_${randomSuffix}@gmail.com`,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        fullName: 'Khách Hàng Đặt Vé',
        password: 'Password123',
      });

    customerToken = registerRes.body.data.accessToken;
    customerId = registerRes.body.data.user.id;

    // 2. Tìm một suất chiếu đang OPEN
    const showtime = await prisma.showtime.findFirst({
      where: { status: 'OPEN' },
      include: {
        slots: {
          where: { status: 'AVAILABLE' },
          take: 10,
        },
      },
    });

    if (!showtime || showtime.slots.length < 5) {
      throw new Error('Cần ít nhất 5 ghế AVAILABLE cho kịch bản kiểm thử');
    }

    showtimeId = showtime.id;
    availableSeatIds = showtime.slots.map((s) => s.seatId);

    // Dọn dẹp đơn cũ của customer này trong showtime nếu có
    await prisma.pendingOrderGuard.deleteMany({
      where: { userId: customerId, showtimeId },
    });
  });

  afterAll(async () => {
    // Dọn dẹp sau khi kiểm thử
    await prisma.pendingOrderGuard.deleteMany({
      where: { userId: customerId, showtimeId },
    });
  });

  it('Tạo đơn hàng & Giữ ghế thành công (F03 - 10 phút hold, status HELD)', async () => {
    const selectedSeats = [availableSeatIds[0], availableSeatIds[1]];

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        showtimeId,
        seatIds: selectedSeats,
        ageConfirmed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING_PAYMENT');
    expect(res.body.data.items.length).toBe(2);
    expect(res.body.data.total).toBeGreaterThan(0);
    expect(res.body.data.code).toMatch(/^MV\d{6}[A-Z0-9]{6}$/);

    // Kiểm tra trong CSDL: Ghế đã chuyển sang HELD và có holdExpiresAt
    const dbSeats = await prisma.showtimeSeat.findMany({
      where: {
        showtimeId,
        seatId: { in: selectedSeats },
      },
    });

    expect(dbSeats.length).toBe(2);
    expect(dbSeats[0].status).toBe('HELD');
    expect(dbSeats[1].status).toBe('HELD');
    expect(dbSeats[0].holdExpiresAt).not.toBeNull();

    // Kiểm tra guard BR-03 được thiết lập
    const guard = await prisma.pendingOrderGuard.findUnique({
      where: {
        userId_showtimeId: {
          userId: customerId,
          showtimeId,
        },
      },
    });
    expect(guard).not.toBeNull();
  });

  it('Chặn đặt đơn mới khi đã có đơn đang chờ cho cùng suất chiếu (Quy tắc BR-03 - 409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        showtimeId,
        seatIds: [availableSeatIds[2]],
        ageConfirmed: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACTIVE_PENDING_ORDER');
  });

  it('Từ chối khi chọn quá 8 ghế trong 1 lần đặt (Quy tắc BR-03 - 400 Bad Request)', async () => {
    const nineFakeSeats = Array.from({ length: 9 }, () => crypto.randomUUID());

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        showtimeId,
        seatIds: nineFakeSeats,
        ageConfirmed: true,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Lấy đơn hàng đang giữ chỗ của người dùng (GET /api/v1/orders/pending)', async () => {
    const res = await request(app)
      .get('/api/v1/orders/pending')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data.status).toBe('PENDING_PAYMENT');
  });

  it('Khởi tạo thanh toán VNPay Sandbox (F04 - Sinh paymentUrl hợp lệ có chữ ký HMAC-SHA512)', async () => {
    // Lấy đơn pending hiện tại
    const pendingRes = await request(app)
      .get('/api/v1/orders/pending')
      .set('Authorization', `Bearer ${customerToken}`);
    const orderId = pendingRes.body.data.id;

    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        method: 'VNPAY',
        locale: 'vn',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentUrl).toContain('https://sandbox.vnpayment.vn');
    expect(res.body.data.paymentUrl).toContain('vnp_SecureHash=');
    expect(res.body.data.payment.provider).toBe('VNPAY');
    expect(res.body.data.payment.status).toBe('PENDING');
  });

  it('Xử lý IPN từ VNPay: Từ chối chữ ký giả mạo (RspCode: 97 - Invalid Checksum)', async () => {
    const res = await request(app)
      .get('/api/v1/payment/vnpay/ipn')
      .query({
        vnp_Amount: '23000000',
        vnp_TxnRef: 'FAKE-TXN',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'badhash00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('97');
  });

  it('Thanh toán thành công và Xuất vé QR (F04 + F05 - Order PAID, Ghế SOLD, Vé Ticket VALID được cấp)', async () => {
    const pendingRes = await request(app)
      .get('/api/v1/orders/pending')
      .set('Authorization', `Bearer ${customerToken}`);
    const order = pendingRes.body.data;

    // Giả lập callback hợp lệ từ VNPay thông qua adapter ký chuẩn HMAC
    const latestPayment = order.payments[0];
    const txnRef = latestPayment.txnRef;
    const vnpAmount = String(order.total * 100);
    const dynamicTxnNo = String(Date.now()).slice(-9) + String(Math.floor(1000 + Math.random() * 9000));

    const queryParams: Record<string, string> = {
      vnp_Amount: vnpAmount,
      vnp_Command: 'pay',
      vnp_CreateDate: '20261003150000',
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan ve CineX ma don ${order.code}`,
      vnp_OrderType: 'other',
      vnp_PayDate: '20261003150500',
      vnp_ResponseCode: '00',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'CINEXSANDBOX',
      vnp_TransactionNo: dynamicTxnNo,
      vnp_TransactionStatus: '00',
      vnp_TxnRef: txnRef,
      vnp_Version: '2.1.0',
    };

    // Ký hash chuẩn bằng secret của hệ thống
    const sortedKeys = Object.keys(queryParams).sort();
    const signData = sortedKeys.map((k) => `${k}=${encodeURIComponent(queryParams[k]).replace(/%20/g, '+')}`).join('&');
    const secret = process.env.VNPAY_HASH_SECRET || 'CINEX_SUPER_SECRET_VNPAY_HASH_KEY_2026';
    const secureHash = crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
    queryParams['vnp_SecureHash'] = secureHash;

    // Gửi IPN
    const ipnRes = await request(app)
      .get('/api/v1/payment/vnpay/ipn')
      .query(queryParams);

    expect(ipnRes.status).toBe(200);
    expect(ipnRes.body.RspCode).toBe('00');
    expect(ipnRes.body.Message).toBe('Confirm Success');

    // 1. Kiểm tra trạng thái Order: PAID
    const orderAfter = await prisma.order.findUnique({
      where: { id: order.id },
    });
    expect(orderAfter?.status).toBe('PAID');
    expect(orderAfter?.paidAt).not.toBeNull();

    // 2. Kiểm tra trạng thái Ghế: SOLD
    const seatsAfter = await prisma.showtimeSeat.findMany({
      where: { orderId: order.id },
    });
    expect(seatsAfter.length).toBe(2);
    expect(seatsAfter[0].status).toBe('SOLD');
    expect(seatsAfter[1].status).toBe('SOLD');

    // 3. Kiểm tra vé Ticket được cấp phát tự động (F05)
    const tickets = await prisma.ticket.findMany({
      where: { orderId: order.id },
    });
    expect(tickets.length).toBe(2);
    expect(tickets[0].ticketCode).toMatch(/^TK[A-Z0-9]{10}$/);
    expect(tickets[0].status).toBe('VALID');

    // 4. Kiểm tra guard đã được giải phóng
    const guardAfter = await prisma.pendingOrderGuard.findUnique({
      where: {
        userId_showtimeId: {
          userId: customerId,
          showtimeId,
        },
      },
    });
    expect(guardAfter).toBeNull();
  });

  it('Tính lũy thừa idempotent: Gửi lại IPN đơn đã hoàn tất trả về RspCode: 02 (Order already confirmed)', async () => {
    const paidOrder = await prisma.order.findFirst({
      where: { userId: customerId, status: 'PAID' },
      include: { payments: true },
    });
    expect(paidOrder).not.toBeNull();

    const payment = paidOrder!.payments[0];
    const queryParams: Record<string, string> = {
      vnp_Amount: String(paidOrder!.total * 100),
      vnp_Command: 'pay',
      vnp_CreateDate: '20261003150000',
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan ve CineX ma don ${paidOrder!.code}`,
      vnp_OrderType: 'other',
      vnp_PayDate: '20261003150500',
      vnp_ResponseCode: '00',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'CINEXSANDBOX',
      vnp_TransactionNo: '14589230',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: payment.txnRef,
      vnp_Version: '2.1.0',
    };

    const sortedKeys = Object.keys(queryParams).sort();
    const signData = sortedKeys.map((k) => `${k}=${encodeURIComponent(queryParams[k]).replace(/%20/g, '+')}`).join('&');
    const secret = process.env.VNPAY_HASH_SECRET || 'CINEX_SUPER_SECRET_VNPAY_HASH_KEY_2026';
    const secureHash = crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
    queryParams['vnp_SecureHash'] = secureHash;

    const res = await request(app)
      .get('/api/v1/payment/vnpay/ipn')
      .query(queryParams);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('02');
    expect(res.body.Message).toBe('Order already confirmed');
  });

  it('Hủy đơn hàng đang giữ chỗ và giải phóng ghế thành công', async () => {
    // Tạo một đơn tạm khác với ghế thứ 3
    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        showtimeId,
        seatIds: [availableSeatIds[2]],
        ageConfirmed: true,
      });

    expect(createRes.status).toBe(201);
    const orderIdToCancel = createRes.body.data.id;

    // Hủy đơn
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderIdToCancel}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Thay đổi kế hoạch xem phim' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // Kiểm tra ghế đã được giải phóng sang AVAILABLE
    const seat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId, seatId: availableSeatIds[2] },
    });
    expect(seat?.status).toBe('AVAILABLE');
    expect(seat?.orderId).toBeNull();
  });
});
