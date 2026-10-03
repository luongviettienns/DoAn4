import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Auth API (F01)', () => {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const testUser = {
    email: `testuser_${randomSuffix}@gmail.com`,
    phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    fullName: 'Người Dùng Kiểm Thử',
    password: 'Password123',
  };

  let accessToken = '';
  let refreshTokenCookie = '';

  it('POST /api/v1/auth/register - should successfully register a new customer', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.accessToken).toBeDefined();

    // Check refresh cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('refreshToken');
  });

  it('POST /api/v1/auth/register - should reject registration with existing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUser,
        phone: '0988776655', // different phone
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('POST /api/v1/auth/login - should login successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;

    const cookies = res.headers['set-cookie'];
    if (cookies) refreshTokenCookie = cookies[0];
  });

  it('POST /api/v1/auth/login - should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me - should fetch profile with valid access token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.fullName).toBe(testUser.fullName);
  });

  it('GET /api/v1/auth/me - should reject request without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/auth/refresh - should issue new tokens with valid refresh cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshTokenCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });
});
