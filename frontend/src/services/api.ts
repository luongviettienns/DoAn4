const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface ApiUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: string;
  points: number;
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

export const api = {
  // Auth
  async login(email: string, password: string):Promise<{ user: ApiUser; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Đăng nhập thất bại');
    return json.data;
  },

  async register(data: { email: string; phone: string; password: string; fullName: string }): Promise<{ user: ApiUser; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Đăng ký thất bại');
    return json.data;
  },

  async getMe(token: string): Promise<ApiUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Không thể lấy thông tin tài khoản');
    return json.data;
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  // Movies
  async getMovies(status?: string): Promise<{ data: ApiMovie[]; total: number }> {
    const url = new URL(`${API_BASE}/movies`);
    if (status) url.searchParams.set('status', status);
    const res = await fetch(url.toString());
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Không thể tải danh sách phim');
    return { data: json.data, total: json.meta?.total || json.data.length };
  },

  // Cinemas
  async getCinemas(city?: string): Promise<ApiCinema[]> {
    const url = new URL(`${API_BASE}/cinemas`);
    if (city) url.searchParams.set('city', city);
    const res = await fetch(url.toString());
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Không thể tải danh sách rạp');
    return json.data;
  },
};
