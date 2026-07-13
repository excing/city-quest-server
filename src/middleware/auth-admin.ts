/**
 * Callers: admin protected routes. Requires role=admin JWT.
 * User: 开始阶段B 和 C, 完成产品闭环.
 */
import { createMiddleware } from 'hono/factory'
import type { AppVariables, Env } from '../env'
import { AppError } from '../lib/envelope'
import { extractBearerToken, verifyToken } from '../lib/jwt'

export const requireAdmin = createMiddleware<{
  Bindings: Env
  Variables: AppVariables
}>(async (c, next) => {
  const token = extractBearerToken(c.req.header('Authorization'))
  if (!token) {
    throw new AppError('UNAUTHORIZED', '请先登录管理后台', 401)
  }
  const payload = await verifyToken(c.env.JWT_SECRET, token)
  if (payload.role !== 'admin') {
    throw new AppError('FORBIDDEN', '无权限访问', 403)
  }
  c.set('userId', payload.sub)
  c.set('role', 'admin')
  await next()
})
