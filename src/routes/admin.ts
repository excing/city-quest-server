/**
 * Callers: src/index.ts mounts at /api/v1/admin.
 * API: POST /login (public); types/CRUD/uploads (requireAdmin).
 * Schema: encyclopedias all statuses; R2 images; env admin credentials.
 */
import { count, desc, eq, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db/client'
import {
  encyclopedias,
  type EncyclopediaStatus,
  type NewEncyclopedia,
} from '../db/schema'
import type { AppVariables, Env } from '../env'
import { AppError, ok } from '../lib/envelope'
import { coverUrlFromKeys, toPublicImageUrls } from '../lib/images'
import { signAdminToken } from '../lib/jwt'
import { safeEqualString, verifyPassword } from '../lib/password'
import {
  buildEncyclopediaImageKey,
  extForMime,
  isAllowedImageMime,
  MAX_UPLOAD_BYTES,
} from '../lib/r2'
import { getEncyclopediaTypes, isValidTypeKey } from '../lib/types-config'
import { requireAdmin } from '../middleware/auth-admin'

const loginBodySchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
})

const statusSchema = z.enum(['published', 'unpublished'])

const encyclopediaBodySchema = z.object({
  name: z.string().min(1).max(120),
  typeKey: z.string().min(1).max(32),
  lng: z.number().finite(),
  lat: z.number().finite(),
  intro: z.string().min(1).max(10000),
  address: z.string().max(500).optional().nullable(),
  businessHours: z.string().max(200).optional().nullable(),
  avgPrice: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  images: z.array(z.string().max(512)).max(20).optional(),
  status: statusSchema.optional(),
})

const encyclopediaPatchSchema = encyclopediaBodySchema.partial()

/** Mounted at `/api/v1/admin` — login has no JWT; other routes use requireAdmin. */
export const adminRoutes = new Hono<{
  Bindings: Env
  Variables: AppVariables
}>()

adminRoutes.post('/login', async (c) => {
  let body: z.infer<typeof loginBodySchema>
  try {
    body = loginBodySchema.parse(await c.req.json())
  } catch {
    throw new AppError('VALIDATION_ERROR', '账号或密码错误', 400)
  }

  const usernameOk = safeEqualString(body.username, c.env.ADMIN_USERNAME ?? '')
  const passwordOk = await verifyPassword(
    body.password,
    c.env.ADMIN_PASSWORD_HASH ?? '',
  )
  console.log(body.username, c.env.ADMIN_USERNAME, usernameOk);
  console.log(body.password, c.env.ADMIN_PASSWORD_HASH, passwordOk);
  
  if (!usernameOk || !passwordOk) {
    throw new AppError('UNAUTHORIZED', '账号或密码错误', 401)
  }

  const token = await signAdminToken(c.env.JWT_SECRET)
  return c.json(ok({ token }))
})

const protectedAdmin = new Hono<{
  Bindings: Env
  Variables: AppVariables
}>()
protectedAdmin.use('*', requireAdmin)

protectedAdmin.get('/types', (c) => {
  return c.json(ok(getEncyclopediaTypes()))
})

protectedAdmin.get('/encyclopedias', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? '1') || 1)
  const pageSize = Math.min(
    100,
    Math.max(1, Number(c.req.query('pageSize') ?? '20') || 20),
  )
  const statusQuery = c.req.query('status')
  let statusFilter: EncyclopediaStatus | undefined
  if (statusQuery) {
    const parsed = statusSchema.safeParse(statusQuery)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', '状态参数无效', 400)
    }
    statusFilter = parsed.data
  }

  const db = createDb(c.env.DATABASE_URL)
  const whereClause: SQL | undefined = statusFilter
    ? eq(encyclopedias.status, statusFilter)
    : undefined

  const [totalRow] = await db
    .select({ value: count() })
    .from(encyclopedias)
    .where(whereClause)

  const rows = await db
    .select()
    .from(encyclopedias)
    .where(whereClause)
    .orderBy(desc(encyclopedias.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const imageBase = c.env.IMAGE_PUBLIC_BASE_URL
  const data = rows.map((row) => serializeAdminEncyclopedia(row, imageBase))

  return c.json(
    ok(data, {
      total: Number(totalRow?.value ?? 0),
      page,
      pageSize,
    }),
  )
})

protectedAdmin.post('/encyclopedias', async (c) => {
  let body: z.infer<typeof encyclopediaBodySchema>
  try {
    body = encyclopediaBodySchema.parse(await c.req.json())
  } catch (error) {
    throw new AppError('VALIDATION_ERROR', '百科字段校验失败', 400, error)
  }
  if (!isValidTypeKey(body.typeKey)) {
    throw new AppError('VALIDATION_ERROR', '类型无效', 400)
  }

  const db = createDb(c.env.DATABASE_URL)
  const now = new Date()
  const values: NewEncyclopedia = {
    name: body.name,
    typeKey: body.typeKey,
    lng: body.lng,
    lat: body.lat,
    intro: body.intro,
    address: body.address ?? null,
    businessHours: body.businessHours ?? null,
    avgPrice: body.avgPrice ?? null,
    phone: body.phone ?? null,
    tags: body.tags ?? [],
    images: body.images ?? [],
    status: body.status ?? 'unpublished',
    createdAt: now,
    updatedAt: now,
  }

  const [created] = await db.insert(encyclopedias).values(values).returning()
  if (!created) {
    throw new AppError('INTERNAL_ERROR', '创建失败', 500)
  }
  return c.json(
    ok(serializeAdminEncyclopedia(created, c.env.IMAGE_PUBLIC_BASE_URL)),
    201,
  )
})

protectedAdmin.get('/encyclopedias/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DATABASE_URL)
  const [row] = await db
    .select()
    .from(encyclopedias)
    .where(eq(encyclopedias.id, id))
    .limit(1)
  if (!row) {
    throw new AppError('NOT_FOUND', '百科不存在', 404)
  }
  return c.json(
    ok(serializeAdminEncyclopedia(row, c.env.IMAGE_PUBLIC_BASE_URL)),
  )
})

protectedAdmin.patch('/encyclopedias/:id', async (c) => {
  const id = c.req.param('id')
  let body: z.infer<typeof encyclopediaPatchSchema>
  try {
    body = encyclopediaPatchSchema.parse(await c.req.json())
  } catch (error) {
    throw new AppError('VALIDATION_ERROR', '百科字段校验失败', 400, error)
  }
  if (body.typeKey !== undefined && !isValidTypeKey(body.typeKey)) {
    throw new AppError('VALIDATION_ERROR', '类型无效', 400)
  }

  const db = createDb(c.env.DATABASE_URL)
  const [existing] = await db
    .select()
    .from(encyclopedias)
    .where(eq(encyclopedias.id, id))
    .limit(1)
  if (!existing) {
    throw new AppError('NOT_FOUND', '百科不存在', 404)
  }

  const patch: Partial<NewEncyclopedia> = { updatedAt: new Date() }
  if (body.name !== undefined) patch.name = body.name
  if (body.typeKey !== undefined) patch.typeKey = body.typeKey
  if (body.lng !== undefined) patch.lng = body.lng
  if (body.lat !== undefined) patch.lat = body.lat
  if (body.intro !== undefined) patch.intro = body.intro
  if (body.address !== undefined) patch.address = body.address
  if (body.businessHours !== undefined) {
    patch.businessHours = body.businessHours
  }
  if (body.avgPrice !== undefined) patch.avgPrice = body.avgPrice
  if (body.phone !== undefined) patch.phone = body.phone
  if (body.tags !== undefined) patch.tags = body.tags
  if (body.images !== undefined) patch.images = body.images
  if (body.status !== undefined) patch.status = body.status

  const [updated] = await db
    .update(encyclopedias)
    .set(patch)
    .where(eq(encyclopedias.id, id))
    .returning()

  if (!updated) {
    throw new AppError('INTERNAL_ERROR', '更新失败', 500)
  }
  return c.json(
    ok(serializeAdminEncyclopedia(updated, c.env.IMAGE_PUBLIC_BASE_URL)),
  )
})

protectedAdmin.delete('/encyclopedias/:id', async (c) => {
  const id = c.req.param('id')
  const db = createDb(c.env.DATABASE_URL)
  const deleted = await db
    .delete(encyclopedias)
    .where(eq(encyclopedias.id, id))
    .returning({ id: encyclopedias.id })
  if (deleted.length === 0) {
    throw new AppError('NOT_FOUND', '百科不存在', 404)
  }
  return c.json(ok({ id }))
})

protectedAdmin.post('/uploads', async (c) => {
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
  const key = buildEncyclopediaImageKey(new Date(), ext, id)
  const bytes = await file.arrayBuffer()

  try {
    await c.env.IMAGES.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    })
  } catch {
    throw new AppError('INTERNAL_ERROR', '图片上传失败', 500)
  }

  const base = c.env.IMAGE_PUBLIC_BASE_URL.endsWith('/')
    ? c.env.IMAGE_PUBLIC_BASE_URL
    : `${c.env.IMAGE_PUBLIC_BASE_URL}/`
  return c.json(ok({ key, url: `${base}${key}` }))
})

adminRoutes.route('/', protectedAdmin)

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

function serializeAdminEncyclopedia(
  row: typeof encyclopedias.$inferSelect,
  imageBase: string,
) {
  const keys = row.images ?? []
  return {
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
    images: keys,
    imageUrls: toPublicImageUrls(imageBase, keys),
    coverUrl: coverUrlFromKeys(imageBase, keys),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
