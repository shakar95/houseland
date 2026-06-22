import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, MapPin, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { PropertyCard } from '@/components/PropertyCard';
import { useLanguage } from '@/context/LanguageContext';
import type { Property } from '@/types';

export function HomePage() {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<Property[]>([]);

  useEffect(() => {
    api
      .get<Property[]>('/api/properties?limit=6', { auth: false })
      .then(setFeatured)
      .catch(() => {});
  }, []);

  const features = [
    { icon: Sparkles, ...t.features.premium },
    { icon: Shield, ...t.features.privacy },
    { icon: MapPin, ...t.features.local },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-royal-900 to-royal-950 px-4 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gold-400">{t.hero.tag}</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-white md:text-6xl">
            {t.hero.title} <span className="text-gold-400">{t.hero.titleHighlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-royal-200">{t.hero.subtitle}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/listings" className="btn-gold">
              {t.hero.browse} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/submit" className="btn-outline-gold">
              {t.hero.listProperty}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-luxury p-6 text-center">
              <Icon className="mx-auto h-10 w-10 text-gold-400" />
              <h3 className="mt-4 font-display text-xl text-gold-300">{title}</h3>
              <p className="mt-2 text-sm text-royal-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-gold-400">{t.home.featured}</h2>
          <Link to="/listings" className="shrink-0 text-sm text-gold-400 hover:underline">
            {t.home.viewAll}
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
