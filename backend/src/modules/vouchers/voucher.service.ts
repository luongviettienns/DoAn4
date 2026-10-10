import prisma from '../../shared/prisma';
import { Prisma, Role } from '@prisma/client';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';
import { createVoucherSchema, type CreateVoucherInput, type UpdateVoucherInput } from './voucher.schema';
import { AuthUser } from '../../middleware/auth.middleware';
import { assertAdminForGlobal, assertCinemaScope } from '../../shared/cinema-scope';

type VoucherAmounts = { ticketSubtotal: number; comboSubtotal: number };

export class VoucherService {
  /**
   * Xác thực và tính toán giá trị giảm giá của Voucher
   */
  async validateVoucher(
    code: string,
    orderAmount: number,
    userId?: string,
    cinemaId?: string,
    amounts?: VoucherAmounts,
    client: Prisma.TransactionClient = prisma,
    excludeOrderId?: string
  ) {
    const voucher = await client.voucher.findUnique({
      where: { code: code.toUpperCase() },
      include: { cinema: true },
    });

    if (!voucher) {
      throw new NotFoundError('VOUCHER_NOT_FOUND', 'Mã voucher không tồn tại');
    }

    if (voucher.status !== 'ACTIVE') {
      throw new BadRequestError('VOUCHER_INACTIVE', 'Voucher hiện đang tạm dừng hoặc không khả dụng');
    }

    const now = new Date();
    if (now < voucher.validFrom) {
      throw new BadRequestError('VOUCHER_NOT_STARTED', 'Voucher chưa đến thời gian áp dụng');
    }

    if (now >= voucher.validTo) {
      throw new BadRequestError('VOUCHER_EXPIRED', 'Voucher đã hết hạn sử dụng');
    }

    if (voucher.cinemaId && cinemaId && voucher.cinemaId !== cinemaId) {
      throw new BadRequestError(
        'VOUCHER_CINEMA_MISMATCH',
        `Voucher chỉ áp dụng tại rạp ${voucher.cinema?.name || 'được chỉ định'}`
      );
    }

    if (orderAmount < voucher.minOrder) {
      throw new BadRequestError(
        'VOUCHER_MIN_ORDER_NOT_MET',
        `Đơn hàng cần đạt tối thiểu ${voucher.minOrder.toLocaleString('vi-VN')}đ để áp dụng voucher này`
      );
    }

    // Kiểm tra tổng lượt dùng
    const totalRedemptions = await client.voucherRedemption.count({
      where: {
        voucherId: voucher.id,
        ...(excludeOrderId && { orderId: { not: excludeOrderId } }),
        OR: [
          { status: 'CONSUMED' },
          { status: 'RESERVED', reservedUntil: { gt: now } },
        ],
      },
    });

    if (totalRedemptions >= voucher.totalLimit) {
      throw new BadRequestError('VOUCHER_LIMIT_EXCEEDED', 'Mã voucher đã hết lượt sử dụng trong hệ thống');
    }

    // Kiểm tra lượt dùng của người dùng
    if (userId) {
      const userRedemptions = await client.voucherRedemption.count({
        where: {
          voucherId: voucher.id,
          ...(excludeOrderId && { orderId: { not: excludeOrderId } }),
          userId,
          OR: [
            { status: 'CONSUMED' },
            { status: 'RESERVED', reservedUntil: { gt: now } },
          ],
        },
      });

      if (userRedemptions >= voucher.perUserLimit) {
        throw new BadRequestError(
          'VOUCHER_USER_LIMIT_EXCEEDED',
          `Bạn đã dùng tối đa ${voucher.perUserLimit} lần cho mã voucher này`
        );
      }
    }

    // Tính toán số tiền chiết khấu
    const base = amounts && voucher.scope !== 'ORDER'
      ? voucher.scope === 'TICKETS' ? amounts.ticketSubtotal : amounts.comboSubtotal
      : orderAmount;
    if (amounts && voucher.scope !== 'ORDER' && base === 0) {
      throw new BadRequestError('VOUCHER_NOT_APPLICABLE', 'Đơn không có sản phẩm thuộc phạm vi voucher');
    }
    let discount = 0;
    if (voucher.type === 'PERCENT') {
      const calculated = Math.floor((base * voucher.value) / 100);
      discount = voucher.maxDiscount !== null ? Math.min(calculated, voucher.maxDiscount) : calculated;
    } else {
      discount = voucher.value;
    }

    discount = Math.min(discount, base);
    const finalAmount = Math.max(0, orderAmount - discount);

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        value: voucher.value,
        maxDiscount: voucher.maxDiscount,
        minOrder: voucher.minOrder,
        scope: voucher.scope,
      },
      discount,
      finalAmount,
    };
  }

  /** Lock before the transaction's first consistent read so quota counts see the previous reserver's commit. */
  async lockAndValidate(tx: Prisma.TransactionClient, code: string, orderAmount: number,
    userId: string | undefined, cinemaId: string, amounts: VoucherAmounts, excludeOrderId?: string) {
    await tx.$queryRaw`SELECT id FROM vouchers WHERE code = ${code.toUpperCase()} FOR UPDATE`;
    return this.validateVoucher(code, orderAmount, userId, cinemaId, amounts, tx, excludeOrderId);
  }

  async listVouchers(query?: { cinemaId?: string; status?: any }, actor?: AuthUser) {
    const where: any = {};

    if (actor && (actor.role === Role.MANAGER || actor.role === Role.STAFF)) {
      if (query?.cinemaId) {
        assertCinemaScope(actor, query.cinemaId, 'xem voucher');
        where.OR = [{ cinemaId: null }, { cinemaId: query.cinemaId }];
      } else {
        if (actor.cinemaIds.length === 0) {
          where.cinemaId = null;
        } else {
          where.OR = [{ cinemaId: null }, { cinemaId: { in: actor.cinemaIds } }];
        }
      }
    } else if (query?.cinemaId) {
      where.OR = [{ cinemaId: null }, { cinemaId: query.cinemaId }];
    }

    if (query?.status) {
      where.status = query.status;
    }

    return prisma.voucher.findMany({
      where,
      include: {
        cinema: true,
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVoucherById(id: string) {
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { cinema: true, redemptions: true },
    });
    if (!voucher) {
      throw new NotFoundError('VOUCHER_NOT_FOUND', 'Voucher không tồn tại');
    }
    return voucher;
  }

  async createVoucher(input: CreateVoucherInput, actor?: AuthUser) {
    if (actor) {
      if (!input.cinemaId) {
        assertAdminForGlobal(actor, 'voucher');
      } else {
        assertCinemaScope(actor, input.cinemaId, 'tạo voucher');
      }
    }

    return prisma.voucher.create({
      data: input,
      include: { cinema: true },
    });
  }

  async updateVoucher(id: string, input: UpdateVoucherInput, actor?: AuthUser) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM vouchers WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.voucher.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('VOUCHER_NOT_FOUND', 'Voucher không tồn tại');

      if (actor) {
        if (existing.cinemaId === null) {
          assertAdminForGlobal(actor, 'voucher');
        } else {
          assertCinemaScope(actor, existing.cinemaId, 'chỉnh sửa voucher');
        }

        if (input.cinemaId !== undefined && input.cinemaId !== existing.cinemaId) {
          if (input.cinemaId === null) {
            assertAdminForGlobal(actor, 'voucher');
          } else {
            assertCinemaScope(actor, input.cinemaId, 'gán voucher sang cụm rạp mới');
          }
        }
      }

      const used = await tx.voucherRedemption.count({ where: { voucherId: id, status: { in: ['RESERVED', 'CONSUMED'] } } });
      if (used && (Object.keys(input).some((key) => !['validTo', 'status'].includes(key))
        || (input.validTo && input.validTo < existing.validTo))) {
        throw new ConflictError('VOUCHER_ALREADY_USED', 'Voucher có lượt dùng chỉ được gia hạn hoặc tạm dừng');
      }
      createVoucherSchema.parse({
        ...existing, ...input,
        cinemaId: input.cinemaId ?? existing.cinemaId ?? undefined,
        maxDiscount: input.maxDiscount ?? existing.maxDiscount ?? undefined,
        validFrom: (input.validFrom ?? existing.validFrom).toISOString(),
        validTo: (input.validTo ?? existing.validTo).toISOString(),
      });
      return tx.voucher.update({ where: { id }, data: input, include: { cinema: true } });
    });
  }

  async deleteVoucher(id: string, actor?: AuthUser) {
    const existing = await prisma.voucher.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('VOUCHER_NOT_FOUND', 'Voucher không tồn tại');

    if (actor) {
      if (existing.cinemaId === null) {
        assertAdminForGlobal(actor, 'voucher');
      } else {
        assertCinemaScope(actor, existing.cinemaId, 'xóa voucher');
      }
    }

    const used = await prisma.voucherRedemption.count({ where: { voucherId: id } });
    if (used > 0) {
      return prisma.voucher.update({
        where: { id },
        data: { status: 'PAUSED' },
        include: { cinema: true },
      });
    }

    return prisma.voucher.delete({ where: { id } });
  }
}

export const voucherService = new VoucherService();
