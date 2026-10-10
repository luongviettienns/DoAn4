import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentResultPage } from '../src/components/PaymentResultPage';
import { TicketModal } from '../src/components/TicketModal';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { orderFixture } from './booking-fixtures';
import { deferred, renderSignedIn, response, routeFetch, user } from './helpers';

const orderId = '12345678-1234-4234-8234-123456789abc';
const initialUrl = window.location.href;

function order(status = 'PENDING_PAYMENT') {
  return { ...orderFixture(status), id: orderId };
}

function resultUrl(query = `orderId=${orderId}`) {
  window.history.replaceState({}, '', `/payment/result?${query}`);
}

function fakeClock() {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
}

async function settleNetwork() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

function SessionControls() {
  const auth = useAuth();
  return <>
    <button onClick={() => { void auth.logout(); }}>Đăng xuất kiểm thử</button>
    {auth.isAuthModalOpen && <span>Biểu mẫu đăng nhập đã mở</span>}
    <PaymentResultPage />
  </>;
}

afterEach(() => { window.history.replaceState({}, '', initialUrl); });

describe('Payment result', () => {
  it('routes home when the ticket completion button is selected, while the close button only hides the ticket', async () => {
    resultUrl();
    routeFetch(() => response({ success: true, data: order('PAID') }));
    function ResultRoute() {
      const [home, setHome] = useState(false);
      return home ? <h1>Trang chủ rạp phim</h1> : <PaymentResultPage onHome={() => setHome(true)} />;
    }
    renderSignedIn(<ResultRoute />);
    await screen.findByText('TK1234567890');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem vé điện tử' }));
    fireEvent.click(screen.getByRole('button', { name: 'HOÀN TẤT & VỀ TRANG CHỦ' }));
    expect(screen.getByRole('heading', { name: 'Trang chủ rạp phim' })).toBeInTheDocument();
  });

  it('displays ticket showtime in the cinema timezone rather than the browser timezone', () => {
    const browserTime = Date.prototype.toLocaleTimeString;
    const browserDate = Date.prototype.toLocaleDateString;
    const time = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (this: Date, locale, options) {
      return browserTime.call(this, locale, { ...options, timeZone: options?.timeZone || 'UTC' });
    });
    const date = vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function (this: Date, locale, options) {
      return browserDate.call(this, locale, { ...options, timeZone: options?.timeZone || 'UTC' });
    });
    const ticketOrder = order('PAID');
    ticketOrder.snapshot.startTime = '2028-10-03T20:30:00.000Z';
    try {
      render(<TicketModal isOpen onClose={() => {}} order={ticketOrder} />);
      expect(screen.getByText('03:30')).toBeInTheDocument();
      expect(screen.getByText(/04\/10\/2028/)).toBeInTheDocument();
    } finally {
      time.mockRestore();
      date.mockRestore();
    }
  });
  it('ignores browser success parameters and waits for the owner order from the server', async () => {
    resultUrl(`orderId=${orderId}&status=SUCCESS&code=FAKE&amount=1&vnp_ResponseCode=00`);
    routeFetch((url) => {
      if (url.pathname.endsWith(`/orders/${orderId}`)) return response({ success: true, data: order() });
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByRole('heading', { name: 'Đang xác nhận thanh toán' })).toBeInTheDocument();
    expect(screen.getByText('MV281003TEST01')).toBeInTheDocument();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
    expect(screen.queryByText('FAKE')).not.toBeInTheDocument();
  });

  it('shows issued server tickets even when the return URL claims failure', async () => {
    resultUrl(`orderId=${orderId}&status=FAILED&vnp_ResponseCode=24`);
    routeFetch(() => response({ success: true, data: order('PAID') }));
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
    expect(screen.getByText('Vé điện tử CineX Pass')).toBeInTheDocument();
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem vé điện tử' }));
    expect(screen.getByText('TK1234567890')).toBeInTheDocument();
  });

  it('polls a pending server order and only then renders its issued tickets', async () => {
    fakeClock();
    resultUrl();
    let status = 'PENDING_PAYMENT';
    routeFetch(() => response({ success: true, data: order(status) }));
    renderSignedIn(<PaymentResultPage />);
    await settleNetwork();
    expect(screen.getByRole('heading', { name: 'Đang xác nhận thanh toán' })).toBeInTheDocument();
    expect(localStorage.getItem('cinex_pending_order_id')).toBe(orderId);
    status = 'PAID';
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('TK1234567890')).toBeInTheDocument();
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
  });

  it('waits for ticket issuance when the server is PAID without issued tickets', async () => {
    fakeClock();
    resultUrl();
    let issued = false;
    routeFetch(() => response({ success: true, data: issued ? order('PAID') : { ...order('PAID'), items: [{ ...order('PAID').items[0], ticket: null }] } }));
    renderSignedIn(<PaymentResultPage />);
    await settleNetwork();
    expect(screen.getByRole('heading', { name: 'Đang phát hành vé' })).toBeInTheDocument();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
    issued = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('TK1234567890')).toBeInTheDocument();
  });

  it('resumes a saved pending order after reload when the return URL has no order id', async () => {
    resultUrl('status=SUCCESS');
    localStorage.setItem('cinex_pending_order_id', orderId);
    routeFetch((url) => url.pathname.endsWith(`/orders/${orderId}`)
      ? response({ success: true, data: order() }) : response({ success: false, error: { message: 'Sai mã đơn' } }, 404));
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByText('MV281003TEST01')).toBeInTheDocument();
  });

  it('does not substitute the saved order when the URL order id is malformed', async () => {
    resultUrl('orderId=javascript:alert(1)&status=SUCCESS');
    localStorage.setItem('cinex_pending_order_id', orderId);
    routeFetch(() => response({ success: true, data: order('PAID') }));
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByRole('heading', { name: 'Mã đơn hàng không hợp lệ' })).toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
  });

  it('rejects ambiguous duplicate order ids instead of selecting an arbitrary order', async () => {
    resultUrl(`orderId=${orderId}&orderId=22345678-1234-4234-8234-123456789abc`);
    routeFetch(() => response({ success: true, data: order('PAID') }));
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByRole('heading', { name: 'Mã đơn hàng không hợp lệ' })).toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
  });

  it('requires login after cookie restoration ends without an account', async () => {
    resultUrl();
    vi.stubGlobal('fetch', async () => response({ success: false, error: { message: 'Hết phiên' } }, 401));
    render(<AuthProvider><SessionControls /></AuthProvider>);
    expect(await screen.findByRole('heading', { name: 'Đăng nhập để xem kết quả thanh toán' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    expect(screen.getByText('Biểu mẫu đăng nhập đã mở')).toBeInTheDocument();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
  });

  it('does not start querying the order until account restoration finishes', async () => {
    resultUrl();
    const accountResponse = deferred<Response>();
    let accountRestored = false;
    vi.stubGlobal('fetch', (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/auth/me')) return accountResponse.promise;
      return Promise.resolve(response({ success: true, data: order(accountRestored ? 'PAID' : 'PAID_UNFULFILLED') }));
    });
    renderSignedIn(<PaymentResultPage />);
    expect(screen.getByText('Đang khôi phục phiên đăng nhập…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng nhập' })).not.toBeInTheDocument();
    accountRestored = true;
    await act(async () => { accountResponse.resolve(response({ success: true, data: user })); });
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
  });

  it.each([
    [403, 'Bạn không có quyền xem đơn hàng này'],
    [404, 'Không tìm thấy đơn hàng'],
    [401, 'Phiên đăng nhập đã hết hạn'],
  ])('does not display a ticket for an inaccessible order (%s)', async (status, title) => {
    resultUrl(`orderId=${orderId}&status=SUCCESS`);
    routeFetch(() => response({ success: false, error: { message: 'Chi tiết nội bộ không hiển thị' } }, status));
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
  });

  it('allows an explicit recheck after a network error without declaring payment failure', async () => {
    resultUrl();
    let available = false;
    routeFetch(() => {
      if (!available) throw new TypeError('Failed to fetch');
      return response({ success: true, data: order('PAID') });
    });
    renderSignedIn(<PaymentResultPage />);
    await screen.findByRole('heading', { name: 'Chưa thể kiểm tra thanh toán' });
    expect(screen.queryByText('Thanh toán thất bại')).not.toBeInTheDocument();
    available = true;
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }));
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
  });

  it.each([
    ['EXPIRED', 'Đơn hàng đã hết hạn'],
    ['CANCELLED', 'Đơn hàng đã hủy'],
    ['PAID_UNFULFILLED', 'Đã nhận thanh toán, đang xử lý hoàn tiền'],
  ])('shows the proven terminal order state %s without issuing a ticket', async (status, title) => {
    resultUrl();
    localStorage.setItem('cinex_pending_order_id', orderId);
    routeFetch(() => response({ success: true, data: { ...order(status), refundStatus: status === 'PAID_UNFULFILLED' ? 'PENDING' : 'NONE' } }));
    renderSignedIn(<PaymentResultPage />);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
  });

  it('retains the resume reference when an unrecognized state does not prove the order is terminal', async () => {
    resultUrl();
    localStorage.setItem('cinex_pending_order_id', orderId);
    routeFetch(() => response({ success: true, data: order('PROCESSING') }));
    renderSignedIn(<PaymentResultPage />);
    await screen.findByRole('heading', { name: 'Đang xử lý đơn hàng' });
    expect(localStorage.getItem('cinex_pending_order_id')).toBe(orderId);
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
  });

  it('ends automatic polling after two minutes and supports another server check', async () => {
    fakeClock();
    resultUrl();
    let status = 'PENDING_PAYMENT';
    routeFetch(() => response({ success: true, data: order(status) }));
    renderSignedIn(<PaymentResultPage />);
    await settleNetwork();
    expect(screen.getByRole('heading', { name: 'Đang xác nhận thanh toán' })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(screen.getByText(/Chưa nhận được xác nhận từ cổng thanh toán/)).toBeInTheDocument();
    expect(screen.queryByText('Thanh toán thất bại')).not.toBeInTheDocument();
    status = 'PAID';
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }));
    await settleNetwork();
    expect(screen.getByText('TK1234567890')).toBeInTheDocument();
  });

  it('keeps only one outstanding request while awaiting the server', async () => {
    fakeClock();
    resultUrl();
    const pending = deferred<Response>();
    let requestBusy = false;
    routeFetch(() => {
      if (requestBusy) return response({ success: true, data: order('PAID') });
      requestBusy = true;
      return pending.promise;
    });
    renderSignedIn(<PaymentResultPage />);
    await settleNetwork();
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
    await act(async () => { pending.resolve(response({ success: true, data: order() })); });
    expect(screen.getByRole('heading', { name: 'Đang xác nhận thanh toán' })).toBeInTheDocument();
  });

  it('discards a late order response after the user logs out', async () => {
    resultUrl();
    const pending = deferred<Response>();
    routeFetch((url) => url.pathname.endsWith('/auth/logout') ? new Response(null, { status: 204 }) : pending.promise);
    renderSignedIn(<SessionControls />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất kiểm thử' }));
    await act(async () => { pending.resolve(response({ success: true, data: order('PAID') })); });
    expect(await screen.findByRole('heading', { name: 'Đăng nhập để xem kết quả thanh toán' })).toBeInTheDocument();
    expect(screen.queryByText('TK1234567890')).not.toBeInTheDocument();
    expect(screen.queryByText('MV281003TEST01')).not.toBeInTheDocument();
  });

  it('aborts the outstanding order request when the page unmounts', async () => {
    resultUrl();
    const pending = deferred<Response>();
    let signal: AbortSignal | undefined;
    routeFetch((_url, init) => { signal = init.signal ?? undefined; return pending.promise; });
    const view = renderSignedIn(<PaymentResultPage />);
    await act(async () => { await Promise.resolve(); });
    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
