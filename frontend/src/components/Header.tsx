import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BarChart2,
  Clapperboard,
  Compass,
  Film,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  Search,
  Sparkles,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';

export interface HeaderProps {
  onOpenMyTickets?: () => void;
  onOpenStaffCheckin?: () => void;
  onOpenReport?: () => void;
  onOpenProfile?: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMyTickets,
  onOpenStaffCheckin,
  onOpenReport,
  onOpenProfile,
  onOpenAdmin,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, openAuthModal, logout } = useAuth();

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useModalA11y({
    isOpen: mobileMenuOpen,
    onClose: closeMobileMenu,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 32);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#09090B]/92 backdrop-blur-md border-b border-white/10 py-3 shadow-2xl'
          : 'bg-gradient-to-b from-[#09090B]/95 via-[#09090B]/65 to-transparent py-4'
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-accent-cta)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:shadow-xl"
      >
        Bỏ qua điều hướng để tới nội dung chính
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <a
          href="/"
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB23E]"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-cta)] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/25 transition-transform group-hover:scale-105">
            <Film className="w-5 h-5 stroke-[2.3]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-['Barlow_Condensed'] text-2xl font-black tracking-wider text-[#FAFAFA] leading-none">
              CINEX<span className="text-[var(--color-accent-cta)]">.</span>
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-text-secondary)] font-semibold leading-tight">
              Premiere × Editorial
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav
          aria-label="Điều hướng chính trang chủ"
          className="hidden md:flex items-center gap-6 lg:gap-7"
        >
          <a
            href="#movies"
            className="text-sm font-semibold text-[#FAFAFA] hover:text-[#FFB23E] transition-colors py-2 flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4 text-[var(--color-accent-cta)]" aria-hidden="true" />
            Phim
          </a>
          <a
            href="#booking-dock"
            className="text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors py-2"
          >
            Lịch chiếu
          </a>
          <a
            href="#experience"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[#FAFAFA] transition-colors py-2"
          >
            Phòng chiếu
          </a>
          <a
            href="#promotions"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[#FAFAFA] transition-colors py-2"
          >
            Ưu đãi
          </a>
          <a
            href="#combos"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[#FAFAFA] transition-colors py-2"
          >
            Bắp nước
          </a>
        </nav>

        {/* Right Action Cluster (Rendered in DOM for all viewports to preserve role-navigation tests & accessibility) */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Location / Cinema Picker Anchor */}
          <a
            href="#movies"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#FAFAFA] bg-[#121216]/90 hover:bg-[#18181F] border border-white/10 hover:border-white/25 transition-all min-h-[44px]"
            aria-label="Chọn rạp"
          >
            <MapPin className="w-4 h-4 text-[var(--color-accent-cta)]" aria-hidden="true" />
            <span>Chọn rạp</span>
          </a>

          {/* Search Trigger */}
          <a
            href="#discovery-search"
            className="p-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-[#FAFAFA] hover:bg-[#121216] border border-transparent hover:border-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Tìm kiếm phim"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </a>

          {/* User Account / Login State */}
          {user ? (
            <div className="flex items-center gap-2.5">
              {/* My Tickets Button (F06) */}
              <button
                type="button"
                onClick={() => onOpenMyTickets?.()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFB23E] bg-[#FFB23E]/12 hover:bg-[#FFB23E]/20 border border-[#FFB23E]/35 transition-all min-h-[44px] cursor-pointer"
                title="Xem danh sách vé đã đặt"
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
                <span>Vé của tôi</span>
              </button>

              {/* Staff Check-in Trigger (F08) */}
              {(user.role === 'STAFF' || user.role === 'MANAGER') && (
                <button
                  type="button"
                  onClick={() => onOpenStaffCheckin?.()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-500/35 transition-all min-h-[44px] cursor-pointer"
                  title="Cổng soát vé điện tử"
                >
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                  <span>Soát vé</span>
                </button>
              )}

              {/* Admin Report Trigger (F14) */}
              {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => onOpenReport?.()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-300 bg-sky-500/12 hover:bg-sky-500/20 border border-sky-500/35 transition-all min-h-[44px] cursor-pointer"
                  title="Báo cáo & Thống kê doanh thu"
                >
                  <BarChart2 className="w-4 h-4" aria-hidden="true" />
                  <span>Báo cáo</span>
                </button>
              )}

              {/* Admin Management Trigger (F09 · F10 · F11 · F13) */}
              {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => onOpenAdmin?.()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/35 transition-all min-h-[44px] cursor-pointer"
                  title="Quản lý phim, phòng chiếu, suất chiếu & ưu đãi"
                >
                  <Clapperboard className="w-4 h-4" aria-hidden="true" />
                  <span>Quản trị</span>
                </button>
              )}

              {/* User Profile Trigger */}
              <button
                type="button"
                onClick={() => onOpenProfile?.()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121216] hover:bg-[#18181F] border border-white/10 text-xs transition-colors cursor-pointer text-left min-h-[44px]"
                title="Hồ sơ tài khoản & Đổi mật khẩu"
              >
                <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-xs">
                  {user.fullName?.[0] ?? 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-[#FAFAFA] max-w-[110px] truncate">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-[#FFB23E] flex items-center gap-0.5 tabular-nums">
                    <Award className="w-3 h-3" aria-hidden="true" />
                    {user.points} điểm
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={logout}
                title="Đăng xuất"
                className="p-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-rose-400 hover:bg-[#121216] border border-white/10 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--color-accent-cta)] hover:bg-[var(--color-accent-cta-hover)] transition-all shadow-lg shadow-rose-600/25 min-h-[44px] cursor-pointer"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            className="p-2.5 rounded-xl text-[#FAFAFA] hover:bg-[#121216] border border-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng di động"
          className="md:hidden bg-[#121216] border-b border-white/15 px-6 py-6 space-y-4 shadow-2xl"
        >
          <nav aria-label="Điều hướng di động" className="flex flex-col space-y-2">
            <a
              href="#movies"
              onClick={closeMobileMenu}
              className="text-base font-semibold text-[#FAFAFA] py-2 flex items-center justify-between"
            >
              <span>Phim &amp; Danh mục</span>
              <Compass className="w-4 h-4 text-[var(--color-accent-cta)]" aria-hidden="true" />
            </a>
            <a
              href="#booking-dock"
              onClick={closeMobileMenu}
              className="text-base font-semibold text-amber-300 py-2 flex items-center justify-between"
            >
              <span>Đặt vé &amp; Chọn rạp</span>
              <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
            </a>
            <a
              href="#experience"
              onClick={closeMobileMenu}
              className="text-base font-medium text-[var(--color-text-secondary)] hover:text-white py-2"
            >
              Kiến trúc phòng chiếu &amp; Hạng ghế
            </a>
            <a
              href="#promotions"
              onClick={closeMobileMenu}
              className="text-base font-medium text-[var(--color-text-secondary)] hover:text-white py-2"
            >
              Ưu đãi &amp; Voucher
            </a>
            <a
              href="#combos"
              onClick={closeMobileMenu}
              className="text-base font-medium text-[var(--color-text-secondary)] hover:text-white py-2"
            >
              Combo Bắp nước
            </a>
          </nav>

          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      onOpenProfile?.();
                    }}
                    className="flex items-center gap-2 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-xs">
                      {user.fullName?.[0] ?? 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#FAFAFA]">{user.fullName}</div>
                      <div className="text-xs text-[#FFB23E] tabular-nums">
                        {user.points} điểm tích lũy
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      logout();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/40 text-rose-300 text-xs border border-rose-800/60"
                  >
                    Đăng xuất
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      onOpenMyTickets?.();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-[#FFB23E] bg-[#FFB23E]/10 border border-[#FFB23E]/30"
                  >
                    <Ticket className="w-4 h-4" aria-hidden="true" />
                    <span>Vé của tôi</span>
                  </button>
                  {(user.role === 'STAFF' || user.role === 'MANAGER') && (
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
                        onOpenStaffCheckin?.();
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30"
                    >
                      <QrCode className="w-4 h-4" aria-hidden="true" />
                      <span>Soát vé</span>
                    </button>
                  )}
                  {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          closeMobileMenu();
                          onOpenReport?.();
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-sky-300 bg-sky-500/10 border border-sky-500/30"
                      >
                        <BarChart2 className="w-4 h-4" aria-hidden="true" />
                        <span>Báo cáo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeMobileMenu();
                          onOpenAdmin?.();
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30"
                      >
                        <Clapperboard className="w-4 h-4" aria-hidden="true" />
                        <span>Quản trị</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  openAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-[var(--color-accent-cta)]"
              >
                <User className="w-4 h-4" aria-hidden="true" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
