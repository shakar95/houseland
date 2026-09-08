import { getAccessToken } from './supabase';
import { clearAuthTokenCache, getCachedAuthToken, setCachedAuthToken } from './authTokenCache';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function authHeader(): Promise<HeadersInit> {
  const cached = getCachedAuthToken();
  if (cached !== undefined) {
    return cached ? { Authorization: `Bearer ${cached}` } : {};
  }
  const token = await getAccessToken();
  setCachedAuthToken(token);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { clearAuthTokenCache };

type RequestOptions = RequestInit & { auth?: boolean; cacheMs?: number };

const memCache = new Map<string, { data: unknown; expires: number }>();

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, cacheMs = 0, ...fetchOptions } = options;
  
  const isGet = !fetchOptions.method || fetchOptions.method === 'GET';
  const cacheKey = isGet ? path : null;

  if (cacheMs > 0 && cacheKey) {
    const cached = memCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data as T;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(auth ? await authHeader() : {}),
    ...fetchOptions.headers,
  };
  const res = await fetch(`${BASE}${path}`, { ...fetchOptions, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  const data = await res.json();
  
  if (cacheMs > 0 && cacheKey) {
    memCache.set(cacheKey, { data, expires: Date.now() + cacheMs });
  }
  
  return data;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, options),
  post: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
