import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Discovery } from './components/Discovery';
import { PaymentResultPage } from './components/PaymentResultPage';
import type { ApiOrder, ShowtimeSeatData } from './services/api';
import { CinemaExperienceSection } from './components/CinemaExperienceSection';
import { PromoSection } from './components/PromoSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { SeatMapModal, type SeatItem } from './components/SeatMapModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TicketModal } from './components/TicketModal';
import { MyTicketsDrawer } from './components/MyTicketsDrawer';
import { StaffCheckinModal } from './components/StaffCheckinModal';
import { AdminReportDashboard } from './components/AdminReportDashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminManagementModal } from './components/AdminManagementModal';
import { useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { openAuthModal, user } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);
  const [activeSeatMapShowtimeId, setActiveSeatMapShowtimeId] = useState<string | null>(null);
  const [myTicketsOpen, setMyTicketsOpen] = useState(false);
  const [staffCheckinOpen, setStaffCheckinOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminManagementOpen, setAdminManagementOpen] = useState(false);

  // Checkout and Ticket state
  const [checkoutData, setCheckoutData] = useState<{
    isOpen: boolean;
    showtimeData: ShowtimeSeatData | null;
    selectedSeats: SeatItem[];
    heldOrder: ApiOrder | null;
  }>({
    isOpen: false,
    showtimeData: null,
    selectedSeats: [],
    heldOrder: null,
  });

  const [ticketData, setTicketData] = useState<{
    isOpen: boolean;
    order: ApiOrder | null;
  }>({
    isOpen: false,
    order: null,
  });

  useEffect(() => {
    const navigate = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', navigate);
    return () => window.removeEventListener('popstate', navigate);
  }, []);

  const handleProceedToCheckout = (selectedSeats: SeatItem[], showtimeData: ShowtimeSeatData, heldOrder: ApiOrder) => {
    setActiveSeatMapShowtimeId(null);
    setCheckoutData({
      isOpen: true,
      showtimeData,
      selectedSeats,
      heldOrder,
    });
  };

  const handleOrderSuccess = (order: ApiOrder) => {
    setCheckoutData((prev) => ({ ...prev, isOpen: false }));
    setTicketData({
      isOpen: true,
      order,
    });
  };
  const goHome = () => {
    window.history.pushState(null, '', '/');
    setPathname('/');
  };
  if (pathname === '/payment/result' || pathname === '/payment/result/') {
    return <div className="min-h-screen bg-[#0B0A0C] text-[#F3EEE6] font-['Be_Vietnam_Pro']"><PaymentResultPage onHome={goHome} /><AuthModal /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0B0A0C] text-[#F3EEE6] flex flex-col font-['Be_Vietnam_Pro'] selection:bg-[#FFB23E] selection:text-[#0B0A0C]">
      {/* Header */}
      <Header
        onOpenMyTickets={() => setMyTicketsOpen(true)}
        onOpenStaffCheckin={() => setStaffCheckinOpen(true)}
        onOpenReport={() => setReportOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAdmin={() => setAdminManagementOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Discovery onSelectShowtime={setActiveSeatMapShowtimeId} />
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
      {checkoutData.isOpen && checkoutData.showtimeData && checkoutData.heldOrder && user?.id === checkoutData.heldOrder.userId && (
        <CheckoutModal
          isOpen={checkoutData.isOpen}
          onClose={() => setCheckoutData((prev) => ({ ...prev, isOpen: false }))}
          showtimeData={checkoutData.showtimeData}
          selectedSeats={checkoutData.selectedSeats}
          heldOrder={checkoutData.heldOrder}
          onOrderSuccess={handleOrderSuccess}
          onOpenAuth={() => openAuthModal()}
        />
      )}

      {/* Electronic Ticket Pass with QR (F05) */}
      <TicketModal
        isOpen={ticketData.isOpen && !!user && ticketData.order?.userId === user.id}
        onClose={() => setTicketData({ isOpen: false, order: null })}
        order={ticketData.order}
      />

      {/* User Booking History Drawer (F06) */}
      <MyTicketsDrawer
        isOpen={myTicketsOpen}
        onClose={() => setMyTicketsOpen(false)}
        onSelectOrder={(order) => setTicketData({ isOpen: true, order })}
      />

      {/* Staff Check-in Station (F08) */}
      <StaffCheckinModal
        isOpen={staffCheckinOpen}
        onClose={() => setStaffCheckinOpen(false)}
      />

      {/* Admin Report Dashboard (F14) */}
      <AdminReportDashboard
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />

      {/* User Profile & Security Modal */}
      <UserProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Admin Operations Management Modal (F09 · F10 · F11 · F13) */}
      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
        <AdminManagementModal
          isOpen={adminManagementOpen}
          onClose={() => setAdminManagementOpen(false)}
        />
      )}
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
