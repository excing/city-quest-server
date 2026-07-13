/**
 * Callers: admin login route.
 * Schema: ADMIN_PASSWORD_HASH bcrypt in env (no admin table).
 * User: 开始阶段B 和 C, 完成产品闭环.
 */
import bcrypt from 'bcryptjs'

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) {
    return false
  }
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

/** Reduce obvious timing leaks on username compare */
export function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let diff = a.length ^ b.length
    const max = Math.max(a.length, b.length)
    for (let i = 0; i < max; i++) {
      const ca = a.charCodeAt(i) || 0
      const cb = b.charCodeAt(i) || 0
      diff |= ca ^ cb
    }
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
