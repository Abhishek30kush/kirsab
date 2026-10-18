import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider, useCart } from './context/CartContext';
import { DeveloperSetupBanner } from './components/DeveloperSetupBanner';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ServiceAreaNotice } from './components/ServiceAreaNotice';
import { ProductSection } from './components/ProductSection';
import { HowItWorks } from './components/HowItWorks';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { MobileCartBar } from './components/MobileCartBar';
import { Toast } from './components/Toast';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { api, getAdminToken } from './utils/api';

function MainStoreContent({ onOpenAdmin, isAdminLoggedIn }) {
  const { refreshCatalog } = useCart();

  const scrollToCatalogue = () => {
    const el = document.getElementById('catalogue');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-light font-sans antialiased text-brand-charcoal">
      {/* Top Developer / Owner Setup Banner (Only if WhatsApp number unconfigured) */}
      <DeveloperSetupBanner />

      {/* Global Header with Admin Launch Action */}
      <Header onOpenAdmin={onOpenAdmin} isAdminLoggedIn={isAdminLoggedIn} />

      {/* Main Customer Sections */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero onOrderClick={scrollToCatalogue} />

        {/* Service Area & Slot Timings Notice */}
        <ServiceAreaNotice />

        {/* Product Catalogue & Filter */}
        <ProductSection />

        {/* 3-Step Ordering Walkthrough */}
        <HowItWorks />

        {/* Frequently Asked Questions */}
        <FaqSection />
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Overlay Modals & Drawers */}
      <CartDrawer />
      <CheckoutModal />
      <MobileCartBar />
      <Toast />
    </div>
  );
}

export function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Check if admin is already logged in with stored JWT
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAdminToken();
      if (!token) return;
      try {
        const res = await api.getMe();
        if (res.success && res.user) {
          setAdminUser(res.user);
        } else {
          setAdminUser(null);
        }
      } catch (err) {
        setAdminUser(null);
      }
    };
    checkAuth();
  }, []);

  // Handle URL hash or query param: #admin or ?admin=true
  useEffect(() => {
    const handleUrlCheck = () => {
      const isHashAdmin = window.location.hash === '#admin';
      const isQueryAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
      if (isHashAdmin || isQueryAdmin) {
        const token = getAdminToken();
        if (token && adminUser) {
          setIsAdminView(true);
        } else {
          setIsAdminLoginOpen(true);
        }
      }
    };
    handleUrlCheck();
    window.addEventListener('hashchange', handleUrlCheck);
    return () => window.removeEventListener('hashchange', handleUrlCheck);
  }, [adminUser]);

  const handleAdminTrigger = () => {
    if (adminUser) {
      setIsAdminView(true);
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = (user) => {
    setAdminUser(user);
    setIsAdminView(true);
  };

  return (
    <LanguageProvider>
      <CartProvider>
        {isAdminView && adminUser ? (
          <AdminDashboard
            adminUser={adminUser}
            onExitAdmin={() => setIsAdminView(false)}
          />
        ) : (
          <MainStoreContent
            onOpenAdmin={handleAdminTrigger}
            isAdminLoggedIn={Boolean(adminUser)}
          />
        )}

        {/* Admin Login Modal */}
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </CartProvider>
    </LanguageProvider>
  );
}

export default App;
