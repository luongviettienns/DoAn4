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
import { CheckoutModal } from './components/CheckoutModal';
import { TicketModal } from './components/TicketModal';
import { useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { openAuthModal } = useAuth();
  const [defaultShowtimeId, setDefaultShowtimeId] = useState<string | null>(null);
  const [activeSeatMapShowtimeId, setActiveSeatMapShowtimeId] = useState<string | null>(null);

  // Checkout and Ticket state
  const [checkoutData, setCheckoutData] = useState<{
    isOpen: boolean;
    showtimeData: any;
    selectedSeats: SeatItem[];
  }>({
    isOpen: false,
    showtimeData: null,
    selectedSeats: [],
  });

  const [ticketData, setTicketData] = useState<{
    isOpen: boolean;
    order: any;
  }>({
    isOpen: false,
    order: null,
  });

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

  const handleProceedToCheckout = (selectedSeats: SeatItem[], showtimeData: any) => {
    setActiveSeatMapShowtimeId(null);
    setCheckoutData({
      isOpen: true,
      showtimeData,
      selectedSeats,
    });
  };

  const handleOrderSuccess = (order: any) => {
    setCheckoutData((prev) => ({ ...prev, isOpen: false }));
    setTicketData({
      isOpen: true,
      order,
    });
  };

  return (
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

      {/* Interactive Seat Map Modal (F12) */}
      <SeatMapModal
        showtimeId={activeSeatMapShowtimeId}
        onClose={() => setActiveSeatMapShowtimeId(null)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Checkout & VNPay Payment Modal (F03 · F04) */}
      {checkoutData.isOpen && checkoutData.showtimeData && (
        <CheckoutModal
          isOpen={checkoutData.isOpen}
          onClose={() => setCheckoutData((prev) => ({ ...prev, isOpen: false }))}
          showtimeData={checkoutData.showtimeData}
          selectedSeats={checkoutData.selectedSeats}
          onOrderSuccess={handleOrderSuccess}
          onOpenAuth={() => openAuthModal()}
        />
      )}

      {/* Electronic Ticket Pass with QR (F05) */}
      <TicketModal
        isOpen={ticketData.isOpen}
        onClose={() => setTicketData({ isOpen: false, order: null })}
        order={ticketData.order}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
