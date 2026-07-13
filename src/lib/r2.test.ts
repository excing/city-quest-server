/**
 * Callers: vitest. R2 key helpers. API: admin uploads. Schema: key path.
 * User: 开始阶段B 和 C, 完成产品闭环.
 */
import { describe, expect, it } from 'vitest'
import {
  buildEncyclopediaImageKey,
  extForMime,
  isAllowedImageMime,
} from './r2'

describe('r2 helpers', () => {
  it('allows jpeg png webp', () => {
    expect(isAllowedImageMime('image/jpeg')).toBe(true)
    expect(isAllowedImageMime('image/png')).toBe(true)
    expect(isAllowedImageMime('image/webp')).toBe(true)
    expect(isAllowedImageMime('image/gif')).toBe(false)
  })

  it('maps mime to ext', () => {
    expect(extForMime('image/jpeg')).toBe('jpg')
    expect(extForMime('image/png')).toBe('png')
  })

  it('builds key path', () => {
    const key = buildEncyclopediaImageKey(
      new Date('2026-07-13T00:00:00Z'),
      'jpg',
      'abc',
    )
    expect(key).toBe('encyclopedias/2026/07/abc.jpg')
  })
})
