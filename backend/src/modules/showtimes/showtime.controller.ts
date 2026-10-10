import { Request, Response, NextFunction } from 'express';
import { showtimeService } from './showtime.service';
import { listShowtimesQuerySchema, createShowtimeSchema, cancelShowtimeSchema } from './showtime.schema';
import { sendSuccess } from '../../shared/response';

export class ShowtimeController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listShowtimesQuerySchema.parse(req.query);
      const showtimes = await showtimeService.listShowtimes(query);
      return sendSuccess(res, showtimes, 200);
    } catch (error) {
      next(error);
    }
  };

  getSeats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const data = await showtimeService.getShowtimeSeats(id, req.user?.id);
      return sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createShowtimeSchema.parse(req.body);
      const showtime = await showtimeService.createShowtime(validated, req.user!);
      return sendSuccess(res, showtime, 201);
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { reason } = cancelShowtimeSchema.parse(req.body);
      const result = await showtimeService.cancelShowtime(id, reason, req.user!);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const showtimeController = new ShowtimeController();
export default showtimeController;
