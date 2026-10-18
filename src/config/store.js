/**
 * ==============================================================================
 * KIRSAB STORE CONFIGURATION (किरसाब स्टोर सेटिंग्स)
 * ==============================================================================
 * 
 * प्रिय स्टोर मालिक (Dear Store Owner),
 * इस फाइल में आप अपने स्टोर की बुनियादी जानकारी, डिलीवरी शुल्क और WhatsApp नंबर बदल सकते हैं।
 * In this file, you can customize basic store details, delivery thresholds, and your WhatsApp number.
 * 
 * निर्देश (Instructions):
 * 1. WHATSAPP_NUMBER: अपने 10 अंकों के बिज़नेस नंबर से पहले 91 जोड़ें (बिना किसी '+' या स्पेस के)।
 *    Example: '919876543210'
 * 2. जब तक सही नंबर न डाला जाए, वेबसाइट पर स्पष्ट चेतावनी दिखेगी ताकि गलत ऑर्डर न जाए।
 */

export const STORE_CONFIG = {
  // Brand Details (ब्रांड का नाम और टैगलाइन)
  brandName: 'KIRSAB',
  brandNameHindi: 'किरसाब',
  tagline: 'सब्ज़ी | किराना | घर तक',
  taglineEnglish: 'Vegetables | Grocery | Direct to your Doorstep',

  // IMPORTANT: Replace this placeholder with the business WhatsApp number (with 91 country code, no +)
  // उदाहरण: '919876543210'
  whatsappNumber: 'REPLACE_WITH_BUSINESS_NUMBER',

  // Primary Service Area (डिलीवरी क्षेत्र)
  serviceArea: {
    primary: 'Shervani Legacy',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    pincode: '211011',
    description: 'वर्तमान में केवल शेरवानी लेगेसी (Shervani Legacy) एवं आसपास के चयनित फ्लैट्स के लिए उपलब्ध।',
  },

  // Business Rules for Order Value & Delivery Fee (ऑर्डर व डिलीवरी नियम)
  pricingRules: {
    currencySymbol: '₹',
    currencyCode: 'INR',
    // न्यूनतम ऑर्डर मूल्य (Minimum order value in Rupees)
    minOrderValue: 150,
    // डिलीवरी शुल्क (Delivery fee for orders below free delivery threshold)
    standardDeliveryFee: 10,
    // मुफ्त डिलीवरी के लिए न्यूनतम राशि (Free delivery on and above this amount)
    freeDeliveryThreshold: 299,
  },

  // Delivery Slots Available for Selection (डिलीवरी स्लॉट्स)
  deliverySlots: [
    {
      id: 'morning',
      label: 'सुबह का स्लॉट (Morning Slot)',
      time: '07:00 AM - 10:00 AM',
      note: 'सुबह ताज़ी सब्ज़ियों के साथ डिलीवरी',
    },
    {
      id: 'evening',
      label: 'शाम का स्लॉट (Evening Slot)',
      time: '05:00 PM - 08:00 PM',
      note: 'शाम के भोजन की तैयारी के लिए समय पर डिलीवरी',
    },
  ],

  // Customer Support Info (ग्राहक सहायता)
  support: {
    email: 'support@kirsab.in',
    displayPhone: '+91 (जल्द उपलब्ध)',
    hours: 'सुबह 06:30 बजे से रात 09:00 बजे तक',
  },

  // Trust Highlights for UI (ग्राहकों के लिए मुख्य बातें)
  highlights: [
    {
      id: 'farm-fresh',
      title: 'हाथ से चुनी हुई ताज़ी सब्ज़ी',
      subtitle: 'हर सुबह मंडी से सीधे ताज़ा स्टॉक',
    },
    {
      id: 'no-middleman',
      title: 'पारदर्शी व सही तौल',
      subtitle: 'वजन में कोई कमी नहीं, उचित स्थानीय दाम',
    },
    {
      id: 'hyperlocal',
      title: 'शेरवानी लेगेसी में तेज़ डिलीवरी',
      subtitle: 'सोसाइटी गेट से सीधे आपके फ्लैट तक',
    },
  ],
};

/**
 * Checks if the store's WhatsApp number is properly configured
 * @param {string} number - WhatsApp phone number
 * @returns {boolean} - true if properly configured, false if placeholder or invalid
 */
export const isWhatsAppConfigured = (number = STORE_CONFIG.whatsappNumber) => {
  if (!number) return false;
  if (number === 'REPLACE_WITH_BUSINESS_NUMBER') return false;
  // Valid Indian mobile with 91 prefix is typically 12 digits total (e.g. 919876543210)
  const cleanNumber = number.replace(/[^0-9]/g, '');
  return cleanNumber.length >= 10 && cleanNumber !== '910000000000';
};
