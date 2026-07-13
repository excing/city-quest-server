/**
 * Callers: vitest via npm test. Unit-tests static encyclopedia types.
 * Source: static asset + Worker import for type_key validation.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */
import { describe, expect, it } from 'vitest'
import {
  findTypeByKey,
  getEncyclopediaTypes,
  isValidTypeKey,
} from './types-config'

describe('encyclopedia types config', () => {
  it('includes food scenic goods', () => {
    const types = getEncyclopediaTypes()
    expect(types.map((t) => t.key).sort()).toEqual(['food', 'goods', 'scenic'])
  })

  it('validates type keys', () => {
    expect(isValidTypeKey('food')).toBe(true)
    expect(isValidTypeKey('unknown')).toBe(false)
  })

  it('finds by key', () => {
    expect(findTypeByKey('scenic')?.name).toBe('景点')
    expect(findTypeByKey('nope')).toBeUndefined()
  })

  it('returns defensive copies from getEncyclopediaTypes', () => {
    const a = getEncyclopediaTypes()
    const b = getEncyclopediaTypes()
    a[0]!.name = 'mutated'
    expect(b[0]!.name).not.toBe('mutated')
  })
})
