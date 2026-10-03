import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          'FORBIDDEN',
          `Hành động này yêu cầu một trong các quyền: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

export const requireCinemaAccess = (cinemaIdExtractor?: (req: Request) => string | undefined) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // ADMIN has full system-wide access to all cinemas
    if (req.user.role === Role.ADMIN) {
      return next();
    }

    let targetCinemaId: string | undefined;
    if (cinemaIdExtractor) {
      targetCinemaId = cinemaIdExtractor(req);
    } else {
      targetCinemaId = (req.params.cinemaId || req.body.cinemaId || req.query.cinemaId) as string | undefined;
    }

    if (!targetCinemaId) {
      return next();
    }

    if (!req.user.cinemaIds.includes(targetCinemaId)) {
      return next(
        new ForbiddenError(
          'CINEMA_ACCESS_DENIED',
          'Bạn không có quyền quản lý hoặc thao tác tại cụm rạp này'
        )
      );
    }

    next();
  };
};
