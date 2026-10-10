import { DayType, RoomFormat, SeatType, TimeSlot } from '@prisma/client';
import prisma from './prisma';
import { BadRequestError } from './errors';

/** DATE values represent Vietnam calendar dates, while showtime timestamps are UTC. */
export async function resolveShowtimePricing(cinemaId: string, format: RoomFormat, startTime: Date) {
  const vietnamTime = new Date(startTime.getTime() + 7 * 60 * 60_000);
  const date = new Date(`${vietnamTime.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const holiday = await prisma.holiday.findUnique({ where: { date } });
  const weekday = vietnamTime.getUTCDay();
  const dayType = holiday ? DayType.HOLIDAY : weekday === 0 || weekday === 6 ? DayType.WEEKEND : DayType.WEEKDAY;
  const hour = vietnamTime.getUTCHours();
  const timeSlot = hour < 12 ? TimeSlot.MORNING : hour < 17 ? TimeSlot.AFTERNOON : TimeSlot.EVENING;

  const [priceRule, surcharges] = await Promise.all([
    prisma.priceRule.findFirst({
      where: { cinemaId, roomFormat: format, dayType, timeSlot, effectiveFrom: { lte: date } },
      orderBy: { effectiveFrom: 'desc' },
    }),
    prisma.seatSurcharge.findMany({
      where: { cinemaId, seatType: { not: SeatType.BLOCKED }, effectiveFrom: { lte: date } },
      orderBy: { effectiveFrom: 'desc' },
    }),
  ]);

  if (!priceRule) {
    throw new BadRequestError('PRICE_NOT_CONFIGURED', 'Rạp chưa cấu hình giá vé phù hợp với suất chiếu');
  }

  const surchargeMap = new Map<SeatType, { id: string; amount: number }>();
  for (const surcharge of surcharges) {
    if (!surchargeMap.has(surcharge.seatType)) {
      surchargeMap.set(surcharge.seatType, { id: surcharge.id, amount: surcharge.amount });
    }
  }
  return { priceRule, surchargeMap };
}
