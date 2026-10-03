import { Response } from 'express';
import { ErrorDetail } from './errors';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    serverTime: new Date().toISOString(),
  });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    meta,
    serverTime: new Date().toISOString(),
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: ErrorDetail[] = []
) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};
