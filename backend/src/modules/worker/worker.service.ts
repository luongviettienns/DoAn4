import prisma from '../../shared/prisma';

export class WorkerService {
  /**
   * Quét và giải phóng các đơn hàng và ghế tạm giữ quá hạn (F19)
   * Tương ứng với BR-01 (10 phút giữ chỗ) và giải phóng tài nguyên hệ thống
   */
  async sweepExpiredHolds() {
    const now = new Date();

    // 1. Quét các đơn hàng PENDING_PAYMENT đã quá hạn
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: { lte: now },
      },
      select: { id: true },
    });

    const expiredOrderIds = expiredOrders.map((o) => o.id);

    let releasedSeatsCount = 0;
    let expiredOrdersCount = 0;

    if (expiredOrderIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Cập nhật đơn hàng sang EXPIRED
        const orderResult = await tx.order.updateMany({
          where: { id: { in: expiredOrderIds } },
          data: { status: 'EXPIRED' },
        });
        expiredOrdersCount = orderResult.count;

        // Trả ghế về AVAILABLE
        const seatResult = await tx.showtimeSeat.updateMany({
          where: {
            orderId: { in: expiredOrderIds },
            status: 'HELD',
          },
          data: {
            status: 'AVAILABLE',
            orderId: null,
            holdExpiresAt: null,
          },
        });
        releasedSeatsCount = seatResult.count;

        // Xóa pending order guards
        await tx.pendingOrderGuard.deleteMany({
          where: { orderId: { in: expiredOrderIds } },
        });

        // Đánh dấu thanh toán đang chờ sang EXPIRED
        await tx.payment.updateMany({
          where: {
            orderId: { in: expiredOrderIds },
            status: 'PENDING',
          },
          data: { status: 'EXPIRED' },
        });
      });
    }

    // 2. Quét các ghế HELD mồ côi (nếu có ghế nào holdExpiresAt <= now mà chưa giải phóng)
    const orphanSeats = await prisma.showtimeSeat.updateMany({
      where: {
        status: 'HELD',
        holdExpiresAt: { lte: now },
      },
      data: {
        status: 'AVAILABLE',
        orderId: null,
        holdExpiresAt: null,
      },
    });

    return {
      timestamp: now.toISOString(),
      expiredOrdersCount,
      releasedSeatsCount: releasedSeatsCount + orphanSeats.count,
    };
  }
}

export const workerService = new WorkerService();
