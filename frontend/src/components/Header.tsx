import React, { useState, useEffect } from 'react';
import { Film, MapPin, Search, User, Menu, X, LogOut, Award, Ticket, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenMyTickets?: () => void;
  onOpenStaffCheckin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMyTickets, onOpenStaffCheckin }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-40 transition-all duration-500 ${
        isScrolled
          ? 'bg-[#0B0A0C]/90 backdrop-blur-md border-b border-[#2A2631] py-3.5 shadow-2xl'
          : 'bg-gradient-to-b from-[#0B0A0C]/95 via-[#0B0A0C]/50 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="/" className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB23E]">
          <div className="w-10 h-10 rounded-lg bg-[#FFB23E] flex items-center justify-center text-[#0B0A0C] shadow-lg shadow-[#FFB23E]/20 transition-transform group-hover:scale-105">
            <Film className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-['Barlow_Condensed'] text-2xl font-black tracking-wider text-[#F3EEE6] leading-none">
              CINEX<span className="text-[#FFB23E]">.</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#A39E96] font-medium leading-tight">
              Cinematic Experience
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#movies"
            className="text-sm font-medium text-[#F3EEE6] hover:text-[#FFB23E] transition-colors py-2"
          >
            Phim
          </a>
          <a
            href="#cinemas"
            className="text-sm font-medium text-[#A39E96] hover:text-[#FFB23E] transition-colors py-2"
          >
            Rạp
          </a>
          <a
            href="#promotions"
            className="text-sm font-medium text-[#A39E96] hover:text-[#FFB23E] transition-colors py-2"
          >
            Ưu đãi
          </a>
          <a
            href="#combos"
            className="text-sm font-medium text-[#A39E96] hover:text-[#FFB23E] transition-colors py-2"
          >
            Bắp nước
          </a>
          <a
            href="#experience"
            className="text-sm font-medium text-[#A39E96] hover:text-[#FFB23E] transition-colors py-2"
          >
            Phòng chiếu
          </a>
        </nav>

        {/* Right Action Cluster */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Location Picker */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#F3EEE6] bg-[#151318]/80 hover:bg-[#221F28] border border-[#2A2631] transition-all min-h-[44px]"
            aria-label="Chọn cụm rạp tại thành phố"
          >
            <MapPin className="w-4 h-4 text-[#FFB23E]" />
            <span>Hà Nội</span>
            <span className="text-[10px] text-[#A39E96]">▾</span>
          </button>

          {/* Search Trigger */}
          <button
            type="button"
            className="p-2.5 rounded-lg text-[#A39E96] hover:text-[#F3EEE6] hover:bg-[#151318] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Tìm kiếm phim, rạp hoặc diễn viên"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* User Account / Login State */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* My Tickets Button (F06) */}
              <button
                type="button"
                onClick={() => onOpenMyTickets?.()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-[#FFB23E] bg-[#FFB23E]/10 hover:bg-[#FFB23E]/20 border border-[#FFB23E]/30 transition-all min-h-[44px]"
                title="Xem danh sách vé đã đặt"
              >
                <Ticket className="w-4 h-4" />
                <span>Vé của tôi</span>
              </button>

              {/* Staff Check-in Trigger (F08) */}
              {(user.role === 'STAFF' || user.role === 'MANAGER' || user.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => onOpenStaffCheckin?.()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all min-h-[44px]"
                  title="Cổng soát vé điện tử"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Soát vé</span>
                </button>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151318] border border-[#2A2631] text-xs">
                <div className="w-7 h-7 rounded-full bg-[#FFB23E]/20 text-[#FFB23E] font-bold flex items-center justify-center text-xs">
                  {user.fullName[0]}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-[#F3EEE6] max-w-[100px] truncate">{user.fullName}</span>
                  <span className="text-[10px] text-[#FFB23E] flex items-center gap-0.5">
                    <Award className="w-3 h-3" />
                    {user.points} điểm
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Đăng xuất"
                className="p-2.5 rounded-lg text-[#A39E96] hover:text-red-400 hover:bg-[#151318] border border-[#2A2631] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-[#0B0A0C] bg-[#FFB23E] hover:bg-[#FFA21A] transition-all shadow-md shadow-[#FFB23E]/20 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F3EEE6]"
            >
              <User className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg text-[#F3EEE6] hover:bg-[#151318] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B0A0C]/98 border-b border-[#2A2631] px-6 py-6 space-y-4">
          <nav className="flex flex-col space-y-3">
            <a
              href="#movies"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#F3EEE6] py-2"
            >
              Phim
            </a>
            <a
              href="#cinemas"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#A39E96] py-2"
            >
              Rạp
            </a>
            <a
              href="#promotions"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#A39E96] py-2"
            >
              Ưu đãi
            </a>
            <a
              href="#combos"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#A39E96] py-2"
            >
              Bắp nước
            </a>
          </nav>
          <div className="pt-4 border-t border-[#2A2631] flex flex-col gap-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#F3EEE6]">{user.fullName}</div>
                  <div className="text-xs text-[#FFB23E]">{user.points} điểm tích lũy</div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 rounded bg-red-950/40 text-red-300 text-xs border border-red-800/60"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); openAuthModal(); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-[#0B0A0C] bg-[#FFB23E]"
              >
                <User className="w-4 h-4" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
