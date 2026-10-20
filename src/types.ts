export type Category = 'T-Shirts' | 'Shirts' | 'Polos' | 'Trousers' | 'Jeans';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductVariantInventory {
  size: string;
  color: string;
  availableQuantity: number;
  enabled: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Category;
  isNew: boolean;
  image: string;
  description: string;
  colors: ProductColor[];
  sizes: string[];
  sizeRequired?: boolean;
  variantInventory?: ProductVariantInventory[];
  fabric: string;
  stockQuantity?: number;
}

export interface CartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

export interface Offer {
  id: string;
  created_at: string;
  image: string;
  position: number;
  active: boolean;
}
