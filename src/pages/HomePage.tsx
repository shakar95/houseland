import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, MapPin, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { PropertyCard } from '@/components/PropertyCard';
import type { Property } from '@/types';

export function HomePage() {
  const [featured, setFeatured] = useState<Property[]>([]);

  useEffect(() => {
    api.get<Property[]>('/api/properties').then((list) => setFeatured(list.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-royal-900 to-royal-950 px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gold-400">Sulaymaniyah · Kurdistan</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-white md:text-6xl">
            Discover Your Next <span className="text-gold-400">Home</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-royal-200">
            Houseland is your trusted luxury real estate partner — curated villas, apartments, and commercial
            properties across Sulaymaniyah.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/listings" className="btn-gold">
              Browse Listings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/submit" className="btn-outline-gold">
              List Your Property
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { icon: Sparkles, title: 'Premium Listings', desc: 'Hand-reviewed properties with professional photography.' },
            { icon: Shield, title: 'Privacy Protected', desc: 'Exact locations masked; agency contact only on listings.' },
            { icon: MapPin, title: 'Local Expertise', desc: 'Deep knowledge of every neighborhood in Sulaymaniyah.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-luxury p-6 text-center">
              <Icon className="mx-auto h-10 w-10 text-gold-400" />
              <h3 className="mt-4 font-display text-xl text-gold-300">{title}</h3>
              <p className="mt-2 text-sm text-royal-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-3xl text-gold-400">Featured Properties</h2>
          <Link to="/listings" className="text-sm text-gold-400 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>
    </>
  );
}
