import { STORE_CONFIG } from '../config/store';
import { INITIAL_PRODUCTS } from '../data/products';
import { isPriceConfigured } from './currency';
import { resolveClientBestOffer, roundMoney } from './offers';

export const CART_STORAGE_KEY = 'kirsab_cart_items_v1';

/**
 * Loads cart from localStorage safely
 * @returns {Array} Array of cart items { productId, quantity }
 */
export const loadCartFromStorage = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Sanitize items against master products: must be valid integer qty >= 1
    return parsed.filter(item => {
      return (
        item &&
        typeof item.productId === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        Number.isInteger(item.quantity)
      );
    });
  } catch (err) {
    console.error('Failed to parse cart from storage:', err);
    return [];
  }
};

/**
 * Saves cart to localStorage safely
 * @param {Array} items 
 */
export const saveCartToStorage = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save cart to storage:', err);
  }
};

/**
 * Resolves full product info, active offers, and calculates line totals
 * @param {Array} cartItems Array of { productId, quantity }
 * @param {Array} productList Master products catalog
 * @param {Array} offers Active store offers
 * @returns {Array} Array of enriched item objects
 */
export const getEnrichedCartItems = (
  cartItems = [],
  productList = INITIAL_PRODUCTS,
  offers = []
) => {
  return cartItems
    .map(item => {
      const product = productList.find(p => p.id === item.productId);
      if (!product) return null;

      const configured = isPriceConfigured(product);
      const originalUnitPrice = configured ? roundMoney(Number(product.price)) : null;

      // Check if any active offer applies to this product at this quantity
      const offerResolution = configured
        ? resolveClientBestOffer({ product, offers, quantity: item.quantity })
        : null;

      let unitPrice = originalUnitPrice;
      let discountPerUnit = 0;
      let discountAmount = 0;
      let appliedOffer = null;
      let pendingOfferNotice = null;

      if (offerResolution && offerResolution.eligible && offerResolution.discountPerUnit > 0) {
        unitPrice = offerResolution.finalUnitPrice;
        discountPerUnit = offerResolution.discountPerUnit;
        discountAmount = offerResolution.totalDiscount;
        appliedOffer = offerResolution;
      } else if (offerResolution && offerResolution.isPendingMinQty) {
        pendingOfferNotice = offerResolution;
      }

      const lineTotal = configured ? roundMoney(unitPrice * item.quantity) : 0;
      const originalLineTotal = configured ? roundMoney(originalUnitPrice * item.quantity) : 0;

      return {
        ...item,
        product,
        originalUnitPrice,
        unitPrice,
        discountPerUnit,
        discountAmount,
        appliedOffer,
        pendingOfferNotice,
        lineTotal,
        originalLineTotal,
        isValidForCheckout: configured && product.inStock,
      };
    })
    .filter(Boolean);
};

/**
 * Computes all order totals strictly from master product data and active offers
 * Never trusts unverified or client-manipulated subtotals
 * @param {Array} enrichedItems 
 * @param {object} storeConfig
 * @returns {object} { subtotal, originalSubtotal, discountTotal, deliveryFee, finalTotal, itemCount, isEligible, minOrderShortfall }
 */
export const calculateCartTotals = (enrichedItems = [], storeConfig = STORE_CONFIG) => {
  const pricingRules = storeConfig?.pricingRules || STORE_CONFIG.pricingRules;
  const { minOrderValue = 150, standardDeliveryFee = 10, freeDeliveryThreshold = 299 } = pricingRules;

  // Only sum items that are in stock and have configured valid prices
  const validItems = enrichedItems.filter(item => item.isValidForCheckout);
  
  const originalSubtotal = roundMoney(
    validItems.reduce((acc, item) => acc + (item.originalLineTotal || item.lineTotal), 0)
  );
  const discountTotal = roundMoney(
    validItems.reduce((acc, item) => acc + (item.discountAmount || 0), 0)
  );
  const subtotal = roundMoney(
    validItems.reduce((acc, item) => acc + item.lineTotal, 0)
  );
  const itemCount = validItems.reduce((acc, item) => acc + item.quantity, 0);

  // Delivery fee logic based on payable vegetable subtotal
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

  // Check if any item in cart is unavailable or unconfigured
  const hasInvalidItems = enrichedItems.some(item => !item.isValidForCheckout);

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
    isFreeDelivery: subtotal >= freeDeliveryThreshold && subtotal > 0,
    hasInvalidItems,
    canProceedToCheckout: subtotal > 0 && isMinOrderMet && !hasInvalidItems,
  };
};

