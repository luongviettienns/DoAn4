import { z } from 'zod';

export const refundListQuerySchema = z.object({
  status: z.enum(['PENDING', 'REFUNDED']).optional(),
  reason: z.enum(['ORDER_CANCELLED', 'SHOWTIME_CANCELLED', 'PAID_UNFULFILLED', 'DUPLICATE_PAYMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const processRefundSchema = z.object({
  method: z.enum(['BANK_TRANSFER', 'CASH', 'PROVIDER_MANUAL']),
  externalReference: z.string().max(255).optional(),
  note: z.string().max(1000).optional(),
});

export type RefundListQuery = z.infer<typeof refundListQuerySchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
