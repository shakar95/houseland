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

type RequestOptions = RequestInit & { auth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, ...fetchOptions } = options;
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
  return res.json();
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
