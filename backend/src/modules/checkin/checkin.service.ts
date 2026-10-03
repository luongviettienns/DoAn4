import { Role } from '@prisma/client';
import prisma from '../../shared/prisma';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/errors';
import type { CheckinRequestInput } from './checkin.schema';

export class CheckinService {
  /**
   * Soát vé vào phòng chiếu (F08 - Kiểm tra BR-11: single-use, không dùng lại vé đã quét)
   */
  async validateAndCheckin(
    staffUser: { id: string; role: Role; cinemaIds: string[] },
    input: CheckinRequestInput
  ) {
    let ticketCode = input.ticketCode;

    // Nếu gửi qrPayload dạng "TKXXXX|showtimeId|...", tách mã vé
    if (!ticketCode && input.qrPayload) {
      const parts = input.qrPayload.split('|');
      ticketCode = parts[0];
    }

    if (!ticketCode) {
      throw new BadRequestError('INVALID_INPUT', 'Không thể xác định mã vé từ yêu cầu');
    }

    // 1. Tìm thông tin vé
    const ticket = await prisma.ticket.findFirst({
      where: { ticketCode },
      include: {
        item: {
          include: {
            order: {
              include: {
                showtime: {
                  include: {
                    movie: true,
                    room: {
                      include: {
                        cinema: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError('TICKET_NOT_FOUND', 'Mã vé không tồn tại trong hệ thống');
    }

    const showtime = ticket.item.order.showtime;

    // 2. Kiểm tra quyền rạp đối với nhân viên rạp
    if (staffUser.role === Role.STAFF || staffUser.role === Role.MANAGER) {
      const cinemaId = showtime.room.cinemaId;
      if (staffUser.cinemaIds.length > 0 && !staffUser.cinemaIds.includes(cinemaId)) {
        throw new ForbiddenError(
          'CINEMA_SCOPE_DENIED',
          `Bạn không có quyền soát vé tại rạp ${showtime.room.cinema.name}`
        );
      }
    }

    // 3. Kiểm tra BR-11: Vé đã qua sử dụng
    if (ticket.status === 'USED') {
      const checkedTime = ticket.checkedInAt ? ticket.checkedInAt.toLocaleTimeString('vi-VN') : 'trước đó';
      const checkedDate = ticket.checkedInAt ? ticket.checkedInAt.toLocaleDateString('vi-VN') : '';
      throw new ConflictError(
        'TICKET_ALREADY_USED',
        `Vé này ĐÃ ĐƯỢC SOÁT vào lúc ${checkedTime} ngày ${checkedDate}. Không thể sử dụng lại!`
      );
    }

    if (ticket.status === 'CANCELLED') {
      throw new BadRequestError(
        'TICKET_CANCELLED',
        'Vé này đã bị hủy bỏ do đơn hàng bị hủy hoặc hoàn vé'
      );
    }

    if (ticket.status !== 'VALID') {
      throw new BadRequestError(
        'TICKET_INVALID_STATUS',
        `Trạng thái vé không hợp lệ (${ticket.status})`
      );
    }

    // 4. Kiểm tra showtimeId nếu client truyền lên
    if (input.showtimeId && input.showtimeId !== ticket.showtimeId) {
      throw new BadRequestError(
        'SHOWTIME_MISMATCH',
        'Vé này không thuộc suất chiếu đang kiểm tra'
      );
    }

    // 5. Cập nhật vé sang trạng thái USED
    const checkedInAt = new Date();
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'USED',
        checkedInAt,
        checkedInBy: staffUser.id,
      },
    });

    return {
      result: 'OK',
      ticket: {
        id: updatedTicket.id,
        ticketCode: updatedTicket.ticketCode,
        seatId: updatedTicket.seatId,
        seatLabel: `${ticket.item.rowLabel}${ticket.item.seatNumber}`,
        seatType: ticket.item.seatType,
        price: ticket.item.price,
        status: updatedTicket.status,
        checkedInAt: checkedInAt.toISOString(),
      },
      showtime: {
        id: showtime.id,
        movieId: showtime.movieId,
        movieTitle: showtime.movie.title,
        posterUrl: showtime.movie.posterUrl,
        ageRating: showtime.movie.ageRating,
        cinemaId: showtime.room.cinemaId,
        cinemaName: showtime.room.cinema.name,
        roomId: showtime.roomId,
        roomName: showtime.room.name,
        startTime: showtime.startTime.toISOString(),
        endTime: showtime.endTime.toISOString(),
        format: showtime.format,
        language: showtime.language,
      },
      checkedInBy: staffUser.id,
    };
  }

  /**
   * Thống kê lượt soát vé trong ngày (F08)
   */
  async getCheckinStats(staffUser: { id: string; role: Role; cinemaIds: string[] }) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const whereScope: any = {};
    if ((staffUser.role === Role.STAFF || staffUser.role === Role.MANAGER) && staffUser.cinemaIds.length > 0) {
      whereScope.item = {
        order: {
          showtime: {
            room: {
              cinemaId: { in: staffUser.cinemaIds },
            },
          },
        },
      };
    }

    const [totalTickets, usedTickets] = await Promise.all([
      prisma.ticket.count({
        where: {
          ...whereScope,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.ticket.count({
        where: {
          ...whereScope,
          status: 'USED',
          checkedInAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    return {
      today: todayStart.toISOString().split('T')[0],
      totalTickets,
      checkedInCount: usedTickets,
      pendingCount: Math.max(0, totalTickets - usedTickets),
    };
  }

  /**
   * Lịch sử soát vé gần đây
   */
  async getCheckinHistory(staffUser: { id: string; role: Role; cinemaIds: string[] }, limit = 20) {
    const whereScope: any = {
      status: 'USED',
    };

    if ((staffUser.role === Role.STAFF || staffUser.role === Role.MANAGER) && staffUser.cinemaIds.length > 0) {
      whereScope.item = {
        order: {
          showtime: {
            room: {
              cinemaId: { in: staffUser.cinemaIds },
            },
          },
        },
      };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereScope,
      orderBy: { checkedInAt: 'desc' },
      take: limit,
      include: {
        item: {
          include: {
            order: {
              include: {
                showtime: {
                  include: {
                    movie: { select: { title: true } },
                    room: { select: { name: true, cinema: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
        checker: { select: { fullName: true } },
      },
    });

    return tickets.map((t) => {
      const showtime = t.item.order.showtime;
      return {
        ticketCode: t.ticketCode,
        seatLabel: `${t.item.rowLabel}${t.item.seatNumber}`,
        seatType: t.item.seatType,
        movieTitle: showtime.movie.title,
        cinemaName: showtime.room.cinema.name,
        roomName: showtime.room.name,
        checkedInAt: t.checkedInAt?.toISOString(),
        checkedInBy: t.checker?.fullName || 'Nhân viên soát vé',
      };
    });
  }
}

export const checkinService = new CheckinService();
