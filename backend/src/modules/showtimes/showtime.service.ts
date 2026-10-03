import { Prisma, ShowtimeStatus, DayType, TimeSlot, SeatType } from '@prisma/client';
import prisma from '../../shared/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { ListShowtimesQuery, CreateShowtimeInput } from './showtime.schema';

export class ShowtimeService {
  async listShowtimes(query: ListShowtimesQuery) {
    const { movieId, cinemaId, date, format } = query;

    let timeFilter: Prisma.DateTimeFilter | undefined;
    if (date) {
      // Calculate start and end of day in UTC+7 (Vietnam)
      const startOfDay = new Date(`${date}T00:00:00+07:00`);
      const endOfDay = new Date(`${date}T23:59:59.999+07:00`);
      timeFilter = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      timeFilter = {
        gte: new Date(), // upcoming only
      };
    }

    const where: Prisma.ShowtimeWhereInput = {
      status: ShowtimeStatus.OPEN,
      startTime: timeFilter,
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

  async getShowtimeSeats(showtimeId: string) {
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
        },
      },
    });

    if (!showtime) {
      throw new NotFoundError('SHOWTIME_NOT_FOUND', 'Suất chiếu không tồn tại');
    }

    // Determine DayType (Weekday / Weekend)
    const showtimeDay = showtime.startTime.getUTCDay();
    const isWeekend = showtimeDay === 0 || showtimeDay === 6;
    const dayType = isWeekend ? DayType.WEEKEND : DayType.WEEKDAY;

    // Determine TimeSlot
    const hour = (showtime.startTime.getUTCHours() + 7) % 24; // UTC+7 hour
    let timeSlot: TimeSlot = TimeSlot.AFTERNOON;
    if (hour < 12) timeSlot = TimeSlot.MORNING;
    else if (hour >= 17) timeSlot = TimeSlot.EVENING;

    // Fetch Base Price from PriceRules
    const priceRule = await prisma.priceRule.findFirst({
      where: {
        cinemaId: showtime.room.cinemaId,
        roomFormat: showtime.format,
        dayType,
        timeSlot,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const basePrice = priceRule ? priceRule.basePrice : 95000;

    // Fetch Surcharges
    const surcharges = await prisma.seatSurcharge.findMany({
      where: { cinemaId: showtime.room.cinemaId },
      orderBy: { effectiveFrom: 'desc' },
    });

    const surchargeMap = new Map<SeatType, number>();
    for (const s of surcharges) {
      if (!surchargeMap.has(s.seatType)) {
        surchargeMap.set(s.seatType, s.amount);
      }
    }

    // Format seats with computed price and status
    const seats = showtime.slots.map((slot) => {
      const surcharge = surchargeMap.get(slot.seatType) || 0;
      const finalPrice = basePrice + surcharge;

      // Check if held seat is already expired
      let effectiveStatus = slot.status;
      if (slot.status === 'HELD' && slot.holdExpiresAt && slot.holdExpiresAt <= new Date()) {
        effectiveStatus = 'AVAILABLE';
      }

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

  async createShowtime(input: CreateShowtimeInput) {
    const movie = await prisma.movie.findUnique({ where: { id: input.movieId } });
    if (!movie) throw new NotFoundError('MOVIE_NOT_FOUND', 'Phim không tồn tại');

    const room = await prisma.room.findUnique({
      where: { id: input.roomId },
      include: { seats: { where: { isActive: true } } },
    });
    if (!room) throw new NotFoundError('ROOM_NOT_FOUND', 'Phòng chiếu không tồn tại');

    const startTime = new Date(input.startTime);
    const totalMinutes = movie.durationMin + input.adMinutes;
    const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);
    const requiredFreeUntil = new Date(endTime.getTime() + input.cleaningMinutes * 60 * 1000);

    // BR-10: Check overlapping showtimes in the same room
    const overlapping = await prisma.showtime.findFirst({
      where: {
        roomId: input.roomId,
        status: { not: ShowtimeStatus.CANCELLED },
        AND: [
          { startTime: { lt: requiredFreeUntil } },
          { endTime: { gt: new Date(startTime.getTime() - input.cleaningMinutes * 60 * 1000) } },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictError(
        'SHOWTIME_OVERLAP',
        'Phòng chiếu đã có suất chiếu khác trong khoảng thời gian này hoặc không đủ 15 phút dọn phòng (BR-10)'
      );
    }

    // Create Showtime and its ShowtimeSeats
    const showtime = await prisma.$transaction(async (tx) => {
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
      }));

      await tx.showtimeSeat.createMany({ data: showtimeSeatsData });
      return st;
    });

    return showtime;
  }
}

export const showtimeService = new ShowtimeService();
export default showtimeService;
