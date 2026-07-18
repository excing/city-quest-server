/**
 * Callers: admin upload route; me avatar upload.
 * Schema: R2 keys encyclopedias|avatars/{yyyy}/{mm}/{uuid}.{ext}; max 5MB jpeg/png/webp.
 */

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function extForMime(mime: string): string | null {
  return ALLOWED_MIME[mime] ?? null
}

export function isAllowedImageMime(mime: string): boolean {
  return mime in ALLOWED_MIME
}

function yyyyMm(now: Date): { yyyy: string; mm: string } {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return { yyyy, mm }
}

export function buildEncyclopediaImageKey(
  now: Date,
  ext: string,
  id: string,
): string {
  const { yyyy, mm } = yyyyMm(now)
  return `encyclopedias/${yyyy}/${mm}/${id}.${ext}`
}

export function buildAvatarImageKey(
  now: Date,
  ext: string,
  id: string,
): string {
  const { yyyy, mm } = yyyyMm(now)
  return `avatars/${yyyy}/${mm}/${id}.${ext}`
}
