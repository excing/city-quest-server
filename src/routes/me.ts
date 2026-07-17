/**
 * Callers: src/index.ts mounts at /api/v1/me (NOT bare /api/v1).
 * API: GET / ; GET/POST/DELETE /favorites
 * Schema: users + favorites + encyclopedias (incl. unpublished in list).
 * Important: requireUser must only cover this sub-app, never sibling admin routes.
 */
import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db/client'
import { encyclopedias, favorites, users } from '../db/schema'
import type { AppVariables, Env } from '../env'
import { AppError, ok } from '../lib/envelope'
import { coverKeyFromKeys } from '../lib/images'
import { requireUser } from '../middleware/auth-user'

const favoriteBodySchema = z.object({
  encyclopediaId: z.string().uuid(),
})

/** Mounted at `/api/v1/me` so requireUser never intercepts /admin/login. */
export const meRoutes = new Hono<{
  Bindings: Env
  Variables: AppVariables
}>()

meRoutes.use('*', requireUser)

meRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401)
  }
  const db = createDb(c.env.DATABASE_URL)
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!user) {
    throw new AppError('UNAUTHORIZED', '用户不存在，请重新登录', 401)
  }
  return c.json(
    ok({
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    }),
  )
})

meRoutes.get('/favorites', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401)
  }
  const db = createDb(c.env.DATABASE_URL)
  const rows = await db
    .select({
      encyclopediaId: encyclopedias.id,
      name: encyclopedias.name,
      typeKey: encyclopedias.typeKey,
      intro: encyclopedias.intro,
      status: encyclopedias.status,
      images: encyclopedias.images,
      favoritedAt: favorites.createdAt,
    })
    .from(favorites)
    .innerJoin(encyclopedias, eq(favorites.encyclopediaId, encyclopedias.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt))

  const data = rows.map((row) => ({
    encyclopediaId: row.encyclopediaId,
    name: row.name,
    typeKey: row.typeKey,
    intro: row.intro,
    status: row.status,
    coverKey: coverKeyFromKeys(row.images ?? []),
    favoritedAt: row.favoritedAt.toISOString(),
  }))

  return c.json(ok(data, { total: data.length }))
})

meRoutes.post('/favorites', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401)
  }

  let body: z.infer<typeof favoriteBodySchema>
  try {
    body = favoriteBodySchema.parse(await c.req.json())
  } catch (error) {
    throw new AppError('VALIDATION_ERROR', '参数无效', 400, error)
  }

  const db = createDb(c.env.DATABASE_URL)
  const [item] = await db
    .select()
    .from(encyclopedias)
    .where(eq(encyclopedias.id, body.encyclopediaId))
    .limit(1)

  if (!item || item.status !== 'published') {
    throw new AppError('NOT_FOUND', '百科不存在或已下架，无法收藏', 404)
  }

  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.encyclopediaId, body.encyclopediaId),
      ),
    )
    .limit(1)

  if (!existing) {
    await db.insert(favorites).values({
      userId,
      encyclopediaId: body.encyclopediaId,
    })
  }

  return c.json(ok({ encyclopediaId: body.encyclopediaId, favorited: true }))
})

meRoutes.delete('/favorites/:encyclopediaId', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401)
  }
  const encyclopediaId = c.req.param('encyclopediaId')
  if (!z.string().uuid().safeParse(encyclopediaId).success) {
    throw new AppError('VALIDATION_ERROR', '百科 ID 无效', 400)
  }

  const db = createDb(c.env.DATABASE_URL)
  await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.encyclopediaId, encyclopediaId),
      ),
    )

  return c.json(ok({ encyclopediaId, favorited: false }))
})
