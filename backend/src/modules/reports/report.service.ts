import { Prisma } from '@prisma/client';
import prisma from '../../shared/prisma';
import { AppError, ForbiddenError } from '../../shared/errors';
import { reportDateRange, vietnameseCalendarDay, type ReportOverviewQuery, type ReportBreakdownQuery } from './report.schema';

type ReportRow = {
  key: string;
  label: string;
  revenue: number;
  orderCount: number;
  ticketCount: number;
  comboRevenue: number;
  capacityUnits: number;
  soldCapacityUnits: number;
};

function addMoney(total: number, amount: number) {
  const result = total + amount;
  if (!Number.isSafeInteger(result)) throw new AppError(500, 'REPORT_TOTAL_TOO_LARGE', 'Tổng báo cáo vượt giới hạn số nguyên an toàn');
  return result;
}

function occupancy(sold: number, capacity: number) {
  return capacity ? Number(((sold / capacity) * 100).toFixed(1)) : 0;
}

function netComboRevenue(order: { ticketSubtotal: number; comboSubtotal: number; discount: number; voucherSnapshot: Prisma.JsonValue }) {
  if (!order.discount || !order.comboSubtotal) return order.comboSubtotal;
  const snapshot = order.voucherSnapshot;
  const scope = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) ? snapshot.scope : undefined;
  if (scope === 'TICKETS') return order.comboSubtotal;
  if (scope === 'COMBOS') return Math.max(0, order.comboSubtotal - order.discount);
  // Allocate ORDER discounts to tickets first by integer floor, leaving the remainder to combos.
  const subtotal = BigInt(order.ticketSubtotal) + BigInt(order.comboSubtotal);
  const ticketDiscount = Number(BigInt(order.discount) * BigInt(order.ticketSubtotal) / subtotal);
  return order.comboSubtotal - (order.discount - ticketDiscount);
}

export class ReportService {
  private showtimeScope(query: { cinemaId?: string; movieId?: string }, cinemaIds?: string[]): Prisma.ShowtimeWhereInput {
    if (cinemaIds !== undefined && (!cinemaIds.length || (query.cinemaId && !cinemaIds.includes(query.cinemaId)))) {
      throw new ForbiddenError('CINEMA_SCOPE_FORBIDDEN', 'Bạn không có quyền xem báo cáo của rạp này');
    }
    const cinemaFilter = query.cinemaId ?? (cinemaIds === undefined ? undefined : { in: cinemaIds });
    return {
      ...(cinemaFilter === undefined ? {} : { room: { cinemaId: cinemaFilter } }),
      ...(query.movieId ? { movieId: query.movieId } : {}),
    };
  }

  async getOverview(query: ReportOverviewQuery, cinemaIds?: string[]) {
    const { from, to } = reportDateRange(query);
    const showtime = this.showtimeScope(query, cinemaIds);
    const paidAt = { gte: from, lt: to };
    const [orders, charges, refunds, slots] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'PAID', paidAt, showtime },
        select: { total: true, ticketSubtotal: true, comboSubtotal: true, discount: true, voucherSnapshot: true, _count: { select: { items: true } } },
      }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS', paidAt, order: { showtime } },
        _sum: { amount: true },
      }),
      prisma.refundRequest.aggregate({
        where: { status: 'REFUNDED', processedAt: paidAt, order: { showtime } },
        _sum: { amount: true },
      }),
      prisma.showtimeSeat.findMany({
        where: { showtime: { ...showtime, startTime: paidAt }, seatType: { not: 'BLOCKED' }, status: { not: 'BLOCKED' } },
        select: { status: true, columnSpan: true },
      }),
    ]);
    let revenue = 0;
    let comboRevenue = 0;
    let ticketCount = 0;
    for (const order of orders) {
      revenue = addMoney(revenue, order.total);
      comboRevenue = addMoney(comboRevenue, netComboRevenue(order));
      ticketCount += order._count.items;
    }
    const capacity = slots.reduce((sum, slot) => sum + slot.columnSpan, 0);
    const sold = slots.reduce((sum, slot) => sum + (slot.status === 'SOLD' ? slot.columnSpan : 0), 0);
    return {
      grossRevenue: addMoney(0, charges._sum.amount ?? 0),
      refundAmount: addMoney(0, refunds._sum.amount ?? 0),
      revenue, orderCount: orders.length, ticketCount, comboRevenue,
      occupancyPercent: occupancy(sold, capacity),
    };
  }

  async getBreakdown(query: ReportBreakdownQuery, cinemaIds?: string[]) {
    if (query.type === 'CINEMA' && cinemaIds !== undefined) {
      throw new ForbiddenError('CINEMA_COMPARISON_FORBIDDEN', 'Chỉ quản trị viên được xem báo cáo so sánh các rạp');
    }
    const { from, to } = reportDateRange(query);
    const showtime = this.showtimeScope(query, cinemaIds);
    const dateWindow = { gte: from, lt: to };
    const [orders, slots] = await Promise.all([
      prisma.order.findMany({
        where: { status: 'PAID', paidAt: dateWindow, showtime },
        select: {
          paidAt: true, total: true, ticketSubtotal: true, comboSubtotal: true, discount: true, voucherSnapshot: true,
          movieTitleSnapshot: true, cinemaNameSnapshot: true,
          _count: { select: { items: true } },
          showtime: { select: { movieId: true, room: { select: { cinemaId: true } } } },
        },
      }),
      prisma.showtimeSeat.findMany({
        where: { showtime: { ...showtime, startTime: dateWindow }, seatType: { not: 'BLOCKED' }, status: { not: 'BLOCKED' } },
        select: {
          status: true, columnSpan: true,
          showtime: { select: {
            startTime: true, movieId: true, movie: { select: { title: true } },
            room: { select: { cinemaId: true, cinema: { select: { name: true } } } },
          } },
        },
      }),
    ]);
    const rows = new Map<string, ReportRow>();
    for (const order of orders) {
      const key = query.type === 'DAILY' ? vietnameseCalendarDay(order.paidAt!)
        : query.type === 'CINEMA' ? order.showtime.room.cinemaId : order.showtime.movieId;
      const label = query.type === 'DAILY' ? key
        : query.type === 'CINEMA' ? order.cinemaNameSnapshot : order.movieTitleSnapshot;
      if (!rows.has(key)) rows.set(key, {
        key, label, revenue: 0, orderCount: 0, ticketCount: 0, comboRevenue: 0,
        capacityUnits: 0, soldCapacityUnits: 0,
      });
      const row = rows.get(key)!;
      row.revenue = addMoney(row.revenue, order.total);
      row.comboRevenue = addMoney(row.comboRevenue, netComboRevenue(order));
      row.orderCount += 1;
      row.ticketCount += order._count.items;
    }
    for (const slot of slots) {
      // Sales are grouped by the payment day; capacity is grouped by the performance day.
      const key = query.type === 'DAILY' ? vietnameseCalendarDay(slot.showtime.startTime)
        : query.type === 'CINEMA' ? slot.showtime.room.cinemaId : slot.showtime.movieId;
      if (!rows.has(key)) rows.set(key, {
        key,
        label: query.type === 'DAILY' ? key : query.type === 'CINEMA' ? slot.showtime.room.cinema.name : slot.showtime.movie.title,
        revenue: 0, orderCount: 0, ticketCount: 0, comboRevenue: 0, capacityUnits: 0, soldCapacityUnits: 0,
      });
      const row = rows.get(key)!;
      row.capacityUnits += slot.columnSpan;
      if (slot.status === 'SOLD') row.soldCapacityUnits += slot.columnSpan;
    }
    return Array.from(rows.values()).sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({
      ...row, occupancyPercent: occupancy(row.soldCapacityUnits, row.capacityUnits),
    }));
  }

  async getTopMovies(limit = 5, cinemaIds?: string[]) {
    const showtime = this.showtimeScope({}, cinemaIds);
    const orders = await prisma.order.findMany({
      where: { status: 'PAID', showtime },
      select: {
        movieTitleSnapshot: true, total: true, _count: { select: { items: true } },
        showtime: { select: { movieId: true } },
      },
    });
    const movies = new Map<string, { movieTitle: string; revenue: number; ticketsSold: number; orderCount: number }>();
    for (const order of orders) {
      const key = order.showtime.movieId;
      if (!movies.has(key)) movies.set(key, { movieTitle: order.movieTitleSnapshot, revenue: 0, ticketsSold: 0, orderCount: 0 });
      const row = movies.get(key)!;
      row.revenue = addMoney(row.revenue, order.total);
      row.ticketsSold += order._count.items;
      row.orderCount += 1;
    }
    return Array.from(movies.values()).sort((a, b) => b.revenue - a.revenue || a.movieTitle.localeCompare(b.movieTitle)).slice(0, limit);
  }

  async exportBreakdownCsv(query: ReportBreakdownQuery, cinemaIds?: string[]) {
    const data = await this.getBreakdown(query, cinemaIds);

    let csv = '\uFEFF';
    const firstColName = query.type === 'DAILY' ? 'Ngày/Mã' : query.type === 'CINEMA' ? 'Rạp/Mã' : 'Phim/Mã';
    csv += `${firstColName},Tên hiển thị,Doanh thu thuần (VNĐ),Doanh thu Combo (VNĐ),Số đơn hàng,Số vé bán ra,Tỷ lệ lấp đầy (%)\n`;

    for (const row of data) {
      const escape = (val: any) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const line = [
        escape(row.key),
        escape(row.label),
        escape(row.revenue),
        escape(row.comboRevenue),
        escape(row.orderCount),
        escape(row.ticketCount),
        escape(row.occupancyPercent),
      ].join(',');

      csv += line + '\n';
    }

    return csv;
  }
}

export const reportService = new ReportService();
