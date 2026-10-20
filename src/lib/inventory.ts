import { supabase } from '@/lib/supabase';
import type { Product, ProductVariantInventory } from '@/types';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface InventorySnapshot {
  products: Record<string, {
    stockQuantity: number;
    sizes: string[];
    sizeRequired: boolean;
    variants: ProductVariantInventory[];
  }>;
  variants: Record<string, number>;
}

export function variantStockKey(productId: string, size: string, color: string): string {
  return JSON.stringify([productId, size, color]);
}

export function hasSizeVariants(product: Pick<Product, 'sizeRequired' | 'sizes'>): boolean {
  return product.sizeRequired ?? product.sizes.length > 0;
}

export function getVariantStock(
  product: Pick<Product, 'id' | 'sizeRequired' | 'sizes' | 'stockQuantity' | 'variantInventory'>,
  size: string,
  color: string,
): number {
  if (!hasSizeVariants(product)) return product.stockQuantity ?? 0;
  return product.variantInventory?.find(
    (variant) => variant.size === size && variant.color === color && variant.enabled,
  )?.availableQuantity ?? 0;
}

export function getStockStatus(quantity: number | null | undefined): StockStatus {
  if (!quantity || quantity < 1) return 'Out of Stock';
  return quantity <= 5 ? 'Low Stock' : 'In Stock';
}

export async function getInventorySnapshot(
  productIds: string[],
): Promise<InventorySnapshot> {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length === 0) return { products: {}, variants: {} };

  const [{ data: products, error: productError }, { data: variants, error: variantError }] =
    await Promise.all([
      supabase
    .from('products')
        .select('id, stock_quantity, sizes')
        .in('id', uniqueIds),
      supabase
        .from('product_variant_inventory')
        .select('product_id, size, color, available_quantity, enabled')
        .in('product_id', uniqueIds),
    ]);

  if (productError) throw productError;
  if (variantError) throw variantError;

  const rowsByProduct = new Map<string, ProductVariantInventory[]>();
  const variantStocks: Record<string, number> = {};
  for (const row of variants ?? []) {
    const productId = String(row.product_id);
    const variant = {
      size: String(row.size),
      color: String(row.color ?? ''),
      availableQuantity: Number(row.available_quantity ?? 0),
      enabled: Boolean(row.enabled),
    };
    const rows = rowsByProduct.get(productId) ?? [];
    rows.push(variant);
    rowsByProduct.set(productId, rows);
    if (variant.enabled) {
      variantStocks[variantStockKey(productId, variant.size, variant.color)] =
        variant.availableQuantity;
    }
  }

  const productStocks: InventorySnapshot['products'] = {};
  for (const row of products ?? []) {
    const id = String(row.id);
    const legacySizes: string[] = Array.isArray(row.sizes) ? row.sizes : [];
    const productVariants = rowsByProduct.get(id) ?? [];
    const sizeRequired = legacySizes.length > 0;
    const enabledSizes = [...new Set(
      productVariants.filter((variant) => variant.enabled).map((variant) => variant.size),
    )].sort((a, b) => {
      const order = ['S', 'M', 'L', 'XL', 'XXL'];
      return order.indexOf(a) - order.indexOf(b);
    });
    productStocks[id] = {
      stockQuantity: sizeRequired
        ? productVariants
            .filter((variant) => variant.enabled)
            .reduce((total, variant) => total + variant.availableQuantity, 0)
        : Number(row.stock_quantity ?? 0),
      sizes: enabledSizes,
      sizeRequired,
      variants: productVariants,
    };
  }

  return { products: productStocks, variants: variantStocks };
}

export function getStockStatusClasses(status: StockStatus): string {
  if (status === 'In Stock') return 'text-green-700';
  if (status === 'Low Stock') return 'text-amber-700';
  return 'text-red-700';
}
