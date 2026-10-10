import { Request, Response, NextFunction } from 'express';
import { comboService } from './combo.service';
import { createComboSchema, updateComboSchema, comboQuerySchema } from './combo.schema';

export class ComboController {
  async handleListCombos(req: Request, res: Response, next: NextFunction) {
    try {
      const query = comboQuerySchema.parse(req.query);
      const combos = await comboService.listCombos(query, req.user);
      res.json({
        success: true,
        data: combos,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleGetCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const combo = await comboService.getComboById(id);
      res.json({
        success: true,
        data: combo,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleCreateCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createComboSchema.parse(req.body);
      const combo = await comboService.createCombo(input, req.user);
      res.status(201).json({
        success: true,
        data: combo,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleUpdateCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const input = updateComboSchema.parse(req.body);
      const combo = await comboService.updateCombo(id, input, req.user);
      res.json({
        success: true,
        data: combo,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  async handleDeleteCombo(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await comboService.deleteCombo(id, req.user);
      res.json({
        success: true,
        data: { message: 'Combo đã được ngừng kích hoạt thành công' },
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const comboController = new ComboController();
