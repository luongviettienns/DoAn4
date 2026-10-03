import prisma from '../../shared/prisma';
import { NotFoundError } from '../../shared/errors';
import { ListCinemasQuery, CreateCinemaInput, CreateRoomInput } from './cinema.schema';

export class CinemaService {
  async listCinemas(query: ListCinemasQuery) {
    const where = {
      status: 'ACTIVE' as const,
      ...(query.city && { city: query.city }),
    };

    const cinemas = await prisma.cinema.findMany({
      where,
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    return cinemas.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      phone: c.phone,
      openTime: c.openTime,
      closeTime: c.closeTime,
      roomCount: c._count.rooms,
    }));
  }

  async getCinemaById(id: string) {
    const cinema = await prisma.cinema.findUnique({
      where: { id },
      include: {
        rooms: {
          where: { status: 'ACTIVE' },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            format: true,
            rowCount: true,
            columnCount: true,
            _count: { select: { seats: true } },
          },
        },
      },
    });

    if (!cinema) {
      throw new NotFoundError('CINEMA_NOT_FOUND', 'Cụm rạp không tồn tại');
    }

    return cinema;
  }

  async getRoomSeats(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        cinema: { select: { id: true, name: true, city: true } },
        seats: {
          where: { isActive: true },
          orderBy: [{ y: 'asc' }, { x: 'asc' }],
        },
      },
    });

    if (!room) {
      throw new NotFoundError('ROOM_NOT_FOUND', 'Phòng chiếu không tồn tại');
    }

    return {
      id: room.id,
      name: room.name,
      format: room.format,
      rowCount: room.rowCount,
      columnCount: room.columnCount,
      cinema: room.cinema,
      seats: room.seats.map((s) => ({
        id: s.id,
        rowLabel: s.rowLabel,
        seatNumber: s.seatNumber,
        type: s.type,
        x: s.x,
        y: s.y,
        columnSpan: s.columnSpan,
      })),
    };
  }

  async createCinema(input: CreateCinemaInput) {
    return prisma.cinema.create({
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        phone: input.phone,
        openTime: new Date(`1970-01-01T${input.openTime}Z`),
        closeTime: new Date(`1970-01-01T${input.closeTime}Z`),
      },
    });
  }

  async createRoom(input: CreateRoomInput) {
    return prisma.room.create({
      data: {
        cinemaId: input.cinemaId,
        name: input.name,
        format: input.format,
        rowCount: input.rowCount,
        columnCount: input.columnCount,
      },
    });
  }
}

export const cinemaService = new CinemaService();
export default cinemaService;
