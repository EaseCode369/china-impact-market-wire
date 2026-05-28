import { execFile } from "node:child_process";
import { promisify } from "node:util";

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
  shouldLocalizeToSimplifiedChinese,
  stableId,
  summarizeText,
  writeCollection,
} from "@/scripts/lib/helpers";
import { getActiveSourceConfigs, getSourceConfigById } from "@/scripts/lib/source-config";

const execFileAsync = promisify(execFile);

type RawItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  contentLevel: ContentLevel;
};

type LocalizedRawItem = RawItem & {
  localizedTitle?: string;
  localizedSummary?: string;
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
  const localizedItems = await Promise.all(merged.map((item) => localizeRawItem(item)));
  const posts = localizedItems
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

async function localizeRawItem(item: RawItem): Promise<LocalizedRawItem> {
  if (!shouldLocalizeToSimplifiedChinese(item.title, item.summary, item.sourceName, item.sourceId)) {
    return item;
  }

  const [localizedTitle, localizedSummary] = await Promise.all([
    translateToSimplifiedChinese(item.title),
    translateToSimplifiedChinese(item.summary || makeHeadlineSummary(item.sourceName)),
  ]);

  return {
    ...item,
    localizedTitle: localizedTitle || item.title,
    localizedSummary: localizedSummary || item.summary || makeHeadlineSummary(item.sourceName),
  };
}

function createNewsPost(item: LocalizedRawItem): NewsPost {
  const sourceConfig = getSourceConfigById(item.sourceId);
  const id = stableId(`${item.sourceId}:${item.url}:${item.title}`);
  const localizedTitle = item.localizedTitle ?? item.title;
  const localizedSummary = item.localizedSummary ?? (item.summary || makeHeadlineSummary(item.sourceName));
  const wasLocalized = Boolean(item.localizedTitle || item.localizedSummary);
  const relevance = inferChinaStockRelevance(item.title, item.summary);

  return {
    id,
    slug: createSlug(localizedTitle, id),
    source_type: "crawled_site",
    source_name: item.sourceName,
    source_id: item.sourceId,
    source_group: sourceConfig?.sourceGroup ?? "global_media",
    source_priority: sourceConfig?.priority ?? 0,
    title: localizedTitle,
    summary: localizedSummary,
    original_title: wasLocalized ? item.title : undefined,
    original_summary: wasLocalized ? item.summary : undefined,
    original_url: item.url || null,
    published_at: safeDate(item.publishedAt),
    imported_at: new Date().toISOString(),
    category: inferCategory(localizedTitle, localizedSummary, item.sourceName),
    tags: inferTags(localizedTitle, localizedSummary, item.sourceName),
    is_china_stock_relevant: relevance.isRelevant,
    relevance_reason: relevance.reason,
    dedupe_key: buildDedupeKey(item.title, item.summary),
    content_level: item.contentLevel,
  };
}

async function crawlReuters(): Promise<RawItem[]> {
  return crawlGoogleNewsSource("reuters", "Reuters", "site:reuters.com (China OR Hong Kong OR yuan OR tariff OR A-share OR Taiwan)");
}

async function crawlBloomberg(): Promise<RawItem[]> {
  return crawlGoogleNewsSource("bloomberg", "Bloomberg", "site:bloomberg.com (China OR Hong Kong OR yuan OR tariff OR A-share OR Taiwan)");
}

async function crawlFt(): Promise<RawItem[]> {
  const directFeed = await fetchText("https://www.ft.com/world?format=rss");
  const directItems = parseStandardRss(directFeed, "ft", "Financial Times");
  const filteredDirectItems = directItems.filter((item) => inferChinaStockRelevance(item.title, item.summary).isRelevant);

  if (filteredDirectItems.length > 0) {
    return filteredDirectItems.slice(0, CRAWLER_LIMIT);
  }

  return crawlGoogleNewsSource("ft", "Financial Times", "site:ft.com (China OR Hong Kong OR yuan OR tariff OR A-share OR Taiwan)");
}

async function crawlWsj(): Promise<RawItem[]> {
  return crawlGoogleNewsSource("wsj", "WSJ", "site:wsj.com (China OR Hong Kong OR yuan OR tariff OR A-share OR Taiwan)");
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
  return crawlGoogleNewsSource("scmp", "SCMP", "site:scmp.com (China OR Hong Kong OR yuan OR tariff OR A-share OR Taiwan)");
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
      const title = detail$("meta[property='og:title']").attr("content")?.trim() || detail$("title").text().trim();
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

async function crawlGoogleNewsSource(sourceId: string, sourceName: string, query: string) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:7d`)}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await fetchText(rssUrl);
  const items = parseGoogleNewsRss(xml, sourceId, sourceName);
  return items
    .filter((item) => inferChinaStockRelevance(item.title, item.summary).isRelevant)
    .slice(0, CRAWLER_LIMIT);
}

function parseGoogleNewsRss(xml: string, sourceId: string, sourceName: string) {
  const $ = cheerio.load(xml, { xmlMode: true });

  return $("item")
    .map((_, element) => {
      const title = decode($(element).find("title").first().text().trim()).replace(/\s+-\s+[A-Za-z.\s]+$/, "").trim();
      const url = $(element).find("link").first().text().trim();
      const descriptionHtml = $(element).find("description").first().text().trim();
      const source = $(element).find("source").first().text().trim();
      const publishedAt = $(element).find("pubDate").first().text().trim() || new Date().toISOString();

      if (!title || !url) {
        return null;
      }

      const summary = descriptionToSummary(descriptionHtml, sourceName);
      return {
        sourceId,
        sourceName: source || sourceName,
        title,
        summary,
        url,
        publishedAt,
        contentLevel: summary === makeHeadlineSummary(sourceName) ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

function parseStandardRss(xml: string, sourceId: string, sourceName: string) {
  const $ = cheerio.load(xml, { xmlMode: true });

  return $("item")
    .map((_, element) => {
      const title = decode($(element).find("title").first().text().trim());
      const url = $(element).find("link").first().text().trim();
      const description = decode($(element).find("description").first().text().trim());
      const publishedAt = $(element).find("pubDate").first().text().trim() || new Date().toISOString();

      if (!title || !url) {
        return null;
      }

      const summary = summarizeText(descriptionToPlainText(description), 2, 180) || makeHeadlineSummary(sourceName);
      return {
        sourceId,
        sourceName,
        title,
        summary,
        url,
        publishedAt,
        contentLevel: summary === makeHeadlineSummary(sourceName) ? "headline" : "teaser",
      };
    })
    .get()
    .filter(Boolean) as RawItem[];
}

function descriptionToSummary(descriptionHtml: string, fallbackSourceName: string) {
  const plainText = descriptionToPlainText(descriptionHtml);
  return summarizeText(plainText, 2, 180) || makeHeadlineSummary(fallbackSourceName);
}

function descriptionToPlainText(descriptionHtml: string) {
  const $ = cheerio.load(descriptionHtml);
  return decode($.text().replace(/\s+/g, " ").trim());
}

async function fetchText(url: string) {
  try {
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
  } catch {
    return fetchTextViaPowerShell(url);
  }
}

async function translateToSimplifiedChinese(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }

  const protectedTerms = [
    "Nvidia",
    "TSMC",
    "AI",
    "A股",
    "港股",
    "ETF",
    "IPO",
    "CPO",
    "GPU",
    "CPU",
    "Reuters",
    "Bloomberg",
    "Financial Times",
    "WSJ",
    "SCMP",
  ];

  let prepared = trimmed;
  const placeholderMap = new Map<string, string>();
  protectedTerms.forEach((term, index) => {
    const placeholder = `ZXTERM${index}ZX`;
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    if (pattern.test(prepared)) {
      prepared = prepared.replace(pattern, placeholder);
      placeholderMap.set(placeholder, term);
    }
  });

  const translateUrl =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=" +
    encodeURIComponent(prepared);

  try {
    const { stdout } = await execFileAsync("curl", ["-s", translateUrl], {
      maxBuffer: 10 * 1024 * 1024,
      encoding: "utf8",
    });
    const parsed = JSON.parse(stdout) as unknown[];
    const segments = Array.isArray(parsed[0]) ? (parsed[0] as unknown[]) : [];
    const translated = segments
      .map((segment) => (Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : ""))
      .join("")
      .trim();

    let restored = translated || trimmed;
    for (const [placeholder, term] of placeholderMap.entries()) {
      restored = restored.replace(new RegExp(placeholder, "g"), term);
    }

    return cleanupLocalizedChinese(restored);
  } catch {
    return trimmed;
  }
}

function cleanupLocalizedChinese(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\b(Bloomberg|Reuters|Financial Times|WSJ|SCMP)\b\.?/g, "")
    .replace(/路透中文网/g, "路透")
    .replace(/\s*-\s*/g, " ")
    .replace(/[ ]+([，。！？；：])/g, "$1")
    .replace(/([，。！？；：]){2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTextViaPowerShell(url: string) {
  const script = `
$ProgressPreference = 'SilentlyContinue'
$response = Invoke-WebRequest -Uri '${url.replace(/'/g, "''")}' -UseBasicParsing -TimeoutSec 30
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$response.Content
`;
  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", script], {
    maxBuffer: 20 * 1024 * 1024,
    encoding: "utf8",
  });
  return stdout;
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
