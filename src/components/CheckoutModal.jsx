import React, { useState } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  FileText,
  Copy,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { STORE_CONFIG, isWhatsAppConfigured } from '../config/store';
import { validateCheckoutForm } from '../utils/validation';
import { buildWhatsAppMessage, createWhatsAppOrderUrl } from '../utils/whatsapp';
import { formatCurrency } from '../utils/currency';
import { api } from '../utils/api';

export const CheckoutModal = () => {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    enrichedItems, 
    totals,
    clearCart,
  } = useCart();
  const { t, isHindi, language } = useLanguage();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    landmark: '',
    deliverySlot: STORE_CONFIG.deliverySlots[0]?.id || 'morning',
    instructions: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null); // When order is prepared
  const [copiedText, setCopiedText] = useState(false);
  const [apiError, setApiError] = useState(null);

  if (!isCheckoutOpen) return null;

  const isConfiguredNumber = isWhatsAppConfigured();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    // 1. Validate Form Fields
    const validation = validateCheckoutForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // 2. Validate Cart state (strictly from master product pricing)
    if (!totals.canProceedToCheckout || enrichedItems.length === 0) {
      alert('कृपया अपनी टोकरी में मान्य सब्ज़ियाँ जोड़ें।');
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. Submit directly to PostgreSQL backend
      const response = await api.createOrder({
        customer: formData,
        items: enrichedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      // Record submitted state to show guidance screen
      setSubmittedOrder({
        message: response.whatsappMessage,
        whatsappUrl: response.whatsappUrl,
        customer: { ...formData },
        totals: {
          subtotal: response.order.subtotal,
          deliveryFee: response.order.deliveryFee,
          finalTotal: response.order.finalTotal,
        },
        orderNumber: response.order.orderNumber,
      });

      // Open WhatsApp in new tab / application
      if (response.whatsappUrl) {
        window.open(response.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Order submission failed:', err);
      setApiError(err.message || 'ऑर्डर दर्ज करने में असमर्थ। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyMessageToClipboard = async () => {
    if (!submittedOrder) return;
    try {
      await navigator.clipboard.writeText(submittedOrder.message);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!submittedOrder) setIsCheckoutOpen(false);
        }}
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-4 text-center">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl text-left overflow-hidden transform transition-all my-8 relative">
          
          {/* Modal Header */}
          <div className="p-4 sm:p-6 bg-brand-dark text-white flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">
                {submittedOrder ? t('orderGuidanceTitle') : t('checkoutTitle')}
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                {t('servicePillPrimary')}, {t('servicePillCity')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (submittedOrder) {
                  clearCart();
                }
                setIsCheckoutOpen(false);
                setSubmittedOrder(null);
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
            
            {/* Owner setup alert if WhatsApp number is still default placeholder */}
            {!isConfiguredNumber && (
              <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-amber-950">स्टोर मालिक के लिए सूचना (Owner Setup Required):</strong>
                    <p className="mt-1 text-amber-800">
                      WhatsApp नंबर अभी <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold">REPLACE_WITH_BUSINESS_NUMBER</code> पर सेट है।
                    </p>
                    <p className="mt-1 text-amber-800">
                      ऑर्डर चालू करने के लिए कृपया <code className="bg-amber-100 px-1 py-0.5 rounded">src/config/store.js</code> में अपना सही WhatsApp नंबर (जैसे <code className="font-mono">919876543210</code>) दर्ज करें।
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* If Order was submitted, show Success Guidance */}
            {submittedOrder ? (
              <div className="space-y-5">
                <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
                  <div className="w-14 h-14 bg-emerald-100 text-brand-dark rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-brand-dark" />
                  </div>
                  <h4 className="text-lg font-bold text-brand-charcoal">
                    {t('orderSavedNotice')}
                  </h4>
                  {submittedOrder.orderNumber && (
                    <div className="inline-block bg-white text-brand-dark font-mono font-bold text-xs px-3 py-1 rounded-full border border-emerald-300 mt-1 shadow-xs">
                      {t('orderIdLabel')} #{submittedOrder.orderNumber}
                    </div>
                  )}
                  <p className="text-xs sm:text-sm text-brand-muted mt-2 max-w-md mx-auto">
                    {t('pressSendNotice')}
                  </p>
                </div>

                {/* Important Next Steps Guidance */}
                <div className="bg-brand-soft/40 p-4 rounded-2xl border border-brand-border space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-brand-dark">
                    {t('whatHappensNext')}
                  </h5>
                  <ul className="text-xs text-brand-charcoal space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                      <span>{t('nextStep1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                      <span>{t('nextStep2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-dark text-white flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                      <span>{t('nextStep3')}</span>
                    </li>
                  </ul>
                </div>

                {/* Direct Action Buttons */}
                <div className="space-y-2.5 pt-2">
                  {submittedOrder.whatsappUrl && (
                    <a
                      href={submittedOrder.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20BA5C] text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{t('openWhatsAppAgain')}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={copyMessageToClipboard}
                    className="w-full bg-white hover:bg-gray-50 border border-brand-border text-brand-charcoal font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <Copy className="w-4 h-4 text-brand-dark" />
                    <span>
                      {copiedText ? t('copiedOrderText') : t('copyOrderText')}
                    </span>
                  </button>
                </div>

                {/* Done and clear */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setIsCheckoutOpen(false);
                      setSubmittedOrder(null);
                    }}
                    className="w-full py-2.5 text-xs text-brand-muted hover:text-brand-dark font-medium underline"
                  >
                    {t('startNewOrder')}
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {apiError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{apiError}</span>
                  </div>
                )}
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    {t('fullNameLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={t('fullNamePlaceholder')}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark transition-all ${
                        errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-brand-border bg-white'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.fullName}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    {t('phoneLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-semibold text-brand-muted select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="phone"
                      maxLength={10}
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('phonePlaceholder')}
                      className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl border text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark transition-all ${
                        errors.phone ? 'border-red-400 bg-red-50/30' : 'border-brand-border bg-white'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.phone}</p>
                  )}
                </div>

                {/* Tower & Flat Address */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    {t('addressLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t('addressPlaceholder')}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-dark transition-all ${
                        errors.address ? 'border-red-400 bg-red-50/30' : 'border-brand-border bg-white'
                      }`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.address}</p>
                  )}
                </div>

                {/* Optional Landmark */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    {t('landmarkLabel')}
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder={t('landmarkPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-brand-dark transition-all"
                  />
                </div>

                {/* Delivery Slot Selection */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                    {t('section2Heading')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {STORE_CONFIG.deliverySlots.map((slot) => {
                      const isSelected = formData.deliverySlot === slot.id;
                      const slotTitle = isHindi ? slot.label : (slot.id === 'morning' ? 'Morning Slot' : 'Evening Slot');
                      return (
                        <label
                          key={slot.id}
                          className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-dark bg-brand-soft/60 ring-2 ring-brand-dark/20'
                              : 'border-brand-border bg-white hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliverySlot"
                            value={slot.id}
                            checked={isSelected}
                            onChange={handleInputChange}
                            className="mt-1 text-brand-dark focus:ring-brand-dark"
                          />
                          <div>
                            <span className="block font-bold text-xs text-brand-charcoal">
                              {slotTitle}
                            </span>
                            <span className="block text-[11px] text-brand-dark font-semibold mt-0.5">
                              {slot.time}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.deliverySlot && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.deliverySlot}</p>
                  )}
                </div>

                {/* Order Instructions (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-brand-charcoal mb-1">
                    {t('section3Heading')}
                  </label>
                  <textarea
                    name="instructions"
                    rows={2}
                    value={formData.instructions}
                    onChange={handleInputChange}
                    placeholder={t('instructionsPlaceholder')}
                    className="w-full px-3.5 py-2 rounded-xl border border-brand-border text-sm text-brand-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-brand-dark transition-all"
                  />
                </div>

                {/* Order Summary Recap */}
                <div className="bg-brand-light p-3.5 rounded-2xl border border-brand-border/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-brand-muted">
                    <span>{isHindi ? 'कुल वस्तुएं (Items):' : 'Total Items:'}</span>
                    <span className="font-semibold text-brand-charcoal">{totals.itemCount} {t('mobileItemsInCart')}</span>
                  </div>
                  <div className="flex justify-between text-brand-muted">
                    <span>{t('subtotalLabel')}:</span>
                    <span className="font-semibold text-brand-charcoal">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-brand-muted">
                    <span>{t('deliveryFeeLabel')}:</span>
                    <span className="font-semibold text-brand-charcoal">
                      {totals.deliveryFee === 0 ? t('freeBadge') : `₹${totals.deliveryFee}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-brand-border flex justify-between text-sm font-bold text-brand-charcoal">
                    <span>{t('finalTotalLabel')}:</span>
                    <span className="text-base text-brand-dark">{formatCurrency(totals.finalTotal)}</span>
                  </div>
                </div>

                {/* Submit via WhatsApp CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isConfiguredNumber}
                    className="w-full bg-[#25D366] hover:bg-[#20BA5C] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? t('processingOrder') : t('placeOrderBtn')}</span>
                  </button>
                  <p className="text-[11px] text-center text-brand-muted mt-2">
                    {isHindi 
                      ? 'सुरक्षित चेकआउट • कोई ऑनलाइन कार्ड या पासवर्ड की आवश्यकता नहीं • डिलीवरी पर भुगतान'
                      : 'Secure Checkout • No online card or password required • Pay upon delivery'}
                  </p>
                </div>

              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
