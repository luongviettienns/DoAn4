import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import prisma from '../shared/prisma';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  cinemaIds: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  role: Role;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('UNAUTHORIZED', 'Yêu cầu đăng nhập để truy cập tài nguyên');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars';

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as JwtPayload;
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn, vui lòng làm mới token');
      }
      throw new UnauthorizedError('TOKEN_INVALID', 'Mã xác thực không hợp lệ');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        cinemaAssignments: {
          select: { cinemaId: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('USER_NOT_FOUND', 'Người dùng không tồn tại');
    }

    if (user.status === 'LOCKED') {
      throw new ForbiddenError('ACCOUNT_LOCKED', 'Tài khoản của bạn đã bị tạm khóa');
    }

    if (user.status === 'PENDING_VERIFY') {
      throw new ForbiddenError('ACCOUNT_PENDING', 'Vui lòng xác minh email trước khi sử dụng');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      cinemaIds: user.cinemaAssignments.map((a) => a.cinemaId),
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars';

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { cinemaAssignments: { select: { cinemaId: true } } },
      });

      if (user && user.status === 'ACTIVE') {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          cinemaIds: user.cinemaAssignments.map((a) => a.cinemaId),
        };
      }
    } catch {
      // Ignore token errors for optional auth
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = authenticate;
export { requireRole, requireRole as requireRoles } from './rbac.middleware';
