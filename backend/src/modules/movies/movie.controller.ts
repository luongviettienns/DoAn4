import { Request, Response, NextFunction } from 'express';
import { movieService } from './movie.service';
import { listMoviesQuerySchema, createMovieSchema, updateMovieSchema } from './movie.schema';
import { sendSuccess, sendPaginated } from '../../shared/response';
import { tmdbService } from '../../shared/tmdb.service';

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
      await movieService.deleteMovie(id, req.user?.id);
      return sendSuccess(res, { message: 'Đã ẩn phim thành công' }, 200);
    } catch (error) {
      next(error);
    }
  };

  listGenres = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const genres = await movieService.listGenres();
      return sendSuccess(res, genres, 200);
    } catch (error) {
      next(error);
    }
  };

  searchTmdb = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = String(req.query.query || '').trim();
      const page = req.query.page ? Number(req.query.page) : 1;
      const data = await tmdbService.searchMovies(query, page);
      return sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };

  getTmdbDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tmdbId = Number(req.params.tmdbId);
      const data = await tmdbService.getMovieDetails(tmdbId);
      return sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const movieController = new MovieController();
export default movieController;
