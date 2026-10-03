import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes (require valid JWT access token)
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

export default router;
