import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { PropertyGridCard } from '@/components/PropertyGridCard';
import { PropertyFilterBar } from '@/components/PropertyFilterBar';
import { useLanguage } from '@/context/LanguageContext';
import type { Property, PropertyFilters } from '@/types';

function buildQuery(f: PropertyFilters, page: number, limit: number) {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v && v !== 'all') q.set(k, v);
  });
  q.set('page', String(page));
  q.set('limit', String(limit));
  return `?${q.toString()}`;
}

export function ListingsPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Fetch initial batch when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    setTotalCount(undefined);

    const query = buildQuery(filters, 1, 24);
    api
      .get<{ data: Property[]; meta: any }>(`/api/properties${query}`, { auth: false, cacheMs: 15_000 })
      .then((res) => {
        setProperties(res.data);
        if (res.meta && typeof res.meta.totalCount === 'number') {
          setTotalCount(res.meta.totalCount);
        } else {
          setTotalCount(res.data.length);
        }

        if (res.meta && res.meta.currentPage >= res.meta.totalPages) {
          setHasMore(false);
        } else if (res.data.length < 24) {
          setHasMore(false);
        }
      })
      .catch(() => {
        setProperties([]);
        setTotalCount(0);
        setHasMore(false);
      })
      .finally(() => setInitialLoading(false));
  }, [filters]);

  // Load next batch
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || initialLoading) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    const query = buildQuery(filters, nextPage, 24);

    api
      .get<{ data: Property[]; meta: any }>(`/api/properties${query}`, { auth: false, cacheMs: 15_000 })
      .then((res) => {
        setProperties((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = res.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);

        if (res.meta && nextPage >= res.meta.totalPages) {
          setHasMore(false);
        } else if (res.data.length < 24) {
          setHasMore(false);
        }
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => setLoadingMore(false));
  }, [page, filters, hasMore, loadingMore, initialLoading]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore, initialLoading]);

  return (
    <div className="app-page pt-0">
      <div className="sticky top-0 z-30 -mx-4 border-b border-royal-800/70 bg-royal-950/95 px-4 pt-1 pb-2 backdrop-blur-xl shadow-lg shadow-black/20 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <PropertyFilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={initialLoading ? undefined : totalCount}
        />
      </div>

      <div className="-mx-4 mt-2">
        {initialLoading ? (
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

        {/* Intersection sentinel for smooth lazy loading */}
        <div ref={observerTarget} className="h-10 w-full" />

        {loadingMore && (
          <div className="my-6 flex justify-center">
            <div className="flex items-center gap-2 text-sm text-gold-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
              <span>{t.common?.loading || 'Loading more...'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
