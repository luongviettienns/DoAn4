import { z } from 'zod';
import { RoomFormat } from '@prisma/client';

export const listCinemasQuerySchema = z.object({
  city: z.string().trim().optional(),
});

export const createCinemaSchema = z.object({
  name: z.string().min(2, 'Tên rạp tối thiểu 2 ký tự').max(150),
  address: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự').max(500),
  city: z.string().min(2).max(100),
  phone: z.string().max(20),
  openTime: z.string().default('08:00:00'),
  closeTime: z.string().default('23:30:00'),
});

export const createRoomSchema = z.object({
  cinemaId: z.string().uuid(),
  name: z.string().min(1).max(100),
  format: z.nativeEnum(RoomFormat),
  rowCount: z.number().int().min(1).max(30),
  columnCount: z.number().int().min(1).max(50),
});

export type ListCinemasQuery = z.infer<typeof listCinemasQuerySchema>;
export type CreateCinemaInput = z.infer<typeof createCinemaSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
