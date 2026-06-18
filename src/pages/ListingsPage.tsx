import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { PropertyGridCard } from '@/components/PropertyGridCard';
import { PropertyFilterBar } from '@/components/PropertyFilterBar';
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
    <div className="app-page">
      <div className="sticky top-0 z-30 -mx-4 border-b border-royal-800/80 bg-royal-950/95 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <PropertyFilterBar filters={filters} onChange={setFilters} resultCount={loading ? undefined : properties.length} />
      </div>

      <div className="-mx-4 mt-3">
        {loading ? (
          <div className="app-feed-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="property-grid-skeleton" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="app-empty mx-4">
            <p>{t.listings.empty}</p>
          </div>
        ) : (
          <div className="app-feed-grid">
            {properties.map((p) => (
              <PropertyGridCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
