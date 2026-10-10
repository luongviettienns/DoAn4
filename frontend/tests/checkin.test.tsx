import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaffCheckinModal } from '../src/components/StaffCheckinModal';
import { renderSignedIn, response, routeFetch, user } from './helpers';

const accepted = {
  result: 'OK',
  ticket: { id: 'ticket-1', ticketCode: 'TK1234567890', seatId: 'seat-1', seatLabel: 'A1', seatType: 'STANDARD', price: 80000, status: 'USED', checkedInAt: '2028-10-03T11:30:00.000Z' },
  showtime: { id: 'showtime-1', movieId: 'movie-1', movieTitle: 'Phim kiểm thử', posterUrl: '/poster.jpg', ageRating: 'T16', cinemaId: 'cinema-1', cinemaName: 'CineX Test', roomId: 'room-1', roomName: 'Phòng 1', startTime: '2028-10-03T12:00:00.000Z', endTime: '2028-10-03T14:00:00.000Z', format: '2D', language: 'VI' },
  checkedInBy: 'staff-1',
};

function checkinNetwork(scan: (body: { ticketCode: string }) => Response) {
  routeFetch((url, init) => {
    if (url.pathname.endsWith('/checkin/stats')) return response({ success: true, data: { today: '2028-10-03', totalTickets: 2, checkedInCount: 1, pendingCount: 1 } });
    if (url.pathname.endsWith('/checkin/history')) return response({ success: true, data: [] });
    if (url.pathname.endsWith('/checkin')) return scan(JSON.parse(String(init.body)));
    throw new Error(`Unexpected route: ${url.pathname}`);
  }, { ...user, id: 'staff-1', role: 'STAFF' });
  renderSignedIn(<StaffCheckinModal isOpen onClose={() => {}} />);
}

describe('Staff manual checkin', () => {
  it('requires a non-empty ticket code', () => {
    checkinNetwork(() => response({ success: true, data: accepted }));
    expect(screen.getByRole('button', { name: 'XÁC NHẬN' })).toBeDisabled();
  });

  it('normalizes manual ticket input and displays seat and cinema after acceptance', async () => {
    checkinNetwork((body) => body.ticketCode === 'TK1234567890' ? response({ success: true, data: accepted })
      : response({ success: false, error: { message: 'Mã vé sai' } }, 400));
    const input = screen.getByPlaceholderText('VD: TK89F874DB40');
    fireEvent.change(input, { target: { value: ' tk1234567890 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'XÁC NHẬN' }));
    expect(await screen.findByText('VÉ HỢP LỆ — MỜI KHÁCH VÀO PHÒNG CHIẾU')).toBeInTheDocument();
    expect(screen.getByText('A1 (STANDARD)')).toBeInTheDocument();
    expect(screen.getByText('CineX Test — Phòng 1')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('replaces an earlier successful checkin with the server duplicate-ticket error', async () => {
    const usedCodes = new Set<string>();
    checkinNetwork((body) => {
      if (usedCodes.has(body.ticketCode)) return response({ success: false, error: { code: 'TICKET_ALREADY_USED', message: 'Vé đã được sử dụng' } }, 409);
      usedCodes.add(body.ticketCode);
      return response({ success: true, data: accepted });
    });
    const input = screen.getByPlaceholderText('VD: TK89F874DB40');
    fireEvent.change(input, { target: { value: 'TK1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'XÁC NHẬN' }));
    await screen.findByText('VÉ HỢP LỆ — MỜI KHÁCH VÀO PHÒNG CHIẾU');
    fireEvent.change(input, { target: { value: 'TK1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'XÁC NHẬN' }));
    expect(await screen.findByText('Vé đã được sử dụng')).toBeInTheDocument();
    expect(screen.queryByText('VÉ HỢP LỆ — MỜI KHÁCH VÀO PHÒNG CHIẾU')).not.toBeInTheDocument();
  });

  it('shows backend rejection without claiming the guest can enter', async () => {
    checkinNetwork(() => response({ success: false, error: { code: 'TICKET_CANCELLED', message: 'Vé đã bị hủy' } }, 409));
    fireEvent.change(screen.getByPlaceholderText('VD: TK89F874DB40'), { target: { value: 'TK1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'XÁC NHẬN' }));
    expect(await screen.findByText('Vé đã bị hủy')).toBeInTheDocument();
    expect(screen.queryByText('VÉ HỢP LỆ — MỜI KHÁCH VÀO PHÒNG CHIẾU')).not.toBeInTheDocument();
  });
});
