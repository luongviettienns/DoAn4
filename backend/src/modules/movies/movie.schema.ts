import { z } from 'zod';
import { MovieStatus, AgeRating } from '@prisma/client';

export const listMoviesQuerySchema = z.object({
  status: z.nativeEnum(MovieStatus).optional(),
  genreId: z.string().uuid().optional(),
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createMovieSchema = z.object({
  title: z.string().min(1, 'Tiêu đề phim không được để trống').max(255),
  originalTitle: z.string().max(255).optional(),
  posterUrl: z.string().url('URL poster không hợp lệ'),
  bannerUrl: z.string().url('URL banner không hợp lệ').optional(),
  trailerUrl: z.string().url('URL trailer không hợp lệ').optional(),
  description: z.string().min(10, 'Mô tả phim phải từ 10 ký tự trở lên'),
  durationMin: z.number().int().min(1).max(600, 'Thời lượng phim không hợp lệ'),
  ageRating: z.nativeEnum(AgeRating),
  releaseDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ngày phát hành không hợp lệ'),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), 'Ngày kết thúc không hợp lệ'),
  director: z.string().max(255).optional(),
  cast: z.array(z.string()).optional(),
  language: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  genreIds: z.array(z.string().uuid()).min(1, 'Phim phải có ít nhất 1 thể loại'),
});

export const updateMovieSchema = createMovieSchema.partial();

export type ListMoviesQuery = z.infer<typeof listMoviesQuerySchema>;
export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
