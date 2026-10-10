import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../shared/prisma';
import { vnpayAdapter } from './vnpay.adapter';
import { NotFoundError, BadRequestError, ConflictError, GoneError, ForbiddenError } from '../../shared/errors';
import mailService from '../../shared/mail.service';

export class PaymentService {
  /**
   * Khởi tạo giao dịch thanh toán VNPay (F04)
   */
  async initiateVnpayPayment(orderId: string, currentUserId: string, ipAddr: string, locale = 'vn') {
    return prisma.$transaction(async tx => {
      // Share the order lock with hold edits, cancellation, expiry and IPN settlement.
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { showtime: true },
      });

      if (!order) {
        throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
      }

      if (order.userId !== currentUserId) {
        throw new ForbiddenError('FORBIDDEN', 'Bạn không có quyền thanh toán đơn hàng này');
      }

      if (order.status === 'PAID') {
        throw new ConflictError('ORDER_ALREADY_PAID', 'Đơn hàng này đã được thanh toán thành công');
      }

      if (order.status !== 'PENDING_PAYMENT') {
        throw new BadRequestError('INVALID_ORDER_STATUS', 'Trạng thái đơn hàng không hợp lệ để thanh toán');
      }

      if (order.expiresAt <= new Date()) {
        throw new GoneError('ORDER_EXPIRED', 'Thời gian giữ ghế cho đơn hàng này đã hết hạn');
      }

      // Đếm số lần attempt trước đó
      const previousAttempts = await tx.payment.count({
        where: { orderId },
      });
      const attemptNo = previousAttempts + 1;
      const txnRef = `${order.code}-${attemptNo}`;

      // Tạo bản ghi Payment
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          attemptNo,
          provider: 'VNPAY',
          method: 'VNPAY',
          txnRef,
          amount: order.total,
          status: 'PENDING',
          requestExpiresAt: order.expiresAt,
        },
      });

      // Tạo URL thanh toán VNPay Sandbox
      const paymentUrl = vnpayAdapter.createPaymentUrl({
        amount: order.total,
        txnRef,
        orderInfo: `Thanh toan ve CineX ma don ${order.code}`,
        ipAddr,
        locale,
      });

      // Cập nhật paymentUrl vào bản ghi
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentUrl },
      });

      return {
        orderId: order.id,
        payment: {
          id: updatedPayment.id,
          orderId: updatedPayment.orderId,
          provider: updatedPayment.provider,
          txnRef: updatedPayment.txnRef,
          amount: updatedPayment.amount,
          status: updatedPayment.status,
          createdAt: updatedPayment.createdAt.toISOString(),
          paidAt: updatedPayment.paidAt ? updatedPayment.paidAt.toISOString() : null,
          method: updatedPayment.method,
        },
        paymentUrl,
        expiresAt: order.expiresAt.toISOString(),
        orderStatus: order.status,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Xử lý IPN từ VNPay (F04 webhook)
   */
  async handleVnpayIpn(query: Record<string, any>) {
    try {
      const { isValid, data } = vnpayAdapter.verifyReturnUrl({ ...query });
      if (!isValid) {
        return { RspCode: '97', Message: 'Invalid Checksum' };
      }

      const txnRef = data['vnp_TxnRef'];
      const vnpAmount = Number(data['vnp_Amount']) / 100;
      const responseCode = data['vnp_ResponseCode'];
      const transactionStatus = data['vnp_TransactionStatus'];
      const gatewayTxnNo = data['vnp_TransactionNo'];

      const payment = await prisma.payment.findFirst({
        where: { txnRef },
        include: { order: true },
      });

      if (!payment) {
        return { RspCode: '01', Message: 'Order not found' };
      }

      if (payment.amount !== vnpAmount) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }

      if (payment.status === 'SUCCESS') {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      if (responseCode === '00' && transactionStatus === '00') {
        const confirmed = await this.fulfillPaidOrder(payment.id, payment.orderId, gatewayTxnNo, responseCode);
        return confirmed ? { RspCode: '00', Message: 'Confirm Success' } : { RspCode: '02', Message: 'Order already confirmed' };
      } else {
        await prisma.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: {
            status: 'FAILED',
            responseCode,
            failureReason: `Giao dịch không thành công: mã lỗi ${responseCode}`,
          },
        });
        return { RspCode: '00', Message: 'Confirm Success' };
      }
    } catch {
      return { RspCode: '99', Message: 'System Error' };
    }
  }

  /**
   * Xử lý Return URL từ VNPay (Redirect người dùng sau khi thanh toán)
   */
  async handleVnpayReturn(query: Record<string, any>) {
    const { isValid, data } = vnpayAdapter.verifyReturnUrl({ ...query });
    const txnRef = data['vnp_TxnRef'];
    const responseCode = data['vnp_ResponseCode'];

    if (!isValid) {
      return {
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Chữ ký kiểm tra tính toàn vẹn của VNPay không hợp lệ',
      };
    }

    const payment = await prisma.payment.findFirst({
      where: { txnRef },
      include: { order: true },
    });

    if (!payment) {
      return {
        success: false,
        code: 'PAYMENT_NOT_FOUND',
        message: 'Không tìm thấy thông tin giao dịch thanh toán',
      };
    }

    if (Number(data['vnp_Amount']) / 100 !== payment.amount) {
      return { success: false, code: 'INVALID_AMOUNT', message: 'Số tiền thanh toán không khớp' };
    }
    // The browser return only displays the state settled by the server IPN.
    const success = responseCode === '00' && data['vnp_TransactionStatus'] === '00'
      && payment.status === 'SUCCESS' && payment.order.status === 'PAID';
    return {
      success,
      status: success ? 'SUCCESS' : payment.order.status === 'PENDING_PAYMENT' ? 'PENDING' : 'FAILED',
      orderId: payment.orderId,
      code: payment.order.code,
      txnRef,
      amount: payment.amount,
      responseCode,
      message: success ? 'Thanh toán thành công' : payment.order.status === 'PENDING_PAYMENT' ? 'Đang chờ xác nhận từ cổng thanh toán' : 'Giao dịch thanh toán không thành công',
    };
  }

  /**
   * Mock sandbox simulation: Xác nhận thanh toán thành công trực tiếp (dùng cho Dev & Testing)
   */
  async simulatePaymentSuccess(orderId: string, currentUserId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
    }

    if (!currentUserId || order.userId !== currentUserId) {
      throw new ForbiddenError('FORBIDDEN', 'Bạn không có quyền thanh toán đơn hàng này');
    }

    if (order.status === 'PAID') {
      return {
        success: true,
        message: 'Đơn hàng đã được thanh toán trước đó',
        orderId: order.id,
      };
    }
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestError('INVALID_ORDER_STATUS', 'Đơn không còn chờ thanh toán');
    if (order.expiresAt <= new Date()) throw new GoneError('ORDER_EXPIRED', 'Đơn hàng đã hết hạn');

    // Tìm payment pending hoặc tạo mới
    let payment = order.payments.find((p) => p.status === 'PENDING');
    if (!payment) {
      const attemptNo = order.payments.length + 1;
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          attemptNo,
          provider: 'VNPAY',
          method: 'VNPAY',
          txnRef: `${order.code}-${attemptNo}`,
          amount: order.total,
          status: 'PENDING',
          requestExpiresAt: order.expiresAt,
        },
      });
    }

    const mockGatewayTxnNo = 'MOCK_' + Date.now();
    await this.fulfillPaidOrder(payment.id, order.id, mockGatewayTxnNo, '00');

    return {
      success: true,
      message: 'Mô phỏng thanh toán thành công và đã xuất vé',
      orderId: order.id,
    };
  }

  /**
   * Hoàn tất đơn hàng đã thanh toán (F04 + F05: Cập nhật PAID, SOLD ghế, xóa guard, phát hành Ticket)
   */
  private async fulfillPaidOrder(
    paymentId: string,
    orderId: string,
    gatewayTxnNo: string,
    responseCode: string
  ) {
    const confirmed = await prisma.$transaction(async (tx) => {
      // Serialize IPN, cancellation and sweeper transitions using the order row.
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status === 'SUCCESS') return false;

      const paidAt = new Date();
      const pointsEarned = Math.floor(order.total / 10000); // 1 điểm mỗi 10.000 VNĐ

      const seatIds = order.items.map(item => item.showtimeSeatId).sort();
      const seats = seatIds.length ? await tx.$queryRaw<Array<{ id: string; status: string; order_id: string | null }>>(
        Prisma.sql`SELECT id, status, order_id FROM showtime_seats WHERE id IN (${Prisma.join(seatIds)}) ORDER BY id FOR UPDATE`
      ) : [];
      const canFulfill = order.status === 'PENDING_PAYMENT' && order.expiresAt > paidAt
        && seats.length === order.items.length && seats.length > 0
        && seats.every(seat => seat.status === 'HELD' && seat.order_id === order.id);

      // 1. Cập nhật Payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESS',
          gatewayTxnNo,
          responseCode,
          paidAt,
        },
      });

      if (!canFulfill) {
        // A charged callback must be recorded, even if its seats are no longer owned.
        // It must never issue another ticket or overwrite another customer's seats.
        if (order.status !== 'PAID' && order.status !== 'PAID_UNFULFILLED') {
          await tx.order.update({ where: { id: order.id }, data: {
            status: 'PAID_UNFULFILLED', paidAt, settledPaymentId: paymentId, refundStatus: 'PENDING',
          } });
        }
        await tx.refundRequest.upsert({
          where: { paymentId }, update: {},
          create: {
            orderId, paymentId, reason: order.status === 'PAID' || order.status === 'PAID_UNFULFILLED' ? 'DUPLICATE_PAYMENT' : 'PAID_UNFULFILLED',
            status: 'PENDING', amount: payment.amount,
            policySnapshot: { orderStatus: order.status, seatOwnershipConfirmed: false },
          },
        });
        await tx.showtimeSeat.updateMany({ where: { orderId: order.id, status: 'HELD' }, data: {
          status: 'AVAILABLE', orderId: null, holdExpiresAt: null,
        } });
        await tx.pendingOrderGuard.deleteMany({ where: { orderId: order.id } });
        await tx.voucherRedemption.updateMany({ where: { orderId: order.id, status: 'RESERVED' }, data: {
          status: 'RELEASED', releasedAt: paidAt,
        } });
        return true;
      }

      // 2. Cập nhật Order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paidAt,
          settledPaymentId: paymentId,
          pointsEarned,
        },
      });

      // 3. Chuyển trạng thái ghế sang SOLD
      await tx.showtimeSeat.updateMany({
        where: { orderId, status: 'HELD' },
        data: {
          status: 'SOLD',
          holdExpiresAt: null,
        },
      });

      // 4. Giải phóng pending guard
      await tx.pendingOrderGuard.deleteMany({
        where: { orderId },
      });

      // 4b. Tiêu thụ voucher nếu có
      if (order.voucherId) {
        await tx.voucherRedemption.updateMany({
          where: { orderId: order.id, status: 'RESERVED' },
          data: { status: 'CONSUMED', consumedAt: paidAt },
        });
      }

      // 5. Cộng điểm khách hàng nếu có tài khoản
      if (order.userId && pointsEarned > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            points: { increment: pointsEarned },
          },
        });
      }

      // 6. Phát hành vé Ticket (F05) cho từng OrderItem
      for (const item of order.items) {
        // Sinh mã vé duy nhất: TK + 10 ký tự chữ hoa/số ngẫu nhiên
        const ticketCode = 'TK' + crypto.randomBytes(5).toString('hex').toUpperCase();

        await tx.ticket.create({
          data: {
            ticketCode,
            orderItemId: item.id,
            orderId: order.id,
            showtimeId: order.showtimeId,
            seatId: item.seatId,
            status: 'VALID',
            qrKeyVersion: 1,
          },
        });
      }
      return true;
    });

    if (confirmed) {
      this.sendOrderConfirmationEmail(orderId, paymentId).catch((err) => {
        console.error('[MAIL-ERROR] Không thể gửi vé điện tử cho đơn hàng:', orderId, err);
      });
    }

    return confirmed;
  }

  /**
   * Truy vấn thông tin đơn hàng và phát hành email vé điện tử (E-Ticket)
   */
  private async sendOrderConfirmationEmail(orderId: string, paymentId: string): Promise<void> {
    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          showtime: {
            include: {
              movie: true,
            },
          },
          items: {
            include: {
              ticket: true,
            },
          },
          combos: {
            include: {
              combo: true,
            },
          },
          payments: {
            where: { id: paymentId },
          },
        },
      });

      if (!fullOrder) return;
      const recipientEmail = fullOrder.customerEmail || fullOrder.user?.email;
      if (!recipientEmail) return;

      const showtimeDate = fullOrder.showtimeStartSnapshot.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const showtimeTime = fullOrder.showtimeStartSnapshot.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const seats = fullOrder.items
        .map((item) => `${item.rowLabel}${item.seatNumber}`)
        .sort();

      const ticketCodes = fullOrder.items
        .map((item) => item.ticket?.ticketCode)
        .filter((c): c is string => Boolean(c));

      const combos = fullOrder.combos.map((oc) => ({
        name: oc.combo.name,
        quantity: oc.quantity,
      }));

      await mailService.sendBookingConfirmation(recipientEmail, {
        orderCode: fullOrder.code,
        customerName: fullOrder.customerName || fullOrder.user?.fullName || 'Quý khách',
        movieTitle: fullOrder.movieTitleSnapshot,
        posterUrl: fullOrder.showtime?.movie?.posterUrl,
        cinemaName: fullOrder.cinemaNameSnapshot,
        roomName: fullOrder.roomNameSnapshot,
        formatName: fullOrder.formatSnapshot,
        showtimeDate,
        showtimeTime,
        seats,
        ticketCodes: ticketCodes.length > 0 ? ticketCodes : [fullOrder.code],
        combos,
        totalAmount: fullOrder.total,
        paymentMethod: fullOrder.payments[0]?.method || 'VNPAY',
      });
    } catch (err) {
      console.error('[MAIL-ERROR] Lỗi khi chuẩn bị dữ liệu gửi vé điện tử:', err);
    }
  }
}

export const paymentService = new PaymentService();
