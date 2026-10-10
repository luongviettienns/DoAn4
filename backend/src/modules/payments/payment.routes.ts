import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { idempotency } from '../../middleware/idempotency.middleware';
import { NotFoundError } from '../../shared/errors';

const router = Router();

// Callback công khai từ VNPay (theo chuẩn nhà cung cấp không mang JWT/CSRF)
router.get('/vnpay/ipn', (req, res, next) => paymentController.vnpayIpn(req, res, next));
router.get('/vnpay/return', (req, res, next) => paymentController.vnpayReturn(req, res, next));

// Endpoint kiểm thử sandbox mô phỏng thanh toán
const simulationEnabled = (_req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return next(new NotFoundError('SIMULATION_DISABLED', 'Không tìm thấy tài nguyên'));
  }
  next();
};
router.post('/simulate-mock', simulationEnabled, authenticate, idempotency('payments.simulate'), (req, res, next) => paymentController.simulateMock(req, res, next));
router.post('/simulate-success', simulationEnabled, authenticate, idempotency('payments.simulate'), (req, res, next) => paymentController.simulateMock(req, res, next));
router.post('/simulate/:orderId', simulationEnabled, authenticate, idempotency('payments.simulate'), (req, res, next) => paymentController.simulateMock(req, res, next));

export default router;
