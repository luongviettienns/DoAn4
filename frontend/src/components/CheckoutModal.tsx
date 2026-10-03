import React, { useState, useEffect } from 'react';
import { X, Clock, ShieldCheck, CreditCard, Film, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SeatItem {
  id: string;
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  seatType: string;
  price: number;
}

interface ShowtimeInfo {
  showtime: {
    id: string;
    startTime: string;
    endTime: string;
    format: string;
    language: string;
  };
  movie: {
    id: string;
    title: string;
    posterUrl: string | null;
    ageRating: string;
    durationMinutes: number;
  };
  cinema: {
    id: string;
    name: string;
    address: string;
  };
  room: {
    id: string;
    name: string;
    format: string;
  };
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  showtimeData: ShowtimeInfo;
  selectedSeats: SeatItem[];
  onOrderSuccess: (orderData: any) => void;
  onOpenAuth: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  showtimeData,
  selectedSeats,
  onOrderSuccess,
  onOpenAuth,
}) => {
  const { user, token } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY_SANDBOX' | 'INSTANT_MOCK'>('INSTANT_MOCK');
  const [ageConfirmed, setAgeConfirmed] = useState(true);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600s)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 10-minute hold timer
  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(600);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCheckout = async () => {
    if (!user || !token) {
      onOpenAuth();
      return;
    }

    if (!ageConfirmed) {
      setError('Vui lòng xác nhận đủ độ tuổi xem phim theo quy định');
      return;
    }

    setLoading(true);
    setError(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

    try {
      // 1. Tạo đơn đặt vé và giữ ghế (F03)
      const createRes = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          showtimeId: showtimeData.showtime.id,
          seatIds: selectedSeats.map((s) => s.seatId),
          ageConfirmed,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error?.message || createData.message || 'Không thể tạo đơn hàng giữ chỗ');
      }

      const orderId = createData.data.id;

      // 2. Thanh toán theo phương thức đã chọn
      if (paymentMethod === 'INSTANT_MOCK') {
        // Mô phỏng thanh toán tức thì (Dev Sandbox)
        const mockRes = await fetch(`${API_BASE}/payment/simulate-mock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });

        const mockData = await mockRes.json();
        if (!mockRes.ok || !mockData.success) {
          throw new Error(mockData.message || 'Thanh toán mô phỏng thất bại');
        }

        // Lấy chi tiết đơn hàng đã cập nhật kèm vé
        const orderDetailRes = await fetch(`${API_BASE}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orderDetailData = await orderDetailRes.json();

        onOrderSuccess(orderDetailData.data);
      } else {
        // VNPay Sandbox URL
        const payRes = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ method: 'VNPAY', locale: 'vn' }),
        });

        const payData = await payRes.json();
        if (!payRes.ok || !payData.success) {
          throw new Error(payData.error?.message || 'Không thể khởi tạo cổng VNPay');
        }

        // Chuyển hướng tới cổng VNPay Sandbox
        window.location.href = payData.data.paymentUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra khi xử lý đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#FFB23E] uppercase tracking-wider">
                XÁC NHẬN ĐƠN HÀNG (F03 · F04)
              </div>
              <h2 className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">
                Thanh toán vé xem phim
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#A39E96] hover:text-[#F3EEE6] hover:bg-white/5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 10-Minute Hold Countdown Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFB23E]/10 border border-[#FFB23E]/30 text-[#FFB23E]">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>Thời gian giữ ghế còn lại:</span>
            </div>
            <span className="font-mono text-lg font-black tracking-wider">
              {formatTimer(timeLeft)}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Film & Cinema Summary Card */}
          <div className="p-4 rounded-xl bg-[#0B0A0C]/60 border border-[#2A2631] space-y-3">
            <div className="flex gap-4">
              <div className="w-16 h-24 rounded-lg bg-[#2A2631] overflow-hidden flex-shrink-0 border border-white/10">
                {showtimeData.movie.posterUrl ? (
                  <img
                    src={showtimeData.movie.posterUrl}
                    alt={showtimeData.movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#A39E96] text-xs">CineX</div>
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFB23E] text-[#0B0A0C]">
                    {showtimeData.movie.ageRating}
                  </span>
                  <span className="text-xs text-[#A39E96]">{showtimeData.showtime.format}</span>
                </div>
                <h3 className="font-['Barlow_Condensed'] text-xl font-bold text-[#F3EEE6] leading-tight">
                  {showtimeData.movie.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-[#A39E96]">
                  <MapPin className="w-3.5 h-3.5 text-[#FFB23E]" />
                  <span>{showtimeData.cinema.name} — {showtimeData.room.name}</span>
                </div>
              </div>
            </div>

            {/* Selected Seats Matrix */}
            <div className="pt-3 border-t border-[#2A2631] flex flex-wrap gap-2 items-center">
              <span className="text-xs text-[#A39E96]">Ghế đã chọn:</span>
              {selectedSeats.map((seat) => (
                <span
                  key={seat.id}
                  className="px-2.5 py-1 rounded-lg bg-[#2A2631] border border-[#FFB23E]/30 text-xs font-mono font-bold text-[#FFB23E]"
                >
                  {seat.rowLabel}{seat.seatNumber} ({seat.seatType}) · {seat.price.toLocaleString('vi-VN')}đ
                </span>
              ))}
            </div>
          </div>

          {/* User Account / Auth Check */}
          {!user ? (
            <div className="p-4 rounded-xl bg-[#FFB23E]/5 border border-[#FFB23E]/20 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-[#F3EEE6]">Bạn chưa đăng nhập</div>
                <div className="text-xs text-[#A39E96]">Đăng nhập để tích điểm thưởng và nhận vé điện tử trực tiếp</div>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-bold text-xs rounded-lg transition-colors min-h-[40px]"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#0B0A0C]/40 border border-[#2A2631] text-xs text-[#A39E96] space-y-1">
              <div>Khách hàng: <span className="text-[#F3EEE6] font-semibold">{user.fullName}</span> ({user.email})</div>
              <div>Số điện thoại: <span className="text-[#F3EEE6] font-semibold">{user.phone}</span></div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#A39E96] uppercase tracking-wider">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('INSTANT_MOCK')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  paymentMethod === 'INSTANT_MOCK'
                    ? 'bg-[#FFB23E]/10 border-[#FFB23E] text-[#F3EEE6]'
                    : 'bg-[#0B0A0C]/50 border-[#2A2631] text-[#A39E96] hover:border-white/20'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#FFB23E]/20 text-[#FFB23E] mt-0.5">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F3EEE6]">Sandbox Tức thì (Dev)</div>
                  <div className="text-xs text-[#A39E96] mt-0.5">Thanh toán giả lập & xuất vé QR ngay lập tức</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('VNPAY_SANDBOX')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  paymentMethod === 'VNPAY_SANDBOX'
                    ? 'bg-[#FFB23E]/10 border-[#FFB23E] text-[#F3EEE6]'
                    : 'bg-[#0B0A0C]/50 border-[#2A2631] text-[#A39E96] hover:border-white/20'
                }`}
              >
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5 font-black text-xs">
                  VNPay
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F3EEE6]">Cổng VNPay Sandbox</div>
                  <div className="text-xs text-[#A39E96] mt-0.5">Thẻ ATM nội địa, Visa/Master, VNPAY-QR</div>
                </div>
              </button>
            </div>
          </div>

          {/* Age Rating Confirmation (BR) */}
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#2A2631] text-[#FFB23E] focus:ring-0"
            />
            <span className="text-xs text-[#A39E96] leading-relaxed">
              Tôi xác nhận đã đủ <strong className="text-[#FFB23E]">{showtimeData.movie.ageRating}</strong> tuổi theo quy định của Cục Điện Ảnh và mang theo giấy tờ tùy thân khi tới rạp.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#0B0A0C] border-t border-[#2A2631] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-xs text-[#A39E96]">Tổng số tiền thanh toán:</div>
            <div className="font-['Barlow_Condensed'] text-3xl font-black text-[#FFB23E]">
              {totalAmount.toLocaleString('vi-VN')}đ
            </div>
          </div>

          <button
            type="button"
            disabled={loading || timeLeft === 0}
            onClick={handleCheckout}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#FFB23E] hover:bg-[#FFA21A] disabled:opacity-40 text-[#0B0A0C] font-['Barlow_Condensed'] text-lg font-black tracking-wider uppercase rounded-xl shadow-xl shadow-[#FFB23E]/20 transition-all min-h-[48px] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xử lý đơn...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                <span>THANH TOÁN NGAY</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
