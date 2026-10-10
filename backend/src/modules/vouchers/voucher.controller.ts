import { Request, Response, NextFunction } from 'express';
import { voucherService } from './voucher.service';
import { validateVoucherSchema, createVoucherSchema, updateVoucherSchema, voucherQuerySchema } from './voucher.schema';

export class VoucherController {
  async handleValidateVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, orderAmount, cinemaId } = validateVoucherSchema.parse(req.body);
      const userId = (req as any).user?.id;
      const result = await voucherService.validateVoucher(code, orderAmount, userId, cinemaId);
      res.json({
        success: true,
        data: result,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleListVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = voucherQuerySchema.parse(req.query);
      const vouchers = await voucherService.listVouchers(query, req.user);
      res.json({
        success: true,
        data: vouchers,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleGetVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const voucher = await voucherService.getVoucherById(id);
      res.json({
        success: true,
        data: voucher,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleCreateVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createVoucherSchema.parse(req.body);
      const voucher = await voucherService.createVoucher(input, req.user);
      res.status(201).json({
        success: true,
        data: voucher,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleUpdateVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const input = updateVoucherSchema.parse(req.body);
      const voucher = await voucherService.updateVoucher(id, input, req.user);
      res.json({
        success: true,
        data: voucher,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleDeleteVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await voucherService.deleteVoucher(id, req.user);
      res.json({
        success: true,
        data: { message: 'Voucher đã được xóa hoặc ngừng kích hoạt thành công' },
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const voucherController = new VoucherController();
