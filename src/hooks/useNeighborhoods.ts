import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Lang } from '@/i18n';
import { DEFAULT_CITY_ID, getCityLabel } from '@/lib/cities';

export interface Neighborhood {
  id: string;
  name: string;
  city?: string | null;
  nameEn?: string | null;
  nameKu?: string | null;
  nameAr?: string | null;
  latitude: number;
  longitude: number;
  propertyCount?: number;
}

const CACHE_TTL_MS = 30_000;

let cachedNeighborhoods: Neighborhood[] | null = null;
let cacheExpiresAt = 0;
let fetchPromise: Promise<Neighborhood[]> | null = null;

function getNeighborhoodLocalName(n: Neighborhood, lang: Lang): string {
  if (lang === 'en') return n.nameEn || n.name;
  if (lang === 'ar') return n.nameAr || n.name;
  return n.nameKu || n.name;
}

/**
 * Localized label with city prefix — e.g. "سلێمانی ئازادی" / "چەمچەماڵ ئاشتی".
 */
export function getNeighborhoodLabel(n: Neighborhood | undefined | null, lang: Lang): string {
  if (!n) return '';
  const city = getCityLabel(n.city || DEFAULT_CITY_ID, lang);
  const local = getNeighborhoodLocalName(n, lang);
  if (local.startsWith(city)) return local;
  return `${city} ${local}`;
}

export function getNeighborhoodLabelByName(
  name: string,
  neighborhoods: Neighborhood[],
  lang: Lang,
): string {
  const found = neighborhoods.find((n) => n.name === name);
  return found ? getNeighborhoodLabel(found, lang) : name;
}

/** Clear in-memory cache (e.g. after admin edits). */
export function clearNeighborhoodsCache() {
  cachedNeighborhoods = null;
  cacheExpiresAt = 0;
  fetchPromise = null;
}

function loadNeighborhoods(force = false): Promise<Neighborhood[]> {
  const now = Date.now();
  if (!force && cachedNeighborhoods && now < cacheExpiresAt) {
    return Promise.resolve(cachedNeighborhoods);
  }

  if (!force && fetchPromise) return fetchPromise;

  fetchPromise = api
    .get<Neighborhood[]>(`/api/neighborhoods?v=${now}`, { auth: false })
    .then((data) => {
      cachedNeighborhoods = data;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      fetchPromise = null;
      return data;
    })
    .catch((err) => {
      fetchPromise = null;
      throw err;
    });

  return fetchPromise;
}

export function useNeighborhoods() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(cachedNeighborhoods || []);
  const [loading, setLoading] = useState(!cachedNeighborhoods);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadNeighborhoods()
      .then((data) => {
        if (cancelled) return;
        setNeighborhoods(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch neighborhoods:', err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { neighborhoods, loading, error, reload: () => loadNeighborhoods(true) };
}
