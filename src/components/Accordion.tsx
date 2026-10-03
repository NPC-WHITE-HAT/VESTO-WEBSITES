import { useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { Link } from '@/router';

export interface AccordionLink {
  label: string;
  to?: string;
  href?: string;
}

export function Accordion({
  title,
  items,
  defaultOpen = false,
}: {
  title: string;
  items: AccordionLink[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-ink-200">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between py-6 text-left md:py-7"
      >
        <span className="font-display text-2xl tracking-wide text-ink-900 md:text-3xl lg:text-4xl">
          {title}
        </span>
        <span
          className={`flex h-9 w-9 items-center justify-center transition-transform duration-400 ease-out md:h-10 md:w-10 ${
            open ? 'rotate-45' : 'rotate-0'
          }`}
        >
          <Plus className="h-5 w-5 text-ink-700 md:h-6 md:w-6" />
        </span>
      </button>

      <div
        className={`grid transition-all duration-500 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <ul className="pb-6 md:pb-8">
            {items.map((item, i) => {
              const inner = (
                <span className="flex items-center justify-between py-3.5 group/row md:py-4">
                  <span className="text-sm font-medium uppercase tracking-widest text-ink-700 transition-colors group-hover/row:text-ink-900 md:text-base">
                    {item.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition-all duration-300 group-hover/row:translate-x-1 group-hover/row:text-ink-700 md:h-5 md:w-5" />
                </span>
              );
              return (
                <li
                  key={item.label}
                  className="border-t border-ink-100 animate-fade-in"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group/row block"
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link to={item.to ?? '/'} className="group/row block">
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
