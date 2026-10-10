import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { reportOverviewQuerySchema, reportBreakdownQuerySchema, reportTopMoviesQuerySchema } from './report.schema';
import { ForbiddenError } from '../../shared/errors';

export class ReportController {
  private cinemaScope(req: Request) {
    if (req.user?.role !== 'MANAGER') return undefined;
    if (!req.user.cinemaIds.length) throw new ForbiddenError('CINEMA_SCOPE_FORBIDDEN', 'Bạn chưa được phân công quản lý rạp');
    return req.user.cinemaIds;
  }

  async handleGetOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const query = reportOverviewQuerySchema.parse(req.query);
      const data = await reportService.getOverview(query, this.cinemaScope(req));
      res.json({
        success: true,
        data,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleGetBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const query = reportBreakdownQuerySchema.parse(req.query);
      const data = await reportService.getBreakdown(query, this.cinemaScope(req));
      res.json({
        success: true,
        data,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleGetTopMovies(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = reportTopMoviesQuerySchema.parse(req.query);
      const data = await reportService.getTopMovies(limit, this.cinemaScope(req));
      res.json({
        success: true,
        data,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleExport(req: Request, res: Response, next: NextFunction) {
    try {
      const query = reportBreakdownQuerySchema.parse(req.query);
      const csv = await reportService.exportBreakdownCsv(query, this.cinemaScope(req));
      const fromPart = query.fromDate || query.from || 'all';
      const toPart = query.toDate || query.to || 'all';
      const filename = `bao-cao-doanh-thu-${query.type.toLowerCase()}-${fromPart}-${toPart}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
