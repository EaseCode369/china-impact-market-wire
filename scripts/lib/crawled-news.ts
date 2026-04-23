import * as cheerio from "cheerio";
import { decode } from "html-entities";

import type { NewsPost } from "@/lib/content-schema";
import { CRAWLER_LIMIT } from "@/scripts/lib/constants";
import {
  createSlug,
  inferCategory,
  inferTags,
  safeDate,
  stableId,
  summarizeText,
  writeCollection,
} from "@/scripts/lib/helpers";

type RawItem = {
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
};

export async function generateCrawledNews() {
  const sourceItems = await Promise.allSettled([
    crawlDzh(),
    crawlEastmoney(),
    crawlCls(),
    crawlStcn(),
  ]);

  const merged = sourceItems.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const deduped = new Map<string, NewsPost>();

  for (const item of merged) {
    const key = item.url || `${item.sourceName}:${item.title}`;
    if (deduped.has(key)) {
      continue;
    }
    const id = stableId(`${item.sourceName}:${item.url}:${item.title}`);
    deduped.set(key, {
      id,
      slug: createSlug(item.title, id),
      source_type: "crawled_site",
      source_name: item.sourceName,
      title: item.title,
      summary: item.summary,
      original_url: item.url,
      published_at: safeDate(item.publishedAt),
      imported_at: new Date().toISOString(),
      category: inferCategory(item.title, item.summary, item.sourceName),
      tags: inferTags(item.title, item.summary, item.sourceName),
    });
  }

  const posts = Array.from(deduped.values()).sort(
    (a, b) => +new Date(b.published_at) - +new Date(a.published_at),
  );

  writeCollection("crawled-news.json", posts);
  return posts;
}

async function crawlDzh(): Promise<RawItem[]> {
  const html = await fetchText("https://www.dzh.com.cn/index/home?mod=nc");
  const $ = cheerio.load(html);
  const links = $(".item > a")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const href = $(element).attr("href");
      return href ? new URL(href, "https://www.dzh.com.cn").toString() : null;
    })
    .get()
    .filter((href): href is string => Boolean(href));

  const items: RawItem[] = [];

  for (const url of links) {
    try {
      const detailHtml = await fetchText(url);
      const detail$ = cheerio.load(detailHtml);
      const title = detail$(".article h2").first().text().trim();
      const summary =
        detail$(".article .abstract").first().text().trim() ||
        summarizeText(detail$(".article").text().trim(), 2, 160);
      const timeText = detail$(".article .source span").eq(1).text().trim();

      if (!title || !summary) {
        continue;
      }

      items.push({
        sourceName: "大智慧",
        title,
        summary,
        url,
        publishedAt: parseCnTime(timeText),
      });
    } catch {
      continue;
    }
  }

  return items;
}

async function crawlEastmoney(): Promise<RawItem[]> {
  const html = await fetchText("https://finance.eastmoney.com/yaowen.html");
  const $ = cheerio.load(html);

  return $(".artitleList2 li")
    .slice(0, CRAWLER_LIMIT)
    .map((_, element) => {
      const title = decode($(element).find("p.title a").text().trim());
      const summary = decode($(element).find("p.info").attr("title")?.trim() || $(element).find("p.info").text().trim());
      const href = $(element).find("p.title a").attr("href");
      const timeText = decode($(element).find("p.time").text().trim());
      const url = href ? new URL(href, "https://finance.eastmoney.com").toString() : "";

      if (!title || !summary || !url) {
        return null;
      }

      return {
        sourceName: "东方财富",
        title,
        summary: summary.replace(title, "").trim() || summary,
        url,
        publishedAt: parseCnTime(timeText),
      };
    })
    .get()
    .filter((item): item is RawItem => Boolean(item));
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
        sourceName: "财联社",
        title,
        summary,
        url: new URL(detailPath, "https://www.cls.cn").toString(),
        publishedAt: parseCnTime(timeText),
      };
    })
    .get()
    .filter((item): item is RawItem => Boolean(item));
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
    .filter((href): href is string => Boolean(href));

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
        sourceName: "证券时报",
        title,
        summary,
        url,
        publishedAt: parseCnTime(timeText),
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
