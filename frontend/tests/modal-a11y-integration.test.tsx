import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminReportDashboard } from '../src/components/AdminReportDashboard';
import { StaffCheckinModal } from '../src/components/StaffCheckinModal';
import { UserProfileModal } from '../src/components/UserProfileModal';
import { renderSignedIn, routeFetch } from './helpers';

describe('Modal A11y & WAI-ARIA Dialog Integration', () => {
  it('AdminReportDashboard has role dialog, aria-modal, and closes on Escape', () => {
    const handleClose = vi.fn();
    renderSignedIn(<AdminReportDashboard isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'admin-report-title');

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('StaffCheckinModal has role dialog, aria-modal, and closes on Escape', () => {
    const handleClose = vi.fn();
    renderSignedIn(<StaffCheckinModal isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'checkin-modal-title');

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('UserProfileModal has role dialog, aria-modal, and closes on Escape', async () => {
    const handleClose = vi.fn();
    routeFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    } as any));
    renderSignedIn(<UserProfileModal isOpen={true} onClose={handleClose} />);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'profile-modal-title');

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
