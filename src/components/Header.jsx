import React from 'react';
import { ShoppingBag, MapPin, MessageCircle, User, Truck, Shield } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useCustomer } from '../context/CustomerContext';
import { isWhatsAppConfigured } from '../config/store';

export const Header = ({ onOpenAdmin, isAdminLoggedIn, onOpenDelivery }) => {
  const { totals, setIsCartOpen, storeSettings } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const {
    customerUser,
    orders,
    setIsAuthModalOpen,
    setIsCustomerPortalOpen,
  } = useCustomer();

  const waNumber = storeSettings?.whatsappNumber || 'REPLACE_WITH_BUSINESS_NUMBER';
  const isWaReady = isWhatsAppConfigured(waNumber);

  const handleWhatsAppContact = () => {
    if (isWaReady) {
      window.open(
        `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
          language === 'en'
            ? `Hello ${storeSettings?.brandName || 'KIRSAB'}, I would like to inquire about fresh vegetable delivery in Shervani Legacy, Prayagraj.`
            : `नमस्ते ${storeSettings?.brandName || 'KIRSAB'}, मुझे ${storeSettings?.serviceArea?.primary || 'शेरवानी लेगेसी, प्रयागराज'} में ताज़ी सब्ज़ियों की डिलीवरी के बारे में जानना है।`
        )}`,
        '_blank'
      );
    } else {
      alert(language === 'en' ? 'Store owner WhatsApp number will be configured soon.' : 'स्टोर मालिक का WhatsApp नंबर जल्द जोड़ा जाएगा।');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-border/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-3">
          
          {/* Logo and Tagline */}
          <a href="#" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none">
            <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-white p-0.5 border border-brand-border/40 shadow-xs group-hover:scale-105 transition-transform">
              <img
                src="/logo.png"
                alt="KIRSAB Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 bg-brand-dark text-white font-black text-sm items-center justify-center">
                KS
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl text-brand-dark tracking-tight leading-none">
                  {storeSettings?.brandName || 'KIRSAB'}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-brand-fresh leading-none hidden xs:inline">
                  ({storeSettings?.brandNameHindi || 'किरसाब'})
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-brand-muted mt-1 leading-none">
                {t('tagline')}
              </span>
            </div>
          </a>

          {/* Service Area Pill (Desktop & Tablet) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-soft border border-brand-border/80 text-xs text-brand-dark">
            <MapPin className="w-3.5 h-3.5 text-brand-fresh shrink-0" />
            <span className="font-semibold">{storeSettings?.serviceArea?.primary || t('servicePillPrimary')}</span>
            <span className="text-brand-muted">• {storeSettings?.serviceArea?.city || t('servicePillCity')}</span>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">

            {/* Language Switcher Segmented Pill */}
            <div 
              className="flex items-center bg-brand-soft/80 p-0.5 rounded-xl border border-brand-border shadow-2xs"
              role="group"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                  language === 'hi'
                    ? 'bg-brand-dark text-white shadow-xs'
                    : 'text-brand-charcoal/70 hover:text-brand-dark'
                }`}
                title="हिन्दी में बदलें"
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-brand-dark text-white shadow-xs'
                    : 'text-brand-charcoal/70 hover:text-brand-dark'
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>

            {/* Delivery Partner Portal Quick Trigger */}
            {onOpenDelivery && (
              <button
                type="button"
                onClick={onOpenDelivery}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-300 shadow-2xs"
                title={language === 'hi' ? 'डिलीवरी पार्टनर पोर्टल' : 'Delivery Partner Portal'}
              >
                <Truck className="w-4 h-4 text-emerald-800" />
                <span>{language === 'hi' ? 'डिलीवरी पोर्टल' : 'Delivery'}</span>
              </button>
            )}

            {/* Customer Account Trigger (Module 1 & 2) */}
            {customerUser ? (
              <button
                type="button"
                onClick={() => setIsCustomerPortalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs transition-all"
                title={language === 'hi' ? 'मेरा खाता व ऑर्डर्स' : 'My Account & Orders'}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black">
                  {customerUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-extrabold">{customerUser.name.split(' ')[0]}</span>
                {orders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-mono">
                    {orders.length}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-brand-dark bg-brand-soft hover:bg-emerald-100 border border-brand-border shadow-2xs transition-all"
                title={language === 'hi' ? 'ग्राहक लॉगिन / नया खाता' : 'Customer Sign In'}
              >
                <User className="w-4 h-4 text-emerald-700" />
                <span className="hidden xs:inline">{language === 'hi' ? 'लॉगिन' : 'Sign In'}</span>
              </button>
            )}

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 bg-brand-dark hover:bg-brand-hover text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-soft hover:shadow-elevated transition-all active:scale-95"
              aria-label={`${t('cartBtn')}, ${totals.itemCount} ${t('itemsInCart')}`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-300" />
              <span className="hidden xs:inline">{t('cartBtn')}</span>
              
              {/* Badge */}
              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-accent text-brand-charcoal text-[11px] font-extrabold flex items-center justify-center">
                {totals.itemCount}
              </span>

              {totals.subtotal > 0 && (
                <span className="hidden sm:inline-block border-l border-white/20 pl-2 text-xs font-bold text-emerald-100">
                  ₹{totals.finalTotal}
                </span>
              )}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
