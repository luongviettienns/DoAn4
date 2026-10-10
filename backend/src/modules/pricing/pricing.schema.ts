import { z } from 'zod';
import { RoomFormat, DayType, TimeSlot, SeatType } from '@prisma/client';

export const listPriceRulesQuerySchema = z.object({
  cinemaId: z.string().uuid().optional(),
});

export const upsertPriceRuleSchema = z.object({
  cinemaId: z.string().uuid('ID cụm rạp không hợp lệ'),
  roomFormat: z.nativeEnum(RoomFormat, { errorMap: () => ({ message: 'Định dạng phòng chiếu không hợp lệ' }) }),
  dayType: z.nativeEnum(DayType, { errorMap: () => ({ message: 'Loại ngày không hợp lệ' }) }),
  timeSlot: z.nativeEnum(TimeSlot, { errorMap: () => ({ message: 'Khung giờ không hợp lệ' }) }),
  basePrice: z.number().int().min(0, 'Giá vé cơ bản không được âm'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày áp dụng phải là YYYY-MM-DD'),
});

export const listSeatSurchargesQuerySchema = z.object({
  cinemaId: z.string().uuid().optional(),
});

export const upsertSeatSurchargeSchema = z.object({
  cinemaId: z.string().uuid('ID cụm rạp không hợp lệ'),
  seatType: z.nativeEnum(SeatType, { errorMap: () => ({ message: 'Loại ghế không hợp lệ' }) }),
  amount: z.number().int().min(0, 'Mức phụ thu không được âm'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày áp dụng phải là YYYY-MM-DD'),
});

export const createHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD'),
  name: z.string().min(1, 'Tên ngày lễ không được để trống').max(150),
});

export type ListPriceRulesQuery = z.infer<typeof listPriceRulesQuerySchema>;
export type UpsertPriceRuleInput = z.infer<typeof upsertPriceRuleSchema>;
export type ListSeatSurchargesQuery = z.infer<typeof listSeatSurchargesQuerySchema>;
export type UpsertSeatSurchargeInput = z.infer<typeof upsertSeatSurchargeSchema>;
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
