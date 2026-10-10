import React from 'react';
import { X, CheckCircle2, Ticket, MapPin, Calendar, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useModalA11y } from '../hooks/useModalA11y';

interface TicketItem {
  id: string;
  seatId: string;
  seatLabel: string;
  seatType: string;
  price: number;
  ticket: {
    ticketCode: string;
    status: string;
    checkedInAt: string | null;
    qrCode?: string;
  } | null;
}

interface OrderData {
  id: string;
  code: string;
  total: number;
  status: string;
  paidAt: string | null;
  snapshot: {
    movieTitle: string;
    posterUrl: string | null;
    ageRating: string;
    cinemaName: string;
    cinemaAddress: string;
    roomName: string;
    format: string;
    language: string;
    startTime: string;
    endTime: string;
  };
  items: TicketItem[];
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHome?: () => void;
  order: OrderData | null;
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onHome, order }) => {
  useModalA11y({ isOpen, onClose });

  if (!isOpen || !order) return null;

  const issued = order.status === 'PAID' && order.items.length > 0
    && order.items.every((item) => !!item.ticket?.ticketCode);
  const bannerText = issued ? 'Đặt vé thành công'
    : order.status === 'CANCELLED' ? 'Đơn hàng đã hủy'
    : order.status === 'EXPIRED' ? 'Đơn hàng đã hết hạn' : 'Đang chờ phát hành vé';

  const startTime = new Date(order.snapshot.startTime);
  const formattedDate = startTime.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = startTime.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        className="relative w-full max-w-xl bg-[#151318] border border-[#FFB23E]/30 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Top Success Banner */}
        <div className={`${issued ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-[#2A2631]'} px-6 py-4 flex items-center justify-between text-white`}>
          <div className="flex items-center gap-3">
            {issued ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <Ticket className="w-6 h-6 flex-shrink-0" />}
            <div>
              <div className="text-xs uppercase font-bold tracking-wider opacity-90">{bannerText}</div>
              <h2 id="ticket-modal-title" className="font-['Barlow_Condensed'] text-xl font-bold uppercase tracking-wide">
                Vé điện tử CineX Pass
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/20 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Ticket Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main CineX Ticket Board */}
          <div className="relative bg-[#0B0A0C] border border-[#2A2631] rounded-2xl p-5 overflow-hidden shadow-inner">
            {/* Hologram Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFB23E] via-rose-500 to-[#FFB23E]" />

            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-[#FFB23E] text-[#0B0A0C]">
                    {order.snapshot.ageRating}
                  </span>
                  <span className="text-xs font-semibold text-[#A39E96]">{order.snapshot.format}</span>
                </div>
                <h3 className="font-['Barlow_Condensed'] text-2xl font-black text-[#F3EEE6] uppercase tracking-wide">
                  {order.snapshot.movieTitle}
                </h3>
              </div>
              <div className="text-right font-mono text-xs text-[#A39E96]">
                <div>MÃ ĐƠN</div>
                <div className="text-[#FFB23E] font-bold text-sm">{order.code}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#2A2631]/80 grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-[#A39E96] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FFB23E]" />
                  <span>Rạp chiếu & Phòng</span>
                </div>
                <div className="text-[#F3EEE6] font-semibold">{order.snapshot.cinemaName}</div>
                <div className="text-[#A39E96] text-[11px]">{order.snapshot.roomName}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[#A39E96] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#FFB23E]" />
                  <span>Thời gian chiếu</span>
                </div>
                <div className="text-[#F3EEE6] font-semibold">{formattedTime}</div>
                <div className="text-[#A39E96] text-[11px]">{formattedDate}</div>
              </div>
            </div>
          </div>

          {/* Individual Ticket Cards with QR Code */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-[#A39E96] uppercase tracking-wider flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#FFB23E]" />
              <span>Mã QR Soát vé từng ghế ({order.items.length} vé)</span>
            </div>

            <div className="space-y-3">
              {order.items.map((item) => {
                const ticketCode = item.ticket?.ticketCode;
                const isValid = order.status === 'PAID' && item.ticket?.status === 'VALID' && !!ticketCode;
                const statusLabel = item.ticket?.status === 'USED' ? 'ĐÃ SỬ DỤNG'
                  : item.ticket?.status === 'CANCELLED' ? 'ĐÃ HỦY'
                  : isValid ? 'HỢP LỆ — SẴN SÀNG SOÁT VÉ' : 'CHƯA PHÁT HÀNH';
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#0B0A0C]/80 border border-[#2A2631] flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Live Sharp QR Code */}
                      {isValid && ticketCode && <div className="p-2.5 bg-white rounded-xl shadow-md flex-shrink-0">
                        <QRCodeSVG
                          value={item.ticket?.qrCode || ticketCode}
                          size={96}
                          level="H"
                          includeMargin={false}
                        />
                      </div>}
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="text-xs text-[#A39E96]">MÃ VÉ ĐIỆN TỬ</div>
                        <div className="font-mono text-base font-black text-[#FFB23E] tracking-wider">
                          {ticketCode || 'Chưa có mã vé'}
                        </div>
                        <div className="text-xs text-[#F3EEE6] font-bold">
                          Ghế: <span className="text-[#FFB23E] font-mono text-sm">{item.seatLabel}</span> ({item.seatType})
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{statusLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-[#2A2631] sm:pl-4">
                      <div className="text-xs text-[#A39E96]">Giá vé</div>
                      <div className="font-['Barlow_Condensed'] text-xl font-bold text-[#F3EEE6]">
                        {item.price.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-[#0B0A0C] border-t border-[#2A2631] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#2A2631] hover:bg-white/5 text-[#F3EEE6] text-xs font-bold transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4 text-[#FFB23E]" />
            <span>Lưu / In vé</span>
          </button>

          <button
            type="button"
            onClick={onHome ?? onClose}
            className="w-full sm:w-auto px-8 py-3 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-['Barlow_Condensed'] text-base font-black tracking-wider uppercase rounded-xl shadow-lg transition-all min-h-[44px] flex items-center justify-center"
          >
            HOÀN TẤT & VỀ TRANG CHỦ
          </button>
        </div>
      </div>
    </div>
  );
};
