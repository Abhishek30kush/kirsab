import { STORE_CONFIG } from '../config/store';
import { INITIAL_PRODUCTS } from '../data/products';
import { isPriceConfigured } from './currency';

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
      const product = INITIAL_PRODUCTS.find(p => p.id === item.productId);
      return (
        product &&
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
 * Resolves full product info and calculates line totals
 * @param {Array} cartItems Array of { productId, quantity }
 * @param {Array} productList Master products catalog
 * @returns {Array} Array of enriched item objects
 */
export const getEnrichedCartItems = (cartItems = [], productList = INITIAL_PRODUCTS) => {
  return cartItems
    .map(item => {
      const product = productList.find(p => p.id === item.productId);
      if (!product) return null;

      const configured = isPriceConfigured(product);
      const unitPrice = configured ? product.price : null;
      const lineTotal = configured ? unitPrice * item.quantity : 0;

      return {
        ...item,
        product,
        unitPrice,
        lineTotal,
        isValidForCheckout: configured && product.inStock,
      };
    })
    .filter(Boolean);
};

/**
 * Computes all order totals strictly from master product data
 * Never trusts unverified or client-manipulated subtotals
 * @param {Array} enrichedItems 
 * @returns {object} { subtotal, deliveryFee, finalTotal, itemCount, isEligible, minOrderShortfall }
 */
export const calculateCartTotals = (enrichedItems = [], storeConfig = STORE_CONFIG) => {
  const pricingRules = storeConfig?.pricingRules || STORE_CONFIG.pricingRules;
  const { minOrderValue = 150, standardDeliveryFee = 10, freeDeliveryThreshold = 299 } = pricingRules;

  // Only sum items that are in stock and have configured valid prices
  const validItems = enrichedItems.filter(item => item.isValidForCheckout);
  
  const subtotal = validItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const itemCount = validItems.reduce((acc, item) => acc + item.quantity, 0);

  // Delivery fee logic
  let deliveryFee = 0;
  if (subtotal > 0) {
    if (subtotal >= freeDeliveryThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = standardDeliveryFee;
    }
  }

  const finalTotal = subtotal + deliveryFee;
  const isMinOrderMet = subtotal >= minOrderValue;
  const minOrderShortfall = Math.max(0, minOrderValue - subtotal);
  const freeDeliveryShortfall = Math.max(0, freeDeliveryThreshold - subtotal);

  // Check if any item in cart is unavailable or unconfigured
  const hasInvalidItems = enrichedItems.some(item => !item.isValidForCheckout);

  return {
    subtotal,
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
