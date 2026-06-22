let cachedToken: string | null | undefined;
let tokenFetchedAt = 0;
const TOKEN_CACHE_MS = 60_000;

export function getCachedAuthToken(): string | null | undefined {
  if (cachedToken !== undefined && Date.now() - tokenFetchedAt < TOKEN_CACHE_MS) {
    return cachedToken;
  }
  return undefined;
}

export function setCachedAuthToken(token: string | null) {
  cachedToken = token;
  tokenFetchedAt = Date.now();
}

export function clearAuthTokenCache() {
  cachedToken = undefined;
  tokenFetchedAt = 0;
}
