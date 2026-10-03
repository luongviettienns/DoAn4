import React, { useState, useEffect } from 'react';
import { X, Ticket, AlertCircle, Check, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface SeatItem {
  id: string;
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  seatType: 'STANDARD' | 'VIP' | 'COUPLE' | 'BLOCKED';
  x: number;
  y: number;
  columnSpan: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';
  price: number;
}

interface ShowtimeSeatData {
  showtime: {
    id: string;
    startTime: string;
    endTime: string;
    format: string;
    language: string;
    basePrice: number;
  };
  movie: {
    id: string;
    title: string;
    ageRating: string;
    durationMin: number;
    posterUrl: string;
  };
  cinema: {
    id: string;
    name: string;
    address: string;
  };
  room: {
    id: string;
    name: string;
    rowCount: number;
    columnCount: number;
  };
  seats: SeatItem[];
}

interface SeatMapModalProps {
  showtimeId: string | null;
  onClose: () => void;
  onProceedToCheckout: (selectedSeats: SeatItem[], showtimeData: ShowtimeSeatData) => void;
}

export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  showtimeId,
  onClose,
  onProceedToCheckout,
}) => {
  const { openAuthModal, user } = useAuth();
  const [data, setData] = useState<ShowtimeSeatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  useEffect(() => {
    if (!showtimeId) return;

    setLoading(true);
    setError(null);
    setSelectedSeatIds([]);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    fetch(`${API_BASE}/showtimes/${showtimeId}/seats`)
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải sơ đồ ghế cho suất chiếu này');
        return res.json();
      })
      .then((json) => setData(json.data))
      .catch((err: unknown) => {
        if (err instanceof Error) setError(err.message);
        else setError('Lỗi kết nối máy chủ');
      })
      .finally(() => setLoading(false));
  }, [showtimeId]);

  if (!showtimeId) return null;

  const handleToggleSeat = (seat: SeatItem) => {
    if (seat.status !== 'AVAILABLE') return;

    const isSelected = selectedSeatIds.includes(seat.id);

    if (isSelected) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
    } else {
      if (selectedSeatIds.length >= 8) {
        alert('Theo quy định (BR-03), mỗi đơn hàng đặt vé tối đa 8 ghế!');
        return;
      }
      setSelectedSeatIds((prev) => [...prev, seat.id]);
    }
  };

  const selectedSeats = (data?.seats || []).filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế để tiếp tục');
      return;
    }
    if (!user) {
      openAuthModal();
      return;
    }
    if (data) {
      onProceedToCheckout(selectedSeats, data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#151318] border border-[#2A2631] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2631] bg-[#0B0A0C]/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FFB23E] uppercase tracking-wider">
              <span>{data?.cinema.name || 'CineX Cinema'}</span>
              <span>·</span>
              <span>{data?.room.name || 'Phòng chiếu'}</span>
            </div>
            <h2 className="font-['Barlow_Condensed'] text-2xl sm:text-3xl font-black text-[#F3EEE6] uppercase tracking-wide">
              {data?.movie.title || 'Sơ đồ chọn ghế'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#A39E96] hover:text-[#F3EEE6] rounded-lg hover:bg-[#221F28] transition-colors"
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

          {!loading && !error && data && (
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
                            const isSold = seat.status === 'SOLD';
                            const isHeld = seat.status === 'HELD';
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
                                disabled={isSold || isHeld}
                                onClick={() => handleToggleSeat(seat)}
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
                  <span className="text-[#FFB23E]">Ghế VIP (+20k)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-4 rounded bg-[#261720] border border-[#F472B6]/60" />
                  <span className="text-[#F472B6]">Ghế Đôi (+40k)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#FFB23E] shadow-sm shadow-[#FFB23E]/50" />
                  <span className="text-[#F3EEE6] font-bold">Đang chọn</span>
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
            disabled={selectedSeats.length === 0}
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
