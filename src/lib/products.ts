import { supabase } from '@/lib/supabase';
import { getInventorySnapshot } from '@/lib/inventory';
import type { Product } from '@/types';

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  let inventory: Awaited<ReturnType<typeof getInventorySnapshot>> | null = null;
  try {
    inventory = await getInventorySnapshot((data ?? []).map((row) => String(row.id)));
  } catch (inventoryError) {
    console.error('Could not load product variant inventory:', inventoryError);
  }

  return (data ?? []).map((product) => {
    const currentInventory = inventory?.products[String(product.id)];
    const legacySizes = Array.isArray(product.sizes)
      ? product.sizes
      : Array.isArray(product.size)
        ? product.size
        : [];
    const sizeRequired = currentInventory?.sizeRequired ?? legacySizes.length > 0;
    return {
      id: String(product.id),
      name: product.name,
      price: Number(product.price),
      category: product.category,
      isNew: Boolean(product.is_new),
      image: product.image,
      description: product.description,
      colors: product.colors || [],
      sizes: currentInventory?.sizes ?? legacySizes,
      sizeRequired,
      variantInventory: currentInventory?.variants ?? [],
      fabric: product.fabric,
      stockQuantity: currentInventory?.stockQuantity ??
        (sizeRequired ? 0 : Number(product.stock_quantity ?? 0)),
    };
  });
}