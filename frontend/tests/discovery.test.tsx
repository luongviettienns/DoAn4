import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Discovery } from '../src/components/Discovery';
import { deferred, response, routeFetch } from './helpers';

const movies = [
  { id: 'movie-1', title: 'Phim dữ liệu thật', originalTitle: 'Real movie', posterUrl: '/poster-real.jpg', bannerUrl: '/banner-real.jpg',
    description: 'Nội dung do rạp cung cấp.', durationMin: 120, ageRating: 'T13', releaseDate: '2026-10-01', status: 'NOW_SHOWING', genres: [{ id: 'g1', name: 'Phiêu lưu', slug: 'adventure' }] },
  { id: 'movie-2', title: 'Bộ phim thứ hai', posterUrl: '/poster-two.jpg', description: 'Phim khác.', durationMin: 95, ageRating: 'P', releaseDate: '2026-10-01', status: 'NOW_SHOWING', genres: [] },
];
const cinemas = [
  { id: 'cinema-1', name: 'CineX Quận 1', address: 'Địa chỉ thứ nhất', city: 'Hồ Chí Minh', phone: '0901234567', roomCount: 2 },
  { id: 'cinema-2', name: 'CineX Quận 7', address: 'Địa chỉ thứ hai', city: 'Hồ Chí Minh', phone: '0901234568', roomCount: 1 },
];
const showtime = { id: 'showtime-exact', movieId: 'movie-1', movieTitle: 'Phim dữ liệu thật', cinemaId: 'cinema-1', cinemaName: 'CineX Quận 1',
  roomName: 'Phòng 2', format: '2D', language: 'Phụ đề', startTime: '2026-10-04T11:30:00.000Z', endTime: '2026-10-04T13:30:00.000Z', status: 'OPEN' };

function network(handler?: (url: URL, init: RequestInit) => Response | Promise<Response> | undefined) {
  routeFetch((url, init) => {
    if (handler) {
      const result = handler(url, init);
      if (result) return result;
    }
    if (url.pathname.endsWith('/movies')) return response({ success: true, data: movies, meta: { total: movies.length } });
    if (url.pathname.endsWith('/cinemas')) return response({ success: true, data: cinemas });
    if (url.pathname.endsWith('/showtimes')) return response({ success: true, data: [showtime] });
    throw new Error(`Unexpected discovery route: ${url.pathname}`);
  });
}

async function chooseMovieAndCinema() {
  fireEvent.click(await screen.findByRole('button', { name: 'Chọn phim Phim dữ liệu thật' }));
  fireEvent.change(await screen.findByLabelText('Rạp chiếu'), { target: { value: 'cinema-1' } });
}

describe('Discovery uses cinema catalogue', () => {
  it('renders real catalogue and requires an explicit cinema and exact showtime selection', async () => {
    const urls: URL[] = [];
    network((url) => { urls.push(url); return undefined; });
    const onSelectShowtime = vi.fn();
    render(<Discovery onSelectShowtime={onSelectShowtime} />);
    expect(await screen.findByRole('button', { name: 'Chọn phim Phim dữ liệu thật' })).toBeInTheDocument();
    expect(screen.queryByText('9.4')).not.toBeInTheDocument();
    expect(onSelectShowtime).not.toHaveBeenCalled();
    await chooseMovieAndCinema();
    const times = await screen.findByRole('region', { name: 'Suất chiếu' });
    const button = await within(times).findByRole('button', { name: /18:30.*2D.*Phòng 2/ });
    expect(onSelectShowtime).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onSelectShowtime).toHaveBeenCalledExactlyOnceWith('showtime-exact');
    expect(urls.filter((url) => url.pathname.endsWith('/showtimes')).at(-1)?.searchParams.get('movieId')).toBe('movie-1');
    expect(urls.filter((url) => url.pathname.endsWith('/showtimes')).at(-1)?.searchParams.get('cinemaId')).toBe('cinema-1');
  });

  it('uses the Vietnam calendar day near the UTC date boundary', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T18:30:00.000Z'));
    const dates: string[] = [];
    network((url) => {
      if (url.pathname.endsWith('/showtimes')) dates.push(url.searchParams.get('date') || '');
      return undefined;
    });
    render(<Discovery onSelectShowtime={() => {}} />);
    await chooseMovieAndCinema();
    await screen.findByRole('button', { name: /18:30.*2D.*Phòng 2/ });
    expect(dates[0]).toBe('2026-10-04');
    expect(within(screen.getByRole('group', { name: 'Ngày chiếu' })).getAllByRole('button')).toHaveLength(7);
  });

  it('resets cinema and showtimes when selecting another movie', async () => {
    network();
    render(<Discovery onSelectShowtime={() => {}} />);
    await chooseMovieAndCinema();
    await screen.findByRole('button', { name: /18:30.*2D.*Phòng 2/ });
    fireEvent.click(screen.getByRole('button', { name: 'Chọn phim Bộ phim thứ hai' }));
    expect(screen.getByLabelText('Rạp chiếu')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /18:30.*2D.*Phòng 2/ })).not.toBeInTheDocument();
    expect(screen.getByText('Chọn rạp để xem suất chiếu.')).toBeInTheDocument();
  });

  it('discards the previous cinema response even if it resolves after the next selection', async () => {
    const first = deferred<Response>();
    let firstSignal: AbortSignal | undefined;
    network((url, init) => {
      if (url.pathname.endsWith('/showtimes') && url.searchParams.get('cinemaId') === 'cinema-1') {
        firstSignal = init.signal as AbortSignal;
        return first.promise;
      }
      if (url.pathname.endsWith('/showtimes')) return response({ success: true, data: [{ ...showtime, id: 'second', cinemaId: 'cinema-2', roomName: 'Phòng 7', startTime: '2026-10-04T13:00:00.000Z' }] });
      return undefined;
    });
    render(<Discovery onSelectShowtime={() => {}} />);
    await chooseMovieAndCinema();
    await waitFor(() => expect(firstSignal).toBeDefined());
    fireEvent.change(screen.getByLabelText('Rạp chiếu'), { target: { value: 'cinema-2' } });
    expect(await screen.findByRole('button', { name: /20:00.*Phòng 7/ })).toBeInTheDocument();
    expect(firstSignal?.aborted).toBe(true);
    await act(async () => first.resolve(response({ success: true, data: [showtime] })));
    expect(screen.queryByRole('button', { name: /18:30.*Phòng 2/ })).not.toBeInTheDocument();
  });

  it('loads a searched page from the API rather than filtering a sample catalogue', async () => {
    const requests: URL[] = [];
    network((url) => {
      requests.push(url);
      if (url.pathname.endsWith('/movies')) return response({ success: true, data: url.searchParams.get('page') === '2' ? [{ ...movies[1], title: 'Trang thứ hai' }] : movies,
        meta: { total: 20 } });
      return undefined;
    });
    render(<Discovery onSelectShowtime={() => {}} />);
    await screen.findByRole('button', { name: 'Chọn phim Phim dữ liệu thật' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tên phim' }), { target: { value: 'vũ trụ' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(requests.some((url) => url.searchParams.get('search') === 'vũ trụ' && url.searchParams.get('page') === '1')).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: 'Trang sau' }));
    expect(await screen.findByRole('button', { name: 'Chọn phim Trang thứ hai' })).toBeInTheDocument();
    expect(requests.at(-1)?.searchParams.get('page')).toBe('2');
    expect(requests.at(-1)?.searchParams.get('search')).toBe('vũ trụ');
  });

  it('shows an honest coming-soon catalogue without opening a fabricated schedule', async () => {
    const urls: URL[] = [];
    network((url) => {
      urls.push(url);
      if (url.pathname.endsWith('/movies') && url.searchParams.get('status') === 'COMING_SOON') {
        return response({ success: true, data: [{ ...movies[0], status: 'COMING_SOON', title: 'Sắp ra mắt' }], meta: { total: 1 } });
      }
      return undefined;
    });
    const onSelect = vi.fn();
    render(<Discovery onSelectShowtime={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sắp chiếu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Chọn phim Sắp ra mắt' }));
    expect(screen.getByText('Phim sắp chiếu. Lịch chiếu sẽ được cập nhật khi rạp mở bán.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Rạp chiếu')).not.toBeInTheDocument();
    expect(urls.some((url) => url.pathname.endsWith('/showtimes'))).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('distinguishes catalogue failure from empty results and offers a retry', async () => {
    let attempts = 0;
    network((url) => {
      if (url.pathname.endsWith('/movies')) return ++attempts === 1
        ? response({ success: false, error: { message: 'Danh mục tạm gián đoạn' } }, 503)
        : response({ success: true, data: [], meta: { total: 0 } });
      return undefined;
    });
    render(<Discovery onSelectShowtime={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Danh mục tạm gián đoạn');
    expect(screen.queryByText('Không tìm thấy phim phù hợp.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại danh sách phim' }));
    expect(await screen.findByText('Không tìm thấy phim phù hợp.')).toBeInTheDocument();
  });

  it('distinguishes an unavailable schedule from a day with no screenings and retries it', async () => {
    let attempts = 0;
    network((url) => {
      if (url.pathname.endsWith('/showtimes')) return ++attempts === 1
        ? response({ success: false, error: { message: 'Chưa tải được lịch chiếu' } }, 503)
        : response({ success: true, data: [] });
      return undefined;
    });
    render(<Discovery onSelectShowtime={() => {}} />);
    await chooseMovieAndCinema();
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được lịch chiếu');
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại lịch chiếu' }));
    expect(await screen.findByText('Không có suất chiếu trong ngày này. Hãy chọn ngày hoặc rạp khác.')).toBeInTheDocument();
  });
});
