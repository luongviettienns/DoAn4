import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MyTicketsDrawer } from '../src/components/MyTicketsDrawer';
import { TicketModal } from '../src/components/TicketModal';
import { orderFixture } from './booking-fixtures';
import { renderSignedIn, response, routeFetch } from './helpers';

describe('Electronic tickets', () => {
  it.each(['PENDING_PAYMENT', 'PAID_UNFULFILLED', 'EXPIRED', 'CANCELLED'])('does not claim booking success for server state %s', (status) => {
    render(<TicketModal isOpen onClose={() => {}} order={orderFixture(status)} />);
    expect(screen.queryByText(/Đặt vé thành công/)).not.toBeInTheDocument();
    expect(screen.getByText('Vé điện tử CineX Pass')).toBeInTheDocument();
  });

  it('waits for issued ticket codes before claiming booking success for a paid order', () => {
    const order = orderFixture('PAID');
    order.items[0].ticket = null;
    render(<TicketModal isOpen onClose={() => {}} order={order} />);
    expect(screen.queryByText(/Đặt vé thành công/)).not.toBeInTheDocument();
    expect(screen.getByText('CHƯA PHÁT HÀNH')).toBeInTheDocument();
  });

  it('does not mark a ticket ready for checkin when the server code is empty', () => {
    const order = orderFixture('PAID');
    order.items[0].ticket!.ticketCode = '';
    const { container } = render(<TicketModal isOpen onClose={() => {}} order={order} />);
    expect(screen.queryByText('HỢP LỆ — SẴN SÀNG SOÁT VÉ')).not.toBeInTheDocument();
    expect(container.querySelector('svg[height="96"]')).toBeNull();
  });

  it('shows the issued ticket code and seat from the paid order', () => {
    render(<TicketModal isOpen onClose={() => {}} order={orderFixture()} />);
    expect(screen.getByText('TK1234567890')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('does not invent a scannable ticket when the backend has not issued one', () => {
    const order = orderFixture('PENDING_PAYMENT');
    const { container } = render(<TicketModal isOpen onClose={() => {}} order={order} />);
    expect(container.querySelector('svg[height="96"]')).toBeNull();
    expect(screen.queryByText(/HỢP LỆ — SẴN SÀNG SOÁT VÉ/)).not.toBeInTheDocument();
  });

  it.each(['USED', 'CANCELLED'])('does not mark a %s ticket as ready for checkin', (status) => {
    const order = orderFixture();
    order.items[0].ticket!.status = status;
    render(<TicketModal isOpen onClose={() => {}} order={order} />);
    expect(screen.queryByText('HỢP LỆ — SẴN SÀNG SOÁT VÉ')).not.toBeInTheDocument();
    expect(screen.getByText(status === 'USED' ? 'ĐÃ SỬ DỤNG' : 'ĐÃ HỦY')).toBeInTheDocument();
  });

  it('shows a server history error instead of claiming that the user has no tickets', async () => {
    routeFetch(() => response({ success: false, error: { message: 'Phiên đăng nhập đã hết hạn' } }, 401));
    renderSignedIn(<MyTicketsDrawer isOpen onClose={() => {}} onSelectOrder={() => {}} />);
    expect(await screen.findByText('Phiên đăng nhập đã hết hạn')).toBeInTheDocument();
    expect(screen.queryByText('Chưa có vé nào')).not.toBeInTheDocument();
  });

  it('opens an issued paid ticket from booking history', async () => {
    routeFetch(() => response({ success: true, data: { items: [orderFixture()], total: 1, page: 1, limit: 20 } }));
    function History() {
      const [selected, setSelected] = useState<ReturnType<typeof orderFixture> | null>(null);
      return <><MyTicketsDrawer isOpen={!selected} onClose={() => {}} onSelectOrder={setSelected} />
        <TicketModal isOpen={!!selected} onClose={() => setSelected(null)} order={selected} /></>;
    }
    renderSignedIn(<History />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem vé QR' }));
    expect(screen.getByText('TK1234567890')).toBeInTheDocument();
  });

  it('allows cancelling a paid order with >= 2h until showtime and updates status', async () => {
    let cancelCalled = false;
    const testOrder = orderFixture('PAID');
    routeFetch((url) => {
      if (url.pathname.includes('/cancel')) {
        cancelCalled = true;
        return response({ success: true, data: { ...testOrder, status: 'CANCELLED', refundStatus: 'PENDING' } });
      }
      return response({ success: true, data: { items: [testOrder], total: 1, page: 1, limit: 20 } });
    });

    renderSignedIn(<MyTicketsDrawer isOpen onClose={() => {}} onSelectOrder={() => {}} />);
    expect(await screen.findByText('MV281003TEST01')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Hủy vé' });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    expect(screen.getByText(/Xác nhận hủy vé & Hoàn tiền/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    expect(await screen.findByText(/Đã hủy vé thành công/)).toBeInTheDocument();
    expect(cancelCalled).toBe(true);
    expect(screen.getByText(/ĐÃ HỦY \(CHỜ HOÀN TIỀN\)/)).toBeInTheDocument();
  });

  it('disables cancellation when showtime is less than 2 hours away', async () => {
    const nearOrder = orderFixture('PAID');
    nearOrder.snapshot.startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins
    routeFetch(() => response({ success: true, data: { items: [nearOrder], total: 1, page: 1, limit: 20 } }));

    renderSignedIn(<MyTicketsDrawer isOpen onClose={() => {}} onSelectOrder={() => {}} />);
    expect(await screen.findByText('MV281003TEST01')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Hủy vé' })).not.toBeInTheDocument();
    expect(screen.getByText(/Hết hạn hủy \(< 2h\)/)).toBeInTheDocument();
  });
});
