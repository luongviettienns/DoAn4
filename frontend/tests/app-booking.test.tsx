import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { orderFixture, seat, showtimeData } from './booking-fixtures';
import { response, routeFetch } from './helpers';

afterEach(() => window.history.replaceState(null, '', '/'));
describe('Application booking routes', () => {
  it('opens the explicitly chosen showtime and transfers the same held order into checkout', async () => {
    localStorage.setItem('cinex_token', 'access-valid');
    let held = false; let creates = 0;
    routeFetch((url, init) => {
      if (url.pathname.endsWith('/movies')) return response({ success: true, data: [{ id: 'movie-1', title: 'Phim kiểm thử', description: '', durationMin: 120, ageRating: 'T16', releaseDate: '2028-10-03', status: 'NOW_SHOWING', genres: [], posterUrl: '/poster.jpg' }] });
      if (url.pathname.endsWith('/cinemas')) return response({ success: true, data: [{ ...showtimeData.cinema, city: 'Hồ Chí Minh', roomCount: 1 }] });
      if (url.pathname.endsWith('/showtimes')) return response({ success: true, data: [{ ...showtimeData.showtime, movieId: 'movie-1', cinemaId: 'cinema-1', roomName: 'Phòng 1', status: 'OPEN' }] });
      if (url.pathname.endsWith('/seats')) {
        expect(url.pathname).toContain('/showtimes/showtime-1/');
        return response({ success: true, data: { ...showtimeData, seats: [seat(1)] } });
      }
      if (url.pathname.endsWith('/pending')) return response({ success: true, data: held ? orderFixture('PENDING_PAYMENT') : null });
      if (url.pathname.endsWith('/orders') && init.method === 'POST') { creates++; held = true; return response({ success: true, data: orderFixture('PENDING_PAYMENT') }); }
      if (url.pathname.endsWith('/combos')) return response({ success: true, data: [] });
      return response({ success: false, error: { message: 'Unexpected request' } }, 400);
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn phim Phim kiểm thử' }));
    fireEvent.change(screen.getByLabelText('Rạp chiếu'), { target: { value: 'cinema-1' } });
    fireEvent.click(await screen.findByRole('button', { name: /19:00.*2D.*Phòng 1/ }));
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' }));
    await screen.findByText('1/8 ghế');
    fireEvent.click(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' }));
    expect(await screen.findByText('Thanh toán vé xem phim')).toBeInTheDocument();
    expect(screen.getByText('Thời gian giữ ghế còn lại:')).toBeInTheDocument();
    expect(creates).toBe(1);
  });
  it('mounts the payment result route on a fresh gateway return', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    window.history.replaceState(null, '', `/payment/result?orderId=${id}&status=PAID`);
    localStorage.setItem('cinex_token', 'access-valid');
    routeFetch((url) => url.pathname.endsWith(`/orders/${id}`)
      ? response({ success: true, data: { ...orderFixture('CANCELLED'), id } })
      : response({ success: true, data: [] }));
    render(<App />);
    expect(await screen.findByText(/Đơn hàng đã hủy/)).toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
  });
});
