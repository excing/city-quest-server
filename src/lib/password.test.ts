/**
 * Callers: vitest. password helpers. API: none. Schema: none.
 * User: 开始阶段B 和 C, 完成产品闭环.
 */
import { describe, expect, it } from 'vitest'
import { safeEqualString } from './password'

describe('safeEqualString', () => {
  it('returns true for equal strings', () => {
    expect(safeEqualString('admin', 'admin')).toBe(true)
  })

  it('returns false for different strings', () => {
    expect(safeEqualString('admin', 'Admin')).toBe(false)
    expect(safeEqualString('a', 'ab')).toBe(false)
  })
})
