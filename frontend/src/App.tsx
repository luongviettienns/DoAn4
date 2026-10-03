import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { NowShowingSection } from './components/NowShowingSection';
import { CinemaExperienceSection } from './components/CinemaExperienceSection';
import { PromoSection } from './components/PromoSection';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0B0A0C] text-[#F3EEE6] flex flex-col font-['Be_Vietnam_Pro'] selection:bg-[#FFB23E] selection:text-[#0B0A0C]">
      {/* 1. Header (Transparent, Overlaid, Backdrop Blur on Scroll) */}
      <Header />

      {/* 2. Main Hero Section (Full-bleed Still, Movie Typography, Poster Rail, Synchronized Booking Dock) */}
      <main className="flex-1 flex flex-col">
        <Hero />

        {/* 3. Phim Đang Chiếu & Sắp Chiếu */}
        <NowShowingSection />

        {/* 4. Trải Nghiệm Công Nghệ Phòng Chiếu (IMAX Laser, ScreenX, Gold Class) */}
        <CinemaExperienceSection />

        {/* 5. Combo Bắp Nước & Đặc Quyền Thành Viên */}
        <PromoSection />
      </main>

      {/* 6. Footer */}
      <Footer />
    </div>
  );
};

export default App;
