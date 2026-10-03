import React from 'react';
import { Gift, Zap, ArrowRight, Popcorn } from 'lucide-react';

export const PromoSection: React.FC = () => {
  return (
    <section id="promotions" className="py-20 bg-[#0B0A0C] border-t border-[#151318]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#2A2631]">
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-[#FFB23E]">
              Đặc quyền & Ưu đãi
            </span>
            <h2 className="font-['Barlow_Condensed'] text-4xl sm:text-5xl font-black text-[#F3EEE6] uppercase tracking-tight">
              COMBO BẮP NƯỚC & KHUYẾN MÃI
            </h2>
          </div>
          <a
            href="#all-promos"
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#FFB23E] hover:text-[#FFA21A] uppercase transition-colors"
          >
            <span>Xem tất cả ưu đãi</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Combo bắp nước */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#151318] to-[#1E1A24] border border-[#2A2631] p-8 flex flex-col justify-between group hover:border-[#FFB23E]/50 transition-all duration-300">
            <div className="space-y-3 max-w-sm">
              <div className="w-10 h-10 rounded-lg bg-[#FFB23E]/15 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
                <Popcorn className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#FFB23E]">
                Combo Rạp Độc Quyền
              </span>
              <h3 className="font-['Barlow_Condensed'] text-3xl font-extrabold text-[#F3EEE6] uppercase leading-tight">
                COMBO DUNE: ĐỈNH CAO SA MẠC
              </h3>
              <p className="text-xs sm:text-sm text-[#A39E96]">
                Tặng kèm ly nước collectible phát sáng độc quyền phiên bản giới hạn khi mua 01 bắp rang caramen lớn và 02 ly nước ngọt.
              </p>
            </div>
            <div className="pt-6 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#A39E96] line-through">199.000đ</span>
                <div className="text-2xl font-black text-[#FFB23E] font-['Barlow_Condensed']">
                  149.000đ
                </div>
              </div>
              <button
                type="button"
                className="px-5 py-2.5 bg-[#FFB23E] hover:bg-[#FFA21A] text-[#0B0A0C] font-['Barlow_Condensed'] text-sm font-bold uppercase rounded-lg shadow-md transition-all min-h-[44px]"
              >
                Thêm vào đơn
              </button>
            </div>
          </div>

          {/* Card 2: Thành viên CineX */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#151318] to-[#201815] border border-[#2A2631] p-8 flex flex-col justify-between group hover:border-[#FFB23E]/50 transition-all duration-300">
            <div className="space-y-3 max-w-sm">
              <div className="w-10 h-10 rounded-lg bg-[#FFB23E]/15 border border-[#FFB23E]/30 flex items-center justify-center text-[#FFB23E]">
                <Gift className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#FFB23E]">
                Thành viên CineX Rewards
              </span>
              <h3 className="font-['Barlow_Condensed'] text-3xl font-extrabold text-[#F3EEE6] uppercase leading-tight">
                THỨ 4 VUI VẺ — ĐỒNG GIÁ 55K
              </h3>
              <p className="text-xs sm:text-sm text-[#A39E96]">
                Áp dụng cho mọi suất chiếu 2D tiêu chuẩn vào ngày thứ 4 hàng tuần cho thành viên đăng ký tài khoản online. Tích lũy 10% điểm đổi vé.
              </p>
            </div>
            <div className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#FFB23E] font-semibold">
                <Zap className="w-4 h-4 fill-current" />
                <span>Tự động áp dụng khi thanh toán</span>
              </div>
              <button
                type="button"
                className="px-5 py-2.5 bg-[#151318] hover:bg-[#221F28] text-[#F3EEE6] border border-[#2A2631] hover:border-[#FFB23E]/50 font-['Barlow_Condensed'] text-sm font-bold uppercase rounded-lg transition-all min-h-[44px]"
              >
                Đăng ký ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
