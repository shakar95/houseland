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

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1, currentPage: 1 });

  const query = useMemo(() => {
    const base = buildQuery(filters);
    return base ? `${base}&page=${page}&limit=50` : `?page=${page}&limit=50`;
  }, [filters, page]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: Property[]; meta: any }>(`/api/properties${query}`, { auth: false, cacheMs: 300000 })
      .then((res) => {
        setProperties(res.data);
        setMeta(res.meta);
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="app-page pt-0">
      <div className="sticky top-0 z-30 -mx-4 border-b border-royal-800/70 bg-royal-950/95 px-4 pt-1 pb-2 backdrop-blur-xl shadow-lg shadow-black/20 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <PropertyFilterBar filters={filters} onChange={setFilters} resultCount={loading ? undefined : properties.length} />
      </div>

      <div className="-mx-4 mt-2">
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

        {meta.totalPages > 1 && (
          <div className="mt-8 mb-4 flex items-center justify-between px-4 text-sm text-royal-300">
            <div>
              {t.common?.showing || 'Showing'} <span className="font-medium text-gold-400">{(meta.currentPage - 1) * 50 + 1}</span> -{' '}
              <span className="font-medium text-gold-400">
                {Math.min(meta.currentPage * 50, meta.totalCount)}
              </span>{' '}
              {t.common?.of || 'of'} <span className="font-medium text-gold-400">{meta.totalCount}</span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={meta.currentPage === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full bg-royal-800/80 px-4 py-2 hover:bg-royal-700 disabled:opacity-50"
              >
                {t.common?.previous || 'Previous'}
              </button>
              <button
                disabled={meta.currentPage >= meta.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full bg-royal-800/80 px-4 py-2 hover:bg-royal-700 disabled:opacity-50"
              >
                {t.common?.next || 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
