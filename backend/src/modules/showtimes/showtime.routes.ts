import { Router } from 'express';
import { showtimeController } from './showtime.controller';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', showtimeController.list);
router.get('/:id/seats', optionalAuth, showtimeController.getSeats);

// Admin / Manager / Staff routes
router.post('/', authenticate, requireRole(Role.ADMIN, Role.MANAGER), showtimeController.create);
router.post('/:id/cancel', authenticate, requireRole(Role.ADMIN, Role.MANAGER, Role.STAFF), showtimeController.cancel);

export default router;
