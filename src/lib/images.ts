/**
 * Join IMAGE_PUBLIC_BASE_URL with an R2 object key.
 * Base should end with `/` (normalized if missing).
 */
export function toPublicImageUrl(baseUrl: string, key: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const path = key.startsWith('/') ? key.slice(1) : key
  return `${base}${path}`
}

export function toPublicImageUrls(
  baseUrl: string,
  keys: readonly string[],
): string[] {
  return keys.map((key) => toPublicImageUrl(baseUrl, key))
}

export function coverUrlFromKeys(
  baseUrl: string,
  keys: readonly string[],
): string | null {
  if (keys.length === 0) {
    return null
  }
  return toPublicImageUrl(baseUrl, keys[0]!)
}
