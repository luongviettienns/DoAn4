import { Router } from 'express';
import { movieController } from './movie.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public endpoints
router.get('/', movieController.list);
router.get('/:id', movieController.getById);

// Admin / Manager endpoints
router.post('/', authenticate, requireRole(Role.ADMIN, Role.MANAGER), movieController.create);
router.put('/:id', authenticate, requireRole(Role.ADMIN, Role.MANAGER), movieController.update);
router.delete('/:id', authenticate, requireRole(Role.ADMIN, Role.MANAGER), movieController.delete);

export default router;
