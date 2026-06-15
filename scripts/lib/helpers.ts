import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import slugify from "slugify";

import type { ContentLevel, GeneratedCollection, NewsPost } from "@/lib/content-schema";

const categoryKeywords: Array<{ category: string; keywords: string[] }> = [
  { category: "宏观", keywords: ["gdp", "央行", "美联储", "财政", "人民币", "经济", "关税", "通胀", "发改委", "出口"] },
  { category: "市场", keywords: ["a股", "港股", "中概股", "etf", "成交额", "涨停", "板块", "资金", "指数", "恒生", "两融", "ipo"] },
  { category: "科技", keywords: ["芯片", "半导体", "ai", "机器人", "算力", "光模块", "电池", "cpo"] },
  { category: "能源", keywords: ["煤炭", "光伏", "储能", "原油", "绿电", "锂电", "天然气"] },
  { category: "公司", keywords: ["财报", "业绩", "净利润", "分红", "上市公司", "董事长", "减持", "增持", "回购", "并购", "定增"] },
  { category: "国际", keywords: ["美国", "伊朗", "中东", "和谈", "停火", "日韩", "欧盟"] },
];

const chinaRelevantRules: Array<{ reason: string; keywords: string[] }> = [
  {
    reason: "命中中国股票市场关键词",
    keywords: [
      "a股",
      "港股",
      "中概股",
      "北交所",
      "科创板",
      "创业板",
      "沪深",
      "恒生",
      "两融",
      "etf",
      "ipo",
      "a-share",
      "hang seng",
      "股市",
      "股票",
      "美股",
      "纳指",
      "标普",
      "半导体指数",
    ],
  },
  {
    reason: "命中中国宏观与政策关键词",
    keywords: ["央行", "人民币", "财政", "地产", "出口", "关税", "降准", "降息", "证监会", "发改委", "财政部", "金融监管", "贷款", "利率", "汇率"],
  },
  {
    reason: "命中产业链与行业关键词",
    keywords: ["半导体", "新能源", "ai", "医药", "消费", "券商", "银行", "光伏", "锂电", "稀土", "算力", "芯片", "机器人", "cpo"],
  },
  {
    reason: "命中上市公司与财报关键词",
    keywords: ["财报", "并购", "减持", "回购", "上市公司", "业绩", "分红", "融资", "增持", "ipo", "定增"],
  },
];

const negativeChinaRelevantKeywords = [
  "秘鲁",
  "莫桑比克",
  "联合国总部",
  "纯海外",
  "天安门",
  "六四",
  "周年纪念",
  "承认真相",
  "历史真相",
  "人权",
  "制裁古巴",
  "外交部答问",
  "台湾总统表示",
  "旅行禁令",
  "议员赴台",
  "海上边界谈判",
  "南海海域对峙",
];

const investmentContextKeywords = [
  "a股",
  "港股",
  "中概股",
  "北交所",
  "科创板",
  "创业板",
  "沪深",
  "恒生",
  "etf",
  "ipo",
  "股市",
  "股票",
  "美股",
  "纳指",
  "标普",
  "道指",
  "半导体指数",
  "央行",
  "人民币",
  "汇率",
  "利率",
  "财政",
  "地产",
  "出口",
  "关税",
  "降准",
  "降息",
  "证监会",
  "发改委",
  "金融监管",
  "半导体",
  "新能源",
  "ai",
  "医药",
  "消费",
  "券商",
  "银行",
  "光伏",
  "锂电",
  "稀土",
  "算力",
  "芯片",
  "机器人",
  "cpo",
  "财报",
  "并购",
  "减持",
  "回购",
  "上市公司",
  "业绩",
  "分红",
  "融资",
  "增持",
  "定增",
  "营收",
  "净利润",
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
  if (shouldExcludeSensitiveNews(title, summary)) {
    return { isRelevant: false, reason: null as string | null };
  }

  const hasInvestmentContext = investmentContextKeywords.some((keyword) => includesKeyword(text, keyword));
  if (!hasInvestmentContext) {
    return { isRelevant: false, reason: null as string | null };
  }

  const matched = chinaRelevantRules.find((rule) =>
    rule.keywords.some((keyword) => includesKeyword(text, keyword)),
  );

  if (!matched) {
    return { isRelevant: false, reason: null as string | null };
  }

  return {
    isRelevant: true,
    reason: matched.reason,
  };
}

export function shouldExcludeSensitiveNews(title: string, summary: string) {
  const text = normalizeText(`${title} ${summary}`).toLowerCase();
  return negativeChinaRelevantKeywords.some((keyword) => includesKeyword(text, keyword));
}

function includesKeyword(text: string, keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();
  if (/^[a-z0-9.+-]+$/i.test(normalizedKeyword)) {
    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
  }

  return text.includes(normalizedKeyword);
}

export function normalizeTitle(title: string) {
  return normalizeText(title)
    .toLowerCase()
    .replace(/【[^】]+】/g, " ")
    .replace(/（附名单）|附名单|快看|突发|重磅|标题流|preview/gi, " ")
    .replace(/\b(reuters|bloomberg|financial times|ft|wall street journal|wsj|scmp|华尔街见闻|财联社|证券时报|第一财经|21财经)\b/gi, " ")
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

export function containsCjk(text: string) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
}

export function shouldLocalizeToSimplifiedChinese(title: string, summary: string, sourceName: string, sourceId?: string) {
  if (containsCjk(title) || containsCjk(summary)) {
    return false;
  }

  const normalizedSourceId = sourceId?.trim().toLowerCase();
  if (normalizedSourceId && ["reuters", "bloomberg", "ft", "wsj", "scmp"].includes(normalizedSourceId)) {
    return true;
  }

  const normalizedSource = sourceName.trim().toLowerCase();
  return [
    "reuters",
    "reuters.com",
    "bloomberg",
    "bloomberg.com",
    "financial times",
    "ft",
    "ft.com",
    "wsj",
    "wsj.com",
    "scmp",
    "scmp.com",
  ].includes(normalizedSource);
}

function cleanEnglishHeadlineText(text: string) {
  return normalizeText(text)
    .replace(/\s+/g, " ")
    .replace(/\bReuters\b$/i, "")
    .replace(/\bBloomberg\b$/i, "")
    .replace(/\bFinancial Times\b$/i, "")
    .replace(/\bWSJ\b$/i, "")
    .replace(/\bSCMP\b$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const phraseTranslations: Array<[RegExp, string]> = [
  [/\bHong Kong watchdog\b/gi, "香港监管机构"],
  [/\blocal units of two Chinese brokerages\b/gi, "两家中资券商的本地业务部门"],
  [/\braids?\b/gi, "突击检查"],
  [/\bsources say\b/gi, "知情人士称"],
  [/\bTaiwan suspects\b/gi, "台湾方面怀疑"],
  [/\bNvidia chips\b/gi, "英伟达芯片"],
  [/\bsmuggled to China\b/gi, "被走私至中国"],
  [/\bvia Japan\b/gi, "经由日本"],
  [/\bBloomberg News reports\b/gi, "彭博报道"],
  [/\bCOSCO\b/gi, "中远海运"],
  [/\bproducts tanker\b/gi, "成品油轮"],
  [/\bleaving Strait of Hormuz\b/gi, "驶离霍尔木兹海峡"],
  [/\boil traffic still limited\b/gi, "石油运输仍然受限"],
  [/\bChina\b/gi, "中国"],
  [/\bChinese\b/gi, "中国"],
  [/\bHong Kong\b/gi, "香港"],
  [/\bTaiwan\b/gi, "台湾"],
  [/\bJapan\b/gi, "日本"],
  [/\bReuters\b/gi, "路透"],
  [/\bBloomberg\b/gi, "彭博"],
  [/\bFinancial Times\b/gi, "英国《金融时报》"],
  [/\bWSJ\b/gi, "《华尔街日报》"],
  [/\bSCMP\b/gi, "《南华早报》"],
  [/\bwatchdog\b/gi, "监管机构"],
  [/\bbrokerages\b/gi, "券商"],
  [/\bbrokerage\b/gi, "券商"],
  [/\bchips\b/gi, "芯片"],
  [/\bchip\b/gi, "芯片"],
  [/\bsmuggled\b/gi, "走私"],
  [/\breports?\b/gi, "报道"],
  [/\bsuspects?\b/gi, "怀疑"],
  [/\bsources\b/gi, "知情人士"],
  [/\bsays?\b/gi, "称"],
  [/\bparallel park\b/gi, "自动泊车"],
  [/\bpark for you\b/gi, "代客泊车"],
  [/\bself-driving mode\b/gi, "自动驾驶模式"],
  [/\bran a red light\b/gi, "闯红灯"],
  [/\bsaving me from crashing\b/gi, "避免发生碰撞"],
  [/\blove my @?Tesla\b/gi, "认可特斯拉"],
  [/\bTesla\b/gi, "特斯拉"],
];

function fallbackWordTranslations(text: string) {
  let localized = text;

  for (const [pattern, replacement] of phraseTranslations) {
    localized = localized.replace(pattern, replacement);
  }

  localized = localized
    .replace(/\bof\b/gi, "的")
    .replace(/\bto\b/gi, "至")
    .replace(/\bvia\b/gi, "通过")
    .replace(/\band\b/gi, "和")
    .replace(/\bthe\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([，。！？；：])/g, "$1")
    .trim();

  return localized;
}

export function localizeEnglishTitleToSimplifiedChinese(title: string, sourceName: string) {
  const cleaned = cleanEnglishHeadlineText(title);
  if (!cleaned) {
    return title;
  }

  const intentTitle = summarizeEnglishIntent(cleaned, sourceName);
  if (intentTitle) {
    return intentTitle;
  }

  const translated = fallbackWordTranslations(cleaned);

  if (translated === cleaned) {
    return `【${sourceName}】发布最新动态`;
  }

  return translated
    .replace(/，\s*知情人士称$/u, "，知情人士称")
    .replace(/，\s*彭博报道$/u, "，彭博报道")
    .replace(/\s+/g, " ")
    .replace(/，知情人士称$/, "，知情人士称");
}

export function localizeEnglishSummaryToSimplifiedChinese(summary: string, sourceName: string) {
  const cleaned = cleanEnglishHeadlineText(summary);
  if (!cleaned) {
    return makeHeadlineSummary(sourceName);
  }

  const intentSummary = summarizeEnglishIntent(cleaned, sourceName, true);
  if (intentSummary) {
    return intentSummary.endsWith("。") ? intentSummary : `${intentSummary}。`;
  }

  const translated = fallbackWordTranslations(cleaned);

  if (translated === cleaned) {
    return `${sourceName} 发布了新的英文动态，站内已提炼重点，并保留原文链接供进一步查看。`;
  }

  const condensed = translated
    .replace(/\s+/g, " ")
    .replace(/Reuters$/u, "路透")
    .replace(/Bloomberg$/u, "彭博")
    .replace(/FinancialTimes$/u, "英国《金融时报》")
    .replace(/WSJ$/u, "《华尔街日报》")
    .replace(/SCMP$/u, "《南华早报》");

  return condensed.endsWith("。") ? condensed : `${condensed}。`;
}

function summarizeEnglishIntent(text: string, sourceName: string, verbose = false) {
  const normalized = text.toLowerCase();

  if (normalized.includes("parallel park")) {
    return verbose
      ? `${sourceName} 展示了与自动泊车相关的新动态，强调车辆可以完成平行泊车这类日常驾驶辅助动作`
      : `${sourceName} 展示自动泊车相关新动态`;
  }

  if (normalized.includes("red light") || normalized.includes("crashing")) {
    return verbose
      ? `${sourceName} 分享了一则车辆主动避免碰撞的案例，强调即使在人工驾驶状态下，车辆安全能力依然发挥了作用`
      : `${sourceName} 强调车辆安全辅助能力`;
  }

  if (normalized.includes("self-driving")) {
    return verbose
      ? `${sourceName} 提到了自动驾驶相关场景，并强调车辆在不同驾驶模式下的辅助表现`
      : `${sourceName} 提及自动驾驶相关场景`;
  }

  return null;
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
