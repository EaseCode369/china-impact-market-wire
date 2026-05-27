import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import slugify from "slugify";

import type { ContentLevel, GeneratedCollection, NewsPost } from "@/lib/content-schema";

const categoryKeywords: Array<{ category: string; keywords: string[] }> = [
  { category: "宏观", keywords: ["gdp", "央行", "美联储", "财政", "人民币", "经济", "关税", "通胀"] },
  { category: "市场", keywords: ["a股", "港股", "etf", "成交额", "涨停", "板块", "资金", "指数"] },
  { category: "科技", keywords: ["芯片", "半导体", "ai", "机器人", "算力", "光模块", "电池"] },
  { category: "能源", keywords: ["煤炭", "光伏", "储能", "原油", "绿电", "锂电", "天然气"] },
  { category: "公司", keywords: ["财报", "业绩", "净利润", "分红", "上市公司", "董事长"] },
  { category: "国际", keywords: ["美国", "伊朗", "中东", "和谈", "停火", "日韩", "欧盟"] },
];

const chinaRelevantRules: Array<{ reason: string; keywords: string[] }> = [
  {
    reason: "命中中国股票市场关键词",
    keywords: ["a股", "港股", "中概股", "北交所", "科创板", "创业板", "沪深", "恒生", "a-share", "hang seng"],
  },
  {
    reason: "命中中国宏观与政策关键词",
    keywords: ["中国", "央行", "人民币", "财政", "地产", "出口", "关税", "降准", "降息", "监管", "国办", "证监会"],
  },
  {
    reason: "命中产业链与行业关键词",
    keywords: ["半导体", "新能源", "ai", "医药", "消费", "券商", "银行", "光伏", "锂电", "稀土", "算力", "芯片"],
  },
  {
    reason: "命中上市公司与财报关键词",
    keywords: ["财报", "并购", "减持", "回购", "上市公司", "业绩", "分红", "融资", "增持", "ipo"],
  },
];

const negativeChinaRelevantKeywords = [
  "秘鲁",
  "莫桑比克",
  "联合国总部",
  "纯海外",
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
  const text = `${title} ${summary}`.toLowerCase();

  for (const item of categoryKeywords) {
    for (const keyword of item.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        tags.add(keyword.toUpperCase() === keyword ? keyword : keyword.replace(/(^|\s)\S/g, (char) => char.toUpperCase()));
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

export function inferChinaStockRelevance(title: string, summary: string) {
  const text = normalizeText(`${title} ${summary}`).toLowerCase();
  const matched = chinaRelevantRules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
  );

  if (!matched) {
    return { isRelevant: false, reason: null as string | null };
  }

  const blocked = negativeChinaRelevantKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
  if (blocked && !text.includes("中国") && !text.includes("a股") && !text.includes("港股")) {
    return { isRelevant: false, reason: null as string | null };
  }

  return {
    isRelevant: true,
    reason: matched.reason,
  };
}

export function normalizeTitle(title: string) {
  return normalizeText(title)
    .toLowerCase()
    .replace(/【[^】]+】/g, " ")
    .replace(/（附名单）|附名单|快看|突发|重磅|标题流|preview/gi, " ")
    .replace(/\b(reuters|bloomberg|financial times|ft|wall street journal|wsj|scmp|华尔街见闻|财联社|证券时报)\b/gi, " ")
    .replace(/\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月\d{1,2}日/g, " ")
    .replace(/[“”"'‘’·:：!！?？,，.。;；()（）\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+\n/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

export function normalizeForComparison(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeText(text: string, maxSentences = 3, maxLength = 180) {
  const cleaned = normalizeText(text).replace(/\s+/g, " ");

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
    if (compact.length < 12) {
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

export function makeHeadlineSummary(sourceName: string) {
  return `来自 ${sourceName} 的公开标题流，请点击查看原文。`;
}

export function buildDedupeKey(title: string, summary: string) {
  const normalizedTitle = normalizeTitle(title);
  const normalizedSummary = normalizeForComparison(summary).slice(0, 160);
  return `${normalizedTitle}::${normalizedSummary}`;
}

export function compareContentLevel(a: ContentLevel, b: ContentLevel) {
  const rank: Record<ContentLevel, number> = {
    headline: 0,
    teaser: 1,
    summary: 2,
  };
  return rank[a] - rank[b];
}

export function isNearDuplicate(a: NewsPost, b: NewsPost) {
  if (a.original_url && b.original_url && a.original_url === b.original_url) {
    return true;
  }

  const titleA = normalizeTitle(a.title);
  const titleB = normalizeTitle(b.title);
  if (titleA && titleA === titleB) {
    return true;
  }

  const summaryA = normalizeForComparison(a.summary);
  const summaryB = normalizeForComparison(b.summary);
  if (!titleA || !titleB || !summaryA || !summaryB) {
    return false;
  }

  const titleContained = titleA.includes(titleB) || titleB.includes(titleA);
  const summaryContained = summaryA.includes(summaryB) || summaryB.includes(summaryA);
  return titleContained && summaryContained;
}
