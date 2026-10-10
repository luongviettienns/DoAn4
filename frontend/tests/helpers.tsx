import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../src/context/AuthContext';

export const user = {
  id: 'customer-1', email: 'customer@example.test', phone: '0901234567',
  fullName: 'Khách kiểm thử', role: 'CUSTOMER', points: 0,
};

export function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

// The network is external. Keep API, context, components, and browser storage real.
export function routeFetch(handler: (url: URL, init: RequestInit) => Response | Promise<Response>, account = user) {
  vi.stubGlobal('fetch', (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.pathname.endsWith('/auth/me') && (!init.method || init.method === 'GET')) return Promise.resolve(response({ success: true, data: account }));
    return Promise.resolve(handler(url, init));
  });
}

export function renderSignedIn(children: ReactNode) {
  localStorage.setItem('cinex_token', 'access-valid');
  return render(<AuthProvider>{children}</AuthProvider>);
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
