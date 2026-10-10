import { Router } from 'express';
import { reportController } from './report.controller';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();

// Toàn bộ các route báo cáo dành cho ADMIN và MANAGER
router.get(
  '/overview',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => reportController.handleGetOverview(req, res, next)
);

router.get(
  '/export',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => reportController.handleExport(req, res, next)
);

router.get(
  '/',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => reportController.handleGetBreakdown(req, res, next)
);

router.get(
  '/top-movies',
  authenticate,
  requireRoles('ADMIN', 'MANAGER'),
  (req, res, next) => reportController.handleGetTopMovies(req, res, next)
);

export default router;
