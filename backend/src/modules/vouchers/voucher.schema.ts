import { z } from 'zod';
import { VoucherType, VoucherScope, VoucherStatus } from '@prisma/client';

export const validateVoucherSchema = z.object({
  code: z.string().trim().min(1, 'Mã voucher không được rỗng'),
  orderAmount: z.number().int().min(0, 'Giá trị đơn hàng không hợp lệ'),
  cinemaId: z.string().uuid().optional(),
});

export type ValidateVoucherInput = z.infer<typeof validateVoucherSchema>;

const voucherFieldsSchema = z.object({
  code: z.string().trim().min(3).max(50).toUpperCase(),
  name: z.string().trim().min(2).max(150),
  cinemaId: z.string().uuid().optional(),
  type: z.nativeEnum(VoucherType),
  value: z.number().int().min(1, 'Giá trị giảm phải lớn hơn 0'),
  maxDiscount: z.number().int().min(0).optional(),
  minOrder: z.number().int().min(0).default(0),
  scope: z.nativeEnum(VoucherScope).default(VoucherScope.ORDER),
  validFrom: z.string().datetime().transform((val) => new Date(val)),
  validTo: z.string().datetime().transform((val) => new Date(val)),
  totalLimit: z.number().int().min(1, 'Giới hạn tổng phải >= 1'),
  perUserLimit: z.number().int().min(1).default(1),
  status: z.nativeEnum(VoucherStatus).default(VoucherStatus.ACTIVE),
});

export const createVoucherSchema = voucherFieldsSchema.superRefine((input, context) => {
  if (input.type === 'PERCENT' && input.value > 100) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Phần trăm giảm phải từ 1 đến 100' });
  }
  if (input.type === 'PERCENT' && input.maxDiscount === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['maxDiscount'], message: 'Voucher phần trăm cần trần giảm giá' });
  }
  if (input.validTo <= input.validFrom) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['validTo'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });
  }
  if (input.perUserLimit > input.totalLimit) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['perUserLimit'], message: 'Lượt mỗi người không được vượt tổng lượt' });
  }
});

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;

export const updateVoucherSchema = voucherFieldsSchema.partial();
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;

export const voucherQuerySchema = z.object({
  cinemaId: z.string().uuid().optional(),
  status: z.nativeEnum(VoucherStatus).optional(),
});
