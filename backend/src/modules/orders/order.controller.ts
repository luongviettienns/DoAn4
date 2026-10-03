import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { paymentService } from '../payments/payment.service';
import { createOrderSchema, payOrderSchema } from './order.schema';
import { sendSuccess } from '../../shared/response';

export class OrderController {
  /**
   * POST /api/v1/orders - Tạo đơn đặt vé và giữ ghế
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createOrderSchema.parse(req.body);
      const userId = req.user!.id;
      const order = await orderService.createOrder(userId, input);
      return sendSuccess(res, order, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/pending - Lấy đơn hàng đang giữ chỗ của người dùng
   */
  async getPending(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const showtimeId = req.query.showtimeId as string | undefined;
      const order = await orderService.getUserPendingOrder(userId, showtimeId);
      return sendSuccess(res, order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/:id - Chi tiết đơn hàng
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      const role = req.user?.role;
      const order = await orderService.getOrderById(id, userId, role);
      return sendSuccess(res, order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:id/pay - Khởi tạo thanh toán VNPay
   */
  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const input = payOrderSchema.parse(req.body);
      const userId = req.user!.id;
      const ipAddr = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

      const result = await paymentService.initiateVnpayPayment(id, userId, ipAddr, input.locale);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:id/cancel - Hủy đơn hàng và giải phóng ghế
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const reason = req.body?.reason;
      const result = await orderService.cancelOrder(id, userId, reason);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
