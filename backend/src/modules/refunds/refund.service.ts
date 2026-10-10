import { Prisma } from '@prisma/client';
import prisma from '../../shared/prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';
import type { RefundListQuery, ProcessRefundInput } from './refund.schema';

export class RefundService {
  /**
   * Danh sách yêu cầu hoàn tiền, hỗ trợ cinema-scope cho MANAGER.
   */
  async listRefunds(query: RefundListQuery, cinemaIds?: string[]) {
    const { page, limit, status, reason } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundRequestWhereInput = {
      ...(status ? { status } : {}),
      ...(reason ? { reason } : {}),
      ...(cinemaIds ? { order: { showtime: { room: { cinemaId: { in: cinemaIds } } } } } : {}),
    };

    const [total, refunds] = await Promise.all([
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              code: true,
              total: true,
              status: true,
              refundStatus: true,
              userId: true,
              customerName: true,
              customerPhone: true,
              customerEmail: true,
              movieTitleSnapshot: true,
              cinemaNameSnapshot: true,
              roomNameSnapshot: true,
              showtimeStartSnapshot: true,
              source: true,
              paidAt: true,
            },
          },
          payment: {
            select: {
              id: true,
              provider: true,
              method: true,
              txnRef: true,
              gatewayTxnNo: true,
              amount: true,
              status: true,
              paidAt: true,
            },
          },
          requester: { select: { id: true, fullName: true, email: true } },
          processor: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: refunds.map(r => ({
        id: r.id,
        orderId: r.orderId,
        paymentId: r.paymentId,
        reason: r.reason,
        status: r.status,
        method: r.method,
        amount: r.amount,
        cancellationFee: r.cancellationFee,
        policySnapshot: r.policySnapshot,
        externalReference: r.externalReference,
        note: r.note,
        requestedBy: r.requester ? { id: r.requester.id, fullName: r.requester.fullName, email: r.requester.email } : null,
        processedBy: r.processor ? { id: r.processor.id, fullName: r.processor.fullName, email: r.processor.email } : null,
        processedAt: r.processedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        order: {
          id: r.order.id,
          code: r.order.code,
          total: r.order.total,
          status: r.order.status,
          refundStatus: r.order.refundStatus,
          customerName: r.order.customerName,
          customerPhone: r.order.customerPhone,
          customerEmail: r.order.customerEmail,
          movieTitle: r.order.movieTitleSnapshot,
          cinemaName: r.order.cinemaNameSnapshot,
          roomName: r.order.roomNameSnapshot,
          showtimeStart: r.order.showtimeStartSnapshot.toISOString(),
          source: r.order.source,
          paidAt: r.order.paidAt?.toISOString() ?? null,
        },
        payment: {
          id: r.payment.id,
          provider: r.payment.provider,
          method: r.payment.method,
          txnRef: r.payment.txnRef,
          gatewayTxnNo: r.payment.gatewayTxnNo,
          amount: r.payment.amount,
          status: r.payment.status,
          paidAt: r.payment.paidAt?.toISOString() ?? null,
        },
      })),
    };
  }

  /**
   * Xác nhận hoàn tiền: PENDING → REFUNDED.
   * Chạy trong transaction, cập nhật RefundRequest + Order.refundStatus,
   * ghi AuditLog và OutboxEvent (cho email/thông báo).
   * Cinema-scope: MANAGER chỉ xử lý đơn thuộc rạp được gán.
   */
  async processRefund(
    refundId: string,
    input: ProcessRefundInput,
    actorId: string,
    actorRole: string,
    cinemaIds?: string[],
    ip?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Lock the refund row to prevent concurrent processing
      await tx.$queryRaw`SELECT id FROM refund_requests WHERE id = ${refundId} FOR UPDATE`;

      const refund = await tx.refundRequest.findUnique({
        where: { id: refundId },
        include: {
          order: {
            include: {
              showtime: { include: { room: true } },
            },
          },
          payment: true,
        },
      });

      if (!refund) {
        throw new NotFoundError('REFUND_NOT_FOUND', 'Yêu cầu hoàn tiền không tồn tại');
      }

      // Cinema scope check for MANAGER
      if (cinemaIds && !cinemaIds.includes(refund.order.showtime.room.cinemaId)) {
        throw new BadRequestError('CINEMA_SCOPE_FORBIDDEN', 'Bạn không có quyền xử lý yêu cầu hoàn tiền cho rạp này');
      }

      if (refund.status === 'REFUNDED') {
        throw new ConflictError('REFUND_ALREADY_PROCESSED', 'Yêu cầu hoàn tiền này đã được xử lý');
      }

      if (refund.status !== 'PENDING') {
        throw new BadRequestError('INVALID_REFUND_STATUS', `Không thể xử lý hoàn tiền ở trạng thái ${refund.status}`);
      }

      const processedAt = new Date();
      const externalReference = input.externalReference?.trim() || `${input.method}-${refund.order.code}-${Date.now()}`;

      // 1. Update RefundRequest → REFUNDED
      await tx.refundRequest.update({
        where: { id: refundId },
        data: {
          status: 'REFUNDED',
          method: input.method,
          processedBy: actorId,
          processedAt,
          externalReference,
          note: input.note ?? null,
        },
      });

      // 2. Update Order.refundStatus → REFUNDED
      await tx.order.update({
        where: { id: refund.orderId },
        data: { refundStatus: 'REFUNDED' },
      });

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'REFUND_PROCESS',
          entity: 'RefundRequest',
          entityId: refundId,
          oldValue: { status: 'PENDING' },
          newValue: {
            status: 'REFUNDED',
            method: input.method,
            externalReference,
            processedAt: processedAt.toISOString(),
          },
          ip: ip ?? null,
        },
      });

      // 4. Create OutboxEvent for downstream notification (email, etc.)
      await tx.outboxEvent.create({
        data: {
          eventType: 'REFUND_PROCESSED',
          aggregateType: 'RefundRequest',
          aggregateId: refundId,
          dedupeKey: `refund-processed-${refundId}`,
          payload: {
            refundId,
            orderId: refund.orderId,
            orderCode: refund.order.code,
            amount: refund.amount,
            method: input.method,
            externalReference,
            customerName: refund.order.customerName,
            customerEmail: refund.order.customerEmail,
            customerPhone: refund.order.customerPhone,
            movieTitle: refund.order.movieTitleSnapshot,
            cinemaName: refund.order.cinemaNameSnapshot,
            processedBy: actorId,
            processedAt: processedAt.toISOString(),
          },
        },
      });

      return {
        id: refund.id,
        orderId: refund.orderId,
        orderCode: refund.order.code,
        status: 'REFUNDED' as const,
        method: input.method,
        amount: refund.amount,
        externalReference,
        processedBy: actorId,
        processedAt: processedAt.toISOString(),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  /**
   * Chi tiết một yêu cầu hoàn tiền, có cinema-scope.
   */
  async getRefundById(refundId: string, cinemaIds?: string[]) {
    const refund = await prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            showtime: { include: { room: true } },
            items: { include: { ticket: true } },
            combos: true,
          },
        },
        payment: {
          include: { logs: { orderBy: { createdAt: 'desc' }, take: 5 } },
        },
        requester: { select: { id: true, fullName: true, email: true } },
        processor: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!refund) {
      throw new NotFoundError('REFUND_NOT_FOUND', 'Yêu cầu hoàn tiền không tồn tại');
    }

    // Cinema scope check
    if (cinemaIds && !cinemaIds.includes(refund.order.showtime.room.cinemaId)) {
      throw new NotFoundError('REFUND_NOT_FOUND', 'Yêu cầu hoàn tiền không tồn tại');
    }

    return {
      id: refund.id,
      orderId: refund.orderId,
      paymentId: refund.paymentId,
      reason: refund.reason,
      status: refund.status,
      method: refund.method,
      amount: refund.amount,
      cancellationFee: refund.cancellationFee,
      policySnapshot: refund.policySnapshot,
      externalReference: refund.externalReference,
      note: refund.note,
      requestedBy: refund.requester ? { id: refund.requester.id, fullName: refund.requester.fullName, email: refund.requester.email } : null,
      processedBy: refund.processor ? { id: refund.processor.id, fullName: refund.processor.fullName, email: refund.processor.email } : null,
      processedAt: refund.processedAt?.toISOString() ?? null,
      createdAt: refund.createdAt.toISOString(),
      order: {
        id: refund.order.id,
        code: refund.order.code,
        total: refund.order.total,
        status: refund.order.status,
        refundStatus: refund.order.refundStatus,
        movieTitle: refund.order.movieTitleSnapshot,
        cinemaName: refund.order.cinemaNameSnapshot,
        roomName: refund.order.roomNameSnapshot,
        showtimeStart: refund.order.showtimeStartSnapshot.toISOString(),
        source: refund.order.source,
        paidAt: refund.order.paidAt?.toISOString() ?? null,
        tickets: refund.order.items.map(item => ({
          seatLabel: `${item.rowLabel}${item.seatNumber}`,
          seatType: item.seatType,
          price: item.price,
          ticketCode: item.ticket?.ticketCode ?? null,
          ticketStatus: item.ticket?.status ?? null,
        })),
        combos: refund.order.combos.map(c => ({
          name: c.nameSnapshot,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          lineTotal: c.lineTotal,
        })),
      },
      payment: {
        id: refund.payment.id,
        provider: refund.payment.provider,
        method: refund.payment.method,
        txnRef: refund.payment.txnRef,
        gatewayTxnNo: refund.payment.gatewayTxnNo,
        amount: refund.payment.amount,
        status: refund.payment.status,
        paidAt: refund.payment.paidAt?.toISOString() ?? null,
        recentLogs: refund.payment.logs.map(l => ({
          id: l.id,
          channel: l.channel,
          resultCode: l.resultCode,
          signatureValid: l.signatureValid,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    };
  }
}

export const refundService = new RefundService();
