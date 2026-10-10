import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AgeRating, Role, SeatType } from '@prisma/client';
import prisma from '../../src/shared/prisma';

export const fixturePassword = 'CoreFixture123!';
const passwordHash = bcrypt.hash(fixturePassword, 10);

export type FixtureAccount = { id: string; email: string; phone: string; role: Role; token: string };
type AccountName = 'buyer' | 'other' | 'staff' | 'unassignedStaff' | 'foreignStaff' | 'admin';

/** Test-owned IDs are the only deletion selectors. No seed records are reused. */
export class CoreFixture {
  readonly namespace = `core-${crypto.randomUUID()}`;
  readonly cinemaId = crypto.randomUUID();
  readonly foreignCinemaId = crypto.randomUUID();
  readonly movieId = crypto.randomUUID();
  readonly roomId = crypto.randomUUID();
  readonly showtimeId = crypto.randomUUID();
  readonly showtimeIds: string[] = [this.showtimeId];
  readonly extraEmails: string[] = [];
  readonly callbackRefs: string[] = [];
  readonly accounts: Record<AccountName, FixtureAccount>;
  readonly seats = Array.from({ length: 12 }, (_, index) => ({
    id: crypto.randomUUID(),
    rowLabel: 'A',
    seatNumber: index + 1,
    type: index === 10 ? SeatType.VIP : index === 11 ? SeatType.COUPLE : SeatType.STANDARD,
    x: index,
    y: 0,
    columnSpan: index === 11 ? 2 : 1,
  }));

  private constructor() {
    this.accounts = Object.fromEntries([
      ['buyer', Role.CUSTOMER], ['other', Role.CUSTOMER], ['staff', Role.STAFF],
      ['unassignedStaff', Role.STAFF], ['foreignStaff', Role.STAFF], ['admin', Role.ADMIN],
    ].map(([name, role]) => {
      const id = crypto.randomUUID();
      return [name, {
        id,
        email: `${name}@${this.namespace}.example.test`.toLowerCase(),
        phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`,
        role,
        token: jwt.sign({ userId: id, role }, process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars', { expiresIn: '15m' }),
      }];
    })) as Record<AccountName, FixtureAccount>;
  }

  static async create(ageRating: AgeRating = AgeRating.T18) {
    const fixture = new CoreFixture();
    try {
      const fixtureHash = await passwordHash;
      await prisma.$transaction(async (tx) => {
        await tx.cinema.createMany({ data: [fixture.cinemaId, fixture.foreignCinemaId].map((id, index) => ({
          id, name: `${fixture.namespace}-${index}`, address: 'Isolated test address', city: 'Test city', phone: '0900000000',
          openTime: new Date('1970-01-01T01:00:00Z'), closeTime: new Date('1970-01-01T16:00:00Z'), status: 'ACTIVE',
        })) });
        await tx.user.createMany({ data: Object.entries(fixture.accounts).map(([name, account]) => ({
          id: account.id, email: account.email, phone: account.phone, role: account.role,
          fullName: `Core fixture ${name}`, passwordHash: fixtureHash, birthDate: new Date('1990-01-01T00:00:00Z'),
        })) });
        await tx.userCinema.createMany({ data: [
          { userId: fixture.accounts.staff.id, cinemaId: fixture.cinemaId },
          { userId: fixture.accounts.foreignStaff.id, cinemaId: fixture.foreignCinemaId },
        ] });
        await tx.movie.create({ data: {
          id: fixture.movieId, title: fixture.namespace, posterUrl: 'https://example.test/poster.jpg',
          description: 'Isolated integration fixture', durationMin: 90, ageRating,
          releaseDate: new Date('2026-01-01T00:00:00Z'), status: 'NOW_SHOWING',
        } });
        await tx.room.create({ data: {
          id: fixture.roomId, cinemaId: fixture.cinemaId, name: fixture.namespace,
          format: 'TWO_D', rowCount: 1, columnCount: 13,
        } });
        await tx.seat.createMany({ data: fixture.seats.map((seat) => ({ ...seat, roomId: fixture.roomId })) });
        // Equal prices across day/time buckets keep the expected totals independent of the clock.
        await tx.priceRule.createMany({ data: (['WEEKDAY', 'WEEKEND', 'HOLIDAY'] as const).flatMap((dayType) =>
          (['MORNING', 'AFTERNOON', 'EVENING'] as const).map((timeSlot) => ({
            cinemaId: fixture.cinemaId, roomFormat: 'TWO_D' as const, dayType, timeSlot,
            basePrice: 100_000, effectiveFrom: new Date('2020-01-01T00:00:00Z'),
          }))) });
        await tx.seatSurcharge.createMany({ data: [
          { seatType: SeatType.STANDARD, amount: 0 }, { seatType: SeatType.VIP, amount: 20_000 }, { seatType: SeatType.COUPLE, amount: 40_000 },
        ].map((item) => ({ ...item, cinemaId: fixture.cinemaId, effectiveFrom: new Date('2020-01-01T00:00:00Z') })) });
      }, { timeout: 15_000 });
      await fixture.addShowtime(new Date(Date.now() + 24 * 60 * 60 * 1000), fixture.showtimeId);
      return fixture;
    } catch (error) {
      await fixture.cleanup();
      throw error;
    }
  }

  async addShowtime(startTime = new Date(Date.now() + 48 * 60 * 60 * 1000), id = crypto.randomUUID()) {
    if (!this.showtimeIds.includes(id)) this.showtimeIds.push(id);
    await prisma.showtime.create({ data: {
      id, movieId: this.movieId, roomId: this.roomId, startTime,
      endTime: new Date(startTime.getTime() + 90 * 60 * 1000), format: 'TWO_D', language: 'SUBTITLED', status: 'OPEN',
    } });
    await prisma.showtimeSeat.createMany({ data: this.seats.map((seat) => ({
      id: crypto.randomUUID(), showtimeId: id, roomId: this.roomId, seatId: seat.id,
      rowLabel: seat.rowLabel, seatNumber: seat.seatNumber, seatType: seat.type,
      x: seat.x, y: seat.y, columnSpan: seat.columnSpan, status: 'AVAILABLE',
    })) });
    return id;
  }

  registration(name = 'registered') {
    const email = `${name}@${this.namespace}.example.test`;
    this.extraEmails.push(email);
    return { email, phone: `09${String(crypto.randomInt(0, 100_000_000)).padStart(8, '0')}`, fullName: 'Core registered customer', password: fixturePassword };
  }

  async voucher() {
    return prisma.voucher.create({ data: {
      cinemaId: this.cinemaId, code: this.namespace.toUpperCase(), name: this.namespace,
      type: 'FIXED', value: 10_000, scope: 'ORDER', totalLimit: 10, perUserLimit: 10,
      validFrom: new Date(Date.now() - 60_000), validTo: new Date(Date.now() + 86_400_000),
    } });
  }

  signCallback(txnRef: string, amount: number, overrides: Record<string, string> = {}) {
    this.callbackRefs.push(txnRef);
    const params: Record<string, string> = {
      vnp_TxnRef: txnRef, vnp_Amount: String(amount * 100), vnp_ResponseCode: '00', vnp_TransactionStatus: '00',
      vnp_TransactionNo: crypto.randomUUID(), vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'CINEXSANDBOX',
      vnp_CurrCode: 'VND', vnp_PayDate: '20261003120500', ...overrides,
    };
    // Independent provider-format signer; it deliberately does not call the production adapter.
    const canonical = Object.keys(params).sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`).join('&');
    params.vnp_SecureHash = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET || 'CINEX_SUPER_SECRET_VNPAY_HASH_KEY_2026')
      .update(canonical).digest('hex');
    return params;
  }

  async cleanup() {
    const userIds = Object.values(this.accounts).map((account) => account.id);
    const extraUsers = await prisma.user.findMany({ where: { email: { in: this.extraEmails } }, select: { id: true } });
    userIds.push(...extraUsers.map((user) => user.id));
    const orders = await prisma.order.findMany({ where: { showtimeId: { in: this.showtimeIds } }, select: { id: true } });
    const orderIds = orders.map((order) => order.id);
    const payments = await prisma.payment.findMany({ where: { orderId: { in: orderIds } }, select: { id: true, txnRef: true } });
    const paymentIds = payments.map((payment) => payment.id);
    const refs = [...this.callbackRefs, ...payments.map((payment) => payment.txnRef)];
    await prisma.$transaction(async (tx) => {
      await tx.paymentLog.deleteMany({ where: { OR: [{ paymentId: { in: paymentIds } }, { txnRef: { in: refs } }] } });
      const refunds = await tx.refundRequest.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } });
      const refundIds = refunds.map((r) => r.id);
      await tx.refundRequest.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.outboxEvent.deleteMany({ where: { aggregateId: { in: [...orderIds, ...refundIds] } } });
      await tx.loyaltyTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.pendingOrderGuard.deleteMany({ where: { showtimeId: { in: this.showtimeIds } } });
      await tx.voucherRedemption.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderCombo.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.showtimeSeat.updateMany({ where: { showtimeId: { in: this.showtimeIds } }, data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null } });
      await tx.order.updateMany({ where: { id: { in: orderIds } }, data: { settledPaymentId: null } });
      await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      await tx.showtimeSeat.deleteMany({ where: { showtimeId: { in: this.showtimeIds } } });
      await tx.showtime.deleteMany({ where: { id: { in: this.showtimeIds } } });
      await tx.seat.deleteMany({ where: { roomId: this.roomId } });
      await tx.room.deleteMany({ where: { id: this.roomId } });
      await tx.priceRule.deleteMany({ where: { cinemaId: this.cinemaId } });
      await tx.seatSurcharge.deleteMany({ where: { cinemaId: this.cinemaId } });
      await tx.voucher.deleteMany({ where: { cinemaId: this.cinemaId } });
      await tx.movie.deleteMany({ where: { id: this.movieId } });
      await tx.idempotencyKey.deleteMany({ where: { actorId: { in: userIds } } });
      await tx.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.cinema.deleteMany({ where: { id: { in: [this.cinemaId, this.foreignCinemaId] } } });
    }, { timeout: 20_000 });
  }
}

export function requireDedicatedTestDatabase() {
  const database = decodeURIComponent(new URL(process.env.DATABASE_URL || '').pathname).slice(1);
  if (!database.endsWith('_test')) throw new Error('Global worker integration tests require a dedicated database whose name ends with _test. Run the backend npm test runner.');
}
