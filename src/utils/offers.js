/**
 * Client-side offer calculations and discount helpers
 * Synchronized with server-side discountCalculator logic
 */

export const roundMoney = (val) => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate offer discount for a single product and offer
 */
export const calculateClientOfferDiscount = ({ product, offer, quantity = 1 }) => {
  if (!product || product.price == null || Number(product.price) <= 0 || !offer) {
    return { eligible: false };
  }

  if (!offer.isActive && offer.isActive !== undefined) {
    return { eligible: false, reason: 'Offer inactive' };
  }

  const now = Date.now();
  const startTime = new Date(offer.startDate).getTime();
  const endTime = new Date(offer.endDate).getTime();

  if (now < startTime) return { eligible: false, reason: 'Upcoming' };
  if (now > endTime) return { eligible: false, reason: 'Expired' };

  const intQty = Math.max(1, Math.floor(quantity));
  if (offer.minQuantity && intQty < offer.minQuantity) {
    return {
      eligible: false,
      reason: 'min_qty_not_met',
      minQuantity: offer.minQuantity,
      shortfall: offer.minQuantity - intQty,
    };
  }

  const originalPrice = roundMoney(Number(product.price));
  let unitDiscount = 0;

  if (offer.discountType === 'percentage') {
    unitDiscount = (originalPrice * Number(offer.discountValue)) / 100;
  } else {
    unitDiscount = Number(offer.discountValue);
  }

  if (offer.maxDiscount != null && Number(offer.maxDiscount) > 0) {
    unitDiscount = Math.min(unitDiscount, Number(offer.maxDiscount));
  }

  unitDiscount = Math.min(unitDiscount, Math.max(0, originalPrice - 0.01));
  unitDiscount = roundMoney(unitDiscount);

  const finalUnitPrice = roundMoney(originalPrice - unitDiscount);
  const totalDiscount = roundMoney(unitDiscount * intQty);
  const lineTotal = roundMoney(finalUnitPrice * intQty);

  return {
    eligible: true,
    originalUnitPrice: originalPrice,
    discountPerUnit: unitDiscount,
    finalUnitPrice,
    totalDiscount,
    lineTotal,
    quantity: intQty,
    offerId: offer.id,
    offerTitle: offer.title,
    offerDescription: offer.description,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    endDate: offer.endDate,
    minQuantity: offer.minQuantity || 1,
  };
};

/**
 * Resolve best eligible offer for a product among given active offers
 */
export const resolveClientBestOffer = ({ product, offers = [], quantity = 1 }) => {
  if (!product || !Array.isArray(offers) || offers.length === 0) return null;

  const applicable = offers.filter(offer => {
    if (Array.isArray(offer.products)) {
      return offer.products.some(p => (p.productId || p.id) === product.id);
    }
    if (Array.isArray(offer.productIds)) {
      return offer.productIds.includes(product.id);
    }
    return false;
  });

  if (applicable.length === 0) return null;

  const eligibleCalculations = [];

  for (const offer of applicable) {
    const calc = calculateClientOfferDiscount({ product, offer, quantity });
    if (calc.eligible && calc.discountPerUnit > 0) {
      eligibleCalculations.push({
        ...calc,
        rawOffer: offer,
      });
    }
  }

  if (eligibleCalculations.length === 0) {
    // Check if there is an offer where only minQuantity is not met yet
    const minQtyOffer = applicable.find(o => {
      const c = calculateClientOfferDiscount({ product, offer: o, quantity });
      return c.reason === 'min_qty_not_met';
    });

    if (minQtyOffer) {
      return {
        isPendingMinQty: true,
        offer: minQtyOffer,
        minQuantity: minQtyOffer.minQuantity,
        neededQuantity: minQtyOffer.minQuantity - quantity,
      };
    }

    return null;
  }

  eligibleCalculations.sort((a, b) => {
    if (b.discountPerUnit !== a.discountPerUnit) {
      return b.discountPerUnit - a.discountPerUnit;
    }
    const endA = new Date(a.rawOffer.endDate).getTime();
    const endB = new Date(b.rawOffer.endDate).getTime();
    return endA - endB;
  });

  const best = eligibleCalculations[0];
  delete best.rawOffer;
  return best;
};
