import { useEffect, useMemo, useState } from 'react';   
import { Search, X } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { categories } from '@/data/products';
import { getProducts } from '@/lib/products';
import type { Product } from '@/types';

export function ShopPage({
  initialFilter = 'all',
  initialQuery = '',
  onQuickView,
}: {
  initialFilter?: string;
  initialQuery?: string;
  onQuickView: (p: Product) => void;
}) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState(initialQuery);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await getProducts();
        if (!cancelled) setProducts(data);
      } catch (error) {
        console.error('Failed to load shop products:', error);
        if (!cancelled) {
          setProducts([]);
          setProductsError('Products could not be loaded. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = useMemo(() => {
    let list = products;
    if (filter === 'new') list = list.filter((p) => p.isNew);
    else if (filter !== 'all') list = list.filter((p) => p.category === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, filter, query]);

  return (
    <div className="pt-16 md:pt-20">
      <section className="border-b border-ink-200 bg-ink-50">
        <div className="container-vesto py-10 md:py-14">
          <p className="section-eyebrow">Collection</p>
          <h1 className="display-heading mt-2 text-5xl md:text-7xl">
            The collection
          </h1>
          <p className="mt-3 max-w-md text-sm text-ink-600">
            A tight edit of tees, shirts, polos, trousers and denim — built for
            everyday wear.
          </p>
        </div>
      </section>

      <section className="container-vesto py-8 md:py-10">
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-ink-200 pb-3">
          <Search className="h-4 w-4 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className="w-full bg-transparent py-1 text-sm placeholder-ink-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <X className="h-4 w-4 text-ink-500" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => {
            const active = filter === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`whitespace-nowrap border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors ${
                  active
                    ? 'border-ink-900 bg-ink-900 text-ink-50'
                    : 'border-ink-200 text-ink-700 hover:border-accent hover:text-accent-dark'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-500">
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </p>

        {/* Grid */}
        {loading ? (
          <p className="py-20 text-center text-sm text-ink-500">
            Loading products...
          </p>
        ) : productsError ? (
          <p className="py-20 text-center text-sm text-ink-500">
            {productsError}
          </p>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-ink-500">
              No products match your search.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="mt-4 btn-ghost"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
