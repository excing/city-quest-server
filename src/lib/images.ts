/**
 * Encyclopedia image object-key helpers (key-only API contract).
 * Clients resolve display URLs: {apiBase}/api/v1/files/{key}
 * Callers: files route (key safety); admin/public/me coverKey; tests.
 */

export const FILES_URL_PREFIX = '/api/v1/files/'

/** R2 keys we are willing to serve publicly through the proxy. */
const SAFE_ENCYCLOPEDIA_KEY =
  /^encyclopedias\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

export function normalizeObjectKey(key: string): string {
  return key.startsWith('/') ? key.slice(1) : key
}

export function isSafeEncyclopediaImageKey(key: string): boolean {
  const normalized = normalizeObjectKey(key)
  if (
    !normalized ||
    normalized.includes('..') ||
    normalized.includes('\\') ||
    normalized.includes('\0')
  ) {
    return false
  }
  return SAFE_ENCYCLOPEDIA_KEY.test(normalized)
}

/** First key is the cover by convention; empty → null. */
export function coverKeyFromKeys(keys: readonly string[]): string | null {
  if (keys.length === 0) {
    return null
  }
  return normalizeObjectKey(keys[0]!)
}
