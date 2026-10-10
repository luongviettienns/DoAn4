import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminManagementModal } from '../src/components/AdminManagementModal';
import { renderSignedIn, response, routeFetch, user } from './helpers';

const sampleMovies = [
  {
    id: 'movie-1',
    title: 'Dune: Part Two',
    originalTitle: 'Dune 2',
    durationMin: 166,
    ageRating: 'T16',
    releaseDate: '2026-03-01',
    status: 'NOW_SHOWING',
    posterUrl: 'https://example.com/dune2.jpg',
    genres: [{ id: 'genre-1', name: 'Sci-Fi', slug: 'sci-fi' }],
  },
  {
    id: 'movie-2',
    title: 'Kung Fu Panda 4',
    durationMin: 94,
    ageRating: 'P',
    releaseDate: '2026-03-08',
    status: 'NOW_SHOWING',
    posterUrl: 'https://example.com/kfp4.jpg',
    genres: [{ id: 'genre-2', name: 'Animation', slug: 'animation' }],
  },
];

const sampleGenres = [
  { id: 'genre-1', name: 'Sci-Fi', slug: 'sci-fi' },
  { id: 'genre-2', name: 'Animation', slug: 'animation' },
];

const sampleCinemas = [
  {
    id: 'cinema-1',
    name: 'CineX Landmark',
    address: 'Bình Thạnh, TP.HCM',
    city: 'Hồ Chí Minh',
    phone: '0900000001',
    roomCount: 4,
  },
];

const sampleCinemaDetails = {
  ...sampleCinemas[0],
  rooms: [
    { id: 'room-1', name: 'Cinema 1 (IMAX)', format: 'IMAX_2D', rowCount: 10, columnCount: 12, _count: { seats: 120 } },
  ],
};

const sampleShowtimes = [
  {
    id: 'st-1',
    movieId: 'movie-1',
    movieTitle: 'Dune: Part Two',
    cinemaId: 'cinema-1',
    cinemaName: 'CineX Landmark',
    roomId: 'room-1',
    roomName: 'Cinema 1 (IMAX)',
    format: 'IMAX_2D',
    language: 'SUB',
    startTime: '2026-10-10T14:00:00.000Z',
    endTime: '2026-10-10T16:50:00.000Z',
    status: 'OPEN',
  },
];

const sampleVouchers = [
  {
    id: 'v-1',
    code: 'CINEXWELCOME',
    name: 'Chào bạn mới',
    discount: 20000,
    minOrderAmount: 100000,
    maxDiscount: 20000,
    isActive: true,
  },
];

const samplePriceRules = [
  {
    id: 'pr-1',
    cinemaId: null,
    dayType: 'WEEKDAY',
    format: 'TWO_D',
    timeSlot: 'AFTERNOON',
    basePrice: 85000,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isActive: true,
  },
];

const sampleSeatSurcharges = [
  {
    id: 'sur-1',
    seatType: 'VIP',
    amount: 15000,
    effectiveFrom: '2026-01-01',
    isActive: true,
  },
];

const sampleHolidays = [
  {
    id: 'hol-1',
    date: '2026-04-30',
    name: 'Giải phóng miền Nam',
    isActive: true,
  },
];

const sampleCombos = [
  {
    id: 'cb-1',
    code: 'CB_SOLO',
    name: 'Combo Solo 1 Bắp 1 Nước',
    description: '1 bắp ngọt + 1 coca lớn',
    price: 69000,
    imageUrl: 'https://example.com/combo1.jpg',
    status: 'ACTIVE',
    items: [{ name: 'Bắp rang bơ', quantity: 1 }, { name: 'Coca Cola', quantity: 1 }],
  },
];

const sampleRefunds = {
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  items: [
    {
      id: 'ref-1',
      orderId: 'ord-1',
      paymentId: 'pay-1',
      reason: 'ORDER_CANCELLED',
      status: 'PENDING',
      method: null,
      amount: 150000,
      cancellationFee: 15000,
      policySnapshot: {},
      externalReference: null,
      note: null,
      requestedBy: null,
      processedBy: null,
      processedAt: null,
      createdAt: '2026-10-04T10:00:00.000Z',
      order: {
        id: 'ord-1',
        code: 'CX998877',
        total: 150000,
        status: 'PAID',
        refundStatus: 'PENDING',
        customerName: 'Nguyễn Văn Test',
        customerPhone: '0987654321',
        customerEmail: 'test@example.com',
        movieTitle: 'Dune: Part Two',
        cinemaName: 'CineX Landmark',
        roomName: 'Cinema 1',
        showtimeStart: '2026-10-10T14:00:00.000Z',
        source: 'ONLINE',
        paidAt: '2026-10-04T09:00:00.000Z',
      },
      payment: {
        id: 'pay-1',
        provider: 'VNPAY',
        method: 'VNPAY',
        txnRef: 'TXN12345',
        gatewayTxnNo: 'GW98765',
        amount: 150000,
        status: 'SUCCESS',
        paidAt: '2026-10-04T09:00:00.000Z',
      },
    },
  ],
};

function adminRouteFetch(extraHandler?: (url: URL, init: RequestInit) => Response | undefined) {
  routeFetch((url, init) => {
    if (extraHandler) {
      const custom = extraHandler(url, init);
      if (custom) return custom;
    }
    if (url.pathname.endsWith('/admin/refunds')) {
      return response({ success: true, data: sampleRefunds });
    }
    if (url.pathname.includes('/movies/tmdb/search')) {
      return response({
        success: true,
        data: {
          results: [
            {
              id: 438631,
              title: 'Hành Tinh Cát',
              originalTitle: 'Dune',
              overview: 'Câu chuyện thần thoại đầy cảm xúc về Paul Atreides...',
              releaseDate: '2021-09-15',
              posterUrl: 'https://image.tmdb.org/t/p/w500/dune-poster.jpg',
              backdropUrl: 'https://image.tmdb.org/t/p/w1280/dune-backdrop.jpg',
              voteAverage: 8.2,
            },
          ],
          totalResults: 1,
        },
      });
    }
    if (url.pathname.includes('/movies/tmdb/438631')) {
      return response({
        success: true,
        data: {
          id: 438631,
          title: 'Hành Tinh Cát',
          originalTitle: 'Dune',
          overview: 'Câu chuyện thần thoại đầy cảm xúc về Paul Atreides...',
          duration: 155,
          releaseDate: '2021-09-15',
          posterUrl: 'https://image.tmdb.org/t/p/w500/dune-poster.jpg',
          backdropUrl: 'https://image.tmdb.org/t/p/w1280/dune-backdrop.jpg',
          trailerUrl: 'https://www.youtube.com/watch?v=FabyRquCEtY',
          genres: ['Sci-Fi'],
          director: 'Denis Villeneuve',
          voteAverage: 8.2,
        },
      });
    }
    if (url.pathname.endsWith('/movies/genres')) {
      return response({ success: true, data: sampleGenres });
    }
    if (url.pathname.endsWith('/movies') && (!init.method || init.method === 'GET')) {
      return response({ success: true, data: sampleMovies });
    }
    if (url.pathname.endsWith('/cinemas/cinema-1')) {
      return response({ success: true, data: sampleCinemaDetails });
    }
    if (url.pathname.endsWith('/cinemas')) {
      return response({ success: true, data: sampleCinemas });
    }
    if (url.pathname.endsWith('/showtimes')) {
      return response({ success: true, data: sampleShowtimes });
    }
    if (url.pathname.endsWith('/vouchers/admin') || url.pathname.endsWith('/vouchers')) {
      return response({ success: true, data: sampleVouchers });
    }
    if (url.pathname.endsWith('/pricing/rules')) {
      return response({ success: true, data: samplePriceRules });
    }
    if (url.pathname.endsWith('/pricing/surcharges')) {
      return response({ success: true, data: sampleSeatSurcharges });
    }
    if (url.pathname.endsWith('/pricing/holidays')) {
      return response({ success: true, data: sampleHolidays });
    }
    if (url.pathname.endsWith('/combos')) {
      return response({ success: true, data: sampleCombos });
    }
    return response({ success: true, data: [] });
  }, { ...user, role: 'ADMIN' });
}

describe('AdminManagementModal', () => {
  it('renders movie management tab with movies list', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Trung Tâm Quản Trị Hệ Thống')).toBeInTheDocument();
    expect(await screen.findByText('Dune: Part Two')).toBeInTheDocument();
    expect(screen.getByText('Kung Fu Panda 4')).toBeInTheDocument();
  });

  it('filters movies by search term', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Dune: Part Two');
    const searchInput = screen.getByPlaceholderText('Tìm kiếm phim theo tên...');
    fireEvent.change(searchInput, { target: { value: 'Panda' } });

    expect(screen.getByText('Kung Fu Panda 4')).toBeInTheDocument();
    expect(screen.queryByText('Dune: Part Two')).not.toBeInTheDocument();
  });

  it('submits a new movie form successfully', async () => {
    let createdMovieData: any = null;
    adminRouteFetch((url, init) => {
      if (url.pathname.endsWith('/movies') && init.method === 'POST') {
        createdMovieData = JSON.parse(init.body as string);
        return response({
          success: true,
          data: {
            id: 'movie-3',
            ...createdMovieData,
            status: 'COMING_SOON',
            genres: [{ id: 'genre-1', name: 'Sci-Fi', slug: 'sci-fi' }],
          },
        });
      }
      return undefined;
    });

    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Dune: Part Two');
    const addMovieBtn = screen.getByRole('button', { name: /Thêm phim mới/i });
    fireEvent.click(addMovieBtn);

    const titleInput = screen.getByPlaceholderText('Ví dụ: Đất Rừng Phương Nam');
    fireEvent.change(titleInput, { target: { value: 'Avatar 3: Fire and Ash' } });

    const descInput = screen.getByPlaceholderText('Nội dung phim, đạo diễn, diễn viên chính...');
    fireEvent.change(descInput, { target: { value: 'Phần tiếp theo của siêu phẩm Avatar' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu phim mới/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Đã tạo phim "Avatar 3: Fire and Ash" thành công!')).toBeInTheDocument();
    expect(createdMovieData.title).toBe('Avatar 3: Fire and Ash');
  });

  it('switches to showtimes tab and renders showtimes for cinema', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const showtimeTab = screen.getByRole('button', { name: /Xếp Suất Chiếu/i });
    fireEvent.click(showtimeTab);

    expect(await screen.findByText('Chọn cụm rạp:')).toBeInTheDocument();
    expect(await screen.findByText('Cinema 1 (IMAX)')).toBeInTheDocument();
  });

  it('switches to rooms tab and creates a new room', async () => {
    let createdRoomData: any = null;
    adminRouteFetch((url, init) => {
      if (url.pathname.endsWith('/rooms') && init.method === 'POST') {
        createdRoomData = JSON.parse(init.body as string);
        return response({
          success: true,
          data: {
            id: 'room-new',
            ...createdRoomData,
            _count: { seats: createdRoomData.rowCount * createdRoomData.columnCount },
          },
        });
      }
      return undefined;
    });

    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const roomsTab = screen.getByRole('button', { name: /Rạp & Phòng Chiếu/i });
    fireEvent.click(roomsTab);

    expect(await screen.findByText('Danh Sách Phòng Chiếu & Sơ Đồ Ghế')).toBeInTheDocument();

    const addRoomToggle = screen.getByRole('button', { name: /Thêm phòng chiếu/i });
    fireEvent.click(addRoomToggle);

    const roomNameInput = screen.getByPlaceholderText('Ví dụ: Phòng 03 - Laser VIP');
    fireEvent.change(roomNameInput, { target: { value: 'Phòng 02 - Laser VIP' } });

    const createRoomBtn = screen.getByRole('button', { name: /Tạo phòng chiếu/i });
    fireEvent.click(createRoomBtn);

    expect(await screen.findByText(/Đã tạo phòng chiếu "Phòng 02 - Laser VIP"/)).toBeInTheDocument();
    expect(createdRoomData.name).toBe('Phòng 02 - Laser VIP');
  });

  it('switches to vouchers tab and displays existing vouchers', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const vouchersTab = screen.getByRole('button', { name: /Khuyến Mãi & Voucher/i });
    fireEvent.click(vouchersTab);

    expect(await screen.findByText('Quản Lý Khuyến Mãi & Voucher (F13)')).toBeInTheDocument();
    expect(await screen.findByText('CINEXWELCOME')).toBeInTheDocument();
    expect(screen.getByText('Chào bạn mới')).toBeInTheDocument();
  });

  it('switches to refunds tab and displays pending refund requests', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const refundsTab = screen.getByRole('button', { name: /Đối Soát & Hoàn Tiền/i });
    fireEvent.click(refundsTab);

    expect(await screen.findByText('Đối Soát & Xử Lý Hoàn Tiền (F16)')).toBeInTheDocument();
    expect(await screen.findByText('#CX998877')).toBeInTheDocument();
    expect(screen.getByText('150.000đ')).toBeInTheDocument();
    expect(screen.getByText('CHỜ XỬ LÝ')).toBeInTheDocument();
  });

  it('processes a pending refund request successfully', async () => {
    let processBody: any = null;
    adminRouteFetch((url, init) => {
      if (url.pathname.includes('/admin/refunds/ref-1/process') && init.method === 'POST') {
        processBody = JSON.parse(init.body as string);
        return response({
          success: true,
          data: {
            id: 'ref-1',
            status: 'REFUNDED',
            method: processBody.method,
            amount: 150000,
            externalReference: processBody.externalReference,
          },
        });
      }
      return undefined;
    });

    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const refundsTab = screen.getByRole('button', { name: /Đối Soát & Hoàn Tiền/i });
    fireEvent.click(refundsTab);

    expect(await screen.findByText('#CX998877')).toBeInTheDocument();
    const processBtn = screen.getByRole('button', { name: /Xử lý/i });
    fireEvent.click(processBtn);

    expect(screen.getByText(/Xác nhận hoàn tiền — Đơn #CX998877/i)).toBeInTheDocument();

    const refInput = screen.getByPlaceholderText('VD: FT2601049923 hoặc UNC-001');
    fireEvent.change(refInput, { target: { value: 'TX-REFUND-001' } });

    const confirmBtn = screen.getByRole('button', { name: /Xác Nhận Hoàn Tiền Thành Công/i });
    fireEvent.click(confirmBtn);

    expect(await screen.findByText('Đã xác nhận hoàn tiền thành công cho đơn CX998877!')).toBeInTheDocument();
    expect(processBody.externalReference).toBe('TX-REFUND-001');
  });

  it('switches to pricing tab and displays price rules and seat surcharges', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const pricingTab = screen.getByRole('button', { name: /Bảng Giá & Ngày Lễ/i });
    fireEvent.click(pricingTab);

    expect(await screen.findByText(/Quản Lý Bảng Giá Vé, Phụ Thu & Ngày Lễ/i)).toBeInTheDocument();
    expect(await screen.findByText('85.000đ')).toBeInTheDocument();
    expect(screen.getByText('WEEKDAY')).toBeInTheDocument();

    // Switch to Surcharges sub-tab
    const surchargeTabBtn = screen.getByRole('button', { name: /Phụ thu loại ghế/i });
    fireEvent.click(surchargeTabBtn);
    expect(await screen.findByText('+15.000đ')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();

    // Switch to Holidays sub-tab
    const holidayTabBtn = screen.getByRole('button', { name: /Ngày lễ toàn quốc/i });
    fireEvent.click(holidayTabBtn);
    expect(await screen.findByText('Giải phóng miền Nam')).toBeInTheDocument();
    expect(screen.getByText('2026-04-30')).toBeInTheDocument();
  });

  it('switches to combos tab and allows creating a new combo', async () => {
    let createdComboPayload: any = null;
    adminRouteFetch((url, init) => {
      if (url.pathname.endsWith('/combos') && init.method === 'POST') {
        createdComboPayload = JSON.parse(init.body as string);
        return response({
          success: true,
          data: {
            id: 'cb-2',
            ...createdComboPayload,
            status: 'ACTIVE',
          },
        });
      }
      return undefined;
    });

    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    const combosTab = screen.getByRole('button', { name: /Combo Bắp Nước/i });
    fireEvent.click(combosTab);

    expect(await screen.findByText(/Quản Lý Combo Bắp Nước/i)).toBeInTheDocument();
    expect(await screen.findByText('Combo Solo 1 Bắp 1 Nước')).toBeInTheDocument();
    expect(screen.getByText('69.000đ')).toBeInTheDocument();

    // Open add combo form
    const addComboBtn = screen.getByRole('button', { name: /Thêm Combo mới/i });
    fireEvent.click(addComboBtn);

    const codeInput = screen.getByPlaceholderText('VD: CB_POPCORN_SODA');
    const nameInput = screen.getByPlaceholderText('VD: Combo 1 Bắp 1 Nước');
    const itemsInput = screen.getByPlaceholderText('VD: 1 Bắp rang bơ phô mai, 1 Nước ngọt lớn');

    fireEvent.change(codeInput, { target: { value: 'CB_COUPLE' } });
    fireEvent.change(nameInput, { target: { value: 'Combo Couple Siêu Tiết Kiệm' } });
    fireEvent.change(itemsInput, { target: { value: '2 Bắp, 2 Nước' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo Combo/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Đã tạo combo "Combo Couple Siêu Tiết Kiệm" thành công!/i)).toBeInTheDocument();
    expect(createdComboPayload.code).toBe('CB_COUPLE');
    expect(createdComboPayload.name).toBe('Combo Couple Siêu Tiết Kiệm');
  });

  it('searches TMDB and auto-fills new movie form fields', async () => {
    adminRouteFetch();
    renderSignedIn(<AdminManagementModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Trung Tâm Quản Trị Hệ Thống');
    // Open add movie form
    const addMovieBtn = screen.getByRole('button', { name: /Thêm phim mới/i });
    fireEvent.click(addMovieBtn);

    // Find TMDB search input
    const tmdbInput = screen.getByPlaceholderText(/Nhập tên phim \(ví dụ: Dune, Mai, Deadpool/i);
    fireEvent.change(tmdbInput, { target: { value: 'Dune' } });

    const searchTmdbBtn = screen.getByRole('button', { name: /Tìm TMDB/i });
    fireEvent.click(searchTmdbBtn);

    // Expect search result to appear
    expect(await screen.findByText('Hành Tinh Cát')).toBeInTheDocument();
    expect(screen.getByText('(2021)')).toBeInTheDocument();

    // Click select button
    const selectBtn = screen.getByRole('button', { name: /Chọn/i });
    fireEvent.click(selectBtn);

    // Expect form fields to be auto-filled
    expect(await screen.findByText(/Đã tự động điền thông tin phim "Hành Tinh Cát" từ TMDB thành công!/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hành Tinh Cát')).toBeInTheDocument();
    expect(screen.getByDisplayValue('155')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://image.tmdb.org/t/p/w500/dune-poster.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://www.youtube.com/watch?v=FabyRquCEtY')).toBeInTheDocument();
  });
});
