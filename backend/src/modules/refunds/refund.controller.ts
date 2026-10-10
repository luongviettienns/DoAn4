import { Request, Response, NextFunction } from 'express';
import { refundService } from './refund.service';
import { refundListQuerySchema, processRefundSchema } from './refund.schema';
import { ForbiddenError } from '../../shared/errors';

export class RefundController {
  private cinemaScope(req: Request) {
    if (req.user?.role !== 'MANAGER') return undefined;
    if (!req.user.cinemaIds.length) {
      throw new ForbiddenError('CINEMA_SCOPE_FORBIDDEN', 'Bạn chưa được phân công quản lý rạp');
    }
    return req.user.cinemaIds;
  }

  async handleList(req: Request, res: Response, next: NextFunction) {
    try {
      const query = refundListQuerySchema.parse(req.query);
      const data = await refundService.listRefunds(query, this.cinemaScope(req));
      res.json({ success: true, data, serverTime: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  async handleGetById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await refundService.getRefundById(req.params.id as string, this.cinemaScope(req));
      res.json({ success: true, data, serverTime: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }

  async handleProcess(req: Request, res: Response, next: NextFunction) {
    try {
      const input = processRefundSchema.parse(req.body);
      const data = await refundService.processRefund(
        req.params.id as string,
        input,
        req.user!.id,
        req.user!.role,
        this.cinemaScope(req),
        req.ip,
      );
      res.json({ success: true, data, serverTime: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  }
}

export const refundController = new RefundController();
