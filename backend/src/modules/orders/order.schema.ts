import { z } from 'zod';

export const orderComboItemSchema = z.object({
  comboId: z.string().min(1, { message: 'comboId không được để trống' }),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1').max(20, 'Số lượng tối đa là 20'),
});

export const createOrderSchema = z.object({
  showtimeId: z.string().uuid({ message: 'showtimeId phải là UUID hợp lệ' }),
  seatIds: z
    .array(z.string().uuid({ message: 'seatId phải là UUID hợp lệ' }))
    .min(1, { message: 'Cần chọn ít nhất 1 ghế' })
    .max(8, { message: 'Quy tắc BR-03: Tối đa 8 ghế trong một lần đặt' }),
  ageConfirmed: z.boolean().optional().default(false),
  combos: z.array(orderComboItemSchema).optional().default([]),
  voucherCode: z.string().trim().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  seatIds: z.array(z.string().uuid())
    .min(1, 'Cần chọn ít nhất 1 ghế').max(8, 'Tối đa 8 ghế trong một lần đặt')
    .refine(ids => new Set(ids).size === ids.length, 'Không được chọn ghế trùng lặp').optional(),
  ageConfirmed: z.boolean().optional(),
  combos: z.array(orderComboItemSchema)
    .refine(items => new Set(items.map(item => item.comboId)).size === items.length, 'Không được chọn combo trùng lặp').optional(),
  voucherCode: z.string().trim().min(1).nullable().optional(),
}).refine(input => Object.keys(input).length > 0, 'Cần cung cấp nội dung cập nhật');

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const counterOrderSchema = z.object({
  showtimeId: z.string().uuid({ message: 'showtimeId phải là UUID hợp lệ' }),
  seatIds: z
    .array(z.string().uuid({ message: 'seatId phải là UUID hợp lệ' }))
    .min(1, { message: 'Cần chọn ít nhất 1 ghế' })
    .max(8, { message: 'Quy tắc BR-03: Tối đa 8 ghế trong một lần đặt' }),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  paymentMethod: z.enum(['CASH', 'POS', 'BANK_TRANSFER']).default('CASH'),
  combos: z.array(orderComboItemSchema).optional().default([]),
  voucherCode: z.string().trim().optional(),
  ageConfirmed: z.boolean().optional().default(true),
});

export type CounterOrderInput = z.infer<typeof counterOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  pendingOnly: z.boolean().optional().default(false),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const payOrderSchema = z.object({
  method: z.enum(['VNPAY']).default('VNPAY'),
  locale: z.enum(['vn', 'en']).default('vn'),
});

export type PayOrderInput = z.infer<typeof payOrderSchema>;
