export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'WECHAT_LOGIN_FAILED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  details?: unknown
}

export interface ApiMeta {
  total?: number
  page?: number
  pageSize?: number
  [key: string]: unknown
}

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiErrorBody | null
  meta: ApiMeta | null
}

export function ok<T>(data: T, meta: ApiMeta | null = null): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta,
  }
}

export function fail(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: details === undefined ? { code, message } : { code, message, details },
    meta: null,
  }
}

export class AppError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details?: unknown

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function httpStatusForCode(code: ApiErrorCode): number {
  switch (code) {
    case 'UNAUTHORIZED':
    case 'WECHAT_LOGIN_FAILED':
      return 401
    case 'FORBIDDEN':
      return 403
    case 'NOT_FOUND':
      return 404
    case 'VALIDATION_ERROR':
      return 400
    case 'CONFLICT':
      return 409
    case 'INTERNAL_ERROR':
    default:
      return 500
  }
}
