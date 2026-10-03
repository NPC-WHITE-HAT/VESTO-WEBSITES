import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/data/products';
import { Link } from '@/router';

export function CartPage() {
  const { items, subtotal, updateQty, removeItem, count } = useCart();

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
        <h1 className="display-heading mt-2 text-4xl md:text-5xl">YOUR CART</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-ink-500">
          {count} {count === 1 ? 'item' : 'items'}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="divide-y divide-ink-200 border-y border-ink-200">
              {items.map((item, i) => (
                <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4 py-6">
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
                        <p className="text-[11px] uppercase tracking-widest text-ink-400">
                          {item.product.category}
                        </p>
                        <Link
                          to={`/product?id=${item.product.id}`}
                          className="mt-0.5 block text-sm font-medium text-ink-900 hover:text-ink-600"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mt-1 text-xs text-ink-500">
                          Size {item.size} · {item.color}
                        </p>
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
                          className="flex h-8 w-8 items-center justify-center text-ink-700 transition-colors hover:bg-ink-100"
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
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-ink-100 p-6 md:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-900">
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
              <Link to="/checkout" className="btn-primary mt-6 w-full">
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </Link>
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
