import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { STORE_CONFIG } from '../config/store';
import { useLanguage } from '../context/LanguageContext';

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const { t, isHindi } = useLanguage();

  const faqs = isHindi ? [
    {
      q: 'क्या डिलीवरी केवल शेरवानी लेगेसी (Shervani Legacy) में ही उपलब्ध है?',
      a: `हाँ, वर्तमान में KIRSAB अपनी गुणवत्ता और समय की पाबंदी बनाए रखने के लिए विशेष रूप से ${STORE_CONFIG.serviceArea.primary}, ${STORE_CONFIG.serviceArea.city} और इसके निकटवर्ती परिसरों के लिए ही सेवाएं दे रहा है।`,
    },
    {
      q: 'डिलीवरी का समय (Delivery Timing) क्या रहता है?',
      a: 'हम प्रतिदिन दो स्लॉट में डिलीवरी करते हैं:\n• सुबह का स्लॉट: प्रातः 07:00 AM से 10:00 AM तक\n• शाम का स्लॉट: सायं 05:00 PM से 08:00 PM तक\nआप चेकआउट के समय अपनी पसंद का स्लॉट चुन सकते हैं।',
    },
    {
      q: 'भुगतान (Payment) कैसे किया जाएगा?',
      a: 'आपको वेबसाइट पर कोई कार्ड या ऑनलाइन भुगतान करने की आवश्यकता नहीं है। सब्ज़ियाँ आपके फ्लैट पर पहुँचने पर आप नकद (Cash on Delivery) अथवा डिलीवरी पार्टनर के UPI QR कोड पर स्कैन करके सीधे भुगतान कर सकते हैं।',
    },
    {
      q: `न्यूनतम ऑर्डर और डिलीवरी शुल्क कितना है?`,
      a: `न्यूनतम ऑर्डर मूल्य मात्र ₹${STORE_CONFIG.pricingRules.minOrderValue} है। ₹${STORE_CONFIG.pricingRules.freeDeliveryThreshold} या उससे अधिक के ऑर्डर पर डिलीवरी बिल्कुल मुफ़्त (Free) है। ₹${STORE_CONFIG.pricingRules.freeDeliveryThreshold} से कम के ऑर्डर पर मात्र ₹${STORE_CONFIG.pricingRules.standardDeliveryFee} डिलीवरी शुल्क देय है।`,
    },
    {
      q: 'यदि कोई सब्ज़ी खराब या कम गुणवत्ता की निकले तो?',
      a: 'हमारी प्राथमिकता 100% ताज़ी छंटाई की है। आप डिलीवरी के समय ही सब्ज़ियों की जांच कर सकते हैं। यदि कोई सब्ज़ी आपकी संतुष्टि के अनुरूप न हो, तो आप उसे तुरंत वापस कर सकते हैं और केवल स्वीकृत सब्ज़ियों का ही भुगतान करें।',
    },
    {
      q: 'वेबसाइट से WhatsApp खुलने के बाद क्या करना होता है?',
      a: "चेकआउट पूरा करते ही आपका पूरा ऑर्डर संदेश तैयार होकर WhatsApp में खुल जाता है। आपको केवल WhatsApp में 'Send' (भेजें) बटन दबाना होता है। इसके बाद किरसाब टीम उपलब्धता की पुष्टि करके डिलीवरी सुनिश्चित करती है।",
    },
  ] : [
    {
      q: 'Is delivery exclusive to Shervani Legacy, Prayagraj?',
      a: `Yes, currently KIRSAB provides dedicated delivery services specifically for residents of ${STORE_CONFIG.serviceArea.primary}, ${STORE_CONFIG.serviceArea.city} and adjoining apartment complexes to guarantee freshness and punctuality.`,
    },
    {
      q: 'What are the delivery slot timings?',
      a: 'We deliver fresh harvest twice daily in 2 convenient slots:\n• Morning Slot: 07:00 AM to 10:00 AM\n• Evening Slot: 05:00 PM to 08:00 PM\nYou can select your preferred slot during checkout.',
    },
    {
      q: 'How does payment work?',
      a: 'No advance online payment or credit card is required. When vegetables arrive at your doorstep, you can pay directly via Cash on Delivery or by scanning our delivery partner\'s UPI QR code.',
    },
    {
      q: 'What is the minimum order value and delivery fee?',
      a: `The minimum order value is only ₹${STORE_CONFIG.pricingRules.minOrderValue}. Delivery is completely FREE for orders of ₹${STORE_CONFIG.pricingRules.freeDeliveryThreshold} or more. For orders below ₹${STORE_CONFIG.pricingRules.freeDeliveryThreshold}, a nominal delivery fee of ₹${STORE_CONFIG.pricingRules.standardDeliveryFee} applies.`,
    },
    {
      q: 'What if any vegetable is not fresh or satisfactory?',
      a: 'We handpick every item fresh. You are welcome to inspect all vegetables right at your doorstep upon arrival. If anything fails to meet your expectations, you may return it on the spot and pay only for approved items.',
    },
    {
      q: 'What happens after clicking WhatsApp checkout?',
      a: 'Your complete order summary with flat address and prices is automatically formatted and loaded directly into WhatsApp. Simply press "Send". The KIRSAB team will confirm availability and dispatch your order.',
    },
  ];

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      
      {/* Title */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark bg-brand-soft px-3 py-1 rounded-full mb-2">
          <HelpCircle className="w-3.5 h-3.5 text-brand-fresh" />
          <span>{t('faqBadge')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-charcoal tracking-tight">
          {t('faqHeading')}
        </h2>
        <p className="text-xs sm:text-sm text-brand-muted mt-1">
          {t('faqSubheading')}
        </p>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen 
                  ? 'bg-white border-brand-dark/40 shadow-soft' 
                  : 'bg-white/80 border-brand-border hover:border-brand-dark/20'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 font-bold text-sm sm:text-base text-brand-charcoal"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-brand-dark shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-brand-muted leading-relaxed whitespace-pre-line border-t border-brand-border/40 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
};
