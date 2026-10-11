import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { Link, navigate } from '@/router';
import { useCart } from '@/context/CartContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'New Arrivals', to: '/shop?filter=new' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function Navbar() {
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 bg-ink-50/95 text-ink-900 backdrop-blur-md transition-all duration-500 ${
          scrolled
            ? 'shadow-[0_1px_0_0_rgba(25,25,25,0.08)]'
            : 'border-b border-ink-200/70'
        }`}
      >
        <nav className="container-vesto flex h-16 items-center justify-between md:h-[84px]">
          <button
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/"
            className="flex w-[82px] shrink-0 items-center md:w-[116px]"
            aria-label="VESTO home"
          >
            <img
              src="/vesto-logo.svg"
              alt="VESTO Addiction Groups"
              className="h-auto w-full object-contain"
            />
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-700 transition-colors hover:text-accent-dark link-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
            <form onSubmit={submitSearch} className="hidden sm:block">
              <div className="flex items-center gap-2 border-b border-ink-200 transition-colors focus-within:border-accent">
                <Search className="h-3.5 w-3.5 text-ink-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-20 bg-transparent py-1 text-xs placeholder-ink-400 focus:outline-none md:w-24"
                />
              </div>
            </form>
            <button
              className="sm:hidden"
              onClick={() => setOpen(true)}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <Link to="/cart" className="relative" aria-label="Cart">
              <ShoppingBag className="h-[18px] w-[18px]" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[9px] font-semibold text-ink-900">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[60] md:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-ink-950/40 transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[86%] max-w-sm bg-ink-50 px-6 py-6 transition-transform duration-400 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex w-[96px] items-center"
              aria-label="VESTO home"
            >
              <img
                src="/vesto-logo.svg"
                alt="VESTO Addiction Groups"
                className="h-auto w-full object-contain"
              />
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              submitSearch(e);
              setOpen(false);
            }}
            className="mt-8 flex items-center gap-2 border-b border-ink-200 pb-2 focus-within:border-accent"
          >
            <Search className="h-4 w-4 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full bg-transparent py-1 text-sm placeholder-ink-400 focus:outline-none"
            />
          </form>
          <div className="mt-8 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="border-b border-ink-200/70 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-800 transition-colors hover:text-accent-dark"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-10 border-t border-ink-200 pt-6 text-xs uppercase tracking-widest text-ink-500">
            Perambur, Chennai
          </div>
        </aside>
      </div>
    </>
  );
}
