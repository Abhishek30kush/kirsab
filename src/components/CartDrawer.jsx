import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  AlertCircle, 
  Truck,
  ShieldCheck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { QuantitySelector } from './QuantitySelector';
import { STORE_CONFIG } from '../config/store';
import { formatCurrency } from '../utils/currency';

export const CartDrawer = () => {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    enrichedItems, 
    totals, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    setIsCheckoutOpen 
  } = useCart();
  const { t, tProduct, isHindi } = useLanguage();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isCartOpen) return null;

  const { minOrderValue, freeDeliveryThreshold } = STORE_CONFIG.pricingRules;

  // Free delivery progress percentage
  const freeDeliveryPercent = Math.min(
    100,
    Math.round((totals.subtotal / freeDeliveryThreshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-brand-dark text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  {t('cartTitle')} ({totals.itemCount})
                </h2>
                <p className="text-xs text-white/80">
                  {STORE_CONFIG.serviceArea.primary}, {STORE_CONFIG.serviceArea.city}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label={t('cancelBtn')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery / Threshold Banner */}
          {totals.subtotal > 0 && (
            <div className="bg-emerald-50 border-b border-emerald-100 p-3 sm:px-5">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand-fresh" />
                  {totals.isFreeDelivery ? (
                    <span className="text-brand-dark font-bold">{t('congratsFreeDelivery')}</span>
                  ) : (
                    <span>
                      {t('freeDeliveryShortfallPrefix')} <strong className="text-brand-dark">₹{totals.freeDeliveryShortfall}</strong> {t('freeDeliveryShortfallSuffix')}
                    </span>
                  )}
                </span>
                <span className="text-brand-dark font-bold">{freeDeliveryPercent}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-brand-dark h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${freeDeliveryPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Items List or Empty State */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {enrichedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-brand-soft flex items-center justify-center text-4xl shadow-inner">
                  🥬
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-charcoal">
                    {t('emptyCartTitle')}
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 max-w-xs">
                    {t('emptyCartDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 inline-flex items-center gap-2 bg-brand-dark text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-brand-hover active:scale-95 transition-all"
                >
                  {t('browseVegBtn')}
                </button>
              </div>
            ) : (
              <>
                {/* Clear Cart Trigger */}
                <div className="flex items-center justify-between pb-1 text-xs">
                  <span className="font-semibold text-brand-muted">
                    {isHindi ? `चयनित वस्तुएं (${enrichedItems.length})` : `Selected Items (${enrichedItems.length})`}
                  </span>
                  
                  {!showClearConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('clearCartBtn')}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 px-2 py-1 rounded-lg border border-red-200">
                      <span>खाली करें?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearCart();
                          setShowClearConfirm(false);
                        }}
                        className="font-bold text-red-800 underline"
                      >
                        हाँ
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="text-gray-600"
                      >
                        नहीं
                      </button>
                    </div>
                  )}
                </div>

                {/* Items */}
                {enrichedItems.map((item) => {
                  const p = item.product;
                  const isAvailable = item.isValidForCheckout;

                  return (
                    <div 
                      key={item.productId}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        !isAvailable ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-brand-border/70 shadow-sm'
                      }`}
                    >
                      {/* Image / Fallback */}
                      <div className="w-16 h-16 rounded-xl bg-brand-soft overflow-hidden shrink-0 relative">
                        <img 
                          src={p.image} 
                          alt={tProduct(p).name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="hidden absolute inset-0 items-center justify-center text-xl bg-emerald-50">
                          {p.fallbackEmoji || '🥬'}
                        </div>
                      </div>

                      {/* Info & Quantity */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="font-bold text-sm text-brand-charcoal truncate">
                              {tProduct(p).name}
                            </h4>
                            <span className="text-[11px] text-brand-muted">
                              {tProduct(p).altName} • {tProduct(p).unit}
                            </span>
                          </div>
                          
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                            aria-label={`${tProduct(p).name} हटाएं`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price & Quantity Controls */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs">
                            {isAvailable ? (
                              <span className="font-extrabold text-brand-dark text-sm">
                                {formatCurrency(item.lineTotal)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                {t('pricePendingText')}
                              </span>
                            )}
                          </div>

                          <QuantitySelector
                            quantity={item.quantity}
                            onIncrement={() => updateQuantity(item.productId, item.quantity + 1)}
                            onDecrement={() => updateQuantity(item.productId, item.quantity - 1)}
                            onDelete={() => removeFromCart(item.productId)}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer & Checkout Trigger */}
          {enrichedItems.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-brand-border bg-brand-light/60 space-y-3">
              {/* Warnings: Minimum Order */}
              {!totals.isMinOrderMet && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>{t('minOrderAlertPrefix')}{minOrderValue}</strong>
                    <p className="mt-0.5">
                      {isHindi ? `ऑर्डर आगे बढ़ाने के लिए कृपया ₹${totals.minOrderShortfall} की और सब्ज़ी टोकरी में जोड़ें।` : `Please add ₹${totals.minOrderShortfall} more items to proceed.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Warnings: Unconfigured Items */}
              {totals.hasInvalidItems && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>{isHindi ? 'कुछ सब्ज़ियों के भाव अभी अपडेट नहीं हैं।' : 'Some vegetable prices are not configured yet.'}</strong>
                    <p className="mt-0.5">
                      {isHindi ? "कृपया जिन पर 'भाव प्रतीक्षारत' लिखा है, उन्हें टोकरी से हटाएँ ताकि ऑर्डर भेजा जा सके।" : "Please remove items labeled 'Price Pending' to proceed."}
                    </p>
                  </div>
                </div>
              )}

              {/* Price Calculation Breakdown */}
              <div className="bg-white p-3.5 rounded-xl border border-brand-border space-y-2 text-xs">
                <div className="flex justify-between text-brand-muted">
                  <span>{t('subtotalLabel')}</span>
                  <span className="font-semibold text-brand-charcoal">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                
                <div className="flex justify-between text-brand-muted">
                  <span>{t('deliveryFeeLabel')}</span>
                  {totals.deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {t('freeBadge')}
                    </span>
                  ) : (
                    <span className="font-semibold text-brand-charcoal">
                      ₹{totals.deliveryFee}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-brand-border flex justify-between text-sm font-bold text-brand-charcoal">
                  <span>{t('finalTotalLabel')}</span>
                  <span className="text-base text-brand-dark">
                    {formatCurrency(totals.finalTotal)}
                  </span>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                type="button"
                disabled={!totals.canProceedToCheckout}
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
                className="w-full bg-brand-dark hover:bg-brand-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span>{t('checkoutBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-brand-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-fresh" />
                <span>{t('servicePillPrimary')}, {t('servicePillCity')}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
