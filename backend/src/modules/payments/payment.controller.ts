import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { sendSuccess } from '../../shared/response';

export class PaymentController {
  /**
   * GET /api/v1/payment/vnpay/ipn - Webhook từ VNPay
   */
  async vnpayIpn(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.handleVnpayIpn(req.query);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/payment/vnpay/return - Redirect sau thanh toán từ VNPay
   */
  async vnpayReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.handleVnpayReturn(req.query);
      const frontendUrl = process.env.FRONTEND_PAYMENT_RESULT_URL || 'http://localhost:5173/payment/result';

      if (req.accepts('html')) {
        // Nếu trình duyệt redirect tới, chuyển tiếp người dùng về Frontend kèm params
        const redirectUrl = `${frontendUrl}?orderId=${result.orderId || ''}&code=${result.code || ''}&status=${result.success ? 'SUCCESS' : 'FAILED'}&amount=${result.amount || 0}&message=${encodeURIComponent(result.message)}`;
        return res.redirect(redirectUrl);
      }

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/payment/simulate-mock - Mô phỏng thanh toán thành công (dành cho kiểm thử tự động và môi trường thử nghiệm)
   */
  async simulateMock(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.body;
      const userId = req.user?.id;
      const result = await paymentService.simulatePaymentSuccess(orderId, userId);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
