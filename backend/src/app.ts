import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './modules/auth/auth.routes';
import movieRoutes from './modules/movies/movie.routes';
import cinemaRoutes from './modules/cinemas/cinema.routes';
import showtimeRoutes from './modules/showtimes/showtime.routes';
import orderRoutes from './modules/orders/order.routes';
import paymentRoutes from './modules/payments/payment.routes';
import checkinRoutes from './modules/checkin/checkin.routes';
import opsRoutes from './modules/worker/ops.routes';
import comboRoutes from './modules/combos/combo.routes';
import voucherRoutes from './modules/vouchers/voucher.routes';
import reportRoutes from './modules/reports/report.routes';
import pricingRoutes from './modules/pricing/pricing.routes';
import refundRoutes from './modules/refunds/refund.routes';
import { orderController } from './modules/orders/order.controller';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import { requestId } from './middleware/request-id.middleware';
import prisma from './shared/prisma';

export const createApp = (): Application => {
  const app = express();
  app.set('trust proxy', 1);

  // Request correlation tracking
  app.use(requestId);

  app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Liveness probe (Operational tag in OpenAPI)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'cinema-booking-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe with database connectivity check
  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ready',
        database: 'connected',
        service: 'cinema-booking-api',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'not_ready',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Database ping failed',
        service: 'cinema-booking-api',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Base API v1 root router
  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        message: 'Cinema Booking API v1',
        version: '1.0.0-design',
        modules: ['auth', 'movies', 'cinemas', 'showtimes', 'orders', 'payments', 'checkin', 'combos', 'vouchers', 'reports', 'pricing', 'refunds'],
      },
      serverTime: new Date().toISOString(),
    });
  });

  // Module Routers
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/movies', movieRoutes);
  app.use('/api/v1/cinemas', cinemaRoutes);
  app.use('/api/v1/showtimes', showtimeRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/payment', paymentRoutes);
  app.use('/api/v1/checkin', checkinRoutes);
  app.use('/api/v1/combos', comboRoutes);
  app.use('/api/v1/vouchers', voucherRoutes);
  app.use('/api/v1/admin/reports', reportRoutes);
  app.use('/api/v1/admin/refunds', refundRoutes);
  app.use('/api/v1/pricing', pricingRoutes);
  app.use('/api/v1/ops', opsRoutes);

  // OpenAPI contract: /me/orders endpoints
  app.get('/api/v1/me/orders', authenticate, (req: Request, res: Response, next) => orderController.getMyOrders(req, res, next));
  app.get('/api/v1/me/orders/:id', authenticate, (req: Request, res: Response, next) => orderController.getById(req, res, next));

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
