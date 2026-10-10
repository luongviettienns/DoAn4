import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/shared/prisma';
import { ReportFixture } from './helpers/report-fixture';

const app = createApp();
const reportRoot = '/api/v1/admin/reports';
const mainDates = { fromDate: '2090-05-01', toDate: '2090-05-03' };
const routes = ['/overview', '/', '/top-movies'];
let fixture: ReportFixture;

beforeAll(async () => { fixture = await ReportFixture.create(); });
afterAll(async () => { if (fixture) await fixture.cleanup(); });

const overview = (account: keyof ReportFixture['accounts'], query: Record<string, string | undefined> = {}) =>
  request(app).get(`${reportRoot}/overview`).set('Authorization', `Bearer ${fixture.accounts[account].token}`).query({ ...mainDates, ...query });
const breakdown = (account: keyof ReportFixture['accounts'], type: string, query: Record<string, string | undefined> = {}) =>
  request(app).get(reportRoot).set('Authorization', `Bearer ${fixture.accounts[account].token}`).query({ ...mainDates, type, ...query });

describe('Report access uses current role and cinema assignments', () => {
  it.each(routes)('requires authentication on %s', async (route) => {
    const response = await request(app).get(`${reportRoot}${route}`).query(mainDates);
    expect(response.status).toBe(401);
  });
  it.each(routes)('denies CUSTOMER on %s', async (route) => {
    const response = await request(app).get(`${reportRoot}${route}`).set('Authorization', `Bearer ${fixture.accounts.customer.token}`).query(mainDates);
    expect(response.status).toBe(403);
  });
  // F14 is MANAGER/ADMIN, even a STAFF assignment does not grant reporting permission.
  it.each(routes)('denies assigned STAFF on %s', async (route) => {
    const response = await request(app).get(`${reportRoot}${route}`).set('Authorization', `Bearer ${fixture.accounts.staff.token}`).query(mainDates);
    expect(response.status).toBe(403);
  });
  it.each(routes)('denies a MANAGER without any cinema assignment on %s', async (route) => {
    const response = await request(app).get(`${reportRoot}${route}`).set('Authorization', `Bearer ${fixture.accounts.unassignedManager.token}`).query(mainDates);
    expect(response.status).toBe(403);
  });
  it('returns only a single manager assignment when no cinema filter is sent', async () => {
    const response = await overview('managerA');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 300_000, orderCount: 2, ticketCount: 2, comboRevenue: 20_000 });
  });
  it('combines every assigned cinema for a manager without expanding to the whole system', async () => {
    const response = await overview('managerAB');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 650_000, orderCount: 3, ticketCount: 4, comboRevenue: 170_000 });
  });
  it('allows a manager to narrow to one of their assigned cinemas', async () => {
    const response = await overview('managerAB', { cinemaId: fixture.sites.b.cinemaId });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 350_000, orderCount: 1, ticketCount: 2, comboRevenue: 150_000 });
  });
  it('rejects a manager overview filter outside their assignment', async () => {
    const response = await overview('managerA', { cinemaId: fixture.sites.c.cinemaId });
    expect(response.status).toBe(403);
  });
  it('rejects a manager breakdown filter outside their assignment', async () => {
    const response = await breakdown('managerA', 'MOVIE', { cinemaId: fixture.sites.c.cinemaId });
    expect(response.status).toBe(403);
  });
  it('restricts a foreign manager to their own cinema without a query filter', async () => {
    const response = await overview('foreignManager');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 500_000, orderCount: 1, ticketCount: 5 });
  });
  it('rechecks assignments for an already-issued access token', async () => {
    await prisma.userCinema.deleteMany({ where: { userId: fixture.accounts.managerAB.id, cinemaId: fixture.sites.b.cinemaId } });
    try {
      const response = await overview('managerAB', { cinemaId: fixture.sites.b.cinemaId });
      expect(response.status).toBe(403);
    } finally {
      await prisma.userCinema.create({ data: { userId: fixture.accounts.managerAB.id, cinemaId: fixture.sites.b.cinemaId } });
    }
  });
  it('restricts comparative CINEMA breakdown to ADMIN even when a manager has multiple cinemas', async () => {
    const response = await breakdown('managerAB', 'CINEMA');
    expect(response.status).toBe(403);
  });
  it('scopes top movies to manager cinemas', async () => {
    const response = await request(app).get(`${reportRoot}/top-movies`).set('Authorization', `Bearer ${fixture.accounts.managerA.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([{ movieTitle: `${fixture.namespace}-movie-0`, revenue: 300_000, ticketsSold: 2, orderCount: 2 }]);
  });
});

describe('Report monetary totals and grouping reconcile literal persisted fixtures', () => {
  it('counts only PAID sales across the system, excluding cancelled, pending, failed, expired and unfulfilled orders', async () => {
    const response = await overview('admin');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 1_150_000, orderCount: 4, ticketCount: 9, comboRevenue: 170_000 });
  });
  it('keeps successful charges separate from valid sales, including a duplicate charge and unfulfilled order', async () => {
    const response = await overview('admin');
    expect(response.status).toBe(200);
    expect(response.body.data.grossRevenue).toBe(1_470_000);
  });
  it('reports only the actual refunded amount after the cancellation fee, excluding pending refunds', async () => {
    const response = await overview('admin');
    expect(response.status).toBe(200);
    expect(response.body.data.refundAmount).toBe(80_000);
  });
  it('allows ADMIN to filter any cinema independently of assignments', async () => {
    const response = await overview('admin', { cinemaId: fixture.sites.c.cinemaId });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 500_000, orderCount: 1, ticketCount: 5, comboRevenue: 0, grossRevenue: 500_000, refundAmount: 0 });
  });
  it('filters overview by movie before aggregating', async () => {
    const response = await overview('admin', { movieId: fixture.movieX });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 650_000, orderCount: 3, ticketCount: 4, comboRevenue: 170_000 });
  });
  it('filters breakdown by movie before grouping cinemas', async () => {
    const response = await breakdown('admin', 'CINEMA', { movieId: fixture.movieY });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ key: fixture.sites.c.cinemaId, revenue: 500_000, orderCount: 1, ticketCount: 5 });
  });
  it('groups cinema sales without multiplying an order by its payment attempts', async () => {
    const response = await breakdown('admin', 'CINEMA');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: fixture.sites.a.cinemaId, label: fixture.sites.a.name, revenue: 300_000, orderCount: 2, ticketCount: 2, comboRevenue: 20_000 }),
      expect.objectContaining({ key: fixture.sites.b.cinemaId, label: fixture.sites.b.name, revenue: 350_000, orderCount: 1, ticketCount: 2, comboRevenue: 150_000 }),
      expect.objectContaining({ key: fixture.sites.c.cinemaId, label: fixture.sites.c.name, revenue: 500_000, orderCount: 1, ticketCount: 5, comboRevenue: 0 }),
    ]));
  });
  it('groups a shared movie across cinemas while keeping another movie separate', async () => {
    const response = await breakdown('admin', 'MOVIE');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: fixture.movieX, revenue: 650_000, orderCount: 3, ticketCount: 4, comboRevenue: 170_000 }),
      expect.objectContaining({ key: fixture.movieY, revenue: 500_000, orderCount: 1, ticketCount: 5, comboRevenue: 0 }),
    ]));
  });
  it('returns zero overview values when a valid filter has no matching rows', async () => {
    const response = await overview('admin', { fromDate: '2088-01-01', toDate: '2088-01-02' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ revenue: 0, grossRevenue: 0, refundAmount: 0, orderCount: 0, ticketCount: 0, comboRevenue: 0, occupancyPercent: 0 });
  });
  it('returns an empty breakdown for a valid empty date window', async () => {
    const response = await breakdown('admin', 'MOVIE', { fromDate: '2088-01-01', toDate: '2088-01-02' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});

describe('Report date and occupancy boundaries follow the Vietnamese calendar and slot snapshots', () => {
  it('includes both ends of a Vietnamese calendar day and excludes the adjacent UTC millisecond', async () => {
    const response = await overview('admin', { cinemaId: fixture.sites.boundary.cinemaId, fromDate: '2091-01-01', toDate: '2091-01-01' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 55_000, grossRevenue: 55_000, orderCount: 2, ticketCount: 2 });
  });
  it('groups daily revenue by paidAt converted to UTC+7 rather than UTC day or showtime day', async () => {
    const response = await breakdown('admin', 'DAILY');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: '2090-05-02', label: '2090-05-02', revenue: 800_000, orderCount: 3, ticketCount: 7, comboRevenue: 20_000 }),
      expect.objectContaining({ key: '2090-05-03', label: '2090-05-03', revenue: 350_000, orderCount: 1, ticketCount: 2, comboRevenue: 150_000 }),
    ]));
  });
  it('counts a sold COUPLE as two people and excludes BLOCKED capacity while held/cancelled slots remain unsold', async () => {
    const response = await overview('admin', { cinemaId: fixture.sites.a.cinemaId });
    expect(response.status).toBe(200);
    expect(response.body.data.occupancyPercent).toBe(60);
  });
  it('computes system occupancy from real snapshot capacity instead of averaging cinema percentages', async () => {
    const response = await overview('admin');
    expect(response.status).toBe(200);
    // A = 3/5, B = 2/4, C = 5/6: ten sold people out of fifteen capacity units.
    expect(response.body.data.occupancyPercent).toBe(66.7);
  });
  it('reports real cinema capacity and sold capacity instead of fixed 75 percent', async () => {
    const response = await breakdown('admin', 'CINEMA', { cinemaId: fixture.sites.a.cinemaId });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ capacityUnits: 5, soldCapacityUnits: 3, occupancyPercent: 60 });
  });
  it('sums capacity across showtimes of a shared movie', async () => {
    const response = await breakdown('admin', 'MOVIE', { movieId: fixture.movieX });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ key: fixture.movieX, capacityUnits: 9, soldCapacityUnits: 5, occupancyPercent: 55.6 });
  });
});

describe('Report query validation rejects malformed or unbounded filters', () => {
  it.each([
    { fromDate: 'not-a-date' }, { toDate: '2090-02-30' },
    { fromDate: '2090-05-04', toDate: '2090-05-01' },
    { fromDate: '2088-01-01', toDate: '2090-01-01' },
    { cinemaId: 'not-a-uuid' }, { movieId: 'not-a-uuid' },
  ])('rejects invalid overview filter %j', async (query) => {
    const response = await overview('admin', query);
    expect(response.status).toBe(400);
  });
  it('rejects an unknown breakdown type', async () => {
    const response = await breakdown('admin', 'ARBITRARY');
    expect(response.status).toBe(400);
  });
  it('validates breakdown dates before database access', async () => {
    const response = await breakdown('admin', 'MOVIE', { fromDate: 'not-a-date' });
    expect(response.status).toBe(400);
  });
  it.each(['0', '-1', '101', 'abc', '1.5'])('rejects invalid top-movie limit %s', async (limit) => {
    const response = await request(app).get(`${reportRoot}/top-movies`).set('Authorization', `Bearer ${fixture.accounts.admin.token}`).query({ limit });
    expect(response.status).toBe(400);
  });
});

describe('Report combo revenue uses net allocation and capacity includes previously paid performances', () => {
  it.each([
    { scope: 'ORDER' as const, comboRevenue: 40_000 },
    { scope: 'COMBOS' as const, comboRevenue: 20_000 },
  ])('overview allocates a 30,000 discount scoped to $scope', async ({ scope, comboRevenue }) => {
    const scenario = await fixture.reportScenario({
      paidAt: '2110-01-02T10:00:00Z', startTime: '2110-01-02T12:00:00Z', comboSubtotal: 50_000, discount: 30_000, scope,
    });
    const response = await overview('admin', { cinemaId: scenario.cinemaId, fromDate: '2110-01-02', toDate: '2110-01-02' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ revenue: 120_000, comboRevenue, orderCount: 1, ticketCount: 1 });
  });
  it.each([
    { scope: 'ORDER' as const, comboRevenue: 40_000 },
    { scope: 'COMBOS' as const, comboRevenue: 20_000 },
  ])('breakdown allocates a 30,000 discount scoped to $scope', async ({ scope, comboRevenue }) => {
    const scenario = await fixture.reportScenario({
      paidAt: '2110-01-02T10:00:00Z', startTime: '2110-01-02T12:00:00Z', comboSubtotal: 50_000, discount: 30_000, scope,
    });
    const response = await breakdown('admin', 'MOVIE', { cinemaId: scenario.cinemaId, fromDate: '2110-01-02', toDate: '2110-01-02' });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ key: scenario.movieId, revenue: 120_000, comboRevenue, orderCount: 1, ticketCount: 1 });
  });
  it('retains performance capacity when its paid order falls before the reporting payment window', async () => {
    const scenario = await fixture.reportScenario({ paidAt: '2110-01-01T10:00:00Z', startTime: '2110-01-02T12:00:00Z' });
    const response = await breakdown('admin', 'MOVIE', { cinemaId: scenario.cinemaId, fromDate: '2110-01-02', toDate: '2110-01-02' });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      key: scenario.movieId, revenue: 0, comboRevenue: 0, orderCount: 0, ticketCount: 0,
      capacityUnits: 2, soldCapacityUnits: 1, occupancyPercent: 50,
    });
  });
});
