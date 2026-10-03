import { Router } from 'express';
import { cinemaController } from './cinema.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', cinemaController.list);
router.get('/:id', cinemaController.getById);
router.get('/rooms/:roomId/seats', cinemaController.getRoomSeats);

// Admin / Manager routes
router.post('/', authenticate, requireRole(Role.ADMIN), cinemaController.createCinema);
router.post('/rooms', authenticate, requireRole(Role.ADMIN, Role.MANAGER), cinemaController.createRoom);

export default router;
