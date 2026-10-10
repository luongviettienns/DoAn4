import { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  code?: string;
  skipInTest?: boolean;
}

interface Bucket {
  count: number;
  resetTime: number;
}

export function createLimiter(options: RateLimiterOptions) {
  const store = new Map<string, Bucket>();
  const defaultKeyGen = (req: Request) => req.ip || req.socket.remoteAddress || '127.0.0.1';
  const keyGen = options.keyGenerator || defaultKeyGen;

  // Cleanup expired entries periodically (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store.entries()) {
      if (now > bucket.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // If in test environment and not explicitly opted-in to test rate-limiting, bypass to avoid flaky tests
    if (process.env.NODE_ENV === 'test' && options.skipInTest !== false) {
      return next();
    }

    const key = keyGen(req);
    const now = Date.now();
    let bucket = store.get(key);

    if (!bucket || now > bucket.resetTime) {
      bucket = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      store.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, options.max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetTime - now) / 1000);

    res.setHeader('RateLimit-Limit', options.max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        error: {
          code: options.code || 'TOO_MANY_REQUESTS',
          message: options.message || 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút.',
        },
      });
    }

    next();
  };
}

// 1. /login: 10 req / 15 phút, key theo IP + email
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase().trim()}`,
  message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
});

// 2. /forgot-password: 3 req / giờ theo email, 10 req / giờ theo IP
export const forgotPasswordEmailLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `fp-email:${(req.body?.email || '').toLowerCase().trim()}`,
  message: 'Yêu cầu đặt lại mật khẩu cho email này đã vượt quá giới hạn (3 lần/giờ). Vui lòng thử lại sau.',
});

export const forgotPasswordIpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `fp-ip:${req.ip}`,
  message: 'IP của bạn đã gửi quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 1 giờ.',
});

// 3. /register: 10 req / giờ / IP
export const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `reg:${req.ip}`,
  message: 'Bạn đã tạo quá nhiều tài khoản trong thời gian ngắn. Vui lòng thử lại sau 1 giờ.',
});

// 4. /reset-password & /verify-email: 10 req / 15 phút / IP
export const resetPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `reset:${req.ip}`,
  message: 'Quá nhiều yêu cầu đặt lại mật khẩu từ IP này. Vui lòng thử lại sau 15 phút.',
});

export const verifyEmailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `verify:${req.ip}`,
  message: 'Quá nhiều yêu cầu xác thực email từ IP này. Vui lòng thử lại sau 15 phút.',
});
