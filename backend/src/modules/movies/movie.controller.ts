import { Request, Response, NextFunction } from 'express';
import { movieService } from './movie.service';
import { listMoviesQuerySchema, createMovieSchema, updateMovieSchema } from './movie.schema';
import { sendSuccess, sendPaginated } from '../../shared/response';

export class MovieController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listMoviesQuerySchema.parse(req.query);
      const { movies, meta } = await movieService.listMovies(query);
      return sendPaginated(res, movies, meta, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const movie = await movieService.getMovieById(id);
      return sendSuccess(res, movie, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createMovieSchema.parse(req.body);
      const movie = await movieService.createMovie(validated);
      return sendSuccess(res, movie, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const validated = updateMovieSchema.parse(req.body);
      const movie = await movieService.updateMovie(id, validated);
      return sendSuccess(res, movie, 200);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await movieService.deleteMovie(id);
      return sendSuccess(res, { message: 'Đã ẩn phim thành công' }, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const movieController = new MovieController();
export default movieController;
