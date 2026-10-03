import { Router } from 'express';
import { orderController } from './order.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Tất cả các thao tác đặt vé khách hàng đều yêu cầu xác thực JWT (F01 + F03)
router.post('/', authenticate, (req, res, next) => orderController.create(req, res, next));
router.get('/pending', authenticate, (req, res, next) => orderController.getPending(req, res, next));
router.get('/:id', authenticate, (req, res, next) => orderController.getById(req, res, next));
router.post('/:id/pay', authenticate, (req, res, next) => orderController.pay(req, res, next));
router.post('/:id/cancel', authenticate, (req, res, next) => orderController.cancel(req, res, next));

export default router;
