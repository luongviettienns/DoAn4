import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không đúng định dạng').toLowerCase().trim(),
  phone: z.string().regex(/^0[0-9]{9}$/, 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số'),
  fullName: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên').max(100, 'Họ tên tối đa 100 ký tự').trim(),
  birthDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Ngày sinh không hợp lệ',
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng').toLowerCase().trim(),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  phone: z.string().regex(/^0[0-9]{9}$/, 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0').optional(),
  birthDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Ngày sinh không hợp lệ',
  }),
  avatarUrl: z.string().url().max(2048).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái và 1 chữ số'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không đúng định dạng').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Mã xác nhận không được để trống').trim(),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Mật khẩu mới phải chứa ít nhất 1 chữ cái và 1 chữ số'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Mã xác thực không được để trống').trim(),
});

export const googleLoginSchema = z.object({
  credential: z.string().min(1, 'Mã xác thực Google (credential) không được để trống').trim(),
  phone: z.string().regex(/^0[0-9]{9}$/, 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0').optional(),
});

export const completeGoogleRegistrationSchema = z.object({
  tempToken: z.string().min(1, 'Mã đăng ký tạm thời không được để trống').trim(),
  phone: z.string().regex(/^0[0-9]{9}$/, 'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type CompleteGoogleRegistrationInput = z.infer<typeof completeGoogleRegistrationSchema>;


