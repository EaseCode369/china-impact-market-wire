import { execFile } from "node:child_process";
import { promisify } from "node:util";

import * as cheerio from "cheerio";
import { decode } from "html-entities";

import type { ContentLevel, NewsPost } from "@/lib/content-schema";
import { CRAWLER_LIMIT, CRAWLER_LOOKBACK_HOURS } from "@/scripts/lib/constants";
import {
  buildDedupeKey,
  createSlug,
  inferCategory,
  inferChinaStockRelevance,
  inferTags,
  makeHeadlineSummary,
  safeDate,
  shouldLocalizeToSimplifiedChinese,
  shouldExcludeSensitiveNews,
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

type ArticleSummaryOptions = {
  titleSelectors: string[];
  summarySelectors: string[];
  dateSelectors?: string[];
  maxItems?: number;
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
  zaobao: crawlZaobao,
  wallstreetcn: crawlWallstreetcn,
  yicai: crawlYicai,
  "21jingji": crawl21Jingji,
  scmp: crawlScmp,
  cls: crawlCls,
  stcn: crawlStcn,
  eastmoney: crawlEastmoney,
  thepaper: crawlThepaper,
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

  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`Skipping source ${activeSources[index]?.displayName ?? "unknown"}: ${result.reason}`);
    }
  });

  const merged = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const effectiveSince = options.since ?? new Date(Date.now() - CRAWLER_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const localizedItems = await Promise.all(
    merged
      .filter((item) => !shouldExcludeSensitiveNews(item.title, item.summary))
      .map((item) => localizeRawItem(item)),
  );
  const posts = localizedItems
    .map((item) => createNewsPost(item))
    .filter((post) => !shouldExcludeSensitiveNews(post.title, post.summary))
    .filter((post) => post.is_china_stock_relevant)
    .filter((post) => {
      if (!effectiveSince) {
        return true;
      }
      return +new Date(post.published_at) >= +new Date(effectiveSince);
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
  return crawlGoogleNewsSource("reuters", "Reuters", "site:reuters.com (China stocks OR Hong Kong stocks OR yuan OR tariff OR A-share OR AI OR semiconductor OR IPO)");
}

async function crawlBloomberg(): Promise<RawItem[]> {
  return crawlGoogleNewsSource("bloomberg", "Bloomberg", "site:bloomberg.com (China stocks OR Hong Kong stocks OR yuan OR tariff OR A-share OR AI OR semiconductor OR IPO)");
}

async function crawlFt(): Promise<RawItem[]> {
  const directFeed = await fetchText("https://www.ft.com/world?format=rss");
  const directItems = parseStandardRss(directFeed, "ft", "Financial Times");
  const filteredDirectItems = directItems.filter((item) => inferChinaStockRelevance(item.title, item.summary).isRelevant);

  if (filteredDirectItems.length > 0) {
    return filteredDirectItems.slice(0, CRAWLER_LIMIT);
  }

  return crawlGoogleNewsSource("ft", "Financial Times", "site:ft.com (China stocks OR Hong Kong stocks OR yuan OR tariff OR A-share OR AI OR semiconductor OR IPO)");
}

async function crawlWsj(): Promise<RawItem[]> {
  return crawlGoogleNewsSource("wsj", "WSJ", "site:wsj.com (China OR Hong Kong OR yuan OR tariff OR A-share OR AI OR semiconductor OR IPO)");
}

async function crawlZaobao(): Promise<RawItem[]> {
  const html = await fetchText("https://www.zaobao.com/finance");
  const items = parseListingLinks(html, {
    baseUrl: "https://www.zaobao.com",
    sourceId: "zaobao",
    sourceName: "联合早报",
    hrefPattern: /\/finance\/(?:china|world|singapore)\/story20\d+-\d+/,
  }).filter((item) => inferChinaStockRelevance(item.title, item.summary).isRelevant);

  const enriched = await enrichWithArticleSummaries(items, {
    titleSelectors: ["h1", "meta[property='og:title']", "title"],
    summarySelectors: [
      "meta[name='description']",
      "meta[property='og:description']",
      "article p",
      "[class*='article'] p",
      "[class*='content'] p",
    ],
    dateSelectors: ["meta[property='article:published_time']", "time", "[class*='time']", "[class*='date']"],
  });

  if (enriched.length > 0) {
    return enriched;
  }

  return crawlGoogleNewsSource(
    "zaobao",
    "联合早报",
    "site:zaobao.com/finance (China OR Hong Kong OR stock OR market OR yuan OR AI OR semiconductor OR IPO)",
  );
}

async function crawlWallstreetcn(): Promise<RawItem[]> {
  const html = await fetchTextWithCurlFallback("https://wallstreetcn.com/", "/articles/");
  if (process.env.DEBUG_CRAWLER) {
    console.log(`wallstreetcn html length: ${html.length}, has articles: ${html.includes("/articles/")}`);
  }
  const items = parseListingLinks(html, {
    baseUrl: "https://wallstreetcn.com",
    sourceId: "wallstreetcn",
    sourceName: "华尔街见闻",
    hrefPattern: /\/(?:articles|livenews)\/\d+/,
  });
  if (process.env.DEBUG_CRAWLER) {
    console.log(`wallstreetcn listing items: ${items.length}`);
  }

  return enrichWithArticleSummaries(items, {
    titleSelectors: ["h1", "meta[property='og:title']", "title"],
    summarySelectors: [
      "meta[property='og:description']",
      "meta[name='description']",
      "article p",
      "[class*='article'] p",
    ],
    dateSelectors: ["meta[property='article:published_time']", "[class*='time']", "[class*='date']"],
  });
}

async function crawlYicai(): Promise<RawItem[]> {
  const html = await fetchText("https://www.yicai.com/");
  const items = parseListingLinks(html, {
    baseUrl: "https://www.yicai.com",
    sourceId: "yicai",
    sourceName: "第一财经",
    hrefPattern: /\/(?:news|brief)\/\d+\.html/,
  });

  return enrichWithArticleSummaries(items, {
    titleSelectors: ["h1", "meta[property='og:title']", "title"],
    summarySelectors: [
      ".intro",
      "meta[name='description']",
      "meta[property='og:description']",
      ".m-txt #multi-text p",
      "#multi-text p",
      ".m-txt p",
    ],
    dateSelectors: ["meta[property='article:published_time']", ".time", ".date"],
  });
}

async function crawl21Jingji(): Promise<RawItem[]> {
  const html = await fetchText("https://www.21jingji.com/");
  const items = parseListingLinks(html, {
    baseUrl: "https://www.21jingji.com",
    sourceId: "21jingji",
    sourceName: "21财经",
    hrefPattern: /\/article\/\d+\/[a-z]+\/[a-f0-9]+\.html/,
  });

  return enrichWithArticleSummaries(items, {
    titleSelectors: ["h1", "meta[property='og:title']", "title"],
    summarySelectors: [
      "meta[name='description']",
      "meta[property='og:description']",
      ".content p",
      ".article-content p",
      ".detail-content p",
      "[class*='content'] p",
    ],
    dateSelectors: ["meta[property='article:published_time']", "[class*='time']", "[class*='date']"],
  });
}

async function crawlScmp(): Promise<RawItem[]> {
  return crawlGoogleNewsSource("scmp", "SCMP", "site:scmp.com (China stocks OR Hong Kong stocks OR yuan OR tariff OR A-share OR AI OR semiconductor OR IPO)");
}

async function crawlCls(): Promise<RawItem[]> {
  const html = await fetchText("https://www.cls.cn/telegraph");
  const $ = cheerio.load(html);

  const items = $(".telegraph-content-box")
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
  if (process.env.DEBUG_CRAWLER) {
    console.log(`cls listing items: ${items.length}`);
  }

  if (items.length > 0) {
    return items;
  }

  return crawlGoogleNewsSource(
    "cls",
    "财联社",
    "site:cls.cn (A股 OR 港股 OR 财报 OR 央行 OR 证监会 OR AI OR 半导体 OR 机器人 OR 光伏)",
  );
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

async function crawlEastmoney(): Promise<RawItem[]> {
  const html = await fetchText("https://finance.eastmoney.com/");
  const items = parseListingLinks(html, {
    baseUrl: "https://finance.eastmoney.com",
    sourceId: "eastmoney",
    sourceName: "东方财富",
    hrefPattern: /https?:\/\/finance\.eastmoney\.com\/a\/20\d+\.html|\/a\/20\d+\.html/,
  });

  return enrichWithArticleSummaries(items, {
    titleSelectors: ["h1", "meta[property='og:title']", "title"],
    summarySelectors: [
      "meta[name='description']",
      "meta[property='og:description']",
      "#ContentBody p",
      ".txtinfos p",
      "#ContentBody",
    ],
    dateSelectors: ["meta[property='article:published_time']", ".time", ".source"],
  });
}

async function crawlThepaper(): Promise<RawItem[]> {
  const pages = await Promise.all([
    fetchText("https://www.thepaper.cn/channel_25951"),
    fetchText("https://www.thepaper.cn/list_25434"),
  ]);
  const items = pages.flatMap((html) =>
    parseListingLinks(html, {
      baseUrl: "https://www.thepaper.cn",
      sourceId: "thepaper",
      sourceName: "澎湃新闻",
      hrefPattern: /\/newsDetail_forward_\d+/,
    }),
  );
  const uniqueItems = dedupeRawItems(items).filter((item) =>
    inferChinaStockRelevance(item.title, item.summary).isRelevant,
  );

  return enrichWithArticleSummaries(uniqueItems, {
    titleSelectors: ["h1", "meta[property='og:title']", "title"],
    summarySelectors: [
      "meta[name='description']",
      "meta[property='og:description']",
      "[class*='content'] p",
      "[class*='news_txt'] p",
    ],
    dateSelectors: ["meta[property='article:published_time']", "[class*='time']", "[class*='date']"],
  });
}

async function crawlGoogleNewsSource(sourceId: string, sourceName: string, query: string) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} when:2d`)}&hl=en-US&gl=US&ceid=US:en`;
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

function parseListingLinks(
  html: string,
  options: {
    baseUrl: string;
    sourceId: string;
    sourceName: string;
    hrefPattern: RegExp;
  },
) {
  const $ = cheerio.load(html);
  const items: RawItem[] = [];
  const seen = new Set<string>();
  let matchedHrefCount = 0;

  $("a[href]")
    .toArray()
    .forEach((element) => {
      if (items.length >= CRAWLER_LIMIT * 2) {
        return;
      }

      const link = $(element);
      const href = link.attr("href")?.trim();
      if (!href) {
        return;
      }

      const url = new URL(href, options.baseUrl).toString();
      if (!options.hrefPattern.test(href) && !options.hrefPattern.test(url)) {
        return;
      }
      matchedHrefCount += 1;

      if (seen.has(url)) {
        return;
      }

      const rawTitle =
        decode(link.attr("title")?.trim() || link.find("img").attr("alt")?.trim() || link.text().replace(/\s+/g, " ").trim());
      const title = cleanListingTitle(rawTitle);
      const nearbyText = link.parent().text().replace(/\s+/g, " ").trim();
      const summary = cleanListingSummary(nearbyText, title, options.sourceName);

      if (!title || title.length < 6) {
        return;
      }

      seen.add(url);
      items.push({
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        title,
        summary,
        url,
        publishedAt: inferDateFromUrlOrText(url, nearbyText),
        contentLevel: summary === makeHeadlineSummary(options.sourceName) ? "headline" : "teaser",
      });
    });

  if (process.env.DEBUG_CRAWLER) {
    console.log(`${options.sourceName} matched hrefs: ${matchedHrefCount}, parsed items: ${items.length}`);
  }

  return items;
}

async function enrichWithArticleSummaries(items: RawItem[], options: ArticleSummaryOptions) {
  const enriched: RawItem[] = [];
  const targetItems = dedupeRawItems(items).slice(0, options.maxItems ?? CRAWLER_LIMIT);

  for (const item of targetItems) {
    try {
      const html = item.url.includes("wallstreetcn.com")
        ? await fetchTextWithCurlFallback(item.url, "og:title")
        : await fetchText(item.url);
      const $ = cheerio.load(html);
      const parsedTitle = cleanArticleTitle(pickFirstText($, options.titleSelectors));
      const title = isGenericArticleTitle(parsedTitle, item.sourceName) ? item.title : parsedTitle || item.title;
      const summaryText = pickCombinedText($, options.summarySelectors);
      const parsedSummary = cleanArticleSummary(summaryText, title, item.sourceName);
      const summary =
        parsedSummary === makeHeadlineSummary(item.sourceName) && item.summary
          ? item.summary
          : parsedSummary;
      const publishedAtText = options.dateSelectors ? pickFirstText($, options.dateSelectors) : "";

      enriched.push({
        ...item,
        title,
        summary,
        publishedAt: publishedAtText ? parseCnTime(publishedAtText) : item.publishedAt,
        contentLevel: summary === makeHeadlineSummary(item.sourceName) ? item.contentLevel : "summary",
      });
    } catch {
      enriched.push(item);
    }
  }

  return enriched;
}

function dedupeRawItems(items: RawItem[]) {
  const seen = new Set<string>();
  const deduped: RawItem[] = [];

  for (const item of items) {
    const key = item.url || item.title;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function pickFirstText($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const selected = $(selector).first();
    const text = selector.startsWith("meta")
      ? selected.attr("content")?.trim()
      : selected.text().replace(/\s+/g, " ").trim();
    if (text) {
      return decode(text);
    }
  }

  return "";
}

function pickCombinedText($: cheerio.CheerioAPI, selectors: string[]) {
  const parts: string[] = [];

  for (const selector of selectors) {
    const selected = $(selector);
    const texts = selector.startsWith("meta")
      ? [selected.first().attr("content")?.trim() ?? ""]
      : selected
          .slice(0, 5)
          .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
          .get();

    for (const text of texts) {
      const cleaned = decode(text).replace(/\s+/g, " ").trim();
      if (cleaned && !parts.some((part) => part.includes(cleaned) || cleaned.includes(part))) {
        parts.push(cleaned);
      }
    }

    if (parts.join("").length >= 260) {
      break;
    }
  }

  return parts.join(" ");
}

function cleanListingTitle(title: string) {
  return title
    .replace(/\s+/g, " ")
    .split(/\s*[|｜]\s*/)[0]
    .replace(/^【([^】]+)】\s*/, "$1")
    .replace(/^推荐/u, "")
    .trim()
    .slice(0, 80);
}

function cleanArticleTitle(title: string) {
  return cleanListingTitle(
    title
      .replace(/_.*$/u, "")
      .replace(/\s*[-_]\s*(第一财经|21财经|东方财富网|证券时报|澎湃新闻|The Paper).*$/iu, ""),
  );
}

function isGenericArticleTitle(title: string, sourceName: string) {
  const normalized = title.replace(/\s+/g, "").toLowerCase();
  const normalizedSource = sourceName.replace(/\s+/g, "").toLowerCase();
  return !normalized || normalized === normalizedSource || normalized.length < 6 || /^20\d{2}[/-]\d{1,2}[/-]\d{1,2}$/.test(normalized);
}

function cleanListingSummary(text: string, title: string, sourceName: string) {
  const cleaned = text
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, " ")
    .replace(new RegExp(escapeRegExp(title), "g"), " ")
    .replace(/\s*[|｜]\s*/g, "。")
    .replace(/\s+/g, " ")
    .trim();
  const summary = summarizeText(cleaned, 2, 170);
  return summary && summary !== title ? summary : makeHeadlineSummary(sourceName);
}

function cleanArticleSummary(text: string, title: string, sourceName: string) {
  const cleaned = text
    .replace(new RegExp(escapeRegExp(title), "g"), " ")
    .replace(/责任编辑[:：].*$/u, "")
    .replace(/举报|反馈|收藏本文|分享到/u, " ")
    .replace(/【\s*】/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const summary = summarizeText(cleaned, 2, 220);
  return summary && summary !== title ? summary : makeHeadlineSummary(sourceName);
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function descriptionToSummary(descriptionHtml: string, fallbackSourceName: string) {
  const plainText = descriptionToPlainText(descriptionHtml);
  return summarizeText(plainText, 2, 180) || makeHeadlineSummary(fallbackSourceName);
}

function inferDateFromUrlOrText(url: string, text: string) {
  const dateFromUrl = url.match(/\/(20\d{2})(\d{2})(\d{2})\//) || url.match(/story(20\d{2})(\d{2})(\d{2})/);
  if (dateFromUrl) {
    const [, year, month, day] = dateFromUrl;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0).toISOString();
  }

  return parseCnTime(text);
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
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
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

async function fetchTextWithCurlFallback(url: string, expectedText: string) {
  const html = await fetchText(url);
  if (html.includes(expectedText)) {
    return html;
  }

  try {
    const { stdout } = await execFileAsync(
      "curl",
      [
        "-L",
        "-s",
        "-A",
        "Mozilla/5.0",
        url,
      ],
      {
        maxBuffer: 20 * 1024 * 1024,
        encoding: "utf8",
      },
    );
    if (process.env.DEBUG_CRAWLER) {
      console.log(`curl fallback for ${url}: ${stdout.length}, has expected: ${stdout.includes(expectedText)}`);
    }
    return stdout || html;
  } catch {
    if (process.env.DEBUG_CRAWLER) {
      console.log(`curl fallback failed for ${url}`);
    }
    return html;
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
