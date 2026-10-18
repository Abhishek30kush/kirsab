import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/currency';

export const MobileCartBar = () => {
  const { totals, setIsCartOpen, isCartOpen, isCheckoutOpen } = useCart();
  const { t } = useLanguage();

  if (totals.subtotal <= 0 || isCartOpen || isCheckoutOpen) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 p-3 sm:hidden safe-bottom bg-gradient-to-t from-white via-white/95 to-transparent pt-4">
      <div 
        onClick={() => setIsCartOpen(true)}
        className="bg-brand-dark text-white rounded-2xl p-3.5 shadow-modal flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center relative">
            <ShoppingBag className="w-5 h-5 text-emerald-300" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-accent text-brand-charcoal text-[11px] font-black flex items-center justify-center">
              {totals.itemCount}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-base">
                {formatCurrency(totals.finalTotal)}
              </span>
              {totals.deliveryFee === 0 && (
                <span className="text-[10px] text-emerald-300 font-semibold uppercase">
                  {t('mobileFreeDelivery')}
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/80 block">
              {totals.itemCount} {t('mobileItemsInCart')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white text-brand-dark font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs">
          <span>{t('mobileViewCart')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
