# city-quest-server

「我的城市探秘」API：Cloudflare Workers + Hono + Neon PostgreSQL + R2。

产品 / 技术权威见父仓：

- `docs/产品经理/PRD-我的城市探秘.md`
- `docs/研发/技术方案-我的城市探秘.md`

## 本地开发

```bash
cp .dev.vars.example .dev.vars
# 填写 DATABASE_URL / JWT_SECRET 等

npm install
npm run typecheck
npm test
npm run dev
# GET http://127.0.0.1:8787/api/v1/health
# GET http://127.0.0.1:8787/api/v1/public/types
```

### 数据库

1. 在 Neon 创建数据库，将连接串写入 `.dev.vars` 的 `DATABASE_URL`。
2. 应用迁移：

```bash
export DATABASE_URL='postgresql://...'
npm run db:migrate
# 或在 Neon SQL Editor 执行 src/db/migrations/0000_init.sql
```

3. 可选 seed（大理示意点位）：

```bash
# 在 Neon SQL Editor 执行 src/db/seed.sql
```

### 管理密码哈希

```bash
node -e "import('bcryptjs').then(b=>b.hash('your-password',10).then(console.log))"
```

## 已实现 API（阶段 A–C）

| 路径 | 说明 |
|------|------|
| `GET /api/v1/health` | 探活 |
| `GET /api/v1/public/types` | 百科类型 |
| `GET /api/v1/public/encyclopedias` | published 列表 |
| `GET /api/v1/public/encyclopedias/:id` | 上架详情；可选 user JWT → `isFavorited` |
| `POST /api/v1/auth/wechat/login` | 微信登录（`WECHAT_APPID=dev` 可本地 mock） |
| `GET /api/v1/me` | 当前用户 |
| `GET/POST/DELETE /api/v1/me/favorites` | 收藏 |
| `POST /api/v1/admin/login` | 管理登录 |
| `GET/POST/PATCH/DELETE /api/v1/admin/encyclopedias` | 百科 CRUD |
| `POST /api/v1/admin/uploads` | R2 图片上传 |

## 部署

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
# ... 其余 secrets
npm run deploy
```

生产请绑定自定义域，勿依赖 `*.workers.dev` 作为小程序合法域名主入口。
