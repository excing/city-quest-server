/**
 * Callers: vitest via npm test. Unit-tests pure image URL helpers.
 * API: none. Schema: none.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */
import { describe, expect, it } from 'vitest'
import {
  coverUrlFromKeys,
  toPublicImageUrl,
  toPublicImageUrls,
} from './images'

describe('toPublicImageUrl', () => {
  it('joins base with trailing slash and key', () => {
    expect(toPublicImageUrl('https://img.example.com/', 'a/b.jpg')).toBe(
      'https://img.example.com/a/b.jpg',
    )
  })

  it('adds trailing slash when missing', () => {
    expect(toPublicImageUrl('https://img.example.com', 'a/b.jpg')).toBe(
      'https://img.example.com/a/b.jpg',
    )
  })

  it('strips leading slash on key', () => {
    expect(toPublicImageUrl('https://img.example.com/', '/a/b.jpg')).toBe(
      'https://img.example.com/a/b.jpg',
    )
  })
})

describe('toPublicImageUrls', () => {
  it('maps keys immutably', () => {
    const keys = ['1.png', '2.png']
    expect(toPublicImageUrls('https://img.example.com/', keys)).toEqual([
      'https://img.example.com/1.png',
      'https://img.example.com/2.png',
    ])
  })
})

describe('coverUrlFromKeys', () => {
  it('returns null for empty list', () => {
    expect(coverUrlFromKeys('https://img.example.com/', [])).toBeNull()
  })

  it('returns first key as cover', () => {
    expect(
      coverUrlFromKeys('https://img.example.com/', ['cover.jpg', '2.jpg']),
    ).toBe('https://img.example.com/cover.jpg')
  })
})
