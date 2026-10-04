import { ArrowRight, MapPin, Phone, MessageCircle, Instagram } from 'lucide-react';
import { Link } from '@/router';
import { Accordion, type AccordionLink } from '@/components/Accordion';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/types';
import {
  newArrivals as existingNewArrivals,
  STORE_ADDRESS,
  GOOGLE_MAPS_URL,
  INSTAGRAM_URL,
  WHATSAPP_NUMBER,
} from '@/data/products';

import { getProducts } from '@/lib/products';
import { useEffect, useState } from 'react';  
const HERO_IMG =
  'https://images.pexels.com/photos/27969069/pexels-photo-27969069.jpeg?auto=compress&cs=tinysrgb&w=2200';

const STORE_CTA_IMG =
  'https://images.pexels.com/photos/3839432/pexels-photo-3839432.jpeg?auto=compress&cs=tinysrgb&w=1600';

const CATEGORY_BLOCKS: { label: string; value: string; img: string }[] = [
  { label: 'T-Shirts', value: 'T-Shirts', img: 'https://images.pexels.com/photos/12781928/pexels-photo-12781928.jpeg?auto=compress&cs=tinysrgb&h=700&w=500' },
  { label: 'Shirts', value: 'Shirts', img: 'https://images.pexels.com/photos/7905889/pexels-photo-7905889.jpeg?auto=compress&cs=tinysrgb&h=700&w=500' },
  { label: 'Polos', value: 'Polos', img: 'https://images.pexels.com/photos/9301162/pexels-photo-9301162.jpeg?auto=compress&cs=tinysrgb&h=700&w=500' },
  { label: 'Trousers', value: 'Trousers', img: 'https://images.pexels.com/photos/9464625/pexels-photo-9464625.jpeg?auto=compress&cs=tinysrgb&h=700&w=500' },
];

const FEATURED_IDS = [
  'oversized-tee',
  'premium-shirt',
  'essential-polo',
  'relaxed-trouser',
  'street-tee',
  'linen-shirt',
];

const PRODUCT_ITEMS: AccordionLink[] = [
  { label: 'New Arrivals', to: '/shop?filter=new' },
  { label: 'T-Shirts', to: '/shop?filter=T-Shirts' },
  { label: 'Shirts', to: '/shop?filter=Shirts' },
  { label: 'Polos', to: '/shop?filter=Polos' },
  { label: 'Trousers', to: '/shop?filter=Trousers' },
  { label: 'Jeans', to: '/shop?filter=Jeans' },
];

const SERVICE_ITEMS: AccordionLink[] = [
  { label: 'WhatsApp Orders', href: `https://wa.me/${WHATSAPP_NUMBER}` },
  { label: 'Store Visit', href: GOOGLE_MAPS_URL },
  { label: 'Size Assistance', to: '/contact' },
  { label: 'Customer Support', to: '/contact' },
];

const INFORMATION_ITEMS: AccordionLink[] = [
  { label: 'About VESTO', to: '/about' },
  { label: 'Delivery Information', to: '/about' },
  { label: 'Payment Information', to: '/checkout' },
  { label: 'Privacy Policy', to: '/about' },
  { label: 'Terms & Conditions', to: '/about' },
];

export function HomePage({ onQuickView }: { onQuickView: (p: Product) => void }) {
   const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const data = await getProducts();
      setProducts(data);
      setLoading(false);
    }

    loadProducts();
  }, []);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hi VESTO, I'd like to know more about your collection.",
  )}`;

  const featured = products.slice(0, 6);
  const newArrivals = [
    ...products.filter((product) => product.isNew),
    ...existingNewArrivals.filter(
      (product) =>
        product.isNew && !products.some((loadedProduct) => loadedProduct.id === product.id),
    ),
  ];
  return (
    <div>
      {/* HERO */}
      <section className="relative h-[88svh] min-h-[560px] w-full overflow-hidden md:h-[100svh]">
        <img
          src={HERO_IMG}
          alt="VESTO men's fashion campaign"
          className="absolute inset-0 h-full w-full object-cover object-[30%_center] md:object-[62%_30%]"
        />
        {/* Left-to-right dark gradient for text legibility; model stays visible on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent to-ink-950/20" />
        <div className="relative z-10 flex h-full flex-col justify-end pb-12 md:justify-center md:pb-0">
          <div className="container-vesto">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-ink-100/90 animate-fade-in">
              Perambur • Chennai
            </p>
            <h1 className="display-heading text-5xl text-ink-50 sm:text-7xl md:text-8xl lg:text-9xl animate-fade-up">
              MEN'S STYLE.
              <br />
              MADE SIMPLE.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-100/90 md:text-base animate-fade-up [animation-delay:0.15s]">
              Contemporary men's clothing for everyday confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-up [animation-delay:0.3s]">
              <Link
                to="/shop"
                className="btn-primary bg-ink-50 text-ink-900 hover:bg-white"
              >
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-outline border-ink-100/40 text-ink-50 hover:bg-ink-50 hover:text-ink-900"
              >
                Visit Our Store <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="container-vesto py-16 md:py-24">
        <div className="flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Browse</p>
            <h2 className="display-heading mt-2 text-4xl md:text-5xl">SHOP MEN'S</h2>
          </div>
          <Link to="/shop" className="btn-ghost hidden sm:inline-flex">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {CATEGORY_BLOCKS.map((c, i) => (
            <Link
              key={c.value}
              to={`/shop?filter=${encodeURIComponent(c.value)}`}
              className="group relative overflow-hidden bg-ink-100 animate-fade-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="aspect-[3/4]">
                <img
                  src={c.img}
                  alt={c.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 md:p-5">
                <h3 className="font-display text-xl tracking-wide text-ink-50 md:text-2xl">
                  {c.label}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED COLLECTION */}
      <section className="bg-ink-100 py-16 md:py-24">
        <div className="container-vesto">
          <div className="flex items-end justify-between">
            <div>
              <p className="section-eyebrow">Selected</p>
              <h2 className="display-heading mt-2 text-4xl md:text-5xl">
                FEATURED COLLECTION
              </h2>
            </div>
            <Link to="/shop" className="btn-ghost hidden sm:inline-flex">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-3">
            {featured.map((p, i) => (
              <div
                key={p.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <ProductCard product={p} onQuickView={onQuickView} showAddButton />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="container-vesto py-16 md:py-24">
        <div className="flex items-end justify-between">
          <div>
            <p className="section-eyebrow">Just In</p>
            <h2 className="display-heading mt-2 text-4xl md:text-5xl">NEW ARRIVALS</h2>
          </div>
          <Link to="/shop?filter=new" className="btn-ghost hidden sm:inline-flex">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-4">
          {newArrivals.map((p, i) => (
            <div
              key={p.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <ProductCard product={p} onQuickView={onQuickView} />
            </div>
          ))}
        </div>
      </section>

      {/* VIEW ALL PRODUCTS */}
      <section className="container-vesto pb-16 md:pb-24">
        <div className="text-center">
          <Link to="/shop" className="btn-primary">
            View All Products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* STORE / WHATSAPP CTA */}
      <section className="relative overflow-hidden bg-ink-900 text-ink-50">
        <img
          src={STORE_CTA_IMG}
          alt="VESTO store"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-ink-950/40" />
        <div className="relative z-10 container-vesto py-20 text-center md:py-28">
          <p className="section-eyebrow text-ink-400">Visit · Order</p>
          <h2 className="display-heading mx-auto mt-2 max-w-2xl text-4xl text-ink-50 md:text-6xl">
            FIND YOUR STYLE AT VESTO.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-300 md:text-base">
            Visit our store in Perambur or order your favourite styles directly
            through WhatsApp.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-primary bg-ink-50 text-ink-900 hover:bg-white"
            >
              Visit Our Store <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="btn-outline border-ink-100/30 text-ink-50 hover:bg-ink-50 hover:text-ink-900"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp VESTO
            </a>
          </div>
        </div>
      </section>

      {/* ACCORDION SECTIONS */}
      <section className="container-vesto py-14 md:py-20">
        <Accordion title="Products" items={PRODUCT_ITEMS} />
        <Accordion title="Service" items={SERVICE_ITEMS} />
        <Accordion title="Information" items={INFORMATION_ITEMS} />

        {/* SUPPORT — open by default */}
        <div className="border-b border-ink-200">
          <div className="py-6 md:py-7">
            <h2 className="font-display text-2xl tracking-wide text-ink-900 md:text-3xl lg:text-4xl">
              Support
            </h2>
          </div>
          <div className="pb-8 md:pb-10">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16">
              <div>
                <h3 className="font-display text-xl tracking-wide text-ink-900 md:text-2xl">
                  VESTO MEN'S CLOTHING
                </h3>
                <div className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-ink-600">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
                  <address className="not-italic">
                    70 Feet Road, Periyar Nagar West,
                    <br />
                    Perambur, Chennai,
                    <br />
                    Tamil Nadu 600082
                  </address>
                </div>
                <div className="mt-5 space-y-3 text-sm text-ink-700">
                  <p className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-ink-400" />
                    <a
                      href={`tel:${STORE_ADDRESS.phone.replace(/\s/g, '')}`}
                      className="transition-colors hover:text-ink-900"
                    >
                      {STORE_ADDRESS.phone}
                    </a>
                  </p>
                  <p className="flex items-center gap-3">
                    <Instagram className="h-4 w-4 text-ink-400" />
                    <a
                      href={INSTAGRAM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-ink-900"
                    >
                      @vesto_in
                    </a>
                  </p>
                  <p className="flex items-center gap-3">
                    <MessageCircle className="h-4 w-4 text-ink-400" />
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-ink-900"
                    >
                      Chat with VESTO
                    </a>
                  </p>
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`tel:${STORE_ADDRESS.phone.replace(/\s/g, '')}`}
                    className="btn-primary"
                  >
                    <Phone className="h-4 w-4" /> Call Us
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline"
                  >
                    <MapPin className="h-4 w-4" /> Get Directions
                  </a>
                </div>
              </div>

              <div className="overflow-hidden">
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <div className="aspect-[4/3] md:aspect-square">
                    <iframe
                      title="VESTO location"
                      src="https://www.google.com/maps?q=Periyar+Nagar+West+Perambur+Chennai+600082&output=embed"
                      className="h-full w-full grayscale invert-[0.92] hue-rotate-180"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
