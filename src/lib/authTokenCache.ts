let cachedToken: string | undefined;
let tokenFetchedAt = 0;
const TOKEN_CACHE_MS = 60_000;

/** Returns a cached Bearer token, or undefined if missing/expired. Never caches "logged out". */
export function getCachedAuthToken(): string | undefined {
  if (cachedToken && Date.now() - tokenFetchedAt < TOKEN_CACHE_MS) {
    return cachedToken;
  }
  return undefined;
}

export function setCachedAuthToken(token: string | null) {
  // Do not cache null — otherwise post-login /api/me still sends no Authorization for up to 60s
  if (!token) {
    cachedToken = undefined;
    tokenFetchedAt = 0;
    return;
  }
  cachedToken = token;
  tokenFetchedAt = Date.now();
}

export function clearAuthTokenCache() {
  cachedToken = undefined;
  tokenFetchedAt = 0;
}
