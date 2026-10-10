import prisma from '../../shared/prisma';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { assertCinemaScope, assertAdminForGlobal } from '../../shared/cinema-scope';
import type { AuthUser } from '../../middleware/auth.middleware';
import {
  ListPriceRulesQuery,
  UpsertPriceRuleInput,
  ListSeatSurchargesQuery,
  UpsertSeatSurchargeInput,
  CreateHolidayInput,
} from './pricing.schema';

export class PricingService {
  // ================= PRICE RULES =================
  async listPriceRules(query: ListPriceRulesQuery, actor?: AuthUser) {
    if (query.cinemaId && actor) {
      assertCinemaScope(actor, query.cinemaId, 'xem bảng giá');
    }

    return prisma.priceRule.findMany({
      where: {
        ...(query.cinemaId && { cinemaId: query.cinemaId }),
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upsertPriceRule(input: UpsertPriceRuleInput, actor: AuthUser) {
    assertCinemaScope(actor, input.cinemaId, 'cấu hình bảng giá');

    const effectiveFromDate = new Date(`${input.effectiveFrom}T00:00:00.000Z`);

    const rule = await prisma.priceRule.upsert({
      where: {
        cinemaId_roomFormat_dayType_timeSlot_effectiveFrom: {
          cinemaId: input.cinemaId,
          roomFormat: input.roomFormat,
          dayType: input.dayType,
          timeSlot: input.timeSlot,
          effectiveFrom: effectiveFromDate,
        },
      },
      create: {
        cinemaId: input.cinemaId,
        roomFormat: input.roomFormat,
        dayType: input.dayType,
        timeSlot: input.timeSlot,
        basePrice: input.basePrice,
        effectiveFrom: effectiveFromDate,
      },
      update: {
        basePrice: input.basePrice,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'PRICE_RULE_UPSERT',
        entity: 'PriceRule',
        entityId: rule.id,
        newValue: rule as any,
      },
    });

    return rule;
  }

  async deletePriceRule(id: string, actor: AuthUser) {
    const rule = await prisma.priceRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundError('PRICE_RULE_NOT_FOUND', 'Bảng giá không tồn tại');
    }

    assertCinemaScope(actor, rule.cinemaId, 'xóa bảng giá');

    const inUseCount = await prisma.orderItem.count({
      where: { priceRuleId: id },
    });
    if (inUseCount > 0) {
      throw new BadRequestError('PRICE_RULE_IN_USE', 'Bảng giá đang được tham chiếu bởi đơn hàng, không thể xóa');
    }

    await prisma.priceRule.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'PRICE_RULE_DELETE',
        entity: 'PriceRule',
        entityId: id,
        oldValue: rule as any,
      },
    });

    return { success: true, message: 'Đã xóa bảng giá thành công' };
  }

  // ================= SEAT SURCHARGES =================
  async listSeatSurcharges(query: ListSeatSurchargesQuery, actor?: AuthUser) {
    if (query.cinemaId && actor) {
      assertCinemaScope(actor, query.cinemaId, 'xem phụ thu ghế');
    }

    return prisma.seatSurcharge.findMany({
      where: {
        ...(query.cinemaId && { cinemaId: query.cinemaId }),
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upsertSeatSurcharge(input: UpsertSeatSurchargeInput, actor: AuthUser) {
    assertCinemaScope(actor, input.cinemaId, 'cấu hình phụ thu');

    const effectiveFromDate = new Date(`${input.effectiveFrom}T00:00:00.000Z`);

    const surcharge = await prisma.seatSurcharge.upsert({
      where: {
        cinemaId_seatType_effectiveFrom: {
          cinemaId: input.cinemaId,
          seatType: input.seatType,
          effectiveFrom: effectiveFromDate,
        },
      },
      create: {
        cinemaId: input.cinemaId,
        seatType: input.seatType,
        amount: input.amount,
        effectiveFrom: effectiveFromDate,
      },
      update: {
        amount: input.amount,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'SEAT_SURCHARGE_UPSERT',
        entity: 'SeatSurcharge',
        entityId: surcharge.id,
        newValue: surcharge as any,
      },
    });

    return surcharge;
  }

  async deleteSeatSurcharge(id: string, actor: AuthUser) {
    const surcharge = await prisma.seatSurcharge.findUnique({ where: { id } });
    if (!surcharge) {
      throw new NotFoundError('SEAT_SURCHARGE_NOT_FOUND', 'Mức phụ thu ghế không tồn tại');
    }

    assertCinemaScope(actor, surcharge.cinemaId, 'xóa phụ thu ghế');

    const inUseCount = await prisma.orderItem.count({
      where: { surchargeId: id },
    });
    if (inUseCount > 0) {
      throw new BadRequestError('SEAT_SURCHARGE_IN_USE', 'Mức phụ thu ghế đang được tham chiếu bởi đơn hàng, không thể xóa');
    }

    await prisma.seatSurcharge.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'SEAT_SURCHARGE_DELETE',
        entity: 'SeatSurcharge',
        entityId: id,
        oldValue: surcharge as any,
      },
    });

    return { success: true, message: 'Đã xóa mức phụ thu ghế thành công' };
  }

  // ================= HOLIDAYS =================
  async listHolidays() {
    return prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(input: CreateHolidayInput, actor: AuthUser) {
    assertAdminForGlobal(actor, 'ngày lễ');

    const holidayDate = new Date(`${input.date}T00:00:00.000Z`);

    const holiday = await prisma.holiday.upsert({
      where: { date: holidayDate },
      create: {
        date: holidayDate,
        name: input.name,
      },
      update: {
        name: input.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'HOLIDAY_UPSERT',
        entity: 'Holiday',
        entityId: holiday.id,
        newValue: holiday as any,
      },
    });

    return holiday;
  }

  async deleteHoliday(id: string, actor: AuthUser) {
    assertAdminForGlobal(actor, 'ngày lễ');

    const holiday = await prisma.holiday.findUnique({ where: { id } });
    if (!holiday) {
      throw new NotFoundError('HOLIDAY_NOT_FOUND', 'Ngày lễ không tồn tại');
    }

    await prisma.holiday.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'HOLIDAY_DELETE',
        entity: 'Holiday',
        entityId: id,
        oldValue: holiday as any,
      },
    });

    return { success: true, message: 'Đã xóa ngày lễ thành công' };
  }
}

export const pricingService = new PricingService();
export default pricingService;
