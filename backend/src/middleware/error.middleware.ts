import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors';
import { sendError } from '../shared/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 1. Handled AppError
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // 2. Zod Schema Validation Error
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Dữ liệu đầu vào không hợp lệ', details);
  }

  // 3. Prisma Known Request Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : 'Trường dữ liệu';
      return sendError(res, 409, 'CONFLICT', `${target} đã tồn tại trong hệ thống`);
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Không tìm thấy dữ liệu yêu cầu');
    }
  }

  // 4. Fallback unexpected internal server error
  console.error('[Unhandled Error]:', err);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau');
};
