import fs from "node:fs";
import path from "node:path";

import type { GeneratedCollection, InternationalSourceStatus, NewsPost, SiteSummary, SourceSummary, TopicSummary } from "@/lib/content-schema";
import { getActiveSourceConfigs, getInternationalSourceConfigs } from "@/scripts/lib/source-config";

const generatedDir = path.join(process.cwd(), "content", "generated");
const postsPath = path.join(generatedDir, "posts.json");
const summaryPath = path.join(generatedDir, "summary.json");

const topicConfigs: Array<Omit<TopicSummary, "count"> & { keywords: string[] }> = [
  {
    id: "global",
    name: "全球",
    slug: "global",
    description: "全球宏观、商品、利率与跨市场风险",
    keywords: ["全球", "美元", "美联储", "中东", "原油", "黄金", "商品", "利率", "关税", "出口", "汇率"],
  },
  {
    id: "us-stocks",
    name: "美国股市",
    slug: "us-stocks",
    description: "美股、纳指、标普、科技巨头与 IPO",
    keywords: ["美股", "纳指", "标普", "道指", "spacex", "ipo", "ai", "nvidia", "meta", "microsoft", "anthropic", "博通", "英伟达", "特斯拉"],
  },
  {
    id: "china-stocks",
    name: "中国股市",
    slug: "china-stocks",
    description: "A股、港股、中概股与中国资产定价",
    keywords: ["a股", "港股", "中概股", "恒生", "沪深", "创业板", "科创板", "北交所", "中国股票", "香港投资者", "人民币"],
  },
  {
    id: "property",
    name: "房地产",
    slug: "property",
    description: "地产政策、房企、物业、城市更新与居民资产负债表",
    keywords: ["房地产", "地产", "房价", "房企", "物业", "城市更新", "住房", "按揭", "土地", "租赁"],
  },
  {
    id: "energy-storage",
    name: "储能行业",
    slug: "energy-storage",
    description: "储能、电池、电网、光伏与新能源电力系统",
    keywords: ["储能", "电池", "锂电", "光伏", "新能源", "电网", "逆变器", "pcs", "bms", "风电"],
  },
  {
    id: "ai-semiconductor",
    name: "AI半导体",
    slug: "ai-semiconductor",
    description: "AI、芯片、算力、半导体与机器人产业链",
    keywords: ["ai", "人工智能", "芯片", "半导体", "算力", "机器人", "光模块", "gpu", "tsmc", "台积电"],
  },
  {
    id: "ipo-ma",
    name: "IPO并购",
    slug: "ipo-ma",
    description: "IPO、并购、融资、回购与资本市场交易",
    keywords: ["ipo", "上市", "并购", "融资", "回购", "增持", "减持", "定增", "分红", "收购"],
  },
  {
    id: "macro-policy",
    name: "宏观政策",
    slug: "macro-policy",
    description: "央行、财政、监管、汇率、出口与政策变量",
    keywords: ["央行", "财政", "证监会", "发改委", "金融监管", "监管", "降息", "降准", "关税", "出口", "人民币"],
  },
];

const emptyCollection: GeneratedCollection = {
  generatedAt: new Date(0).toISOString(),
  count: 0,
  posts: [],
};

const emptySummary: SiteSummary = {
  generatedAt: new Date(0).toISOString(),
  total: 0,
  external: 0,
  chinaRelevantCount: 0,
  dedupedCount: 0,
  activeSources: [],
  pausedSources: [],
  lastSuccessfulRunAt: new Date(0).toISOString(),
};

export function getAllPosts(): NewsPost[] {
  return readCollection().posts;
}

export function getPostBySlug(slug: string): NewsPost | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getPostsBySource(source: string): NewsPost[] {
  return getAllPosts().filter((post) => post.source_name === source);
}

export function getRelevantPosts() {
  return getAllPosts().filter((post) => post.is_china_stock_relevant);
}

export function getTopics(): TopicSummary[] {
  const posts = getRelevantPosts();
  return topicConfigs
    .map((topic) => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      description: topic.description,
      count: posts.filter((post) => postMatchesTopic(post, topic.keywords)).length,
    }))
    .filter((topic) => topic.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
}

export function getTopicBySlug(slug: string): TopicSummary | undefined {
  return getTopics().find((topic) => topic.slug === slug);
}

export function getPostsByTopic(slug: string): NewsPost[] {
  const topic = topicConfigs.find((item) => item.slug === slug);
  if (!topic) {
    return [];
  }

  return getRelevantPosts().filter((post) => postMatchesTopic(post, topic.keywords));
}

function postMatchesTopic(post: NewsPost, keywords: string[]) {
  const text = `${post.title} ${post.summary} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
  return keywords.some((keyword) => includesKeyword(text, keyword));
}

function includesKeyword(text: string, keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();
  if (/^[a-z0-9.+-]+$/i.test(normalizedKeyword)) {
    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
  }

  return text.includes(normalizedKeyword);
}

export function getSources(): SourceSummary[] {
  const counts = new Map<string, SourceSummary>();

  for (const post of getAllPosts()) {
    const existing = counts.get(post.source_name);
    if (existing) {
      existing.count += 1;
      existing.chinaRelevantCount += post.is_china_stock_relevant ? 1 : 0;
      continue;
    }

    counts.set(post.source_name, {
      id: post.source_id,
      name: post.source_name,
      slug: encodeURIComponent(post.source_name),
      group: post.source_group,
      count: 1,
      chinaRelevantCount: post.is_china_stock_relevant ? 1 : 0,
    });
  }

  return Array.from(counts.values()).sort(
    (a, b) => b.chinaRelevantCount - a.chinaRelevantCount || b.count - a.count || a.name.localeCompare(b.name, "zh-CN"),
  );
}

export function getSourcesByGroup() {
  const grouped = new Map<string, SourceSummary[]>();

  for (const source of getSources()) {
    const bucket = grouped.get(source.group) ?? [];
    bucket.push(source);
    grouped.set(source.group, bucket);
  }

  return Array.from(grouped.entries()).map(([group, sources]) => ({
    group,
    sources,
  }));
}

export function getInternationalSourceStatuses(): InternationalSourceStatus[] {
  const sources = getSources();
  const mapped = new Map(sources.map((source) => [source.id, source]));

  return getInternationalSourceConfigs().map((config) => {
    const existing = mapped.get(config.id);
    return {
      id: config.id,
      name: config.displayName,
      group: config.sourceGroup,
      count: existing?.count ?? 0,
      chinaRelevantCount: existing?.chinaRelevantCount ?? 0,
      hasData: Boolean(existing),
    };
  });
}

export function getActiveSourceStatuses(): InternationalSourceStatus[] {
  const sources = getSources();
  const mapped = new Map(sources.map((source) => [source.id, source]));

  return getActiveSourceConfigs().map((config) => {
    const existing = mapped.get(config.id);
    return {
      id: config.id,
      name: config.displayName,
      group: config.sourceGroup,
      count: existing?.count ?? 0,
      chinaRelevantCount: existing?.chinaRelevantCount ?? 0,
      hasData: Boolean(existing),
    };
  });
}

export function getSiteStats() {
  const posts = getAllPosts();
  const summary = readSummary();

  return {
    total: posts.length,
    externalCount: summary.external,
    chinaRelevantCount: summary.chinaRelevantCount,
    dedupedCount: summary.dedupedCount,
    activeSources: summary.activeSources,
    pausedSources: summary.pausedSources,
    latestPublishedAt: posts[0]?.published_at ?? null,
    lastSuccessfulRunAt: summary.lastSuccessfulRunAt,
  };
}

function readCollection(): GeneratedCollection {
  if (!fs.existsSync(postsPath)) {
    return emptyCollection;
  }

  try {
    const raw = fs.readFileSync(postsPath, "utf8");
    return JSON.parse(raw) as GeneratedCollection;
  } catch {
    return emptyCollection;
  }
}

function readSummary(): SiteSummary {
  if (!fs.existsSync(summaryPath)) {
    return emptySummary;
  }

  try {
    const raw = fs.readFileSync(summaryPath, "utf8");
    return JSON.parse(raw) as SiteSummary;
  } catch {
    return emptySummary;
  }
}
