import React, { useState, useEffect } from 'react';
import { X, Ticket, Calendar, MapPin, AlertCircle, Loader2, ArrowRight, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useModalA11y } from '../hooks/useModalA11y';

interface MyTicketsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (order: any) => void;
}

export const MyTicketsDrawer: React.FC<MyTicketsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Cancellation state
  const [confirmCancelOrder, setConfirmCancelOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách hàng đổi kế hoạch cá nhân');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useModalA11y({
    isOpen,
    onClose: confirmCancelOrder ? () => setConfirmCancelOrder(null) : onClose,
    closeOnEscape: !cancelling,
  });

  useEffect(() => {
    if (!isOpen || !token) return;

    let cancelled = false;
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      return fetch(`${API_BASE}/me/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.error?.message || 'Không thể tải lịch sử đơn hàng');
          return json;
        })
        .then((json) => {
          if (cancelled) return;
          if (json.success && json.data?.items) {
            setOrders(json.data.items);
          } else {
            setOrders([]);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message || 'Không thể tải lịch sử đơn hàng');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, token]);

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmCancelOrder) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelOrder(confirmCancelOrder.id, {
        reason: cancelReason.trim() || 'Khách hàng yêu cầu hủy vé',
        pendingOnly: false,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === confirmCancelOrder.id
            ? { ...o, status: 'CANCELLED', refundStatus: 'PENDING' }
            : o
        )
      );
      setActionSuccess('Đã hủy vé thành công! Yêu cầu hoàn tiền 100% đã được tạo và đang chờ duyệt.');
      setConfirmCancelOrder(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Không thể hủy vé');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mytickets-drawer-title"
        className="relative w-full max-w-md h-full bg-[#151318] border-l border-[#2A2631] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A2631] bg-[#0B0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 id="mytickets-drawer-title" className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">
                Vé của tôi (F06)
              </h2>
              <div className="text-xs text-[#A39E96]">
                {user?.fullName || 'Khách hàng'} · {orders.length} đơn hàng
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#A39E96] hover:text-[#F3EEE6] hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng danh sách vé"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-[#A39E96] gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#FFB23E]" />
              <span className="text-xs">Đang tải danh sách vé...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="py-24 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-[#A39E96]">
                <Ticket className="w-8 h-8 opacity-40" />
              </div>
              <div className="text-sm font-bold text-[#F3EEE6]">Chưa có vé nào</div>
              <div className="text-xs text-[#A39E96] max-w-xs mx-auto">
                Bạn chưa đặt vé nào. Hãy chọn phim và ghế ngồi yêu thích để trải nghiệm rạp CineX!
              </div>
            </div>
          )}

          {!loading &&
            orders.map((order) => {
              const startTime = new Date(order.snapshot.startTime);
              const formattedDate = startTime.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              });
              const formattedTime = startTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isPaid = order.status === 'PAID';
              const isCancelled = order.status === 'CANCELLED';
              const hoursUntilShowtime = (startTime.getTime() - now) / (1000 * 60 * 60);
              const canCancel = isPaid && hoursUntilShowtime >= 2;

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-[#0B0A0C] border border-[#2A2631] hover:border-[#FFB23E]/50 transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isCancelled
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isPaid
                          ? 'ĐÃ THANH TOÁN (HỢP LỆ)'
                          : isCancelled
                          ? order.refundStatus === 'REFUNDED'
                            ? 'ĐÃ HỦY (ĐÃ HOÀN TIỀN)'
                            : 'ĐÃ HỦY (CHỜ HOÀN TIỀN)'
                          : order.status}
                      </span>
                      <h3 className="font-['Barlow_Condensed'] text-xl font-bold text-[#F3EEE6] leading-tight">
                        {order.snapshot.movieTitle}
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-[#FFB23E] font-bold">
                      {order.code}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-[#A39E96]">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FFB23E]" />
                      <span>{order.snapshot.cinemaName} — {order.snapshot.roomName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#FFB23E]" />
                      <span>{formattedTime}, {formattedDate} ({order.snapshot.format})</span>
                    </div>
                  </div>

                  {/* Seat list & Action */}
                  <div className="pt-2 border-t border-[#2A2631]/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.map((item: any) => (
                        <span
                          key={item.id}
                          className="px-2 py-0.5 rounded bg-[#2A2631] text-[11px] font-mono font-bold text-[#FFB23E]"
                        >
                          {item.seatLabel}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelError(null);
                            setConfirmCancelOrder(order);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Hủy vé</span>
                        </button>
                      )}

                      {isPaid && !canCancel && hoursUntilShowtime > 0 && (
                        <span className="text-[10px] text-[#A39E96]/70 italic" title="Quy tắc BR-14: Chỉ được hủy vé trước giờ chiếu ít nhất 2 tiếng">
                          Hết hạn hủy (&lt; 2h)
                        </span>
                      )}

                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectOrder(order);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#FFB23E] hover:text-[#FFA21A] transition-colors"
                        >
                          <span>Xem vé QR</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Confirmation Modal */}
        {confirmCancelOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-confirm-title"
              className="bg-[#151318] border border-red-500/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 id="cancel-confirm-title" className="font-['Barlow_Condensed'] text-xl font-bold text-[#F3EEE6] uppercase">
                  Xác nhận hủy vé & Hoàn tiền
                </h3>
              </div>

              <div className="text-xs text-[#A39E96] space-y-2">
                <p>
                  Bạn có chắc muốn hủy đơn vé <strong className="text-[#F3EEE6]">{confirmCancelOrder.code}</strong> (Phim: {confirmCancelOrder.snapshot.movieTitle})?
                </p>
                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-red-300 text-[11px] leading-relaxed">
                  Quy định BR-14: Toàn bộ ghế sẽ được giải phóng ngay lập tức. Yêu cầu hoàn tiền 100% ({confirmCancelOrder.total?.toLocaleString('vi-VN')}đ) sẽ được gửi đến Quản trị viên đối soát (trạng thái PENDING).
                </div>
              </div>

              <form onSubmit={handleConfirmCancel} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#A39E96] mb-1">
                    Lý do hủy vé:
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0A0C] border border-[#2A2631] text-[#F3EEE6] text-xs focus:border-[#FFB23E] focus:outline-none"
                    placeholder="Nhập lý do hủy vé..."
                    required
                  />
                </div>

                {cancelError && (
                  <div className="p-2 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                    {cancelError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setConfirmCancelOrder(null)}
                    className="px-4 py-2 rounded-lg border border-[#2A2631] text-xs font-bold text-[#A39E96] hover:text-[#F3EEE6] hover:bg-white/5 transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={cancelling}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
