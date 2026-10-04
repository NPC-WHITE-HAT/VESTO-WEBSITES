import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error loading products:', error);
    return [];
  }

  return (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    isNew: product.is_new,
    image: product.image,
    description: product.description,
    colors: product.colors || [],
    sizes: product.size || [],
    fabric: product.fabric,
  }));
}