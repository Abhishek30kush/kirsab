import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider, useCart } from './context/CartContext';
import { CustomerProvider, useCustomer } from './context/CustomerContext';
import { DeveloperSetupBanner } from './components/DeveloperSetupBanner';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ServiceAreaNotice } from './components/ServiceAreaNotice';
import { ProductSection } from './components/ProductSection';
import { LiveOrderCounter } from './components/LiveOrderCounter';
import { HowItWorks } from './components/HowItWorks';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { MobileCartBar } from './components/MobileCartBar';
import { Toast } from './components/Toast';
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';
import { CustomerPortalModal } from './components/customer/CustomerPortalModal';
import { DeliveryPortal } from './components/delivery/DeliveryPortal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { api, getAdminToken } from './utils/api';

function MainStoreContent({ onOpenAdmin, isAdminLoggedIn, onOpenDelivery }) {
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

      {/* Global Header with Admin & Delivery Partner Launch Actions */}
      <Header
        onOpenAdmin={onOpenAdmin}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenDelivery={onOpenDelivery}
      />

      {/* Main Customer Sections */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero onOrderClick={scrollToCatalogue} />

        {/* Public Live Order Counter Widget */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-6 relative z-10">
          <LiveOrderCounter />
        </div>

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
      <Footer onOpenAdmin={onOpenAdmin} onOpenDelivery={onOpenDelivery} />

      {/* Overlay Modals & Drawers */}
      <CartDrawer />
      <CheckoutModal />
      <MobileCartBar />
      <Toast />

      {/* Customer Account & Order History Modals (Module 1 & 2) */}
      <CustomerAuthModal />
      <CustomerPortalModal />
    </div>
  );
}

function MainAppShell({
  isDeliveryView,
  setIsDeliveryView,
  isAdminView,
  setIsAdminView,
  adminUser,
  handleAdminTrigger,
}) {
  const { refreshCatalog } = useCart();

  if (isDeliveryView) {
    return (
      <DeliveryPortal
        onExit={() => {
          setIsDeliveryView(false);
          if (window.location.pathname.startsWith('/delivery') || window.location.hash === '#delivery') {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  if (isAdminView && adminUser) {
    return (
      <AdminDashboard
        adminUser={adminUser}
        onExitAdmin={() => {
          setIsAdminView(false);
          if (window.location.pathname.startsWith('/admin')) {
            window.history.pushState({}, '', '/');
          }
          refreshCatalog();
        }}
        onCatalogChanged={refreshCatalog}
      />
    );
  }

  return (
    <MainStoreContent
      onOpenAdmin={handleAdminTrigger}
      isAdminLoggedIn={Boolean(adminUser)}
      onOpenDelivery={() => setIsDeliveryView(true)}
    />
  );
}

export function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isDeliveryView, setIsDeliveryView] = useState(false);

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

  // Handle URL path (/admin, /delivery), hash (#admin, #delivery), or query params
  useEffect(() => {
    const handleUrlCheck = () => {
      const path = window.location.pathname.replace(/\/+$/, '');
      const hash = window.location.hash;
      const search = window.location.search;

      // Delivery Partner route
      if (path === '/delivery' || hash === '#delivery' || new URLSearchParams(search).get('delivery') === 'true') {
        setIsDeliveryView(true);
        setIsAdminView(false);
        return;
      }

      // Admin route
      const isHashAdmin = hash === '#admin';
      const isQueryAdmin = new URLSearchParams(search).get('admin') === 'true';
      const isPathAdmin = path.startsWith('/admin');

      if (isHashAdmin || isQueryAdmin || isPathAdmin) {
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
    window.addEventListener('popstate', handleUrlCheck);
    return () => {
      window.removeEventListener('hashchange', handleUrlCheck);
      window.removeEventListener('popstate', handleUrlCheck);
    };
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
      <CustomerProvider>
        <CartProvider>
          {/* View Selection: Delivery Partner Portal, Admin Dashboard, or Customer Store */}
          <MainAppShell
            isDeliveryView={isDeliveryView}
            setIsDeliveryView={setIsDeliveryView}
            isAdminView={isAdminView}
            setIsAdminView={setIsAdminView}
            adminUser={adminUser}
            handleAdminTrigger={handleAdminTrigger}
          />

          {/* Admin Login Modal */}
          <AdminLoginModal
            isOpen={isAdminLoginOpen}
            onClose={() => setIsAdminLoginOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </CartProvider>
      </CustomerProvider>
    </LanguageProvider>
  );
}

export default App;
