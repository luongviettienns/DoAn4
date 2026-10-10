import { Router } from 'express';
import { comboController } from './combo.controller';
import { optionalAuth, requireAuth, requireRoles } from '../../middleware/auth.middleware';

const router = Router();

// Public routes (with optional auth to detect manager/staff scope)
router.get('/', optionalAuth, (req, res, next) => comboController.handleListCombos(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => comboController.handleGetCombo(req, res, next));

// Admin & Manager routes
router.post(
  '/',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => comboController.handleCreateCombo(req, res, next)
);

router.put(
  '/:id',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => comboController.handleUpdateCombo(req, res, next)
);

router.delete(
  '/:id',
  requireAuth,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => comboController.handleDeleteCombo(req, res, next)
);

export default router;
