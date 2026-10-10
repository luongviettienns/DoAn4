import { useState } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutModal } from '../src/components/CheckoutModal';
import { TicketModal } from '../src/components/TicketModal';
import { useAuth } from '../src/context/AuthContext';
import type { ApiOrder } from '../src/services/api';
import { orderFixture, seat, showtimeData } from './booking-fixtures';
import { deferred, renderSignedIn, response, routeFetch } from './helpers';

function CheckoutFlow({ initiallyOpen = true, heldOrder = orderFixture('PENDING_PAYMENT') }: { initiallyOpen?: boolean; heldOrder?: ApiOrder }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  return <>
    <button onClick={() => setOpen((value) => !value)}>toggle checkout</button>
    {!open && <span>checkout closed</span>}
    <CheckoutModal isOpen={open} onClose={() => setOpen(false)} heldOrder={heldOrder} showtimeData={showtimeData} selectedSeats={[seat(1)]}
      onOpenAuth={() => {}} onOrderSuccess={(result) => { setOrder(result); setOpen(false); }} />
    <TicketModal isOpen={!!order} onClose={() => setOrder(null)} order={order} />
  </>;
}

function checkoutNetwork(handler?: (url: URL, init: RequestInit) => Response | Promise<Response> | undefined) {
  routeFetch((url, init) => {
    if (url.pathname.endsWith('/combos')) return response({ success: true, data: [] });
    const custom = handler?.(url, init);
    if (custom) return custom;
    throw new Error(`Unexpected route: ${url.pathname}`);
  });
}

async function openCheckout(selectMock = true, heldOrder = orderFixture('PENDING_PAYMENT')) {
  if (selectMock) {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_ENABLE_MOCK_PAYMENT', 'true');
  }
  renderSignedIn(<CheckoutFlow heldOrder={heldOrder} />);
  await screen.findByText(/Khách kiểm thử/);
  await screen.findByText('Không có combo nào khả dụng');
  if (selectMock) fireEvent.click(screen.getByRole('button', { name: /Sandbox Tức thì/ }));
}

function pay() { fireEvent.click(screen.getByRole('button', { name: 'THANH TOÁN NGAY' })); }
function AuthenticationStatus() {
  const { user, isRestoring } = useAuth();
  return <span>{isRestoring ? 'RESTORING' : user?.fullName || 'SIGNEDOUT'}</span>;
}

describe('Checkout', () => {
  it('chooses VNPay by default even when the development mock option is enabled', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_ENABLE_MOCK_PAYMENT', 'true');
    checkoutNetwork((url, init) => url.pathname.endsWith('/orders') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201)
      : url.pathname.endsWith('/pay') && JSON.parse(String(init.body)).method === 'VNPAY'
        ? response({ success: false, error: { message: 'VNPay đang bảo trì' } }, 503)
        : response({ success: false, error: { message: 'Đã đi vào thanh toán mô phỏng' } }, 400));
    await openCheckout(false);
    pay();
    expect(await screen.findByText('VNPay đang bảo trì')).toBeInTheDocument();
    expect(screen.queryByText('Đã đi vào thanh toán mô phỏng')).not.toBeInTheDocument();
  });

  it('uses the gateway and hides instant mock payment in production even when the flag is true', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_ENABLE_MOCK_PAYMENT', 'true');
    checkoutNetwork((url, init) => url.pathname.endsWith('/orders') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201)
      : url.pathname.endsWith('/pay') && JSON.parse(String(init.body)).method === 'VNPAY'
        ? response({ success: false, error: { message: 'VNPay đang bảo trì' } }, 503)
        : response({ success: false, error: { message: 'Đã đi vào thanh toán mô phỏng' } }, 400));
    await openCheckout(false);
    expect(screen.queryByRole('button', { name: /Sandbox Tức thì/ })).not.toBeInTheDocument();
    pay();
    expect(await screen.findByText('VNPay đang bảo trì')).toBeInTheDocument();
  });

  it('hides the development mock option unless the explicit enable flag is set', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_ENABLE_MOCK_PAYMENT', undefined);
    checkoutNetwork();
    await openCheckout(false);
    expect(screen.queryByRole('button', { name: /Sandbox Tức thì/ })).not.toBeInTheDocument();
  });

  it('can open and close repeatedly without violating hook order', async () => {
    checkoutNetwork();
    renderSignedIn(<CheckoutFlow initiallyOpen={false} />);
    fireEvent.click(screen.getByText('toggle checkout'));
    expect(await screen.findByText('Thanh toán vé xem phim')).toBeInTheDocument();
    fireEvent.click(screen.getByText('toggle checkout'));
    expect(screen.getByText('checkout closed')).toBeInTheDocument();
  });

  it('does not repeat the age confirmation already supplied when holding seats', async () => {
    checkoutNetwork();
    await openCheckout();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('displays the existing server hold immediately', async () => {
    checkoutNetwork();
    await openCheckout();
    expect(screen.getByText('Thời gian giữ ghế còn lại:')).toBeInTheDocument();
  });

  it('shows the selected screening date and time from the held order in Vietnam time', async () => {
    checkoutNetwork();
    await openCheckout();
    expect(screen.getByText(/19:00.*03\/10\/2028/)).toBeInTheDocument();
  });

  it('does not show another customer the held order details', async () => {
    checkoutNetwork();
    renderSignedIn(<><AuthenticationStatus /><CheckoutFlow heldOrder={{ ...orderFixture('PENDING_PAYMENT'), userId: 'another-customer' }} /></>);
    await screen.findByText('Khách kiểm thử');
    expect(screen.queryByText('Thanh toán vé xem phim')).not.toBeInTheDocument();
    expect(screen.queryByText('Phim kiểm thử')).not.toBeInTheDocument();
  });

  it('displays the server seat conflict and keeps checkout open', async () => {
    checkoutNetwork(() => response({ success: false, error: { code: 'SEAT_UNAVAILABLE', message: 'Ghế A1 đã được giữ' } }, 409));
    await openCheckout();
    pay();
    expect(await screen.findByText('Ghế A1 đã được giữ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'THANH TOÁN NGAY' })).toBeEnabled();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
  });

  it('retries payment on the existing hold instead of creating a conflicting order', async () => {
    let held = false;
    let paymentAttempt = 0;
    let createdOrders = 0;
    checkoutNetwork((url) => {
      if (url.pathname.endsWith('/orders')) {
        createdOrders++;
        if (held) return response({ success: false, error: { code: 'PENDING_ORDER_EXISTS', message: 'Đơn đang giữ đã tồn tại' } }, 409);
        held = true;
        return response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201);
      }
      if (url.pathname.endsWith('/payment/simulate-mock')) {
        paymentAttempt++;
        return paymentAttempt === 1 ? response({ success: false, error: { message: 'Cổng thanh toán bận' } }, 503) : response({ success: true, data: {} });
      }
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: orderFixture() });
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout();
    pay();
    await screen.findByText('Cổng thanh toán bận');
    pay();
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
    expect(screen.queryByText('Đơn đang giữ đã tồn tại')).not.toBeInTheDocument();
    expect(createdOrders).toBe(0);
    expect(paymentAttempt).toBe(1);
  });

  it('uses the server hold deadline and stops payment after it expires', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const held = { ...orderFixture('PENDING_PAYMENT'), expiresAt: new Date(Date.now() + 5000).toISOString(), total: 95000 };
    checkoutNetwork((url) => url.pathname.endsWith('/orders')
      ? response({ success: true, data: held }, 201)
      : response({ success: false, error: { message: 'Cổng thanh toán bận' } }, 503));
    await openCheckout(true, held);
    expect(await screen.findByText('00:05')).toBeInTheDocument();
    expect(screen.getByText('95.000đ')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole('button', { name: 'THANH TOÁN NGAY' })).toBeDisabled();
  });

  it('releases an existing pending hold when the customer closes checkout', async () => {
    let serverStatus = 'HELD';
    checkoutNetwork((url, init) => {
      if (url.pathname.endsWith('/orders')) { serverStatus = 'HELD'; return response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201); }
      if (url.pathname.endsWith('/cancel')) {
        if (!JSON.parse(String(init.body)).pendingOnly) return response({ success: false, error: { message: 'Cần xác nhận chỉ hủy đơn pending' } }, 409);
        serverStatus = 'AVAILABLE'; return response({ success: true, data: orderFixture('CANCELLED') });
      }
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: orderFixture('PENDING_PAYMENT') });
      return response({ success: false, error: { message: 'Cổng thanh toán bận' } }, 503);
    });
    await openCheckout();
    pay();
    await screen.findByText('Cổng thanh toán bận');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await screen.findByText('checkout closed');
    expect(serverStatus).toBe('AVAILABLE');
  });

  it('keeps checkout open when the server refuses to release the hold', async () => {
    checkoutNetwork((url) => url.pathname.endsWith('/orders')
      ? response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201)
      : url.pathname.endsWith('/orders/order-1') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') })
      : url.pathname.endsWith('/cancel')
        ? response({ success: false, error: { message: 'Không thể hủy đơn lúc này' } }, 409)
        : response({ success: false, error: { message: 'Cổng thanh toán bận' } }, 503));
    await openCheckout();
    pay();
    await screen.findByText('Cổng thanh toán bận');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByText('Không thể hủy đơn lúc này')).toBeInTheDocument();
    expect(screen.queryByText('checkout closed')).not.toBeInTheDocument();
  });

  it('does not show ticket success when payment succeeded but fetching the order failed', async () => {
    checkoutNetwork((url) => url.pathname.endsWith('/orders') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201)
      : url.pathname.endsWith('/payment/simulate-mock') ? response({ success: true, data: {} })
      : response({ success: false, error: { message: 'Không thể tải vé' } }, 503));
    await openCheckout();
    pay();
    expect(await screen.findByText('Không thể tải vé')).toBeInTheDocument();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
  });

  it('can recover a paid receipt after the hold deadline without charging the completed mock payment again', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    let simulations = 0;
    let reads = 0;
    const held = { ...orderFixture('PENDING_PAYMENT'), expiresAt: new Date(Date.now() + 5000).toISOString() };
    checkoutNetwork((url) => {
      if (url.pathname.endsWith('/payment/simulate-mock')) { simulations++; return response({ success: true, data: {} }); }
      if (url.pathname.endsWith('/orders/order-1')) return ++reads === 1
        ? response({ success: false, error: { message: 'Lỗi tải vé đã trả tiền' } }, 503)
        : response({ success: true, data: orderFixture() });
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout(true, held);
    pay();
    await screen.findByText('Lỗi tải vé đã trả tiền');
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(screen.getByRole('button', { name: 'THANH TOÁN NGAY' })).toBeEnabled();
    pay();
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
    expect(simulations).toBe(1);
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
  });

  it('reconciles a lost payment response after the local hold deadline before attempting another charge', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    let simulations = 0;
    const held = { ...orderFixture('PENDING_PAYMENT'), expiresAt: new Date(Date.now() + 5000).toISOString() };
    checkoutNetwork((url) => {
      if (url.pathname.endsWith('/payment/simulate-mock')) {
        simulations++;
        return response({ success: false, error: { message: 'Mất phản hồi thanh toán' } }, 503);
      }
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: orderFixture() });
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout(true, held);
    pay();
    await screen.findByText('Mất phản hồi thanh toán');
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(screen.getByRole('button', { name: 'THANH TOÁN NGAY' })).toBeEnabled();
    pay();
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
    expect(simulations).toBe(1);
  });

  it('does not charge again when reconciliation proves the pending hold has expired', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    let simulations = 0;
    const held = { ...orderFixture('PENDING_PAYMENT'), expiresAt: new Date(Date.now() + 5000).toISOString() };
    checkoutNetwork((url) => {
      if (url.pathname.endsWith('/payment/simulate-mock')) {
        simulations++;
        return response({ success: false, error: { message: 'Mất phản hồi thanh toán' } }, 503);
      }
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: held });
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout(true, held);
    pay();
    await screen.findByText('Mất phản hồi thanh toán');
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    pay();
    expect(await screen.findByText('Đơn giữ ghế đã hết hạn')).toBeInTheDocument();
    expect(simulations).toBe(1);
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
  });

  it('shows the paid receipt when IPN wins the race with pending-only cancellation', async () => {
    let reads = 0;
    let cancelled = 0;
    checkoutNetwork((url) => {
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: orderFixture(++reads === 1 ? 'PENDING_PAYMENT' : 'PAID') });
      if (url.pathname.endsWith('/cancel')) {
        cancelled++;
        return response({ success: false, error: { code: 'ORDER_NOT_PENDING', message: 'Đơn đã thanh toán trong lúc hủy' } }, 409);
      }
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout();
    localStorage.setItem('cinex_pending_order_id', 'order-1');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
    expect(cancelled).toBe(1);
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
  });

  it('does not display issued tickets until the order confirms settled payment', async () => {
    checkoutNetwork((url) => url.pathname.endsWith('/payment/simulate-mock') ? response({ success: true, data: {} })
      : response({ success: true, data: orderFixture('PENDING_PAYMENT') }));
    await openCheckout();
    pay();
    expect(await screen.findByText('Thanh toán đang được xác nhận. Vui lòng tải lại thông tin đơn hàng.')).toBeInTheDocument();
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
  });

  it('keeps checkout recoverable when a paid order has an incomplete ticket code', async () => {
    const paid = orderFixture();
    const incomplete = { ...paid, items: paid.items.map((item) => ({ ...item, ticket: { ...item.ticket!, ticketCode: ' ' } })) };
    checkoutNetwork((url) => url.pathname.endsWith('/payment/simulate-mock')
      ? response({ success: true, data: {} }) : response({ success: true, data: incomplete }));
    await openCheckout();
    pay();
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa có đủ thông tin vé đã thanh toán');
    expect(screen.queryByText('Vé điện tử CineX Pass')).not.toBeInTheDocument();
    expect(localStorage.getItem('cinex_pending_order_id')).toBe('order-1');
  });

  it('checks an ambiguously paid order before closing instead of cancelling its tickets', async () => {
    checkoutNetwork((url) => url.pathname.endsWith('/orders') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') }, 201)
      : url.pathname.endsWith('/payment/simulate-mock') ? response({ success: false, error: { message: 'Phản hồi bị mất' } }, 503)
      : url.pathname.endsWith('/orders/order-1') ? response({ success: true, data: orderFixture() })
      : response({ success: false, error: { message: 'Không được hủy vé đã trả tiền' } }, 409));
    await openCheckout();
    pay();
    await screen.findByText('Phản hồi bị mất');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByText('TK1234567890')).toBeInTheDocument();
  });

  it('rejects a voucher without subtracting the invalid discount', async () => {
    checkoutNetwork(() => response({ success: false, error: { code: 'VOUCHER_EXPIRED', message: 'Voucher đã hết hạn' } }, 400));
    await openCheckout();
    fireEvent.change(screen.getByPlaceholderText('Nhập mã voucher (VD: CINEX20)'), { target: { value: 'expired' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByText('Voucher đã hết hạn')).toBeInTheDocument();
    expect(screen.getAllByText('80.000đ')).toHaveLength(2);
    expect(screen.queryByText('Giảm giá voucher')).not.toBeInTheDocument();
  });

  it('applies and removes a voucher only through the existing order on the server', async () => {
    checkoutNetwork((_url, init) => {
      const request = JSON.parse(String(init.body));
      return request.voucherCode === 'FILM20'
        ? response({ success: true, data: { ...orderFixture('PENDING_PAYMENT'), voucher: { code: 'FILM20', name: 'Giảm vé phim', discount: 16000 }, discount: 16000, total: 64000 } })
        : request.voucherCode === null ? response({ success: true, data: orderFixture('PENDING_PAYMENT') })
        : response({ success: false, error: { message: 'Sai thông tin voucher' } }, 400);
    });
    await openCheckout();
    const input = screen.getByPlaceholderText('Nhập mã voucher (VD: CINEX20)');
    fireEvent.change(input, { target: { value: ' film20 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    expect(await screen.findByText('64.000đ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ mã khuyến mãi' }));
    await waitFor(() => expect(screen.queryByText('Giảm giá voucher')).not.toBeInTheDocument());
    expect(screen.getAllByText('80.000đ')).toHaveLength(2);
  });

  it('patches combo quantities and uses persisted prices without extending the original hold', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const held = { ...orderFixture('PENDING_PAYMENT'), expiresAt: new Date(Date.now() + 5000).toISOString() };
    const writes: Array<{ path: string; method: string; body: unknown }> = [];
    routeFetch((url, init) => {
      if (url.pathname.endsWith('/combos')) return response({ success: true, data: [{ id: 'combo-1', name: 'Combo đôi', description: null, imageUrl: null, price: 50000, isActive: true }] });
      if (init.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        writes.push({ path: url.pathname, method: init.method, body });
        return response({ success: true, data: { ...held, comboSubtotal: 45000, subtotal: 125000, total: 125000,
          combos: [{ id: 'order-combo-1', comboId: 'combo-1', name: 'Combo đôi', quantity: 1, unitPrice: 45000, lineTotal: 45000 }] } });
      }
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    renderSignedIn(<CheckoutFlow heldOrder={held} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm Combo đôi' }));
    expect(await screen.findByText('125.000đ')).toBeInTheDocument();
    expect(screen.getByText('00:05')).toBeInTheDocument();
    expect(writes).toEqual([{ path: '/api/v1/orders/order-1', method: 'PATCH', body: { combos: [{ comboId: 'combo-1', quantity: 1 }] } }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole('button', { name: 'THANH TOÁN NGAY' })).toBeDisabled();
  });

  it('does not patch choices when a gateway payment is pending and retries the same order', async () => {
    const writes: string[] = [];
    const held = { ...orderFixture('PENDING_PAYMENT'), payments: [{ id: 'payment-1', method: 'VNPAY', status: 'PENDING' }] };
    checkoutNetwork((url, init) => {
      if (init.method) writes.push(`${init.method} ${url.pathname}`);
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: held });
      if (url.pathname.endsWith('/pay')) return response({ success: false, error: { message: 'Cổng thanh toán bận' } }, 503);
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout(false, held);
    expect(screen.getByPlaceholderText('Nhập mã voucher (VD: CINEX20)')).toBeDisabled();
    pay();
    await screen.findByText('Cổng thanh toán bận');
    expect(writes).toEqual(['POST /api/v1/orders/order-1/pay']);
  });

  it('keeps the recovery marker until confirmed paid or cancelled', async () => {
    checkoutNetwork((url) => url.pathname.endsWith('/payment/simulate-mock') ? response({ success: false, error: { message: 'Phản hồi bị mất' } }, 503)
      : url.pathname.endsWith('/orders/order-1') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') })
      : url.pathname.endsWith('/cancel') ? response({ success: false, error: { message: 'Chưa thể hủy đơn' } }, 409)
      : response({ success: false, error: { message: 'Không tạo thêm đơn' } }, 409));
    await openCheckout();
    pay();
    await screen.findByText('Phản hồi bị mất');
    expect(localStorage.getItem('cinex_pending_order_id')).toBe('order-1');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await screen.findByText('Chưa thể hủy đơn');
    expect(localStorage.getItem('cinex_pending_order_id')).toBe('order-1');
  });

  it('does not clear a recovery marker after checkout unmounts during cancellation', async () => {
    const cancelled = deferred<Response>();
    let cancellationStarted = false;
    checkoutNetwork((url) => {
      if (url.pathname.endsWith('/combos')) return undefined;
      if (url.pathname.endsWith('/orders/order-1')) return response({ success: true, data: orderFixture('PENDING_PAYMENT') });
      if (url.pathname.endsWith('/cancel')) { cancellationStarted = true; return cancelled.promise; }
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    await openCheckout();
    localStorage.setItem('cinex_pending_order_id', 'order-1');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(cancellationStarted).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'toggle checkout' }));
    await act(async () => cancelled.resolve(response({ success: true, data: orderFixture('CANCELLED') })));
    expect(localStorage.getItem('cinex_pending_order_id')).toBe('order-1');
  });

  it('stores the existing order id before redirecting to VNPay', async () => {
    checkoutNetwork((url) => url.pathname.endsWith('/pay') ? response({ success: true, data: { paymentUrl: `${window.location.origin}/#vnpay-sandbox` } })
      : response({ success: false, error: { message: 'Không tạo thêm đơn' } }, 409));
    await openCheckout(false);
    pay();
    await waitFor(() => expect(window.location.hash).toBe('#vnpay-sandbox'));
    expect(localStorage.getItem('cinex_pending_order_id')).toBe('order-1');
    window.history.replaceState({}, '', '/');
  });
});
