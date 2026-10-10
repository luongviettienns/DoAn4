import 'dotenv/config';
import { createApp } from './app';
import prisma from './shared/prisma';
import { validateEnvironment } from './config/env';

// 1. Fail-fast secrets and environment validation
validateEnvironment();

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Health liveness probe:  http://localhost:${PORT}/health`);
  console.log(`Health readiness probe: http://localhost:${PORT}/ready`);
  console.log(`API base URL:           http://localhost:${PORT}/api/v1`);
});

// 2. Graceful Shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Force shutdown timeout after 10s
  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timeout exceeded (10s). Forcing process exit.');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    // Stop accepting new HTTP requests
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        console.log('HTTP server closed.');
        resolve();
      });
    });

    // Disconnect Prisma DB pool
    await prisma.$disconnect();
    console.log('Prisma database connections closed.');

    console.log('Graceful shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

export { server, gracefulShutdown };
