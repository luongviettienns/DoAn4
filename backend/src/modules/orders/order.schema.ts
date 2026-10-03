import { z } from 'zod';

export const createOrderSchema = z.object({
  showtimeId: z.string().uuid({ message: 'showtimeId phải là UUID hợp lệ' }),
  seatIds: z
    .array(z.string().uuid({ message: 'seatId phải là UUID hợp lệ' }))
    .min(1, { message: 'Cần chọn ít nhất 1 ghế' })
    .max(8, { message: 'Quy tắc BR-03: Tối đa 8 ghế trong một lần đặt' }),
  ageConfirmed: z.boolean().optional().default(false),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const payOrderSchema = z.object({
  method: z.enum(['VNPAY']).default('VNPAY'),
  locale: z.enum(['vn', 'en']).default('vn'),
});

export type PayOrderInput = z.infer<typeof payOrderSchema>;
