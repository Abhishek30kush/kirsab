/**
 * Checkout form validation utilities
 */

export const validateCheckoutForm = (formData) => {
  const errors = {};

  // Full Name validation
  if (!formData.fullName || !formData.fullName.trim()) {
    errors.fullName = 'कृपया अपना पूरा नाम लिखें (Please enter your name)';
  } else if (formData.fullName.trim().length < 2) {
    errors.fullName = 'नाम कम से कम 2 अक्षरों का होना चाहिए';
  }

  // Mobile Number validation (10-digit Indian mobile number)
  const phoneClean = (formData.phone || '').replace(/[^0-9]/g, '');
  if (!phoneClean) {
    errors.phone = 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें (Enter 10-digit mobile number)';
  } else if (phoneClean.length !== 10) {
    errors.phone = 'मोबाइल नंबर ठीक 10 अंकों का होना चाहिए';
  } else if (!/^[6-9]\d{9}$/.test(phoneClean)) {
    errors.phone = 'मान्य भारतीय मोबाइल नंबर दर्ज करें (शुरुआत 6, 7, 8 या 9 से)';
  }

  // Tower & Flat Number validation
  if (!formData.address || !formData.address.trim()) {
    errors.address = 'कृपया अपना टावर व फ्लैट नंबर लिखें (e.g., Tower A, Flat 302)';
  } else if (formData.address.trim().length < 3) {
    errors.address = 'कृपया सही पता लिखें';
  }

  // Delivery slot validation
  if (!formData.deliverySlot) {
    errors.deliverySlot = 'कृपया डिलीवरी का समय स्लॉट चुनें (Select delivery slot)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
