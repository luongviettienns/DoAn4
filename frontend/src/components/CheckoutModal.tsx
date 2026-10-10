import React, { useState, useEffect, useRef } from 'react';
import {
  X, Clock, ShieldCheck, CreditCard, Film, MapPin, AlertCircle, Loader2,
  Tag, Plus, Minus, CheckCircle2, Popcorn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError, getAuthSessionVersion, type ApiCombo, type ApiOrder } from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';

interface SeatItem { id: string; seatId: string; rowLabel: string; seatNumber: number; seatType: string; price: number }
interface ShowtimeInfo {
  showtime: { id: string; startTime: string; endTime: string; format: string; language: string };
  movie: { id: string; title: string; posterUrl: string | null; ageRating: string; durationMinutes?: number; durationMin?: number };
  cinema: { id: string; name: string; address: string };
  room: { id: string; name: string; format?: string };
}
interface CheckoutModalProps {
  isOpen: boolean; onClose: () => void; heldOrder: ApiOrder;
  showtimeData: ShowtimeInfo; selectedSeats: SeatItem[];
  onOrderSuccess: (orderData: ApiOrder) => void; onOpenAuth: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = (props) => {
  const { user } = useAuth();
  return props.isOpen && user?.id === props.heldOrder.userId
    ? <CheckoutContent key={props.heldOrder.id} {...props} /> : null;
};

const screeningDate = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
});
const screeningTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function clearRecovery(orderId: string) {
  if (localStorage.getItem('cinex_pending_order_id') === orderId) localStorage.removeItem('cinex_pending_order_id');
}
function isTerminal(status: string) { return ['PAID', 'CANCELLED', 'EXPIRED', 'PAID_UNFULFILLED'].includes(status); }
function errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }
function orderIsExpired(expiresAt: string) { return Date.parse(expiresAt) <= Date.now(); }

const CheckoutContent: React.FC<CheckoutModalProps> = ({
  onClose, heldOrder, onOrderSuccess, onOpenAuth,
}) => {
  const { user, token } = useAuth();
  const mockPaymentsEnabled = !import.meta.env.PROD && import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_PAYMENT === 'true';
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'INSTANT_MOCK'>('VNPAY');
  const [pendingOrder, setPendingOrder] = useState<ApiOrder>(heldOrder);
  const [now, setNow] = useState(Date.now);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combos, setCombos] = useState<ApiCombo[]>([]);
  const [combosLoading, setCombosLoading] = useState(true);
  const [combosError, setCombosError] = useState('');
  const [combosRetry, setCombosRetry] = useState(0);
  const [voucherCode, setVoucherCode] = useState(heldOrder.voucher?.code || '');
  const [voucherStatus, setVoucherStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>(heldOrder.voucher ? 'valid' : 'idle');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [operationKeys] = useState(() => ({ pay: crypto.randomUUID(), cancel: crypto.randomUUID() }));
  const [sessionVersion] = useState(getAuthSessionVersion);
  const busy = useRef(false);
  const mounted = useRef(true);
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const isCurrent = () => mounted.current && getAuthSessionVersion() === sessionVersion;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useModalA11y({
    isOpen: true,
    onClose: () => { void handleClose(); },
    closeOnEscape: !loading,
  });
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    api.getCombos(heldOrder.cinemaId, controller.signal)
      .then((catalog) => { if (current) setCombos(catalog.filter((combo) => combo.isActive)); })
      .catch((failure: unknown) => { if (current) setCombosError(errorMessage(failure, 'Không thể tải combo')); })
      .finally(() => { if (current) setCombosLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [heldOrder.cinemaId, combosRetry]);

  const timeLeft = pendingOrder.status === 'PENDING_PAYMENT'
    ? Math.max(0, Math.ceil((Date.parse(pendingOrder.expiresAt) - now) / 1000)) : null;
  const hasPaymentAttempt = paymentAttempted || pendingOrder.payments.some((payment) => payment.status === 'PENDING');
  const editingLocked = loading || timeLeft === 0 || pendingOrder.status !== 'PENDING_PAYMENT'
    || pendingOrder.payments.some((payment) => payment.status === 'PENDING');
  const comboQty = Object.fromEntries(pendingOrder.combos.map((combo) => [combo.comboId, combo.quantity]));
  const voucherInfo = pendingOrder.voucher;
  const ticketSubtotal = pendingOrder.ticketSubtotal;
  const comboSubtotal = pendingOrder.comboSubtotal;
  const discount = pendingOrder.discount;
  const totalAmount = pendingOrder.total;

  const formatTimer = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  function beginOperation() {
    if (!isCurrent() || busy.current) return false;
    busy.current = true;
    setLoading(true);
    setError(null);
    return true;
  }
  function endOperation() {
    busy.current = false;
    if (isCurrent()) setLoading(false);
  }
  function paidSuccess(order: ApiOrder) {
    if (!isCurrent()) return;
    if (order.status !== 'PAID' || order.items.length === 0 || order.items.some((item) => !item.ticket?.ticketCode?.trim())) {
      throw new Error('Chưa có đủ thông tin vé đã thanh toán. Vui lòng tải lại thông tin đơn hàng.');
    }
    clearRecovery(order.id);
    onOrderSuccess(order);
  }
  async function updateChoices(changes: Parameters<typeof api.updateOrder>[1]) {
    if (editingLocked || !beginOperation()) return null;
    try {
      const updated = await api.updateOrder(pendingOrder.id, changes);
      if (!isCurrent()) return null;
      setPendingOrder(updated);
      return updated;
    } finally { endOperation(); }
  }

  const handleComboQty = async (comboId: string, delta: number) => {
    const nextQty = Math.max(0, (comboQty[comboId] ?? 0) + delta);
    const quantities = { ...comboQty, [comboId]: nextQty };
    try {
      await updateChoices({ combos: Object.entries(quantities).filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => ({ comboId: id, quantity })) });
    } catch (failure) { if (isCurrent()) setError(errorMessage(failure, 'Không thể cập nhật combo')); }
  };
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim() || editingLocked) return;
    setVoucherStatus('checking');
    setVoucherError(null);
    try {
      const updated = await updateChoices({ voucherCode: voucherCode.trim().toUpperCase() });
      if (updated && isCurrent()) { setVoucherStatus('valid'); setVoucherCode(updated.voucher?.code || ''); }
    } catch (failure) {
      if (isCurrent()) { setVoucherStatus('invalid'); setVoucherError(errorMessage(failure, 'Không thể áp dụng mã khuyến mãi')); }
    }
  };
  const handleRemoveVoucher = async () => {
    try {
      const updated = await updateChoices({ voucherCode: null });
      if (updated && isCurrent()) { setVoucherCode(''); setVoucherStatus('idle'); setVoucherError(null); }
    } catch (failure) { if (isCurrent()) setError(errorMessage(failure, 'Không thể bỏ mã khuyến mãi')); }
  };

  const handleClose = async () => {
    if (!beginOperation()) return;
    try {
      // The gateway response can be lost; cancel only after reading the persisted state.
      const current = await api.getOrder(pendingOrder.id);
      if (!isCurrent()) return;
      setPendingOrder(current);
      if (current.status === 'PAID') { paidSuccess(current); return; }
      if (current.status === 'PENDING_PAYMENT') {
        try {
          await api.cancelOrder(current.id, operationKeys.cancel);
        } catch (failure) {
          if (!(failure instanceof ApiError) || failure.status !== 409) throw failure;
          // IPN may settle the order after the first read. The pending-only endpoint never cancels paid tickets.
          const latest = await api.getOrder(current.id);
          if (!isCurrent()) return;
          setPendingOrder(latest);
          if (latest.status === 'PAID') { paidSuccess(latest); return; }
          if (!isTerminal(latest.status)) throw failure;
        }
        if (!isCurrent()) return;
        clearRecovery(current.id);
      } else if (isTerminal(current.status)) clearRecovery(current.id);
      if (isCurrent()) onClose();
    } catch (failure) { if (isCurrent()) setError(errorMessage(failure, 'Không thể hủy đơn hàng')); }
    finally { endOperation(); }
  };

  const handleCheckout = async () => {
    if (!user || !token) { onOpenAuth(); return; }
    if (timeLeft === 0 && !hasPaymentAttempt) { setError('Đơn giữ ghế đã hết hạn'); return; }
    if (!beginOperation()) return;
    try {
      let current = pendingOrder;
      // Retry a lost response or an existing gateway attempt without creating or patching another hold.
      if (hasPaymentAttempt) {
        current = await api.getOrder(current.id);
        if (!isCurrent()) return;
        setPendingOrder(current);
      }
      if (current.status === 'PAID') { paidSuccess(current); return; }
      if (current.status !== 'PENDING_PAYMENT') {
        if (isTerminal(current.status)) clearRecovery(current.id);
        throw new Error(current.status === 'PAID_UNFULFILLED'
          ? 'Đã ghi nhận thanh toán nhưng chưa thể cấp vé. Rạp đang xử lý hoàn tiền.'
          : 'Đơn giữ ghế không còn khả dụng. Vui lòng chọn lại ghế.');
      }
      if (orderIsExpired(current.expiresAt) && !paymentCompleted) throw new Error('Đơn giữ ghế đã hết hạn');
      localStorage.setItem('cinex_pending_order_id', current.id);
      setPaymentAttempted(true);
      if (paymentMethod === 'INSTANT_MOCK' && mockPaymentsEnabled) {
        if (!paymentCompleted) {
          await api.simulatePayment(current.id);
          if (!isCurrent()) return;
          setPaymentCompleted(true);
        }
        const settled = await api.getOrder(current.id);
        if (!isCurrent()) return;
        setPendingOrder(settled);
        if (settled.status !== 'PAID') throw new Error('Thanh toán đang được xác nhận. Vui lòng tải lại thông tin đơn hàng.');
        paidSuccess(settled);
      } else {
        const payment = await api.initiatePayment(current.id, operationKeys.pay);
        if (isCurrent()) window.location.assign(payment.paymentUrl);
      }
    } catch (failure) { if (isCurrent()) setError(errorMessage(failure, 'Đã có lỗi xảy ra khi xử lý đơn hàng')); }
    finally { endOperation(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        className="relative w-full max-w-2xl bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#FFB23E] uppercase tracking-wider">XÁC NHẬN ĐƠN HÀNG</div>
              <h2 id="checkout-modal-title" className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">Thanh toán vé xem phim</h2>
            </div>
          </div>
          <button type="button" onClick={() => void handleClose()} disabled={loading}
            className="p-2 text-[#A39E96] hover:text-[#F3EEE6] hover:bg-white/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Countdown */}
          {timeLeft !== null && <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 text-[#FFB23E]">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>Thời gian giữ ghế còn lại:</span>
            </div>
            <span className="font-mono text-lg font-black tracking-wider">{formatTimer(timeLeft)}</span>
          </div>}

          {error && (
            <div role="alert" className="flex items-center gap-2.5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Film Summary */}
          <div className="p-4 rounded-xl bg-[#0B0A0C]/60 border border-[#2A2631] space-y-3">
            <div className="flex gap-4">
              <div className="w-16 h-24 rounded-lg bg-[#2A2631] overflow-hidden flex-shrink-0 border border-white/10">
                {pendingOrder.snapshot.posterUrl
                  ? <img src={pendingOrder.snapshot.posterUrl} alt={pendingOrder.snapshot.movieTitle} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#A39E96] text-xs">CineX</div>}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFB23E] text-[#0B0A0C]">{pendingOrder.snapshot.ageRating}</span>
                  <span className="text-xs text-[#A39E96]">{pendingOrder.snapshot.format}</span>
                </div>
                <h3 className="font-['Barlow_Condensed'] text-xl font-bold text-[#F3EEE6] leading-tight">{pendingOrder.snapshot.movieTitle}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#A39E96]">
                  <MapPin className="w-3.5 h-3.5 text-[#FFB23E]" />
                  <span>{pendingOrder.snapshot.cinemaName} — {pendingOrder.snapshot.roomName}</span>
                </div>
                <p className="text-xs text-[#A39E96]">
                  {screeningTime.format(new Date(pendingOrder.snapshot.startTime))} · {screeningDate.format(new Date(pendingOrder.snapshot.startTime))} (giờ Việt Nam)
                </p>
              </div>
            </div>
            {/* Seats */}
            <div className="pt-3 border-t border-[#2A2631] flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[#A39E96]">Ghế đã chọn:</span>
              {pendingOrder.items.map((seat) => (
                <span key={seat.id} className="px-2.5 py-1 rounded-lg bg-[#2A2631] border border-[#FFB23E]/30 text-xs font-mono font-bold text-[#FFB23E]">
                  {seat.seatLabel} ({seat.seatType}) · {seat.price.toLocaleString('vi-VN')}đ
                </span>
              ))}
            </div>
          </div>

          {/* ─── Combo Selection (F13) ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Popcorn className="w-4 h-4 text-[#FFB23E]" />
              <span className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">Combo Bắp Nước</span>
            </div>
            {combosError ? <div role="alert" className="text-sm text-red-300"><p>{combosError}</p><button type="button" onClick={() => { setCombosLoading(true); setCombosError(''); setCombosRetry((value) => value + 1); }} className="mt-2 py-2 text-[#FFB23E] underline">Thử tải lại combo</button></div> : combosLoading ? (
              <div className="flex items-center gap-2 text-[#A39E96] text-sm p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải combo...</span>
              </div>
            ) : combos.length === 0 ? (
              <div className="text-xs text-[#A39E96] p-3 rounded-xl border border-[#2A2631]">Không có combo nào khả dụng</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {combos.map((combo) => {
                  const qty = comboQty[combo.id] ?? 0;
                  return (
                    <div key={combo.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${qty > 0 ? 'bg-[#FFB23E]/5 border-[#FFB23E]/40' : 'bg-[#0B0A0C]/40 border-[#2A2631] hover:border-white/15'}`}>
                      <div className="w-10 h-10 rounded-lg bg-[#2A2631] flex items-center justify-center flex-shrink-0 text-[#FFB23E] overflow-hidden">
                        {combo.imageUrl
                          ? <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
                          : <Popcorn className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#F3EEE6] truncate">{combo.name}</div>
                        {combo.description && <div className="text-xs text-[#A39E96] truncate">{combo.description}</div>}
                        <div className="text-sm font-bold text-[#FFB23E]">{combo.price.toLocaleString('vi-VN')}đ</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button type="button" aria-label={`Bớt ${combo.name}`} onClick={() => void handleComboQty(combo.id, -1)} disabled={qty === 0 || editingLocked}
                          className="w-7 h-7 rounded-lg bg-[#2A2631] hover:bg-[#3A3641] disabled:opacity-30 text-[#F3EEE6] flex items-center justify-center transition-colors">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-[#F3EEE6]">{qty}</span>
                        <button type="button" aria-label={`Thêm ${combo.name}`} onClick={() => void handleComboQty(combo.id, 1)} disabled={editingLocked}
                          className="w-7 h-7 rounded-lg bg-[#FFB23E]/20 hover:bg-[#FFB23E]/30 text-[#FFB23E] flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Voucher (F13) ─── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#FFB23E]" />
              <span className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">Mã Khuyến Mãi</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Mã khuyến mãi" disabled={editingLocked}
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setVoucherStatus('idle');
                  setVoucherError(null);
                }}
                placeholder="Nhập mã voucher (VD: CINEX20)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0B0A0C]/60 border border-[#2A2631] text-[#F3EEE6] text-sm placeholder-[#A39E96] focus:border-[#FFB23E]/60 focus:outline-none transition-colors font-mono tracking-wider"
              />
              <button type="button" onClick={() => void handleValidateVoucher()}
                disabled={!voucherCode.trim() || voucherStatus === 'checking' || editingLocked}
                className="px-4 py-2.5 bg-[#FFB23E]/20 hover:bg-[#FFB23E]/30 disabled:opacity-40 text-[#FFB23E] text-sm font-bold rounded-xl transition-colors border border-[#FFB23E]/30 flex items-center gap-1.5 min-w-[90px] justify-center">
                {voucherStatus === 'checking'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Tag className="w-4 h-4" /><span>Áp dụng</span></>}
              </button>
            </div>
            {voucherInfo && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-950/40 border border-green-700/50 text-green-300 text-sm">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span><strong>{voucherInfo.name}</strong> — Giảm <strong>{voucherInfo.discount.toLocaleString('vi-VN')}đ</strong></span>
                <button type="button" disabled={editingLocked} onClick={() => void handleRemoveVoucher()} className="ml-auto py-1 underline text-xs disabled:opacity-40" aria-label="Bỏ mã khuyến mãi">Bỏ mã</button>
              </div>
            )}
            {voucherStatus === 'invalid' && voucherError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{voucherError}</span>
              </div>
            )}
          </div>

          {/* Auth check */}
          {!user ? (
            <div className="p-4 rounded-xl bg-[#FFB23E]/5 border border-[#FFB23E]/20 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-[#F3EEE6]">Bạn chưa đăng nhập</div>
                <div className="text-xs text-[#A39E96]">Đăng nhập để tích điểm thưởng và nhận vé điện tử</div>
              </div>
              <button type="button" onClick={onOpenAuth}
                className="px-4 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold text-xs rounded-lg transition-colors min-h-[40px]">
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#0B0A0C]/40 border border-[#2A2631] text-xs text-[#A39E96] space-y-1">
              <div>Khách hàng: <span className="text-[#F3EEE6] font-semibold">{user.fullName}</span> ({user.email})</div>
              <div>Số điện thoại: <span className="text-[#F3EEE6] font-semibold">{user.phone}</span></div>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">Phương thức thanh toán</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mockPaymentsEnabled && <button type="button" onClick={() => setPaymentMethod('INSTANT_MOCK')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${paymentMethod === 'INSTANT_MOCK' ? 'bg-[#FFB23E]/10 border-[#FFB23E] text-[#F3EEE6]' : 'bg-[#0B0A0C]/50 border-[#2A2631] text-[#A39E96] hover:border-white/20'}`}>
                <div className="p-2 rounded-lg bg-[#FFB23E]/20 text-[#FFB23E] mt-0.5"><CreditCard className="w-5 h-5" /></div>
                <div>
                  <div className="text-sm font-bold text-[#F3EEE6]">Sandbox Tức thì (Dev)</div>
                  <div className="text-xs text-[#A39E96] mt-0.5">Thanh toán giả lập & xuất vé QR ngay</div>
                </div>
              </button>}
              <button type="button" onClick={() => setPaymentMethod('VNPAY')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${paymentMethod === 'VNPAY' ? 'bg-[#FFB23E]/10 border-[#FFB23E] text-[#F3EEE6]' : 'bg-[#0B0A0C]/50 border-[#2A2631] text-[#A39E96] hover:border-white/20'}`}>
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5 font-black text-xs">VNPay</div>
                <div>
                  <div className="text-sm font-bold text-[#F3EEE6]">Cổng VNPay</div>
                  <div className="text-xs text-[#A39E96] mt-0.5">Thẻ ATM nội địa, Visa/Master, VNPAY-QR</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Footer with price breakdown */}
        <div className="p-4 sm:p-5 bg-[#0B0A0C] border-t border-[#2A2631] space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[#A39E96]">
              <span>Vé ({pendingOrder.items.length} ghế)</span>
              <span>{ticketSubtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            {comboSubtotal > 0 && (
              <div className="flex justify-between text-xs text-[#A39E96]">
                <span>Combo bắp nước</span>
                <span>{comboSubtotal.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-xs text-green-400">
                <span>Giảm giá voucher</span>
                <span>-{discount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-2 border-t border-[#2A2631]">
              <div className="text-xs text-[#A39E96]">Tổng thanh toán:</div>
              <div className="font-['Barlow_Condensed'] text-3xl font-black text-[#FFB23E]">
                {totalAmount.toLocaleString('vi-VN')}đ
              </div>
            </div>
          </div>
          <button type="button" disabled={loading || (timeLeft === 0 && !hasPaymentAttempt)} onClick={() => void handleCheckout()}
            className="w-full px-8 py-3.5 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-40 text-[#0B0A0C] font-['Barlow_Condensed'] text-lg font-black tracking-wider uppercase rounded-xl shadow-xl shadow-[#FFB23E]/20 transition-all min-h-[48px] flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Đang xử lý đơn...</span></>
              : <><ShieldCheck className="w-5 h-5 stroke-[2.5]" /><span>THANH TOÁN NGAY</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};
