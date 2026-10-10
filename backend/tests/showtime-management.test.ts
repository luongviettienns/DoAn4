import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { DayType, Prisma, Role, RoomFormat, SeatType, TimeSlot } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { CoreFixture, requireDedicatedTestDatabase } from './helpers/core-fixture';

const app = createApp();
type ManagerName = 'assigned' | 'foreign' | 'unassigned';
type SeatView = { seatId: string; seatType: SeatType; status: string; price: number; columnSpan: number };

/** Owns every additional record; API-created showtimes are found by owned room IDs on cleanup. */
class ShowtimeRecords {
  readonly extraRoomIds: string[] = [];
  readonly extraMovieIds: string[] = [];
  readonly holidayIds: string[] = [];
  readonly managerIds = Object.fromEntries(['assigned', 'foreign', 'unassigned'].map((name) => [name, crypto.randomUUID()])) as Record<ManagerName, string>;
  readonly managerTokens = Object.fromEntries(Object.entries(this.managerIds).map(([name, userId]) => [name,
    jwt.sign({ userId, role: Role.MANAGER }, process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars', { expiresIn: '15m' }),
  ])) as Record<ManagerName, string>;

  constructor(readonly core: CoreFixture) {}

  async initialize() {
    await prisma.showtimeSeat.deleteMany({ where: { showtimeId: this.core.showtimeId } });
    await prisma.showtime.delete({ where: { id: this.core.showtimeId } });
    await prisma.cinema.updateMany({ where: { id: { in: [this.core.cinemaId, this.core.foreignCinemaId] } }, data: {
      openTime: new Date('1970-01-01T08:00:00Z'), closeTime: new Date('1970-01-01T23:00:00Z'),
    } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { id: this.core.accounts.admin.id } });
    await prisma.user.createMany({ data: Object.entries(this.managerIds).map(([name, id], index) => ({
      id, email: `${name}-manager@${this.core.namespace}.example.test`,
      phone: `07${String(crypto.randomInt(1_000_000, 9_999_999))}${index}`,
      fullName: `${this.core.namespace}-${name}`, passwordHash: admin.passwordHash, role: Role.MANAGER,
    })) });
    await prisma.userCinema.createMany({ data: [
      { userId: this.managerIds.assigned, cinemaId: this.core.cinemaId },
      { userId: this.managerIds.foreign, cinemaId: this.core.foreignCinemaId },
    ] });
  }

  input(extra: Record<string, unknown> = {}) {
    return { movieId: this.core.movieId, roomId: this.core.roomId, startTime: '2030-01-07T10:00:00+07:00', format: 'TWO_D', ...extra };
  }

  create(extra: Record<string, unknown> = {}, token: string | null = this.core.accounts.admin.token) {
    const call = request(app).post('/api/v1/showtimes');
    if (token) call.set('Authorization', `Bearer ${token}`);
    return call.send(this.input(extra));
  }

  async room(cinemaId = this.core.cinemaId, format: RoomFormat = RoomFormat.TWO_D) {
    const id = crypto.randomUUID();
    this.extraRoomIds.push(id);
    return prisma.room.create({ data: { id, cinemaId, name: `${this.core.namespace}-${id}`, format, rowCount: 1, columnCount: 1 } });
  }

  async movie() {
    const id = crypto.randomUUID();
    this.extraMovieIds.push(id);
    return prisma.movie.create({ data: {
      id, title: `${this.core.namespace}-${id}`, description: 'Showtime filter fixture', posterUrl: 'https://example.test/movie.jpg',
      ageRating: 'P', durationMin: 90, releaseDate: new Date('2020-01-01'), status: 'NOW_SHOWING',
    } });
  }

  async showtime(startTime = '2030-01-07T10:00:00+07:00', extra: Partial<Prisma.ShowtimeUncheckedCreateInput> = {}) {
    const id = crypto.randomUUID();
    this.core.showtimeIds.push(id);
    const showtime = await prisma.showtime.create({ data: {
      id, movieId: this.core.movieId, roomId: this.core.roomId, format: 'TWO_D', language: 'SUBTITLED', status: 'OPEN',
      startTime: new Date(startTime), endTime: new Date(new Date(startTime).getTime() + 90 * 60_000),
      adMinutes: 0, cleaningMinutes: 15, ...extra,
    } });
    const seats = await prisma.seat.findMany({ where: { roomId: showtime.roomId, isActive: true } });
    await prisma.showtimeSeat.createMany({ data: seats.map((seat) => ({
      showtimeId: id, roomId: seat.roomId, seatId: seat.id, rowLabel: seat.rowLabel, seatNumber: seat.seatNumber,
      seatType: seat.type, x: seat.x, y: seat.y, columnSpan: seat.columnSpan,
      status: seat.type === SeatType.BLOCKED ? 'BLOCKED' : 'AVAILABLE',
    })) });
    return showtime;
  }

  async pricing() {
    await prisma.priceRule.deleteMany({ where: { cinemaId: this.core.cinemaId } });
    const amounts = {
      WEEKDAY: { MORNING: 80_000, AFTERNOON: 90_000, EVENING: 100_000 },
      WEEKEND: { MORNING: 110_000, AFTERNOON: 120_000, EVENING: 130_000 },
      HOLIDAY: { MORNING: 140_000, AFTERNOON: 150_000, EVENING: 160_000 },
    };
    await prisma.priceRule.createMany({ data: (['TWO_D', 'THREE_D', 'IMAX'] as const).flatMap((roomFormat, index) =>
      (['WEEKDAY', 'WEEKEND', 'HOLIDAY'] as const).flatMap((dayType) =>
        (['MORNING', 'AFTERNOON', 'EVENING'] as const).map((timeSlot) => ({
          cinemaId: this.core.cinemaId, roomFormat, dayType, timeSlot,
          basePrice: amounts[dayType][timeSlot] + [0, 30_000, 80_000][index], effectiveFrom: new Date('2020-01-01'),
        })))) });
  }

  async futurePrices(dayType: DayType, timeSlot: TimeSlot) {
    await prisma.priceRule.create({ data: {
      cinemaId: this.core.cinemaId, roomFormat: 'TWO_D', dayType, timeSlot, basePrice: 999_000, effectiveFrom: new Date('2031-01-01'),
    } });
    await prisma.seatSurcharge.create({ data: {
      cinemaId: this.core.cinemaId, seatType: 'VIP', amount: 888_000, effectiveFrom: new Date('2031-01-01'),
    } });
  }

  async holiday(date: string) {
    const id = crypto.randomUUID();
    this.holidayIds.push(id);
    return prisma.holiday.create({ data: { id, date: new Date(`${date}T00:00:00Z`), name: this.core.namespace } });
  }

  map(id: string) { return request(app).get(`/api/v1/showtimes/${id}/seats`); }

  book(id: string, counter = false, seatIds = [this.core.seats[10].id]) {
    return request(app).post(counter ? '/api/v1/orders/counter' : '/api/v1/orders')
      .set('Authorization', `Bearer ${counter ? this.core.accounts.staff.token : this.core.accounts.buyer.token}`)
      .send({ showtimeId: id, seatIds, ageConfirmed: true, ...(counter ? { paymentMethod: 'CASH' } : {}) });
  }

  async cleanup() {
    const roomIds = [this.core.roomId, ...this.extraRoomIds];
    const showtimes = await prisma.showtime.findMany({ where: { roomId: { in: roomIds } }, select: { id: true } });
    this.core.showtimeIds.push(...showtimes.map((showtime) => showtime.id));
    try {
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({ where: { actorId: { in: Object.values(this.managerIds) } } });
        await tx.idempotencyKey.deleteMany({ where: { actorId: { in: Object.values(this.managerIds) } } });
        await tx.userCinema.deleteMany({ where: { userId: { in: Object.values(this.managerIds) } } });
        await tx.user.deleteMany({ where: { id: { in: Object.values(this.managerIds) } } });
        await tx.showtimeSeat.deleteMany({ where: { roomId: { in: this.extraRoomIds } } });
        await tx.showtime.deleteMany({ where: { roomId: { in: this.extraRoomIds } } });
        await tx.seat.deleteMany({ where: { roomId: { in: this.extraRoomIds } } });
        await tx.room.deleteMany({ where: { id: { in: this.extraRoomIds } } });
        await tx.holiday.deleteMany({ where: { id: { in: this.holidayIds } } });
      });
    } finally {
      try {
        await this.core.cleanup();
      } finally {
        await prisma.movie.deleteMany({ where: { id: { in: this.extraMovieIds } } });
      }
    }
  }
}

function showtimeTest(name: string, scenario: (records: ShowtimeRecords) => Promise<void>) {
  it(name, async () => {
    requireDedicatedTestDatabase();
    const records = new ShowtimeRecords(await CoreFixture.create('P'));
    try {
      await records.initialize();
      await scenario(records);
    } finally {
      await records.cleanup();
    }
  }, 30_000);
}

describe('Public showtime discovery and seat availability (F02)', () => {
  showtimeTest('an explicit past date cannot expose an OPEN showtime that has already started', async (r) => {
    await prisma.movie.update({ where: { id: r.core.movieId }, data: { releaseDate: new Date('2019-01-01') } });
    await r.showtime('2020-01-07T10:00:00+07:00');
    const response = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, date: '2020-01-07' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  showtimeTest('hiding a movie removes its future showtimes from public discovery while preserving history', async (r) => {
    const showtime = await r.showtime();
    const hidden = await request(app).delete(`/api/v1/movies/${r.core.movieId}`).set('Authorization', `Bearer ${r.core.accounts.admin.token}`);
    expect(hidden.status).toBe(200);
    const response = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, date: '2030-01-07' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(await prisma.showtime.count({ where: { id: showtime.id } })).toBe(1);
  });

  showtimeTest('documented 2D and 3D aliases work for public filtering and showtime creation', async (r) => {
    const threeD = await r.room(r.core.cinemaId, 'THREE_D');
    const twoDShowtime = await r.showtime();
    const threeDShowtime = await r.showtime(undefined, { roomId: threeD.id, format: 'THREE_D' });
    const twoDList = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, format: '2D' });
    const threeDList = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, format: '3D' });
    const twoDCreated = await r.create({ startTime: '2030-01-08T10:00:00+07:00', format: '2D' });
    const threeDCreated = await r.create({ startTime: '2030-01-08T10:00:00+07:00', roomId: threeD.id, format: '3D' });
    expect([twoDList.status, threeDList.status, twoDCreated.status, threeDCreated.status]).toEqual([200, 200, 201, 201]);
    expect(twoDList.body.data.map((showtime: { id: string }) => showtime.id)).toEqual([twoDShowtime.id]);
    expect(threeDList.body.data.map((showtime: { id: string }) => showtime.id)).toEqual([threeDShowtime.id]);
    expect(await prisma.showtime.findUniqueOrThrow({ where: { id: twoDCreated.body.data.id } })).toMatchObject({ format: 'TWO_D' });
    expect(await prisma.showtime.findUniqueOrThrow({ where: { id: threeDCreated.body.data.id } })).toMatchObject({ format: 'THREE_D' });
  });

  showtimeTest('listing excludes past, closed and cancelled showtimes and sorts upcoming open ones', async (r) => {
    const later = await r.showtime('2030-01-07T15:00:00+07:00');
    const earlier = await r.showtime();
    await r.showtime('2020-01-07T10:00:00+07:00');
    await r.showtime('2030-01-08T10:00:00+07:00', { status: 'CLOSED' });
    await r.showtime('2030-01-09T10:00:00+07:00', { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Fixture cancellation' });
    const response = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId });
    expect(response.status).toBe(200);
    expect(response.body.data.map((showtime: { id: string }) => showtime.id)).toEqual([earlier.id, later.id]);
    expect(response.body.data[0]).toMatchObject({ movieTitle: r.core.namespace, cinemaId: r.core.cinemaId, roomId: r.core.roomId });
  });

  showtimeTest('movie, cinema and format filters apply together', async (r) => {
    const room = await r.room(r.core.cinemaId, 'THREE_D');
    const foreignRoom = await r.room(r.core.foreignCinemaId, 'THREE_D');
    const otherMovie = await r.movie();
    const wanted = await r.showtime(undefined, { roomId: room.id, format: 'THREE_D' });
    await r.showtime('2030-01-08T10:00:00+07:00', { roomId: foreignRoom.id, format: 'THREE_D' });
    await r.showtime('2030-01-09T10:00:00+07:00', { roomId: room.id, format: 'THREE_D', movieId: otherMovie.id });
    await r.showtime('2030-01-10T10:00:00+07:00');
    const response = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, cinemaId: r.core.cinemaId, format: 'THREE_D' });
    expect(response.status).toBe(200);
    expect(response.body.data.map((showtime: { id: string }) => showtime.id)).toEqual([wanted.id]);
  });

  showtimeTest('date filtering uses both boundaries of the Vietnam calendar day', async (r) => {
    await r.showtime('2030-01-06T23:59:59.999+07:00');
    const first = await r.showtime('2030-01-07T00:00:00+07:00');
    const last = await r.showtime('2030-01-07T23:59:59.999+07:00');
    await r.showtime('2030-01-08T00:00:00+07:00');
    const response = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, date: '2030-01-07' });
    expect(response.status).toBe(200);
    expect(response.body.data.map((showtime: { id: string }) => showtime.id)).toEqual([first.id, last.id]);
  });

  showtimeTest('an unmatched cinema filter returns an empty result', async (r) => {
    await r.showtime();
    const response = await request(app).get('/api/v1/showtimes').query({ movieId: r.core.movieId, cinemaId: crypto.randomUUID() });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  for (const query of [{ movieId: 'not-a-uuid' }, { date: '07/01/2030' }, { date: '2030-02-30' }, { format: 'UNKNOWN' }]) {
    showtimeTest(`invalid listing filter ${JSON.stringify(query)} is rejected`, async () => {
      const response = await request(app).get('/api/v1/showtimes').query(query);
      expect(response.status).toBe(400);
    });
  }

  showtimeTest('seat-map detail includes movie, room and cinema with independent seat surcharges', async (r) => {
    const showtime = await r.showtime();
    const response = await r.map(showtime.id);
    expect(response.status).toBe(200);
    expect(response.body.data.movie).toMatchObject({ id: r.core.movieId, durationMin: 90, ageRating: 'P' });
    expect(response.body.data.cinema.id).toBe(r.core.cinemaId);
    expect(response.body.data.room).toMatchObject({ id: r.core.roomId, columnCount: 13 });
    const seats = response.body.data.seats as SeatView[];
    expect(seats.find((seat) => seat.seatId === r.core.seats[0].id)).toMatchObject({ price: 100_000, status: 'AVAILABLE' });
    expect(seats.find((seat) => seat.seatId === r.core.seats[10].id)).toMatchObject({ price: 120_000, seatType: 'VIP' });
    expect(seats.find((seat) => seat.seatId === r.core.seats[11].id)).toMatchObject({ price: 140_000, columnSpan: 2, seatType: 'COUPLE' });
  });

  showtimeTest('expired holds are displayed available without changing live holds or sold seats', async (r) => {
    const showtime = await r.showtime();
    const expiredAt = new Date(Date.now() - 60_000);
    await prisma.showtimeSeat.update({ where: { showtimeId_seatId: { showtimeId: showtime.id, seatId: r.core.seats[0].id } }, data: { status: 'HELD', holdExpiresAt: expiredAt } });
    await prisma.showtimeSeat.update({ where: { showtimeId_seatId: { showtimeId: showtime.id, seatId: r.core.seats[1].id } }, data: { status: 'HELD', holdExpiresAt: new Date(Date.now() + 60_000) } });
    await prisma.showtimeSeat.update({ where: { showtimeId_seatId: { showtimeId: showtime.id, seatId: r.core.seats[2].id } }, data: { status: 'SOLD' } });
    const response = await r.map(showtime.id);
    expect(response.status).toBe(200);
    const seats = response.body.data.seats as SeatView[];
    expect(seats.find((seat) => seat.seatId === r.core.seats[0].id)?.status).toBe('AVAILABLE');
    expect(seats.find((seat) => seat.seatId === r.core.seats[1].id)?.status).toBe('HELD');
    expect(seats.find((seat) => seat.seatId === r.core.seats[2].id)?.status).toBe('SOLD');
    expect((await prisma.showtimeSeat.findUniqueOrThrow({ where: { showtimeId_seatId: { showtimeId: showtime.id, seatId: r.core.seats[0].id } } })).status).toBe('HELD');
  });

  showtimeTest('counter sales reclaim an expired online hold advertised as AVAILABLE by the seat map', async (r) => {
    const showtime = await r.showtime();
    const held = await r.book(showtime.id);
    expect(held.status).toBe(201);
    const expiredAt = new Date(Date.now() - 60_000);
    await prisma.order.update({ where: { id: held.body.data.id }, data: { expiresAt: expiredAt } });
    await prisma.showtimeSeat.updateMany({ where: { orderId: held.body.data.id }, data: { holdExpiresAt: expiredAt } });
    const map = await r.map(showtime.id);
    expect(map.status).toBe(200);
    expect((map.body.data.seats as SeatView[]).find((seat) => seat.seatId === r.core.seats[10].id)?.status).toBe('AVAILABLE');
    const sold = await r.book(showtime.id, true);
    expect(sold.status, JSON.stringify(sold.body)).toBe(201);
    expect(await prisma.showtimeSeat.findUniqueOrThrow({ where: { showtimeId_seatId: { showtimeId: showtime.id, seatId: r.core.seats[10].id } } })).toMatchObject({ status: 'SOLD', orderId: sold.body.data.id, holdExpiresAt: null });
    expect(await prisma.ticket.count({ where: { orderId: sold.body.data.id, status: 'VALID' } })).toBe(1);
  });

  showtimeTest('unknown seat-map IDs return a domain 404', async (r) => {
    const response = await r.map(crypto.randomUUID());
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('SHOWTIME_NOT_FOUND');
  });
});

describe('Showtime management rules and cinema scope (F11, BR06, BR10)', () => {
  showtimeTest('creation snapshots duration, default advertising and active seat layout', async (r) => {
    await prisma.seat.update({ where: { id: r.core.seats[0].id }, data: { isActive: false } });
    const response = await r.create();
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data).toMatchObject({ startTime: '2030-01-07T03:00:00.000Z', endTime: '2030-01-07T04:45:00.000Z', adMinutes: 15, cleaningMinutes: 15, language: 'SUBTITLED', status: 'OPEN' });
    const slots = await prisma.showtimeSeat.findMany({ where: { showtimeId: response.body.data.id } });
    expect(slots).toHaveLength(11);
    expect(slots.some((slot) => slot.seatId === r.core.seats[0].id)).toBe(false);
    expect(slots.find((slot) => slot.seatId === r.core.seats[11].id)).toMatchObject({ seatType: 'COUPLE', columnSpan: 2, status: 'AVAILABLE' });
  });

  showtimeTest('explicit advertising minutes change the end time and language is retained', async (r) => {
    const response = await r.create({ adMinutes: 0, language: 'DUBBED' });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ endTime: '2030-01-07T04:30:00.000Z', adMinutes: 0, language: 'DUBBED' });
  });

  for (const [field, code] of [['movieId', 'MOVIE_NOT_FOUND'], ['roomId', 'ROOM_NOT_FOUND']] as const) {
    showtimeTest(`creation rejects a nonexistent ${field}`, async (r) => {
      const response = await r.create({ [field]: crypto.randomUUID() });
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe(code);
      expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(0);
    });
  }

  for (const input of [{ startTime: 'bad-time' }, { adMinutes: -1 }, { adMinutes: 1.5 }, { cleaningMinutes: 14 }]) {
    showtimeTest(`invalid create input ${JSON.stringify(input)} cannot persist a showtime`, async (r) => {
      const response = await r.create(input);
      expect(response.status).toBe(400);
      expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(0);
    });
  }

  for (const [label, movieUpdate, roomUpdate, input] of [
    ['prohibited C movie', { ageRating: 'C' }, {}, {}],
    ['movie before its release date', { releaseDate: new Date('2030-01-08') }, {}, {}],
    ['maintenance room', {}, { status: 'MAINTENANCE' }, {}],
    ['format incompatible with the room', {}, {}, { format: 'THREE_D' }],
    ['start before cinema opening', {}, {}, { startTime: '2030-01-07T07:59:00+07:00' }],
    ['end after cinema closing', {}, {}, { startTime: '2030-01-07T22:00:00+07:00' }],
  ] as const) {
    showtimeTest(`creation rejects ${label}`, async (r) => {
      if (Object.keys(movieUpdate).length) await prisma.movie.update({ where: { id: r.core.movieId }, data: movieUpdate });
      if (Object.keys(roomUpdate).length) await prisma.room.update({ where: { id: r.core.roomId }, data: roomUpdate });
      const response = await r.create(input);
      expect(response.status).toBe(400);
      expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(0);
    });
  }

  showtimeTest('an overlap is rejected without inserting seat snapshots', async (r) => {
    await r.showtime();
    const response = await r.create({ startTime: '2030-01-07T11:00:00+07:00' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SHOWTIME_OVERLAP');
    expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(1);
    expect(await prisma.showtimeSeat.count({ where: { roomId: r.core.roomId } })).toBe(12);
  });

  for (const [startTime, want] of [
    ['2030-01-07T11:44:00+07:00', 409], ['2030-01-07T11:45:00+07:00', 201],
    ['2030-01-07T08:16:00+07:00', 409], ['2030-01-07T08:15:00+07:00', 201],
  ] as const) {
    showtimeTest(`15 minute cleaning boundary at ${startTime} yields ${want}`, async (r) => {
      await r.showtime();
      const response = await r.create({ startTime, adMinutes: 0 });
      expect(response.status, JSON.stringify(response.body)).toBe(want);
      expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(want === 201 ? 2 : 1);
    });
  }

  showtimeTest('the previous showtime retains its longer cleaning snapshot', async (r) => {
    await r.showtime(undefined, { cleaningMinutes: 30 });
    const response = await r.create({ startTime: '2030-01-07T11:45:00+07:00', adMinutes: 0, cleaningMinutes: 15 });
    expect(response.status).toBe(409);
    expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(1);
  });

  showtimeTest('cancelled showtimes do not block reuse of their room time', async (r) => {
    await r.showtime(undefined, { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Fixture cancellation' });
    const response = await r.create();
    expect(response.status).toBe(201);
    expect(await prisma.showtime.count({ where: { roomId: r.core.roomId, status: 'OPEN' } })).toBe(1);
  });

  showtimeTest('BLOCKED room seats remain blocked in the new showtime', async (r) => {
    await prisma.seat.update({ where: { id: r.core.seats[0].id }, data: { type: 'BLOCKED' } });
    const response = await r.create();
    expect(response.status).toBe(201);
    const slot = await prisma.showtimeSeat.findUniqueOrThrow({ where: { showtimeId_seatId: { showtimeId: response.body.data.id, seatId: r.core.seats[0].id } } });
    expect(slot).toMatchObject({ seatType: 'BLOCKED', status: 'BLOCKED' });
    const map = await r.map(response.body.data.id);
    expect(map.status).toBe(200);
    expect((map.body.data.seats as SeatView[]).find((seat) => seat.seatId === slot.seatId)?.status).toBe('BLOCKED');
  });

  for (const [label, account, want] of [['guest', null, 401], ['customer', 'buyer', 403], ['staff', 'staff', 403]] as const) {
    showtimeTest(`${label} cannot create showtimes`, async (r) => {
      const response = await r.create({}, account ? r.core.accounts[account].token : null);
      expect(response.status).toBe(want);
      expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(0);
    });
  }

  showtimeTest('an assigned manager can create a showtime in their cinema', async (r) => {
    const response = await r.create({}, r.managerTokens.assigned);
    expect(response.status).toBe(201);
  });

  for (const name of ['foreign', 'unassigned'] as const) {
    showtimeTest(`${name} manager cannot create showtimes in an unauthorized cinema`, async (r) => {
      const response = await r.create({}, r.managerTokens[name]);
      expect(response.status).toBe(403);
      expect(await prisma.showtime.count({ where: { roomId: r.core.roomId } })).toBe(0);
    });
  }

  showtimeTest('concurrent same-room creates commit exactly one schedule and seat map per interval', async (r) => {
    for (const date of ['2030-01-07', '2030-01-08', '2030-01-09']) {
      const startTime = `${date}T10:00:00+07:00`;
      const responses = await Promise.all([r.create({ startTime }), r.create({ startTime })]);
      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      const schedules = await prisma.showtime.findMany({ where: { roomId: r.core.roomId, startTime: new Date(startTime) }, include: { slots: true } });
      expect(schedules).toHaveLength(1);
      expect(schedules[0].slots).toHaveLength(12);
    }
  });
});

describe('Showtime pricing uses Vietnam dates and effective versions (F12, BR04)', () => {
  showtimeTest('online and counter orders snapshot the showtime format even after the room format changes', async (r) => {
    await r.pricing();
    const showtime = await r.showtime();
    await prisma.room.update({ where: { id: r.core.roomId }, data: { format: 'IMAX' } });
    const online = await r.book(showtime.id, false, [r.core.seats[0].id]);
    const counter = await r.book(showtime.id, true, [r.core.seats[1].id]);
    expect([online.status, counter.status]).toEqual([201, 201]);
    const orders = await prisma.order.findMany({ where: { id: { in: [online.body.data.id, counter.body.data.id] } }, select: { formatSnapshot: true, total: true } });
    expect(orders).toHaveLength(2);
    expect(orders).toEqual([
      { formatSnapshot: 'TWO_D', total: 80_000 }, { formatSnapshot: 'TWO_D', total: 80_000 },
    ]);
  });

  for (const [startTime, want] of [
    ['2030-01-07T11:59:00+07:00', 80_000], ['2030-01-07T12:00:00+07:00', 90_000],
    ['2030-01-07T16:59:00+07:00', 90_000], ['2030-01-07T17:00:00+07:00', 100_000],
    ['2030-01-05T01:00:00+07:00', 110_000], ['2030-01-07T01:00:00+07:00', 80_000],
  ] as const) {
    showtimeTest(`base price at ${startTime} is ${want}`, async (r) => {
      await r.pricing();
      const showtime = await r.showtime(startTime);
      const response = await r.map(showtime.id);
      expect(response.status).toBe(200);
      expect(response.body.data.showtime.basePrice).toBe(want);
    });
  }

  for (const [format, want] of [['TWO_D', 80_000], ['THREE_D', 110_000], ['IMAX', 160_000]] as const) {
    showtimeTest(`${format} resolves its own pricing matrix`, async (r) => {
      await r.pricing();
      const room = await r.room(r.core.cinemaId, format);
      const showtime = await r.showtime(undefined, { roomId: room.id, format });
      const response = await r.map(showtime.id);
      expect(response.status).toBe(200);
      expect(response.body.data.showtime.basePrice).toBe(want);
    });
  }

  showtimeTest('holiday pricing takes precedence over weekend at the Vietnam day boundary', async (r) => {
    await r.pricing();
    await r.holiday('2030-01-05');
    const showtime = await r.showtime('2030-01-05T01:00:00+07:00');
    const response = await r.map(showtime.id);
    expect(response.status).toBe(200);
    expect(response.body.data.showtime.basePrice).toBe(140_000);
  });

  showtimeTest('future rule and surcharge versions cannot alter a current seat-map price', async (r) => {
    await r.pricing();
    await r.futurePrices('WEEKDAY', 'MORNING');
    const showtime = await r.showtime();
    const response = await r.map(showtime.id);
    expect(response.status).toBe(200);
    expect(response.body.data.showtime.basePrice).toBe(80_000);
    expect((response.body.data.seats as SeatView[]).find((seat) => seat.seatType === 'VIP')?.price).toBe(100_000);
  });

  showtimeTest('an effective version on the showtime day replaces the older price', async (r) => {
    await r.pricing();
    await prisma.priceRule.create({ data: { cinemaId: r.core.cinemaId, roomFormat: 'TWO_D', dayType: 'WEEKDAY', timeSlot: 'MORNING', basePrice: 85_000, effectiveFrom: new Date('2030-01-07') } });
    const showtime = await r.showtime();
    const response = await r.map(showtime.id);
    expect(response.status).toBe(200);
    expect(response.body.data.showtime.basePrice).toBe(85_000);
  });

  for (const counter of [false, true]) {
    showtimeTest(`${counter ? 'counter' : 'online'} booking snapshots Vietnam weekend price and ignores future versions`, async (r) => {
      await r.pricing();
      await r.futurePrices('WEEKEND', 'MORNING');
      const showtime = await r.showtime('2030-01-05T01:00:00+07:00');
      const response = await r.book(showtime.id, counter);
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      const order = await prisma.order.findUniqueOrThrow({ where: { id: response.body.data.id }, include: { items: true } });
      expect(order).toMatchObject({ ticketSubtotal: 130_000, subtotal: 130_000, total: 130_000 });
      expect(order.items[0]).toMatchObject({ basePrice: 110_000, surcharge: 20_000, price: 130_000 });
      expect(await prisma.priceRule.count({ where: { cinemaId: r.core.cinemaId } })).toBe(28);
    });

    showtimeTest(`${counter ? 'counter' : 'online'} booking snapshots holiday price ahead of weekend and future versions`, async (r) => {
      await r.pricing();
      await r.holiday('2030-01-05');
      await r.futurePrices('HOLIDAY', 'MORNING');
      const showtime = await r.showtime('2030-01-05T01:00:00+07:00');
      const response = await r.book(showtime.id, counter);
      expect(response.status, JSON.stringify(response.body)).toBe(201);
      const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: response.body.data.id } });
      expect(item).toMatchObject({ basePrice: 140_000, surcharge: 20_000, price: 160_000 });
    });
  }

  showtimeTest('later pricing versions leave existing order item snapshots unchanged', async (r) => {
    const showtime = await r.showtime();
    const booked = await r.book(showtime.id);
    expect(booked.status).toBe(201);
    await prisma.priceRule.create({ data: { cinemaId: r.core.cinemaId, roomFormat: 'TWO_D', dayType: 'WEEKDAY', timeSlot: 'MORNING', basePrice: 300_000, effectiveFrom: new Date('2029-01-01') } });
    await prisma.seatSurcharge.create({ data: { cinemaId: r.core.cinemaId, seatType: 'VIP', amount: 90_000, effectiveFrom: new Date('2029-01-01') } });
    const response = await request(app).get(`/api/v1/orders/${booked.body.data.id}`).set('Authorization', `Bearer ${r.core.accounts.buyer.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(120_000);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: booked.body.data.id } });
    expect(item).toMatchObject({ basePrice: 100_000, surcharge: 20_000, price: 120_000 });
  });

  showtimeTest('missing seat-map pricing returns a domain error and creates no default rules', async (r) => {
    await prisma.priceRule.deleteMany({ where: { cinemaId: r.core.cinemaId } });
    const showtime = await r.showtime();
    const response = await r.map(showtime.id);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PRICE_NOT_CONFIGURED');
    expect(await prisma.priceRule.count({ where: { cinemaId: r.core.cinemaId } })).toBe(0);
  });

  showtimeTest('a different configured time bucket cannot substitute for the missing matching rule', async (r) => {
    await r.pricing();
    await prisma.priceRule.deleteMany({ where: { cinemaId: r.core.cinemaId, roomFormat: 'TWO_D', dayType: 'WEEKDAY', timeSlot: 'MORNING' } });
    const showtime = await r.showtime();
    const map = await r.map(showtime.id);
    const booked = await r.book(showtime.id);
    expect([map.status, booked.status]).toEqual([400, 400]);
    expect(map.body.error.code).toBe('PRICE_NOT_CONFIGURED');
    expect(booked.body.error.code).toBe('PRICE_NOT_CONFIGURED');
    expect(await prisma.priceRule.count({ where: { cinemaId: r.core.cinemaId } })).toBe(26);
    expect(await prisma.order.count({ where: { showtimeId: showtime.id } })).toBe(0);
  });

  for (const counter of [false, true]) {
    showtimeTest(`${counter ? 'counter' : 'online'} booking rejects missing pricing without holding seats or writing defaults`, async (r) => {
      await prisma.priceRule.deleteMany({ where: { cinemaId: r.core.cinemaId } });
      const showtime = await r.showtime();
      const response = await r.book(showtime.id, counter);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('PRICE_NOT_CONFIGURED');
      expect(await prisma.priceRule.count({ where: { cinemaId: r.core.cinemaId } })).toBe(0);
      expect(await prisma.order.count({ where: { showtimeId: showtime.id } })).toBe(0);
      expect(await prisma.showtimeSeat.count({ where: { showtimeId: showtime.id, status: 'AVAILABLE' } })).toBe(12);
    });
  }

  showtimeTest('missing required VIP surcharge rejects booking instead of inventing a new version', async (r) => {
    await prisma.seatSurcharge.deleteMany({ where: { cinemaId: r.core.cinemaId, seatType: 'VIP' } });
    const showtime = await r.showtime();
    const response = await r.book(showtime.id);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('PRICE_NOT_CONFIGURED');
    expect(await prisma.seatSurcharge.count({ where: { cinemaId: r.core.cinemaId, seatType: 'VIP' } })).toBe(0);
    expect(await prisma.order.count({ where: { showtimeId: showtime.id } })).toBe(0);
  });
});
