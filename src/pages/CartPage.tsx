import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/data/products';
import { Link, navigate } from '@/router';
import { getInventorySnapshot, hasSizeVariants, variantStockKey } from '@/lib/inventory';

export function CartPage() {
  const { items, subtotal, updateQty, updateStock, removeItem, count } = useCart();
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({});
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const productIdsKey = useMemo(
    () => [...new Set(items.map((item) => item.product.id))].join(','),
    [items],
  );

  useEffect(() => {
    let active = true;
    const productIds = productIdsKey ? productIdsKey.split(',') : [];

    const refreshStock = async () => {
      try {
        const currentInventory = await getInventorySnapshot(productIds);
        if (!active) return;
        const currentStock = { ...currentInventory.variants };
        for (const [productId, product] of Object.entries(currentInventory.products)) {
          if (!product.sizeRequired) {
            currentStock[variantStockKey(productId, '', '')] = product.stockQuantity;
          }
        }
        setAvailableStock(currentStock);
        setStockError('');
        updateStock(currentInventory);
      } catch (error) {
        console.error('Could not refresh cart inventory:', error);
        if (active) {
          setStockError('Could not verify current stock. Please try again before checkout.');
        }
      } finally {
        if (active) setStockLoading(false);
      }
    };

    setStockLoading(true);
    void refreshStock();
    const interval = window.setInterval(() => void refreshStock(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [productIdsKey, updateStock]);

  const exceedsStock = items.some((item) => {
    const key = hasSizeVariants(item.product)
      ? variantStockKey(item.product.id, item.size, item.color)
      : variantStockKey(item.product.id, '', '');
    const productQuantity = items
      .filter((candidate) =>
        candidate.product.id === item.product.id &&
        (!hasSizeVariants(item.product) ||
          (candidate.size === item.size && candidate.color === item.color)),
      )
      .reduce((total, candidate) => total + candidate.quantity, 0);
    return productQuantity > (availableStock[key] ?? 0);
  });

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center pt-16 text-center md:pt-20">
        <ShoppingBag className="h-10 w-10 text-ink-300" />
        <h1 className="display-heading mt-5 text-3xl md:text-4xl">YOUR CART IS EMPTY</h1>
        <p className="mt-3 text-sm text-ink-500">
          Looks like you haven't added anything yet.
        </p>
        <Link to="/shop" className="btn-primary mt-7">
          Shop Collection <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-20">
      <section className="container-vesto py-10 md:py-14">
        <p className="section-eyebrow">Shopping Bag</p>
        <h1 className="display-heading mt-2 text-5xl md:text-7xl">Your selection</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink-500">
          {count} {count === 1 ? 'item' : 'items'}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="divide-y divide-ink-200 border-y border-ink-200">
              {items.map((item, i) => {
                const key = hasSizeVariants(item.product)
                  ? variantStockKey(item.product.id, item.size, item.color)
                  : variantStockKey(item.product.id, '', '');
                const currentStock = availableStock[key] ?? 0;
                const productQuantity = items
                  .filter((candidate) =>
                    candidate.product.id === item.product.id &&
                    (!hasSizeVariants(item.product) ||
                      (candidate.size === item.size && candidate.color === item.color)),
                  )
                  .reduce((total, candidate) => total + candidate.quantity, 0);
                const hasStockIssue = productQuantity > currentStock;
                return (
                  <div
                    key={`${item.product.id}-${item.size}-${item.color}`}
                    className="flex gap-4 py-6"
                  >
                  <Link
                    to={`/product?id=${item.product.id}`}
                    className="shrink-0 overflow-hidden bg-ink-100"
                  >
                    <div className="h-28 w-24 sm:h-36 sm:w-32">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-ink-500">
                          {item.product.category}
                        </p>
                        <Link
                          to={`/product?id=${item.product.id}`}
                          className="mt-1 block font-display text-xl font-medium leading-tight text-ink-900 hover:text-accent-dark"
                        >
                          {item.product.name}
                        </Link>
                        {(item.size || item.color) && (
                          <p className="mt-1 text-xs text-ink-500">
                            {[item.size && `Size ${item.size}`, item.color]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-ink-900">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div className="inline-flex items-center border border-ink-200">
                        <button
                          onClick={() => updateQty(i, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-ink-700 transition-colors hover:bg-ink-100"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(i, item.quantity + 1)}
                          disabled={productQuantity >= currentStock}
                          className="flex h-8 w-8 items-center justify-center text-ink-700 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(i)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-500 transition-colors hover:text-ink-900"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                    {hasStockIssue && (
                      <p role="alert" className="mt-3 text-xs text-red-700">
                        Only {currentStock} currently available. Reduce the quantity or remove this item to continue.
                      </p>
                    )}
                  </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-ink-100 p-6 md:p-8">
              <h2 className="font-display text-2xl font-medium text-ink-900">
                Order Summary
              </h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-ink-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Shipping</span>
                  <span className="text-ink-500">Calculated at checkout</span>
                </div>
              </div>
              <div className="mt-5 flex justify-between border-t border-ink-200 pt-5">
                <span className="text-sm font-semibold uppercase tracking-widest text-ink-900">
                  Total
                </span>
                <span className="text-lg font-semibold text-ink-900">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {stockLoading && (
                <p className="mt-4 text-xs text-ink-500">Checking current stock…</p>
              )}
              {stockError && (
                <p role="alert" className="mt-4 text-xs text-red-700">{stockError}</p>
              )}
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                disabled={stockLoading || !!stockError || exceedsStock}
                className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/shop" className="btn-ghost mt-3 w-full justify-center">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
