import { z } from 'zod';

export const checkinRequestSchema = z.object({
  ticketCode: z.string().min(5, 'Mã vé không hợp lệ').max(20).optional(),
  qrPayload: z.string().optional(),
  showtimeId: z.string().uuid().optional(),
}).refine((data) => data.ticketCode || data.qrPayload, {
  message: 'Cần cung cấp ticketCode hoặc qrPayload',
});

export type CheckinRequestInput = z.infer<typeof checkinRequestSchema>;
