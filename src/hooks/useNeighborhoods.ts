import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Lang } from '@/i18n';

export interface Neighborhood {
  id: string;
  name: string;
  nameEn?: string | null;
  nameKu?: string | null;
  nameAr?: string | null;
  latitude: number;
  longitude: number;
  propertyCount?: number;
}

let cachedNeighborhoods: Neighborhood[] | null = null;
let fetchPromise: Promise<Neighborhood[]> | null = null;

/**
 * Returns the localized display label for a neighborhood based on the current language.
 * Falls back to the canonical `name` if translation is not available.
 */
export function getNeighborhoodLabel(n: Neighborhood | undefined | null, lang: Lang): string {
  if (!n) return '';
  if (lang === 'en') return n.nameEn || n.name;
  if (lang === 'ar') return n.nameAr || n.name;
  return n.nameKu || n.name;
}

/**
 * Given a canonical neighborhood name and all loaded neighborhoods,
 * returns the display label in the given language.
 */
export function getNeighborhoodLabelByName(
  name: string,
  neighborhoods: Neighborhood[],
  lang: Lang,
): string {
  const found = neighborhoods.find((n) => n.name === name);
  return found ? getNeighborhoodLabel(found, lang) : name;
}

export function useNeighborhoods() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(cachedNeighborhoods || []);
  const [loading, setLoading] = useState(!cachedNeighborhoods);

  useEffect(() => {
    if (cachedNeighborhoods) {
      setNeighborhoods(cachedNeighborhoods);
      setLoading(false);
      return;
    }
    
    if (!fetchPromise) {
      fetchPromise = api.get<Neighborhood[]>('/api/neighborhoods').then(data => {
        cachedNeighborhoods = data;
        return data;
      }).catch(err => {
        fetchPromise = null;
        throw err;
      });
    }
    
    fetchPromise.then(data => {
      setNeighborhoods(data);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch neighborhoods:', err);
      setLoading(false);
    });
  }, []);

  return { neighborhoods, loading };
}
