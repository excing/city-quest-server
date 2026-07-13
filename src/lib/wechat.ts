/**
 * Callers: auth wechat login route.
 * API: jscode2session; WECHAT_APPID=dev or code dev:* → mock openid for self-test.
 * User: 开始阶段B 和 C, 完成产品闭环.
 */
import { AppError } from './envelope'

export interface WechatSession {
  openid: string
  sessionKey?: string
  unionid?: string
}

interface Code2SessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export async function code2Session(
  appId: string,
  secret: string,
  code: string,
): Promise<WechatSession> {
  if (!code || code.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', '缺少登录 code', 400)
  }

  if (appId === 'dev' || code.startsWith('dev:')) {
    const openid = code.startsWith('dev:')
      ? `dev_${code.slice(4) || 'user'}`
      : `dev_${code}`
    return { openid }
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', secret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  let data: Code2SessionResponse
  try {
    const res = await fetch(url.toString())
    data = (await res.json()) as Code2SessionResponse
  } catch {
    throw new AppError('WECHAT_LOGIN_FAILED', '微信登录服务暂时不可用', 502)
  }

  if (data.errcode || !data.openid) {
    throw new AppError(
      'WECHAT_LOGIN_FAILED',
      '微信登录失败，请重试',
      401,
      data.errcode ? { errcode: data.errcode } : undefined,
    )
  }

  return {
    openid: data.openid,
    sessionKey: data.session_key,
    unionid: data.unionid,
  }
}
