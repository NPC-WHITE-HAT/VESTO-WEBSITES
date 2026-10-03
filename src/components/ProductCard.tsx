import { Eye, Plus, Check } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { Link } from '@/router';
import { formatPrice } from '@/data/products';
import { useCart } from '@/context/CartContext';

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

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.sizes[1] ?? product.sizes[0], product.colors[0].name, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="group relative flex flex-col">
      <Link to={`/product?id=${product.id}`} className="relative block overflow-hidden bg-ink-100">
        <div className="aspect-[3/4] w-full">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
        {product.isNew && (
          <span className="absolute left-3 top-3 bg-ink-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-900">
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
            className="absolute bottom-0 left-0 flex w-full translate-y-full items-center justify-center gap-2 bg-ink-900/95 py-3 text-[11px] font-semibold uppercase tracking-widest text-ink-50 transition-transform duration-300 group-hover:translate-y-0"
          >
            <Eye className="h-4 w-4" /> Quick View
          </button>
        )}
      </Link>

      <div className="mt-4 flex flex-col">
        <p className="text-[11px] uppercase tracking-widest text-ink-400">
          {product.category}
        </p>
        <Link
          to={`/product?id=${product.id}`}
          className="mt-1 text-sm font-medium text-ink-900 transition-colors hover:text-ink-600"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-sm font-semibold text-ink-800">
          {formatPrice(product.price)}
        </p>
        {showAddButton && (
          <button
            onClick={handleAdd}
            className="mt-3 inline-flex items-center justify-center gap-2 border border-ink-200 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-800 transition-all duration-300 hover:border-ink-900 hover:bg-ink-900 hover:text-ink-50"
          >
            {added ? (
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
