import crypto from 'crypto';
import prisma from '../../shared/prisma';
import { vnpayAdapter } from './vnpay.adapter';
import { NotFoundError, BadRequestError, ConflictError, GoneError, ForbiddenError } from '../../shared/errors';

export class PaymentService {
  /**
   * Khởi tạo giao dịch thanh toán VNPay (F04)
   */
  async initiateVnpayPayment(orderId: string, currentUserId: string, ipAddr: string, locale = 'vn') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { showtime: true },
    });

    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
    }

    if (order.userId && order.userId !== currentUserId) {
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
    const previousAttempts = await prisma.payment.count({
      where: { orderId },
    });
    const attemptNo = previousAttempts + 1;
    const txnRef = `${order.code}-${attemptNo}`;

    // Tạo bản ghi Payment
    const payment = await prisma.payment.create({
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
    const updatedPayment = await prisma.payment.update({
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

      if (payment.order.status === 'PAID') {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      if (responseCode === '00' && transactionStatus === '00') {
        await this.fulfillPaidOrder(payment.id, payment.orderId, gatewayTxnNo, responseCode);
        return { RspCode: '00', Message: 'Confirm Success' };
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
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
    const gatewayTxnNo = data['vnp_TransactionNo'];

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

    if (responseCode === '00' && payment.order.status !== 'PAID') {
      await this.fulfillPaidOrder(payment.id, payment.orderId, gatewayTxnNo, responseCode);
    }

    return {
      success: responseCode === '00',
      orderId: payment.orderId,
      code: payment.order.code,
      txnRef,
      amount: payment.amount,
      responseCode,
      message: responseCode === '00' ? 'Thanh toán thành công' : 'Giao dịch thanh toán không thành công',
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

    if (currentUserId && order.userId && order.userId !== currentUserId) {
      throw new ForbiddenError('FORBIDDEN', 'Bạn không có quyền thanh toán đơn hàng này');
    }

    if (order.status === 'PAID') {
      return {
        success: true,
        message: 'Đơn hàng đã được thanh toán trước đó',
        orderId: order.id,
      };
    }

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
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.status === 'PAID') return;

      const paidAt = new Date();
      const pointsEarned = Math.floor(order.total / 10000); // 1 điểm mỗi 10.000 VNĐ

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
        where: { orderId },
        data: {
          status: 'SOLD',
          holdExpiresAt: null,
        },
      });

      // 4. Giải phóng pending guard
      await tx.pendingOrderGuard.deleteMany({
        where: { orderId },
      });

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
    });
  }
}

export const paymentService = new PaymentService();
