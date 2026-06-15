import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { LiveFeedCollection, LiveFeedItem } from "@/lib/content-schema";
import {
  containsCjk,
  localizeEnglishSummaryToSimplifiedChinese,
  localizeEnglishTitleToSimplifiedChinese,
  normalizeForComparison,
  normalizeText,
  summarizeText,
} from "@/scripts/lib/helpers";
import { GENERATED_DIR } from "@/scripts/lib/constants";
import { X_LIVE_ACCOUNTS, type XLiveAccount } from "@/scripts/lib/x-live-config";

const LIVE_FEED_PATH = path.join(GENERATED_DIR, "live-feed.json");
const X_PROFILE_DIR = process.env.X_PLAYWRIGHT_PROFILE_DIR ?? path.join(process.cwd(), ".x-playwright-profile");
const RETENTION_HOURS = Number(process.env.LIVE_RETENTION_HOURS ?? 48);
const LOOKBACK_MS = RETENTION_HOURS * 60 * 60 * 1000;
const MAX_TWEETS_PER_ACCOUNT = Number(process.env.X_MAX_TWEETS_PER_ACCOUNT ?? 4);
const ACCOUNT_DELAY_MS = Number(process.env.X_ACCOUNT_DELAY_MS ?? 1600);

type RawTweet = {
  handle: string;
  text: string;
  url: string | null;
  publishedAt: string | null;
};

type GenerateLiveFeedOptions = {
  headed?: boolean;
  accounts?: XLiveAccount[];
};

export async function generateLiveFeed(options: GenerateLiveFeedOptions = {}) {
  const existing = readLiveFeed();
  const warnings: string[] = [];
  const rawTweets = await crawlXAccounts(options.accounts ?? X_LIVE_ACCOUNTS, {
    headed: options.headed ?? process.env.X_HEADLESS !== "1",
    warnings,
  });
  const freshItems = rawTweets.map(createLiveFeedItem).filter((item) => isWithinRetention(item.published_at));
  const items = mergeLiveItems([...existing.items, ...freshItems]);
  const normalizedWarnings = Array.from(new Set(warnings));

  if (sameLiveContent(existing.items, items) && sameStringList(existing.warnings, normalizedWarnings)) {
    return existing;
  }

  const collection: LiveFeedCollection = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
    warnings: normalizedWarnings,
  };

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(LIVE_FEED_PATH, `${JSON.stringify(collection, null, 2)}\n`, "utf8");

  return collection;
}

export function readLiveFeed(): LiveFeedCollection {
  if (!fs.existsSync(LIVE_FEED_PATH)) {
    return {
      generatedAt: new Date(0).toISOString(),
      count: 0,
      items: [],
      warnings: [],
    };
  }

  try {
    return JSON.parse(fs.readFileSync(LIVE_FEED_PATH, "utf8")) as LiveFeedCollection;
  } catch {
    return {
      generatedAt: new Date(0).toISOString(),
      count: 0,
      items: [],
      warnings: ["live-feed.json 读取失败，已使用空集合重新生成。"],
    };
  }
}

export async function openXLoginProfile() {
  const playwright = await import("playwright");
  const context = await launchPersistentContext(playwright, true);
  const page = await context.newPage();
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("");
  console.log("X 登录窗口已打开。请在弹出的浏览器里完成登录。");
  console.log(`登录态会保存在：${X_PROFILE_DIR}`);
  console.log("确认能看到 X 首页后，回到这里按 Enter 关闭浏览器。");
  await waitForEnter();
  await context.close();
}

async function crawlXAccounts(accounts: XLiveAccount[], options: { headed: boolean; warnings: string[] }) {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    options.warnings.push("未安装 Playwright，无法抓取 X。请运行 npm install 后重试。");
    return [] as RawTweet[];
  }

  let context: Awaited<ReturnType<typeof playwright.chromium.launchPersistentContext>>;
  try {
    context = await launchPersistentContext(playwright, options.headed);
  } catch (error) {
    options.warnings.push(`Playwright 启动失败：${error instanceof Error ? error.message : String(error)}`);
    return [];
  }

  const page = await context.newPage();
  const tweets: RawTweet[] = [];

  try {
    for (const account of accounts) {
      try {
        const accountTweets = await crawlAccountPage(page, account);
        tweets.push(...accountTweets);
        console.log(`@${account.handle}: ${accountTweets.length} 条`);
      } catch (error) {
        options.warnings.push(`@${account.handle} 抓取失败：${error instanceof Error ? error.message : String(error)}`);
      }
      await page.waitForTimeout(ACCOUNT_DELAY_MS);
    }
  } finally {
    await context.close();
  }

  return tweets;
}

async function launchPersistentContext(playwright: typeof import("playwright"), headed: boolean) {
  const launchOptions = {
    headless: !headed,
    viewport: { width: 1280, height: 900 },
    locale: "zh-CN",
  };

  try {
    return await playwright.chromium.launchPersistentContext(X_PROFILE_DIR, {
      ...launchOptions,
      channel: "chrome",
    });
  } catch {
    return playwright.chromium.launchPersistentContext(X_PROFILE_DIR, launchOptions);
  }
}

async function crawlAccountPage(page: import("playwright").Page, account: XLiveAccount) {
  await page.goto(`https://x.com/${account.handle}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  const needsLogin = await page
    .locator("text=/Sign in|Log in|登录|登入/")
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);

  if (needsLogin) {
    throw new Error("X 可能未登录或登录态失效，请先运行 npm run live:login。");
  }

  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(1200);

  return page.evaluate(
    ({ handle, maxTweets }) => {
      const articles = Array.from(document.querySelectorAll("article[data-testid='tweet']"));
      const items = articles
        .map((article) => {
          const time = article.querySelector("time");
          const tweetText = Array.from(article.querySelectorAll("[data-testid='tweetText']"))
            .map((node) => node.textContent?.trim() ?? "")
            .filter(Boolean)
            .join("\n");
          const statusLink = Array.from(article.querySelectorAll<HTMLAnchorElement>("a[href*='/status/']"))
            .map((link) => link.href)
            .find((href) => href.includes(`/${handle}/status/`) || /\/status\/\d+/.test(href));

          return {
            handle,
            text: tweetText,
            url: statusLink ?? null,
            publishedAt: time?.getAttribute("datetime") ?? null,
          };
        })
        .filter((item) => item.text && item.publishedAt)
        .slice(0, maxTweets);

      return items;
    },
    { handle: account.handle, maxTweets: MAX_TWEETS_PER_ACCOUNT },
  ) as Promise<RawTweet[]>;
}

function createLiveFeedItem(tweet: RawTweet): LiveFeedItem {
  const account = X_LIVE_ACCOUNTS.find((item) => item.handle.toLowerCase() === tweet.handle.toLowerCase());
  const publishedAt = tweet.publishedAt ?? new Date().toISOString();
  const originalText = normalizeText(tweet.text).replace(/\n{2,}/g, "\n");
  const titleSeed = summarizeText(originalText, 1, 72) || originalText.slice(0, 72);
  const isChinese = containsCjk(originalText);
  const title = isChinese ? titleSeed : localizeEnglishTitleToSimplifiedChinese(titleSeed, account?.displayName ?? `@${tweet.handle}`);
  const summarySeed = summarizeText(originalText, 2, 220) || originalText;
  const summary = isChinese
    ? ensureChinesePunctuation(summarySeed)
    : localizeEnglishSummaryToSimplifiedChinese(summarySeed, account?.displayName ?? `@${tweet.handle}`);
  const tweetId = tweet.url?.match(/\/status\/(\d+)/)?.[1] ?? null;
  const dedupeKey = tweetId
    ? `x:${tweet.handle}:${tweetId}`
    : `x:${tweet.handle}:${normalizeForComparison(originalText).slice(0, 120)}:${publishedAt.slice(0, 13)}`;
  const id = stableId(dedupeKey);

  return {
    id,
    dedupe_key: dedupeKey,
    source_type: "x",
    source_name: account?.displayName ?? `@${tweet.handle}`,
    handle: tweet.handle,
    profile_url: `https://x.com/${tweet.handle}`,
    original_url: tweet.url,
    original_text: originalText,
    title,
    summary,
    published_at: publishedAt,
    imported_at: new Date().toISOString(),
    tags: Array.from(new Set([...(account?.tags ?? []), ...(account?.categories ?? [])])).slice(0, 6),
    category: account?.categories[0] ?? "X平台",
  };
}

function mergeLiveItems(items: LiveFeedItem[]) {
  const cutoff = Date.now() - LOOKBACK_MS;
  const kept = new Map<string, LiveFeedItem>();

  for (const item of items) {
    if (+new Date(item.published_at) < cutoff) {
      continue;
    }

    const existing = kept.get(item.dedupe_key);
    if (!existing || +new Date(item.imported_at) > +new Date(existing.imported_at)) {
      kept.set(item.dedupe_key, item);
    }
  }

  return Array.from(kept.values()).sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
}

function sameLiveContent(a: LiveFeedItem[], b: LiveFeedItem[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, index) => {
    const other = b[index];
    return item.dedupe_key === other?.dedupe_key && item.title === other.title && item.summary === other.summary;
  });
}

function sameStringList(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, index) => item === b[index]);
}

function isWithinRetention(dateString: string) {
  return +new Date(dateString) >= Date.now() - LOOKBACK_MS;
}

function stableId(seed: string) {
  return crypto.createHash("sha1").update(seed).digest("hex");
}

function ensureChinesePunctuation(text: string) {
  const cleaned = text.trim();
  if (!cleaned) {
    return cleaned;
  }
  return /[。！？.!?]$/.test(cleaned) ? cleaned : `${cleaned}。`;
}

async function waitForEnter() {
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}
