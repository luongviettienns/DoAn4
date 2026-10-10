import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

afterEach(() => vi.unstubAllEnvs());

describe('Payment simulation access boundary', () => {
  it.each(['/api/v1/payment/simulate-mock', '/api/v1/payment/simulate/00000000-0000-4000-8000-000000000000'])(
    'requires authentication at %s', async (path) => {
      const response = await request(createApp()).post(path).send({ orderId: '00000000-0000-4000-8000-000000000000' });
      expect(response.status).toBe(401);
    },
  );

  it.each(['/api/v1/payment/simulate-mock', '/api/v1/payment/simulate/00000000-0000-4000-8000-000000000000'])(
    'is unavailable in production at %s', async (path) => {
      vi.stubEnv('NODE_ENV', 'production');
      const response = await request(createApp()).post(path).send({ orderId: '00000000-0000-4000-8000-000000000000' });
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SIMULATION_DISABLED');
    },
  );
});
