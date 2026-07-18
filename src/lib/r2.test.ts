/**
 * Callers: vitest. R2 key helpers. API: admin + me avatar uploads. Schema: key path.
 */
import { describe, expect, it } from 'vitest'
import {
  buildAvatarImageKey,
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

  it('builds encyclopedia key path', () => {
    const key = buildEncyclopediaImageKey(
      new Date('2026-07-13T00:00:00Z'),
      'jpg',
      'abc',
    )
    expect(key).toBe('encyclopedias/2026/07/abc.jpg')
  })

  it('builds avatar key path', () => {
    const key = buildAvatarImageKey(
      new Date('2026-07-13T00:00:00Z'),
      'png',
      'def',
    )
    expect(key).toBe('avatars/2026/07/def.png')
  })
})
