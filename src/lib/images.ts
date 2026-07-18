/**
 * Image object-key helpers (key-only API contract).
 * Clients resolve display URLs: {apiBase}/api/v1/files/{key}
 * Callers: files route (key safety); admin/public/me coverKey & avatar; tests.
 */

export const FILES_URL_PREFIX = '/api/v1/files/'

/** R2 keys we are willing to serve publicly through the proxy. */
const SAFE_ENCYCLOPEDIA_KEY =
  /^encyclopedias\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

const SAFE_AVATAR_KEY =
  /^avatars\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

export function normalizeObjectKey(key: string): string {
  return key.startsWith('/') ? key.slice(1) : key
}

function isSafeNormalizedKey(key: string, pattern: RegExp): boolean {
  const normalized = normalizeObjectKey(key)
  if (
    !normalized ||
    normalized.includes('..') ||
    normalized.includes('\\') ||
    normalized.includes('\0')
  ) {
    return false
  }
  return pattern.test(normalized)
}

export function isSafeEncyclopediaImageKey(key: string): boolean {
  return isSafeNormalizedKey(key, SAFE_ENCYCLOPEDIA_KEY)
}

export function isSafeAvatarImageKey(key: string): boolean {
  return isSafeNormalizedKey(key, SAFE_AVATAR_KEY)
}

/** Public file proxy: encyclopedia images + user avatars. */
export function isSafePublicImageKey(key: string): boolean {
  return isSafeEncyclopediaImageKey(key) || isSafeAvatarImageKey(key)
}

/** First key is the cover by convention; empty → null. */
export function coverKeyFromKeys(keys: readonly string[]): string | null {
  if (keys.length === 0) {
    return null
  }
  return normalizeObjectKey(keys[0]!)
}
