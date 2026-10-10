import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../shared/prisma';
import { Prisma } from '@prisma/client';

export function idempotency(scope: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawKey = req.header('Idempotency-Key') || req.header('X-Idempotency-Key');

    // Nếu client không gửi Idempotency-Key, bỏ qua
    if (!rawKey) {
      return next();
    }

    const key = rawKey.trim();
    if (key.length === 0 || key.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Khóa Idempotency-Key phải từ 1 đến 100 ký tự',
        },
      });
    }

    const actorId = req.user?.id;
    if (!actorId) {
      return next();
    }

    // Tính hash SHA-256 của payload
    const bodyStr = req.body ? JSON.stringify(req.body) : '';
    const requestHash = crypto.createHash('sha256').update(`${req.method}:${req.path}:${bodyStr}`).digest('hex');

    try {
      // 1. Kiểm tra bản ghi idempotency đã có chưa
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          actorId_scope_key: {
            actorId,
            scope,
            key,
          },
        },
      });

      if (existing) {
        // Đang xử lý
        if (existing.status === 'IN_PROGRESS') {
          // Nếu đã hết hạn mà vẫn IN_PROGRESS (có thể server chết giữa chừng), cho phép thử lại
          if (existing.expiresAt <= new Date()) {
            await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
          } else {
            return res.status(409).json({
              success: false,
              error: {
                code: 'CONCURRENT_REQUEST',
                message: 'Yêu cầu đang được xử lý, vui lòng không gửi lại đồng thời',
              },
            });
          }
        } else if (existing.status === 'COMPLETED') {
          // Kiểm tra hash payload
          if (existing.requestHash !== requestHash) {
            return res.status(422).json({
              success: false,
              error: {
                code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                message: 'Dữ liệu yêu cầu không khớp với khóa Idempotency-Key đã gửi trước đó',
              },
            });
          }

          // Trả về bản ghi đã cache
          res.setHeader('X-Idempotent-Replay', 'true');
          const statusCode = existing.responseStatus || 200;
          return res.status(statusCode).json(existing.responseBody);
        }
      }

      // 2. Tạo bản ghi mới ở trạng thái IN_PROGRESS
      await prisma.idempotencyKey.create({
        data: {
          actorId,
          scope,
          key,
          requestHash,
          status: 'IN_PROGRESS',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 giờ
        },
      });

      // 3. Hook vào res.json để lưu kết quả khi hoàn tất
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        const statusCode = res.statusCode;
        prisma.idempotencyKey
          .update({
            where: {
              actorId_scope_key: {
                actorId,
                scope,
                key,
              },
            },
            data: {
              status: 'COMPLETED',
              responseStatus: statusCode,
              responseBody: body,
            },
          })
          .catch((err) => {
            console.error('[Idempotency] Lỗi lưu kết quả cache:', err);
          })
          .finally(() => {
            originalJson(body);
          });

        return res;
      };

      next();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONCURRENT_REQUEST',
            message: 'Yêu cầu đang được xử lý, vui lòng không gửi lại đồng thời',
          },
        });
      }
      next(error);
    }
  };
}
