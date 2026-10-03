import { ArrowRight } from 'lucide-react';
import { Link } from '@/router';
import { STORE_ADDRESS, GOOGLE_MAPS_URL } from '@/data/products';

const ABOUT_IMG =
  'https://images.pexels.com/photos/10482937/pexels-photo-10482937.jpeg?auto=compress&cs=tinysrgb&h=1000&w=700';
const ABOUT_IMG_2 =
  'https://images.pexels.com/photos/8386651/pexels-photo-8386651.jpeg?auto=compress&cs=tinysrgb&h=700&w=900';

export function AboutPage() {
  return (
    <div className="pt-16 md:pt-20">
      {/* Header */}
      <section className="container-vesto py-12 md:py-20">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Our Story</p>
          <h1 className="display-heading mt-2 text-4xl md:text-6xl lg:text-7xl">
            CLOTHING MADE
            <br />
            FOR THE EVERYDAY.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-ink-600 md:text-lg">
            VESTO is a men's clothing brand from Perambur, Chennai. We started
            with a simple idea — that good clothing shouldn't be complicated.
            Clean cuts, honest fabrics, and fits that feel right the moment you
            put them on.
          </p>
        </div>
      </section>

      {/* Image break */}
      <section className="container-vesto">
        <div className="overflow-hidden">
          <div className="aspect-[16/9]">
            <img
              src={ABOUT_IMG_2}
              alt="VESTO store"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="container-vesto py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <p className="section-eyebrow">What we believe</p>
            <h2 className="display-heading mt-2 text-3xl md:text-4xl">
              LESS, BUT BETTER.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-ink-600">
              We don't chase trends or fill a catalogue for the sake of it. Every
              piece we make earns its place — chosen for the way it feels, the
              way it fits, and how long it stays with you. We'd rather make one
              tee you reach for every week than ten you forget in a drawer.
            </p>
          </div>
          <div>
            <p className="section-eyebrow">Made in Chennai</p>
            <h2 className="display-heading mt-2 text-3xl md:text-4xl">
              ROOTED IN PERAMBUR.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-ink-600">
              Our store sits on 70 Feet Road in Periyar Nagar West, Perambur.
              Walk in and you'll find the full collection, honest advice on fit,
              and a team that knows the product by hand. Come say hello.
            </p>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-outline mt-7"
            >
              Visit Our Store <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-ink-900 text-ink-50">
        <div className="container-vesto py-14 md:py-16">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4 md:gap-4">
            {[
              { n: '12+', l: 'Styles' },
              { n: '5', l: 'Categories' },
              { n: '100%', l: 'Cotton' },
              { n: '1', l: 'Store in Chennai' },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-display text-4xl text-ink-50 md:text-5xl">{s.n}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-ink-400">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-vesto py-16 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="overflow-hidden">
            <div className="aspect-[3/4]">
              <img
                src={ABOUT_IMG}
                alt="VESTO men's fashion"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div>
            <h2 className="display-heading text-3xl md:text-4xl">
              FIND YOUR FIT.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Browse the full collection online or visit us in Perambur. We're
              happy to help you find the right size and style.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/shop" className="btn-primary">
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="btn-outline">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
