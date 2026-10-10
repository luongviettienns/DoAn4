import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserProfileModal } from '../src/components/UserProfileModal';
import { renderSignedIn, response, routeFetch, user } from './helpers';

describe('UserProfileModal', () => {
  it('renders user details when open', async () => {
    routeFetch(() => response({ success: true, data: [] }));
    renderSignedIn(<UserProfileModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Hồ Sơ Cá Nhân')).toBeInTheDocument();
    expect(await screen.findByDisplayValue(user.fullName)).toBeInTheDocument();
    expect(screen.getByDisplayValue(user.phone)).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
  });

  it('updates profile successfully', async () => {
    let patchedBody: any = null;
    routeFetch((url, init) => {
      if (url.pathname.endsWith('/auth/me') && init.method === 'PUT') {
        patchedBody = JSON.parse(init.body as string);
        return response({
          success: true,
          data: { ...user, fullName: patchedBody.fullName, phone: patchedBody.phone },
        });
      }
      return response({ success: true, data: [] });
    });

    renderSignedIn(<UserProfileModal isOpen={true} onClose={vi.fn()} />);

    const nameInput = await screen.findByDisplayValue(user.fullName);
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Mới' } });

    const submitBtn = screen.getByRole('button', { name: 'Lưu thông tin' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Cập nhật thông tin cá nhân thành công!')).toBeInTheDocument();
    expect(patchedBody).toEqual({ fullName: 'Nguyễn Văn Mới', phone: user.phone });
  });

  it('validates invalid phone number before calling api', async () => {
    const patchCalled = vi.fn();
    routeFetch((url, init) => {
      if (url.pathname.endsWith('/auth/me') && init.method === 'PUT') {
        patchCalled();
      }
      return response({ success: true, data: [] });
    });

    renderSignedIn(<UserProfileModal isOpen={true} onClose={vi.fn()} />);

    const phoneInput = await screen.findByDisplayValue(user.phone);
    fireEvent.change(phoneInput, { target: { value: '12345' } });

    const submitBtn = screen.getByRole('button', { name: 'Lưu thông tin' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0')).toBeInTheDocument();
    expect(patchCalled).not.toHaveBeenCalled();
  });

  it('switches to password tab and handles password change', async () => {
    let passwordPayload: any = null;
    routeFetch((url, init) => {
      if (url.pathname.endsWith('/auth/change-password') && init.method === 'PUT') {
        passwordPayload = JSON.parse(init.body as string);
        return response({ success: true, data: { message: 'Đổi mật khẩu thành công!' } });
      }
      return response({ success: true, data: [] });
    });

    renderSignedIn(<UserProfileModal isOpen={true} onClose={vi.fn()} />);

    await screen.findByText('Hồ Sơ Cá Nhân');
    const passwordTab = screen.getByRole('button', { name: /Đổi mật khẩu/i });
    fireEvent.click(passwordTab);

    const curPass = screen.getByLabelText('Mật khẩu hiện tại');
    const newPass = screen.getByLabelText('Mật khẩu mới');
    const confPass = screen.getByLabelText('Xác nhận mật khẩu mới');

    fireEvent.change(curPass, { target: { value: 'OldPass123' } });
    fireEvent.change(newPass, { target: { value: 'NewPass123' } });
    fireEvent.change(confPass, { target: { value: 'NewPass123' } });

    const changeBtn = screen.getByRole('button', { name: 'Cập nhật mật khẩu' });
    fireEvent.click(changeBtn);

    expect(await screen.findByText('Đổi mật khẩu thành công!')).toBeInTheDocument();
    expect(passwordPayload).toEqual({ currentPassword: 'OldPass123', newPassword: 'NewPass123' });
  });
});
