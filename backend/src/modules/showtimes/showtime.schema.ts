import { z } from 'zod';
import { RoomFormat, ShowtimeLanguage } from '@prisma/client';

export const listShowtimesQuerySchema = z.object({
  movieId: z.string().uuid().optional(),
  cinemaId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD').optional(),
  format: z.nativeEnum(RoomFormat).optional(),
});

export const createShowtimeSchema = z.object({
  movieId: z.string().uuid('ID phim không hợp lệ'),
  roomId: z.string().uuid('ID phòng chiếu không hợp lệ'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Thời gian bắt đầu không hợp lệ'),
  format: z.nativeEnum(RoomFormat),
  language: z.nativeEnum(ShowtimeLanguage).default(ShowtimeLanguage.SUBTITLED),
  cleaningMinutes: z.number().int().min(10).default(15),
  adMinutes: z.number().int().min(0).default(15),
});

export type ListShowtimesQuery = z.infer<typeof listShowtimesQuerySchema>;
export type CreateShowtimeInput = z.infer<typeof createShowtimeSchema>;
