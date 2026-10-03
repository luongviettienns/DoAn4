import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { NowShowingSection } from './components/NowShowingSection';
import { CinemaExperienceSection } from './components/CinemaExperienceSection';
import { PromoSection } from './components/PromoSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { SeatMapModal, type SeatItem } from './components/SeatMapModal';

export const App: React.FC = () => {
  const [defaultShowtimeId, setDefaultShowtimeId] = useState<string | null>(null);
  const [activeSeatMapShowtimeId, setActiveSeatMapShowtimeId] = useState<string | null>(null);

  // Fetch available showtime for booking
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    fetch(`${API_BASE}/showtimes`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setDefaultShowtimeId(json.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenSeatMap = (showtimeId?: string) => {
    setActiveSeatMapShowtimeId(showtimeId || defaultShowtimeId);
  };

  const handleProceedToCheckout = (selectedSeats: SeatItem[]) => {
    alert(`Đã chọn ${selectedSeats.length} ghế: ${selectedSeats.map(s => s.rowLabel + s.seatNumber).join(', ')}. Chuyển sang bước thanh toán VNPay!`);
    setActiveSeatMapShowtimeId(null);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0B0A0C] text-[#F3EEE6] flex flex-col font-['Be_Vietnam_Pro'] selection:bg-[#FFB23E] selection:text-[#0B0A0C]">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <Hero onOpenSeatMap={handleOpenSeatMap} />
          <NowShowingSection />
          <CinemaExperienceSection />
          <PromoSection />
        </main>

        {/* Footer */}
        <Footer />

        {/* Global Login / Register Modal */}
        <AuthModal />

        {/* Interactive Seat Map Modal */}
        <SeatMapModal
          showtimeId={activeSeatMapShowtimeId}
          onClose={() => setActiveSeatMapShowtimeId(null)}
          onProceedToCheckout={handleProceedToCheckout}
        />
      </div>
    </AuthProvider>
  );
};

export default App;
