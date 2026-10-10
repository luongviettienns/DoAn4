import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { tmdbService } from '../src/shared/tmdb.service';
import { CoreFixture } from './helpers/core-fixture';

const app = createApp();

describe('TmdbService Unit & Integration', () => {
  it('returns empty results when query is empty', async () => {
    const res = await tmdbService.searchMovies('');
    expect(res).toEqual({ results: [], totalResults: 0 });

    const resWhitespace = await tmdbService.searchMovies('   ');
    expect(resWhitespace).toEqual({ results: [], totalResults: 0 });
  });

  it('throws an error when fetching movie details with invalid ID', async () => {
    await expect(tmdbService.getMovieDetails(0)).rejects.toThrow('Mã phim TMDB không hợp lệ');
    await expect(tmdbService.getMovieDetails(NaN)).rejects.toThrow('Mã phim TMDB không hợp lệ');
  });

  it('searches movies from TMDB with query', async () => {
    const res = await tmdbService.searchMovies('Dune');
    expect(res.results).toBeDefined();
    expect(Array.isArray(res.results)).toBe(true);
    if (res.results.length > 0) {
      const first = res.results[0];
      expect(first.id).toBeTypeOf('number');
      expect(first.title).toBeTypeOf('string');
      expect(first.title.length).toBeGreaterThan(0);
    }
  });

  it('fetches movie details from TMDB', async () => {
    // 438631 is Dune (2021)
    const details = await tmdbService.getMovieDetails(438631);
    expect(details.id).toBe(438631);
    expect(details.title).toBeDefined();
    expect(details.duration).toBeGreaterThan(0);
    expect(Array.isArray(details.genres)).toBe(true);
  });
});

describe('TMDB API Endpoints RBAC & Validation', () => {
  let fixture: CoreFixture;

  beforeAll(async () => {
    fixture = await CoreFixture.create();
  });

  afterAll(async () => {
    await fixture?.cleanup();
  });

  it('rejects unauthenticated requests to TMDB search with 401', async () => {
    const res = await request(app).get('/api/v1/movies/tmdb/search?query=Dune');
    expect(res.status).toBe(401);
  });

  it('rejects CUSTOMER role from accessing TMDB search with 403', async () => {
    const res = await request(app)
      .get('/api/v1/movies/tmdb/search?query=Dune')
      .set('Authorization', `Bearer ${fixture.accounts.buyer.token}`);
    expect(res.status).toBe(403);
  });

  it('allows STAFF and ADMIN to search TMDB', async () => {
    const resStaff = await request(app)
      .get('/api/v1/movies/tmdb/search?query=Dune')
      .set('Authorization', `Bearer ${fixture.accounts.staff.token}`);
    expect(resStaff.status).toBe(200);
    expect(resStaff.body.success).toBe(true);
    expect(Array.isArray(resStaff.body.data.results)).toBe(true);

    const resAdmin = await request(app)
      .get('/api/v1/movies/tmdb/search?query=Dune')
      .set('Authorization', `Bearer ${fixture.accounts.admin.token}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.data.results.length).toBeGreaterThan(0);
  });

  it('allows ADMIN to get TMDB movie details for auto-fill', async () => {
    const res = await request(app)
      .get('/api/v1/movies/tmdb/438631')
      .set('Authorization', `Bearer ${fixture.accounts.admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(438631);
    expect(res.body.data.title).toBeDefined();
    expect(res.body.data.duration).toBe(155);
  });

  it('returns 400 for invalid TMDB id in endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/movies/tmdb/0')
      .set('Authorization', `Bearer ${fixture.accounts.admin.token}`);
    expect(res.status).toBe(400);
  });
});
