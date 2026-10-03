import { Router } from 'express';
import { paymentController } from './payment.controller';
import { optionalAuth } from '../../middleware/auth.middleware';

const router = Router();

// Callback công khai từ VNPay (theo chuẩn nhà cung cấp không mang JWT/CSRF)
router.get('/vnpay/ipn', (req, res, next) => paymentController.vnpayIpn(req, res, next));
router.get('/vnpay/return', (req, res, next) => paymentController.vnpayReturn(req, res, next));

// Endpoint kiểm thử sandbox mô phỏng thanh toán
router.post('/simulate-mock', optionalAuth, (req, res, next) => paymentController.simulateMock(req, res, next));

export default router;
