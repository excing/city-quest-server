export interface Env {
  DATABASE_URL: string
  JWT_SECRET: string
  WECHAT_APPID: string
  WECHAT_SECRET: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  IMAGE_PUBLIC_BASE_URL: string
  CORS_ORIGIN: string
  IMAGES: R2Bucket
}

export type AppVariables = {
  userId?: string
  role?: 'user' | 'admin'
  openid?: string
}
