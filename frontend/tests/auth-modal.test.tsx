import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AuthModal } from '../src/components/AuthModal';
import { deferred, response, user } from './helpers';

function AccountControls() {
  const auth = useAuth();
  return <>
    <output aria-label="current account">{auth.user?.fullName || 'guest'}</output>
    <output aria-label="current access token">{auth.token || 'none'}</output>
    <button onClick={auth.openAuthModal}>Mở đăng nhập</button>
    <button onClick={() => void auth.logout()}>Đăng xuất phiên</button>
  </>;
}

function accountNetwork(handle: (path: string, body: Record<string, string>, init: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
    const path = new URL(input).pathname;
    if (path.endsWith('/auth/refresh')) return Promise.resolve(response({ success: false, error: { code: 'REFRESH_TOKEN_REQUIRED', message: 'Chưa đăng nhập' } }, 401));
    if (path.endsWith('/auth/logout')) return Promise.resolve(response({ success: true, data: {} }));
    return Promise.resolve(handle(path, JSON.parse(String(init.body || '{}')), init));
  });
}

async function openAccountForm() {
  const interaction = userEvent.setup();
  render(<AuthProvider><AccountControls /><AuthModal /></AuthProvider>);
  await interaction.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));
  return interaction;
}

async function fillLogin(interaction: ReturnType<typeof userEvent.setup>, email = 'customer@example.test', password = 'Password1') {
  await interaction.type(screen.getByPlaceholderText('example@gmail.com'), email);
  await interaction.type(screen.getByPlaceholderText('••••••••'), password);
}

async function fillRegister(interaction: ReturnType<typeof userEvent.setup>, phone = '0901234567') {
  await interaction.click(screen.getByRole('button', { name: 'ĐĂNG KÝ' }));
  await interaction.type(screen.getByPlaceholderText('Nguyễn Văn A'), 'Khách kiểm thử');
  await interaction.type(screen.getByPlaceholderText('0912345678'), phone);
  await fillLogin(interaction);
}

describe('Account form integration', () => {
  it('switches between the login and registration fields', async () => {
    accountNetwork(() => response({ success: false }, 401));
    const interaction = await openAccountForm();
    expect(screen.queryByPlaceholderText('0912345678')).not.toBeInTheDocument();
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG KÝ' }));
    expect(screen.getByPlaceholderText('Nguyễn Văn A')).toBeRequired();
    expect(screen.getByPlaceholderText('0912345678')).toBeRequired();
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG NHẬP' }));
    expect(screen.queryByPlaceholderText('Nguyễn Văn A')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' })).toBeEnabled();
  });

  it('logs in with the entered credentials and updates the real account session', async () => {
    accountNetwork((path, body, init) => path.endsWith('/auth/login') && init.method === 'POST' && init.credentials === 'include'
      && body.email === 'customer@example.test' && body.password === 'Password1'
      ? response({ success: true, data: { user, accessToken: 'access-from-login' } })
      : response({ success: false, error: { message: 'Thông tin đăng nhập không đúng' } }, 401));
    const interaction = await openAccountForm();
    await fillLogin(interaction);
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' }));
    expect(await screen.findByText('Khách kiểm thử')).toBeInTheDocument();
    expect(screen.getByLabelText('current access token')).toHaveTextContent('access-from-login');
    expect(localStorage.getItem('cinex_token')).toBe('access-from-login');
    expect(screen.queryByPlaceholderText('example@gmail.com')).not.toBeInTheDocument();
  });

  it('registers the entered name and Vietnamese phone and updates the account session', async () => {
    accountNetwork((path, body, init) => path.endsWith('/auth/register') && init.method === 'POST' && init.credentials === 'include'
      && body.email === 'customer@example.test' && body.password === 'Password1' && body.fullName === 'Khách kiểm thử' && body.phone === '0901234567'
      ? response({ success: true, data: { user, accessToken: 'access-from-register' } }, 201)
      : response({ success: false, error: { message: 'Dữ liệu đăng ký không đúng' } }, 400));
    const interaction = await openAccountForm();
    await fillRegister(interaction);
    await interaction.click(screen.getByRole('button', { name: 'TẠO TÀI KHOẢN' }));
    expect(await screen.findByText('Khách kiểm thử')).toBeInTheDocument();
    expect(screen.getByLabelText('current access token')).toHaveTextContent('access-from-register');
    expect(localStorage.getItem('cinex_token')).toBe('access-from-register');
    expect(screen.queryByPlaceholderText('0912345678')).not.toBeInTheDocument();
  });

  it('keeps the guest session when an invalid email blocks browser form submission', async () => {
    accountNetwork(() => response({ success: true, data: { user, accessToken: 'must-not-be-accepted' } }));
    const interaction = await openAccountForm();
    await fillLogin(interaction, 'not-an-email');
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' }));
    expect(screen.getByPlaceholderText('example@gmail.com')).toBeInvalid();
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });

  it('blocks registration with a phone that does not have ten digits starting with zero', async () => {
    accountNetwork(() => response({ success: true, data: { user, accessToken: 'must-not-be-accepted' } }));
    const interaction = await openAccountForm();
    await fillRegister(interaction, '12345');
    await interaction.click(screen.getByRole('button', { name: 'TẠO TÀI KHOẢN' }));
    expect(screen.getByPlaceholderText('0912345678')).toBeInvalid();
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });

  it('shows a server login error and enables a corrected retry', async () => {
    let validPassword = false;
    accountNetwork(() => validPassword ? response({ success: true, data: { user, accessToken: 'access-retry' } })
      : response({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' } }, 401));
    const interaction = await openAccountForm();
    await fillLogin(interaction);
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' }));
    expect(await screen.findByText('Email hoặc mật khẩu không đúng')).toBeInTheDocument();
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
    expect(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' })).toBeEnabled();
    validPassword = true;
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' }));
    expect(await screen.findByText('Khách kiểm thử')).toBeInTheDocument();
  });

  it.each([
    { code: 'EMAIL_EXISTS', message: 'Email đã được sử dụng' },
    { code: 'VALIDATION_ERROR', message: 'Mật khẩu phải có chữ và số' },
  ])('preserves registration input and displays the server $code error', async ({ code, message }) => {
    accountNetwork(() => response({ success: false, error: { code, message, details: [] } }, 400));
    const interaction = await openAccountForm();
    await fillRegister(interaction);
    await interaction.click(screen.getByRole('button', { name: 'TẠO TÀI KHOẢN' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nguyễn Văn A')).toHaveValue('Khách kiểm thử');
    expect(screen.getByPlaceholderText('example@gmail.com')).toHaveValue('customer@example.test');
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
    expect(localStorage.getItem('cinex_token')).toBeNull();
    expect(screen.getByRole('button', { name: 'TẠO TÀI KHOẢN' })).toBeEnabled();
  });

  it('shows an in-flight login and ignores its late response after logout', async () => {
    const pending = deferred<Response>();
    accountNetwork(() => pending.promise);
    const interaction = await openAccountForm();
    await fillLogin(interaction);
    await interaction.click(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' }));
    expect(screen.getByRole('button', { name: 'Đang xử lý...' })).toBeDisabled();
    await interaction.click(screen.getByRole('button', { name: 'Đăng xuất phiên' }));
    await act(async () => pending.resolve(response({ success: true, data: { user, accessToken: 'stale-login-token' } })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' })).toBeEnabled());
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
    expect(localStorage.getItem('cinex_token')).toBeNull();
  });

  it('closes the account form without signing the guest in', async () => {
    accountNetwork(() => response({ success: false }, 401));
    const interaction = await openAccountForm();
    await interaction.click(screen.getByRole('button', { name: 'Đóng cửa sổ đăng nhập' }));
    expect(screen.queryByPlaceholderText('example@gmail.com')).not.toBeInTheDocument();
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
  });
});
