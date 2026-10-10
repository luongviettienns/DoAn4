import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Header } from '../src/components/Header';
import { renderSignedIn, response, routeFetch, user } from './helpers';

describe('Role navigation', () => {
  it('points catalogue actions to the real movie picker without claiming a preselected city', async () => {
    routeFetch(() => response({ success: true, data: [] }));
    renderSignedIn(<Header />);
    await screen.findByText('Khách kiểm thử');
    expect(screen.queryByText('Hà Nội')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Chọn rạp' })).toHaveAttribute('href', '#movies');
    expect(screen.getByRole('link', { name: 'Tìm kiếm phim' })).toHaveAttribute('href', '#discovery-search');
  });
  it.each([
    { role: 'CUSTOMER', checkin: false, reports: false, admin: false },
    { role: 'STAFF', checkin: true, reports: false, admin: false },
    { role: 'MANAGER', checkin: true, reports: true, admin: true },
    { role: 'ADMIN', checkin: false, reports: true, admin: true },
  ])('shows allowed actions for $role', async ({ role, checkin, reports, admin }) => {
    routeFetch(() => response({ success: true, data: [] }), { ...user, role });
    renderSignedIn(<Header />);
    await screen.findByText('Khách kiểm thử');
    expect(!!screen.queryByRole('button', { name: 'Soát vé' })).toBe(checkin);
    expect(!!screen.queryByRole('button', { name: 'Báo cáo' })).toBe(reports);
    expect(!!screen.queryByRole('button', { name: 'Quản trị' })).toBe(admin);
  });
});
