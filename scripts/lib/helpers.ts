import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import slugify from "slugify";

import type { GeneratedCollection, NewsPost } from "@/lib/content-schema";

const categoryKeywords: Array<{ category: string; keywords: string[] }> = [
  { category: "宏观", keywords: ["GDP", "央行", "美联储", "财政", "人民币", "经济", "关税", "通胀"] },
  { category: "市场", keywords: ["A股", "港股", "ETF", "成交额", "涨停", "板块", "资金", "指数"] },
  { category: "科技", keywords: ["芯片", "半导体", "AI", "机器人", "算力", "光模块", "电池"] },
  { category: "能源", keywords: ["煤炭", "光伏", "储能", "原油", "绿电", "锂电", "天然气"] },
  { category: "公司", keywords: ["财报", "业绩", "净利润", "分红", "上市公司", "董事长"] },
  { category: "国际", keywords: ["美国", "伊朗", "中东", "和谈", "停火", "日韩", "欧盟"] },
];

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeCollection(fileName: string, posts: NewsPost[]) {
  ensureDir(path.join(process.cwd(), "content", "generated"));
  const collection: GeneratedCollection = {
    generatedAt: new Date().toISOString(),
    count: posts.length,
    posts,
  };

  fs.writeFileSync(
    path.join(process.cwd(), "content", "generated", fileName),
    `${JSON.stringify(collection, null, 2)}\n`,
    "utf8",
  );
}

export function stableId(seed: string) {
  return crypto.createHash("sha1").update(seed).digest("hex");
}

export function createSlug(title: string, id: string) {
  const base = slugify(title, { lower: true, strict: true, trim: true, locale: "zh-CN" });
  return base ? `${base}-${id.slice(0, 8)}` : `news-${id.slice(0, 8)}`;
}

export function inferCategory(title: string, summary: string, sourceName: string) {
  const text = `${title} ${summary} ${sourceName}`.toLowerCase();
  const match = categoryKeywords.find((item) =>
    item.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
  );

  return match?.category ?? "资讯";
}

export function inferTags(title: string, summary: string, sourceName: string) {
  const tags = new Set<string>([sourceName]);
  const text = `${title} ${summary}`;

  for (const item of categoryKeywords) {
    for (const keyword of item.keywords) {
      if (text.includes(keyword)) {
        tags.add(keyword);
      }
      if (tags.size >= 6) {
        break;
      }
    }
    if (tags.size >= 6) {
      break;
    }
  }

  return Array.from(tags);
}

export function normalizeText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+\n/g, "\n")
    .trim();
}

export function summarizeText(text: string, maxSentences = 3, maxLength = 180) {
  const cleaned = normalizeText(text)
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  if (!cleaned) {
    return "";
  }

  const sentences = cleaned
    .split(/(?<=[。！？；.!?])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chosen: string[] = [];
  let totalLength = 0;

  for (const sentence of sentences) {
    const compact = sentence.replace(/\s+/g, "");
    if (compact.length < 16) {
      continue;
    }
    if (chosen.some((item) => item.includes(compact) || compact.includes(item))) {
      continue;
    }
    chosen.push(sentence);
    totalLength += sentence.length;
    if (chosen.length >= maxSentences || totalLength >= maxLength) {
      break;
    }
  }

  return chosen.join(" ").slice(0, maxLength).trim();
}

export function safeDate(dateLike: Date | number | string) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}
