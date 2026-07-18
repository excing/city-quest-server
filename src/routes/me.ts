/**
 * Callers: src/index.ts mounts at /api/v1/me (NOT bare /api/v1).
 * API: GET / ; POST / (update profile) ; POST /avatar ; GET/POST/DELETE /favorites
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
import { coverKeyFromKeys, isSafeAvatarImageKey } from '../lib/images'
import {
  buildAvatarImageKey,
  extForMime,
  isAllowedImageMime,
  MAX_UPLOAD_BYTES,
} from '../lib/r2'
import { requireUser } from '../middleware/auth-user'

const favoriteBodySchema = z.object({
  encyclopediaId: z.string().uuid(),
})

/** Mainland mobile: 1 + 10 digits; empty/null clears. */
const phoneSchema = z
  .string()
  .regex(/^1\d{10}$/, '手机号格式不正确')
  .nullable()
  .optional()

const profilePatchSchema = z
  .object({
    nickname: z.string().trim().min(1).max(64).optional(),
    phone: phoneSchema,
    /** R2 avatar key from POST /me/avatar */
    avatarKey: z.string().max(512).optional().nullable(),
  })
  .refine(
    (body) =>
      body.nickname !== undefined ||
      body.phone !== undefined ||
      body.avatarKey !== undefined,
    { message: '至少更新一个字段' },
  )

function serializeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
  }
}

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
  return c.json(ok(serializeUser(user)))
})

/** Body update (POST not PATCH — WeChat miniprogram prefers POST). */
meRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401)
  }

  let body: z.infer<typeof profilePatchSchema>
  try {
    body = profilePatchSchema.parse(await c.req.json())
  } catch (error) {
    throw new AppError('VALIDATION_ERROR', '资料参数无效', 400, error)
  }

  if (body.avatarKey !== undefined && body.avatarKey !== null) {
    if (!isSafeAvatarImageKey(body.avatarKey)) {
      throw new AppError('VALIDATION_ERROR', '头像无效', 400)
    }
  }

  const db = createDb(c.env.DATABASE_URL)
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!existing) {
    throw new AppError('UNAUTHORIZED', '用户不存在，请重新登录', 401)
  }

  const patch: {
    nickname?: string
    phone?: string | null
    avatarUrl?: string | null
    updatedAt: Date
  } = { updatedAt: new Date() }

  if (body.nickname !== undefined) {
    patch.nickname = body.nickname
  }
  if (body.phone !== undefined) {
    patch.phone = body.phone
  }
  if (body.avatarKey !== undefined) {
    patch.avatarUrl = body.avatarKey
  }

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning()
  if (!updated) {
    throw new AppError('INTERNAL_ERROR', '更新资料失败', 500)
  }

  return c.json(ok(serializeUser(updated)))
})

meRoutes.post('/avatar', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401)
  }

  const form = await c.req.formData()
  const file = form.get('file')
  if (!isUploadFile(file)) {
    throw new AppError('VALIDATION_ERROR', '请上传文件字段 file', 400)
  }
  if (!isAllowedImageMime(file.type)) {
    throw new AppError('VALIDATION_ERROR', '仅支持 jpeg/png/webp 图片', 400)
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError('VALIDATION_ERROR', '图片不能超过 5MB', 400)
  }
  const ext = extForMime(file.type)
  if (!ext) {
    throw new AppError('VALIDATION_ERROR', '不支持的图片类型', 400)
  }

  const id = crypto.randomUUID()
  const key = buildAvatarImageKey(new Date(), ext, id)
  const bytes = await file.arrayBuffer()

  try {
    await c.env.IMAGES.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    })
  } catch {
    throw new AppError('INTERNAL_ERROR', '图片上传失败', 500)
  }

  return c.json(ok({ key }))
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

interface UploadFileLike {
  type: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

function isUploadFile(value: unknown): value is UploadFileLike {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<UploadFileLike>
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.arrayBuffer === 'function'
  )
}
