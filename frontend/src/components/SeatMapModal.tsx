import React, { useState, useEffect, useRef } from 'react';
import { X, Ticket, AlertCircle, Check, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, getAuthSessionVersion, type ApiOrder, type ApiSeat, type ShowtimeSeatData } from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';
export type SeatItem = ApiSeat;
interface SeatMapModalProps {
  showtimeId: string | null; onClose: () => void;
  onProceedToCheckout: (selectedSeats: SeatItem[], showtimeData: ShowtimeSeatData, heldOrder: ApiOrder) => void;
}
export const SeatMapModal: React.FC<SeatMapModalProps> = ({ showtimeId, onClose, onProceedToCheckout }) => {
  const { openAuthModal, user, isRestoring } = useAuth();
  const actorId = user?.id;
  const [data, setData] = useState<ShowtimeSeatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const busyRef = useRef(false);
  const orderRef = useRef<ApiOrder | null>(null);
  const generation = useRef(0);
  const mutationRevision = useRef(0);

  useModalA11y({
    isOpen: Boolean(showtimeId),
    onClose: () => { void handleClose(); },
    closeOnEscape: !busy,
  });
  const createKey = useRef(crypto.randomUUID());

  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    orderRef.current = null;
    busyRef.current = false;
    createKey.current = crypto.randomUUID();

    void Promise.resolve().then(() => {
      if (controller.signal.aborted || generation.current !== current) return;
      setData(null);
      setOrder(null);
      setAgeConfirmed(false);
      setError(null);
      setMapError(false);
      setLoading(!!showtimeId);
      setBusy(false);
    });

    if (!showtimeId || isRestoring) return;
    const load = async () => {
      const revision = mutationRevision.current;
      try {
        if (busyRef.current) return;
        const snapshot = orderRef.current;
        const [map, pending] = await Promise.all([
          api.getShowtimeSeats(showtimeId, controller.signal),
          actorId ? (snapshot ? api.getOrder(snapshot.id, controller.signal) : api.getPendingOrder(showtimeId, controller.signal)) : Promise.resolve(null),
        ]);
        if (controller.signal.aborted || generation.current !== current || busyRef.current || revision !== mutationRevision.current) return;
        setData(map); setMapError(false); setError(null);
        if (pending?.status === 'PENDING_PAYMENT' && Date.parse(pending.expiresAt) > Date.now()) {
          orderRef.current = pending; setOrder(pending);
          if (pending.items.length) setAgeConfirmed(true);
          localStorage.setItem('cinex_pending_order_id', pending.id);
        } else {
          orderRef.current = null; setOrder(null);
          if (snapshot) {
            setError(pending?.status === 'PAID' ? 'Đơn đã thanh toán. Mở lịch sử vé để xem vé của bạn.' : 'Đơn giữ ghế đã kết thúc. Vui lòng chọn lại ghế.');
            if (localStorage.getItem('cinex_pending_order_id') === snapshot.id) localStorage.removeItem('cinex_pending_order_id');
          }
        }
      } catch (err) {
        if (!controller.signal.aborted && current === generation.current && revision === mutationRevision.current) {
          setMapError(true); setError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
        }
      } finally {
        if (!controller.signal.aborted && current === generation.current) {
          setLoading(false); timer = setTimeout(() => { void load(); }, 5000);
        }
      }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); generation.current = current + 1; };
  }, [showtimeId, actorId, isRestoring, reload]);

  useEffect(() => {
    if (!order) {
      let active = true;
      void Promise.resolve().then(() => {
        if (active) setSecondsLeft(null);
      });
      return () => { active = false; };
    }
    let active = true;
    const update = () => {
      if (active) setSecondsLeft(Math.max(0, Math.ceil((Date.parse(order.expiresAt) - Date.now()) / 1000)));
    };
    void Promise.resolve().then(update);
    const timer = setInterval(update, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [order]);

  const selectedSeats = (data?.seats ?? []).filter((s) => order?.items.some((item) => item.seatId === s.seatId))
    .map((s) => ({ ...s, price: order!.items.find((item) => item.seatId === s.seatId)!.price }));
  const selectedSeatIds = selectedSeats.map((s) => s.id);
  const totalPrice = order?.ticketSubtotal ?? 0;
  const expired = secondsLeft === 0;
  const paymentStarted = !!order?.payments.some((p) => p.status === 'PENDING');

  const remember = (next: ApiOrder | null) => {
    orderRef.current = next; setOrder(next);
    if (next) localStorage.setItem('cinex_pending_order_id', next.id);
    else if (localStorage.getItem('cinex_pending_order_id') === order?.id) localStorage.removeItem('cinex_pending_order_id');
  };
  const handleToggleSeat = async (seat: SeatItem) => {
    if (busyRef.current || mapError || isRestoring || paymentStarted) return;
    if (!user) { openAuthModal(); return; }
    if (/^T(13|16|18)$/.test(data?.movie.ageRating ?? '') && !ageConfirmed) {
      setError('Vui lòng xác nhận đủ độ tuổi xem phim trước khi giữ ghế'); return;
    }
    const isSelected = selectedSeatIds.includes(seat.id);
    if (!isSelected && (seat.status !== 'AVAILABLE' || seat.seatType === 'BLOCKED')) return;
    if (!isSelected && selectedSeats.length >= 8) { setError('Mỗi đơn hàng đặt vé tối đa 8 ghế'); return; }
    const nextIds = isSelected ? selectedSeats.filter((s) => s.id !== seat.id).map((s) => s.seatId)
      : [...selectedSeats.map((s) => s.seatId), seat.seatId];
    const current = generation.current;
    const session = getAuthSessionVersion();
    ++mutationRevision.current;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      let next: ApiOrder | null;
      if (!nextIds.length && order) { await api.cancelOrder(order.id, crypto.randomUUID()); next = null; }
      else next = order ? await api.updateOrder(order.id, { seatIds: nextIds, ageConfirmed })
          : await api.createOrder({ showtimeId: showtimeId!, seatIds: nextIds, ageConfirmed }, createKey.current);
      // A completed hold remains resumable even if its dialog was removed during the request.
      if (session !== getAuthSessionVersion()) return;
      if (next?.status === 'PENDING_PAYMENT') localStorage.setItem('cinex_pending_order_id', next.id);
      if (current !== generation.current) return;
      remember(next?.status === 'PENDING_PAYMENT' ? next : null);
      createKey.current = crypto.randomUUID();
      setData((previous) => previous ? { ...previous, seats: previous.seats.map((s) => ({ ...s,
        status: nextIds.includes(s.seatId) ? 'HELD' : selectedSeatIds.includes(s.id) ? 'AVAILABLE' : s.status,
        heldByCurrentUser: nextIds.includes(s.seatId),
      })) } : previous);
    } catch (err) {
      if (current === generation.current) setError(err instanceof Error ? err.message : 'Không thể giữ ghế');
      createKey.current = crypto.randomUUID();
    } finally {
      if (current === generation.current) { busyRef.current = false; setBusy(false); }
    }
  };
  const handleClose = async () => {
    if (busyRef.current) return;
    if (!order) { onClose(); return; }
    ++mutationRevision.current;
    const currentGeneration = generation.current;
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const current = await api.getOrder(order.id);
      if (current.status === 'PENDING_PAYMENT') await api.cancelOrder(order.id, crypto.randomUUID());
      if (currentGeneration !== generation.current) return;
      remember(null); onClose();
    } catch (err) { if (currentGeneration === generation.current) setError(err instanceof Error ? err.message : 'Không thể trả ghế'); }
    finally { if (currentGeneration === generation.current) { busyRef.current = false; setBusy(false); } }
  };
  const handleProceed = () => {
    if (data && order && selectedSeats.length && !busy && !expired && !mapError) onProceedToCheckout(selectedSeats, data, order);
  };
  if (!showtimeId) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seatmap-modal-title"
        className="relative w-full max-w-4xl bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFB23E] uppercase tracking-wider">
              <span>{data?.cinema.name || 'CineX Cinema'}</span>
              <span>·</span>
              <span>{data?.room.name || 'Phòng chiếu'}</span>
            </div>
            <h2 id="seatmap-modal-title" className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-black text-[#F3EEE6] uppercase tracking-wide">
              {data?.movie.title || 'Sơ đồ chọn ghế'}
            </h2>
            {data && <p className="text-xs text-[#A39E96] mt-1">
              {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(data.showtime.startTime))} · {data.showtime.format} · {data.showtime.language}
            </p>}
          </div>
          <button
            type="button"
            onClick={() => void handleClose()} disabled={busy}
            className="p-2 text-[#A39E96] hover:text-[#F3EEE6] rounded-lg hover:bg-[#221F28] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng sơ đồ ghế"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center space-y-6">
          {loading && (
            <div className="py-20 text-center text-[#A39E96] text-sm animate-pulse">
              Đang tải sơ đồ ghế thời gian thực...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {mapError && <button onClick={() => setReload((n) => n + 1)} className="text-[#FFB23E] underline">Tải lại sơ đồ ghế</button>}
          {data && /^T(13|16|18)$/.test(data.movie.ageRating) && (
            <label className="flex items-start gap-3 text-sm text-[#A39E96]">
              <input type="checkbox" checked={ageConfirmed} disabled={!!order || busy} onChange={(e) => setAgeConfirmed(e.target.checked)} />
              Tôi xác nhận đã đủ {data.movie.ageRating.slice(1)} tuổi và mang theo giấy tờ tùy thân khi tới rạp.
            </label>
          )}
          <p className="text-xs text-[#A39E96]" aria-live="polite">
            {busy ? 'Đang xác nhận giữ ghế với rạp…' : 'Sơ đồ ghế cập nhật mỗi 5 giây. Ghế được giữ ngay khi chọn.'}
            {secondsLeft !== null && ` Thời gian còn lại: ${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`}
            {expired && ' Đã hết thời gian giữ ghế.'}
            {paymentStarted && ' Giao dịch đang chờ xác nhận; không thể đổi ghế.'}
          </p>

          {!loading && !mapError && data && (
            <>
              {/* Screen Arc Projection */}
              <div className="w-full max-w-2xl flex flex-col items-center pt-2">
                <div className="w-full h-2 rounded-t-full bg-gradient-to-r from-transparent via-[#FFB23E] to-transparent shadow-[0_4px_25px_rgba(255,178,62,0.4)]" />
                <div className="text-[11px] font-bold tracking-widest uppercase text-[#A39E96] mt-3">
                  MÀN HÌNH CHIẾU (SCREEN)
                </div>
              </div>

              {/* Seat Matrix Grid */}
              <div className="w-full overflow-x-auto py-6 flex justify-center">
                <div className="inline-flex flex-col gap-2.5 p-4 bg-[#0B0A0C]/60 rounded-2xl border border-[#2A2631]/60">
                  {/* Group seats by rowLabel */}
                  {Array.from(new Set(data.seats.map((s) => s.rowLabel))).map((row) => {
                    const rowSeats = data.seats.filter((s) => s.rowLabel === row);
                    return (
                      <div key={row} className="flex items-center gap-2">
                        {/* Row letter */}
                        <span className="w-6 text-center font-bold text-xs text-[#A39E96] font-mono">
                          {row}
                        </span>

                        {/* Seats in row */}
                        <div className="flex items-center gap-2">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.id);
                            const isSold = seat.status === 'SOLD' || seat.status === 'BLOCKED' || seat.seatType === 'BLOCKED';
                            const isHeld = seat.status === 'HELD' && !isSelected;
                            const isCouple = seat.seatType === 'COUPLE';
                            const isVip = seat.seatType === 'VIP';

                            // Base styling
                            let seatClass = 'relative flex items-center justify-center font-bold text-[11px] rounded transition-all duration-150 ';
                            
                            if (isCouple) {
                              seatClass += 'w-16 h-8 '; // double width for couple
                            } else {
                              seatClass += 'w-8 h-8 ';
                            }

                            if (isSold) {
                              seatClass += 'bg-[#1C1822] text-[#6B665F] border border-[#2A2631] cursor-not-allowed opacity-40';
                            } else if (isHeld) {
                              seatClass += 'bg-[#FFB23E]/20 text-[#FFB23E] border border-[#FFB23E]/40 cursor-not-allowed animate-pulse';
                            } else if (isSelected) {
                              seatClass += 'bg-[#FFB23E] text-[#0B0A0C] font-black shadow-lg shadow-[#FFB23E]/40 scale-105 z-10';
                            } else if (isVip) {
                              seatClass += 'bg-[#1E1A26] hover:bg-[#2A2338] text-[#FFB23E] border border-[#FFB23E]/60 hover:scale-105';
                            } else if (isCouple) {
                              seatClass += 'bg-[#261720] hover:bg-[#38212F] text-[#F472B6] border border-[#F472B6]/60 hover:scale-105';
                            } else {
                              seatClass += 'bg-[#151318] hover:bg-[#221F28] text-[#F3EEE6] border border-[#2A2631] hover:scale-105';
                            }

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                disabled={isSold || isHeld || busy || mapError || expired || paymentStarted}
                                onClick={() => void handleToggleSeat(seat)} aria-pressed={isSelected}
                                className={seatClass}
                                title={`${seat.rowLabel}${seat.seatNumber} (${seat.seatType}) - ${seat.price.toLocaleString('vi-VN')}đ`}
                                aria-label={`Ghế ${seat.rowLabel}${seat.seatNumber} loại ${seat.seatType}`}
                              >
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : isCouple ? (
                                  <Heart className="w-3 h-3 fill-current opacity-70" />
                                ) : (
                                  <span>{seat.seatNumber}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Row letter */}
                        <span className="w-6 text-center font-bold text-xs text-[#A39E96] font-mono">
                          {row}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend of Seat Types */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#A39E96] pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#151318] border border-[#2A2631]" />
                  <span>Ghế Thường</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#1E1A26] border border-[#FFB23E]/60" />
                  <span className="text-[#FFB23E]">Ghế VIP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-4 rounded bg-[#261720] border border-[#F472B6]/60" />
                  <span className="text-[#F472B6]">Ghế Đôi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#FFB23E] shadow-sm shadow-[#FFB23E]/50" />
                  <span className="text-[#F3EEE6] font-bold">Bạn đang giữ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#1C1822] border border-[#2A2631] opacity-50" />
                  <span>Đã bán</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Booking Summary Dock */}
        <div className="p-4 sm:p-6 bg-[#0B0A0C] border-t border-[#2A2631] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs text-[#A39E96]">
              Đã chọn: <span className="text-[#FFB23E] font-bold">{selectedSeats.length}/8 ghế</span>
              {selectedSeats.length > 0 && (
                <span className="text-[#F3EEE6] ml-2 font-mono">
                  ({selectedSeats.map((s) => `${s.rowLabel}${s.seatNumber}`).join(', ')})
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-[#A39E96]">Tổng tiền:</span>
              <span className="font-['Barlow_Condensed'] text-3xl font-black text-[#FFB23E]">
                {totalPrice.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={selectedSeats.length === 0 || busy || expired || mapError || loading}
            onClick={handleProceed}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-40 text-[#0B0A0C] font-['Barlow_Condensed'] text-lg font-black tracking-wider uppercase rounded-xl shadow-xl shadow-[#FFB23E]/20 transition-all min-h-[48px] flex items-center justify-center gap-2"
          >
            <Ticket className="w-5 h-5 stroke-[2.5]" />
            <span>TIẾP TỤC ĐẶT VÉ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
