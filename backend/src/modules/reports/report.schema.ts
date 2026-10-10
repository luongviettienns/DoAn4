import { z } from 'zod';

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number(value.slice(0, 4)) >= 1000 && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Ngày lịch không hợp lệ');

const dateFields = {
  fromDate: calendarDate.optional(),
  toDate: calendarDate.optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  cinemaId: z.string().uuid().optional(),
  movieId: z.string().uuid().optional(),
};

type DateQuery = { fromDate?: string; toDate?: string; from?: string; to?: string };
const dayMilliseconds = 24 * 60 * 60 * 1000;

export function vietnameseCalendarDay(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function calendarDates(query: DateQuery) {
  const toDate = query.toDate ?? query.to ?? vietnameseCalendarDay(new Date());
  const toTime = new Date(`${toDate}T00:00:00.000Z`).getTime();
  const fromDate = query.fromDate ?? query.from ?? (Number.isFinite(toTime)
    ? new Date(toTime - 6 * dayMilliseconds).toISOString().slice(0, 10)
    : toDate);
  return { fromDate, toDate };
}

function validateDateWindow(query: DateQuery, ctx: z.RefinementCtx) {
  const { fromDate, toDate } = calendarDates(query);
  const from = new Date(`${fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDate}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return;
  if (from > to) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fromDate'], message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc' });
  else if ((to - from) / dayMilliseconds + 1 > 366) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toDate'], message: 'Khoảng báo cáo tối đa 366 ngày' });
  }
}

/** Inclusive Vietnamese calendar dates become a half-open UTC timestamp range. */
export function reportDateRange(query: DateQuery) {
  const { fromDate, toDate } = calendarDates(query);
  return {
    from: new Date(`${fromDate}T00:00:00.000+07:00`),
    to: new Date(new Date(`${toDate}T00:00:00.000+07:00`).getTime() + dayMilliseconds),
  };
}

export const reportOverviewQuerySchema = z.object(dateFields).superRefine(validateDateWindow);

export type ReportOverviewQuery = z.infer<typeof reportOverviewQuerySchema>;

export const reportBreakdownQuerySchema = z.object({
  ...dateFields,
  type: z.enum(['DAILY', 'CINEMA', 'MOVIE']).default('DAILY'),
}).superRefine(validateDateWindow);

export type ReportBreakdownQuery = z.infer<typeof reportBreakdownQuerySchema>;

export const reportTopMoviesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(5),
});
