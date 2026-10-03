import React from 'react';
import { Film, ShieldCheck, CreditCard, Phone, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#070608] text-[#A39E96] border-t border-[#1C1822] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#1C1822]">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FFB23E] flex items-center justify-center text-[#0B0A0C] shadow-lg shadow-[#FFB23E]/20">
                <Film className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-['Barlow_Condensed'] text-2xl font-black tracking-wider text-[#F3EEE6]">
                CINEX<span className="text-[#FFB23E]">.</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A39E96] leading-relaxed max-w-sm">
              Hệ thống rạp chiếu phim hiện đại chuẩn quốc tế với phòng chiếu IMAX Laser, ScreenX và dịch vụ đặt vé trực quan, thanh toán an toàn tiện lợi qua cổng VNPay.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-[#F3EEE6]">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#FFB23E]" />
                1900 6868
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#FFB23E]" />
                support@cinex.vn
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-['Barlow_Condensed'] text-base font-bold uppercase tracking-wider text-[#F3EEE6]">
              Khám Phá
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#movies" className="hover:text-[#FFB23E] transition-colors">Phim đang chiếu</a></li>
              <li><a href="#movies" className="hover:text-[#FFB23E] transition-colors">Phim sắp chiếu</a></li>
              <li><a href="#cinemas" className="hover:text-[#FFB23E] transition-colors">Lịch chiếu toàn quốc</a></li>
              <li><a href="#experience" className="hover:text-[#FFB23E] transition-colors">Công nghệ IMAX Laser</a></li>
            </ul>
          </div>

          {/* Policies & Terms */}
          <div className="space-y-3">
            <h4 className="font-['Barlow_Condensed'] text-base font-bold uppercase tracking-wider text-[#F3EEE6]">
              Chính Sách & Quy Định
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#rules" className="hover:text-[#FFB23E] transition-colors">Điều khoản sử dụng</a></li>
              <li><a href="#privacy" className="hover:text-[#FFB23E] transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#refund" className="hover:text-[#FFB23E] transition-colors">Quy định đổi/hủy vé</a></li>
              <li><a href="#age" className="hover:text-[#FFB23E] transition-colors">Tiêu chuẩn phân loại độ tuổi</a></li>
            </ul>
          </div>

          {/* Security & Partners */}
          <div className="space-y-3">
            <h4 className="font-['Barlow_Condensed'] text-base font-bold uppercase tracking-wider text-[#F3EEE6]">
              Thanh Toán An Toàn
            </h4>
            <p className="text-xs text-[#A39E96]">
              Hỗ trợ thanh toán bảo mật với mã hóa giao dịch đa tầng:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1.5 rounded bg-[#151318] border border-[#2A2631] text-[11px] font-semibold text-[#F3EEE6] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#FFB23E]" />
                VNPay
              </span>
              <span className="px-2.5 py-1.5 rounded bg-[#151318] border border-[#2A2631] text-[11px] font-semibold text-[#F3EEE6] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                SSL 256-Bit
              </span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6B665F] gap-4">
          <p>© 2026 CineX — Đồ án 4: Hệ thống đặt vé xem phim online. Giữ toàn quyền thiết kế.</p>
          <p>Mã nguồn phục vụ đồ án học phần công nghệ thông tin.</p>
        </div>
      </div>
    </footer>
  );
};
