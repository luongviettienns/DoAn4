import { Request, Response, NextFunction } from 'express';
import { cinemaService } from './cinema.service';
import { listCinemasQuerySchema, createCinemaSchema, createRoomSchema } from './cinema.schema';
import { sendSuccess } from '../../shared/response';

export class CinemaController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listCinemasQuerySchema.parse(req.query);
      const cinemas = await cinemaService.listCinemas(query);
      return sendSuccess(res, cinemas, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const cinema = await cinemaService.getCinemaById(id);
      return sendSuccess(res, cinema, 200);
    } catch (error) {
      next(error);
    }
  };

  getRoomSeats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId as string;
      const room = await cinemaService.getRoomSeats(roomId);
      return sendSuccess(res, room, 200);
    } catch (error) {
      next(error);
    }
  };

  createCinema = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createCinemaSchema.parse(req.body);
      const cinema = await cinemaService.createCinema(validated);
      return sendSuccess(res, cinema, 201);
    } catch (error) {
      next(error);
    }
  };

  createRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createRoomSchema.parse(req.body);
      const room = await cinemaService.createRoom(validated, req.user);
      return sendSuccess(res, room, 201);
    } catch (error) {
      next(error);
    }
  };
}

export const cinemaController = new CinemaController();
export default cinemaController;
