import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { deferred, response, user } from './helpers';

function Session() {
  const auth = useAuth();
  const [error, setError] = useState('');
  const [orderCode, setOrderCode] = useState('');
  return <>
    <output aria-label="account">{auth.user?.fullName || 'guest'}</output>
    <output aria-label="token">{auth.token || 'none'}</output>
    <output aria-label="restoring">{auth.isRestoring ? 'restoring' : 'ready'}</output>
    <output aria-label="auth modal">{auth.isAuthModalOpen ? 'open' : 'closed'}</output>
    <button onClick={() => auth.login('customer@example.test', 'Password1').catch((err) => setError(err.message))}>login</button>
    <button onClick={() => auth.register({ email: 'customer@example.test', phone: '0901234567', password: 'Password1', fullName: 'Khách mới' }).catch((err) => setError(err.message))}>register</button>
    <button onClick={() => void auth.logout()}>logout</button>
    <button onClick={auth.openAuthModal}>open login</button>
    <button onClick={() => api.getOrder('order-1').then((order) => setOrderCode(order.code)).catch((err) => setError(err.message))}>load protected order</button>
    <output aria-label="order">{orderCode}</output>
    <span>{error}</span>
  </>;
}

describe('Auth session', () => {
  it.each(['login', 'register'])('leaves the restoration gate after rejected %s supersedes a slow bootstrap', async (action) => {
    localStorage.setItem('cinex_token', 'saved-token');
    const oldAccount = deferred<Response>();
    vi.stubGlobal('fetch', (input: string) => input.endsWith('/auth/me') ? oldAccount.promise
      : Promise.resolve(response({ success: false, error: { message: 'Thông tin chưa hợp lệ' } }, 400)));
    render(<AuthProvider><Session /></AuthProvider>);
    expect(screen.getByLabelText('restoring')).toHaveTextContent('restoring');
    fireEvent.click(screen.getByText(action));
    await screen.findByText('Thông tin chưa hợp lệ');
    expect(screen.getByLabelText('restoring')).toHaveTextContent('ready');
    await act(async () => oldAccount.resolve(response({ success: true, data: user })));
    expect(screen.getByLabelText('account')).toHaveTextContent('guest');
  });

  it('discards a previous account rotation after a newer login completes', async () => {
    localStorage.setItem('cinex_token', 'account-A');
    const rotation = deferred<Response>();
    const started = deferred<void>();
    let rotationSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
      if (input.endsWith('/auth/me')) return Promise.resolve(response({ success: true, data: user }));
      if (input.endsWith('/auth/login')) return Promise.resolve(response({ success: true, data: { user: { ...user, id: 'customer-B', fullName: 'Khách B' }, accessToken: 'account-B' } }));
      if (input.endsWith('/auth/refresh')) { rotationSignal = init.signal ?? undefined; started.resolve(); return rotation.promise; }
      return Promise.resolve(new Headers(init.headers).get('Authorization') === 'Bearer obsolete-A'
        ? response({ success: true, data: { code: 'OLD_ACCOUNT_TICKET' } }) : response({ success: false }, 401));
    });
    render(<AuthProvider><Session /></AuthProvider>);
    await screen.findByText('Khách kiểm thử');
    fireEvent.click(screen.getByText('load protected order'));
    await started.promise;
    fireEvent.click(screen.getByText('login'));
    await screen.findByText('Khách B');
    expect(rotationSignal?.aborted).toBe(true);
    await act(async () => rotation.resolve(response({ success: true, data: { accessToken: 'obsolete-A' } })));
    expect(screen.queryByText('OLD_ACCOUNT_TICKET')).not.toBeInTheDocument();
    expect(await screen.findByText('Phiên đăng nhập đã thay đổi')).toBeInTheDocument();
    expect(screen.getByLabelText('token')).toHaveTextContent('account-B');
    expect(localStorage.getItem('cinex_token')).toBe('account-B');
  });

  it('updates context consumers when a protected API call rotates the stored token', async () => {
    localStorage.setItem('cinex_token', 'expired');
    vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
      if (input.endsWith('/auth/me')) return response({ success: true, data: user });
      if (input.endsWith('/auth/refresh')) return response({ success: true, data: { accessToken: 'renewed' } });
      return new Headers(init.headers).get('Authorization') === 'Bearer renewed'
        ? response({ success: true, data: { code: 'MV-PAID' } })
        : response({ success: false, error: { code: 'TOKEN_EXPIRED' } }, 401);
    });
    render(<AuthProvider><Session /></AuthProvider>);
    await screen.findByText('Khách kiểm thử');
    fireEvent.click(screen.getByText('load protected order'));
    await screen.findByText('MV-PAID');
    expect(screen.getByLabelText('token')).toHaveTextContent('renewed');
  });

  it('does not overwrite a newer shared rotation when an older session restoration finishes', async () => {
    localStorage.setItem('cinex_token', 'expired');
    const oldAccount = deferred<Response>();
    vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
      if (input.endsWith('/auth/me')) return oldAccount.promise;
      if (input.endsWith('/auth/refresh')) return Promise.resolve(response({ success: true, data: { accessToken: 'renewed' } }));
      return Promise.resolve(new Headers(init.headers).get('Authorization') === 'Bearer renewed'
        ? response({ success: true, data: { code: 'MV-ROTATED' } }) : response({ success: false }, 401));
    });
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByText('load protected order'));
    await screen.findByText('MV-ROTATED');
    await act(async () => oldAccount.resolve(response({ success: true, data: user })));
    expect(screen.getByLabelText('token')).toHaveTextContent('renewed');
    expect(localStorage.getItem('cinex_token')).toBe('renewed');
    expect(screen.getByLabelText('account')).toHaveTextContent('Khách kiểm thử');
  });

  it('does not retry an old account action using credentials from a newer login', async () => {
    localStorage.setItem('cinex_token', 'account-A');
    const oldResponse = deferred<Response>();
    vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
      if (input.endsWith('/auth/me')) return Promise.resolve(response({ success: true, data: user }));
      if (input.endsWith('/auth/login')) return Promise.resolve(response({ success: true, data: { user: { ...user, id: 'customer-B', fullName: 'Khách B' }, accessToken: 'account-B' } }));
      return new Headers(init.headers).get('Authorization') === 'Bearer account-B'
        ? Promise.resolve(response({ success: true, data: { code: 'OLD_ACTION_REPLAYED_AS_B' } })) : oldResponse.promise;
    });
    render(<AuthProvider><Session /></AuthProvider>);
    await screen.findByText('Khách kiểm thử');
    fireEvent.click(screen.getByText('load protected order'));
    fireEvent.click(screen.getByText('login'));
    await screen.findByText('Khách B');
    await act(async () => oldResponse.resolve(response({ success: false, error: { code: 'TOKEN_EXPIRED' } }, 401)));
    expect(screen.queryByText('OLD_ACTION_REPLAYED_AS_B')).not.toBeInTheDocument();
    expect(await screen.findByText('Phiên đăng nhập đã thay đổi')).toBeInTheDocument();
    expect(screen.getByLabelText('token')).toHaveTextContent('account-B');
  });
  it('waits for session restoration before allowing protected result lookups', async () => {
    localStorage.setItem('cinex_token', 'access-valid');
    const account = deferred<Response>();
    vi.stubGlobal('fetch', () => account.promise);
    render(<AuthProvider><Session /></AuthProvider>);
    expect(screen.getByLabelText('restoring')).toHaveTextContent('restoring');
    await act(async () => account.resolve(response({ success: true, data: user })));
    expect(screen.getByLabelText('restoring')).toHaveTextContent('ready');
  });
  it('restores a saved valid session', async () => {
    localStorage.setItem('cinex_token', 'access-valid');
    vi.stubGlobal('fetch', async () => response({ success: true, data: user }));
    render(<AuthProvider><Session /></AuthProvider>);
    expect(await screen.findByText('Khách kiểm thử')).toBeInTheDocument();
    expect(screen.getByLabelText('token')).toHaveTextContent('access-valid');
  });

  it('recovers an expired access token through the refresh cookie once', async () => {
    localStorage.setItem('cinex_token', 'access-expired');
    vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
      if (input.endsWith('/auth/refresh') && init?.credentials === 'include') return response({ success: true, data: { accessToken: 'access-new' } });
      if (init?.headers && new Headers(init.headers).get('Authorization') === 'Bearer access-new') return response({ success: true, data: user });
      return response({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token hết hạn' } }, 401);
    });
    render(<AuthProvider><Session /></AuthProvider>);
    expect(await screen.findByText('Khách kiểm thử')).toBeInTheDocument();
    expect(screen.getByLabelText('token')).toHaveTextContent('access-new');
  });

  it('restores a cookie session after access token storage was cleared', async () => {
    vi.stubGlobal('fetch', async (input: string) => input.endsWith('/auth/refresh')
      ? response({ success: true, data: { accessToken: 'access-cookie' } })
      : response({ success: true, data: user }));
    render(<AuthProvider><Session /></AuthProvider>);
    expect(await screen.findByText('Khách kiểm thử')).toBeInTheDocument();
    expect(screen.getByLabelText('token')).toHaveTextContent('access-cookie');
  });

  it('keeps stored credentials during a temporary network outage', async () => {
    localStorage.setItem('cinex_token', 'access-valid');
    vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch'); });
    render(<AuthProvider><Session /></AuthProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(localStorage.getItem('cinex_token')).toBe('access-valid');
    expect(screen.getByLabelText('token')).toHaveTextContent('access-valid');
  });

  it('clears a session when both access and refresh credentials are invalid', async () => {
    localStorage.setItem('cinex_token', 'access-expired');
    vi.stubGlobal('fetch', async () => response({ success: false, error: { code: 'TOKEN_INVALID', message: 'Phiên hết hạn' } }, 401));
    render(<AuthProvider><Session /></AuthProvider>);
    await waitFor(() => expect(screen.getByLabelText('token')).toHaveTextContent('none'));
    expect(screen.getByLabelText('account')).toHaveTextContent('guest');
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });

  it('keeps logout final when an older account request arrives late', async () => {
    localStorage.setItem('cinex_token', 'access-valid');
    const account = deferred<Response>();
    vi.stubGlobal('fetch', (input: string) => input.endsWith('/auth/me') ? account.promise : Promise.resolve(response({ success: true, data: {} })));
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByLabelText('token')).toHaveTextContent('none'));
    await act(async () => account.resolve(response({ success: true, data: user })));
    expect(screen.getByLabelText('account')).toHaveTextContent('guest');
  });

  it('clears local credentials even when logout cannot reach the server', async () => {
    localStorage.setItem('cinex_token', 'access-valid');
    vi.stubGlobal('fetch', async (input: string) => {
      if (input.endsWith('/auth/logout')) throw new TypeError('Offline');
      return response({ success: true, data: user });
    });
    render(<AuthProvider><Session /></AuthProvider>);
    await screen.findByText('Khách kiểm thử');
    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByLabelText('account')).toHaveTextContent('guest'));
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });

  it('does not persist credentials or close login when login is rejected', async () => {
    vi.stubGlobal('fetch', async () => response({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Sai thông tin' } }, 401));
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByText('open login'));
    fireEvent.click(screen.getByText('login'));
    expect(await screen.findByText('Sai thông tin')).toBeInTheDocument();
    expect(screen.getByLabelText('auth modal')).toHaveTextContent('open');
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });
});
