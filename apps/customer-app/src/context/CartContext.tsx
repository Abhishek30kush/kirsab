import React, { createContext, useContext, useMemo, useState } from 'react';
import { CartCalculationResult, CartItem, Product } from '../../../../packages/shared-types/src/index';
import { calculateCartTotals } from '../../../../packages/shared-utils/src/index';

interface CartContextType {
  items: CartItem[];
  totals: CartCalculationResult;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  reorder: (orderItems: { productId?: string | null; quantity: number }[], allProducts: Product[]) => void;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, quantity = 1) => {
    if (!product || !product.inStock) return;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return updated;
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => setItems([]);

  const getItemQuantity = (productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const reorder = (
    orderItems: { productId?: string | null; quantity: number }[],
    allProducts: Product[]
  ) => {
    const newCartItems: CartItem[] = [];
    for (const oi of orderItems) {
      if (!oi.productId) continue;
      const found = allProducts.find((p) => p.id === oi.productId);
      if (found && found.inStock && found.isConfigured) {
        newCartItems.push({ product: found, quantity: oi.quantity || 1 });
      }
    }
    if (newCartItems.length > 0) {
      setItems(newCartItems);
    }
  };

  // Authoritative totals using ₹49 min order and ₹99 free delivery
  const totals = useMemo(() => {
    return calculateCartTotals(items, {
      minOrderValue: 49,
      freeDeliveryThreshold: 99,
      standardDeliveryFee: 10,
    });
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        totals,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
        reorder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

