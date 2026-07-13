/**
 * Callers: admin upload route.
 * Schema: R2 key encyclopedias/{yyyy}/{mm}/{uuid}.{ext}; max 5MB jpeg/png/webp.
 * User: 开始阶段B 和 C, 完成产品闭环.
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

export function buildEncyclopediaImageKey(
  now: Date,
  ext: string,
  id: string,
): string {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `encyclopedias/${yyyy}/${mm}/${id}.${ext}`
}
