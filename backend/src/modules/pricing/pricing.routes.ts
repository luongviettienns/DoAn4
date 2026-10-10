import { Router } from 'express';
import { pricingController } from './pricing.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

// ================= PRICE RULES =================
router.get('/rules', authenticate, requireRole(Role.ADMIN, Role.MANAGER), pricingController.listPriceRules);
router.post('/rules', authenticate, requireRole(Role.ADMIN, Role.MANAGER), pricingController.upsertPriceRule);
router.delete('/rules/:id', authenticate, requireRole(Role.ADMIN, Role.MANAGER), pricingController.deletePriceRule);

// ================= SEAT SURCHARGES =================
router.get('/surcharges', authenticate, requireRole(Role.ADMIN, Role.MANAGER), pricingController.listSeatSurcharges);
router.post('/surcharges', authenticate, requireRole(Role.ADMIN, Role.MANAGER), pricingController.upsertSeatSurcharge);
router.delete('/surcharges/:id', authenticate, requireRole(Role.ADMIN, Role.MANAGER), pricingController.deleteSeatSurcharge);

// ================= HOLIDAYS =================
router.get('/holidays', authenticate, pricingController.listHolidays);
router.post('/holidays', authenticate, requireRole(Role.ADMIN), pricingController.createHoliday);
router.delete('/holidays/:id', authenticate, requireRole(Role.ADMIN), pricingController.deleteHoliday);

export default router;
