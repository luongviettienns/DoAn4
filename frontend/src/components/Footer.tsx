import { useState } from 'react';
import { Clock, Compass, Film, QrCode, RotateCcw, ShieldCheck, Sparkles, Ticket } from 'lucide-react';

interface PolicyItem {
  id: 'age' | 'hold' | 'refund' | 'qr';
  label: string;
  title: string;
  summary: string;
  details: string[];
}

const OPERATIONAL_POLICIES: PolicyItem[] = [
  {
    id: 'age',
    label: 'Phân loại độ tuổi (P / K / T13 / T16 / T18)',
    title: 'Quy Chuẩn Phân Loại Độ Tuổi Phổ Biến Phim',
    summary:
      'Mỗi bộ phim trên CineX đều hiển thị rõ nhãn độ tuổi theo quy định trước khi chọn suất chiếu:',
    details: [
      'P: Phim được phép phổ biến đến người xem ở mọi độ tuổi.',
      'K: Phim được phổ biến đến người xem dưới 13 tuổi với điều kiện xem cùng cha, mẹ hoặc người giám hộ.',
      'T13 / T16 / T18: Phim chỉ phổ biến đến người xem từ đủ 13 tuổi, 16 tuổi hoặc 18 tuổi trở lên.',
    ],
  },
  {
    id: 'hold',
    label: 'Cơ chế giữ ghế thời gian thực (10 phút)',
    title: 'Khóa Ghế Nguyên Tử 10 Phút Khi Đặt Vé',
    summary:
      'Đảm bảo không bao giờ xảy ra tình trạng trùng ghế giữa nhiều khách hàng đặt cùng lúc:',
    details: [
      'Ngay khi bạn xác nhận vị trí ghế trên sơ đồ, hệ thống giữ độc quyền các ghế đó trong 10 phút (600 giây).',
      'Nếu bạn vô tình đóng trình duyệt, thanh điều hướng vẫn hiển thị nút "Tiếp tục thanh toán" kèm đồng hồ đếm ngược.',
      'Sau 10 phút nếu đơn chưa thanh toán, ghế sẽ tự động mở lại cho khách hàng khác.',
    ],
  },
  {
    id: 'refund',
    label: 'Chính sách hoàn hủy vé trực tuyến (≥ 2 giờ)',
    title: 'Tự Hoàn Hủy Vé Trực Tuyến Trước Giờ Chiếu',
    summary:
      'Khách hàng chủ động quản lý lịch trình ngay trong mục "Vé của tôi":',
    details: [
      'Hỗ trợ hủy đơn vé đã thanh toán trực tuyến khi thời điểm hiện tại cách giờ mở màn tối thiểu 2 giờ (120 phút).',
      'Ngay khi hủy thành công, trạng thái vé chuyển sang Đã hủy và vị trí ghế được giải phóng tức thì trên sơ đồ rạp.',
      'Các vé đã soát mã QR tại quầy (Checked-in) hoặc sát giờ chiếu dưới 2 giờ không áp dụng hủy trực tuyến.',
    ],
  },
  {
    id: 'qr',
    label: 'Bảo mật giao dịch & Vé điện tử QR',
    title: 'Vé Điện Tử QR Định Danh & Tích Điểm Minh Bạch',
    summary:
      'Mỗi ghế trong đơn hàng thanh toán thành công được cấp mã vé QR độc lập:',
    details: [
      'Sử dụng mã QR trong mục "Vé của tôi" để nhân viên quầy soát vé nhanh chóng mà không cần in vé giấy.',
      'Tự động cộng điểm thưởng theo tỷ lệ 10.000 ₫ = 1 điểm ngay khi hoàn tất thanh toán.',
    ],
  },
];

export function Footer() {
  const [activePolicyId, setActivePolicyId] = useState<PolicyItem['id']>('age');
  const activePolicy =
    OPERATIONAL_POLICIES.find((item) => item.id === activePolicyId) ?? OPERATIONAL_POLICIES[0];

  return (
    <footer className="bg-[#09090B] border-t border-white/10 pt-16 pb-12 text-[var(--color-text-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* SCENE 5A: CLOSING CURTAIN CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-zinc-900 via-[var(--color-bg-secondary)] to-rose-950/40 border border-white/15 p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-cta)]" aria-hidden="true" />
              Sẵn Sàng Cho Suất Chiếu Tiếp Theo
            </span>
            <h2 className="vn-display-safe text-2xl sm:text-4xl font-extrabold text-white uppercase">
              Chọn Bộ Phim Yêu Thích &amp; Giữ Ghế Đẹp Ngay Hôm Nay
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Lịch chiếu theo giờ Việt Nam (GMT+7), phụ thu hạng ghế minh bạch và nhận vé QR tức thì.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="#booking-dock"
              className="inline-flex min-h-12 items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] text-white text-sm font-bold transition-colors shadow-lg shadow-rose-600/25"
            >
              <Ticket className="w-4 h-4" aria-hidden="true" />
              Đặt vé nhanh
            </a>
            <a
              href="#movies"
              className="inline-flex min-h-12 items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-zinc-200 hover:text-white text-sm font-semibold transition-colors"
            >
              <Compass className="w-4 h-4 text-amber-400" aria-hidden="true" />
              Duyệt danh mục phim
            </a>
          </div>
        </div>

        {/* SCENE 5B: INTERACTIVE OPERATIONAL POLICY DRAWER (#policies) */}
        <section
          id="policies"
          aria-labelledby="footer-policies-heading"
          className="rounded-3xl bg-[var(--color-bg-secondary)] border border-white/10 p-6 sm:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <h3 id="footer-policies-heading" className="text-lg font-bold text-white">
                Quy Định Phân Loại Độ Tuổi &amp; Chính Sách Đặt Vé Trực Tuyến
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Chọn từng mục bên dưới để xem chi tiết quy tắc vận hành thực tế trên hệ thống CineX.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Áp dụng đồng bộ trên toàn hệ thống
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-start">
            <div
              role="tablist"
              aria-label="Tra cứu quy định hoạt động"
              className="lg:col-span-5 flex flex-col gap-2"
            >
              {OPERATIONAL_POLICIES.map((policy) => {
                const selected = policy.id === activePolicy.id;
                return (
                  <button
                    key={policy.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActivePolicyId(policy.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selected
                        ? 'bg-[var(--color-accent-cta)] text-white border-[var(--color-accent-cta)] shadow-md'
                        : 'bg-zinc-950/70 text-zinc-300 border-white/10 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <span>{policy.label}</span>
                    {policy.id === 'hold' && <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    {policy.id === 'refund' && <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    {policy.id === 'qr' && <QrCode className="w-4 h-4 shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              aria-label={activePolicy.title}
              className="lg:col-span-7 rounded-2xl bg-zinc-950 border border-white/10 p-5 sm:p-6 space-y-3"
            >
              <h4 className="text-base sm:text-lg font-bold text-white">{activePolicy.title}</h4>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                {activePolicy.summary}
              </p>
              <ul className="space-y-2 pt-1">
                {activePolicy.details.map((line) => (
                  <li key={line} className="text-xs sm:text-sm text-zinc-200 flex items-start gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-2" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* BRAND & VERIFIED NAVIGATION LINKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4 lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5 group w-fit">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-cta)] to-rose-900 flex items-center justify-center shadow-lg shadow-[var(--color-accent-cta)]/20">
                <Film className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <span className="font-display font-extrabold text-3xl tracking-wider text-white">
                CINE<span className="text-[var(--color-accent-cta)]">X</span>
              </span>
            </a>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-md">
              Hệ thống đặt vé và quản lý rạp chiếu phim trực tuyến với định dạng phòng chiếu IMAX,
              3D, 2D tiêu chuẩn, giữ ghế nguyên tử thời gian thực và vé điện tử QR định danh.
            </p>
          </div>

          <nav aria-label="Liên kết khám phá chân trang">
            <h4 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-4">
              Khám Phá Trang Chủ
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#hero-spotlight" className="hover:text-white transition-colors">
                  Phim Tiêu Điểm Đêm Công Chiếu
                </a>
              </li>
              <li>
                <a href="#movies" className="hover:text-white transition-colors">
                  Danh Mục Phim Đang &amp; Sắp Chiếu
                </a>
              </li>
              <li>
                <a href="#booking-dock" className="hover:text-white transition-colors">
                  Quầy Chọn Rạp &amp; Suất Chiếu Nhanh
                </a>
              </li>
              <li>
                <a href="#experience" className="hover:text-white transition-colors">
                  Sơ Đồ Hạng Ghế &amp; Định Dạng Phòng Chiếu
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Liên kết ưu đãi và chính sách">
            <h4 className="font-display font-bold text-lg text-white uppercase tracking-wider mb-4">
              Ưu Đãi &amp; Quy Định
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#promotions" className="hover:text-white transition-colors">
                  Mã Giảm Giá CINEX20 &amp; GIAM30K
                </a>
              </li>
              <li>
                <a href="#combos" className="hover:text-white transition-colors">
                  Thực Đơn Combo Bắp Nước
                </a>
              </li>
              <li>
                <a
                  href="#policies"
                  onClick={() => setActivePolicyId('age')}
                  className="hover:text-white transition-colors"
                >
                  Phân Loại Độ Tuổi (P, K, T13, T16, T18)
                </a>
              </li>
              <li>
                <a
                  href="#policies"
                  onClick={() => setActivePolicyId('refund')}
                  className="hover:text-white transition-colors"
                >
                  Chính Sách Hoàn Hủy Vé Trước 2 Giờ
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)] tabular-nums">
          <p>© 2026 CineX Cinema Booking System. Múi giờ hiển thị chuẩn: Asia/Ho_Chi_Minh (GMT+7).</p>
          <p>Phát triển trên nền React 19 • TypeScript • Tailwind CSS v4</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
