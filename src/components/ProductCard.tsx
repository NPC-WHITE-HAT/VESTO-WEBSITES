import { Eye, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { Link } from '@/router';
import { formatPrice } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { getStockStatus, getStockStatusClasses } from '@/lib/inventory';

export function ProductCard({
  product,
  onQuickView,
  showAddButton = false,
}: {
  product: Product;
  onQuickView?: (p: Product) => void;
  showAddButton?: boolean;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const stockStatus = getStockStatus(product.stockQuantity);
  const outOfStock = stockStatus === 'Out of Stock';

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    const addedToCart = addItem(
      product,
      product.sizes[1] ?? product.sizes[0],
      product.colors[0]?.name ?? '',
      1,
    );
    if (!addedToCart) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="group relative flex flex-col">
      <Link to={`/product?id=${product.id}`} className="relative block overflow-hidden bg-white">
        <div className="aspect-[4/5] w-full">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
        {product.isNew && (
          <span className="absolute left-3 top-3 border border-white/60 bg-ink-50/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-accent-dark backdrop-blur-sm">
            New
          </span>
        )}
        {onQuickView && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            className="absolute bottom-0 left-0 flex w-full translate-y-full items-center justify-center gap-2 bg-ink-50/95 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-900 transition-transform duration-300 group-hover:translate-y-0"
          >
            <Eye className="h-4 w-4" /> Quick View
          </button>
        )}
      </Link>

      <div className="mt-4 flex flex-col">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-ink-500">
          {product.category}
        </p>
        <Link
          to={`/product?id=${product.id}`}
          className="mt-1 font-display text-xl font-medium leading-tight text-ink-900 transition-colors hover:text-accent-dark"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-xs font-medium tracking-wide text-ink-700">
          {formatPrice(product.price)}
        </p>
        <p className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${getStockStatusClasses(stockStatus)}`}>
          {stockStatus}
          {stockStatus !== 'Out of Stock' && ` · ${product.stockQuantity} available`}
        </p>
        {showAddButton && (
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="mt-3 inline-flex items-center justify-center gap-2 border border-ink-200 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-800 transition-all duration-300 hover:border-accent hover:text-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {outOfStock ? (
              'Out of Stock'
            ) : added ? (
              <>
                <Check className="h-3.5 w-3.5" /> Added
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add to Cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
