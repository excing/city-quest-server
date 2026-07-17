/**
 * Callers: vitest via npm test. Unit-tests image key helpers.
 */
import { describe, expect, it } from 'vitest'
import {
  coverKeyFromKeys,
  isSafeEncyclopediaImageKey,
  normalizeObjectKey,
} from './images'

const KEY = 'encyclopedias/2026/07/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg'

describe('normalizeObjectKey', () => {
  it('strips leading slash', () => {
    expect(normalizeObjectKey(`/${KEY}`)).toBe(KEY)
    expect(normalizeObjectKey(KEY)).toBe(KEY)
  })
})

describe('coverKeyFromKeys', () => {
  it('returns null for empty list', () => {
    expect(coverKeyFromKeys([])).toBeNull()
  })

  it('returns first key as cover', () => {
    expect(coverKeyFromKeys([KEY, 'other.jpg'])).toBe(KEY)
  })
})

describe('isSafeEncyclopediaImageKey', () => {
  it('accepts valid encyclopedia keys', () => {
    expect(isSafeEncyclopediaImageKey(KEY)).toBe(true)
    expect(
      isSafeEncyclopediaImageKey(
        'encyclopedias/2026/07/a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp',
      ),
    ).toBe(true)
  })

  it('rejects path traversal and foreign prefixes', () => {
    expect(isSafeEncyclopediaImageKey('../etc/passwd')).toBe(false)
    expect(isSafeEncyclopediaImageKey('encyclopedias/../secret.jpg')).toBe(
      false,
    )
    expect(isSafeEncyclopediaImageKey('other/2026/07/uuid.jpg')).toBe(false)
    expect(isSafeEncyclopediaImageKey('')).toBe(false)
    expect(isSafeEncyclopediaImageKey(`/${KEY}`)).toBe(true)
  })
})
