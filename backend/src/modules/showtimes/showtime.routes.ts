import { Router } from 'express';
import { showtimeController } from './showtime.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', showtimeController.list);
router.get('/:id/seats', showtimeController.getSeats);

// Admin / Manager routes
router.post('/', authenticate, requireRole(Role.ADMIN, Role.MANAGER), showtimeController.create);

export default router;
