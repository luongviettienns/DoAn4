import { describe, expect, it, vi } from 'vitest';
import { api } from '../src/services/api';
import { deferred, response } from './helpers';

describe('API boundary', () => {
  it('keeps a shared rotation alive for another protected caller when only one poll is aborted', async () => {
    localStorage.setItem('cinex_token', 'expired');
    const controller = new AbortController();
    const rotation = deferred<Response>();
    const started = deferred<void>();
    let rotationSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
      if (input.endsWith('/auth/refresh')) { rotationSignal = init.signal ?? undefined; started.resolve(); return rotation.promise; }
      return Promise.resolve(new Headers(init.headers).get('Authorization') === 'Bearer renewed'
        ? response({ success: true, data: { id: 'still-active-order' } }) : response({ success: false }, 401));
    });
    const first = api.getOrder('aborted-order', controller.signal);
    const second = api.getOrder('still-active-order');
    await started.promise;
    controller.abort();
    expect(rotationSignal?.aborted).toBe(false);
    rotation.resolve(response({ success: true, data: { accessToken: 'renewed' } }));
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(await second).toEqual({ id: 'still-active-order' });
    expect(localStorage.getItem('cinex_token')).toBe('renewed');
  });

  it('uses one cookie rotation for concurrent protected requests and retries both with the rotated access token', async () => {
    localStorage.setItem('cinex_token', 'expired');
    const rotation = deferred<Response>();
    const started = deferred<void>();
    let rotations = 0;
    vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
      if (input.endsWith('/auth/refresh')) { rotations++; started.resolve(); return rotation.promise; }
      if (new Headers(init.headers).get('Authorization') !== 'Bearer renewed') return Promise.resolve(response({ success: false }, 401));
      return Promise.resolve(response({ success: true, data: { id: input.endsWith('/orders/pending') ? 'held-2' : 'paid-1' } }));
    });
    const first = api.getOrder('paid-1');
    const second = api.getPendingOrder();
    await started.promise;
    rotation.resolve(response({ success: true, data: { accessToken: 'renewed' } }));
    expect(await Promise.all([first, second])).toEqual([{ id: 'paid-1' }, { id: 'held-2' }]);
    expect(rotations).toBe(1);
    expect(localStorage.getItem('cinex_token')).toBe('renewed');
  });

  it('does not persist or retry a rotation after its protected request is aborted', async () => {
    localStorage.setItem('cinex_token', 'expired');
    const controller = new AbortController();
    const rotation = deferred<Response>();
    const started = deferred<void>();
    vi.stubGlobal('fetch', (input: string) => {
      if (input.endsWith('/auth/refresh')) { started.resolve(); return rotation.promise; }
      return Promise.resolve(response({ success: false }, 401));
    });
    const pending = api.getOrder('paid-1', controller.signal);
    await started.promise;
    controller.abort();
    rotation.resolve(response({ success: true, data: { accessToken: 'obsolete' } }));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(localStorage.getItem('cinex_token')).toBe('expired');
  });
  it('encodes movie search and pagination and forwards request cancellation', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', async (input: string, init: RequestInit) => {
      const url = new URL(input);
      expect(url.searchParams.get('search')).toBe('Phim & Bạn');
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('limit')).toBe('12');
      expect(init.signal).toBe(controller.signal);
      return response({ success: true, data: [], meta: { total: 31 } });
    });
    expect(await api.getMovies('NOW_SHOWING', { search: 'Phim & Bạn', page: 2, limit: 12, signal: controller.signal })).toEqual({ data: [], total: 31 });
  });

  it('refreshes an expired access token once before fetching the authoritative order', async () => {
    localStorage.setItem('cinex_token', 'expired');
    vi.stubGlobal('fetch', async (input: string, init: RequestInit) => {
      if (input.endsWith('/auth/refresh')) return response({ success: true, data: { accessToken: 'renewed' } });
      return (init.headers as Record<string, string>).Authorization === 'Bearer renewed'
        ? response({ success: true, data: { id: 'order-1', status: 'PAID' } })
        : response({ success: false, error: { code: 'TOKEN_EXPIRED' } }, 401);
    });
    expect(await api.getOrder('order-1')).toMatchObject({ status: 'PAID' });
    expect(localStorage.getItem('cinex_token')).toBe('renewed');
  });

  it('does not restore credentials when logout happens during a protected refresh', async () => {
    localStorage.setItem('cinex_token', 'expired');
    const rotation = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(async (input: string) => input.endsWith('/auth/refresh') ? rotation.promise
      : response({ success: false, error: { code: 'TOKEN_EXPIRED' } }, 401)));
    const pending = api.getOrder('order-1');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    localStorage.removeItem('cinex_token');
    rotation.resolve(response({ success: true, data: { accessToken: 'obsolete' } }));
    await expect(pending).rejects.toThrow('Phiên đăng nhập đã thay đổi');
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });
  it('propagates the server login error to the caller', async () => {
    vi.stubGlobal('fetch', async () => response({ success: false, error: { code: 'ACCOUNT_LOCKED', message: 'Tài khoản bị khóa' } }, 403));
    await expect(api.login('customer@example.test', 'Password1')).rejects.toThrow('Tài khoản bị khóa');
  });

  it('reports a useful login error when the gateway returns HTML', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(api.login('customer@example.test', 'Password1')).rejects.toThrow('Đăng nhập thất bại');
  });

  it('does not treat a rejected logout as successful', async () => {
    vi.stubGlobal('fetch', async () => response({ success: false, error: { message: 'Không thể đăng xuất' } }, 503));
    await expect(api.logout()).rejects.toThrow('Không thể đăng xuất');
  });

  it('encodes the cinema filter while returning real catalog data', async () => {
    vi.stubGlobal('fetch', async (input: string) => {
      const city = new URL(input).searchParams.get('city');
      return response({ success: true, data: city === 'Hồ Chí Minh & Bình Dương' ? [{ id: 'cinema-1', name: 'CineX Test', address: 'Địa chỉ', city, phone: '0901234567', roomCount: 1 }] : [] });
    });
    expect(await api.getCinemas('Hồ Chí Minh & Bình Dương')).toEqual([
      { id: 'cinema-1', name: 'CineX Test', address: 'Địa chỉ', city: 'Hồ Chí Minh & Bình Dương', phone: '0901234567', roomCount: 1 },
    ]);
  });

  it('returns server pagination rather than only the page length', async () => {
    vi.stubGlobal('fetch', async (input: string) => response({ success: true, data: [], meta: { total: new URL(input).searchParams.get('status') === 'COMING_SOON' ? 21 : 0 } }));
    expect(await api.getMovies('COMING_SOON')).toEqual({ data: [], total: 21 });
  });

  it('shares one in-flight cookie rotation across concurrent refresh callers', async () => {
    const refresh = deferred<Response>();
    let rotations = 0;
    vi.stubGlobal('fetch', (_input: string, init: RequestInit) => {
      if (init.credentials !== 'include') return Promise.resolve(response({ success: false }, 401));
      rotations++;
      return refresh.promise;
    });
    const first = api.refresh();
    const second = api.refresh();
    refresh.resolve(response({ success: true, data: { accessToken: 'shared-access' } }));
    expect(await Promise.all([first, second])).toEqual([{ accessToken: 'shared-access' }, { accessToken: 'shared-access' }]);
    expect(rotations).toBe(1);
  });

  it('allows a later refresh after a temporary failed rotation', async () => {
    let available = false;
    vi.stubGlobal('fetch', async () => available
      ? response({ success: true, data: { accessToken: 'access-restored' } })
      : response({ success: false, error: { message: 'Dịch vụ tạm ngưng' } }, 503));
    await expect(api.refresh()).rejects.toThrow('Dịch vụ tạm ngưng');
    available = true;
    expect(await api.refresh()).toEqual({ accessToken: 'access-restored' });
  });
});
