import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  loadCartFromStorage, 
  saveCartToStorage, 
  getEnrichedCartItems, 
  calculateCartTotals 
} from '../utils/cart';
import { INITIAL_PRODUCTS } from '../data/products';
import { STORE_CONFIG } from '../config/store';
import { isPriceConfigured } from '../utils/currency';
import { api } from '../utils/api';
import { useLanguage } from './LanguageContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { t, isHindi } = useLanguage();
  // Master products state (fetched from backend PostgreSQL API)
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [storeSettings, setStoreSettings] = useState(STORE_CONFIG);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Cart items stored as array of { productId: string, quantity: number }
  const [cartItems, setCartItems] = useState(() => loadCartFromStorage());

  // UI state for drawer and checkout modal
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch live products and settings from server
  const fetchLiveData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [prodRes, settingsRes] = await Promise.allSettled([
        api.getProducts(),
        api.getSettings(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        setProducts(prodRes.value.data);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setStoreSettings(settingsRes.value.data);
      }
    } catch (err) {
      console.warn('Could not connect to backend server, using fallback local master data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // Synchronize cart with localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(cartItems);
  }, [cartItems]);

  // Toast timer cleanup
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (message) => {
    setToastMessage(message);
  };

  // Enriched items containing master product details and validation flags
  const enrichedItems = useMemo(() => {
    return getEnrichedCartItems(cartItems, products);
  }, [cartItems, products]);

  // Order totals strictly calculated from master product definitions & store settings
  const totals = useMemo(() => {
    return calculateCartTotals(enrichedItems, storeSettings);
  }, [enrichedItems, storeSettings]);

  // Cart mutation methods
  const addToCart = (productId, quantity = 1) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!isPriceConfigured(product)) {
      showToast(isHindi ? 'यह सब्ज़ी अभी ऑर्डर के लिए उपलब्ध नहीं है' : 'This item is currently not available for order');
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => 
          item.productId === productId 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { productId, quantity }];
    });

    const displayName = isHindi ? `${product.nameHi} (${product.nameEn})` : `${product.nameEn} (${product.nameHi})`;
    showToast(`${displayName} ${t('addedToast')}`);
  };

  const updateQuantity = (productId, newQuantity) => {
    const intQty = Math.floor(Number(newQuantity));
    if (isNaN(intQty) || intQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(prev => 
      prev.map(item => 
        item.productId === productId 
          ? { ...item, quantity: Math.min(intQty, 20) } 
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    const product = products.find(p => p.id === productId);
    setCartItems(prev => prev.filter(item => item.productId !== productId));
    if (product) {
      const displayName = isHindi ? product.nameHi : product.nameEn;
      showToast(`${displayName} ${t('removedToast')}`);
    }
  };

  const clearCart = () => {
    setCartItems([]);
    showToast(isHindi ? 'कार्ट खाली कर दिया गया' : 'Cart cleared');
  };

  const getItemQuantity = (productId) => {
    const item = cartItems.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    products,
    storeSettings,
    isLoadingData,
    refreshCatalog: fetchLiveData,
    cartItems,
    enrichedItems,
    totals,
    isCartOpen,
    setIsCartOpen,
    isCheckoutOpen,
    setIsCheckoutOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getItemQuantity,
    toastMessage,
    showToast,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
