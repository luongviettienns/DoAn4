import prisma from '../../shared/prisma';
import { NotFoundError } from '../../shared/errors';
import type { CreateComboInput, UpdateComboInput } from './combo.schema';
import { AuthUser } from '../../middleware/auth.middleware';
import { assertAdminForGlobal, assertCinemaScopeMulti } from '../../shared/cinema-scope';
import { Role } from '@prisma/client';

export class ComboService {
  async listCombos(query?: { cinemaId?: string; activeOnly?: boolean }, actor?: AuthUser) {
    const whereClause: any = {};
    if (query?.activeOnly !== false) {
      whereClause.isActive = true;
    }

    if (actor && (actor.role === Role.MANAGER || actor.role === Role.STAFF)) {
      if (query?.cinemaId) {
        assertCinemaScopeMulti(actor, [query.cinemaId], 'xem combo');
        whereClause.OR = [
          { cinemas: { none: {} } },
          { cinemas: { some: { cinemaId: query.cinemaId } } },
        ];
      } else {
        if (actor.cinemaIds.length === 0) {
          whereClause.cinemas = { none: {} };
        } else {
          whereClause.OR = [
            { cinemas: { none: {} } },
            { cinemas: { some: { cinemaId: { in: actor.cinemaIds } } } },
          ];
        }
      }
    } else if (query?.cinemaId) {
      whereClause.OR = [
        { cinemas: { none: {} } }, // Áp dụng toàn hệ thống
        { cinemas: { some: { cinemaId: query.cinemaId } } },
      ];
    }

    return prisma.combo.findMany({
      where: whereClause,
      include: {
        cinemas: {
          include: { cinema: true },
        },
      },
      orderBy: { price: 'asc' },
    });
  }

  async getComboById(id: string) {
    const combo = await prisma.combo.findUnique({
      where: { id },
      include: {
        cinemas: {
          include: { cinema: true },
        },
      },
    });

    if (!combo) {
      throw new NotFoundError('COMBO_NOT_FOUND', 'Combo bắp nước không tồn tại');
    }
    return combo;
  }

  async createCombo(input: CreateComboInput, actor?: AuthUser) {
    const { cinemaIds, ...data } = input;

    if (actor) {
      if (!cinemaIds || cinemaIds.length === 0) {
        assertAdminForGlobal(actor, 'combo');
      } else {
        assertCinemaScopeMulti(actor, cinemaIds, 'tạo combo');
      }
    }

    return prisma.$transaction(async (tx) => {
      const combo = await tx.combo.create({
        data: {
          ...data,
          imageUrl: data.imageUrl || null,
        },
      });

      if (cinemaIds && cinemaIds.length > 0) {
        await tx.comboCinema.createMany({
          data: cinemaIds.map((cinemaId) => ({
            comboId: combo.id,
            cinemaId,
          })),
        });
      }

      return tx.combo.findUnique({
        where: { id: combo.id },
        include: { cinemas: true },
      });
    });
  }

  async updateCombo(id: string, input: UpdateComboInput, actor?: AuthUser) {
    const existing = await this.getComboById(id);
    const existingCinemaIds = existing.cinemas.map((c) => c.cinemaId);

    if (actor) {
      if (existingCinemaIds.length === 0) {
        assertAdminForGlobal(actor, 'combo');
      } else {
        assertCinemaScopeMulti(actor, existingCinemaIds, 'chỉnh sửa combo');
      }

      if (input.cinemaIds !== undefined) {
        if (input.cinemaIds.length === 0) {
          assertAdminForGlobal(actor, 'combo');
        } else {
          assertCinemaScopeMulti(actor, input.cinemaIds, 'gán combo');
        }
      }
    }

    const { cinemaIds, ...data } = input;

    return prisma.$transaction(async (tx) => {
      if (cinemaIds !== undefined) {
        await tx.comboCinema.deleteMany({ where: { comboId: id } });
        if (cinemaIds.length > 0) {
          await tx.comboCinema.createMany({
            data: cinemaIds.map((cinemaId) => ({
              comboId: id,
              cinemaId,
            })),
          });
        }
      }

      return tx.combo.update({
        where: { id },
        data: {
          ...data,
          ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl || null } : {}),
        },
        include: { cinemas: true },
      });
    });
  }

  async deleteCombo(id: string, actor?: AuthUser) {
    const existing = await this.getComboById(id);
    const existingCinemaIds = existing.cinemas.map((c) => c.cinemaId);

    if (actor) {
      if (existingCinemaIds.length === 0) {
        assertAdminForGlobal(actor, 'combo');
      } else {
        assertCinemaScopeMulti(actor, existingCinemaIds, 'ngừng kích hoạt combo');
      }
    }

    // Soft delete or deactive to preserve order history
    return prisma.combo.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const comboService = new ComboService();
