import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

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
      },
      serverTime: new Date().toISOString(),
    });
  });

  return app;
};
