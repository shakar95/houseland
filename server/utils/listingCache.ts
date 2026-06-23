const TTL_MS = Number(process.env.LISTING_CACHE_TTL_MS) || 45_000;

type Entry = { data: unknown; expires: number };

const store = new Map<string, Entry>();

export function listingCacheKey(query: Record<string, unknown>): string {
  const keys = Object.keys(query).sort();
  const normalized: Record<string, unknown> = {};
  for (const k of keys) {
    const v = query[k];
    if (v !== undefined && v !== '') normalized[k] = v;
  }
  return JSON.stringify(normalized);
}

export function getListingCache(key: string): unknown | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.data;
}

export function setListingCache(key: string, data: unknown) {
  store.set(key, { data, expires: Date.now() + TTL_MS });
}

export function invalidateListingCache() {
  store.clear();
}
