import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { resolveShowtimePricing } from '../../shared/showtime-pricing';
import prisma from '../../shared/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError, GoneError } from '../../shared/errors';
import { voucherService } from '../vouchers/voucher.service';
import type { CreateOrderInput, CounterOrderInput, UpdateOrderInput } from './order.schema';
import { qrSignatureService } from '../../shared/qr-signature.service';

const generateOrderCode = (): string => {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MV${yy}${mm}${dd}${random}`;
};

const generateTicketCode = (): string => {
  return 'TK' + crypto.randomBytes(5).toString('hex').toUpperCase();
};

export class OrderService {
  private async checkBookingEligibility(showtime: { startTime: Date; movie: { ageRating: string } }, ageConfirmed: boolean, birthDate?: Date | null) {
    const setting = await prisma.setting.findUnique({ where: { key: 'booking_lead_time_minutes' } });
    const leadMinutes = setting ? Number(setting.value) : 15;
    if (showtime.startTime.getTime() <= Date.now() + leadMinutes * 60_000) {
      throw new BadRequestError('BOOKING_CLOSED', 'Đã hết thời hạn đặt vé cho suất chiếu này');
    }
    const rating = showtime.movie.ageRating;
    if (rating === 'C') throw new BadRequestError('MOVIE_NOT_ALLOWED', 'Phim này không được phép đặt vé');
    const minimumAge = ({ T13: 13, T16: 16, T18: 18 } as Record<string, number>)[rating];
    if (!minimumAge) return;
    if (!ageConfirmed) throw new BadRequestError('AGE_CONFIRMATION_REQUIRED', 'Vui lòng xác nhận đủ tuổi xem phim');
    if (birthDate) {
      const today = new Date(Date.now() + 7 * 60 * 60_000);
      let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
      if (today.getUTCMonth() < birthDate.getUTCMonth()
        || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate())) age--;
      if (age < minimumAge) throw new BadRequestError('AGE_RESTRICTED', 'Bạn chưa đủ tuổi xem phim này');
    }
  }

  private async checkOrderAccess(cinemaId: string, ownerId: string | null, actorId?: string, actorRole?: string) {
    if (actorRole === 'ADMIN') return;
    if ((actorRole === 'STAFF' || actorRole === 'MANAGER') && actorId) {
      const assignment = await prisma.userCinema.findUnique({ where: { userId_cinemaId: { userId: actorId, cinemaId } } });
      if (assignment) return;
    } else if (actorId && ownerId === actorId) return;
    throw new ForbiddenError('FORBIDDEN', 'Bạn không có quyền thao tác với đơn hàng này');
  }
  /**
   * Tạo đơn đặt vé và giữ ghế trực tuyến (F03, F13)
   */
  async createOrder(userId: string, input: CreateOrderInput) {
    const { showtimeId, seatIds, ageConfirmed, combos, voucherCode } = input;

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
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${existingGuard.orderId} FOR UPDATE`;
        const currentOrder = await tx.order.findUnique({ where: { id: existingGuard.orderId } });
        if (currentOrder?.status === 'PENDING_PAYMENT' && currentOrder.expiresAt > new Date()) {
          throw new ConflictError('ACTIVE_PENDING_ORDER', 'Bạn đang có một đơn chờ thanh toán cho suất chiếu này');
        }
        await tx.pendingOrderGuard.deleteMany({ where: { orderId: existingGuard.orderId } });
        if (currentOrder?.status === 'PENDING_PAYMENT') {
          await tx.showtimeSeat.updateMany({
            where: { orderId: existingGuard.orderId, status: 'HELD' },
            data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
          });
          await tx.order.update({
            where: { id: existingGuard.orderId },
            data: { status: 'EXPIRED' },
          });
          await tx.payment.updateMany({ where: { orderId: currentOrder.id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
          await tx.voucherRedemption.updateMany({ where: { orderId: currentOrder.id, status: 'RESERVED' }, data: { status: 'RELEASED', releasedAt: new Date() } });
        }
      });
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
    await this.checkBookingEligibility(showtime, ageConfirmed, user.birthDate);

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
      if (seat.seatType === 'BLOCKED') throw new BadRequestError('INVALID_SEATS', 'Ghế này không mở bán');
      if (seat.status !== 'AVAILABLE') {
        throw new ConflictError(
          'SEAT_ALREADY_RESERVED',
          `Ghế ${seat.rowLabel}${seat.seatNumber} đã được đặt hoặc đang có người khác giữ chỗ`
        );
      }
    }

    const { priceRule, surchargeMap } = await resolveShowtimePricing(
      showtime.room.cinemaId, showtime.format, showtime.startTime
    );
    const seatItemsData = requestedSeats.map((slot) => {
      const surchargeInfo = surchargeMap.get(slot.seatType);
      if (!surchargeInfo) throw new BadRequestError('PRICE_NOT_CONFIGURED', 'Rạp chưa cấu hình phụ thu cho loại ghế này');
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

    // 7. Xử lý combos bắp nước (F13)
    let comboSubtotal = 0;
    const orderCombosData: Array<{
      comboId: string;
      nameSnapshot: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    if (combos && combos.length > 0) {
      const comboIds = combos.map((c) => c.comboId);
      const existingCombos = await prisma.combo.findMany({
        where: { id: { in: comboIds }, isActive: true,
          OR: [{ cinemas: { none: {} } }, { cinemas: { some: { cinemaId: showtime.room.cinemaId } } }],
        },
      });

      if (existingCombos.length !== comboIds.length) {
        throw new BadRequestError('INVALID_COMBOS', 'Một số combo bắp nước không tồn tại hoặc đã ngừng phục vụ');
      }

      for (const item of combos) {
        const found = existingCombos.find((c) => c.id === item.comboId)!;
        const lineTotal = found.price * item.quantity;
        comboSubtotal += lineTotal;
        orderCombosData.push({
          comboId: found.id,
          nameSnapshot: found.name,
          quantity: item.quantity,
          unitPrice: found.price,
          lineTotal,
        });
      }
    }

    // 8. Xử lý voucher giảm giá (F13)
    const subtotal = ticketSubtotal + comboSubtotal;
    let discount = 0;
    let voucherId: string | null = null;
    let voucherSnapshot: any = null;

    let total = subtotal;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút theo BR-01
    const orderCode = generateOrderCode();

    // 9. Thực hiện Transaction tạo đơn, tạo order_items, order_combos, cập nhật ghế sang HELD, đặt guard
    const createdOrder = await prisma.$transaction(async (tx) => {
      if (voucherCode) {
        const result = await voucherService.lockAndValidate(tx, voucherCode, subtotal, userId,
          showtime.room.cinemaId, { ticketSubtotal, comboSubtotal });
        discount = result.discount;
        voucherId = result.voucher.id;
        voucherSnapshot = result.voucher;
        total = subtotal - discount;
      }
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
          formatSnapshot: showtime.format,
          languageSnapshot: showtime.language,
          ageRatingSnapshot: showtime.movie.ageRating,
          ageConfirmedAt: ageConfirmed ? new Date() : null,
          ticketSubtotal,
          comboSubtotal,
          subtotal,
          discount,
          total,
          voucherId,
          voucherSnapshot: voucherSnapshot ? voucherSnapshot : undefined,
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

        const claimed = await tx.showtimeSeat.updateMany({
          where: { id: item.showtimeSeat.id, status: 'AVAILABLE', orderId: null },
          data: {
            status: 'HELD',
            orderId: order.id,
            holdExpiresAt: expiresAt,
          },
        });
        if (claimed.count !== 1) throw new ConflictError('SEAT_ALREADY_RESERVED', 'Ghế đã được người khác giữ hoặc mua');
      }

      // Tạo OrderCombo
      for (const comboItem of orderCombosData) {
        await tx.orderCombo.create({
          data: {
            orderId: order.id,
            comboId: comboItem.comboId,
            nameSnapshot: comboItem.nameSnapshot,
            quantity: comboItem.quantity,
            unitPrice: comboItem.unitPrice,
            lineTotal: comboItem.lineTotal,
          },
        });
      }

      // Giữ chỗ voucher
      if (voucherId) {
        await tx.voucherRedemption.create({
          data: {
            voucherId,
            orderId: order.id,
            userId,
            status: 'RESERVED',
            discount,
            reservedUntil: expiresAt,
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

    return this.getOrderById(createdOrder.id, userId);
  }

  /** Update the owner's live hold without renewing its original lease. */
  async updatePendingOrder(orderId: string, userId: string, input: UpdateOrderInput) {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          user: true, items: true, combos: true, voucher: true,
          showtime: { include: { movie: true, room: true } },
        },
      });
      if (!order) throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
      if (order.userId !== userId) throw new ForbiddenError('FORBIDDEN', 'Chỉ chủ đơn hàng được sửa lựa chọn giữ chỗ');
      if (order.status !== 'PENDING_PAYMENT') throw new ConflictError('ORDER_NOT_PENDING', 'Đơn hàng không còn chờ thanh toán');
      const now = new Date();
      if (order.expiresAt <= now) throw new GoneError('ORDER_EXPIRED', 'Thời gian giữ ghế đã hết hạn');
      if (await tx.payment.count({ where: { orderId, status: 'PENDING' } })) {
        throw new ConflictError('PAYMENT_IN_PROGRESS', 'Đã khởi tạo thanh toán, không thể sửa lựa chọn');
      }
      if (order.showtime.status !== 'OPEN') throw new BadRequestError('SHOWTIME_CLOSED', 'Suất chiếu không còn mở bán');
      const ageConfirmed = input.ageConfirmed ?? Boolean(order.ageConfirmedAt);
      await this.checkBookingEligibility(order.showtime, ageConfirmed, order.user?.birthDate);

      const voucherCode = input.voucherCode === undefined ? order.voucher?.code : input.voucherCode;
      // Use the same voucher-before-seat lock order as initial booking.
      const voucherCodes = [...new Set([order.voucher?.code, voucherCode].filter((code): code is string => Boolean(code)))].sort();
      if (voucherCodes.length) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM vouchers WHERE code IN (${Prisma.join(voucherCodes)}) ORDER BY id FOR UPDATE`);
      }

      const seatIds = input.seatIds ?? order.items.map(item => item.seatId);
      // Same ordering for competing edits avoids locking different slots in opposite order.
      const lockedSeatIds = [...new Set([...seatIds, ...order.items.map(item => item.seatId)])].sort();
      await tx.$queryRaw(Prisma.sql`SELECT id FROM showtime_seats WHERE showtime_id = ${order.showtimeId}
        AND seat_id IN (${Prisma.join(lockedSeatIds)}) ORDER BY id FOR UPDATE`);
      const slots = await tx.showtimeSeat.findMany({ where: { showtimeId: order.showtimeId, seatId: { in: seatIds } } });
      if (slots.length !== seatIds.length || slots.some(slot => slot.seatType === 'BLOCKED')) {
        throw new BadRequestError('INVALID_SEATS', 'Một số ghế không tồn tại hoặc không mở bán');
      }
      const existingItems = new Map(order.items.map(item => [item.seatId, item]));
      for (const slot of slots) {
        const retained = existingItems.has(slot.seatId);
        if (retained) {
          if (slot.status !== 'HELD' || slot.orderId !== orderId || !slot.holdExpiresAt || slot.holdExpiresAt <= now) {
            throw new ConflictError('SEAT_ALREADY_RESERVED', 'Ghế giữ chỗ không còn thuộc đơn hàng này');
          }
        } else {
          if (slot.status === 'HELD' && slot.holdExpiresAt && slot.holdExpiresAt <= now) {
            await tx.showtimeSeat.updateMany({
              where: { id: slot.id, status: 'HELD', holdExpiresAt: { lte: now } },
              data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
            });
          }
          const claimed = await tx.showtimeSeat.updateMany({
            where: { id: slot.id, status: 'AVAILABLE', orderId: null, seatType: { not: 'BLOCKED' } },
            data: { status: 'HELD', orderId, holdExpiresAt: order.expiresAt },
          });
          if (claimed.count !== 1) throw new ConflictError('SEAT_ALREADY_RESERVED', 'Ghế đã được người khác giữ hoặc mua');
        }
      }

      const addedSlots = slots.filter(slot => !existingItems.has(slot.seatId));
      const pricing = addedSlots.length ? await resolveShowtimePricing(order.showtime.room.cinemaId, order.showtime.format, order.showtime.startTime) : null;
      for (const slot of addedSlots) {
        const surcharge = pricing!.surchargeMap.get(slot.seatType);
        if (!surcharge) throw new BadRequestError('PRICE_NOT_CONFIGURED', 'Rạp chưa cấu hình phụ thu ghế');
        await tx.orderItem.create({ data: {
          orderId, showtimeSeatId: slot.id, showtimeId: order.showtimeId, seatId: slot.seatId,
          rowLabel: slot.rowLabel, seatNumber: slot.seatNumber, seatType: slot.seatType,
          x: slot.x, y: slot.y, columnSpan: slot.columnSpan,
          basePrice: pricing!.priceRule.basePrice, surcharge: surcharge.amount,
          price: pricing!.priceRule.basePrice + surcharge.amount,
          priceRuleId: pricing!.priceRule.id, surchargeId: surcharge.id,
        } });
      }
      const removedIds = order.items.filter(item => !seatIds.includes(item.seatId)).map(item => item.id);
      if (removedIds.length) {
        await tx.orderItem.deleteMany({ where: { orderId, id: { in: removedIds } } });
        await tx.showtimeSeat.updateMany({
          where: { orderId, status: 'HELD', seatId: { notIn: seatIds } },
          data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
        });
      }

      if (input.combos !== undefined) {
        const requestedIds = input.combos.map(item => item.comboId);
        const catalog = await tx.combo.findMany({ where: {
          id: { in: requestedIds }, isActive: true,
          OR: [{ cinemas: { none: {} } }, { cinemas: { some: { cinemaId: order.showtime.room.cinemaId } } }],
        } });
        if (catalog.length !== requestedIds.length) throw new BadRequestError('INVALID_COMBOS', 'Một số combo không khả dụng tại rạp này');
        await tx.orderCombo.deleteMany({ where: { orderId, comboId: { notIn: requestedIds } } });
        for (const item of input.combos) {
          const existing = order.combos.find(current => current.comboId === item.comboId);
          const product = catalog.find(current => current.id === item.comboId)!;
          const unitPrice = existing?.unitPrice ?? product.price;
          await tx.orderCombo.upsert({
            where: { orderId_comboId: { orderId, comboId: item.comboId } },
            update: { quantity: item.quantity, lineTotal: unitPrice * item.quantity },
            create: { orderId, comboId: item.comboId, nameSnapshot: product.name, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity },
          });
        }
      }
      const items = await tx.orderItem.findMany({ where: { orderId }, select: { price: true } });
      const combos = await tx.orderCombo.findMany({ where: { orderId }, select: { lineTotal: true } });
      const ticketSubtotal = items.reduce((sum, item) => sum + item.price, 0);
      const comboSubtotal = combos.reduce((sum, item) => sum + item.lineTotal, 0);
      const subtotal = ticketSubtotal + comboSubtotal;
      let voucherId: string | null = null;
      let voucherSnapshot: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
      let discount = 0;
      // READ COMMITTED keeps counts fresh after waiting for the voucher parent lock.
      if (voucherCode) {
        const validated = await voucherService.lockAndValidate(tx, voucherCode, subtotal, userId,
          order.showtime.room.cinemaId, { ticketSubtotal, comboSubtotal }, orderId);
        voucherId = validated.voucher.id;
        voucherSnapshot = validated.voucher;
        discount = validated.discount;
      }
      if (order.expiresAt <= new Date()) throw new GoneError('ORDER_EXPIRED', 'Thời gian giữ ghế đã hết hạn');
      await tx.voucherRedemption.updateMany({
        where: { orderId, status: 'RESERVED', ...(voucherId ? { voucherId: { not: voucherId } } : {}) },
        data: { status: 'RELEASED', releasedAt: now },
      });
      if (voucherId) {
        await tx.voucherRedemption.upsert({
          where: { orderId_voucherId: { orderId, voucherId } },
          update: { status: 'RESERVED', discount, reservedUntil: order.expiresAt, releasedAt: null },
          create: { orderId, voucherId, userId, status: 'RESERVED', discount, reservedUntil: order.expiresAt },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: {
        ticketSubtotal, comboSubtotal, subtotal, discount, total: subtotal - discount, voucherId, voucherSnapshot,
        ...(input.ageConfirmed !== undefined ? { ageConfirmedAt: ageConfirmed ? order.ageConfirmedAt ?? now : null } : {}),
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 });
    return this.getOrderById(orderId, userId);
  }

  /**
   * Bán vé trực tiếp tại quầy (F07 - Counter Ticket Sales)
   * Tạo đơn, thanh toán tiền mặt/POS tức thì và xuất vé sẵn sàng in
   */
  async createCounterOrder(staffUserId: string, input: CounterOrderInput) {
    const { showtimeId, seatIds, customerName, customerPhone, customerEmail, paymentMethod, combos, voucherCode } = input;

    // 1. Kiểm tra nhân viên và quyền hạn
    const staff = await prisma.user.findUnique({
      where: { id: staffUserId },
      include: { cinemaAssignments: true },
    });

    if (!staff || (staff.role !== 'STAFF' && staff.role !== 'MANAGER' && staff.role !== 'ADMIN')) {
      throw new ForbiddenError('FORBIDDEN', 'Chỉ nhân viên hoặc quản lý mới có quyền bán vé tại quầy');
    }

    // 2. Kiểm tra suất chiếu
    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        room: { include: { cinema: true } },
      },
    });

    if (!showtime) {
      throw new NotFoundError('SHOWTIME_NOT_FOUND', 'Suất chiếu không tồn tại');
    }

    if (showtime.status !== 'OPEN') {
      throw new BadRequestError('SHOWTIME_CLOSED', 'Suất chiếu đã kết thúc hoặc không mở bán');
    }

    // Kiểm tra phạm vi rạp của nhân viên
    if (staff.role !== 'ADMIN') {
      const allowedCinemaIds = staff.cinemaAssignments.map((a) => a.cinemaId);
      if (!allowedCinemaIds.includes(showtime.room.cinemaId)) {
        throw new ForbiddenError('CINEMA_ACCESS_DENIED', 'Bạn không có quyền bán vé cho cụm rạp này');
      }
    }

    // 3. Kiểm tra ghế
    await prisma.showtimeSeat.updateMany({
      where: { showtimeId, status: 'HELD', holdExpiresAt: { lte: new Date() } },
      data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
    });
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
      if (seat.seatType === 'BLOCKED') throw new BadRequestError('INVALID_SEATS', 'Ghế này không mở bán');
      if (seat.status !== 'AVAILABLE') {
        throw new ConflictError(
          'SEAT_ALREADY_RESERVED',
          `Ghế ${seat.rowLabel}${seat.seatNumber} đã được đặt hoặc đang có người khác giữ chỗ`
        );
      }
    }

    const { priceRule, surchargeMap } = await resolveShowtimePricing(
      showtime.room.cinemaId, showtime.format, showtime.startTime
    );
    const seatItemsData = requestedSeats.map((slot) => {
      const surchargeInfo = surchargeMap.get(slot.seatType);
      if (!surchargeInfo) throw new BadRequestError('PRICE_NOT_CONFIGURED', 'Rạp chưa cấu hình phụ thu cho loại ghế này');
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

    // 5. Combos
    let comboSubtotal = 0;
    const orderCombosData: Array<{
      comboId: string;
      nameSnapshot: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }> = [];

    if (combos && combos.length > 0) {
      const comboIds = combos.map((c) => c.comboId);
      const existingCombos = await prisma.combo.findMany({
        where: { id: { in: comboIds }, isActive: true,
          OR: [{ cinemas: { none: {} } }, { cinemas: { some: { cinemaId: showtime.room.cinemaId } } }],
        },
      });

      if (existingCombos.length !== comboIds.length) {
        throw new BadRequestError('INVALID_COMBOS', 'Một số combo không khả dụng tại rạp này');
      }

      for (const item of combos) {
        const found = existingCombos.find((c) => c.id === item.comboId);
        if (found) {
          const lineTotal = found.price * item.quantity;
          comboSubtotal += lineTotal;
          orderCombosData.push({
            comboId: found.id,
            nameSnapshot: found.name,
            quantity: item.quantity,
            unitPrice: found.price,
            lineTotal,
          });
        }
      }
    }

    // 6. Voucher
    const subtotal = ticketSubtotal + comboSubtotal;
    let discount = 0;
    let voucherId: string | null = null;
    let voucherSnapshot: any = null;

    let total = subtotal;
    const orderCode = generateOrderCode();
    const paidAt = new Date();
    let pointsEarned = Math.floor(total / 10000);

    // Tìm xem số điện thoại có trùng khách hàng thành viên không
    const memberUser = customerPhone ? await prisma.user.findFirst({ where: { phone: customerPhone } }) : null;
    if (voucherCode && !memberUser) {
      throw new BadRequestError('VOUCHER_MEMBER_REQUIRED', 'Cần nhận diện tài khoản thành viên để áp dụng voucher tại quầy');
    }
    await this.checkBookingEligibility(showtime, input.ageConfirmed, memberUser?.birthDate);

    // 7. Transaction tạo đơn counter, thanh toán thành công, bán vé ngay lập tức
    const createdOrder = await prisma.$transaction(async (tx) => {
      if (voucherCode) {
        const result = await voucherService.lockAndValidate(tx, voucherCode, subtotal, memberUser?.id,
          showtime.room.cinemaId, { ticketSubtotal, comboSubtotal });
        discount = result.discount;
        voucherId = result.voucher.id;
        voucherSnapshot = result.voucher;
        total = subtotal - discount;
        pointsEarned = Math.floor(total / 10000);
      }
      const order = await tx.order.create({
        data: {
          code: orderCode,
          userId: memberUser ? memberUser.id : null,
          showtimeId,
          source: 'COUNTER',
          status: 'PAID',
          paidAt,
          createdBy: staffUserId,
          customerName: customerName || (memberUser ? memberUser.fullName : 'Khách mua tại quầy'),
          customerEmail: customerEmail || (memberUser ? memberUser.email : null),
          customerPhone: customerPhone || (memberUser ? memberUser.phone : null),
          movieTitleSnapshot: showtime.movie.title,
          cinemaNameSnapshot: showtime.room.cinema.name,
          cinemaAddressSnapshot: showtime.room.cinema.address,
          roomNameSnapshot: showtime.room.name,
          showtimeStartSnapshot: showtime.startTime,
          formatSnapshot: showtime.format,
          languageSnapshot: showtime.language,
          ageRatingSnapshot: showtime.movie.ageRating,
          ageConfirmedAt: new Date(),
          ticketSubtotal,
          comboSubtotal,
          subtotal,
          discount,
          total,
          voucherId,
          voucherSnapshot: voucherSnapshot ? voucherSnapshot : undefined,
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          pointsEarned,
        },
      });

      // Tạo OrderItems và phát hành Ticket ngay
      for (const item of seatItemsData) {
        const orderItem = await tx.orderItem.create({
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

        // Cập nhật ghế sang SOLD
        const claimed = await tx.showtimeSeat.updateMany({
          where: { id: item.showtimeSeat.id, status: 'AVAILABLE', orderId: null },
          data: {
            status: 'SOLD',
            orderId: order.id,
            holdExpiresAt: null,
          },
        });
        if (claimed.count !== 1) throw new ConflictError('SEAT_ALREADY_RESERVED', 'Ghế đã được người khác giữ hoặc mua');

        // Tạo Vé
        const ticketCode = generateTicketCode();
        await tx.ticket.create({
          data: {
            ticketCode,
            orderItemId: orderItem.id,
            orderId: order.id,
            showtimeId: showtime.id,
            seatId: item.showtimeSeat.seatId,
            status: 'VALID',
            qrKeyVersion: 1,
          },
        });
      }

      // Tạo Combos
      for (const comboItem of orderCombosData) {
        await tx.orderCombo.create({
          data: {
            orderId: order.id,
            comboId: comboItem.comboId,
            nameSnapshot: comboItem.nameSnapshot,
            quantity: comboItem.quantity,
            unitPrice: comboItem.unitPrice,
            lineTotal: comboItem.lineTotal,
          },
        });
      }

      // Ghi nhận voucher consumed
      if (voucherId) {
        await tx.voucherRedemption.create({
          data: {
            voucherId,
            orderId: order.id,
            userId: memberUser ? memberUser.id : staffUserId,
            status: 'CONSUMED',
            discount,
            reservedUntil: paidAt,
            consumedAt: paidAt,
          },
        });
      }

      // Tạo Payment COUNTER
      // chk_payments_cash: Nếu CASH phải cung cấp cashReceived >= amount và cashChange = cashReceived - amount
      const isCash = paymentMethod === 'CASH';
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          attemptNo: 1,
          provider: 'COUNTER',
          method: paymentMethod === 'POS' ? 'CARD' : paymentMethod,
          txnRef: `${orderCode}-COUNTER`,
          amount: total,
          status: 'SUCCESS',
          paidAt,
          gatewayTxnNo: `${orderCode}_${Date.now()}`,
          requestExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          ...(isCash ? { cashReceived: total, cashChange: 0 } : {}),
        },
      });

      // Gắn settledPaymentId
      await tx.order.update({
        where: { id: order.id },
        data: { settledPaymentId: payment.id },
      });

      // Tích điểm nếu là thành viên
      if (memberUser && pointsEarned > 0) {
        await tx.user.update({
          where: { id: memberUser.id },
          data: { points: { increment: pointsEarned } },
        });
      }

      return order;
    });

    return this.getOrderById(createdOrder.id, staffUserId, staff.role);
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
        combos: true,
        voucher: true,
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

    await this.checkOrderAccess(order.showtime.room.cinemaId, order.userId, currentUserId, currentUserRole);

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
      customerName: order.customerName,
      customerPhone: order.customerPhone,
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
              id: i.ticket.id,
              ticketCode: i.ticket.ticketCode,
              qrCode: qrSignatureService.signTicketCode(i.ticket.ticketCode, i.ticket.qrKeyVersion || 1),
              status: i.ticket.status,
              checkedInAt: i.ticket.checkedInAt,
            }
          : null,
      })),
      combos: order.combos.map((c) => ({
        id: c.id,
        comboId: c.comboId,
        name: c.nameSnapshot,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        lineTotal: c.lineTotal,
      })),
      voucher: order.voucher
        ? {
            code: order.voucher.code,
            name: order.voucher.name,
            discount: order.discount,
          }
        : null,
      ticketSubtotal: order.ticketSubtotal,
      comboSubtotal: order.comboSubtotal,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      currency: 'VND',
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
      cancellationReason: order.cancellationReason,
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
   * Hủy và hoàn tiền đơn hàng (F03, F16)
   * Cho phép hủy đơn giữ chỗ hoặc hoàn hủy vé đã mua trước giờ chiếu >= 60 phút
   */
  async cancelOrder(orderId: string, currentUserId: string, currentUserRole?: string, reason = 'Yêu cầu hủy đơn', pendingOnly = false) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { showtime: { include: { room: true } }, items: { include: { ticket: true } } },
      });
      if (!order) throw new NotFoundError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại');
      await this.checkOrderAccess(order.showtime.room.cinemaId, order.userId, currentUserId, currentUserRole);
      if (pendingOnly && order.status !== 'PENDING_PAYMENT') {
        throw new ConflictError('ORDER_NOT_PENDING', 'Đơn hàng không còn chờ thanh toán');
      }
      if (order.status === 'CANCELLED') return { success: true, message: 'Đơn hàng đã được hủy' };
      const paid = order.status === 'PAID';
      if (!paid && order.status !== 'PENDING_PAYMENT') {
        throw new BadRequestError('CANNOT_CANCEL_ORDER', `Không thể hủy đơn hàng ở trạng thái ${order.status}`);
      }
      if (paid) {
        const setting = await tx.setting.findUnique({ where: { key: 'cancellation_lead_time_hours' } });
        const leadHours = setting ? Number(setting.value) : 2;
        const isStaff = currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER' || currentUserRole === 'STAFF';
        if (!isStaff && order.showtime.startTime.getTime() - Date.now() < leadHours * 3_600_000) {
          throw new BadRequestError('CANCELLATION_TOO_LATE', 'Chỉ có thể hủy vé trước giờ chiếu tối thiểu 2 giờ');
        }
        if (order.items.some(item => item.ticket?.status === 'USED')) {
          throw new BadRequestError('TICKET_ALREADY_USED', 'Không thể hủy đơn vé đã qua cửa soát vé');
        }
        const cancelledTickets = await tx.ticket.updateMany({
          where: { orderId, status: 'VALID' }, data: { status: 'CANCELLED' },
        });
        if (cancelledTickets.count !== order.items.length) {
          throw new ConflictError('TICKET_ALREADY_USED', 'Vé đã được soát hoặc không còn hợp lệ');
        }
        if (!order.settledPaymentId) throw new ConflictError('PAYMENT_NOT_SETTLED', 'Không tìm thấy thanh toán đã xác nhận');
        await tx.refundRequest.upsert({
          where: { paymentId: order.settledPaymentId }, update: {},
          create: {
            orderId, paymentId: order.settledPaymentId, reason: 'ORDER_CANCELLED', status: 'PENDING',
            amount: order.total, requestedBy: currentUserId, policySnapshot: { leadHours, reason },
          },
        });
        if (order.userId && order.pointsEarned > 0) {
          await tx.user.update({ where: { id: order.userId }, data: { points: { decrement: order.pointsEarned } } });
        }
      }
      await tx.order.update({ where: { id: orderId }, data: {
        status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason,
        ...(paid ? { refundStatus: 'PENDING' } : {}),
      } });
      await tx.showtimeSeat.updateMany({
        where: { orderId, status: paid ? 'SOLD' : 'HELD' },
        data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
      });
      await tx.pendingOrderGuard.deleteMany({ where: { orderId } });
      await tx.voucherRedemption.updateMany({ where: { orderId }, data: { status: 'RELEASED', releasedAt: new Date() } });
      await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: 'FAILED', failureReason: 'Đơn hàng bị hủy' } });
      return { success: true, message: paid ? 'Đã hủy vé và ghi nhận yêu cầu hoàn tiền' : 'Đã hủy đơn hàng giữ chỗ' };
    });
  }
  /**
   * Lịch sử đơn hàng và vé của người dùng (F06)
   */
  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              ticket: true,
            },
          },
          combos: true,
          voucher: true,
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
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ...(() => {
        const mapped = orders.map((order) => {
          const isExpired = order.status === 'PENDING_PAYMENT' && order.expiresAt <= new Date();
          return {
            id: order.id,
            code: order.code,
            source: order.source,
            status: isExpired ? 'EXPIRED' : order.status,
            refundStatus: order.refundStatus,
            movieTitle: order.movieTitleSnapshot,
            posterUrl: order.showtime.movie.posterUrl,
            cinemaName: order.cinemaNameSnapshot,
            roomName: order.roomNameSnapshot,
            showtimeStart: order.showtimeStartSnapshot.toISOString(),
            seats: order.items.map((i) => `${i.rowLabel}${i.seatNumber}`),
            combos: order.combos.map((c) => `${c.nameSnapshot} x${c.quantity}`),
            ticketCount: order.items.length,
            total: order.total,
            discount: order.discount,
            paidAt: order.paidAt ? order.paidAt.toISOString() : null,
            createdAt: order.createdAt.toISOString(),
            // items with ticket detail for F06 history
            items: order.items.map((i) => ({
              id: i.id,
              seatLabel: `${i.rowLabel}${i.seatNumber}`,
              seatType: i.seatType,
              price: i.price,
              ticket: i.ticket
                ? {
                    id: i.ticket.id,
                    ticketCode: i.ticket.ticketCode,
                    qrCode: qrSignatureService.signTicketCode(i.ticket.ticketCode, i.ticket.qrKeyVersion || 1),
                    status: i.ticket.status,
                    checkedInAt: i.ticket.checkedInAt ? i.ticket.checkedInAt.toISOString() : null,
                  }
                : null,
            })),
            tickets: order.items
              .filter((i) => i.ticket !== null)
              .map((i) => ({
                ticketCode: i.ticket!.ticketCode,
                qrCode: qrSignatureService.signTicketCode(i.ticket!.ticketCode, i.ticket!.qrKeyVersion || 1),
                status: i.ticket!.status,
                seatLabel: `${i.rowLabel}${i.seatNumber}`,
                checkedInAt: i.ticket!.checkedInAt ? i.ticket!.checkedInAt.toISOString() : null,
              })),
          };
        });
        return { items: mapped, data: mapped };
      })(),
    };
  }
}

export const orderService = new OrderService();
