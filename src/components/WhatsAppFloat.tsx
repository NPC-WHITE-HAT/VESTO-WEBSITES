import { MessageCircle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/data/products';

export function WhatsAppFloat() {
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "Hi VESTO, I have a question about your products.",
  )}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/15 transition-transform duration-300 hover:scale-110 md:h-14 md:w-14"
    >
      <MessageCircle className="h-6 w-6 text-white md:h-7 md:w-7" />
      <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded bg-ink-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ink-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block">
        Chat with us
      </span>
    </a>
  );
}
