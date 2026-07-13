/**
 * Callers: admin login route (`src/routes/admin.ts`).
 * Schema: ADMIN_PASSWORD plain env (no admin table).
 * User: 服务端使用明文配置, 不用做hash.
 */

/** Reduce obvious timing leaks on string compare */
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
