import { Router } from 'express';
import { refundController } from './refund.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();

// Toàn bộ route hoàn tiền dành cho ADMIN và MANAGER
router.get(
  '/',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => refundController.handleList(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => refundController.handleGetById(req, res, next)
);

router.post(
  '/:id/process',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => refundController.handleProcess(req, res, next)
);

export default router;
