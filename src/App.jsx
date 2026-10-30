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
import { 
  api, 
  getAdminToken, 
  getAdminUser, 
  setAdminUser as setAdminUserStorage, 
  getAdminActiveState, 
  setAdminActiveState, 
  clearAdminSession 
} from './utils/api';

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
  const currentAdmin = adminUser || getAdminUser();

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

  if (isAdminView && currentAdmin) {
    return (
      <AdminDashboard
        adminUser={currentAdmin}
        onExitAdmin={() => {
          setIsAdminView(false);
          setAdminActiveState(false);
          if (window.location.pathname.startsWith('/admin')) {
            window.history.pushState({}, '', '/');
          } else if (window.location.hash === '#admin') {
            window.location.hash = '';
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
      isAdminLoggedIn={Boolean(currentAdmin && getAdminToken())}
      onOpenDelivery={() => setIsDeliveryView(true)}
    />
  );
}

export function App() {
  // Synchronously initialize state from persistent localStorage so page refresh never drops admin view
  const [adminUser, setAdminUser] = useState(() => getAdminUser());
  const [isAdminView, setIsAdminView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = getAdminToken();
    if (!token) return false;
    const path = window.location.pathname.replace(/\/+$/, '');
    const hash = window.location.hash;
    const search = window.location.search;
    const isHashAdmin = hash === '#admin';
    const isQueryAdmin = new URLSearchParams(search).get('admin') === 'true';
    const isPathAdmin = path.startsWith('/admin');
    const wasActive = getAdminActiveState();
    return Boolean(token && (isHashAdmin || isQueryAdmin || isPathAdmin || wasActive));
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isDeliveryView, setIsDeliveryView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.replace(/\/+$/, '');
    const hash = window.location.hash;
    const search = window.location.search;
    return path === '/delivery' || hash === '#delivery' || new URLSearchParams(search).get('delivery') === 'true';
  });

  // Verify session in background with server; keep session active if valid
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getAdminToken();
      if (!token) {
        setAdminUser(null);
        setAdminActiveState(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.success && res.user) {
          setAdminUser(res.user);
          setAdminUserStorage(res.user);
        } else {
          clearAdminSession();
          setAdminUser(null);
          setIsAdminView(false);
        }
      } catch (err) {
        // Only log out on authentic 401/403 unauthorized, never on temporary network drops
        const msg = String(err?.message || '');
        if (
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('Unauthorized') ||
          msg.includes('Forbidden') ||
          msg.includes('सत्र समाप्त') ||
          msg.includes('प्रमाणीकरण')
        ) {
          clearAdminSession();
          setAdminUser(null);
          setIsAdminView(false);
        }
      }
    };
    verifyAuth();
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
        const savedUser = getAdminUser();
        if (token && (adminUser || savedUser)) {
          setIsAdminView(true);
          setAdminActiveState(true);
          setIsAdminLoginOpen(false);
        } else if (!token) {
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
    const token = getAdminToken();
    const savedUser = getAdminUser();
    if (token && (adminUser || savedUser)) {
      setIsAdminView(true);
      setAdminActiveState(true);
      if (window.location.hash !== '#admin' && !window.location.pathname.startsWith('/admin')) {
        window.location.hash = '#admin';
      }
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleLoginSuccess = (user) => {
    setAdminUser(user);
    setAdminUserStorage(user);
    setAdminActiveState(true);
    setIsAdminView(true);
    if (window.location.hash !== '#admin' && !window.location.pathname.startsWith('/admin')) {
      window.location.hash = '#admin';
    }
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
