import React, { useState, useEffect } from 'react';
import { X, Ticket, Calendar, MapPin, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  useEffect(() => {
    if (!isOpen || !token) return;

    setLoading(true);
    setError(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

    fetch(`${API_BASE}/me/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.items) {
          setOrders(json.data.items);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => setError(err.message || 'Không thể tải lịch sử đơn hàng'))
      .finally(() => setLoading(false));
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md h-full bg-[#151318] border-l border-[#2A2631] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2A2631] bg-[#0B0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">
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
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isPaid ? 'ĐÃ THANH TOÁN (HỢP LỆ)' : order.status}
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

                  {/* Seat list */}
                  <div className="pt-2 border-t border-[#2A2631]/80 flex items-center justify-between">
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
              );
            })}
        </div>
      </div>
    </div>
  );
};
