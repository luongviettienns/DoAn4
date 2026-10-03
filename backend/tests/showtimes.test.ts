import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Showtimes & Seat Map API (F11, F02, F12)', () => {
  let showtimeId = '';
  let adminToken = '';
  let movieId = '';
  let roomId = '';
  let existingStartTime = '';

  it('Login as Admin', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cinex.vn',
      password: '12345678',
    });
    expect(res.status).toBe(200);
    adminToken = res.body.data.accessToken;
  });

  it('GET /api/v1/showtimes - should list public open showtimes', async () => {
    const res = await request(app).get('/api/v1/showtimes');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstShowtime = res.body.data[0];
    showtimeId = firstShowtime.id;
    movieId = firstShowtime.movieId;
    roomId = firstShowtime.roomId;
    existingStartTime = firstShowtime.startTime;

    expect(firstShowtime.movieTitle).toBeDefined();
    expect(firstShowtime.cinemaName).toBeDefined();
    expect(firstShowtime.roomName).toBeDefined();
  });

  it('GET /api/v1/showtimes/:id/seats - should return complete interactive seat matrix and prices', async () => {
    const res = await request(app).get(`/api/v1/showtimes/${showtimeId}/seats`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.seats).toBeDefined();
    expect(res.body.data.room).toBeDefined();
    expect(res.body.data.movie).toBeDefined();
    expect(res.body.data.cinema).toBeDefined();

    const seats = res.body.data.seats;
    expect(seats.length).toBeGreaterThan(0);

    // Verify seat properties
    const sampleSeat = seats[0];
    expect(sampleSeat.id).toBeDefined();
    expect(sampleSeat.rowLabel).toBeDefined();
    expect(sampleSeat.seatNumber).toBeDefined();
    expect(sampleSeat.status).toBe('AVAILABLE');
    expect(sampleSeat.price).toBeGreaterThan(0);

    // Verify couple seat exists with columnSpan = 2
    const coupleSeat = seats.find((s: { seatType: string }) => s.seatType === 'COUPLE');
    expect(coupleSeat).toBeDefined();
    expect(coupleSeat.columnSpan).toBe(2);
  });

  it('POST /api/v1/showtimes - should reject overlapping showtime in same room (BR-10)', async () => {
    // Attempt to schedule at the exact same time
    const res = await request(app)
      .post('/api/v1/showtimes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        movieId,
        roomId,
        format: 'IMAX',
        language: 'SUBTITLED',
        startTime: existingStartTime,
        cleaningMinutes: 15,
        adMinutes: 15,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SHOWTIME_OVERLAP');
  });
});
