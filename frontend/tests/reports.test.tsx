import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminReportDashboard } from '../src/components/AdminReportDashboard';
import { renderSignedIn, response, routeFetch, user } from './helpers';

const overview = { grossRevenue: 180000, revenue: 160000, refundAmount: 20000, orderCount: 2, ticketCount: 2, comboRevenue: 0, occupancyPercent: 25 };
const breakdown = [{ key: '2028-10-03', label: '03/10/2028', revenue: 160000, orderCount: 2, ticketCount: 2, comboRevenue: 0, occupancyPercent: 25 }];

function reportNetwork(handler: (url: URL) => Response) {
  routeFetch((url) => handler(url), { ...user, role: 'MANAGER' });
  renderSignedIn(<AdminReportDashboard isOpen onClose={() => {}} />);
}

describe('Management reports', () => {
  it('renders the server net revenue and daily breakdown', async () => {
    reportNetwork((url) => url.pathname.endsWith('/overview') ? response({ success: true, data: overview })
      : url.pathname.endsWith('/top-movies') ? response({ success: true, data: [] })
      : response({ success: true, data: breakdown }));
    expect(await screen.findByRole('cell', { name: '03/10/2028' })).toBeInTheDocument();
    const revenueCard = screen.getByText('Doanh thu thuần').parentElement!.parentElement!;
    expect(within(revenueCard).getByText('160.000đ')).toBeInTheDocument();
  });

  it('displays a rejected report as an error instead of no business activity', async () => {
    reportNetwork(() => response({ success: false, error: { message: 'Không có quyền xem báo cáo' } }, 403));
    expect(await screen.findByText('Không có quyền xem báo cáo')).toBeInTheDocument();
    expect(screen.queryByText('Không có dữ liệu trong khoảng thời gian này')).not.toBeInTheDocument();
  });

  it('shows the empty state when the server confirms there is no report data', async () => {
    reportNetwork((url) => url.pathname.endsWith('/overview') ? response({ success: true, data: { ...overview, grossRevenue: 0, revenue: 0, refundAmount: 0, orderCount: 0, ticketCount: 0, occupancyPercent: 0 } })
      : response({ success: true, data: [] }));
    expect(await screen.findByText('Không có dữ liệu trong khoảng thời gian này')).toBeInTheDocument();
  });

  it('changes the breakdown query to the selected cinema view', async () => {
    reportNetwork((url) => url.pathname.endsWith('/overview') ? response({ success: true, data: overview })
      : url.pathname.endsWith('/top-movies') ? response({ success: true, data: [] })
      : response({ success: true, data: url.searchParams.get('type') === 'CINEMA' ? [{ ...breakdown[0], key: 'cinema-1', label: 'CineX Test' }] : breakdown }));
    await screen.findByRole('cell', { name: '03/10/2028' });
    fireEvent.click(screen.getByRole('button', { name: 'Theo rạp' }));
    expect(await screen.findByRole('cell', { name: 'CineX Test' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: '03/10/2028' })).not.toBeInTheDocument();
  });

  it('triggers CSV report export when clicking export button', async () => {
    let exported = false;
    routeFetch((url) => {
      if (url.pathname.endsWith('/export')) {
        exported = true;
        return new Response('\uFEFFNgày,Doanh thu\n2028-10-03,160000', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="bao-cao-daily.csv"',
          },
        });
      }
      return url.pathname.endsWith('/overview') ? response({ success: true, data: overview })
        : url.pathname.endsWith('/top-movies') ? response({ success: true, data: [] })
        : response({ success: true, data: breakdown });
    }, { ...user, role: 'MANAGER' });

    const origCreateObjectURL = window.URL.createObjectURL;
    const origRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = () => 'blob:mock-url';
    window.URL.revokeObjectURL = () => {};

    renderSignedIn(<AdminReportDashboard isOpen onClose={() => {}} />);
    await screen.findByRole('cell', { name: '03/10/2028' });

    const exportBtn = screen.getByRole('button', { name: /Xuất CSV/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);

    expect(await screen.findByRole('button', { name: /Xuất CSV/i })).toBeInTheDocument();
    expect(exported).toBe(true);

    window.URL.createObjectURL = origCreateObjectURL;
    window.URL.revokeObjectURL = origRevokeObjectURL;
  });
});
