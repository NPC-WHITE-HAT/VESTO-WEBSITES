import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Product } from '@/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, size: string, color: string, qty?: number) => boolean;
  updateQty: (index: number, qty: number) => void;
  updateStock: (productId: string, stockQuantity: number) => void;
  removeItem: (index: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'vesto-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem: CartContextValue['addItem'] = (product, size, color, qty = 1) => {
    const productQuantity = items
      .filter((item) => item.product.id === product.id)
      .reduce((total, item) => total + item.quantity, 0);
    const stockQuantity = product.stockQuantity ?? 0;
    if (
      !Number.isInteger(qty) ||
      qty < 1 ||
      productQuantity + qty > stockQuantity
    ) {
      return false;
    }

    setItems((prev) => {
      const currentProductQuantity = prev
        .filter((item) => item.product.id === product.id)
        .reduce((total, item) => total + item.quantity, 0);
      if (currentProductQuantity + qty > stockQuantity) return prev;

      const idx = prev.findIndex(
        (i) => i.product.id === product.id && i.size === size && i.color === color,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { product, size, color, quantity: qty }];
    });
    return true;
  };

  const updateQty: CartContextValue['updateQty'] = (index, qty) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((_, i) => i !== index);
      if (!Number.isInteger(qty)) return prev;
      const item = prev[index];
      if (!item) return prev;
      const otherQuantity = prev
        .filter((current, currentIndex) =>
          current.product.id === item.product.id && currentIndex !== index,
        )
        .reduce((total, current) => total + current.quantity, 0);
      if (
        qty > item.quantity &&
        qty + otherQuantity > (item.product.stockQuantity ?? 0)
      ) {
        return prev;
      }
      const next = [...prev];
      next[index] = { ...next[index], quantity: qty };
      return next;
    });
  };

  const updateStock: CartContextValue['updateStock'] = (productId, stockQuantity) => {
    setItems((prev) => {
      if (
        !prev.some(
          (item) =>
            item.product.id === productId &&
            item.product.stockQuantity !== stockQuantity,
        )
      ) {
        return prev;
      }
      return prev.map((item) =>
        item.product.id === productId
          ? { ...item, product: { ...item.product, stockQuantity } }
          : item,
      );
    });
  };

  const removeItem: CartContextValue['removeItem'] = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clear = () => setItems([]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.quantity * i.product.price, 0),
      addItem,
      updateQty,
      updateStock,
      removeItem,
      clear,
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
