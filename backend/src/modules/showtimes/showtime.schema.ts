import { z } from 'zod';
import { RoomFormat, ShowtimeLanguage } from '@prisma/client';

const roomFormatSchema = z.preprocess((value) => {
  if (value === '2D') return RoomFormat.TWO_D;
  if (value === '3D') return RoomFormat.THREE_D;
  return value;
}, z.nativeEnum(RoomFormat));

export const listShowtimesQuerySchema = z.object({
  movieId: z.string().uuid().optional(),
  cinemaId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Ngày không tồn tại trong lịch').optional(),
  format: roomFormatSchema.optional(),
});

export const createShowtimeSchema = z.object({
  movieId: z.string().uuid('ID phim không hợp lệ'),
  roomId: z.string().uuid('ID phòng chiếu không hợp lệ'),
  startTime: z.string().datetime({ offset: true, message: 'Thời gian bắt đầu phải là ISO 8601 hợp lệ có múi giờ' }),
  format: roomFormatSchema,
  language: z.nativeEnum(ShowtimeLanguage).default(ShowtimeLanguage.SUBTITLED),
  cleaningMinutes: z.number().int().min(15).default(15),
  adMinutes: z.number().int().min(0).default(15),
});

export type ListShowtimesQuery = z.infer<typeof listShowtimesQuerySchema>;
export type CreateShowtimeInput = z.infer<typeof createShowtimeSchema>;

export const cancelShowtimeSchema = z.object({
  reason: z.string().min(1, 'Lý do hủy không được để trống'),
});
export type CancelShowtimeInput = z.infer<typeof cancelShowtimeSchema>;
