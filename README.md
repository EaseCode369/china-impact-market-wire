# 香港高盛投资集团

基于 Next.js 的中文金融信息站点，当前定位为：

1. 正式官网首页
2. 公开资讯筛选页
3. 公开高频快讯页（前端名称当前为“高盛内参”）
4. 客户专区骨架（高盛研究、后续深度专题内参）

## 当前产品结构

### 官网首页 `/`

正式官网展示页，不直接承载完整资讯流。

### 公开资讯筛选 `/insights`

抓取公开财经网站信息，展示：

1. 标题
2. 短摘要
3. 来源
4. 发布时间
5. 标签
6. 原文入口

当前重点围绕中国资产定价相关内容做筛选与排序。

### 高盛内参 `/live`

当前前端中的“高盛内参”实际上是公开快讯流，主要聚合：

1. 指定 X/Twitter 账号动态
2. TradeAlpha 快讯监控

当前默认保留最近 48 小时内容，并做去重。

### 高盛研究 `/reports`

客户专区中的研究板块，当前为占位页，后续用于承载高质量研报提炼、行业框架与专题研究。

### 深度专题内参 `/briefing`

真正意义上的主题型内参页，功能保留，但当前已从前端主导航隐藏，后续重新产品化。

## 代码与项目文档目录

注意：当前项目管理文档和代码目录不在同一层。

- 项目管理文档在仓库根目录：
  - `../Agent.md`
  - `../docs/PRD.md`
  - `../docs/TODO.md`
  - `../docs/DECISIONS.md`
  - `../docs/CHANGELOG.md`
- 当前站点代码在本目录 `11.1-----/`

## 技术栈

1. Next.js 16
2. React 19
3. TypeScript
4. Supabase Auth
5. Playwright
6. Cheerio
7. Tesseract.js

## 当前抓取来源

### 公开资讯筛选来源

当前启用来源见 `scripts/lib/source-config.ts`，主要包括：

1. Reuters
2. Bloomberg
3. Financial Times
4. WSJ
5. 联合早报
6. 华尔街见闻
7. 第一财经
8. 21财经
9. SCMP
10. 证券时报
11. 东方财富
12. 澎湃新闻

### 高盛内参快讯流来源

1. 指定 X/Twitter 账号列表：`scripts/lib/x-live-config.ts`
2. TradeAlpha 快讯监控

## 本地启动

### 开发站点

```bash
npm install
npm run generate:all
npm run dev
```

默认访问：

[http://localhost:3000](http://localhost:3000)

### 重新生成公开资讯

```bash
npm run generate:all
```

产出：

1. `content/generated/posts.json`
2. `content/generated/latest.json`
3. `content/generated/summary.json`

### 重新生成高盛内参快讯流

```bash
npm run live:generate
```

产出：

1. `content/generated/live-feed.json`

### 抓取并自动推送快讯流

```bash
npm run live:publish
```

该命令会：

1. 重新抓取快讯
2. 更新 `content/generated/live-feed.json`
3. 如有变化则自动 `git commit`
4. 自动 `git push origin main`
5. 由 Vercel 自动部署

## X/Twitter 登录态

快讯流里的 X 抓取依赖本地浏览器登录态。

首次配置可用：

```bash
npm run live:login
```

或：

```bash
npm run live:login:chrome
```

登录态默认保存在：

`11.1-----/.x-playwright-profile`

如果 X 登录失效、账号被风控、页面结构变化，快讯抓取会受到影响。

## 自动更新

### 推荐方式：launchd 每小时运行

当前已提供安装脚本：

```bash
./scripts/install-live-launchd.sh
```

该脚本会：

1. 创建无空格软链接：`/Users/eric/.goldman-news-live`
2. 安装 `~/Library/LaunchAgents/com.goldman.livefeed.hourly.plist`
3. 立即加载并触发一次任务

运行日志：

`/Users/eric/.goldman-news-live/tmp/live-hourly.log`

详细操作见：

[`../docs/LIVE_AUTOPUBLISH_SOP.md`](../docs/LIVE_AUTOPUBLISH_SOP.md)

### 前台保底方式

如果你只想先让它持续跑起来，也可以使用保底前台方式：

```bash
./start-live-hourly.command
```

这个方式需要保持终端窗口打开。

## Supabase 登录与审核

当前使用 Supabase Auth + `profiles` 状态控制客户访问。

状态含义：

1. `pending`：待审核
2. `approved`：已开通
3. `disabled`：已禁用

当前公开页面：

1. `/`
2. `/insights`
3. `/live`
4. `/news/[slug]`
5. `/topics/[topic]`
6. `/sources`
7. `/sources/[source]`

当前客户专属页面：

1. `/reports`
2. 后续重新启用的 `/briefing`

### 环境变量

在 `.env.local` 中至少配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
DEEPSEEK_API_KEY=你的_deepseek_api_key
```

如果部署到 Vercel，也需要同步这些环境变量。

## 常用命令

```bash
npm run dev
npm run build
npm run typecheck
npm run generate:all
npm run live:generate
npm run live:publish
npm run live:login
npm run live:login:chrome
```

## 重要说明

1. 本站内容基于公开信息整理，不做全文转载
2. 当前“高盛内参”前端名称指向公开快讯流，不等于真正的深度专题内参
3. 站点与 Goldman Sachs 集团及其关联实体无隶属、授权或代理关系
