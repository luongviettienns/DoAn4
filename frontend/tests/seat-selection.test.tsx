import { useState } from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeatMapModal, type SeatItem } from '../src/components/SeatMapModal';
import { useAuth } from '../src/context/AuthContext';
import { deferred, renderSignedIn, response, routeFetch } from './helpers';
import { orderFixture, seat, showtimeData } from './booking-fixtures';

function SeatFlow() {
  const [selection, setSelection] = useState<SeatItem[] | null>(null);
  const [reference, setReference] = useState('');
  return selection ? <><output aria-label="checkout seats">{selection.map((s) => s.seatId).join(',')}</output><output aria-label="checkout order">{reference}</output></>
    : <SeatMapModal showtimeId="showtime-1" onClose={() => {}} onProceedToCheckout={(seats, _data, order) => { setSelection(seats); setReference(`${order.id}|${order.expiresAt}`); }} />;
}
function SessionSeatFlow() {
  const { logout } = useAuth();
  return <><button onClick={() => void logout()}>logout</button><SeatFlow /></>;
}
function network(seats: SeatItem[], intercept?: (url: URL, init: RequestInit) => Response | Promise<Response> | undefined) {
  let held: ReturnType<typeof orderFixture> | null = null; let creates = 0;
  routeFetch((url, init) => {
    const custom = intercept?.(url, init); if (custom) return custom;
    if (url.pathname.endsWith('/seats')) return response({ success: true, data: { ...showtimeData, seats } });
    if (url.pathname.endsWith('/pending')) return response({ success: true, data: held });
    if (url.pathname.endsWith('/cancel')) { held = null; return response({ success: true, data: orderFixture('CANCELLED') }); }
    if (url.pathname.endsWith('/orders') || init.method === 'PATCH') {
      if (init.method !== 'PATCH') creates++;
      const body = JSON.parse(String(init.body));
      const items = seats.filter((s) => body.seatIds.includes(s.seatId)).map((s) => ({ id: s.id, seatId: s.seatId, seatLabel: `${s.rowLabel}${s.seatNumber}`, seatType: s.seatType, price: s.price, ticket: null }));
      held = { ...orderFixture('PENDING_PAYMENT'), items, ticketSubtotal: items.reduce((sum, s) => sum + s.price, 0), expiresAt: held?.expiresAt ?? new Date(Date.now() + 600000).toISOString() };
      return response({ success: true, data: held }, 201);
    }
    return response({ success: true, data: held });
  });
  return { get order() { return held; }, get creates() { return creates; } };
}
async function ready() { await screen.findByRole('button', { name: 'Ghế A1 loại STANDARD' }); const age = screen.queryByRole('checkbox'); if (age) fireEvent.click(age); }
async function choose(n: number, count: number) { fireEvent.click(screen.getByRole('button', { name: `Ghế A${n} loại STANDARD` })); await screen.findByText(`${count}/8 ghế`); }

describe('Seat selection with persisted holds', () => {
  it('requires at least one held seat to continue', async () => {
    network([seat(1)]); renderSignedIn(<SeatFlow />); await ready();
    expect(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' })).toBeDisabled();
  });
  it.each(['HELD', 'SOLD', 'BLOCKED'] as const)('disables another customer or unavailable %s seat', async (status) => {
    network([seat(1, status)]); renderSignedIn(<SeatFlow />); await ready();
    expect(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' })).toBeDisabled();
    expect(screen.getByText('0/8 ghế')).toBeInTheDocument();
  });
  it('holds immediately, uses server price, and releases the last deselected seat', async () => {
    const server = network([seat(1, 'AVAILABLE', 95000)]); renderSignedIn(<SeatFlow />); await ready(); await choose(1, 1);
    expect(server.order?.items[0].seatId).toBe('seat-1'); expect(screen.getByText('95.000đ')).toBeInTheDocument();
    await choose(1, 0); expect(server.order).toBeNull();
  });
  it('caps at eight seats and updates one order rather than creating eight', async () => {
    const server = network(Array.from({ length: 9 }, (_, i) => seat(i + 1))); renderSignedIn(<SeatFlow />); await ready();
    for (let i = 1; i <= 8; i++) await choose(i, i);
    fireEvent.click(screen.getByRole('button', { name: 'Ghế A9 loại STANDARD' })); expect(screen.getByText('8/8 ghế')).toBeInTheDocument(); expect(server.creates).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' }));
    expect(screen.getByLabelText('checkout seats')).toHaveTextContent('seat-1,seat-2,seat-3,seat-4,seat-5,seat-6,seat-7,seat-8');
    expect(screen.getByLabelText('checkout order')).toHaveTextContent(`order-1|${server.order?.expiresAt}`);
  });
  it('requires age confirmation before sending a restricted-film hold', async () => {
    const server = network([seat(1)]); renderSignedIn(<SeatFlow />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ghế A1 loại STANDARD' }));
    expect(await screen.findByText(/Vui lòng xác nhận đủ độ tuổi/)).toBeInTheDocument(); expect(server.order).toBeNull();
  });
  it('does not claim a selected hold while the server is still deciding', async () => {
    const pending = deferred<Response>(); network([seat(1)], (url) => url.pathname.endsWith('/orders') ? pending.promise : undefined);
    renderSignedIn(<SeatFlow />); await ready(); fireEvent.click(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' }));
    expect(screen.getByText('0/8 ghế')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' })).toBeDisabled();
    await act(async () => pending.resolve(response({ success: false, error: { message: 'Ghế vừa được khách khác giữ' } }, 409)));
    expect(await screen.findByText('Ghế vừa được khách khác giữ')).toBeInTheDocument(); expect(screen.getByText('0/8 ghế')).toBeInTheDocument();
  });
  it('polls changed inventory every five seconds and stops after unmount', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); let sold = false; let reads = 0;
    network([seat(1)], (url) => { if (!url.pathname.endsWith('/seats')) return; reads++; return response({ success: true, data: { ...showtimeData, seats: [seat(1, sold ? 'SOLD' : 'AVAILABLE')] } }); });
    const view = renderSignedIn(<SeatFlow />); await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' })).toBeEnabled(); sold = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); }); expect(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' })).toBeDisabled();
    view.unmount(); const stoppedAt = reads; await act(async () => { await vi.advanceTimersByTimeAsync(10000); }); expect(reads).toBe(stoppedAt);
  });
  it('restores own held seat from the server', async () => {
    network([seat(1, 'HELD'), seat(2)], (url) => url.pathname.endsWith('/pending') ? response({ success: true, data: orderFixture('PENDING_PAYMENT') }) : undefined);
    renderSignedIn(<SeatFlow />); await ready(); expect(await screen.findByText('1/8 ghế')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' })).toBeEnabled(); expect(localStorage.getItem('cinex_pending_order_id')).toBe('order-1');
  });
  it('does not overwrite a confirmed hold with a poll response that started before the hold', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const stale = deferred<Response>(); let reads = 0;
    network([seat(1)], (url) => {
      if (url.pathname.endsWith('/seats') && ++reads === 2) return stale.promise;
    });
    renderSignedIn(<SeatFlow />); await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' })); });
    await act(async () => stale.resolve(response({ success: true, data: { ...showtimeData, seats: [seat(1)] } })));
    expect(screen.getByText('1/8 ghế')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' })).toBeEnabled();
  });
  it('shows a load error instead of a stale selectable map', async () => {
    routeFetch(() => response({ success: false }, 500)); renderSignedIn(<SeatFlow />);
    expect(await screen.findByText('Không thể tải sơ đồ ghế cho suất chiếu này')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' })).toBeDisabled();
  });
  it('keeps the hold visible when closing cannot release it', async () => {
    network([seat(1)], (url) => url.pathname.endsWith('/cancel') ? response({ success: false, error: { message: 'Không thể trả ghế lúc này' } }, 503) : undefined);
    renderSignedIn(<SeatFlow />); await ready(); await choose(1, 1); fireEvent.click(screen.getByRole('button', { name: 'Đóng sơ đồ ghế' }));
    expect(await screen.findByText('Không thể trả ghế lúc này')).toBeInTheDocument(); expect(screen.getByText('1/8 ghế')).toBeInTheDocument();
  });
  it('does not persist a late hold response after logout', async () => {
    const pending = deferred<Response>();
    network([seat(1)], (url) => url.pathname.endsWith('/orders') ? pending.promise : undefined);
    renderSignedIn(<SessionSeatFlow />); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' }));
    fireEvent.click(screen.getByText('logout'));
    await act(async () => pending.resolve(response({ success: true, data: orderFixture('PENDING_PAYMENT') })));
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
    expect(screen.getByText('0/8 ghế')).toBeInTheDocument();
  });
  it('releases the final seat using the actual cancel response envelope', async () => {
    network([seat(1)], (url) => url.pathname.endsWith('/cancel') ? response({ success: true, data: { success: true, message: 'Đã hủy đơn' } }) : undefined);
    renderSignedIn(<SeatFlow />); await ready(); await choose(1, 1); await choose(1, 0);
    expect(localStorage.getItem('cinex_pending_order_id')).toBeNull();
  });
  it('recovers a server hold when the create response was lost', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let persisted = false;
    network([seat(1)], (url) => {
      if (url.pathname.endsWith('/orders')) { persisted = true; return Promise.reject(new TypeError('Mất kết nối')); }
      if (url.pathname.endsWith('/pending')) return response({ success: true, data: persisted ? orderFixture('PENDING_PAYMENT') : null });
    });
    renderSignedIn(<SeatFlow />); await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ghế A1 loại STANDARD' })); });
    expect(screen.getByText('0/8 ghế')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('1/8 ghế')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TIẾP TỤC ĐẶT VÉ' })).toBeEnabled();
  });
});
