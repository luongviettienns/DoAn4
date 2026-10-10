import { Router } from 'express';
import { workerService } from './worker.service';
import { sendSuccess } from '../../shared/response';
import { authenticate, requireRoles } from '../../middleware/auth.middleware';

const router = Router();

// Endpoint dọn dẹp đơn & ghế quá hạn (dùng cho cron trigger hoặc admin/test)
router.post('/sweep-expired', authenticate, requireRoles('ADMIN'), async (_req, res, next) => {
  try {
    const result = await workerService.sweepExpiredHolds();
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

export default router;
