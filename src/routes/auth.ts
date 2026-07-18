/**
 * Callers: src/index.ts mounts /api/v1.
 * API: POST /auth/wechat/login { code, nickname?, avatarUrl? } → { token, user }
 * Schema: users upsert by openid.
 * User: 开始阶段B 和 C, 完成产品闭环.
 */
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db/client'
import { users } from '../db/schema'
import type { Env } from '../env'
import { AppError, ok } from '../lib/envelope'
import { signUserToken } from '../lib/jwt'
import { code2Session } from '../lib/wechat'

const loginBodySchema = z.object({
  code: z.string().min(1),
  nickname: z.string().max(64).optional().nullable(),
  avatarUrl: z.string().max(2048).optional().nullable(),
})

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.post('/auth/wechat/login', async (c) => {
  let body: z.infer<typeof loginBodySchema>
  try {
    body = loginBodySchema.parse(await c.req.json())
  } catch (error) {
    throw new AppError('VALIDATION_ERROR', '登录参数无效', 400, error)
  }

  const session = await code2Session(
    c.env.WECHAT_APPID,
    c.env.WECHAT_SECRET,
    body.code,
  )

  const db = createDb(c.env.DATABASE_URL)
  const now = new Date()

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.openid, session.openid))
    .limit(1)

  let user = existing
  if (user) {
    const nickname =
      body.nickname !== undefined && body.nickname !== null
        ? body.nickname
        : user.nickname
    const avatarUrl =
      body.avatarUrl !== undefined && body.avatarUrl !== null
        ? body.avatarUrl
        : user.avatarUrl
    const [updated] = await db
      .update(users)
      .set({
        nickname,
        avatarUrl,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .returning()
    user = updated ?? user
  } else {
    const [created] = await db
      .insert(users)
      .values({
        openid: session.openid,
        nickname: body.nickname ?? null,
        avatarUrl: body.avatarUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    if (!created) {
      throw new AppError('INTERNAL_ERROR', '创建用户失败', 500)
    }
    user = created
  }

  const token = await signUserToken(c.env.JWT_SECRET, {
    userId: user.id,
    openid: user.openid,
  })

  return c.json(
    ok({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
    }),
  )
})
