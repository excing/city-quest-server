import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { AppVariables } from '../env'
import { AppError } from './envelope'

/**
 * Callers: public detail (optional user JWT), later auth/me/admin middleware.
 * API: Authorization Bearer HS256; claims sub/role/openid.
 * Schema: no DB table; tokens are stateless.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */

export type JwtRole = NonNullable<AppVariables['role']>

export interface AppJwtPayload extends JWTPayload {
  sub: string
  role: JwtRole
  openid?: string
}

const encoder = new TextEncoder()

function secretKey(secret: string): Uint8Array {
  return encoder.encode(secret)
}

export async function signUserToken(
  secret: string,
  params: { userId: string; openid: string },
  ttlSeconds = 60 * 60 * 24 * 30,
): Promise<string> {
  return new SignJWT({ role: 'user', openid: params.openid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey(secret))
}

export async function signAdminToken(
  secret: string,
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey(secret))
}

export async function verifyToken(
  secret: string,
  token: string,
): Promise<AppJwtPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ['HS256'],
    })
    const role = payload.role
    if (role !== 'user' && role !== 'admin') {
      throw new AppError('UNAUTHORIZED', '无效的登录凭证', 401)
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new AppError('UNAUTHORIZED', '无效的登录凭证', 401)
    }
    return payload as AppJwtPayload
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError('UNAUTHORIZED', '登录已失效，请重新登录', 401)
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null
  }
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }
  return token
}
