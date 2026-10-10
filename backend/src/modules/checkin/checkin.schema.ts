import { z } from 'zod';

export const checkinRequestSchema = z.object({
  ticketCode: z.string().min(5, 'Mã vé không hợp lệ').max(100).optional(),
  qrPayload: z.string().min(5).max(255).optional(),
  showtimeId: z.string().uuid().optional(),
  bypassWindow: z.boolean().optional(),
  bypassReason: z.string().max(500).optional(),
}).refine((data) => data.ticketCode || data.qrPayload, {
  message: 'Cần cung cấp ticketCode hoặc qrPayload',
}).refine(
  (data) => !data.bypassWindow || (typeof data.bypassReason === 'string' && data.bypassReason.trim().length >= 5),
  {
    message: 'Cần cung cấp lý do bypass tối thiểu 5 ký tự khi yêu cầu bypassWindow',
    path: ['bypassReason'],
  }
);

export type CheckinRequestInput = z.infer<typeof checkinRequestSchema>;
