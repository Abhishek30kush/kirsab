import React from 'react';
import { ShoppingBasket, Send, CheckCircle2, Truck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HowItWorks = () => {
  const { t, isHindi } = useLanguage();

  const steps = [
    {
      step: '01',
      title: isHindi ? 'ताज़ी सब्ज़ियाँ चुनें' : 'Select Fresh Vegetables',
      desc: isHindi 
        ? 'कैटलॉग से अपनी दैनिक आवश्यकता के अनुसार सब्ज़ियाँ और उचित मात्रा टोकरी में जोड़ें।'
        : 'Add fresh vegetables in your desired quantity to your cart from the live catalogue.',
      icon: ShoppingBasket,
      tag: isHindi ? 'सरल व पारदर्शी' : 'Simple & Clear',
    },
    {
      step: '02',
      title: isHindi ? 'WhatsApp पर ऑर्डर भेजें' : 'Send Order via WhatsApp',
      desc: isHindi
        ? 'अपना फ्लैट व टावर नंबर डालें और 1-क्लिक में तैयार ऑर्डर संदेश WhatsApp पर भेजें।'
        : 'Enter your tower & flat number, then send the auto-formatted order with 1 click.',
      icon: Send,
      tag: isHindi ? 'बिना किसी झंझट के' : 'Zero Hassle',
    },
    {
      step: '03',
      title: isHindi ? 'घर पर डिलीवरी व भुगतान' : 'Doorstep Delivery & Pay',
      desc: isHindi
        ? 'चुने गए स्लॉट में ताज़ी सब्ज़ी अपने फ्लैट पर प्राप्त करें और Cash या UPI द्वारा भुगतान करें।'
        : 'Receive fresh vegetables at your flat during the chosen slot and pay via Cash or UPI.',
      icon: Truck,
      tag: isHindi ? 'सुरक्षित व भरोसेमंद' : 'Safe & Reliable',
    },
  ];

  return (
    <section className="bg-brand-soft/40 py-12 sm:py-16 border-y border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark bg-white border border-brand-border px-3.5 py-1 rounded-full">
            {t('howItWorksBadge')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-charcoal tracking-tight mt-3">
            {t('howItWorksHeading')}
          </h2>
          <p className="text-xs sm:text-sm text-brand-muted mt-2">
            {t('howItWorksSubheading')}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.step}
                className="bg-white rounded-3xl p-6 border border-brand-border/80 shadow-soft relative flex flex-col justify-between hover:shadow-elevated transition-shadow"
              >
                <div>
                  {/* Step Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-brand-dark/20 font-mono">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-fresh bg-brand-soft px-2.5 py-0.5 rounded-full">
                      {item.tag}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-brand-dark" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-extrabold text-base sm:text-lg text-brand-charcoal">
                    {item.title}
                  </h3>
                  <p className="text-xs text-brand-muted mt-2.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-brand-border/40 flex items-center text-[11px] font-semibold text-brand-dark">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-fresh mr-1.5 shrink-0" />
                  <span>{t('servicePillPrimary')}, {t('servicePillCity')}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
