/**
 * Callers: vitest via npm test. Unit-tests API envelope helpers.
 * API: response shape {success,data,error,meta}. Schema: none.
 * User: 阅读 @docs , 然后选择合适的agents或skills, 开始进行开发.
 */
import { describe, expect, it } from 'vitest'
import { AppError, fail, httpStatusForCode, ok } from './envelope'

describe('ok', () => {
  it('wraps data with success envelope', () => {
    expect(ok({ a: 1 })).toEqual({
      success: true,
      data: { a: 1 },
      error: null,
      meta: null,
    })
  })

  it('includes meta when provided', () => {
    expect(ok([], { total: 0 }).meta).toEqual({ total: 0 })
  })
})

describe('fail', () => {
  it('wraps error code and message', () => {
    expect(fail('NOT_FOUND', '百科不存在或已下架')).toEqual({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: '百科不存在或已下架' },
      meta: null,
    })
  })
})

describe('httpStatusForCode', () => {
  it('maps known codes', () => {
    expect(httpStatusForCode('UNAUTHORIZED')).toBe(401)
    expect(httpStatusForCode('FORBIDDEN')).toBe(403)
    expect(httpStatusForCode('NOT_FOUND')).toBe(404)
    expect(httpStatusForCode('VALIDATION_ERROR')).toBe(400)
    expect(httpStatusForCode('CONFLICT')).toBe(409)
    expect(httpStatusForCode('INTERNAL_ERROR')).toBe(500)
  })
})

describe('AppError', () => {
  it('carries code and status', () => {
    const err = new AppError('NOT_FOUND', 'missing', 404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.status).toBe(404)
    expect(err.message).toBe('missing')
  })
})
