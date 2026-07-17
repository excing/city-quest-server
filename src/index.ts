import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Env } from './env'
import {
  AppError,
  fail,
  httpStatusForCode,
  type ApiErrorCode,
} from './lib/envelope'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { filesRoutes } from './routes/files'
import { healthRoutes } from './routes/health'
import { meRoutes } from './routes/me'
import { publicRoutes } from './routes/public'

/**
 * Callers: wrangler.toml main = src/index.ts (Workers entry).
 * API: mounts /api/v1 health + public routes; CORS from CORS_ORIGIN.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  const origins = parseCorsOrigins(c.env.CORS_ORIGIN)
  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) {
        return origins[0] ?? '*'
      }
      if (origins.includes('*')) {
        return origin
      }
      return origins.includes(origin) ? origin : origins[0] ?? ''
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  })
  return corsMiddleware(c, next)
})

app.route('/api/v1', healthRoutes)
app.route('/api/v1', filesRoutes)
app.route('/api/v1', publicRoutes)
app.route('/api/v1', authRoutes)
// Scope auth middleware to path prefixes — never mount me/admin at bare /api/v1
// with use('*'), or requireUser/requireAdmin will intercept sibling routes (e.g. admin login).
app.route('/api/v1/me', meRoutes)
app.route('/api/v1/admin', adminRoutes)

app.notFound((c) => {
  return c.json(fail('NOT_FOUND', '接口不存在'), 404)
})

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      fail(err.code, err.message, err.details),
      err.status as ContentfulStatusCode,
    )
  }

  console.error('[city-quest-server]', err)
  return c.json(
    fail('INTERNAL_ERROR' satisfies ApiErrorCode, '服务暂时不可用，请稍后重试'),
    httpStatusForCode('INTERNAL_ERROR') as ContentfulStatusCode,
  )
})

export default app

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) {
    return ['*']
  }
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
