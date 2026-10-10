const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  meta?: { total?: number };
  error?: { code?: string; message?: string };
  message?: string;
}

async function readResponse<T>(res: Response, fallback: string): Promise<ApiEnvelope<T>> {
  let json: ApiEnvelope<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(fallback, res.status);
  }
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error?.message || json.message || fallback, res.status, json.error?.code);
  }
  return json;
}

let refreshInFlight: Promise<{ accessToken: string }> | null = null;
let refreshController: AbortController | null = null;
let authSessionVersion = 0;
export const ACCESS_TOKEN_EVENT = 'cinex-access-token-changed';

export function getAuthSessionVersion() {
  return authSessionVersion;
}

export function invalidateAuthRequests() {
  authSessionVersion++;
  // Stop a previous account's cookie response before beginning login/logout.
  refreshController?.abort();
  refreshController = null;
  // A new account must not join a cookie rotation belonging to the previous account.
  refreshInFlight = null;
}

export function storeAccessToken(token: string | null) {
  if (localStorage.getItem('cinex_token') === token) return;
  if (token) localStorage.setItem('cinex_token', token);
  else localStorage.removeItem('cinex_token');
  window.dispatchEvent(new Event(ACCESS_TOKEN_EVENT));
}

function requireSessionVersion(version: number) {
  if (version !== authSessionVersion) throw new ApiError('Phiên đăng nhập đã thay đổi', 401);
}

export interface ApiUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
  points: number;
  emailVerifiedAt?: string | null;
  avatarUrl?: string | null;
}

export interface ApiGoogleLoginResponse {
  requirePhone: boolean;
  user?: ApiUser;
  accessToken?: string;
  tempToken?: string;
  googleProfile?: {
    email: string;
    name: string;
    picture: string;
  };
}

export interface ApiGenre {
  id: string;
  name: string;
  slug: string;
}

export interface CreateMovieInput {
  title: string;
  originalTitle?: string;
  posterUrl: string;
  bannerUrl?: string;
  trailerUrl?: string;
  description: string;
  durationMin: number;
  ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C';
  releaseDate: string;
  endDate?: string;
  director?: string;
  cast?: string[];
  language?: string;
  country?: string;
  genreIds: string[];
}

export interface ApiTmdbMovieSummary {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number;
}

export interface ApiTmdbMovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  duration: number;
  releaseDate: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  genres: string[];
  director: string | null;
  voteAverage: number;
}

export interface CreateShowtimeInput {
  movieId: string;
  roomId: string;
  startTime: string;
  format: 'TWO_D' | 'THREE_D' | 'IMAX_2D' | 'IMAX_3D';
  language: 'SUB' | 'DUB';
  adMinutes?: number;
  cleaningMinutes?: number;
}

export interface CreateRoomInput {
  cinemaId: string;
  name: string;
  format: 'TWO_D' | 'THREE_D' | 'IMAX_2D' | 'IMAX_3D';
  rowCount: number;
  columnCount: number;
}

export interface CreateCinemaInput {
  name: string;
  address: string;
  city: string;
  phone: string;
  openTime?: string;
  closeTime?: string;
}

export interface CinemaWithRooms extends ApiCinema {
  rooms: Array<{
    id: string;
    name: string;
    format: string;
    rowCount: number;
    columnCount: number;
    _count: { seats: number };
  }>;
}

export interface ApiMovie {
  id: string;
  title: string;
  originalTitle?: string;
  posterUrl: string;
  bannerUrl?: string;
  trailerUrl?: string;
  description: string;
  durationMin: number;
  ageRating: string;
  releaseDate: string;
  status: string;
  genres: Array<{ id: string; name: string; slug: string }>;
}

export interface ApiCinema {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  roomCount: number;
}

export interface ApiShowtime {
  id: string; movieId: string; movieTitle: string; cinemaId: string; cinemaName: string;
  roomId: string; roomName: string; format: string; language: string; startTime: string; endTime: string; status: string;
}

export interface ApiSeat {
  id: string; seatId: string; rowLabel: string; seatNumber: number;
  seatType: 'STANDARD' | 'VIP' | 'COUPLE' | 'BLOCKED'; x: number; y: number; columnSpan: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED'; price: number; heldByCurrentUser?: boolean;
}

export interface ShowtimeSeatData {
  showtime: { id: string; startTime: string; endTime: string; format: string; language: string; basePrice: number };
  movie: { id: string; title: string; ageRating: string; durationMin: number; posterUrl: string | null };
  cinema: { id: string; name: string; address: string };
  room: { id: string; name: string; rowCount: number; columnCount: number };
  seats: ApiSeat[];
}

export interface ApiOrder {
  id: string; code: string; userId: string | null; showtimeId: string; cinemaId: string;
  status: string; refundStatus: string; source: string;
  ticketSubtotal: number; comboSubtotal: number; subtotal: number; discount: number; total: number; currency: string;
  expiresAt: string; createdAt: string; paidAt: string | null;
  snapshot: { movieTitle: string; posterUrl: string | null; ageRating: string; cinemaName: string; cinemaAddress: string;
    roomName: string; format: string; language: string; startTime: string; endTime: string };
  items: Array<{ id: string; seatId: string; seatLabel: string; seatType: string; price: number;
    ticket: { id: string; ticketCode: string; qrCode?: string; status: string; checkedInAt: string | null } | null }>;
  combos: Array<{ id: string; comboId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  voucher: { code: string; name: string; discount: number } | null;
  payments: Array<{ id: string; status: string; method?: string }>;
}

export interface ApiCombo {
  id: string;
  code?: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  items?: Array<{ name: string; quantity?: number }> | string[];
  cinemas?: Array<{ cinemaId: string; cinema?: { name: string } }>;
}
export interface OrderChanges { seatIds?: string[]; ageConfirmed?: boolean; combos?: Array<{ comboId: string; quantity: number }>; voucherCode?: string | null }

async function request<T>(path: string, fallback: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const sessionVersion = getAuthSessionVersion();
  const originalToken = localStorage.getItem('cinex_token');
  const ensureCurrent = () => {
    init.signal?.throwIfAborted();
    if (authenticated) requireSessionVersion(sessionVersion);
  };
  const send = (token: string | null) => fetch(`${API_BASE}${path}`, {
    ...init, credentials: 'include', headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers,
    },
  }).then((res) => readResponse<T>(res, fallback));
  ensureCurrent();
  try {
    const result = await send(originalToken);
    ensureCurrent();
    return result.data;
  }
  catch (error) {
    ensureCurrent();
    if (!authenticated || !(error instanceof ApiError) || error.status !== 401 || !originalToken) throw error;
    // Another request may already have refreshed this token.
    const currentToken = localStorage.getItem('cinex_token');
    if (!currentToken) throw new ApiError('Phiên đăng nhập đã thay đổi', 401);
    const nextToken = currentToken && currentToken !== originalToken ? currentToken : (await api.refresh()).accessToken;
    ensureCurrent();
    const stored = localStorage.getItem('cinex_token');
    if (!stored || (stored !== originalToken && stored !== nextToken)) throw new ApiError('Phiên đăng nhập đã thay đổi', 401);
    storeAccessToken(nextToken);
    const result = await send(nextToken);
    ensureCurrent();
    return result.data;
  }
}

export const api = {
  // Auth
  async login(email: string, password: string):Promise<{ user: ApiUser; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const json = await readResponse<{ user: ApiUser; accessToken: string }>(res, 'Đăng nhập thất bại');
    return json.data;
  },

  async register(data: { email: string; phone: string; password: string; fullName: string }): Promise<{ user: ApiUser; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const json = await readResponse<{ user: ApiUser; accessToken: string }>(res, 'Đăng ký thất bại');
    return json.data;
  },

  async googleLogin(credential: string, phone?: string): Promise<ApiGoogleLoginResponse> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential, phone }),
    });
    const json = await readResponse<ApiGoogleLoginResponse>(res, 'Đăng nhập Google thất bại');
    return json.data;
  },

  async completeGoogleRegistration(tempToken: string, phone: string): Promise<{ user: ApiUser; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tempToken, phone }),
    });
    const json = await readResponse<{ user: ApiUser; accessToken: string }>(res, 'Hoàn tất đăng ký Google thất bại');
    return json.data;
  },

  async getMe(token: string): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await readResponse<ApiUser>(res, 'Không thể lấy thông tin tài khoản');
    return json.data;
  },

  refresh(): Promise<{ accessToken: string }> {
    // Rotation makes duplicate refresh calls invalidate the same cookie.
    if (!refreshInFlight) {
      const sessionVersion = getAuthSessionVersion();
      const controller = new AbortController();
      refreshController = controller;
      const rotation = fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST', credentials: 'include', signal: controller.signal,
      })
        .then((res) => readResponse<{ accessToken: string }>(res, 'Phiên đăng nhập đã hết hạn'))
        .then((json) => { requireSessionVersion(sessionVersion); return json.data; })
        .finally(() => {
          if (refreshInFlight === rotation) refreshInFlight = null;
          if (refreshController === controller) refreshController = null;
        });
      refreshInFlight = rotation;
    }
    return refreshInFlight;
  },

  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.status !== 204) await readResponse(res, 'Không thể đăng xuất');
  },

  // Movies
  async getMovies(status?: string, options: { search?: string; page?: number; limit?: number; signal?: AbortSignal } = {}): Promise<{ data: ApiMovie[]; total: number }> {
    const url = new URL(`${API_BASE}/movies`);
    if (status) url.searchParams.set('status', status);
    if (options.search) url.searchParams.set('search', options.search);
    if (options.page) url.searchParams.set('page', String(options.page));
    if (options.limit) url.searchParams.set('limit', String(options.limit));
    const res = await fetch(url.toString(), { signal: options.signal });
    const json = await readResponse<ApiMovie[]>(res, 'Không thể tải danh sách phim');
    return { data: json.data, total: json.meta?.total ?? json.data.length };
  },

  // Cinemas
  async getCinemas(city?: string, signal?: AbortSignal): Promise<ApiCinema[]> {
    const url = new URL(`${API_BASE}/cinemas`);
    if (city) url.searchParams.set('city', city);
    const res = await fetch(url.toString(), { signal });
    const json = await readResponse<ApiCinema[]>(res, 'Không thể tải danh sách rạp');
    return json.data;
  },

  getShowtimes(query: { movieId?: string; cinemaId?: string; date?: string; format?: string }, signal?: AbortSignal): Promise<ApiShowtime[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => { if (value) params.set(key, value); });
    return request(`/showtimes?${params}`, 'Không thể tải suất chiếu', { signal });
  },
  getShowtimeSeats(id: string, signal?: AbortSignal): Promise<ShowtimeSeatData> {
    return request(`/showtimes/${encodeURIComponent(id)}/seats`, 'Không thể tải sơ đồ ghế cho suất chiếu này', { signal }, true);
  },
  getOrder(id: string, signal?: AbortSignal): Promise<ApiOrder> {
    return request(`/orders/${encodeURIComponent(id)}`, 'Không thể tải thông tin đơn hàng', { signal }, true);
  },
  getPendingOrder(showtimeId?: string, signal?: AbortSignal): Promise<ApiOrder | null> {
    return request(`/orders/pending${showtimeId ? `?showtimeId=${encodeURIComponent(showtimeId)}` : ''}`, 'Không thể khôi phục đơn giữ ghế', { signal }, true);
  },
  createOrder(data: OrderChanges & { showtimeId: string }, key: string): Promise<ApiOrder> {
    return request('/orders', 'Không thể giữ ghế', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(data) }, true);
  },
  updateOrder(id: string, data: OrderChanges): Promise<ApiOrder> {
    return request(`/orders/${encodeURIComponent(id)}`, 'Không thể cập nhật đơn giữ ghế', { method: 'PATCH', body: JSON.stringify(data) }, true);
  },
  cancelOrder(id: string, keyOrOptions?: string | { key?: string; reason?: string; pendingOnly?: boolean }): Promise<{ success?: boolean; message?: string }> {
    const opts = typeof keyOrOptions === 'string'
      ? { key: keyOrOptions, pendingOnly: true }
      : (keyOrOptions || {});
    const headers: Record<string, string> = {};
    if (opts.key) headers['Idempotency-Key'] = opts.key;
    return request(`/orders/${encodeURIComponent(id)}/cancel`, 'Không thể hủy đơn hàng', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reason: opts.reason,
        pendingOnly: opts.pendingOnly ?? false,
      }),
    }, true);
  },
  initiatePayment(id: string, key: string): Promise<{ paymentUrl: string }> {
    return request(`/orders/${encodeURIComponent(id)}/pay`, 'Không thể khởi tạo cổng VNPay', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ method: 'VNPAY', locale: 'vn' }) }, true);
  },
  simulatePayment(orderId: string): Promise<unknown> {
    return request('/payment/simulate-mock', 'Thanh toán mô phỏng thất bại', { method: 'POST', body: JSON.stringify({ orderId }) }, true);
  },
  getCombos(cinemaId: string, signal?: AbortSignal): Promise<ApiCombo[]> {
    return request(`/combos?cinemaId=${encodeURIComponent(cinemaId)}`, 'Không thể tải combo', { signal });
  },

  // User Profile & Password
  updateProfile(data: { fullName?: string; phone?: string }): Promise<ApiUser> {
    return request('/auth/me', 'Không thể cập nhật thông tin', { method: 'PUT', body: JSON.stringify(data) }, true);
  },
  changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request('/auth/change-password', 'Không thể đổi mật khẩu', { method: 'PUT', body: JSON.stringify(data) }, true);
  },
  forgotPassword(email: string): Promise<{ message: string }> {
    return fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((res) => readResponse<{ message: string }>(res, 'Không thể gửi yêu cầu đặt lại mật khẩu')).then((j) => j.data || { message: j.message || 'Đã gửi yêu cầu' });
  },
  resetPassword(data: { token: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => readResponse<{ success: boolean; message: string }>(res, 'Không thể đặt lại mật khẩu')).then((j) => j.data || { success: true, message: j.message || 'Đặt lại mật khẩu thành công' });
  },
  resendVerification(email: string): Promise<{ message: string }> {
    return fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((res) => readResponse<{ message: string }>(res, 'Không thể gửi lại email xác thực')).then((j) => j.data || { message: j.message || 'Đã gửi lại email' });
  },

  // Movie Management
  getGenres(signal?: AbortSignal): Promise<ApiGenre[]> {
    return request('/movies/genres', 'Không thể tải danh sách thể loại', { signal });
  },
  createMovie(data: CreateMovieInput): Promise<ApiMovie> {
    return request('/movies', 'Không thể tạo phim mới', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  updateMovie(id: string, data: Partial<CreateMovieInput>): Promise<ApiMovie> {
    return request(`/movies/${encodeURIComponent(id)}`, 'Không thể cập nhật phim', { method: 'PUT', body: JSON.stringify(data) }, true);
  },
  deleteMovie(id: string): Promise<{ success: boolean }> {
    return request(`/movies/${encodeURIComponent(id)}`, 'Không thể ẩn/xóa phim', { method: 'DELETE' }, true);
  },
  searchTmdbMovies(query: string, page = 1, signal?: AbortSignal): Promise<{ results: ApiTmdbMovieSummary[]; totalResults: number }> {
    const params = new URLSearchParams({ query, page: String(page) });
    return request(`/movies/tmdb/search?${params.toString()}`, 'Không thể tìm kiếm phim trên TMDB', { signal }, true);
  },
  getTmdbMovieDetails(tmdbId: number, signal?: AbortSignal): Promise<ApiTmdbMovieDetails> {
    return request(`/movies/tmdb/${encodeURIComponent(tmdbId)}`, 'Không thể lấy thông tin chi tiết phim từ TMDB', { signal }, true);
  },

  // Showtime & Cinema Management
  createShowtime(data: CreateShowtimeInput): Promise<ApiShowtime> {
    return request('/showtimes', 'Không thể tạo suất chiếu', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  createRoom(data: CreateRoomInput): Promise<unknown> {
    return request('/cinemas/rooms', 'Không thể tạo phòng chiếu', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  createCinema(data: CreateCinemaInput): Promise<ApiCinema> {
    return request('/cinemas', 'Không thể tạo cụm rạp', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  getCinemaDetails(id: string, signal?: AbortSignal): Promise<CinemaWithRooms> {
    return request(`/cinemas/${encodeURIComponent(id)}`, 'Không thể tải thông tin cụm rạp', { signal });
  },
  getAdminVouchers(signal?: AbortSignal): Promise<any[]> {
    return request('/vouchers/admin', 'Không thể tải danh sách voucher', { signal }, true);
  },

  // Refund Management (F16 / Đối soát & Hoàn tiền)
  getAdminRefunds(params?: { status?: string; reason?: string; page?: number; limit?: number }, signal?: AbortSignal): Promise<ApiRefundListResponse> {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.reason) q.append('reason', params.reason);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/admin/refunds${qs}`, 'Không thể tải danh sách hoàn tiền', { signal }, true);
  },
  getAdminRefundDetail(id: string, signal?: AbortSignal): Promise<any> {
    return request(`/admin/refunds/${encodeURIComponent(id)}`, 'Không thể tải chi tiết yêu cầu hoàn tiền', { signal }, true);
  },
  processAdminRefund(id: string, data: ProcessRefundInput): Promise<any> {
    return request(`/admin/refunds/${encodeURIComponent(id)}/process`, 'Không thể xử lý yêu cầu hoàn tiền', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  // Pricing Management (Bảng giá, Phụ thu, Ngày lễ)
  getPriceRules(cinemaId?: string, signal?: AbortSignal): Promise<ApiPriceRule[]> {
    const q = cinemaId ? `?cinemaId=${encodeURIComponent(cinemaId)}` : '';
    return request(`/pricing/rules${q}`, 'Không thể tải bảng giá vé', { signal }, true);
  },
  upsertPriceRule(data: CreatePriceRuleInput): Promise<ApiPriceRule> {
    return request('/pricing/rules', 'Không thể lưu bảng giá vé', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  deletePriceRule(id: string): Promise<{ success: boolean }> {
    return request(`/pricing/rules/${encodeURIComponent(id)}`, 'Không thể xóa bảng giá', { method: 'DELETE' }, true);
  },
  getSeatSurcharges(cinemaId?: string, signal?: AbortSignal): Promise<ApiSeatSurcharge[]> {
    const q = cinemaId ? `?cinemaId=${encodeURIComponent(cinemaId)}` : '';
    return request(`/pricing/surcharges${q}`, 'Không thể tải phụ thu ghế', { signal }, true);
  },
  upsertSeatSurcharge(data: CreateSeatSurchargeInput): Promise<ApiSeatSurcharge> {
    return request('/pricing/surcharges', 'Không thể lưu phụ thu ghế', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  deleteSeatSurcharge(id: string): Promise<{ success: boolean }> {
    return request(`/pricing/surcharges/${encodeURIComponent(id)}`, 'Không thể xóa phụ thu ghế', { method: 'DELETE' }, true);
  },
  getHolidays(signal?: AbortSignal): Promise<ApiHoliday[]> {
    return request('/pricing/holidays', 'Không thể tải danh sách ngày lễ', { signal }, true);
  },
  createHoliday(data: CreateHolidayInput): Promise<ApiHoliday> {
    return request('/pricing/holidays', 'Không thể tạo ngày lễ', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  deleteHoliday(id: string): Promise<{ success: boolean }> {
    return request(`/pricing/holidays/${encodeURIComponent(id)}`, 'Không thể xóa ngày lễ', { method: 'DELETE' }, true);
  },

  // Combo Management (Admin & Manager)
  getAdminCombos(cinemaId?: string, signal?: AbortSignal): Promise<ApiCombo[]> {
    const q = cinemaId ? `?cinemaId=${encodeURIComponent(cinemaId)}` : '';
    return request(`/combos${q}`, 'Không thể tải danh sách combo', { signal }, true);
  },
  createCombo(data: CreateComboInput): Promise<ApiCombo> {
    return request('/combos', 'Không thể tạo combo', { method: 'POST', body: JSON.stringify(data) }, true);
  },
  updateCombo(id: string, data: Partial<CreateComboInput>): Promise<ApiCombo> {
    return request(`/combos/${encodeURIComponent(id)}`, 'Không thể cập nhật combo', { method: 'PUT', body: JSON.stringify(data) }, true);
  },
  deleteCombo(id: string): Promise<{ success: boolean }> {
    return request(`/combos/${encodeURIComponent(id)}`, 'Không thể xóa combo', { method: 'DELETE' }, true);
  },

  // Report Export CSV
  async exportReportCsv(params: { from?: string; to?: string; type: 'DAILY' | 'MOVIE' | 'CINEMA'; cinemaId?: string }): Promise<void> {
    const q = new URLSearchParams();
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    if (params.type) q.append('type', params.type);
    if (params.cinemaId) q.append('cinemaId', params.cinemaId);

    const token = localStorage.getItem('cinex_token');
    const res = await fetch(`${API_BASE}/admin/reports/export?${q.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      let errMsg = 'Không thể xuất báo cáo CSV';
      try {
        const json = await res.json();
        errMsg = json.message || errMsg;
      } catch {}
      throw new ApiError(errMsg, res.status);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    let filename = `bao-cao-${params.type.toLowerCase()}.csv`;
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export interface ApiRefundItem {
  id: string;
  orderId: string;
  paymentId: string;
  reason: string;
  status: 'PENDING' | 'REFUNDED';
  method: string | null;
  amount: number;
  cancellationFee: number;
  policySnapshot: any;
  externalReference: string | null;
  note: string | null;
  requestedBy: { id: string; fullName: string; email: string } | null;
  processedBy: { id: string; fullName: string; email: string } | null;
  processedAt: string | null;
  createdAt: string;
  order: {
    id: string;
    code: string;
    total: number;
    status: string;
    refundStatus: string;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    movieTitle: string;
    cinemaName: string;
    roomName: string;
    showtimeStart: string;
    source: string;
    paidAt: string | null;
  };
  payment: {
    id: string;
    provider: string;
    method: string;
    txnRef: string | null;
    gatewayTxnNo: string | null;
    amount: number;
    status: string;
    paidAt: string | null;
  };
}

export interface ApiRefundListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: ApiRefundItem[];
}

export interface ProcessRefundInput {
  method: 'BANK_TRANSFER' | 'CASH' | 'PROVIDER_MANUAL';
  externalReference?: string;
  note?: string;
}

export interface ApiPriceRule {
  id: string;
  cinemaId: string;
  roomFormat: 'TWO_D' | 'THREE_D' | 'IMAX';
  dayType: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  basePrice: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceRuleInput {
  cinemaId: string;
  roomFormat: 'TWO_D' | 'THREE_D' | 'IMAX';
  dayType: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  basePrice: number;
  effectiveFrom: string;
}

export interface ApiSeatSurcharge {
  id: string;
  cinemaId: string;
  seatType: 'STANDARD' | 'VIP' | 'COUPLE';
  amount: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeatSurchargeInput {
  cinemaId: string;
  seatType: 'STANDARD' | 'VIP' | 'COUPLE';
  amount: number;
  effectiveFrom: string;
}

export interface ApiHoliday {
  id: string;
  date: string;
  name: string;
  createdAt: string;
}

export interface CreateHolidayInput {
  date: string;
  name: string;
}

export interface CreateComboInput {
  code: string;
  name: string;
  description?: string;
  price: number;
  items: Array<{ name: string; quantity: number }>;
  cinemaIds?: string[];
}

