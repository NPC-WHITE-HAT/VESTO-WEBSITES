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

  const inventory = await getInventorySnapshot((data ?? []).map((row) => String(row.id)));
  return (data ?? []).map((product) => {
    const currentInventory = inventory.products[String(product.id)];
    return {
      id: String(product.id),
      name: product.name,
      price: Number(product.price),
      category: product.category,
      isNew: Boolean(product.is_new),
      image: product.image,
      description: product.description,
      colors: product.colors || [],
      sizes: currentInventory?.sizes ?? [],
      sizeRequired: currentInventory?.sizeRequired ?? Boolean(product.sizes?.length),
      variantInventory: currentInventory?.variants ?? [],
      fabric: product.fabric,
      stockQuantity: currentInventory?.stockQuantity ?? 0,
    };
  });
}