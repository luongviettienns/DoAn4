import { useState } from 'react';
import { Armchair, CheckCircle2, Eye, Layers, ShieldCheck, Sparkles, Ticket, Volume2 } from 'lucide-react';

interface SeatTierSpec {
  id: 'STANDARD' | 'VIP' | 'COUPLE';
  badge: string;
  name: string;
  rowsLabel: string;
  surchargeLabel: string;
  exampleTotalLabel: string;
  sightlineNote: string;
  description: string;
  highlights: string[];
  accentColor: string;
  svgRowHighlight: 'ABC' | 'DE' | 'F';
}

const SEAT_TIERS: SeatTierSpec[] = [
  {
    id: 'VIP',
    badge: 'ĐIỂM NGỌT THỊ GIÁC • HÀNG D & E',
    name: 'Ghế VIP Trung Tâm (Sweet Spot)',
    rowsLabel: 'Hàng D – E (Trung tâm kháng phòng)',
    surchargeLabel: '+20.000 ₫ / ghế',
    exampleTotalLabel: '150.000 ₫ (suất IMAX cơ bản)',
    sightlineNote: 'Góc nhìn chuẩn 36° ngang tầm mắt — tâm hội tụ âm thanh vòm',
    description:
      'Đặt tại khu vực trung tâm của sơ đồ phòng chiếu (Hàng D và E), nơi mắt người nhìn thẳng vào tâm màn bạc mà không cần ngước hoặc xoay cổ.',
    highlights: [
      'Tầm nhìn cân bằng nhất cho cả phụ đề tiếng Việt và toàn khung hình IMAX / 2D',
      'Vị trí giao thoa chuẩn xác của hệ thống loa đa kênh trong phòng chiếu',
      'Tự động tính phụ thu +20.000 ₫ minh bạch ngay khi chạm chọn trên sơ đồ ghế',
    ],
    accentColor: '#F59E0B',
    svgRowHighlight: 'DE',
  },
  {
    id: 'STANDARD',
    badge: 'TIÊU CHUẨN CÔNG THÁI HỌC • HÀNG A, B, C',
    name: 'Ghế Thường (Standard)',
    rowsLabel: 'Hàng A – B – C (Cận màn bạc)',
    surchargeLabel: '+0 ₫ (Giá gốc)',
    exampleTotalLabel: '130.000 ₫ (suất IMAX cơ bản)',
    sightlineNote: 'Góc bao phủ khung hình rộng — cảm giác nhập vai cận cảnh',
    description:
      'Ba hàng ghế đầu tiên được bố trí độ nghiêng tựa lưng hợp lý, phù hợp với khán giả yêu thích khung hình choáng ngợp và mức giá tiết kiệm nhất.',
    highlights: [
      'Không phát sinh phụ thu hạng ghế (+0 ₫ trên mọi khung giờ trong tuần)',
      'Đệm ngồi bọc nỉ cao cấp, đánh số rõ ràng từ A1 đến C10 trên sơ đồ điện tử',
      'Giữ chỗ thời gian thực 10 phút bằng khóa nguyên tử ngay khi chọn ghế',
    ],
    accentColor: '#38BDF8',
    svgRowHighlight: 'ABC',
  },
  {
    id: 'COUPLE',
    badge: 'KHÔNG GIAN ĐÔI RIÊNG TƯ • HÀNG F',
    name: 'Ghế Đôi Sweetbox (Couple Seat)',
    rowsLabel: 'Hàng F (Hàng cuối — 5 cụm ghế đôi)',
    surchargeLabel: '+40.000 ₫ / ghế đôi',
    exampleTotalLabel: '170.000 ₫ (suất IMAX cơ bản)',
    sightlineNote: 'Độ cao toàn cảnh cao nhất kháng phòng — không vách ngăn giữa',
    description:
      'Hàng ghế F trên cùng được thiết kế dạng ghế đôi liền kề (chiếm 2 cột trên sơ đồ phòng chiếu), mang lại tầm nhìn bao quát toàn bộ kháng phòng.',
    highlights: [
      'Thiết kế 2 chỗ ngồi liền mạch (columnSpan: 2) dành cho cặp đôi hoặc bạn thân',
      'Đặt ở cao độ lớn nhất giúp quan sát trọn vẹn màn hình và không gian phòng chiếu',
      'Kết hợp hoàn hảo với Combo Đôi CineX Sweet Romance tại bước thanh toán',
    ],
    accentColor: '#E11D48',
    svgRowHighlight: 'F',
  },
];

const ROOM_FORMATS = [
  {
    code: 'IMAX',
    title: 'Phòng Chiếu IMAX',
    subtitle: 'Phòng IMAX 01 • 55 ghế định danh (Hàng A – F)',
    detail:
      'Màn hình cong khổ lớn kết hợp sơ đồ ghế bậc thang 6 hàng từ Standard, VIP đến Couple, tối ưu cho các tác phẩm bom tấn.',
  },
  {
    code: '3D',
    title: 'Định Dạng 3D Kỹ Thuật Số',
    subtitle: 'Hỗ trợ Phụ đề Việt & Lồng tiếng',
    detail:
      'Tái tạo chiều sâu không gian ba chiều sắc nét với độ sáng ổn định, phân tách rõ ràng trên từng thẻ suất chiếu.',
  },
  {
    code: '2D',
    title: 'Định Dạng 2D Tiêu Chuẩn',
    subtitle: 'Trải nghiệm điện ảnh nguyên bản',
    detail:
      'Độ tương phản chuẩn xác, phụ đề tiếng Việt sắc nét và âm thanh cân bằng cho mọi thể loại từ hành động đến tâm lý kịch tính.',
  },
];

export function CinemaExperienceSection() {
  const [activeTierId, setActiveTierId] = useState<SeatTierSpec['id']>('VIP');
  const activeTier = SEAT_TIERS.find((t) => t.id === activeTierId) ?? SEAT_TIERS[0];

  return (
    <section
      id="experience"
      aria-labelledby="experience-heading"
      className="py-20 bg-[#09090B] relative overflow-hidden border-t border-white/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-gradient-to-b from-rose-600/10 via-amber-500/5 to-transparent blur-[110px]"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--color-accent-cta)] text-xs font-bold uppercase tracking-widest mb-3">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Kiến Trúc Kháng Phòng &amp; Sơ Đồ Hạng Ghế Thật
            </div>
            <h2
              id="experience-heading"
              className="vn-display-safe font-extrabold text-3xl sm:text-5xl text-white uppercase tracking-wide"
            >
              Chọn Đúng Vị Trí Ngồi Trước Khi Đèn Tắt
            </h2>
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm sm:text-base max-w-md">
            Mô phỏng trực tiếp cấu trúc 6 hàng ghế (<strong className="text-white">A – F</strong>) và
            bảng phụ thu minh bạch đang vận hành trong hệ thống đặt vé CineX.
          </p>
        </div>

        {/* Interactive Auditorium Stage + Tier Inspector (Bento Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Cols: Interactive SVG Auditorium Sightline Stage */}
          <div className="lg:col-span-7 rounded-3xl bg-[var(--color-bg-secondary)] border border-white/10 p-6 sm:p-8 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
                  Mặt Cắt Quang Học Phòng Chiếu CineX
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  Tầm Nhìn Màn Bạc Theo Hạng Ghế Đang Chọn
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-200 tabular-nums">
                55 ghế định danh • 6 hàng (A–F)
              </span>
            </div>

            {/* Seat Tier Switcher Tabs */}
            <div
              role="tablist"
              aria-label="Chọn hạng ghế để xem góc nhìn và phụ thu"
              className="grid grid-cols-3 gap-2.5 mb-6"
            >
              {SEAT_TIERS.map((tier) => {
                const selected = tier.id === activeTier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTierId(tier.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-[var(--color-accent-cta)] shadow-lg shadow-rose-950/30'
                        : 'bg-zinc-950/70 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-white">{tier.id}</span>
                      <span className="text-[11px] font-bold text-amber-300 tabular-nums">
                        {tier.surchargeLabel.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 line-clamp-1">
                      {tier.rowsLabel.split('(')[0]}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Original Architectural SVG Cross-Section Diagram */}
            <div className="relative rounded-2xl bg-zinc-950 border border-white/10 p-4 sm:p-6 overflow-hidden">
              <svg
                viewBox="0 0 680 260"
                role="img"
                aria-label={`Sơ đồ mặt cắt góc nhìn phòng chiếu cho ${activeTier.name}`}
                className="w-full h-auto select-none"
              >
                <defs>
                  <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={activeTier.accentColor} stopOpacity="0.38" />
                    <stop offset="100%" stopColor={activeTier.accentColor} stopOpacity="0.04" />
                  </linearGradient>
                </defs>

                {/* Subtle Grid Lines */}
                <line x1="40" y1="220" x2="650" y2="220" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <line x1="80" y1="30" x2="80" y2="220" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

                {/* Curved Cinema Screen on Left */}
                <path
                  d="M 68 38 Q 52 125 68 205"
                  fill="none"
                  stroke="#FAFAFA"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 74 42 Q 60 125 74 200"
                  fill="none"
                  stroke={activeTier.accentColor}
                  strokeWidth="2.5"
                  strokeOpacity="0.8"
                />
                <text x="42" y="28" fill="#FAFAFA" fontSize="11" fontWeight="700">
                  MÀN BẠC IMAX / 2D
                </text>

                {/* Dynamic Sightline Cone from Screen to Active Seat Tier */}
                {activeTier.svgRowHighlight === 'ABC' && (
                  <polygon points="70,45 70,198 310,195 200,175" fill="url(#beamGrad)" />
                )}
                {activeTier.svgRowHighlight === 'DE' && (
                  <polygon points="70,45 70,198 490,162 365,142" fill="url(#beamGrad)" />
                )}
                {activeTier.svgRowHighlight === 'F' && (
                  <polygon points="70,45 70,198 615,130 535,115" fill="url(#beamGrad)" />
                )}

                {/* Stepped Auditorium Floor Riser */}
                <path
                  d="M 140 210 L 325 195 L 325 180 L 505 160 L 505 142 L 635 128 L 635 220 L 140 220 Z"
                  fill="rgba(255,255,255,0.04)"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth="1.5"
                />

                {/* Tier 1: Rows A, B, C (Standard) */}
                <g opacity={activeTier.svgRowHighlight === 'ABC' ? 1 : 0.45}>
                  <rect x="175" y="182" width="36" height="22" rx="5" fill="#0284C7" />
                  <rect x="225" y="177" width="36" height="22" rx="5" fill="#0284C7" />
                  <rect x="275" y="172" width="36" height="22" rx="5" fill="#0284C7" />
                  <text x="182" y="170" fill="#BAE6FD" fontSize="11" fontWeight="700">
                    Hàng A • B • C (Standard)
                  </text>
                </g>

                {/* Tier 2: Rows D, E (VIP Sweet Spot) */}
                <g opacity={activeTier.svgRowHighlight === 'DE' ? 1 : 0.45}>
                  <rect x="365" y="150" width="44" height="24" rx="6" fill="#D97706" />
                  <rect x="430" y="142" width="44" height="24" rx="6" fill="#D97706" />
                  <text x="365" y="132" fill="#FDE68A" fontSize="11" fontWeight="700">
                    Hàng D • E (VIP Trung Tâm)
                  </text>
                </g>

                {/* Tier 3: Row F (Couple Sweetbox) */}
                <g opacity={activeTier.svgRowHighlight === 'F' ? 1 : 0.45}>
                  <rect x="535" y="108" width="68" height="26" rx="7" fill="#E11D48" />
                  <text x="515" y="96" fill="#FECDD3" fontSize="11" fontWeight="700">
                    Hàng F (Ghế Đôi Sweetbox)
                  </text>
                </g>
              </svg>

              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-zinc-200 font-medium">
                  <Eye className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  {activeTier.sightlineNote}
                </span>
                <span className="text-[var(--color-text-muted)] tabular-nums">
                  Giá tham chiếu: <strong className="text-white">{activeTier.exampleTotalLabel}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Active Seat Tier Detail Card (Ticket-Stub Style) */}
          <div className="lg:col-span-5 rounded-3xl bg-[var(--color-bg-secondary)] border border-white/15 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  {activeTier.badge}
                </span>
                <Armchair className="w-5 h-5 text-[var(--color-accent-cta)]" aria-hidden="true" />
              </div>

              <div>
                <h3 className="vn-display-safe text-2xl sm:text-3xl font-extrabold text-white uppercase">
                  {activeTier.name}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{activeTier.rowsLabel}</p>
              </div>

              <div className="ticket-stub bg-zinc-950 border border-white/10 p-4 flex items-center justify-between tabular-nums">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] block">
                    Mức phụ thu hạng ghế
                  </span>
                  <span className="text-xl font-extrabold text-amber-300">
                    {activeTier.surchargeLabel}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] block">
                    Quy tắc giữ chỗ
                  </span>
                  <span className="text-xs font-bold text-emerald-300">Khóa Redis 10 phút</span>
                </div>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {activeTier.description}
              </p>

              <ul className="space-y-2.5 pt-1">
                {activeTier.highlights.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200">
                    <CheckCircle2
                      className="w-4 h-4 text-[var(--color-accent-cta)] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Hiển thị trực quan trên sơ đồ khi chọn suất</span>
              </div>
              <a
                href="#booking-dock"
                className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] text-xs font-bold text-white transition-colors shadow-lg shadow-rose-600/20"
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
                Chọn suất &amp; giữ ghế ngay
              </a>
            </div>
          </div>
        </div>

        {/* Bottom 3-Card Bento: Real Supported Projection Formats (IMAX, 3D, 2D) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROOM_FORMATS.map((fmt) => (
            <div
              key={fmt.code}
              className="rounded-2xl bg-[var(--color-bg-secondary)] border border-white/10 p-6 flex flex-col justify-between hover:border-white/25 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-extrabold">
                    {fmt.code}
                  </span>
                  {fmt.code === 'IMAX' ? (
                    <Volume2 className="w-4 h-4 text-[var(--color-accent-cta)]" aria-hidden="true" />
                  ) : (
                    <Layers className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-white">{fmt.title}</h3>
                <p className="text-xs font-semibold text-amber-300/90">{fmt.subtitle}</p>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {fmt.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CinemaExperienceSection;
