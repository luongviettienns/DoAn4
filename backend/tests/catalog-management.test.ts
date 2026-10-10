import crypto from 'node:crypto';
import { MovieStatus, Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();

/** Tracks API-created records before requests, so failed assertions still clean up. */
class CatalogRecords {
  readonly genreIds = [crypto.randomUUID(), crypto.randomUUID()];
  readonly movieTitles = new Set<string>();
  readonly cinemaNames = new Set<string>();
  readonly roomNames = new Set<string>();

  constructor(readonly core: CoreFixture) {}

  async initialize() {
    await prisma.genre.createMany({ data: this.genreIds.map((id, index) => ({
      id, name: `${this.core.namespace}-genre-${index}`, slug: `${this.core.namespace}-genre-${index}`,
    })) });
    await prisma.movieGenre.create({ data: { movieId: this.core.movieId, genreId: this.genreIds[0] } });
  }

  movieInput(label = 'created') {
    const title = `${this.core.namespace}-movie-${label}`;
    this.movieTitles.add(title);
    return {
      title, originalTitle: `${this.core.namespace}-original-${label}`,
      posterUrl: 'https://example.test/catalog-poster.jpg', bannerUrl: 'https://example.test/catalog-banner.jpg',
      trailerUrl: 'https://example.test/catalog-trailer.mp4', description: 'An isolated catalog management movie.',
      durationMin: 120, ageRating: 'P' as const, releaseDate: '2027-01-02', endDate: '2027-02-02',
      director: 'Fixture director', cast: ['Fixture actor'], language: 'Vietnamese', country: 'Vietnam',
      genreIds: [...this.genreIds],
    };
  }

  async movie(label: string, overrides: Partial<Prisma.MovieCreateInput> = {}, genreId = this.genreIds[0]) {
    const { genreIds: _genreIds, releaseDate, endDate, ...input } = this.movieInput(label);
    return prisma.movie.create({ data: {
      ...input, releaseDate: new Date(releaseDate), endDate: new Date(endDate),
      status: MovieStatus.NOW_SHOWING, ...overrides, genres: { create: { genreId } },
    } });
  }

  cinemaInput(label = 'created') {
    const name = `${this.core.namespace}-cinema-${label}`;
    this.cinemaNames.add(name);
    return { name, address: 'Catalog fixture address', city: this.core.namespace, phone: '0901234567', openTime: '08:00:00', closeTime: '23:30:00' };
  }

  roomInput(label = 'created', cinemaId = this.core.cinemaId) {
    const name = `${this.core.namespace}-room-${label}`;
    this.roomNames.add(name);
    return { cinemaId, name, format: 'THREE_D' as const, rowCount: 2, columnCount: 3 };
  }

  async cleanup() {
    const movies = await prisma.movie.findMany({ where: { title: { in: [...this.movieTitles] } }, select: { id: true } });
    const cinemas = await prisma.cinema.findMany({ where: { name: { in: [...this.cinemaNames] } }, select: { id: true } });
    const cinemaIds = cinemas.map((cinema) => cinema.id);
    const rooms = await prisma.room.findMany({
      where: {
        cinemaId: { in: [this.core.cinemaId, this.core.foreignCinemaId, ...cinemaIds] },
        name: { in: [...this.roomNames] },
      }, select: { id: true },
    });
    const roomIds = rooms.map((room) => room.id);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.seat.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.room.deleteMany({ where: { id: { in: roomIds } } });
        await tx.cinema.deleteMany({ where: { id: { in: cinemaIds } } });
        await tx.movie.deleteMany({ where: { id: { in: movies.map((movie) => movie.id) } } });
      });
    } finally {
      try {
        await this.core.cleanup();
      } finally {
        await prisma.genre.deleteMany({ where: { id: { in: this.genreIds } } });
      }
    }
  }
}

function catalogTest(name: string, scenario: (records: CatalogRecords) => Promise<void>) {
  it(name, async () => {
    requireDedicatedTestDatabase();
    const records = new CatalogRecords(await CoreFixture.create());
    try {
      await records.initialize();
      await scenario(records);
    } finally {
      await records.cleanup();
    }
  }, 30_000);
}

describe('Catalog integration: public movies and admin management (F02, F09)', () => {
  catalogTest('movie search applies status and genre filters and excludes hidden records', async (r) => {
    await r.movie('other-genre', {}, r.genreIds[1]);
    await r.movie('coming-soon', { status: 'COMING_SOON' });
    await r.movie('hidden', { isActive: false });
    const response = await request(app).get('/api/v1/movies').query({
      search: r.core.namespace, status: 'NOW_SHOWING', genreId: r.genreIds[0],
    });
    expect(response.status).toBe(200);
    expect(response.body.data.map((movie: { id: string }) => movie.id)).toEqual([r.core.movieId]);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].genres.map((genre: { id: string }) => genre.id)).toEqual([r.genreIds[0]]);
  });

  catalogTest('public movie search matches the original title and trims search text', async (r) => {
    const movie = await r.movie('original-search');
    const response = await request(app).get('/api/v1/movies').query({ search: `  ${r.core.namespace}-original-original-search  ` });
    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { id: string }) => item.id)).toEqual([movie.id]);
    expect(response.body.meta.total).toBe(1);
  });

  catalogTest('movie pagination reports filtered totals and orders by release date', async (r) => {
    const newer = await r.movie('newer', { releaseDate: new Date('2028-01-01'), endDate: null });
    const newest = await r.movie('newest', { releaseDate: new Date('2029-01-01'), endDate: null });
    const first = await request(app).get('/api/v1/movies').query({ search: r.core.namespace, page: 1, limit: 2 });
    const second = await request(app).get('/api/v1/movies').query({ search: r.core.namespace, page: 2, limit: 2 });
    expect(first.status).toBe(200);
    expect(first.body.data.map((movie: { id: string }) => movie.id)).toEqual([newest.id, newer.id]);
    expect(first.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 });
    expect(second.body.data.map((movie: { id: string }) => movie.id)).toEqual([r.core.movieId]);
    expect(second.body.meta).toMatchObject({ page: 2, limit: 2, total: 3 });
  });

  catalogTest('movie list rejects invalid pagination and filter values', async (_r) => {
    for (const query of [{ page: 0 }, { limit: 0 }, { limit: 101 }, { status: 'INVALID' }, { genreId: 'invalid-id' }]) {
      const response = await request(app).get('/api/v1/movies').query(query);
      expect(response.status, JSON.stringify(query)).toBe(400);
    }
  });

  catalogTest('movie detail contains genres and only upcoming open showtimes', async (r) => {
    await r.core.addShowtime(new Date(Date.now() - 60_000));
    const closed = await r.core.addShowtime();
    await prisma.showtime.update({ where: { id: closed }, data: { status: 'CLOSED' } });
    const response = await request(app).get(`/api/v1/movies/${r.core.movieId}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: r.core.movieId, title: r.core.namespace, ageRating: 'T18', durationMin: 90 });
    expect(response.body.data.genres.map((genre: { id: string }) => genre.id)).toEqual([r.genreIds[0]]);
    expect(response.body.data.upcomingShowtimes.map((showtime: { id: string }) => showtime.id)).toEqual([r.core.showtimeId]);
    expect(response.body.data.upcomingShowtimes[0].room).toMatchObject({ id: r.core.roomId, cinema: { id: r.core.cinemaId } });
  });

  catalogTest('an admin can create a movie with persisted dates, cast, and genres', async (r) => {
    const input = r.movieInput();
    const created = await request(app).post('/api/v1/movies').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(input);
    expect(created.status).toBe(201);
    const detail = await request(app).get(`/api/v1/movies/${created.body.data.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      title: input.title, originalTitle: input.originalTitle, durationMin: 120, ageRating: 'P',
      status: 'COMING_SOON', cast: ['Fixture actor'], director: 'Fixture director',
    });
    expect(detail.body.data.releaseDate.slice(0, 10)).toBe('2027-01-02');
    expect(detail.body.data.endDate.slice(0, 10)).toBe('2027-02-02');
    expect(detail.body.data.genres.map((genre: { id: string }) => genre.id).sort()).toEqual([...r.genreIds].sort());
  });

  catalogTest('admin updates replace genres and partial updates preserve the other movie fields', async (r) => {
    const updatedTitle = `${r.core.namespace}-updated-title`;
    const updated = await request(app).put(`/api/v1/movies/${r.core.movieId}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({
      title: updatedTitle, genreIds: [r.genreIds[1]], durationMin: 135, releaseDate: '2026-02-01',
    });
    expect(updated.status).toBe(200);
    const partial = await request(app).put(`/api/v1/movies/${r.core.movieId}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ description: 'Updated description with existing genres preserved.' });
    expect(partial.status).toBe(200);
    const detail = await request(app).get(`/api/v1/movies/${r.core.movieId}`);
    expect(detail.body.data).toMatchObject({ title: updatedTitle, durationMin: 135, ageRating: 'T18' });
    expect(detail.body.data.genres.map((genre: { id: string }) => genre.id)).toEqual([r.genreIds[1]]);
    expect(await prisma.movieGenre.count({ where: { movieId: r.core.movieId, genreId: r.genreIds[0] } })).toBe(0);
  });

  catalogTest('hiding a movie removes public visibility while preserving its referenced showtime', async (r) => {
    const response = await request(app).delete(`/api/v1/movies/${r.core.movieId}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`);
    expect(response.status).toBe(200);
    expect(await prisma.movie.findUnique({ where: { id: r.core.movieId } })).toMatchObject({ isActive: false });
    expect((await request(app).get(`/api/v1/movies/${r.core.movieId}`)).status).toBe(404);
    const list = await request(app).get('/api/v1/movies').query({ search: r.core.namespace });
    expect(list.body.data).toEqual([]);
    expect(list.body.meta.total).toBe(0);
    expect(await prisma.showtime.count({ where: { id: r.core.showtimeId } })).toBe(1);
  });

  catalogTest('missing movie IDs return not-found for reads, updates, and hiding', async (r) => {
    const id = crypto.randomUUID();
    expect((await request(app).get(`/api/v1/movies/${id}`)).status).toBe(404);
    expect((await request(app).put(`/api/v1/movies/${id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ title: 'Missing movie' })).status).toBe(404);
    expect((await request(app).delete(`/api/v1/movies/${id}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`)).status).toBe(404);
  });

  catalogTest('duplicate genre selections reject movie creation without a partial record', async (r) => {
    const input = { ...r.movieInput('duplicate-genres'), genreIds: [r.genreIds[0], r.genreIds[0]] };
    const response = await request(app).post('/api/v1/movies').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(input);
    expect(response.status).toBe(409);
    expect(await prisma.movie.count({ where: { title: input.title } })).toBe(0);
  });

  catalogTest('customers cannot create, update, or hide movies and anonymous writes require login', async (r) => {
    const input = r.movieInput('customer-denied');
    expect((await request(app).post('/api/v1/movies').send(input)).status).toBe(401);
    expect((await request(app).post('/api/v1/movies').set('Authorization', `Bearer ${r.core.accounts.buyer.token}`).send(input)).status).toBe(403);
    expect((await request(app).put(`/api/v1/movies/${r.core.movieId}`).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`).send({ title: 'Unauthorized update' })).status).toBe(403);
    expect((await request(app).delete(`/api/v1/movies/${r.core.movieId}`).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`)).status).toBe(403);
    expect(await prisma.movie.findUnique({ where: { id: r.core.movieId } })).toMatchObject({ title: r.core.namespace, isActive: true });
    expect(await prisma.movie.count({ where: { title: input.title } })).toBe(0);
  });
});

describe('Catalog integration: cinemas, rooms, and seat maps (F02, F10)', () => {
  catalogTest('cinema lists filter by city and exclude inactive cinemas', async (r) => {
    await prisma.cinema.update({ where: { id: r.core.cinemaId }, data: { city: r.core.namespace } });
    await prisma.cinema.update({ where: { id: r.core.foreignCinemaId }, data: { city: r.core.namespace, status: 'INACTIVE' } });
    const response = await request(app).get('/api/v1/cinemas').query({ city: r.core.namespace });
    expect(response.status).toBe(200);
    expect(response.body.data.map((cinema: { id: string }) => cinema.id)).toEqual([r.core.cinemaId]);
    expect(response.body.data[0]).toMatchObject({ city: r.core.namespace, roomCount: 1 });
  });

  catalogTest('cinema detail lists active rooms with dimensions and seat counts', async (r) => {
    const input = r.roomInput('maintenance');
    const maintenance = await prisma.room.create({ data: { ...input, status: 'MAINTENANCE' } });
    const response = await request(app).get(`/api/v1/cinemas/${r.core.cinemaId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.rooms.map((room: { id: string }) => room.id)).toEqual([r.core.roomId]);
    expect(response.body.data.rooms.some((room: { id: string }) => room.id === maintenance.id)).toBe(false);
    expect(response.body.data.rooms[0]).toMatchObject({ format: 'TWO_D', rowCount: 1, columnCount: 13, _count: { seats: 12 } });
  });

  catalogTest('room seat maps omit inactive seats and preserve ordered coordinates and seat types', async (r) => {
    await prisma.seat.update({ where: { id: r.core.seats[0].id }, data: { isActive: false } });
    const response = await request(app).get(`/api/v1/cinemas/rooms/${r.core.roomId}/seats`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: r.core.roomId, cinema: { id: r.core.cinemaId } });
    expect(response.body.data.seats.map((seat: { id: string }) => seat.id)).toEqual(r.core.seats.slice(1).map((seat) => seat.id));
    expect(response.body.data.seats[0]).toMatchObject({ rowLabel: 'A', seatNumber: 2, x: 1, y: 0, type: 'STANDARD', columnSpan: 1 });
    expect(response.body.data.seats[9]).toMatchObject({ type: 'VIP', columnSpan: 1 });
    expect(response.body.data.seats[10]).toMatchObject({ type: 'COUPLE', columnSpan: 2 });
  });

  catalogTest('missing cinema and room IDs return not-found from public detail routes', async (_r) => {
    expect((await request(app).get(`/api/v1/cinemas/${crypto.randomUUID()}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/cinemas/rooms/${crypto.randomUUID()}/seats`)).status).toBe(404);
  });

  catalogTest('an admin can create a cinema and a room visible in its public detail', async (r) => {
    const cinemaInput = r.cinemaInput();
    const cinema = await request(app).post('/api/v1/cinemas').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(cinemaInput);
    expect(cinema.status).toBe(201);
    expect(await prisma.cinema.findUnique({ where: { id: cinema.body.data.id } })).toMatchObject({ name: cinemaInput.name, city: r.core.namespace, status: 'ACTIVE' });
    const roomInput = r.roomInput('new-cinema-room', cinema.body.data.id);
    const room = await request(app).post('/api/v1/cinemas/rooms').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(roomInput);
    expect(room.status).toBe(201);
    const detail = await request(app).get(`/api/v1/cinemas/${cinema.body.data.id}`);
    expect(detail.body.data.rooms).toHaveLength(1);
    expect(detail.body.data.rooms[0]).toMatchObject({ id: room.body.data.id, name: roomInput.name, format: 'THREE_D', rowCount: 2, columnCount: 3 });
  });

  catalogTest('duplicate room names are rejected within a cinema and allowed in another cinema', async (r) => {
    const input = r.roomInput('duplicate');
    const create = (body: typeof input) => request(app).post('/api/v1/cinemas/rooms').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send(body);
    expect((await create(input)).status).toBe(201);
    expect((await create(input)).status).toBe(409);
    expect(await prisma.room.count({ where: { cinemaId: r.core.cinemaId, name: input.name } })).toBe(1);
    expect((await create({ ...input, cinemaId: r.core.foreignCinemaId })).status).toBe(201);
  });

  catalogTest('customers cannot create cinemas or rooms and anonymous writes require login', async (r) => {
    const cinema = r.cinemaInput('denied');
    const room = r.roomInput('denied');
    for (const [url, input] of [['/api/v1/cinemas', cinema], ['/api/v1/cinemas/rooms', room]] as const) {
      expect((await request(app).post(url).send(input)).status).toBe(401);
      expect((await request(app).post(url).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`).send(input)).status).toBe(403);
    }
    expect(await prisma.cinema.count({ where: { name: cinema.name } })).toBe(0);
    expect(await prisma.room.count({ where: { cinemaId: r.core.cinemaId, name: room.name } })).toBe(0);
  });

  catalogTest('room creation rejects invalid dimensions and a missing parent cinema', async (r) => {
    const input = r.roomInput('invalid');
    for (const invalid of [{ rowCount: 0 }, { rowCount: 31 }, { columnCount: 0 }, { columnCount: 51 }]) {
      const response = await request(app).post('/api/v1/cinemas/rooms').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ ...input, ...invalid });
      expect(response.status, JSON.stringify(invalid)).toBe(400);
    }
    const missing = await request(app).post('/api/v1/cinemas/rooms').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ ...input, cinemaId: crypto.randomUUID() });
    expect(missing.status).toBe(404);
    expect(await prisma.room.count({ where: { name: input.name, cinemaId: r.core.cinemaId } })).toBe(0);
  });

  catalogTest('cinema creation rejects malformed hours and closing before opening', async (r) => {
    const input = r.cinemaInput('invalid-hours');
    const statuses: number[] = [];
    for (const invalid of [{ openTime: 'not-a-time' }, { openTime: '23:00:00', closeTime: '08:00:00' }]) {
      const response = await request(app).post('/api/v1/cinemas').set('Authorization', `Bearer ${r.core.accounts.admin.token}`).send({ ...input, ...invalid });
      statuses.push(response.status);
    }
    expect(statuses).toEqual([400, 400]);
    expect(await prisma.cinema.count({ where: { name: input.name } })).toBe(0);
  });
});
