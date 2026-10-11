import { useEffect, useState } from 'react';
import { Check, Minus, Plus, MessageCircle, ChevronLeft } from 'lucide-react';
import { formatPrice, WHATSAPP_NUMBER } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { Link, navigate } from '@/router';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/lib/products';
import type { Product } from '@/types';

export function ProductPage({
  id,
  onQuickView,
}: {
  id: string;
  onQuickView: (p: Product) => void;
}) {
  const [product, setProduct] = useState<Product | undefined>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const [size, setSize] = useState(product?.sizes[1] ?? product?.sizes[0] ?? '');
  const [color, setColor] = useState(product?.colors[0]?.name ?? '');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setProduct(undefined);

      try {
        const data = await getProducts();
        if (!cancelled) {
          setProducts(data);
          setProduct(data.find((item) => item.id === id));
        }
      } catch (error) {
        console.error('Error loading product details:', error);
        if (!cancelled) {
          setProducts([]);
          setProduct(undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (product) {
      setSize(product.sizes[1] ?? product.sizes[0] ?? '');
      setColor(product.colors[0]?.name ?? '');
    }
  }, [product]);

  if (loading) {
    return (
      <div className="container-vesto flex min-h-[60vh] items-center justify-center pt-16 text-center md:pt-20">
        <p className="text-sm text-ink-500">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-vesto flex min-h-[60vh] flex-col items-center justify-center pt-16 text-center md:pt-20">
        <p className="text-sm text-ink-500">Product not found.</p>
        <Link to="/shop" className="btn-primary mt-6">
          Back to Shop
        </Link>
      </div>
    );
  }

  const addToCart = () => {
    addItem(product, size, color, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi VESTO, I'd like to order:\n\n${product.name}\nSize: ${size}\nColor: ${color}\nQuantity: ${qty}\nTotal: ${formatPrice(product.price * qty)}`,
  )}`;

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="pt-16 md:pt-20">
      <div className="container-vesto py-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-ink-500 transition-colors hover:text-ink-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="container-vesto grid gap-10 pb-16 md:grid-cols-2 md:gap-14 lg:gap-20">
        {/* Image */}
        <div className="overflow-hidden bg-white">
          <div className="aspect-[4/5]">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent-dark">
            {product.category}
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-none text-ink-900 md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 text-base font-medium tracking-wide text-ink-800">
            {formatPrice(product.price)}
          </p>
          <p className="mt-6 max-w-lg text-sm leading-7 text-ink-600">
            {product.description}
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-ink-500">
            {product.fabric}
          </p>

          {/* Color */}
          <div className="mt-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Color: <span className="text-ink-800">{color}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  aria-label={c.name}
                  className={`flex h-9 w-9 items-center justify-center border transition-colors ${
                    color === c.name
                      ? 'border-accent ring-1 ring-accent ring-offset-2 ring-offset-ink-50'
                      : 'border-ink-200 hover:border-accent'
                  }`}
                >
                  <span
                    className="h-6 w-6"
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Size: <span className="text-ink-800">{size}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-11 border px-3.5 py-2 text-xs font-semibold transition-colors ${
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

          {/* Quantity */}
          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Quantity
            </p>
            <div className="mt-2 inline-flex items-center border border-ink-200">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center text-ink-700 transition-colors hover:bg-ink-100"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="flex h-10 w-10 items-center justify-center text-ink-700 transition-colors hover:bg-ink-100"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <button onClick={addToCart} className="btn-primary">
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added to Cart
                </>
              ) : (
                'Add to Cart'
              )}
            </button>
            <button
              onClick={() => {
                addToCart();
                navigate('/checkout');
              }}
              className="btn-outline"
            >
              Proceed to Checkout
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="btn-outline"
            >
              <MessageCircle className="h-4 w-4" /> Order on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-ink-100 py-16 md:py-20">
          <div className="container-vesto">
            <h2 className="display-heading text-4xl md:text-6xl">You may also like</h2>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} onQuickView={onQuickView} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
