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
import { orderController } from './modules/orders/order.controller';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';

export const createApp = (): Application => {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check endpoint (Operational tag in OpenAPI)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cinema-booking-api',
    });
  });

  // Base API v1 root router
  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        message: 'Cinema Booking API v1',
        version: '1.0.0-design',
        modules: ['auth', 'movies', 'cinemas', 'showtimes', 'orders', 'payments', 'checkin'],
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
  app.use('/api/v1/ops', opsRoutes);

  // OpenAPI contract: /me/orders endpoints
  app.get('/api/v1/me/orders', authenticate, (req: Request, res: Response, next) => orderController.getMyOrders(req, res, next));
  app.get('/api/v1/me/orders/:id', authenticate, (req: Request, res: Response, next) => orderController.getById(req, res, next));

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
