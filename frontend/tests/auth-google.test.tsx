import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AuthModal } from '../src/components/AuthModal';
import { response, user } from './helpers';

function AccountControls() {
  const auth = useAuth();
  return (
    <>
      <output aria-label="current account">{auth.user?.fullName || 'guest'}</output>
      <output aria-label="current access token">{auth.token || 'none'}</output>
      <button onClick={auth.openAuthModal}>Mở đăng nhập</button>
      <button onClick={() => void auth.logout()}>Đăng xuất phiên</button>
    </>
  );
}

function googleNetwork(handle: (path: string, body: Record<string, string>, init: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', (input: string, init: RequestInit = {}) => {
    const path = new URL(input).pathname;
    if (path.endsWith('/auth/refresh')) {
      return Promise.resolve(response({ success: false, error: { code: 'REFRESH_TOKEN_REQUIRED', message: 'Chưa đăng nhập' } }, 401));
    }
    if (path.endsWith('/auth/logout')) {
      return Promise.resolve(response({ success: true, data: {} }));
    }
    return Promise.resolve(handle(path, JSON.parse(String(init.body || '{}')), init));
  });
}

async function openAccountForm() {
  const interaction = userEvent.setup();
  render(
    <AuthProvider>
      <AccountControls />
      <AuthModal />
    </AuthProvider>
  );
  await interaction.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));
  return interaction;
}

describe('Google Sign-In integration', () => {
  it('logs in directly with Google when user already has a phone number', async () => {
    googleNetwork((path, body, init) => {
      if (path.endsWith('/auth/google') && init.method === 'POST') {
        expect(body.credential).toBe('mock_google_credential');
        return response({
          success: true,
          data: {
            user: { ...user, fullName: 'Người Dùng Google' },
            accessToken: 'google-access-token-123',
          },
        });
      }
      return response({ success: false }, 404);
    });

    const interaction = await openAccountForm();
    const googleBtn = screen.getByTestId('google-login-btn');
    expect(googleBtn).toBeInTheDocument();

    await interaction.click(googleBtn);

    expect(await screen.findByText('Người Dùng Google')).toBeInTheDocument();
    expect(screen.getByLabelText('current access token')).toHaveTextContent('google-access-token-123');
    expect(localStorage.getItem('cinex_token')).toBe('google-access-token-123');
    expect(screen.queryByPlaceholderText('example@gmail.com')).not.toBeInTheDocument();
  });

  it('prompts for phone number when Google returns requirePhone: true, then completes registration', async () => {
    let completedRegistration = false;

    googleNetwork((path, body, init) => {
      if (path.endsWith('/auth/google') && init.method === 'POST') {
        return response({
          success: true,
          data: {
            requirePhone: true,
            tempToken: 'google-temp-token-xyz',
            googleProfile: {
              email: 'newuser@gmail.com',
              name: 'Google Tân Thủ',
              picture: 'https://example.com/avatar.jpg',
            },
          },
        });
      }

      if (path.endsWith('/auth/google/complete') && init.method === 'POST') {
        expect(body.tempToken).toBe('google-temp-token-xyz');
        expect(body.phone).toBe('0912345678');
        completedRegistration = true;
        return response({
          success: true,
          data: {
            user: { ...user, fullName: 'Google Tân Thủ', phone: '0912345678' },
            accessToken: 'google-completed-token',
          },
        });
      }

      return response({ success: false }, 404);
    });

    const interaction = await openAccountForm();
    await interaction.click(screen.getByTestId('google-login-btn'));

    // Verify phone completion screen is shown
    expect(await screen.findByText('HOÀN TẤT THÔNG TIN')).toBeInTheDocument();
    expect(screen.getByText('Google Tân Thủ')).toBeInTheDocument();
    expect(screen.getByText('newuser@gmail.com')).toBeInTheDocument();

    const phoneInput = screen.getByPlaceholderText('0912345678');
    await interaction.type(phoneInput, '0912345678');

    const submitBtn = screen.getByRole('button', { name: 'XÁC NHẬN' });
    await interaction.click(submitBtn);

    await waitFor(() => {
      expect(completedRegistration).toBe(true);
    });

    expect(await screen.findByText('Google Tân Thủ')).toBeInTheDocument();
    expect(screen.getByLabelText('current access token')).toHaveTextContent('google-completed-token');
    expect(localStorage.getItem('cinex_token')).toBe('google-completed-token');
  });

  it('displays error when Google authentication fails', async () => {
    googleNetwork((path) => {
      if (path.endsWith('/auth/google')) {
        return response({
          success: false,
          error: { message: 'Mã xác thực Google không hợp lệ hoặc đã hết hạn' },
        }, 401);
      }
      return response({ success: false }, 404);
    });

    const interaction = await openAccountForm();
    await interaction.click(screen.getByTestId('google-login-btn'));

    expect(await screen.findByText('Mã xác thực Google không hợp lệ hoặc đã hết hạn')).toBeInTheDocument();
    expect(screen.getByLabelText('current account')).toHaveTextContent('guest');
  });

  it('allows canceling out of the phone completion step back to the login form', async () => {
    googleNetwork((path) => {
      if (path.endsWith('/auth/google')) {
        return response({
          success: true,
          data: {
            requirePhone: true,
            tempToken: 'google-temp-token-xyz',
            googleProfile: {
              email: 'cancel@gmail.com',
              name: 'Người Hủy',
              picture: '',
            },
          },
        });
      }
      return response({ success: false }, 404);
    });

    const interaction = await openAccountForm();
    await interaction.click(screen.getByTestId('google-login-btn'));

    expect(await screen.findByText('HOÀN TẤT THÔNG TIN')).toBeInTheDocument();

    await interaction.click(screen.getByRole('button', { name: 'HỦY' }));

    // Back to normal login form
    expect(screen.queryByText('HOÀN TẤT THÔNG TIN')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ĐĂNG NHẬP NGAY' })).toBeInTheDocument();
  });
});
