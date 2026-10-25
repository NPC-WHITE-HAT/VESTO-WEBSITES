import { Phone, MessageCircle, Instagram, MapPin, ArrowRight } from 'lucide-react';
import {
  STORE_ADDRESS,
  GOOGLE_MAPS_URL,
  INSTAGRAM_URL,
  WHATSAPP_NUMBER,
} from '@/data/products';

export function ContactPage() {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hi VESTO, I'd like to get in touch.",
  )}`;

  const channels = [
    {
      icon: Phone,
      label: 'Phone',
      value: STORE_ADDRESS.phone,
      href: `tel:${STORE_ADDRESS.phone.replace(/\s/g, '')}`,
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Chat with us',
      href: waLink,
    },
    {
      icon: Instagram,
      label: 'Instagram',
      value: '@vesto_in',
      href: INSTAGRAM_URL,
    },
  ];

  return (
    <div className="pt-16 md:pt-20">
      <section className="container-vesto py-12 md:py-20">
        <p className="section-eyebrow">Get in touch</p>
        <h1 className="display-heading mt-2 text-4xl md:text-6xl">CONTACT</h1>
        <p className="mt-4 max-w-md text-sm text-ink-600">
          Questions, feedback, or just want to say hello — we're easy to reach.
        </p>
      </section>

      <section className="container-vesto pb-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          {/* Channels */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-900">
              Reach Us
            </h2>
            <div className="mt-6 space-y-5">
              {channels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="group flex items-center gap-4 border-b border-ink-200 pb-5 transition-colors hover:border-ink-900"
                >
                  <div className="flex h-11 w-11 items-center justify-center border border-ink-200 transition-colors group-hover:border-ink-900">
                    <c.icon className="h-5 w-5 text-ink-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                      {c.label}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink-900">
                      {c.value}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1" />
                </a>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Store Address
              </h3>
              <div className="mt-3 flex items-start gap-3 text-sm text-ink-700">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-ink-500" />
                <address className="not-italic leading-relaxed">
                  {STORE_ADDRESS.line1},
                  <br />
                  {STORE_ADDRESS.line2},
                  <br />
                  {STORE_ADDRESS.city} — {STORE_ADDRESS.pincode}
                </address>
              </div>
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-outline mt-5"
              >
                Get Directions <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Map */}
          <div>
            <div className="overflow-hidden">
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noreferrer" className="block">
                <div className="aspect-square md:aspect-[4/5]">
                  <iframe
  title="VESTO CLOTHING store location"
  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3885.738255419412!2d80.2278955!3d13.115760999999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a52653f285bd45b%3A0x9ca55322c1123461!2sVESTO%20CLOTHING!5e0!3m2!1sen!2sin!4v1792930133807!5m2!1sen!2sin"
  className="h-full w-full"
  style={{ border: 0 }}
  allowFullScreen
  loading="lazy"
  referrerPolicy="strict-origin-when-cross-origin"
/>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
