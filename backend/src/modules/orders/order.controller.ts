import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { paymentService } from '../payments/payment.service';
import { createOrderSchema, updateOrderSchema, counterOrderSchema, payOrderSchema, cancelOrderSchema } from './order.schema';
import { sendSuccess } from '../../shared/response';

export class OrderController {
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateOrderSchema.parse(req.body);
      const order = await orderService.updatePendingOrder(req.params.id as string, req.user!.id, input);
      return sendSuccess(res, order);
    } catch (error) { next(error); }
  }

  /**
   * POST /api/v1/orders - Tạo đơn đặt vé và giữ ghế trực tuyến
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
   * POST /api/v1/orders/counter - Bán vé trực tiếp tại quầy (F07)
   */
  async createCounter(req: Request, res: Response, next: NextFunction) {
    try {
      const input = counterOrderSchema.parse(req.body);
      const staffUserId = req.user!.id;
      const order = await orderService.createCounterOrder(staffUserId, input);
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
   * POST /api/v1/orders/:id/cancel - Hủy / hoàn tiền đơn hàng (F03, F16)
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const role = req.user?.role;
      const parsed = cancelOrderSchema.parse(req.body || {});
      const result = await orderService.cancelOrder(id, userId, role, parsed.reason, parsed.pendingOnly);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/me/orders - Lịch sử đơn hàng của khách hàng (F06)
   */
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await orderService.getUserOrders(userId, page, limit);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
