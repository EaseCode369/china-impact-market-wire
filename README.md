# 观潮财经

本项目是一个基于 Next.js 的中文财经资讯站，支持：

- 扫描本地 `今日新闻` PDF 目录并做 OCR 提取
- 抓取大智慧、东方财富、财联社、证券时报资讯
- 生成静态前端页面，便于后续部署到 Vercel 或 Zeabur

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

## 常用命令

```bash
npm run generate:local-news
npm run generate:crawled-news
npm run generate:all
npm run build
```
