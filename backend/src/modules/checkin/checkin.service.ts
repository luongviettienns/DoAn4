import { Role } from '@prisma/client';
import prisma from '../../shared/prisma';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../shared/errors';
import type { CheckinRequestInput } from './checkin.schema';
import { qrSignatureService } from '../../shared/qr-signature.service';

export class CheckinService {
  /**
   * Soát vé vào phòng chiếu (F08 - Kiểm tra BR-11: single-use, Signed QR, Cửa sổ soát vé [-30m, +15m], Manager bypass)
   */
  async validateAndCheckin(
    staffUser: { id: string; role: Role; cinemaIds: string[] },
    input: CheckinRequestInput
  ) {
    const rawPayload = input.qrPayload || input.ticketCode || '';
    const strictMode = process.env.STRICT_QR_VERIFICATION === 'true';
    const verifyResult = qrSignatureService.verifyAndExtractTicketCode(rawPayload, strictMode);

    if (!verifyResult.valid) {
      if (verifyResult.error === 'INVALID_QR_SIGNATURE') {
        throw new BadRequestError('INVALID_QR_SIGNATURE', 'Mã QR đã bị giả mạo hoặc chữ ký không hợp lệ');
      }
      if (verifyResult.error === 'KEY_VERSION_UNSUPPORTED') {
        throw new BadRequestError('KEY_VERSION_UNSUPPORTED', 'Phiên bản khóa mã QR không được hỗ trợ');
      }
      if (verifyResult.error === 'UNSIGNED_QR_NOT_ALLOWED') {
        throw new BadRequestError('UNSIGNED_QR_NOT_ALLOWED', 'Hệ thống yêu cầu quét mã QR có chữ ký số');
      }
      throw new BadRequestError('INVALID_INPUT', 'Không thể xác định mã vé hợp lệ từ yêu cầu');
    }

    const ticketCode = verifyResult.ticketCode;

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
      if (!staffUser.cinemaIds.includes(cinemaId)) {
        throw new ForbiddenError(
          'CINEMA_SCOPE_DENIED',
          `Bạn không có quyền soát vé tại rạp ${showtime.room.cinema.name}`
        );
      }
    }

    // 3. Kiểm tra BR-11: Vé đã qua sử dụng hoặc không hợp lệ
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

    // 5. Kiểm tra Cửa sổ soát vé (-30 phút đến +15 phút so với startTime)
    const now = new Date();
    const startTime = new Date(showtime.startTime);
    const earlyThreshold = new Date(startTime.getTime() - 30 * 60 * 1000);
    const lateThreshold = new Date(startTime.getTime() + 15 * 60 * 1000);

    let isBypassed = false;
    let bypassReason: string | undefined;

    if (now < earlyThreshold) {
      throw new BadRequestError(
        'CHECKIN_WINDOW_EARLY',
        'Chưa đến giờ soát vé. Cửa sổ soát vé mở trước giờ chiếu 30 phút.'
      );
    }

    if (now > lateThreshold) {
      if (!input.bypassWindow) {
        throw new BadRequestError(
          'CHECKIN_WINDOW_EXPIRED',
          'Suất chiếu đã bắt đầu quá 15 phút. Cửa sổ soát vé tiêu chuẩn đã đóng. Cần Quản lý xác nhận bypass.'
        );
      }

      // Chỉ MANAGER (thuộc rạp) hoặc ADMIN mới có quyền bypass
      if (staffUser.role !== Role.MANAGER && staffUser.role !== Role.ADMIN) {
        throw new ForbiddenError(
          'STAFF_CANNOT_BYPASS_WINDOW',
          'Nhân viên không có quyền duyệt soát vé ngoài khung giờ. Cần Quản lý (Manager) hoặc Quản trị viên (Admin) phê duyệt.'
        );
      }

      if (!input.bypassReason || input.bypassReason.trim().length < 5) {
        throw new BadRequestError('BYPASS_REASON_REQUIRED', 'Cần cung cấp lý do bypass tối thiểu 5 ký tự');
      }

      isBypassed = true;
      bypassReason = input.bypassReason.trim();
    }

    // 6. Cập nhật vé sang trạng thái USED
    const checkedInAt = new Date();
    const claimed = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: {
        status: 'USED',
        checkedInAt,
        checkedInBy: staffUser.id,
      },
    });
    if (claimed.count !== 1) throw new ConflictError('TICKET_ALREADY_USED', 'Vé đã được soát hoặc không còn hợp lệ');
    const updatedTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

    // 7. Ghi nhận Audit Log nếu là lượt check-in bypass ngoại lệ
    if (isBypassed) {
      await prisma.auditLog.create({
        data: {
          actorId: staffUser.id,
          action: 'CHECKIN_WINDOW_BYPASS',
          entity: 'Ticket',
          entityId: ticket.id,
          newValue: {
            ticketCode: ticket.ticketCode,
            showtimeId: showtime.id,
            startTime: showtime.startTime.toISOString(),
            checkedInAt: checkedInAt.toISOString(),
            lateMinutes: Math.round((checkedInAt.getTime() - startTime.getTime()) / 60000),
            bypassReason,
          },
        },
      });
    }

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
      isBypassed,
      bypassReason,
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
    if (staffUser.role === Role.STAFF || staffUser.role === Role.MANAGER) {
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

    if (staffUser.role === Role.STAFF || staffUser.role === Role.MANAGER) {
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
