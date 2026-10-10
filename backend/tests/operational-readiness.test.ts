import request from 'supertest';
import { describe, expect, it } from 'vitest';
import createApp from '../src/app';
import { validateEnvironment } from '../src/config/env';

const app = createApp();

describe('Operational Readiness & Health Probes', () => {
  describe('GET /health — Liveness probe', () => {
    it('returns HTTP 200 with service metadata', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('cinema-booking-api');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /ready — Readiness probe with DB connectivity', () => {
    it('returns HTTP 200 and database connected when DB is reachable', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.database).toBe('connected');
      expect(res.body.service).toBe('cinema-booking-api');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Request ID Correlation Middleware', () => {
    it('generates a new UUID in X-Request-Id header when not provided', async () => {
      const res = await request(app).get('/health');
      const reqId = res.headers['x-request-id'];
      expect(reqId).toBeDefined();
      expect(reqId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('propagates client-supplied X-Request-Id header', async () => {
      const customId = 'client-req-trace-9999';
      const res = await request(app)
        .get('/health')
        .set('X-Request-Id', customId);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  describe('validateEnvironment — Fail-fast Configuration', () => {
    it('passes under current test/development environment', () => {
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('fails fast when DATABASE_URL is missing', () => {
      const originalDb = process.env.DATABASE_URL;
      try {
        delete process.env.DATABASE_URL;
        expect(() => validateEnvironment()).toThrow(/Missing required environment variables.*DATABASE_URL/);
      } finally {
        process.env.DATABASE_URL = originalDb;
      }
    });

    it('fails fast in production if JWT secrets are insecure default or too short', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalAccess = process.env.JWT_ACCESS_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        process.env.JWT_ACCESS_SECRET = 'cinex_super_secret_jwt_access_key_2026_dev_32chars'; // default insecure
        expect(() => validateEnvironment()).toThrow(/Security Error.*JWT_ACCESS_SECRET/);

        process.env.JWT_ACCESS_SECRET = 'short'; // too short
        expect(() => validateEnvironment()).toThrow(/Security Error.*JWT_ACCESS_SECRET/);
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.JWT_ACCESS_SECRET = originalAccess;
      }
    });
  });
});
