import { Prisma, ShowtimeStatus, SeatType, Role } from '@prisma/client';
import prisma from '../../shared/prisma';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { resolveShowtimePricing } from '../../shared/showtime-pricing';
import type { AuthUser } from '../../middleware/auth.middleware';
import { ListShowtimesQuery, CreateShowtimeInput } from './showtime.schema';

export class ShowtimeService {
  async listShowtimes(query: ListShowtimesQuery) {
    const { movieId, cinemaId, date, format } = query;
    const now = new Date();

    let timeFilter: Prisma.DateTimeFilter | undefined;
    if (date) {
      // Calculate start and end of day in UTC+7 (Vietnam)
      const startOfDay = new Date(`${date}T00:00:00+07:00`);
      const endOfDay = new Date(`${date}T23:59:59.999+07:00`);
      timeFilter = {
        gte: startOfDay,
        lte: endOfDay,
        gt: now,
      };
    } else {
      timeFilter = {
        gt: now,
      };
    }

    const where: Prisma.ShowtimeWhereInput = {
      status: ShowtimeStatus.OPEN,
      startTime: timeFilter,
      movie: { isActive: true },
      ...(movieId && { movieId }),
      ...(format && { format }),
      ...(cinemaId && {
        room: { cinemaId },
      }),
    };

    const showtimes = await prisma.showtime.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            originalTitle: true,
            posterUrl: true,
            durationMin: true,
            ageRating: true,
          },
        },
        room: {
          include: {
            cinema: {
              select: { id: true, name: true, city: true, address: true },
            },
          },
        },
      },
    });

    return showtimes.map((st) => ({
      id: st.id,
      movieId: st.movieId,
      movieTitle: st.movie.title,
      movieAgeRating: st.movie.ageRating,
      movieDurationMin: st.movie.durationMin,
      moviePosterUrl: st.movie.posterUrl,
      roomId: st.roomId,
      roomName: st.room.name,
      cinemaId: st.room.cinema.id,
      cinemaName: st.room.cinema.name,
      cinemaCity: st.room.cinema.city,
      format: st.format,
      language: st.language,
      startTime: st.startTime,
      endTime: st.endTime,
      status: st.status,
    }));
  }

  async getShowtimeSeats(showtimeId: string, currentUserId?: string) {
    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            originalTitle: true,
            posterUrl: true,
            durationMin: true,
            ageRating: true,
          },
        },
        room: {
          include: {
            cinema: {
              select: { id: true, name: true, city: true, address: true },
            },
          },
        },
        slots: {
          orderBy: [{ y: 'asc' }, { x: 'asc' }],
          include: { order: { select: { userId: true, status: true, expiresAt: true } } },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundError('SHOWTIME_NOT_FOUND', 'Suất chiếu không tồn tại');
    }

    const { priceRule, surchargeMap } = await resolveShowtimePricing(showtime.room.cinemaId, showtime.format, showtime.startTime);
    const basePrice = priceRule.basePrice;

    // Format seats with computed price and status
    const now = new Date();
    const seats = showtime.slots.map((slot) => {
      const surcharge = surchargeMap.get(slot.seatType);
      if (slot.seatType !== SeatType.BLOCKED && !surcharge) {
        throw new BadRequestError('PRICE_NOT_CONFIGURED', 'Rạp chưa cấu hình phụ thu cho loại ghế của suất chiếu');
      }
      const finalPrice = slot.seatType === SeatType.BLOCKED ? 0 : basePrice + surcharge!.amount;

      // Check if held seat is already expired
      let effectiveStatus = slot.status;
      if (slot.status === 'HELD' && ((slot.holdExpiresAt && slot.holdExpiresAt <= now)
        || (slot.order && (slot.order.status !== 'PENDING_PAYMENT' || slot.order.expiresAt <= now)))) {
        effectiveStatus = 'AVAILABLE';
      }
      if (slot.seatType === SeatType.BLOCKED) effectiveStatus = 'BLOCKED';

      return {
        id: slot.id,
        seatId: slot.seatId,
        rowLabel: slot.rowLabel,
        seatNumber: slot.seatNumber,
        seatType: slot.seatType,
        x: slot.x,
        y: slot.y,
        columnSpan: slot.columnSpan,
        status: effectiveStatus,
        heldByCurrentUser: Boolean(currentUserId && effectiveStatus === 'HELD'
          && slot.order?.userId === currentUserId && slot.order.status === 'PENDING_PAYMENT' && slot.order.expiresAt > now),
        price: finalPrice,
      };
    });

    return {
      showtime: {
        id: showtime.id,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        format: showtime.format,
        language: showtime.language,
        basePrice,
      },
      movie: showtime.movie,
      cinema: showtime.room.cinema,
      room: {
        id: showtime.room.id,
        name: showtime.room.name,
        rowCount: showtime.room.rowCount,
        columnCount: showtime.room.columnCount,
      },
      seats,
    };
  }

  async createShowtime(input: CreateShowtimeInput, actor: Pick<AuthUser, 'role' | 'cinemaIds'>) {
    return prisma.$transaction(async (tx) => {
      // Serialize scheduling decisions before reading the room's current schedule.
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${input.roomId} FOR UPDATE`;
      const room = await tx.room.findUnique({
        where: { id: input.roomId }, include: { cinema: true, seats: { where: { isActive: true } } },
      });
      if (!room) throw new NotFoundError('ROOM_NOT_FOUND', 'Phòng chiếu không tồn tại');
      if (actor.role !== Role.ADMIN && (actor.role !== Role.MANAGER || !actor.cinemaIds.includes(room.cinemaId))) {
        throw new ForbiddenError('CINEMA_SCOPE_DENIED', 'Bạn không có quyền quản lý suất chiếu tại rạp này');
      }

      const movie = await tx.movie.findUnique({ where: { id: input.movieId } });
      if (!movie) throw new NotFoundError('MOVIE_NOT_FOUND', 'Phim không tồn tại');
      if (movie.ageRating === 'C') throw new BadRequestError('MOVIE_PROHIBITED', 'Phim phân loại C không được xếp suất chiếu');
      if (room.status !== 'ACTIVE') throw new BadRequestError('ROOM_NOT_ACTIVE', 'Phòng đang bảo trì, không thể xếp suất chiếu');
      if (room.format !== input.format) throw new BadRequestError('ROOM_FORMAT_MISMATCH', 'Định dạng suất chiếu không phù hợp phòng');

      const startTime = new Date(input.startTime);
      const endTime = new Date(startTime.getTime() + (movie.durationMin + input.adMinutes) * 60_000);
      const localStart = new Date(startTime.getTime() + 7 * 60 * 60_000);
      const localEnd = new Date(endTime.getTime() + 7 * 60 * 60_000);
      const localDate = localStart.toISOString().slice(0, 10);
      if (localDate < movie.releaseDate.toISOString().slice(0, 10)) {
        throw new BadRequestError('MOVIE_NOT_RELEASED', 'Ngày suất chiếu không được trước ngày khởi chiếu của phim');
      }
      const timeOfDay = (date: Date) => date.getUTCHours() * 3_600_000 + date.getUTCMinutes() * 60_000 + date.getUTCSeconds() * 1_000 + date.getUTCMilliseconds();
      if (localDate !== localEnd.toISOString().slice(0, 10) || timeOfDay(localStart) < timeOfDay(room.cinema.openTime) || timeOfDay(localEnd) > timeOfDay(room.cinema.closeTime)) {
        throw new BadRequestError('CINEMA_CLOSED', 'Toàn bộ suất chiếu phải nằm trong giờ mở cửa rạp');
      }

      const requiredFreeUntil = new Date(endTime.getTime() + input.cleaningMinutes * 60_000);
      const overlapping = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM showtimes
        WHERE room_id = ${room.id} AND status <> 'CANCELLED'
          AND start_time < ${requiredFreeUntil}
          AND DATE_ADD(end_time, INTERVAL cleaning_minutes MINUTE) > ${startTime}
        LIMIT 1
      `;
      if (overlapping.length) {
        throw new ConflictError('SHOWTIME_OVERLAP', 'Phòng đã có suất chiếu hoặc chưa đủ thời gian dọn phòng giữa hai suất');
      }

      const st = await tx.showtime.create({
        data: {
          movieId: input.movieId,
          roomId: input.roomId,
          format: input.format,
          language: input.language,
          startTime,
          endTime,
          cleaningMinutes: input.cleaningMinutes,
          adMinutes: input.adMinutes,
          status: ShowtimeStatus.OPEN,
        },
      });

      const showtimeSeatsData = room.seats.map((seat) => ({
        showtimeId: st.id,
        seatId: seat.id,
        roomId: room.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        seatType: seat.type,
        x: seat.x,
        y: seat.y,
        columnSpan: seat.columnSpan,
        status: seat.type === SeatType.BLOCKED ? 'BLOCKED' as const : 'AVAILABLE' as const,
      }));

      await tx.showtimeSeat.createMany({ data: showtimeSeatsData });
      return st;
    }, { maxWait: 10_000, timeout: 15_000 });
  }

  async cancelShowtime(id: string, reason: string, actor: Pick<AuthUser, 'id' | 'role' | 'cinemaIds'>) {
    const showtime = await prisma.showtime.findUnique({
      where: { id },
      include: { room: { select: { cinemaId: true } } },
    });

    if (!showtime) {
      throw new NotFoundError('SHOWTIME_NOT_FOUND', 'Suất chiếu không tồn tại');
    }

    if (actor.role !== Role.ADMIN) {
      if ((actor.role !== Role.MANAGER && actor.role !== Role.STAFF) || !actor.cinemaIds || !actor.cinemaIds.includes(showtime.room.cinemaId)) {
        throw new ForbiddenError('CINEMA_SCOPE_DENIED', 'Bạn không có quyền quản lý suất chiếu tại rạp này');
      }
    }

    if (showtime.status === ShowtimeStatus.CANCELLED) {
      throw new BadRequestError('SHOWTIME_ALREADY_CANCELLED', 'Suất chiếu đã được hủy trước đó');
    }

    return prisma.$transaction(async (tx) => {
      return cancelSingleShowtimeTx(tx, showtime, reason, actor.id);
    }, { timeout: 15_000 });
  }
}

export async function cancelSingleShowtimeTx(
  tx: Prisma.TransactionClient,
  showtime: { id: string; status: ShowtimeStatus },
  reason: string,
  actorId?: string | null
) {
  const now = new Date();

  const updatedShowtime = await tx.showtime.update({
    where: { id: showtime.id },
    data: {
      status: ShowtimeStatus.CANCELLED,
      cancelledAt: now,
      cancellationReason: reason,
    },
  });

  const orders = await tx.order.findMany({
    where: {
      showtimeId: showtime.id,
      status: { in: ['PENDING_PAYMENT', 'PAID'] },
    },
    include: {
      items: {
        include: { ticket: true },
      },
      payments: true,
    },
  });

  for (const order of orders) {
    const isPaid = order.status === 'PAID';
    if (isPaid) {
      await tx.ticket.updateMany({
        where: { orderId: order.id, status: 'VALID' },
        data: { status: 'CANCELLED' },
      });

      const settledPaymentId = order.settledPaymentId || order.payments.find((p) => p.status === 'SUCCESS')?.id;
      if (settledPaymentId) {
        await tx.refundRequest.upsert({
          where: { paymentId: settledPaymentId },
          update: {
            reason: 'SHOWTIME_CANCELLED',
            status: 'PENDING',
            amount: order.total,
            cancellationFee: 0,
            policySnapshot: { reason },
            requestedBy: actorId || null,
          },
          create: {
            orderId: order.id,
            paymentId: settledPaymentId,
            reason: 'SHOWTIME_CANCELLED',
            status: 'PENDING',
            amount: order.total,
            cancellationFee: 0,
            policySnapshot: { reason },
            requestedBy: actorId || null,
          },
        });
      }

      if (order.userId && order.pointsEarned > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { points: { decrement: order.pointsEarned } },
        });

        await tx.loyaltyTransaction.upsert({
          where: { orderId_type: { orderId: order.id, type: 'REVERT' } },
          update: { points: order.pointsEarned },
          create: {
            userId: order.userId,
            orderId: order.id,
            type: 'REVERT',
            points: order.pointsEarned,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason,
          refundStatus: 'PENDING',
        },
      });
    } else {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason,
        },
      });
    }

    await tx.pendingOrderGuard.deleteMany({
      where: { orderId: order.id },
    });

    await tx.voucherRedemption.updateMany({
      where: { orderId: order.id },
      data: { status: 'RELEASED', releasedAt: now },
    });

    await tx.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
      data: { status: 'FAILED', failureReason: 'Suất chiếu bị hủy' },
    });
  }

  await tx.showtimeSeat.updateMany({
    where: {
      showtimeId: showtime.id,
      seatType: { not: SeatType.BLOCKED },
      status: { in: ['HELD', 'SOLD'] },
    },
    data: {
      status: 'AVAILABLE',
      orderId: null,
      holdExpiresAt: null,
    },
  });

  await tx.auditLog.create({
    data: {
      actorId: actorId || null,
      action: 'SHOWTIME_CANCEL',
      entity: 'Showtime',
      entityId: showtime.id,
      oldValue: { status: showtime.status },
      newValue: { status: 'CANCELLED', cancellationReason: reason },
    },
  });

  return updatedShowtime;
}

export const showtimeService = new ShowtimeService();
export default showtimeService;

