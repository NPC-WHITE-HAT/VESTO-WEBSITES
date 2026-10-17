import { supabase } from '@/lib/supabase';

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export function getStockStatus(quantity: number | null | undefined): StockStatus {
  if (!quantity || quantity < 1) return 'Out of Stock';
  return quantity <= 5 ? 'Low Stock' : 'In Stock';
}

export async function getStockQuantities(
  productIds: string[],
): Promise<Record<string, number>> {
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('products')
    .select('id, stock_quantity')
    .in('id', uniqueIds);

  if (error) throw error;

  const stockById = Object.fromEntries(
    (data ?? []).map((product) => [
      String(product.id),
      Number(product.stock_quantity ?? 0),
    ]),
  );

  for (const id of uniqueIds) {
    if (!(id in stockById)) stockById[id] = 0;
  }

  return stockById;
}

export function getStockStatusClasses(status: StockStatus): string {
  if (status === 'In Stock') return 'text-green-700';
  if (status === 'Low Stock') return 'text-amber-700';
  return 'text-red-700';
}
