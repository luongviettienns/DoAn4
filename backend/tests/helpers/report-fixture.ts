import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, type OrderStatus, type SeatType, type VoucherScope } from '@prisma/client';
import prisma from '../../src/shared/prisma';

type AccountName = 'admin' | 'customer' | 'staff' | 'managerA' | 'managerAB' | 'foreignManager' | 'unassignedManager';
type SiteName = 'a' | 'b' | 'c' | 'boundary';
type Account = { id: string; token: string; role: Role };
type Site = { cinemaId: string; name: string; roomId: string; showtimeId: string; movieId: string; seatIds: string[]; slotIds: string[]; types: SeatType[] };

/** Reports read these real rows. Every cleanup selector is a fixture-owned UUID. */
export class ReportFixture {
  readonly namespace = `report-${crypto.randomUUID()}`;
  readonly movieX = crypto.randomUUID();
  readonly movieY = crypto.randomUUID();
  readonly movieBoundary = crypto.randomUUID();
  readonly accounts: Record<AccountName, Account>;
  readonly sites: Record<SiteName, Site>;
  readonly orderIds: string[] = [];
  readonly comboId = crypto.randomUUID();
  private readonly additionalCinemaIds: string[] = [];
  private readonly additionalRoomIds: string[] = [];
  private readonly additionalShowtimeIds: string[] = [];
  private readonly additionalVoucherIds: string[] = [];
  private orderNumber = 0;
  private ruleNumber = 0;
  private readonly priceRules = new Map<string, string>();
  private readonly surcharges = new Map<string, string>();

  private constructor() {
    this.accounts = Object.fromEntries([
      ['admin', Role.ADMIN], ['customer', Role.CUSTOMER], ['staff', Role.STAFF],
      ['managerA', Role.MANAGER], ['managerAB', Role.MANAGER],
      ['foreignManager', Role.MANAGER], ['unassignedManager', Role.MANAGER],
    ].map(([name, role]) => {
      const id = crypto.randomUUID();
      return [name, { id, role, token: jwt.sign({ userId: id, role },
        process.env.JWT_ACCESS_SECRET || 'cinex_super_secret_jwt_access_key_2026_dev_32chars', { expiresIn: '15m' }) }];
    })) as Record<AccountName, Account>;
    this.sites = Object.fromEntries((['a', 'b', 'c', 'boundary'] as const).map((name) => {
      const types: SeatType[] = name === 'a'
        ? ['STANDARD', 'COUPLE', 'STANDARD', 'STANDARD', 'BLOCKED']
        : Array.from({ length: name === 'c' ? 6 : 4 }, () => 'STANDARD');
      return [name, {
        cinemaId: crypto.randomUUID(), name: `${this.namespace}-${name}`, roomId: crypto.randomUUID(),
        showtimeId: crypto.randomUUID(), movieId: name === 'c' ? this.movieY : name === 'boundary' ? this.movieBoundary : this.movieX,
        types, seatIds: types.map(() => crypto.randomUUID()), slotIds: types.map(() => crypto.randomUUID()),
      }];
    })) as Record<SiteName, Site>;
  }

  static async create() {
    const fixture = new ReportFixture();
    const database = decodeURIComponent(new URL(process.env.DATABASE_URL || '').pathname).slice(1);
    if (!database.endsWith('_test')) throw new Error('Report integration tests require the dedicated *_test database.');
    try {
      const passwordHash = await bcrypt.hash('ReportFixture123!', 10);
      await prisma.$transaction(async (tx) => {
        await tx.cinema.createMany({ data: Object.values(fixture.sites).map((site) => ({
          id: site.cinemaId, name: site.name, address: 'Report fixture address', city: 'Report fixture city', phone: '0900000000',
          openTime: new Date('1970-01-01T01:00:00Z'), closeTime: new Date('1970-01-01T16:00:00Z'),
        })) });
        await tx.user.createMany({ data: Object.entries(fixture.accounts).map(([name, account]) => ({
          id: account.id, email: `${name.toLowerCase()}@${fixture.namespace}.example.test`,
          phone: `09${String(crypto.randomInt(100_000_000)).padStart(8, '0')}`,
          fullName: `Report fixture ${name}`, role: account.role, passwordHash,
        })) });
        await tx.userCinema.createMany({ data: [
          { userId: fixture.accounts.staff.id, cinemaId: fixture.sites.a.cinemaId },
          { userId: fixture.accounts.managerA.id, cinemaId: fixture.sites.a.cinemaId },
          { userId: fixture.accounts.managerAB.id, cinemaId: fixture.sites.a.cinemaId },
          { userId: fixture.accounts.managerAB.id, cinemaId: fixture.sites.b.cinemaId },
          { userId: fixture.accounts.foreignManager.id, cinemaId: fixture.sites.c.cinemaId },
        ] });
        await tx.movie.createMany({ data: [fixture.movieX, fixture.movieY, fixture.movieBoundary].map((id, index) => ({
          id, title: `${fixture.namespace}-movie-${index}`, posterUrl: 'https://example.test/report.jpg',
          description: 'Test-only report fixture', durationMin: 90, ageRating: 'P', status: 'NOW_SHOWING',
          releaseDate: new Date('2089-01-01T00:00:00Z'),
        })) });
        await tx.combo.create({ data: { id: fixture.comboId, name: fixture.namespace, price: 20_000 } });
        for (const [name, site] of Object.entries(fixture.sites)) {
          const startTime = new Date(name === 'boundary' ? '2091-01-01T12:00:00Z' : name === 'b' ? '2090-05-02T18:00:00Z' : '2090-05-02T12:00:00Z');
          await tx.room.create({ data: { id: site.roomId, cinemaId: site.cinemaId, name: site.name, format: 'TWO_D', rowCount: 1, columnCount: 8 } });
          await tx.seat.createMany({ data: site.types.map((type, index) => ({
            id: site.seatIds[index], roomId: site.roomId, rowLabel: 'A', seatNumber: index + 1,
            type, x: index === 0 ? 0 : index + (site.types[1] === 'COUPLE' && index > 1 ? 1 : 0), y: 0,
            columnSpan: type === 'COUPLE' ? 2 : 1,
          })) });
          await tx.showtime.create({ data: {
            id: site.showtimeId, roomId: site.roomId, movieId: site.movieId,
            startTime, endTime: new Date(startTime.getTime() + 90 * 60_000), format: 'TWO_D', language: 'SUBTITLED',
          } });
          await tx.showtimeSeat.createMany({ data: site.types.map((type, index) => ({
            id: site.slotIds[index], roomId: site.roomId, showtimeId: site.showtimeId, seatId: site.seatIds[index],
            rowLabel: 'A', seatNumber: index + 1, seatType: type,
            x: index === 0 ? 0 : index + (site.types[1] === 'COUPLE' && index > 1 ? 1 : 0), y: 0,
            columnSpan: type === 'COUPLE' ? 2 : 1, status: type === 'BLOCKED' ? 'BLOCKED' : 'AVAILABLE',
          })) });
        }
      }, { timeout: 20_000 });
      const a1 = await fixture.order('a', 'PAID', [0], 100_000, 20_000, '2090-05-01T18:00:00Z');
      await fixture.order('a', 'PAID', [1], 180_000, 0, '2090-05-02T13:00:00Z');
      await fixture.order('b', 'PAID', [0, 1], 100_000, 150_000, '2090-05-02T18:00:00Z');
      await fixture.order('c', 'PAID', [0, 1, 2, 3, 4], 100_000, 0, '2090-05-02T15:00:00Z');
      const cancelled = await fixture.order('a', 'CANCELLED', [2], 100_000, 0, '2090-05-02T14:00:00Z');
      await prisma.order.update({ where: { id: cancelled.id }, data: { refundStatus: 'REFUNDED' } });
      await prisma.refundRequest.create({ data: {
        orderId: cancelled.id, paymentId: cancelled.paymentId!, amount: 80_000, cancellationFee: 20_000,
        reason: 'ORDER_CANCELLED', status: 'REFUNDED', method: 'PROVIDER_MANUAL',
        processedAt: new Date('2090-05-02T14:30:00Z'), externalReference: `${fixture.namespace}-refund`,
        policySnapshot: { cancellationFee: 20_000 },
      } });
      const unfulfilled = await fixture.order('a', 'PAID_UNFULFILLED', [2], 100_000, 0, '2090-05-02T15:00:00Z');
      await prisma.order.update({ where: { id: unfulfilled.id }, data: { refundStatus: 'PENDING' } });
      await prisma.refundRequest.create({ data: {
        orderId: unfulfilled.id, paymentId: unfulfilled.paymentId!, amount: 100_000,
        reason: 'PAID_UNFULFILLED', policySnapshot: { fullRefund: true },
      } });
      const duplicate = await prisma.payment.create({ data: {
        orderId: a1.id, attemptNo: 2, provider: 'VNPAY', method: 'VNPAY', amount: 120_000,
        status: 'SUCCESS', txnRef: `${fixture.namespace}-duplicate`, paidAt: new Date('2090-05-02T15:00:00Z'),
        requestExpiresAt: new Date('2090-05-03T00:00:00Z'),
      } });
      await prisma.refundRequest.create({ data: {
        orderId: a1.id, paymentId: duplicate.id, amount: 120_000,
        reason: 'DUPLICATE_PAYMENT', policySnapshot: { fullRefund: true },
      } });
      await fixture.order('a', 'PENDING_PAYMENT', [3], 100_000, 0);
      await fixture.order('a', 'EXPIRED', [2], 100_000, 0);
      await fixture.order('a', 'FAILED', [2], 100_000, 0);
      // Four unequal literals make a wrong UTC/inclusive boundary observable in revenue and counts.
      await fixture.order('boundary', 'PAID', [0], 11_000, 0, '2090-12-31T16:59:59.999Z');
      await fixture.order('boundary', 'PAID', [1], 22_000, 0, '2090-12-31T17:00:00.000Z');
      await fixture.order('boundary', 'PAID', [2], 33_000, 0, '2091-01-01T16:59:59.999Z');
      await fixture.order('boundary', 'PAID', [3], 44_000, 0, '2091-01-01T17:00:00.000Z');
      return fixture;
    } catch (error) {
      await fixture.cleanup();
      throw error;
    }
  }

  private async order(siteName: SiteName, status: OrderStatus, indices: number[], unitPrice: number, comboSubtotal: number, paidAt?: string) {
    const site = this.sites[siteName];
    const id = crypto.randomUUID();
    this.orderIds.push(id);
    this.orderNumber += 1;
    const startTime = new Date(siteName === 'boundary' ? '2091-01-01T12:00:00Z' : siteName === 'b' ? '2090-05-02T18:00:00Z' : '2090-05-02T12:00:00Z');
    const ticketSubtotal = unitPrice * indices.length;
    const movieIndex = siteName === 'c' ? 1 : siteName === 'boundary' ? 2 : 0;
    const priceKey = `${site.cinemaId}:${unitPrice}`;
    if (!this.priceRules.has(priceKey)) {
      this.ruleNumber += 1;
      const rule = await prisma.priceRule.create({ data: {
        cinemaId: site.cinemaId, roomFormat: 'TWO_D', dayType: 'WEEKDAY', timeSlot: 'AFTERNOON', basePrice: unitPrice,
        effectiveFrom: new Date(Date.UTC(2089, 0, this.ruleNumber)),
      } });
      this.priceRules.set(priceKey, rule.id);
    }
    await prisma.order.create({ data: {
      id, code: `RF${crypto.randomBytes(6).toString('hex')}`, userId: this.accounts.customer.id,
      createdBy: this.accounts.customer.id, showtimeId: site.showtimeId, status,
      movieTitleSnapshot: `${this.namespace}-movie-${movieIndex}`, cinemaNameSnapshot: site.name,
      cinemaAddressSnapshot: 'Report fixture address', roomNameSnapshot: site.name,
      showtimeStartSnapshot: startTime, formatSnapshot: 'TWO_D', languageSnapshot: 'SUBTITLED', ageRatingSnapshot: 'P',
      ticketSubtotal, comboSubtotal, subtotal: ticketSubtotal + comboSubtotal, total: ticketSubtotal + comboSubtotal,
      paidAt: paidAt ? new Date(paidAt) : null, expiresAt: new Date('2091-01-02T00:00:00Z'),
      cancelledAt: status === 'CANCELLED' ? new Date('2090-05-02T14:00:00Z') : null,
    } });
    for (const index of indices) {
      const type = site.types[index];
      const surchargeKey = `${site.cinemaId}:${type}`;
      if (!this.surcharges.has(surchargeKey)) {
        const surcharge = await prisma.seatSurcharge.create({ data: {
          cinemaId: site.cinemaId, seatType: type, amount: 0, effectiveFrom: new Date('2089-01-01T00:00:00Z'),
        } });
        this.surcharges.set(surchargeKey, surcharge.id);
      }
      await prisma.orderItem.create({ data: {
        orderId: id, showtimeId: site.showtimeId, showtimeSeatId: site.slotIds[index], seatId: site.seatIds[index],
        rowLabel: 'A', seatNumber: index + 1, seatType: type,
        x: index === 0 ? 0 : index + (site.types[1] === 'COUPLE' && index > 1 ? 1 : 0), y: 0,
        columnSpan: type === 'COUPLE' ? 2 : 1, basePrice: unitPrice, surcharge: 0, price: unitPrice,
        priceRuleId: this.priceRules.get(priceKey)!, surchargeId: this.surcharges.get(surchargeKey)!,
      } });
      if (status === 'PAID' || status === 'PENDING_PAYMENT') {
        await prisma.showtimeSeat.update({ where: { id: site.slotIds[index] }, data: {
          status: status === 'PAID' ? 'SOLD' : 'HELD', orderId: id,
          holdExpiresAt: status === 'PENDING_PAYMENT' ? new Date('2091-01-02T00:00:00Z') : null,
        } });
      }
    }
    if (comboSubtotal) await prisma.orderCombo.create({ data: {
      orderId: id, comboId: this.comboId, nameSnapshot: this.namespace, quantity: 1,
      unitPrice: comboSubtotal, lineTotal: comboSubtotal,
    } });
    let paymentId: string | undefined;
    if (paidAt) {
      const payment = await prisma.payment.create({ data: {
        orderId: id, attemptNo: 1, provider: 'VNPAY', method: 'VNPAY', amount: ticketSubtotal + comboSubtotal,
        status: 'SUCCESS', txnRef: `${this.namespace}-${this.orderNumber}`, paidAt: new Date(paidAt),
        requestExpiresAt: new Date('2091-01-02T00:00:00Z'),
      } });
      paymentId = payment.id;
      if (status === 'PAID' || status === 'CANCELLED') {
        await prisma.order.update({ where: { id }, data: { settledPaymentId: paymentId } });
      }
    }
    return { id, paymentId };
  }

  /** An independent cinema isolates discount/capacity scenarios from the shared literal totals. */
  async reportScenario(input: { paidAt: string; startTime: string; comboSubtotal?: number; discount?: number; scope?: VoucherScope }) {
    const cinemaId = crypto.randomUUID();
    const roomId = crypto.randomUUID();
    const showtimeId = crypto.randomUUID();
    const orderId = crypto.randomUUID();
    const voucherId = input.scope ? crypto.randomUUID() : undefined;
    const seatIds = [crypto.randomUUID(), crypto.randomUUID()];
    const slotIds = [crypto.randomUUID(), crypto.randomUUID()];
    const ticketSubtotal = 100_000;
    const comboSubtotal = input.comboSubtotal ?? 0;
    const discount = input.discount ?? 0;
    const paidAt = new Date(input.paidAt);
    const startTime = new Date(input.startTime);
    this.additionalCinemaIds.push(cinemaId);
    this.additionalRoomIds.push(roomId);
    this.additionalShowtimeIds.push(showtimeId);
    this.orderIds.push(orderId);
    if (voucherId) this.additionalVoucherIds.push(voucherId);
    await prisma.$transaction(async (tx) => {
      await tx.cinema.create({ data: {
        id: cinemaId, name: `${this.namespace}-${cinemaId}`, address: 'Report scenario', city: 'Report scenario', phone: '0900000000',
        openTime: new Date('1970-01-01T08:00:00Z'), closeTime: new Date('1970-01-01T23:00:00Z'),
      } });
      await tx.room.create({ data: { id: roomId, cinemaId, name: this.namespace, format: 'TWO_D', rowCount: 1, columnCount: 2 } });
      await tx.seat.createMany({ data: seatIds.map((id, index) => ({ id, roomId, rowLabel: 'A', seatNumber: index + 1, x: index, y: 0 })) });
      await tx.showtime.create({ data: {
        id: showtimeId, roomId, movieId: this.movieBoundary, startTime, endTime: new Date(startTime.getTime() + 90 * 60_000),
        format: 'TWO_D', language: 'SUBTITLED',
      } });
      await tx.showtimeSeat.createMany({ data: slotIds.map((id, index) => ({
        id, showtimeId, roomId, seatId: seatIds[index], rowLabel: 'A', seatNumber: index + 1, seatType: 'STANDARD', x: index, y: 0,
      })) });
      if (voucherId) await tx.voucher.create({ data: {
        id: voucherId, cinemaId, code: `REPORT${crypto.randomBytes(8).toString('hex').toUpperCase()}`, name: this.namespace,
        type: 'FIXED', value: discount, scope: input.scope, totalLimit: 10, perUserLimit: 10,
        validFrom: new Date('2109-01-01T00:00:00Z'), validTo: new Date('2111-01-01T00:00:00Z'),
      } });
      await tx.order.create({ data: {
        id: orderId, code: `RF${crypto.randomBytes(6).toString('hex')}`, userId: this.accounts.customer.id,
        createdBy: this.accounts.customer.id, showtimeId, status: 'PAID',
        movieTitleSnapshot: `${this.namespace}-movie-2`, cinemaNameSnapshot: `${this.namespace}-${cinemaId}`,
        cinemaAddressSnapshot: 'Report scenario', roomNameSnapshot: this.namespace, showtimeStartSnapshot: startTime,
        formatSnapshot: 'TWO_D', languageSnapshot: 'SUBTITLED', ageRatingSnapshot: 'P',
        ticketSubtotal, comboSubtotal, subtotal: ticketSubtotal + comboSubtotal, discount, total: ticketSubtotal + comboSubtotal - discount,
        paidAt, expiresAt: new Date(paidAt.getTime() + 10 * 60_000), voucherId,
        ...(voucherId ? { voucherSnapshot: { id: voucherId, type: 'FIXED', value: discount, scope: input.scope! } } : {}),
      } });
      const rule = await tx.priceRule.create({ data: {
        cinemaId, roomFormat: 'TWO_D', dayType: 'WEEKDAY', timeSlot: 'AFTERNOON', basePrice: ticketSubtotal,
        effectiveFrom: new Date('2109-01-01T00:00:00Z'),
      } });
      const surcharge = await tx.seatSurcharge.create({ data: { cinemaId, seatType: 'STANDARD', amount: 0, effectiveFrom: new Date('2109-01-01T00:00:00Z') } });
      const item = await tx.orderItem.create({ data: {
        orderId, showtimeId, showtimeSeatId: slotIds[0], seatId: seatIds[0], rowLabel: 'A', seatNumber: 1,
        seatType: 'STANDARD', x: 0, y: 0, basePrice: ticketSubtotal, surcharge: 0, price: ticketSubtotal,
        priceRuleId: rule.id, surchargeId: surcharge.id,
      } });
      await tx.ticket.create({ data: { orderId, showtimeId, seatId: seatIds[0], orderItemId: item.id, ticketCode: crypto.randomBytes(6).toString('hex') } });
      await tx.showtimeSeat.update({ where: { id: slotIds[0] }, data: { status: 'SOLD', orderId } });
      if (comboSubtotal) await tx.orderCombo.create({ data: {
        orderId, comboId: this.comboId, nameSnapshot: this.namespace, quantity: 1, unitPrice: comboSubtotal, lineTotal: comboSubtotal,
      } });
      if (voucherId) await tx.voucherRedemption.create({ data: {
        voucherId, orderId, userId: this.accounts.customer.id, status: 'CONSUMED', discount, reservedUntil: paidAt, consumedAt: paidAt,
      } });
      const payment = await tx.payment.create({ data: {
        orderId, attemptNo: 1, provider: 'VNPAY', method: 'VNPAY', amount: ticketSubtotal + comboSubtotal - discount,
        status: 'SUCCESS', paidAt, requestExpiresAt: new Date(paidAt.getTime() + 10 * 60_000), txnRef: `${this.namespace}-${orderId}`,
      } });
      await tx.order.update({ where: { id: orderId }, data: { settledPaymentId: payment.id } });
    }, { timeout: 15_000 });
    return { cinemaId, movieId: this.movieBoundary, showtimeId, orderId };
  }

  async cleanup() {
    const siteIds = [...Object.values(this.sites).map((site) => site.cinemaId), ...this.additionalCinemaIds];
    const roomIds = [...Object.values(this.sites).map((site) => site.roomId), ...this.additionalRoomIds];
    const showtimeIds = [...Object.values(this.sites).map((site) => site.showtimeId), ...this.additionalShowtimeIds];
    const userIds = Object.values(this.accounts).map((account) => account.id);
    await prisma.$transaction(async (tx) => {
      await tx.refundRequest.deleteMany({ where: { orderId: { in: this.orderIds } } });
      await tx.ticket.deleteMany({ where: { orderId: { in: this.orderIds } } });
      await tx.voucherRedemption.deleteMany({ where: { orderId: { in: this.orderIds } } });
      await tx.orderCombo.deleteMany({ where: { orderId: { in: this.orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: this.orderIds } } });
      await tx.showtimeSeat.updateMany({ where: { showtimeId: { in: showtimeIds } }, data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null } });
      await tx.order.updateMany({ where: { id: { in: this.orderIds } }, data: { settledPaymentId: null } });
      await tx.payment.deleteMany({ where: { orderId: { in: this.orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: this.orderIds } } });
      await tx.voucher.deleteMany({ where: { id: { in: this.additionalVoucherIds } } });
      await tx.showtimeSeat.deleteMany({ where: { showtimeId: { in: showtimeIds } } });
      await tx.showtime.deleteMany({ where: { id: { in: showtimeIds } } });
      await tx.seat.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.room.deleteMany({ where: { id: { in: roomIds } } });
      await tx.priceRule.deleteMany({ where: { cinemaId: { in: siteIds } } });
      await tx.seatSurcharge.deleteMany({ where: { cinemaId: { in: siteIds } } });
      await tx.combo.deleteMany({ where: { id: this.comboId } });
      await tx.movie.deleteMany({ where: { id: { in: [this.movieX, this.movieY, this.movieBoundary] } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.cinema.deleteMany({ where: { id: { in: siteIds } } });
    }, { timeout: 20_000 });
  }
}
