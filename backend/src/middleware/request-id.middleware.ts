import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const existing = req.header('x-request-id') || req.header('X-Request-Id');
  const id = existing?.trim() || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
