import { useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Gift,
  Popcorn,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PromoSectionProps {
  onOpenMyTickets?: () => void;
}

const VERIFIED_VOUCHERS = [
  {
    code: 'CINEX20',
    title: 'Giảm 20% cho đơn từ 100.000 ₫',
    maxDiscount: 'Giảm tối đa 40.000 ₫',
    minOrder: 'Đơn tối thiểu 100.000 ₫',
    quota: 'Tối đa 5 lượt / tài khoản',
    description:
      'Áp dụng trực tiếp trên tổng giá trị ghế ngồi và combo bắp nước khi nhập mã tại bước Thanh toán.',
  },
  {
    code: 'GIAM30K',
    title: 'Giảm ngay 30.000 ₫ cho đơn từ 120.000 ₫',
    maxDiscount: 'Trừ trực tiếp 30.000 ₫',
    minOrder: 'Đơn tối thiểu 120.000 ₫',
    quota: 'Tối đa 3 lượt / tài khoản',
    description:
      'Ưu đãi cố định dành cho đơn đặt từ 1 vé kèm combo hoặc từ 2 vé trở lên tại mọi khung giờ chiếu.',
  },
];

const VERIFIED_COMBOS = [
  {
    id: 'combo-single-popcorn-drink',
    badge: 'SOLO TIẾT KIỆM',
    name: 'Combo Solo Đơn (1 Bắp Ngọt + 1 Coca/Pepsi)',
    description: '1 Bắp rang bơ thơm lừng 60oz + 1 Nước ngọt có gas 32oz',
    priceFormatted: '69.000 ₫',
    accent: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
  },
  {
    id: 'combo-sweet-romance-couple',
    badge: 'BÁN CHẠY NHẤT • CẶP ĐÔI',
    name: 'Combo Đôi CineX Sweet Romance',
    description: '1 Bắp vị Phô Mai hảo hạng + 2 Nước ngọt 32oz + 1 Bánh snack socola',
    priceFormatted: '109.000 ₫',
    accent: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
  },
  {
    id: 'combo-party-family-pack',
    badge: 'NHÓM BẠN & GIA ĐÌNH',
    name: 'CineX Party Pack (Gia đình & Bạn bè)',
    description: '2 Bắp lớn 85oz (Phô Mai + Caramel) + 4 Nước ngọt + 2 Khoai tây sấy giòn',
    priceFormatted: '189.000 ₫',
    accent: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  },
];

export function PromoSection({ onOpenMyTickets }: PromoSectionProps) {
  const { user, openAuthModal } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
    } catch {
      // Fallback still shows visual confirmation so user sees the code clearly
    }
    setCopiedCode(code);
    window.setTimeout(() => {
      setCopiedCode((current) => (current === code ? null : current));
    }, 2500);
  };

  return (
    <div className="bg-[var(--color-bg-primary)] border-t border-white/10">
      {/* SUBSECTION 1: VERIFIED VOUCHERS & LOYALTY RULES (#promotions) */}
      <section
        id="promotions"
        aria-labelledby="promotions-heading"
        className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-[var(--color-accent-cta)] text-xs font-bold uppercase tracking-widest mb-3">
              <Gift className="w-3.5 h-3.5" aria-hidden="true" />
              Mã Giảm Giá &amp; Chính Sách Thành Viên Minh Bạch
            </div>
            <h2
              id="promotions-heading"
              className="vn-display-safe font-extrabold text-3xl sm:text-5xl text-white uppercase tracking-wide"
            >
              Ưu Đãi Đang Hoạt Động Trên Hệ Thống
            </h2>
          </div>

          <a
            href="#booking-dock"
            className="inline-flex min-h-11 items-center gap-2 text-xs sm:text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors self-start md:self-auto"
          >
            <Ticket className="w-4 h-4" aria-hidden="true" />
            Chọn suất chiếu để áp mã khi thanh toán →
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Cols: 2 Verified Voucher Ticket Stubs */}
          <div className="lg:col-span-7 grid grid-cols-1 gap-5">
            {VERIFIED_VOUCHERS.map((voucher) => {
              const isCopied = copiedCode === voucher.code;
              return (
                <article
                  key={voucher.code}
                  className="ticket-stub rounded-3xl bg-[var(--color-bg-secondary)] border border-white/12 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-white/25 transition-colors"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                        <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                        {voucher.code}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-zinc-200 border border-white/10">
                        {voucher.maxDiscount}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-[var(--color-text-secondary)] border border-white/10">
                        {voucher.minOrder}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white">{voucher.title}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {voucher.description}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                      Điều kiện: {voucher.quota} • Nhập tại ô Voucher trong bước Thanh toán.
                    </p>
                  </div>

                  <div className="sm:border-l sm:border-dashed sm:border-white/15 sm:pl-6 flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCopyCode(voucher.code)}
                      aria-label={`Sao chép mã giảm giá ${voucher.code}`}
                      className={`inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer tabular-nums ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/15'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                          <span>Đã chép {voucher.code}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-amber-400" aria-hidden="true" />
                          <span>Sao chép {voucher.code}</span>
                        </>
                      )}
                    </button>

                    <a
                      href="#booking-dock"
                      className="text-xs font-bold text-[var(--color-accent-cta)] hover:text-rose-400 transition-colors py-1"
                    >
                      Đặt vé ngay →
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right 5 Cols: Real Loyalty Points & 2-Hour Refund Guarantee */}
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-zinc-900 via-[var(--color-bg-secondary)] to-rose-950/35 border border-white/15 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                Quyền Lợi Tài Khoản CineX
              </div>

              <h3 className="vn-display-safe text-2xl sm:text-3xl font-extrabold text-white uppercase">
                Tích Điểm Tự Động &amp; Hoàn Hủy Vé Chủ Động
              </h3>

              <div className="space-y-4 pt-1">
                <div className="rounded-2xl bg-zinc-950/80 border border-white/10 p-4 flex items-start gap-3.5">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white tabular-nums">
                      Tỷ lệ tích điểm: 10.000 ₫ = 1 Điểm Thưởng
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Điểm thưởng được cộng tự động vào hồ sơ ngay khi đơn vé thanh toán thành công.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-zinc-950/80 border border-white/10 p-4 flex items-start gap-3.5">
                  <RotateCcw className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white tabular-nums">
                      Hoàn hủy vé trực tuyến trước giờ chiếu ≥ 2 giờ
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      Khách hàng đã đăng nhập có thể tự hủy vé hợp lệ trong mục{' '}
                      <strong className="text-white">Vé của tôi</strong> để giải phóng ghế ngay lập tức.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => onOpenMyTickets?.()}
                  className="w-full inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-rose-600/25"
                >
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                  Mở Vé Của Tôi &amp; Tra Cứu Điểm Thưởng
                </button>
              ) : (
                <div className="w-full flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-rose-600/25"
                  >
                    Đăng ký thành viên miễn phí
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="inline-flex min-h-11 items-center justify-center px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-xs sm:text-sm font-semibold text-zinc-200 transition-colors cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SUBSECTION 2: VERIFIED CONCESSIONS & COMBOS (#combos) */}
      <section
        id="combos"
        aria-labelledby="combos-heading"
        className="py-16 border-t border-white/10 bg-[#0C0C10]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
                <Popcorn className="w-3.5 h-3.5" aria-hidden="true" />
                Quầy Bắp Nước Trực Tuyến (Chọn Tại Bước Thanh Toán)
              </div>
              <h2
                id="combos-heading"
                className="vn-display-safe font-extrabold text-3xl sm:text-4xl text-white uppercase tracking-wide"
              >
                Thực Đơn Combo Bắp Nước Chính Thức
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-md">
              Toàn bộ 3 gói Combo dưới đây được tích hợp sẵn trong hộp thoại{' '}
              <strong className="text-white">Thanh toán &amp; Bắp nước</strong> ngay sau khi bạn chọn ghế.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VERIFIED_COMBOS.map((combo) => (
              <article
                key={combo.id}
                className="rounded-2xl bg-[var(--color-bg-secondary)] border border-white/10 p-6 flex flex-col justify-between hover:border-white/25 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-extrabold uppercase tracking-wider ${combo.accent}`}
                    >
                      {combo.badge}
                    </span>
                    <Popcorn className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug">{combo.name}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {combo.description}
                  </p>
                </div>

                <div className="pt-5 mt-6 border-t border-white/10 flex items-center justify-between gap-3 tabular-nums">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] block">
                      Giá niêm yết
                    </span>
                    <span className="text-xl font-extrabold text-amber-300">
                      {combo.priceFormatted}
                    </span>
                  </div>

                  <a
                    href="#booking-dock"
                    className="inline-flex min-h-10 items-center gap-1.5 px-4 py-2 rounded-xl bg-white/8 hover:bg-[var(--color-accent-cta)] text-xs font-bold text-white border border-white/10 hover:border-transparent transition-colors"
                  >
                    <span>Chọn suất kèm Combo</span>
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-zinc-900/60 border border-white/10 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                Giá bắp nước được cộng tự động và áp dụng chung mã giảm giá{' '}
                <strong className="text-white">CINEX20</strong> hoặc{' '}
                <strong className="text-white">GIAM30K</strong> khi đủ điều kiện đơn tối thiểu.
              </span>
            </span>
            <a
              href="#movies"
              className="font-bold text-amber-300 hover:text-amber-200 shrink-0"
            >
              Xem danh sách phim →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PromoSection;
