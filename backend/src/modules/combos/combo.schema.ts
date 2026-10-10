import { z } from 'zod';

export const createComboSchema = z.object({
  name: z.string().trim().min(2, 'Tên combo tối thiểu 2 ký tự').max(150),
  description: z.string().trim().optional(),
  imageUrl: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
  price: z.number().int().min(0, 'Giá không thể âm'),
  isActive: z.boolean().optional().default(true),
  cinemaIds: z.array(z.string().uuid()).optional(),
});

export type CreateComboInput = z.infer<typeof createComboSchema>;

export const updateComboSchema = createComboSchema.partial();
export type UpdateComboInput = z.infer<typeof updateComboSchema>;

export const comboQuerySchema = z.object({
  cinemaId: z.string().uuid().optional(),
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val !== 'false'),
});
