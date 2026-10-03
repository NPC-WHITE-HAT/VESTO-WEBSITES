import { Instagram, MapPin, MessageCircle } from 'lucide-react';
import { Link } from '@/router';
import { INSTAGRAM_URL, GOOGLE_MAPS_URL, STORE_ADDRESS, WHATSAPP_NUMBER } from '@/data/products';

export function Footer() {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hi VESTO, I'd like to know more about your collection.",
  )}`;

  return (
    <footer className="bg-ink-900 text-ink-50">
      <div className="container-vesto py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <h2 className="font-display text-4xl tracking-wider">VESTO</h2>
            <p className="mt-3 text-sm text-ink-300">
              Men's Clothing
              <br />
              Perambur, Chennai
            </p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-400">
              Contemporary men's clothing for everyday confidence. Crafted with
              quality fabrics, comfortable fits, and modern style.
            </p>
          </div>

          <div>
            <p className="section-eyebrow text-ink-400">Explore</p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { label: 'Home', to: '/' },
                { label: 'Shop', to: '/shop' },
                { label: 'About', to: '/about' },
                { label: 'Contact', to: '/contact' },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-ink-300 transition-colors hover:text-ink-50 link-underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="section-eyebrow text-ink-400">Connect</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-300 transition-colors hover:text-ink-50"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              </li>
              <li>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-300 transition-colors hover:text-ink-50"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-300 transition-colors hover:text-ink-50"
                >
                  <MapPin className="h-4 w-4" /> Google Maps
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-ink-700 pt-8 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VESTO. All rights reserved.</p>
          <p className="uppercase tracking-widest">
            {STORE_ADDRESS.line1} · {STORE_ADDRESS.city} {STORE_ADDRESS.pincode}
          </p>
        </div>
      </div>
    </footer>
  );
}
