import { Router } from 'express';
import { voucherController } from './voucher.controller';
import { optionalAuth, requireAuth, requireRoles } from '../../middleware/auth.middleware';

const router = Router();

// Validation endpoint (can be called by authenticated users or guest)
router.post('/validate', optionalAuth, (req, res, next) => voucherController.handleValidateVoucher(req, res, next));

// Admin management
router.get(
  '/admin',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => voucherController.handleListVouchers(req, res, next)
);

router.get(
  '/admin/:id',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => voucherController.handleGetVoucher(req, res, next)
);

router.post(
  '/admin',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => voucherController.handleCreateVoucher(req, res, next)
);

router.put(
  '/admin/:id',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => voucherController.handleUpdateVoucher(req, res, next)
);

router.delete(
  '/admin/:id',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => voucherController.handleDeleteVoucher(req, res, next)
);

export default router;
