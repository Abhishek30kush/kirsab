import React from 'react';
import { MapPin, Clock, Truck } from 'lucide-react';
import { STORE_CONFIG } from '../config/store';
import { useLanguage } from '../context/LanguageContext';

export const ServiceAreaNotice = () => {
  const { t, language } = useLanguage();
  const { minOrderValue, standardDeliveryFee, freeDeliveryThreshold } = STORE_CONFIG.pricingRules;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-8 relative z-10">
      <div className="bg-white rounded-3xl border border-brand-border/80 shadow-soft p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 divide-y md:divide-y-0 md:divide-x divide-brand-border/70">
          
          {/* Service Area */}
          <div className="flex items-start gap-3.5 pt-3 md:pt-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                {t('serviceAreaTitle')}
              </span>
              <h3 className="font-bold text-sm sm:text-base text-brand-charcoal mt-0.5">
                {STORE_CONFIG.serviceArea.primary}, {STORE_CONFIG.serviceArea.city}
              </h3>
              <p className="text-xs text-brand-muted mt-1">
                {language === 'en'
                  ? 'Dedicated doorstep delivery to all towers and surrounding areas of Shervani Legacy.'
                  : STORE_CONFIG.serviceArea.description}
              </p>
            </div>
          </div>

          {/* Delivery Slots */}
          <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:pl-5">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                {t('deliverySlotsTitle')}
              </span>
              <div className="mt-1 space-y-1">
                {STORE_CONFIG.deliverySlots.map((slot) => {
                  const label = language === 'en' 
                    ? (slot.id === 'morning' ? 'Morning Slot' : 'Evening Slot')
                    : slot.label;
                  return (
                    <div key={slot.id} className="text-xs text-brand-charcoal flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-fresh"></span>
                      <strong className="font-semibold">{label}:</strong>
                      <span className="text-brand-muted">{slot.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Transparent Delivery Fees */}
          <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:pl-5">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft text-brand-dark flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                {t('deliveryRulesTitle')}
              </span>
              <div className="mt-1 text-xs space-y-1">
                <p className="text-brand-charcoal">
                  • {t('ruleMinOrder')} <strong>₹{minOrderValue}</strong>
                </p>
                <p className="text-brand-charcoal">
                  • <strong>₹{freeDeliveryThreshold}</strong> {t('ruleFreeThreshold')} <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">{t('ruleFreeBadge')}</span>
                </p>
                <p className="text-brand-muted text-[11px]">
                  • ₹{freeDeliveryThreshold} {t('ruleUnderThreshold')} ₹{standardDeliveryFee} {t('ruleDeliveryFee')}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
