/**
 * Callers: vitest via npm test. Unit-tests image key helpers.
 */
import { describe, expect, it } from 'vitest'
import {
  coverKeyFromKeys,
  isSafeAvatarImageKey,
  isSafeEncyclopediaImageKey,
  isSafePublicImageKey,
  normalizeObjectKey,
} from './images'

const KEY = 'encyclopedias/2026/07/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg'
const AVATAR_KEY =
  'avatars/2026/07/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg'

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

describe('isSafeAvatarImageKey', () => {
  it('accepts valid avatar keys', () => {
    expect(isSafeAvatarImageKey(AVATAR_KEY)).toBe(true)
    expect(isSafeAvatarImageKey(`/${AVATAR_KEY}`)).toBe(true)
  })

  it('rejects encyclopedia keys and traversal', () => {
    expect(isSafeAvatarImageKey(KEY)).toBe(false)
    expect(isSafeAvatarImageKey('avatars/../secret.jpg')).toBe(false)
  })
})

describe('isSafePublicImageKey', () => {
  it('accepts encyclopedia and avatar keys', () => {
    expect(isSafePublicImageKey(KEY)).toBe(true)
    expect(isSafePublicImageKey(AVATAR_KEY)).toBe(true)
  })
})
