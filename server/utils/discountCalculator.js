/**
 * KIRSAB Vegetable Offers & Discounts Calculation Engine
 * 
 * Rules:
 * - Deterministic, non-stacking best customer price resolution
 * - Strict monetary rounding to 2 decimal places (paise precision)
 * - Safe protection against zero, negative or excessive discounts
 * - Automatic schedule checks against server timestamp (no manual trigger needed)
 */

/**
 * Format and round money value strictly to 2 decimal places to avoid IEEE-754 floating point issues
 * @param {number} val 
 * @returns {number}
 */
export const roundMoney = (val) => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Validates offer input fields before creating or updating
 * @param {object} input 
 * @param {Array} availableProducts 
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export const validateOfferInput = (input, availableProducts = []) => {
  const errors = [];

  // Title
  if (!input.title || typeof input.title !== 'string' || input.title.trim().length < 2) {
    errors.push('ऑफ़र का नाम कम से कम 2 अक्षरों का होना चाहिए (Offer title must be at least 2 characters)');
  }

  // Discount Type
  if (!['percentage', 'fixed'].includes(input.discountType)) {
    errors.push('छूट का प्रकार मान्य होना चाहिए: percentage या fixed (Discount type must be percentage or fixed)');
  }

  // Discount Value
  const discountVal = Number(input.discountValue);
  if (isNaN(discountVal) || discountVal <= 0) {
    errors.push('छूट का मूल्य सकारात्मक होना चाहिए (Discount value must be greater than 0)');
  } else if (input.discountType === 'percentage' && discountVal >= 100) {
    errors.push('प्रतिशत छूट 100% से कम होनी चाहिए (Percentage discount must be less than 100%)');
  }

  // Dates
  if (!input.startDate) {
    errors.push('प्रारंभ तिथि अनिवार्य है (Start date is required)');
  }
  if (!input.endDate) {
    errors.push('समाप्ति तिथि अनिवार्य है (End date is required)');
  }

  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  if (isNaN(start.getTime())) {
    errors.push('अमान्य प्रारंभ तिथि (Invalid start date format)');
  }
  if (isNaN(end.getTime())) {
    errors.push('अमान्य समाप्ति तिथि (Invalid end date format)');
  }
  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
    errors.push('समाप्ति तिथि प्रारंभ तिथि के बाद होनी चाहिए (End date must be after start date)');
  }

  // Eligible Products
  if (!Array.isArray(input.productIds) || input.productIds.length === 0) {
    errors.push('कम से कम एक सब्ज़ी चुनना अनिवार्य है (At least one vegetable must be selected)');
  }

  // Min Quantity
  if (input.minQuantity !== undefined && input.minQuantity !== null && input.minQuantity !== '') {
    const minQty = Number(input.minQuantity);
    if (!Number.isInteger(minQty) || minQty < 1) {
      errors.push('न्यूनतम मात्रा एक सकारात्मक पूर्णांक (कम से कम 1) होनी चाहिए (Minimum quantity must be an integer >= 1)');
    }
  }

  // Max Discount
  if (input.maxDiscount !== undefined && input.maxDiscount !== null && input.maxDiscount !== '') {
    const maxDisc = Number(input.maxDiscount);
    if (isNaN(maxDisc) || maxDisc <= 0) {
      errors.push('अधिकतम छूट सीमा शून्य से अधिक होनी चाहिए (Maximum discount must be greater than 0)');
    }
  }

  // Usage Limit
  if (input.usageLimit !== undefined && input.usageLimit !== null && input.usageLimit !== '') {
    const limit = Number(input.usageLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      errors.push('उपयोग सीमा एक सकारात्मक पूर्णांक (कम से कम 1) होनी चाहिए (Usage limit must be an integer >= 1)');
    }
  }

  // Prevent fixed discounts that exceed or equal product prices
  if (input.discountType === 'fixed' && discountVal > 0 && Array.isArray(input.productIds) && availableProducts.length > 0) {
    const prodMap = new Map(availableProducts.map(p => [p.id, p]));
    for (const pid of input.productIds) {
      const prod = prodMap.get(pid);
      if (prod && prod.price != null && Number(prod.price) > 0) {
        if (discountVal >= Number(prod.price)) {
          errors.push(
            `छूट (₹${discountVal}) '${prod.nameHi || prod.nameEn}' के वर्तमान मूल्य (₹${prod.price}) से अधिक या बराबर नहीं हो सकती (Fixed discount cannot be >= product price)`
          );
          break;
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate the discount for a specific product and single offer
 * @param {object} params
 * @param {object} params.product Product object with price
 * @param {object} params.offer Offer object
 * @param {number} params.quantity Quantity requested (default: 1)
 * @param {Date} [params.now] Timestamp to check against (default: new Date())
 * @returns {object} { eligible: boolean, reason?: string, originalUnitPrice, discountPerUnit, finalUnitPrice, totalDiscount, lineTotal, offerId, offerTitle }
 */
export const calculateOfferDiscount = ({ product, offer, quantity = 1, now = new Date() }) => {
  if (!product || product.price == null || Number(product.price) <= 0) {
    return { eligible: false, reason: 'उत्पाद का भाव निर्धारित नहीं है (Product price unconfigured)' };
  }

  if (!offer) {
    return { eligible: false, reason: 'कोई ऑफ़र प्रदान नहीं किया गया (No offer provided)' };
  }

  if (!offer.isActive) {
    return { eligible: false, reason: 'ऑफ़र निष्क्रिय है (Offer is inactive)' };
  }

  const checkTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const startTime = new Date(offer.startDate).getTime();
  const endTime = new Date(offer.endDate).getTime();

  if (checkTime < startTime) {
    return { eligible: false, reason: 'ऑफ़र अभी शुरू नहीं हुआ है (Offer not started yet)' };
  }

  if (checkTime > endTime) {
    return { eligible: false, reason: 'ऑफ़र की अवधि समाप्त हो चुकी है (Offer has expired)' };
  }

  const intQty = Math.max(1, Math.floor(quantity));
  if (offer.minQuantity && intQty < offer.minQuantity) {
    return {
      eligible: false,
      reason: `न्यूनतम मात्रा ${offer.minQuantity} होनी चाहिए (Requires min quantity of ${offer.minQuantity})`,
      minQuantity: offer.minQuantity,
    };
  }

  if (offer.usageLimit != null && (offer.usageCount || 0) >= offer.usageLimit) {
    return { eligible: false, reason: 'ऑफ़र की उपयोग सीमा पूरी हो चुकी है (Offer usage limit reached)' };
  }

  const originalUnitPrice = roundMoney(Number(product.price));

  // 1. Calculate discount per unit based on discountType
  let calculatedUnitDiscount = 0;
  if (offer.discountType === 'percentage') {
    calculatedUnitDiscount = (originalUnitPrice * Number(offer.discountValue)) / 100;
  } else {
    calculatedUnitDiscount = Number(offer.discountValue);
  }

  // 2. Apply max discount cap per unit if configured
  let appliedUnitDiscount = calculatedUnitDiscount;
  if (offer.maxDiscount != null && Number(offer.maxDiscount) > 0) {
    appliedUnitDiscount = Math.min(appliedUnitDiscount, Number(offer.maxDiscount));
  }

  // 3. Guard: ensure final unit price never drops below 1 paisa (₹0.01)
  appliedUnitDiscount = Math.min(appliedUnitDiscount, Math.max(0, originalUnitPrice - 0.01));
  appliedUnitDiscount = roundMoney(appliedUnitDiscount);

  // 4. Final selling unit price
  const finalUnitPrice = roundMoney(originalUnitPrice - appliedUnitDiscount);

  // 5. Line totals
  const totalDiscount = roundMoney(appliedUnitDiscount * intQty);
  const lineTotal = roundMoney(finalUnitPrice * intQty);

  return {
    eligible: true,
    originalUnitPrice,
    discountPerUnit: appliedUnitDiscount,
    finalUnitPrice,
    totalDiscount,
    lineTotal,
    quantity: intQty,
    offerId: offer.id,
    offerTitle: offer.title,
    offerDescription: offer.description || null,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    endDate: offer.endDate,
    minQuantity: offer.minQuantity || 1,
  };
};

/**
 * Resolves the single best eligible offer for a product among all currently active offers
 * Conflict Rule: Non-stacking best customer price (highest unit discount amount)
 * Tie-breaker: earliest ending date (expiring soonest), then latest created
 * 
 * @param {object} params
 * @param {object} params.product
 * @param {Array} params.activeOffers List of active offers (with .products / productIds)
 * @param {number} [params.quantity=1]
 * @param {Date} [params.now=new Date()]
 * @returns {object|null} Best eligible calculation result or null
 */
export const resolveBestOfferForProduct = ({ product, activeOffers = [], quantity = 1, now = new Date() }) => {
  if (!product || !Array.isArray(activeOffers) || activeOffers.length === 0) {
    return null;
  }

  // Filter offers that include this product
  const applicableOffers = activeOffers.filter(offer => {
    if (Array.isArray(offer.products)) {
      return offer.products.some(p => (p.productId || p.id) === product.id);
    }
    if (Array.isArray(offer.productIds)) {
      return offer.productIds.includes(product.id);
    }
    return false;
  });

  if (applicableOffers.length === 0) return null;

  const eligibleCalculations = [];

  for (const offer of applicableOffers) {
    const calc = calculateOfferDiscount({ product, offer, quantity, now });
    if (calc.eligible && calc.discountPerUnit > 0) {
      eligibleCalculations.push({
        ...calc,
        rawOffer: offer,
      });
    }
  }

  if (eligibleCalculations.length === 0) return null;

  // Sort by best customer savings (descending discountPerUnit), then earliest expiry, then newest
  eligibleCalculations.sort((a, b) => {
    if (b.discountPerUnit !== a.discountPerUnit) {
      return b.discountPerUnit - a.discountPerUnit; // Highest discount wins
    }
    // Tie-breaker 1: Earliest expiration date (expiring first)
    const endA = new Date(a.rawOffer.endDate).getTime();
    const endB = new Date(b.rawOffer.endDate).getTime();
    if (endA !== endB) return endA - endB;
    // Tie-breaker 2: Latest created
    const createdA = new Date(a.rawOffer.createdAt || 0).getTime();
    const createdB = new Date(b.rawOffer.createdAt || 0).getTime();
    return createdB - createdA;
  });

  const best = eligibleCalculations[0];
  delete best.rawOffer;
  return best;
};
