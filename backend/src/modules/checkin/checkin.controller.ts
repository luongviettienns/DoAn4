import { Request, Response, NextFunction } from 'express';
import { checkinService } from './checkin.service';
import { checkinRequestSchema } from './checkin.schema';
import { sendSuccess } from '../../shared/response';

export class CheckinController {
  /**
   * POST /api/v1/checkin - Soát vé vào phòng chiếu (F08)
   */
  async checkin(req: Request, res: Response, next: NextFunction) {
    try {
      const input = checkinRequestSchema.parse(req.body);
      const user = req.user!;
      const result = await checkinService.validateAndCheckin(user, input);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/checkin/stats - Thống kê soát vé trong ngày
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const stats = await checkinService.getCheckinStats(user);
      return sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/checkin/history - Lịch sử các vé đã soát gần đây
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const history = await checkinService.getCheckinHistory(user, limit);
      return sendSuccess(res, history);
    } catch (error) {
      next(error);
    }
  }
}

export const checkinController = new CheckinController();
