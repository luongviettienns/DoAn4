import { Request, Response, NextFunction } from 'express';
import { pricingService } from './pricing.service';
import {
  listPriceRulesQuerySchema,
  upsertPriceRuleSchema,
  listSeatSurchargesQuerySchema,
  upsertSeatSurchargeSchema,
  createHolidaySchema,
} from './pricing.schema';
import { sendSuccess } from '../../shared/response';

export class PricingController {
  // ================= PRICE RULES =================
  listPriceRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listPriceRulesQuerySchema.parse(req.query);
      const rules = await pricingService.listPriceRules(query, req.user);
      return sendSuccess(res, rules, 200);
    } catch (error) {
      next(error);
    }
  };

  upsertPriceRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = upsertPriceRuleSchema.parse(req.body);
      const rule = await pricingService.upsertPriceRule(validated, req.user!);
      return sendSuccess(res, rule, 200);
    } catch (error) {
      next(error);
    }
  };

  deletePriceRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await pricingService.deletePriceRule(id, req.user!);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  // ================= SEAT SURCHARGES =================
  listSeatSurcharges = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listSeatSurchargesQuerySchema.parse(req.query);
      const surcharges = await pricingService.listSeatSurcharges(query, req.user);
      return sendSuccess(res, surcharges, 200);
    } catch (error) {
      next(error);
    }
  };

  upsertSeatSurcharge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = upsertSeatSurchargeSchema.parse(req.body);
      const surcharge = await pricingService.upsertSeatSurcharge(validated, req.user!);
      return sendSuccess(res, surcharge, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteSeatSurcharge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await pricingService.deleteSeatSurcharge(id, req.user!);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  // ================= HOLIDAYS =================
  listHolidays = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const holidays = await pricingService.listHolidays();
      return sendSuccess(res, holidays, 200);
    } catch (error) {
      next(error);
    }
  };

  createHoliday = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createHolidaySchema.parse(req.body);
      const holiday = await pricingService.createHoliday(validated, req.user!);
      return sendSuccess(res, holiday, 200);
    } catch (error) {
      next(error);
    }
  };

  deleteHoliday = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const result = await pricingService.deleteHoliday(id, req.user!);
      return sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const pricingController = new PricingController();
export default pricingController;
