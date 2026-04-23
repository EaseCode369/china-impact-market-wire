import path from "node:path";

export const LOCAL_NEWS_DIR =
  process.env.LOCAL_NEWS_DIR ??
  "C:\\Users\\83574\\Desktop\\个人开发\\11、codex自动操作电脑\\每日新闻\\今日新闻";

export const GENERATED_DIR = path.join(process.cwd(), "content", "generated");
export const TMP_DIR = path.join(process.cwd(), "tmp");
export const OCR_CACHE_DIR = path.join(process.cwd(), "tesseract-cache");

export const CRAWLER_LIMIT = 8;
