import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyFiltersPanel } from '@/components/PropertyFilters';
import { useLanguage } from '@/context/LanguageContext';
import type { Property, PropertyFilters } from '@/types';

function buildQuery(f: PropertyFilters) {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v && v !== 'all') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function ListingsPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    setLoading(true);
    api
      .get<Property[]>(`/api/properties${query}`)
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl text-gold-400">{t.listings.title}</h1>
      <p className="mt-2 text-royal-300">{t.listings.subtitle}</p>
      <div className="mt-8">
        <PropertyFiltersPanel filters={filters} onChange={setFilters} />
      </div>
      {loading ? (
        <p className="mt-12 text-center text-royal-400">{t.listings.loading}</p>
      ) : properties.length === 0 ? (
        <p className="mt-12 text-center text-royal-400">{t.listings.empty}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}
    </div>
  );
}
