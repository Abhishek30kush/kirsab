import React from 'react';
import { 
  ArrowRight, 
  MessageCircle, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ShoppingBag
} from 'lucide-react';
import { STORE_CONFIG, isWhatsAppConfigured } from '../config/store';
import { useLanguage } from '../context/LanguageContext';

export const Hero = ({ onOrderClick }) => {
  const { t, language } = useLanguage();
  const isWaReady = isWhatsAppConfigured();

  const handleWhatsAppChat = () => {
    if (isWaReady) {
      window.open(
        `https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
          language === 'en'
            ? 'Hello KIRSAB, I would like to inquire about ordering fresh vegetables in Shervani Legacy, Prayagraj.'
            : 'नमस्ते KIRSAB, मुझे शेरवानी लेगेसी, प्रयागराज में ताज़ी सब्ज़ी ऑर्डर करने के बारे में जानकारी चाहिए।'
        )}`,
        '_blank'
      );
    } else {
      alert(language === 'en' ? 'WhatsApp number will be configured soon.' : 'WhatsApp नंबर जल्द सक्रिय किया जाएगा।');
    }
  };

  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 bg-gradient-to-b from-brand-soft/50 via-brand-light to-brand-light">
      {/* Decorative organic background blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-200/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-brand-soft blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Headlines and CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Hyperlocal Service Area Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-brand-border shadow-xs text-xs sm:text-sm font-semibold text-brand-dark">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <MapPin className="w-4 h-4 text-brand-fresh" />
              <span>{t('heroPill')}</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-charcoal tracking-tight leading-tight sm:leading-tight">
                {t('heroTitle1')} <br className="hidden sm:block" />
                <span className="text-brand-dark">{t('heroTitle2')}</span>
              </h1>
              <p className="text-sm sm:text-base text-brand-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('heroDesc')}
              </p>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={onOrderClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand-dark hover:bg-brand-hover text-white text-base font-bold px-7 py-3.5 rounded-2xl shadow-elevated transition-all duration-150 active:scale-95"
              >
                <ShoppingBag className="w-5 h-5 text-emerald-300" />
                <span>{t('orderNowBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleWhatsAppChat}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 text-brand-charcoal border border-brand-border text-base font-semibold px-6 py-3.5 rounded-2xl shadow-xs transition-all duration-150 active:scale-95"
              >
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                <span>{t('contactWhatsAppBtn')}</span>
              </button>
            </div>

            {/* Value Highlights */}
            <div className="pt-4 border-t border-brand-border/70 grid grid-cols-3 gap-3 text-left">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-fresh shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-brand-charcoal">{t('freshHighlightTitle')}</h4>
                  <p className="text-[11px] text-brand-muted">{t('freshHighlightSub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-fresh shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-brand-charcoal">{t('weightGuaranteeTitle')}</h4>
                  <p className="text-[11px] text-brand-muted">{t('weightGuaranteeSub')}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-brand-fresh shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-brand-charcoal">{t('slotsHighlightTitle')}</h4>
                  <p className="text-[11px] text-brand-muted">{t('slotsHighlightSub')}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Visual Card Featuring Logo & Fresh Vegetables */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              
              {/* Outer Card */}
              <div className="relative rounded-3xl bg-white p-5 sm:p-6 border border-brand-border/80 shadow-elevated">
                
                {/* Brand Logo Presentation */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-brand-light flex items-center justify-center p-4">
                  <img
                    src="/logo.png"
                    alt="KIRSAB - सब्ज़ी किराना घर तक"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>

                {/* Micro info bar inside hero card */}
                <div className="mt-4 p-3.5 rounded-2xl bg-brand-soft/60 border border-brand-border flex items-center justify-between text-xs">
                  <div>
                    <span className="block font-bold text-brand-charcoal">
                      {t('heroCardTitle')}
                    </span>
                    <span className="text-brand-muted text-[11px]">
                      {t('minOrderPrefix')}{STORE_CONFIG.pricingRules.minOrderValue}
                    </span>
                  </div>
                  <span className="bg-brand-dark text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    ₹{STORE_CONFIG.pricingRules.freeDeliveryThreshold}+ {t('freeDeliveryTag')}
                  </span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
