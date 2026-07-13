import { Hono } from 'hono'
import type { Env } from '../env'
import { ok } from '../lib/envelope'

/**
 * Callers: src/index.ts mounts at /api/v1.
 * API: GET /api/v1/health — no DB.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */

export const healthRoutes = new Hono<{ Bindings: Env }>()

healthRoutes.get('/health', (c) => {
  return c.json(
    ok({
      status: 'ok',
      service: 'city-quest-server',
      time: new Date().toISOString(),
    }),
  )
})
