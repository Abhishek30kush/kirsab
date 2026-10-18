import React from 'react';
import { MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { STORE_CONFIG, isWhatsAppConfigured } from '../config/store';
import { useLanguage } from '../context/LanguageContext';

export const Footer = () => {
  const { t, language } = useLanguage();
  const isWaReady = isWhatsAppConfigured();

  const handleWhatsAppContact = () => {
    if (isWaReady) {
      window.open(
        `https://wa.me/${STORE_CONFIG.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
          language === 'en'
            ? 'Hello KIRSAB, I need assistance regarding fresh vegetable delivery in Shervani Legacy, Prayagraj.'
            : 'नमस्ते KIRSAB, मुझे शेरवानी लेगेसी, प्रयागराज में ताज़ी सब्ज़ी डिलीवरी के बारे में सहायता चाहिए।'
        )}`,
        '_blank'
      );
    }
  };

  return (
    <footer className="bg-white border-t border-brand-border mt-12 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-brand-border/60">
          
          {/* Brand Info & Logo */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-brand-border overflow-hidden">
                <img
                  src="/logo.png"
                  alt="KIRSAB Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-extrabold text-2xl text-brand-dark tracking-tight leading-none block">
                  {STORE_CONFIG.brandName}
                </span>
                <span className="text-xs font-semibold text-brand-fresh leading-none mt-1 block">
                  {t('tagline')}
                </span>
              </div>
            </div>

            <p className="text-xs text-brand-muted max-w-sm leading-relaxed">
              {t('footerBrandDesc')}
            </p>

            <div className="flex items-center gap-2 text-xs text-brand-charcoal">
              <ShieldCheck className="w-4 h-4 text-brand-fresh shrink-0" />
              <span>{t('footerTrust')}</span>
            </div>
          </div>

          {/* Quick Links & Service Area */}
          <div>
            <h4 className="font-bold text-sm text-brand-charcoal mb-3">
              {t('footerServiceHeading')}
            </h4>
            <ul className="text-xs text-brand-muted space-y-2">
              <li className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-brand-fresh shrink-0 mt-0.5" />
                <span>
                  {STORE_CONFIG.serviceArea.primary}, {STORE_CONFIG.serviceArea.city}, {STORE_CONFIG.serviceArea.state} ({STORE_CONFIG.serviceArea.pincode})
                </span>
              </li>
              <li>• {language === 'en' ? 'Direct tower & flat delivery' : 'समर्पित टावर व फ्लैट डिलीवरी'}</li>
              <li>• {language === 'en' ? 'Morning Slot: 07:00 AM – 10:00 AM' : 'प्रातः स्लॉट: 07:00 AM - 10:00 AM'}</li>
              <li>• {language === 'en' ? 'Evening Slot: 05:00 PM – 08:00 PM' : 'सायं स्लॉट: 05:00 PM - 08:00 PM'}</li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="font-bold text-sm text-brand-charcoal mb-3">
              {t('footerContactHeading')}
            </h4>
            <div className="space-y-3">
              {isWaReady ? (
                <button
                  type="button"
                  onClick={handleWhatsAppContact}
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t('footerChatWhatsApp')}</span>
                </button>
              ) : (
                <span className="inline-block text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl">
                  {language === 'en' ? 'WhatsApp number active soon' : 'WhatsApp नंबर जल्द सक्रिय होगा'}
                </span>
              )}

              <p className="text-[11px] text-brand-muted">
                {t('footerHours')}
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-muted">
          <p>
            © {new Date().getFullYear()} {STORE_CONFIG.brandName} ({STORE_CONFIG.brandNameHindi}). {t('footerRights')}{' '}
            <a 
              href="#admin" 
              className="opacity-20 hover:opacity-100 transition-opacity text-[10px] text-gray-400 select-none" 
              title="स्टाफ लॉगिन"
            >
              •
            </a>
          </p>
          <p className="flex items-center gap-1">
            <span>{t('footerBuiltFor')}</span>
            <span className="text-emerald-700">🌱</span>
          </p>
        </div>

      </div>
    </footer>
  );
};
