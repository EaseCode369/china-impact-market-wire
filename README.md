# 观潮财经

本项目是一个基于 Next.js 的中文财经资讯站，支持：

- 扫描本地 `今日新闻` PDF 目录并做 OCR 提取
- 抓取大智慧、东方财富、财联社、证券时报资讯
- 生成适合部署到 Vercel 的前端页面
- 使用 Supabase Auth 做整站登录门禁与客户审核状态控制

## 登录门禁说明

当前站点已经接入第一版客户登录门禁，访问规则如下：

- 未登录：只能访问 `/login` 和 `/signup`
- `pending`：登录后只能看到待审核页
- `approved`：可访问首页、新闻详情、来源页、报告页
- `disabled`：登录后只能看到账号不可用页

Supabase 需要一张 `profiles` 表来承载客户状态，SQL 已放在：

`supabase/profiles.sql`

同时也已经整理为 Supabase CLI migration：

`supabase/migrations/20260602223950_create_profiles_auth_gate.sql`

推荐配置步骤：

1. 在 Supabase 新建一个专用项目
2. 使用 Supabase CLI link 项目并执行 `supabase db push`，或打开 SQL Editor 执行 `supabase/profiles.sql`
3. 在 Authentication -> Providers 中启用 Email
4. 如果你希望“注册完立刻进入待审核页”，建议先关闭邮箱确认
5. 在项目根目录新增 `.env.local`，填入以下变量

```bash
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

Vercel 也需要同步设置以上环境变量。

客户审核方式：

- 客户注册后会自动写入 `profiles`
- 默认状态为 `pending`
- 你在 Supabase 后台把 `profiles.status` 改成 `approved` 后，该客户刷新或重新登录即可访问整站
- 如需停用账号，把 `profiles.status` 改成 `disabled`

## 本地启动

### 一键启动

直接双击项目根目录里的 `start-local.bat` 即可。

它会自动完成：

1. 安装依赖（首次运行时）
2. 生成本地与抓取资讯数据
3. 启动开发服务器

启动后访问：

`http://localhost:3000`

### 手动启动

```bash
npm install
npm run generate:all
npm run dev
```

如果已经完成 Supabase 配置，启动后默认通过 `http://localhost:3000` 访问登录页。

## 常用命令

```bash
npm run generate:local-news
npm run generate:crawled-news
npm run generate:all
npm run typecheck
npm run build
```
