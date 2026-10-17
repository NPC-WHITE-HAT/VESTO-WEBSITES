import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import type { Product } from '@/types';
import { Link } from '@/router';
import { formatPrice } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { navigate } from '@/router';
import { getStockStatus, getStockStatusClasses } from '@/lib/inventory';

export function QuickView({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [added, setAdded] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    if (product) {
      setSize(product.sizes[1] ?? product.sizes[0]);
      setColor(product.colors[0]?.name ?? '');
      setAdded(false);
      setCartMessage('');
    }
  }, [product]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;

  const addToCart = () => {
    if (!addItem(product, size, color, 1)) {
      setCartMessage('This product is no longer available in the requested quantity.');
      return;
    }
    setCartMessage('');
    setAdded(true);
    setTimeout(onClose, 900);
  };
  const stockStatus = getStockStatus(product.stockQuantity);
  const outOfStock = stockStatus === 'Out of Stock';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-ink-50 animate-scale-in">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center bg-ink-50/80 backdrop-blur transition-colors hover:bg-ink-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid sm:grid-cols-2">
          <div className="aspect-[3/4] sm:aspect-auto">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col p-6 sm:p-9">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent-dark">
              {product.category}
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium leading-tight text-ink-900">
              {product.name}
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-800">
              {formatPrice(product.price)}
            </p>
            <p className={`mt-2 text-xs font-semibold uppercase tracking-wider ${getStockStatusClasses(stockStatus)}`}>
              {stockStatus}
              {!outOfStock && ` · ${product.stockQuantity} available`}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              {product.description}
            </p>

            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Color
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    className={`flex items-center gap-2 border px-3 py-1.5 text-xs transition-colors ${
                      color === c.name
                        ? 'border-ink-900 bg-ink-900 text-ink-50'
                        : 'border-ink-200 text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-ink-300"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Size
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-10 border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      size === s
                        ? 'border-ink-900 bg-ink-900 text-ink-50'
                        : 'border-ink-200 text-ink-700 hover:border-ink-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={addToCart}
                disabled={outOfStock}
                className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {outOfStock ? (
                  'Out of Stock'
                ) : added ? (
                  <>
                    <Check className="h-4 w-4" /> Added
                  </>
                ) : (
                  'Add to Cart'
                )}
              </button>
              <Link
                to={`/product?id=${product.id}`}
                onClick={onClose}
                className="btn-outline flex-1"
              >
                Details
              </Link>
            </div>
            {cartMessage && <p role="alert" className="mt-3 text-sm text-red-700">{cartMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export { navigate };
