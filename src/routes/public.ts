import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { createDb } from '../db/client'
import { encyclopedias, favorites } from '../db/schema'
import type { Env } from '../env'
import { AppError, ok } from '../lib/envelope'
import { coverUrlFromKeys, toPublicImageUrls } from '../lib/images'
import { extractBearerToken, verifyToken } from '../lib/jwt'

/**
 * Callers: src/index.ts mounts at /api/v1.
 * API: GET /public/encyclopedias | /public/encyclopedias/:id
 * Types: static asset GET /config/encyclopedia-types.json (not this router).
 * Schema: encyclopedias (published), optional favorites join for isFavorited.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */

const LIST_INTRO_MAX = 80

export const publicRoutes = new Hono<{ Bindings: Env }>()

publicRoutes.get('/public/encyclopedias', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const rows = await db
    .select({
      id: encyclopedias.id,
      name: encyclopedias.name,
      typeKey: encyclopedias.typeKey,
      lng: encyclopedias.lng,
      lat: encyclopedias.lat,
      intro: encyclopedias.intro,
    })
    .from(encyclopedias)
    .where(eq(encyclopedias.status, 'published'))

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    typeKey: row.typeKey,
    lng: row.lng,
    lat: row.lat,
    intro: truncateIntro(row.intro, LIST_INTRO_MAX),
  }))

  return c.json(ok(data, { total: data.length }))
})

publicRoutes.get('/public/encyclopedias/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DATABASE_URL)

  const [row] = await db
    .select()
    .from(encyclopedias)
    .where(
      and(eq(encyclopedias.id, id), eq(encyclopedias.status, 'published')),
    )
    .limit(1)

  if (!row) {
    throw new AppError('NOT_FOUND', '百科不存在或已下架', 404)
  }

  let isFavorited: boolean | undefined
  const token = extractBearerToken(c.req.header('Authorization'))
  if (token) {
    try {
      const payload = await verifyToken(c.env.JWT_SECRET, token)
      if (payload.role === 'user' && payload.sub) {
        const [fav] = await db
          .select({ id: favorites.id })
          .from(favorites)
          .where(
            and(
              eq(favorites.userId, payload.sub),
              eq(favorites.encyclopediaId, id),
            ),
          )
          .limit(1)
        isFavorited = Boolean(fav)
      }
    } catch {
      isFavorited = undefined
    }
  }

  const imageBase = c.env.IMAGE_PUBLIC_BASE_URL
  const images = toPublicImageUrls(imageBase, row.images ?? [])

  return c.json(
    ok({
      id: row.id,
      name: row.name,
      typeKey: row.typeKey,
      lng: row.lng,
      lat: row.lat,
      intro: row.intro,
      address: row.address,
      businessHours: row.businessHours,
      avgPrice: row.avgPrice,
      phone: row.phone,
      tags: row.tags ?? [],
      images,
      coverUrl: coverUrlFromKeys(imageBase, row.images ?? []),
      status: row.status,
      isFavorited,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }),
  )
})

function truncateIntro(intro: string, max: number): string {
  if (intro.length <= max) {
    return intro
  }
  return `${intro.slice(0, max)}…`
}
