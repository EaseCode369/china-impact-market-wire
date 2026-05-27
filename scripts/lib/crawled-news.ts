import * as cheerio from "cheerio";
import { decode } from "html-entities";

import type { ContentLevel, NewsPost } from "@/lib/content-schema";
import { CRAWLER_LIMIT } from "@/scripts/lib/constants";
import {
  buildDedupeKey,
  createSlug,
  inferCategory,
  inferChinaStockRelevance,
  inferTags,
  makeHeadlineSummary,
  safeDate,
  stableId,
  summarizeText,
  writeCollection,
} from "@/scripts/lib/helpers";
import { getActiveSourceConfigs, getSourceConfigById } from "@/scripts/lib/source-config";

type RawItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  contentLevel: ContentLevel;
};

type GenerateOptions = {
  limit?: number;
  sourceIds?: string[];
  since?: string | null;
};

const sourceFetchers: Record<string, () => Promise<RawItem[]>> = {
  reuters: crawlReuters,
  bloomberg: crawlBloomberg,
  ft: crawlFt,
  wsj: crawlWsj,
  wallstreetcn: crawlWallstreetcn,
  scmp: crawlScmp,
  cls: crawlCls,
  stcn: crawlStcn,
};

export async function generateCrawledNews(options: GenerateOptions = {}) {
  const activeSources = getActiveSourceConfigs(options.sourceIds);
  const settled = await Promise.allSettled(
    activeSources.map(async (source) => {
      const fetcher = sourceFetchers[source.id];
      if (!fetcher) {
        return [] as RawItem[];
      }
      return fetcher();
    }),
  );

  const merged = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const posts = merged
    .map((item) => createNewsPost(item))
    .filter((post) => {
      if (!options.since) {
        return true;
      }
      return +new Date(post.published_at) >= +new Date(options.since);
    })
    .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
    .slice(0, options.limit ?? CRAWLER_LIMIT * Math.max(activeSources.length, 1));

  writeCollection("crawled-news.json", posts);
  return {
    posts,
    activeSources: activeSources.map((source) => source.displayName),
  };
}

function createNewsPost(item: RawItem): NewsPost {
  const sourceConfig = getSourceConfigById(item.sourceId);
  const id = stableId(`${item.sourceId}:${item.url}:${item.title}`);
  const relevance = inferChinaStockRelevance(item.title, item.summary);

  return {
    id,
    slug: createSlug(item.title, id),
    source_type: "crawled_site",
    source_name: item.sourceName,
    source_id: item.sourceId,
    source_group: sourceConfig?.sourceGroup ?? "global_media",
    source_priority: sourceConfig?.priority ?? 0,
    title: item.title,
    summary: item.summary || makeHeadlineSummary(item.sourceName),
    original_url: item.url || null,
    published_at: safeDate(item.publishedAt),
    imported_at: new Date().toISOString(),
    category: inferCategory(item.title, item.summary, item.sourceName),
    tags: inferTags(item.title, item.summary, item.sourceName),
    is_china_stock_relevant: relevance.isRelevant,
    relevance_reason: relevance.reason,
    dedupe_key: buildDedupeKey(item.title, item.summary),
    content_level: item.contentLevel,
  };
}

async function crawlReuters(): Promise<RawItem[]> {
  const html = await fetchText("https://www.reuters.com/world/");
  const $ = cheerio.load(html);

  return $("a[data-testid='Heading']")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const href = $(element).attr("href");
      const title = decode($(element).text().trim());
      if (!href || !title) {
        return null;
      }

      const wrapper = $(element).closest("article");
      const fallback = makeHeadlineSummary("Reuters");
      const summary = decode(wrapper.find("p").first().text().trim()) || fallback;
      const timeText =
        wrapper.find("time").attr("datetime")?.trim() ||
        wrapper.find("time").text().trim() ||
        new Date().toISOString();

      return {
        sourceId: "reuters",
        sourceName: "Reuters",
        title,
        summary,
        url: new URL(href, "https://www.reuters.com").toString(),
        publishedAt: timeText,
        contentLevel: summary === fallback ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlBloomberg(): Promise<RawItem[]> {
  const html = await fetchText("https://www.bloomberg.com/markets");
  const $ = cheerio.load(html);

  return $("a[href*='/news/articles/']")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const href = $(element).attr("href");
      const title = decode($(element).text().replace(/\s+/g, " ").trim());
      if (!href || !title || title.length < 10) {
        return null;
      }

      const wrapper = $(element).closest("article, div");
      const fallback = makeHeadlineSummary("Bloomberg");
      const summary = decode(wrapper.find("p").first().text().trim()) || fallback;
      const timeText = wrapper.find("time").attr("datetime")?.trim() || new Date().toISOString();

      return {
        sourceId: "bloomberg",
        sourceName: "Bloomberg",
        title,
        summary,
        url: new URL(href, "https://www.bloomberg.com").toString(),
        publishedAt: timeText,
        contentLevel: summary === fallback ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlFt(): Promise<RawItem[]> {
  const html = await fetchText("https://www.ft.com/world?format=rss");
  const $ = cheerio.load(html, { xmlMode: true });

  return $("item")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const title = decode($(element).find("title").first().text().trim());
      const url = $(element).find("link").first().text().trim();
      const fallback = makeHeadlineSummary("Financial Times");
      const summary = decode($(element).find("description").first().text().trim()) || fallback;
      const publishedAt = $(element).find("pubDate").first().text().trim() || new Date().toISOString();

      if (!title || !url) {
        return null;
      }

      return {
        sourceId: "ft",
        sourceName: "Financial Times",
        title,
        summary,
        url,
        publishedAt,
        contentLevel: summary === fallback ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlWsj(): Promise<RawItem[]> {
  const html = await fetchText("https://www.wsj.com/news/world");
  const $ = cheerio.load(html);

  return $("a[href*='/articles/']")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const href = $(element).attr("href");
      const title = decode($(element).text().replace(/\s+/g, " ").trim());
      if (!href || !title || title.length < 10) {
        return null;
      }

      const wrapper = $(element).closest("article, div");
      const fallback = makeHeadlineSummary("WSJ");
      const summary = decode(wrapper.find("p").first().text().trim()) || fallback;
      const timeText = wrapper.find("time").attr("datetime")?.trim() || new Date().toISOString();

      return {
        sourceId: "wsj",
        sourceName: "WSJ",
        title,
        summary,
        url: new URL(href, "https://www.wsj.com").toString(),
        publishedAt: timeText,
        contentLevel: summary === fallback ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlWallstreetcn(): Promise<RawItem[]> {
  const html = await fetchText("https://wallstreetcn.com/rss");
  const $ = cheerio.load(html, { xmlMode: true });

  return $("item")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const title = decode($(element).find("title").first().text().trim());
      const url = $(element).find("link").first().text().trim();
      const description = decode($(element).find("description").first().text().trim());

      if (!title || !url) {
        return null;
      }

      const summary = summarizeText(description, 2, 180) || makeHeadlineSummary("华尔街见闻");
      const publishedAt = $(element).find("pubDate").first().text().trim() || new Date().toISOString();

      return {
        sourceId: "wallstreetcn",
        sourceName: "华尔街见闻",
        title,
        summary,
        url,
        publishedAt,
        contentLevel: description ? "teaser" : "headline",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlScmp(): Promise<RawItem[]> {
  const html = await fetchText("https://www.scmp.com/business");
  const $ = cheerio.load(html);

  return $("a[href*='/news/'], a[href*='/economy/'], a[href*='/markets/']")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const href = $(element).attr("href");
      const title = decode($(element).text().replace(/\s+/g, " ").trim());
      if (!href || !title || title.length < 10) {
        return null;
      }

      const wrapper = $(element).closest("article, div");
      const fallback = makeHeadlineSummary("SCMP");
      const summary = decode(wrapper.find("p").first().text().trim()) || fallback;
      const timeText = wrapper.find("time").attr("datetime")?.trim() || new Date().toISOString();

      return {
        sourceId: "scmp",
        sourceName: "SCMP",
        title,
        summary,
        url: new URL(href, "https://www.scmp.com").toString(),
        publishedAt: timeText,
        contentLevel: summary === fallback ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlCls(): Promise<RawItem[]> {
  const html = await fetchText("https://www.cls.cn/telegraph");
  const $ = cheerio.load(html);

  return $(".telegraph-content-box")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const box = $(element);
      const rawText = box.find("span[class*='c-']").last().text().replace(/\s+/g, " ").trim();
      const titleMatch = rawText.match(/【([^】]+)】/);
      const title = titleMatch?.[1]?.trim() || rawText.slice(0, 28);
      const summary = summarizeText(rawText, 2, 160);
      const timeText = box.find(".telegraph-time-box").first().text().trim();
      const detailPath = box.parent().find("a[href^='/detail/']").first().attr("href");

      if (!title || !summary || !detailPath) {
        return null;
      }

      return {
        sourceId: "cls",
        sourceName: "财联社",
        title,
        summary,
        url: new URL(detailPath, "https://www.cls.cn").toString(),
        publishedAt: parseCnTime(timeText),
        contentLevel: "summary",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

async function crawlStcn(): Promise<RawItem[]> {
  const html = await fetchText("https://www.stcn.com/");
  const $ = cheerio.load(html);
  const links = $("a[href*='/article/detail/']")
    .map((_, element) => {
      const href = $(element).attr("href");
      return href ? new URL(href, "https://www.stcn.com").toString() : null;
    })
    .get()
    .filter(Boolean) as string[];

  const uniqueLinks = Array.from(new Set(links)).slice(0, CRAWLER_LIMIT);
  const items: RawItem[] = [];

  for (const url of uniqueLinks) {
    try {
      const detailHtml = await fetchText(url);
      const detail$ = cheerio.load(detailHtml);
      const title =
        detail$("meta[property='og:title']").attr("content")?.trim() ||
        detail$("title").text().trim();
      const summary = summarizeText(
        detail$(".detail-content p")
          .slice(0, 2)
          .map((_, element) => detail$(element).text().trim())
          .get()
          .join(" "),
        2,
        160,
      );
      const timeText =
        detail$(".detail-content-wrapper [class*='time']").first().text().trim() ||
        detail$("[class*='detail-info']").text().trim() ||
        detail$("meta[name='publishdate']").attr("content")?.trim() ||
        "";

      if (!title || !summary) {
        continue;
      }

      items.push({
        sourceId: "stcn",
        sourceName: "证券时报",
        title,
        summary,
        url,
        publishedAt: parseCnTime(timeText),
        contentLevel: "summary",
      });
    } catch {
      continue;
    }
  }

  return items;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function parseCnTime(input: string) {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) {
    return new Date().toISOString();
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
    const today = new Date();
    const [hours, minutes, seconds = "00"] = text.split(":");
    today.setHours(Number(hours), Number(minutes), Number(seconds), 0);
    return today.toISOString();
  }

  const fullMatch = text.match(/(\d{1,2})月(\d{1,2})日(?:\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (fullMatch) {
    const now = new Date();
    const [, month, day, hours, minutes, seconds = "00"] = fullMatch;
    return new Date(
      now.getFullYear(),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    ).toISOString();
  }

  const isoDate = new Date(text);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }

  return new Date().toISOString();
}
