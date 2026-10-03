import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Movies & Cinemas API (F02, F09, F10)', () => {
  let createdMovieId = '';
  let adminToken = '';
  let customerToken = '';

  it('Login as Admin to get Admin token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cinex.vn',
      password: 'Admin@123456',
    });
    // If Admin@123456 fails, check seeded password
    if (res.status === 200) {
      adminToken = res.body.data.accessToken;
    } else {
      // Login with password 12345678 from seed.ts
      const res2 = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@cinex.vn',
        password: '12345678',
      });
      expect(res2.status).toBe(200);
      adminToken = res2.body.data.accessToken;
    }
  });

  it('Login as Customer to get Customer token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@gmail.com',
      password: '12345678',
    });
    expect(res.status).toBe(200);
    customerToken = res.body.data.accessToken;
  });

  it('GET /api/v1/movies - should list now-showing movies', async () => {
    const res = await request(app).get('/api/v1/movies');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
    createdMovieId = res.body.data[0].id;
  });

  it('GET /api/v1/movies/:id - should get movie details', async () => {
    const res = await request(app).get(`/api/v1/movies/${createdMovieId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdMovieId);
    expect(res.body.data.title).toBeDefined();
  });

  it('POST /api/v1/movies - should reject movie creation without token', async () => {
    const res = await request(app).post('/api/v1/movies').send({
      title: 'Phim Thử Nghiệm',
    });

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/movies - should reject movie creation by CUSTOMER role', async () => {
    const res = await request(app)
      .post('/api/v1/movies')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Phim Thử Nghiệm',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/cinemas - should list all active cinemas', async () => {
    const res = await request(app).get('/api/v1/cinemas');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
