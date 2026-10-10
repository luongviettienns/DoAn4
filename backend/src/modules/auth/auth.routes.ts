import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordEmailLimiter,
  forgotPasswordIpLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
} from '../../middleware/rate-limit.middleware';

const router = Router();

// Public routes
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/google', loginLimiter, authController.googleLogin);
router.post('/google/complete', registerLimiter, authController.completeGoogleRegistration);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Password recovery & Email verification
router.post(
  '/forgot-password',
  forgotPasswordEmailLimiter,
  forgotPasswordIpLimiter,
  authController.forgotPassword
);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);
router.post('/verify-email', verifyEmailLimiter, authController.verifyEmail);
router.post(
  '/resend-verification',
  forgotPasswordEmailLimiter,
  forgotPasswordIpLimiter,
  authController.resendVerification
);

// Protected routes (require valid JWT access token)
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

export default router;
