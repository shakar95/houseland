import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Lang } from '@/i18n';

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

/** Helper to strip any legacy city prefix ("سلێمانی ", "چەمچەماڵ ", etc.) */
function stripCityPrefix(str: string): string {
  if (!str) return '';
  // Preserve "سلێمانی تازە" (New Sulaymaniyah is an actual neighborhood name)
  if (
    str === 'سلێمانی تازە' ||
    str === 'شەقامی سلێمانی تازە' ||
    str === 'New Sulaymaniyah' ||
    str === 'السليمانية الجديدة'
  ) {
    return str;
  }
  return str
    .replace(
      /^(?:سلێمانی|چەمچەماڵ|کەلار|ڕانیە|دووکان|دوکان|پێنجوێن|سەید سادق|هەڵەبجە|Sulaymaniyah|Chamchamal|Kalar|Ranya|Dukan|Penjwen|Said Sadiq|Halabja|السليمانية|چمچمال|كلار|رانية|دوكان|بنجوين|سيد صادق|حلبجة)\s+/i,
      ''
    )
    .replace(/^(?:گەرەکی|گەڕەکی)\s+/i, '')
    .trim();
}

/**
 * Localized label — returns ONLY the clean neighborhood name without any city prefix.
 */
export function getNeighborhoodLabel(n: Neighborhood | undefined | null, lang: Lang): string {
  if (!n) return '';
  const local = getNeighborhoodLocalName(n, lang);
  return stripCityPrefix(local);
}

export function getNeighborhoodLabelByName(
  name: string,
  neighborhoods: Neighborhood[],
  lang: Lang,
): string {
  if (!name) return '';
  const found = neighborhoods.find(
    (n) =>
      n.name === name ||
      (n as any).aliases?.includes(name) ||
      stripCityPrefix(n.name) === stripCityPrefix(name)
  );
  if (found) return getNeighborhoodLabel(found, lang);
  return stripCityPrefix(name);
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
