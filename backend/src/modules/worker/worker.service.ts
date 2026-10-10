import prisma from '../../shared/prisma';

export class WorkerService {
  async sweepExpiredHolds() {
    const now = new Date();
    const expiredOrders = await prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', expiresAt: { lte: now } },
      select: { id: true }, orderBy: { expiresAt: 'asc' }, take: 200,
    });
    let expiredOrdersCount = 0;
    let releasedSeatsCount = 0;
    for (const candidate of expiredOrders) {
      const result = await prisma.$transaction(async (tx) => {
        // Re-read under the same row lock used by payment and cancellation.
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${candidate.id} FOR UPDATE`;
        const order = await tx.order.findUnique({ where: { id: candidate.id } });
        if (!order || order.status !== 'PENDING_PAYMENT' || order.expiresAt > now) {
          return { expired: 0, released: 0 };
        }
        await tx.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
        const released = await tx.showtimeSeat.updateMany({
          where: { orderId: order.id, status: 'HELD' },
          data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
        });
        await tx.pendingOrderGuard.deleteMany({ where: { orderId: order.id } });
        await tx.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
        await tx.voucherRedemption.updateMany({
          where: { orderId: order.id, status: 'RESERVED' }, data: { status: 'RELEASED', releasedAt: now },
        });
        return { expired: 1, released: released.count };
      });
      expiredOrdersCount += result.expired;
      releasedSeatsCount += result.released;
    }
    const orphanSeats = await prisma.showtimeSeat.updateMany({
      where: { status: 'HELD', orderId: null, holdExpiresAt: { lte: now } },
      data: { status: 'AVAILABLE', orderId: null, holdExpiresAt: null },
    });
    return { timestamp: now.toISOString(), expiredOrdersCount, releasedSeatsCount: releasedSeatsCount + orphanSeats.count };
  }
}

export const workerService = new WorkerService();
