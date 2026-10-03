import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { NowShowingSection } from './components/NowShowingSection';
import { CinemaExperienceSection } from './components/CinemaExperienceSection';
import { PromoSection } from './components/PromoSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0B0A0C] text-[#F3EEE6] flex flex-col font-['Be_Vietnam_Pro'] selection:bg-[#FFB23E] selection:text-[#0B0A0C]">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <Hero />
          <NowShowingSection />
          <CinemaExperienceSection />
          <PromoSection />
        </main>

        {/* Footer */}
        <Footer />

        {/* Global Login / Register Modal */}
        <AuthModal />
      </div>
    </AuthProvider>
  );
};

export default App;
