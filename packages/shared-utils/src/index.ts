import { CartCalculationResult, OrderStatus, Product } from '@kirsab/shared-types';

/**
 * Rounds money amounts strictly to 2 decimal places to avoid floating point issues
 */
export function roundMoney(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * Format Indian Rupee currency with symbol
 */
export function formatCurrency(amount: number): string {
  const rounded = roundMoney(amount);
  return `₹${rounded.toFixed(rounded % 1 === 0 ? 0 : 2)}`;
}

/**
 * Format 10-digit Indian phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

/**
 * Clean phone number for WhatsApp deep-linking
 */
export function cleanWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

/**
 * Authoritative cart total and delivery calculation
 * Follows KIRSAB verified business rules:
 * - minOrderValue: ₹49
 * - freeDeliveryThreshold: ₹99
 * - standardDeliveryFee: ₹10
 */
export function calculateCartTotals(
  items: { product: Product; quantity: number }[],
  rules: {
    minOrderValue?: number;
    freeDeliveryThreshold?: number;
    standardDeliveryFee?: number;
  } = {}
): CartCalculationResult {
  const minOrderValue = rules.minOrderValue ?? 49;
  const freeDeliveryThreshold = rules.freeDeliveryThreshold ?? 99;
  const standardDeliveryFee = rules.standardDeliveryFee ?? 10;

  // Filter in-stock and configured products
  const validItems = items.filter(
    (item) => item.product && item.product.inStock && item.product.isConfigured && (item.product.price !== null)
  );

  let originalSubtotal = 0;
  let subtotal = 0;
  let discountTotal = 0;
  let itemCount = 0;

  for (const item of validItems) {
    const qty = item.quantity;
    itemCount += qty;
    const masterPrice = item.product.price || 0;
    const effectivePrice = item.product.hasActiveOffer && item.product.discountedPrice !== null && item.product.discountedPrice !== undefined
      ? item.product.discountedPrice
      : masterPrice;

    const lineOriginal = roundMoney(masterPrice * qty);
    const lineEffective = roundMoney(effectivePrice * qty);
    const lineDiscount = Math.max(0, roundMoney(lineOriginal - lineEffective));

    originalSubtotal += lineOriginal;
    subtotal += lineEffective;
    discountTotal += lineDiscount;
  }

  originalSubtotal = roundMoney(originalSubtotal);
  subtotal = roundMoney(subtotal);
  discountTotal = roundMoney(discountTotal);

  let deliveryFee = 0;
  if (subtotal > 0) {
    if (subtotal >= freeDeliveryThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = standardDeliveryFee;
    }
  }

  const finalTotal = roundMoney(subtotal + deliveryFee);
  const isMinOrderMet = subtotal >= minOrderValue;
  const minOrderShortfall = Math.max(0, roundMoney(minOrderValue - subtotal));
  const freeDeliveryShortfall = Math.max(0, roundMoney(freeDeliveryThreshold - subtotal));
  const isFreeDelivery = subtotal >= freeDeliveryThreshold && subtotal > 0;
  const canProceedToCheckout = subtotal > 0 && isMinOrderMet && validItems.length === items.length;

  return {
    subtotal,
    originalSubtotal,
    discountTotal,
    deliveryFee,
    finalTotal,
    itemCount,
    isMinOrderMet,
    minOrderShortfall,
    freeDeliveryThreshold,
    freeDeliveryShortfall,
    isFreeDelivery,
    canProceedToCheckout,
  };
}

/**
 * Order status metadata (English + Hindi, color, timeline index)
 */
export interface StatusMeta {
  labelEn: string;
  labelHi: string;
  badgeBg: string;
  badgeText: string;
  stepIndex: number;
}

export const STATUS_META_MAP: Record<OrderStatus, StatusMeta> = {
  pending: {
    labelEn: 'Order Placed',
    labelHi: 'ऑर्डर दर्ज हुआ',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    stepIndex: 1,
  },
  confirmed: {
    labelEn: 'Order Confirmed',
    labelHi: 'ऑर्डर स्वीकृत',
    badgeBg: '#E0E7FF',
    badgeText: '#3730A3',
    stepIndex: 2,
  },
  preparing: {
    labelEn: 'Preparing Fresh Items',
    labelHi: 'सब्ज़ियां चुनी जा रही हैं',
    badgeBg: '#EDE9FE',
    badgeText: '#5B21B6',
    stepIndex: 3,
  },
  packed: {
    labelEn: 'Order Packed',
    labelHi: 'ऑर्डर पैक हो गया',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
    stepIndex: 3,
  },
  ready_for_dispatch: {
    labelEn: 'Ready for Dispatch',
    labelHi: 'डिलीवरी हेतु तैयार',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
    stepIndex: 4,
  },
  out_for_delivery: {
    labelEn: 'Out for Delivery',
    labelHi: 'रास्ते में है (डिलीवरी जारी)',
    badgeBg: '#FCE7F3',
    badgeText: '#9D174D',
    stepIndex: 5,
  },
  delivered: {
    labelEn: 'Delivered Successfully',
    labelHi: 'सफलतापूर्वक डिलीवर हुआ',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
    stepIndex: 6,
  },
  cancelled: {
    labelEn: 'Cancelled',
    labelHi: 'रद्द किया गया',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
    stepIndex: 0,
  },
};

export function getOrderStatusMeta(status: OrderStatus | string): StatusMeta {
  return (
    STATUS_META_MAP[status as OrderStatus] || {
      labelEn: status,
      labelHi: status,
      badgeBg: '#F3F4F6',
      badgeText: '#374151',
      stepIndex: 0,
    }
  );
}

/**
 * Generate WhatsApp URL for customer contacting assigned delivery partner
 */
export function generateCustomerToPartnerWhatsAppUrl(
  partnerPhone: string,
  orderNumber: string,
  customerName: string,
  address: string
): string {
  const cleanPhone = cleanWhatsAppNumber(partnerPhone);
  const message = `नमस्ते, मैं किरसाब ग्राहक ${customerName} बोल रहा/रही हूँ। मेरे ऑर्डर #${orderNumber} (${address}) की डिलीवरी के सम्बंध में संपर्क कर रहा/रही हूँ।`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Generate WhatsApp URL for delivery partner contacting customer
 */
export function generatePartnerToCustomerWhatsAppUrl(
  customerPhone: string,
  orderNumber: string,
  partnerName: string
): string {
  const cleanPhone = cleanWhatsAppNumber(customerPhone);
  const message = `नमस्ते! मैं किरसाब से आपका डिलीवरी पार्टनर ${partnerName} हूँ। मैं आपका ऑर्डर #${orderNumber} लेकर आपके पते पर पहुँच रहा हूँ। कृपया अपना 6-अंकों का डिलीवरी पिन तैयार रखें। धन्यवाद!`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Format Date to readable Indian format
 */
export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

