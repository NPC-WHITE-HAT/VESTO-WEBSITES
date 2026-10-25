import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getVariantStock, hasSizeVariants, type InventorySnapshot } from '@/lib/inventory';
import type { CartItem, Product } from '@/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, size: string, color: string, qty?: number) => boolean;
  updateQty: (index: number, qty: number) => void;
  updateStock: (inventory: InventorySnapshot) => void;
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

  const addItem = useCallback<CartContextValue['addItem']>((product, size, color, qty = 1) => {
    if (hasSizeVariants(product) && !size) return false;
    const variantQuantity = items
      .filter((item) =>
        item.product.id === product.id &&
        (!hasSizeVariants(product) || (item.size === size && item.color === color)),
      )
      .reduce((total, item) => total + item.quantity, 0);
    const stockQuantity = getVariantStock(product, size, color);
    if (
      !Number.isInteger(qty) ||
      qty < 1 ||
      variantQuantity + qty > stockQuantity
    ) {
      return false;
    }

    setItems((prev) => {
      const currentVariantQuantity = prev
        .filter((item) =>
          item.product.id === product.id &&
          (!hasSizeVariants(product) || (item.size === size && item.color === color)),
        )
        .reduce((total, item) => total + item.quantity, 0);
      if (currentVariantQuantity + qty > stockQuantity) return prev;

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
  }, [items]);

  const updateQty = useCallback<CartContextValue['updateQty']>((index, qty) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((_, i) => i !== index);
      if (!Number.isInteger(qty)) return prev;
      const item = prev[index];
      if (!item) return prev;
      const otherQuantity = prev
        .filter((current, currentIndex) =>
          current.product.id === item.product.id &&
          (!hasSizeVariants(item.product) ||
            (current.size === item.size && current.color === item.color)) &&
          currentIndex !== index,
        )
        .reduce((total, current) => total + current.quantity, 0);
      if (
        qty > item.quantity &&
        qty + otherQuantity > getVariantStock(item.product, item.size, item.color)
      ) {
        return prev;
      }
      const next = [...prev];
      next[index] = { ...next[index], quantity: qty };
      return next;
    });
  }, []);

  const updateStock = useCallback<CartContextValue['updateStock']>((inventory) => {
    setItems((prev) => {
      return prev.map((item) => {
        const productInventory = inventory.products[item.product.id];
        if (!productInventory) return item;
        return {
          ...item,
          size: productInventory.sizeRequired ? item.size : '',
          product: {
            ...item.product,
            stockQuantity: productInventory.stockQuantity,
            sizes: productInventory.sizes,
            sizeRequired: productInventory.sizeRequired,
            variantInventory: productInventory.variants,
          },
        };
      });
    });
  }, []);

  const removeItem = useCallback<CartContextValue['removeItem']>((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setItems([]), []);

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
    [items, addItem, updateQty, updateStock, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
