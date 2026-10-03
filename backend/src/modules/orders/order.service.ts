import crypto from 'crypto';
import { DayType, TimeSlot, SeatType } from '@prisma/client';
import prisma from '../../shared/prisma';
import { BadRequestError, NotFoundError, ConflictError, GoneError, ForbiddenError } from '../../shared/errors';
import type { CreateOrderInput } from './order.schema';

const generateOrderCode = (): string => {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MV${yy}${mm}${dd}${random}`;
};

export class OrderService {
  /**
   * Tạo đơn đặt vé và giữ ghế trực tuyến (F03)
   */
  async createOrder(userId: string, input: CreateOrderInput) {
    const { showtimeId, seatIds, ageConfirmed } = input;

    // 1. Kiểm tra người dùng
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'Người dùng không tồn tại');
    }

    // 2. Kiểm tra xung đột giữ chỗ của người dùng (BR-03: 1 pending order per showtime)
    const existingGuard = await prisma.pendingOrderGuard.findUnique({
      where: {
        userId_showtimeId: {
          userId,
          showtimeId,
        },
      },
      include: {
        order: true,
      },
    });

    if (existingGuard) {
      if (existingGuard.order.expiresAt > new Date() && existingGuard.order.status === 'PENDING_PAYMENT') {
        throw new ConflictError(
          'ACTIVE_PENDING_ORDER',
          'Bạn đang có một đơn đặt vé đang chờ thanh toán cho suất chiếu này. Vui lòng hoàn tất hoặc hủy đơn cũ trước khi đặt tiếp.'
        );
      } else {
        // Đơn đã hết hạn, dọn dẹp guard và ghế cũ
        await prisma.$transaction(async (tx) => {
          await tx.pendingOrderGuard.deleteMany({
            where: { orderId: existingGuard.orderId },
          });
          await tx.showtimeSeat.updateMany({
            where: { orderId: existingGuard.orderId, status: 'HELD' },
            data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
          });
          await tx.order.update({
            where: { id: existingGuard.orderId },
            data: { status: 'EXPIRED' },
          });
        });
      }
    }

    // 3. Kiểm tra suất chiếu
    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        room: {
          include: {
            cinema: true,
          },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundError('SHOWTIME_NOT_FOUND', 'Suất chiếu không tồn tại');
    }

    if (showtime.status !== 'OPEN') {
      throw new BadRequestError('SHOWTIME_CLOSED', 'Suất chiếu đã kết thúc hoặc không mở bán');
    }

    // 4. Kiểm tra và giải phóng ghế đã hết hạn giữ chỗ trong suất chiếu
    await prisma.showtimeSeat.updateMany({
      where: {
        showtimeId,
        status: 'HELD',
        holdExpiresAt: { lte: new Date() },
      },
      data: {
        status: 'AVAILABLE',
        orderId: null,
        holdExpiresAt: null,
      },
    });

    // 5. Tải và kiểm tra các ghế yêu cầu
    const requestedSeats = await prisma.showtimeSeat.findMany({
      where: {
        showtimeId,
        seatId: { in: seatIds },
      },
    });

    if (requestedSeats.length !== seatIds.length) {
      throw new BadRequestError('INVALID_SEATS', 'Một số ghế được chọn không tồn tại trong phòng chiếu');
    }

    for (const seat of requestedSeats) {
      if (seat.status !== 'AVAILABLE') {
        throw new ConflictError(
          'SEAT_ALREADY_RESERVED',
          `Ghế ${seat.rowLabel}${seat.seatNumber} đã được đặt hoặc đang có người khác giữ chỗ`
        );
      }
    }

    // 6. Tính toán đơn giá theo bảng giá & phụ thu
    const showtimeDay = showtime.startTime.getUTCDay();
    const isWeekend = showtimeDay === 0 || showtimeDay === 6;
    const dayType = isWeekend ? DayType.WEEKEND : DayType.WEEKDAY;

    const hour = (showtime.startTime.getUTCHours() + 7) % 24;
    let timeSlot: TimeSlot = TimeSlot.AFTERNOON;
    if (hour < 12) timeSlot = TimeSlot.MORNING;
    else if (hour >= 17) timeSlot = TimeSlot.EVENING;

    // Lấy PriceRule
    let priceRule = await prisma.priceRule.findFirst({
      where: {
        cinemaId: showtime.room.cinemaId,
        roomFormat: showtime.format,
        dayType,
        timeSlot,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!priceRule) {
      // Fallback nếu chưa có rule đặc thù
      priceRule = await prisma.priceRule.findFirst({
        where: { cinemaId: showtime.room.cinemaId },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!priceRule) {
        priceRule = await prisma.priceRule.create({
          data: {
            cinemaId: showtime.room.cinemaId,
            roomFormat: showtime.format,
            dayType,
            timeSlot,
            basePrice: 95000,
            effectiveFrom: new Date('2026-01-01'),
          },
        });
      }
    }

    // Lấy Surcharges
    const surcharges = await prisma.seatSurcharge.findMany({
      where: { cinemaId: showtime.room.cinemaId },
      orderBy: { effectiveFrom: 'desc' },
    });

    const surchargeMap = new Map<SeatType, { id: string; amount: number }>();
    for (const s of surcharges) {
      if (!surchargeMap.has(s.seatType)) {
        surchargeMap.set(s.seatType, { id: s.id, amount: s.amount });
      }
    }

    // Đảm bảo đủ surcharge cho từng loại ghế
    for (const type of [SeatType.STANDARD, SeatType.VIP, SeatType.COUPLE]) {
      if (!surchargeMap.has(type)) {
        const defaultAmount = type === SeatType.VIP ? 20000 : type === SeatType.COUPLE ? 40000 : 0;
        const created = await prisma.seatSurcharge.create({
          data: {
            cinemaId: showtime.room.cinemaId,
            seatType: type,
            amount: defaultAmount,
            effectiveFrom: new Date('2026-01-01'),
          },
        });
        surchargeMap.set(type, { id: created.id, amount: defaultAmount });
      }
    }

    // Tính tổng tiền và chuẩn bị snapshot cho từng ghế
    const seatItemsData = requestedSeats.map((slot) => {
      const surchargeInfo = surchargeMap.get(slot.seatType)!;
      const basePrice = priceRule!.basePrice;
      const surcharge = surchargeInfo.amount;
      const price = basePrice + surcharge;

      return {
        showtimeSeat: slot,
        basePrice,
        surcharge,
        price,
        priceRuleId: priceRule!.id,
        surchargeId: surchargeInfo.id,
      };
    });

    const ticketSubtotal = seatItemsData.reduce((acc, cur) => acc + cur.price, 0);
    const total = ticketSubtotal;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút theo BR-01
    const orderCode = generateOrderCode();

    // 7. Thực hiện Transaction tạo đơn, tạo order_items, cập nhật ghế sang HELD, đặt guard
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          code: orderCode,
          userId,
          showtimeId,
          source: 'ONLINE',
          status: 'PENDING_PAYMENT',
          createdBy: userId,
          customerName: user.fullName,
          customerEmail: user.email,
          customerPhone: user.phone,
          movieTitleSnapshot: showtime.movie.title,
          cinemaNameSnapshot: showtime.room.cinema.name,
          cinemaAddressSnapshot: showtime.room.cinema.address,
          roomNameSnapshot: showtime.room.name,
          showtimeStartSnapshot: showtime.startTime,
          formatSnapshot: showtime.room.format,
          languageSnapshot: showtime.language,
          ageRatingSnapshot: showtime.movie.ageRating,
          ageConfirmedAt: ageConfirmed ? new Date() : null,
          ticketSubtotal,
          comboSubtotal: 0,
          subtotal: total,
          discount: 0,
          total,
          expiresAt,
        },
      });

      // Tạo OrderItem và cập nhật ghế
      for (const item of seatItemsData) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            showtimeSeatId: item.showtimeSeat.id,
            showtimeId: showtime.id,
            seatId: item.showtimeSeat.seatId,
            rowLabel: item.showtimeSeat.rowLabel,
            seatNumber: item.showtimeSeat.seatNumber,
            seatType: item.showtimeSeat.seatType,
            x: item.showtimeSeat.x,
            y: item.showtimeSeat.y,
            columnSpan: item.showtimeSeat.columnSpan,
            basePrice: item.basePrice,
            surcharge: item.surcharge,
            price: item.price,
            priceRuleId: item.priceRuleId,
            surchargeId: item.surchargeId,
          },
        });

        await tx.showtimeSeat.update({
          where: { id: item.showtimeSeat.id },
          data: {
            status: 'HELD',
            orderId: order.id,
            holdExpiresAt: expiresAt,
          },
        });
      }

      // Đặt Pending Order Guard
      await tx.pendingOrderGuard.create({
        data: {
          userId,
          showtimeId,
          orderId: order.id,
        },
      });

      return order;
    });

    // 8. Trả về chi tiết đơn hàng
    return this.getOrderById(createdOrder.id, userId);
  }

  /**
   * Tra cứu đơn hàng theo ID
   */
  async getOrderById(orderId: string, currentUserId?: string, currentUserRole?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
          include: {
            ticket: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
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
    });

    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
    }

    // Khách hàng chỉ xem được đơn của chính mình
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'MANAGER' && currentUserRole !== 'STAFF') {
      if (currentUserId && order.userId && order.userId !== currentUserId) {
        throw new ForbiddenError('FORBIDDEN', 'Bạn không có quyền xem đơn hàng này');
      }
    }

    const isExpired = order.status === 'PENDING_PAYMENT' && order.expiresAt <= new Date();

    return {
      id: order.id,
      code: order.code,
      userId: order.userId,
      showtimeId: order.showtimeId,
      cinemaId: order.showtime.room.cinemaId,
      source: order.source,
      status: isExpired ? 'EXPIRED' : order.status,
      refundStatus: order.refundStatus,
      snapshot: {
        movieTitle: order.movieTitleSnapshot,
        posterUrl: order.showtime.movie.posterUrl,
        ageRating: order.ageRatingSnapshot,
        cinemaName: order.cinemaNameSnapshot,
        cinemaAddress: order.cinemaAddressSnapshot,
        roomName: order.roomNameSnapshot,
        format: order.formatSnapshot,
        language: order.languageSnapshot,
        startTime: order.showtimeStartSnapshot.toISOString(),
        endTime: order.showtime.endTime.toISOString(),
      },
      items: order.items.map((i) => ({
        id: i.id,
        seatId: i.seatId,
        seatLabel: `${i.rowLabel}${i.seatNumber}`,
        seatType: i.seatType,
        price: i.price,
        ticket: i.ticket
          ? {
              ticketCode: i.ticket.ticketCode,
              status: i.ticket.status,
              checkedInAt: i.ticket.checkedInAt,
            }
          : null,
      })),
      ticketSubtotal: order.ticketSubtotal,
      comboSubtotal: order.comboSubtotal,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      currency: 'VND',
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      payments: order.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        method: p.method,
        txnRef: p.txnRef,
        amount: p.amount,
        status: p.status,
        paymentUrl: p.paymentUrl,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      })),
    };
  }

  /**
   * Lấy đơn hàng đang chờ thanh toán của người dùng (nếu có)
   */
  async getUserPendingOrder(userId: string, showtimeId?: string) {
    const where: any = {
      userId,
      status: 'PENDING_PAYMENT',
      expiresAt: { gt: new Date() },
    };
    if (showtimeId) {
      where.showtimeId = showtimeId;
    }

    const order = await prisma.order.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (!order) return null;
    return this.getOrderById(order.id, userId);
  }

  /**
   * Hủy đơn hàng và giải phóng ghế đã giữ
   */
  async cancelOrder(orderId: string, userId: string, reason = 'Người dùng hủy đơn') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('FORBIDDEN', 'Bạn không có quyền hủy đơn hàng này');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new ConflictError('ORDER_NOT_CANCELLABLE', 'Chỉ có thể hủy đơn hàng đang chờ thanh toán');
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      // Trả lại trạng thái ghế AVAILABLE
      await tx.showtimeSeat.updateMany({
        where: { orderId: order.id, status: 'HELD' },
        data: {
          status: 'AVAILABLE',
          orderId: null,
          holdExpiresAt: null,
        },
      });

      // Xóa guard
      await tx.pendingOrderGuard.deleteMany({
        where: { orderId: order.id },
      });

      // Hủy thanh toán đang chờ
      await tx.payment.updateMany({
        where: { orderId: order.id, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'Đơn hàng bị hủy' },
      });
    });

    return { success: true, message: 'Đã hủy đơn hàng và giải phóng ghế thành công' };
  }
}

export const orderService = new OrderService();
