/**
 * Callers: src/index.ts mounts at /api/v1.
 * API: GET /files/* — stream R2 objects (encyclopedia images).
 * Auth: public read; key must match encyclopedia image layout.
 */
import { Hono } from 'hono'
import type { Env } from '../env'
import { AppError } from '../lib/envelope'
import {
  isSafeEncyclopediaImageKey,
  normalizeObjectKey,
} from '../lib/images'

const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export const filesRoutes = new Hono<{ Bindings: Env }>()

filesRoutes.get('/files/*', async (c) => {
  const key = extractFileKey(new URL(c.req.url).pathname)
  if (!key || !isSafeEncyclopediaImageKey(key)) {
    throw new AppError('NOT_FOUND', '文件不存在', 404)
  }

  const object = await c.env.IMAGES.get(normalizeObjectKey(key))
  if (!object) {
    throw new AppError('NOT_FOUND', '文件不存在', 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', contentTypeForKey(key))
  }

  return new Response(object.body, {
    status: 200,
    headers,
  })
})

/** Pathname like /api/v1/files/encyclopedias/2026/07/uuid.jpg → key */
function extractFileKey(pathname: string): string | null {
  const marker = '/files/'
  const idx = pathname.indexOf(marker)
  if (idx === -1) {
    return null
  }
  const raw = pathname.slice(idx + marker.length)
  if (!raw) {
    return null
  }
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream'
}
