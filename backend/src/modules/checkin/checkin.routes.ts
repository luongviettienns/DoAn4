import { Router } from 'express';
import { Role } from '@prisma/client';
import { checkinController } from './checkin.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

// Toàn bộ API soát vé F08 yêu cầu đăng nhập và có quyền STAFF, MANAGER hoặc ADMIN
router.use(authenticate, requireRole(Role.STAFF, Role.MANAGER, Role.ADMIN));

router.post('/', (req, res, next) => checkinController.checkin(req, res, next));
router.get('/stats', (req, res, next) => checkinController.getStats(req, res, next));
router.get('/history', (req, res, next) => checkinController.getHistory(req, res, next));

export default router;
