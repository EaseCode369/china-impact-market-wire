import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { loadEnvConfig } from "@next/env";

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

loadEnvConfig(process.cwd());

const LIVE_FEED_PATH = path.join(GENERATED_DIR, "live-feed.json");
const X_PROFILE_DIR = process.env.X_PLAYWRIGHT_PROFILE_DIR ?? path.join(process.cwd(), ".x-playwright-profile");
const X_REMOTE_DEBUG_PORT = Number(process.env.X_REMOTE_DEBUG_PORT ?? 9223);
const X_REMOTE_DEBUG_URL = `http://127.0.0.1:${X_REMOTE_DEBUG_PORT}`;
const RETENTION_HOURS = Number(process.env.LIVE_RETENTION_HOURS ?? 48);
const LOOKBACK_MS = RETENTION_HOURS * 60 * 60 * 1000;
const MAX_TWEETS_PER_ACCOUNT = Number(process.env.X_MAX_TWEETS_PER_ACCOUNT ?? 4);
const TRADE_ALPHA_PAGE_SIZE = Number(process.env.TRADE_ALPHA_PAGE_SIZE ?? 15);
const TRADE_ALPHA_MAX_PAGES = Number(process.env.TRADE_ALPHA_MAX_PAGES ?? 4);
const ACCOUNT_DELAY_MS = Number(process.env.X_ACCOUNT_DELAY_MS ?? 1600);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY?.trim();
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const DEEPSEEK_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 45000);
const DEEPSEEK_SUMMARY_CONCURRENCY = Math.max(1, Number(process.env.DEEPSEEK_SUMMARY_CONCURRENCY ?? 2));
const LIVE_NEAR_DUPLICATE_HOURS = Number(process.env.LIVE_NEAR_DUPLICATE_HOURS ?? 18);
const TRADE_ALPHA_API_BASE = process.env.TRADE_ALPHA_API_BASE ?? "https://api.lxaa.top/api/v1";

const weakPersonalPatterns = [
  /\bmy kids?\b/i,
  /\bwarms my heart\b/i,
  /\bhappy birthday\b/i,
  /\bweekend vibes\b/i,
  /\bfather'?s day\b/i,
  /\bmother'?s day\b/i,
  /\bsee you there\b/i,
  /\bso proud of\b/i,
];

const hardBlockPatterns = [/\bmy kids?\b/i, /\bwarms my heart\b/i];

const liveSignalPatterns = [
  /\brevenue\b/i,
  /\bai\b/i,
  /\bchip(s)?\b/i,
  /\bsemi(conductor)?\b/i,
  /\btsmc\b/i,
  /\bqualcomm\b/i,
  /\bnvidia\b/i,
  /\btesla\b/i,
  /\bbattery\b/i,
  /\bstorage\b/i,
  /\bpower\b/i,
  /\bacquire|acquisition|talks\b/i,
  /\breport(ed)?\b/i,
  /\bsources?:\b/i,
  /\bdigitimes\b/i,
  /\bthe information\b/i,
  /\bbloomberg\b/i,
  /\breuters\b/i,
  /\bwwdc\b/i,
  /\bcloud\b/i,
  /\bdatacenter|data center\b/i,
  /\bco(pos|wos)\b/i,
  /\bglass substrate\b/i,
  /\bearnings?\b/i,
  /\bannualized\b/i,
  /\bipo\b/i,
  /\bdeal\b/i,
  /\b$[a-z]{1,5}\b/i,
];

type RawTweet = {
  handle: string;
  text: string;
  url: string | null;
  publishedAt: string | null;
};

type TradeAlphaNews = {
  id: number;
  datetime: string;
  content: string;
  level?: string | null;
  source?: string | null;
  category?: string | null;
  created_at?: string | null;
};

type PreparedTweet = {
  account?: XLiveAccount;
  handle: string;
  originalText: string;
  originalUrl: string | null;
  publishedAt: string;
  tweetId: string | null;
  dedupeKey: string;
};

type LocalizedLiveContent = {
  title: string;
  summary: string;
  tags: string[];
};

type GenerateLiveFeedOptions = {
  headed?: boolean;
  accounts?: XLiveAccount[];
};

export async function generateLiveFeed(options: GenerateLiveFeedOptions = {}) {
  const existing = readLiveFeed();
  const warnings: string[] = [];
  const [rawTweets, tradeAlphaItems] = await Promise.all([
    crawlXAccounts(options.accounts ?? X_LIVE_ACCOUNTS, {
      headed: options.headed ?? process.env.X_HEADLESS !== "1",
      warnings,
    }),
    fetchTradeAlphaQuickNews(warnings),
  ]);
  if (!DEEPSEEK_API_KEY) {
    warnings.push("未配置 DeepSeek API，英文内容将回退为本地规则提炼。");
  }

  const retainedExisting = existing.items.filter((item) => isWithinRetention(item.published_at) && shouldKeepExistingItem(item));
  const existingMap = new Map(retainedExisting.map((item) => [item.dedupe_key, item]));
  const preparedTweets = dedupePreparedTweets(rawTweets.map(prepareTweet))
    .filter((tweet) => isWithinRetention(tweet.publishedAt))
    .filter((tweet) => shouldKeepPreparedTweet(tweet));
  const freshXItems = await mapWithConcurrency(preparedTweets, DEEPSEEK_SUMMARY_CONCURRENCY, async (tweet) => {
    const cached = existingMap.get(tweet.dedupeKey);
    if (cached && canReuseExistingItem(cached, tweet)) {
      return cached;
    }

    return createLiveFeedItem(tweet, warnings);
  });
  const freshTradeAlphaItems = tradeAlphaItems
    .map(createTradeAlphaLiveFeedItem)
    .filter((item) => isWithinRetention(item.published_at));
  const items = mergeLiveItems([...retainedExisting, ...freshXItems, ...freshTradeAlphaItems]);
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

async function fetchTradeAlphaQuickNews(warnings: string[]) {
  try {
    const pages = Array.from({ length: TRADE_ALPHA_MAX_PAGES }, (_, index) => index + 1);
    const responses = await mapWithConcurrency(pages, 2, async (page) => {
      const response = await fetch(`${TRADE_ALPHA_API_BASE}/news/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://alpha.lxaa.top/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          page,
          page_size: TRADE_ALPHA_PAGE_SIZE,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: {
          news_list?: TradeAlphaNews[];
        };
      };

      if (!payload.success) {
        throw new Error(payload.message ?? "接口返回失败");
      }

      return payload.data?.news_list ?? [];
    });

    return responses.flat();
  } catch (error) {
    warnings.push(`TradeAlpha 快讯抓取失败：${error instanceof Error ? error.message : String(error)}`);
    return [] as TradeAlphaNews[];
  }
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

export async function openXLoginProfileInChrome() {
  const chromeBinary = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  if (!fs.existsSync(chromeBinary)) {
    throw new Error("未找到 Google Chrome，请先安装 Chrome，或继续使用 npm run live:login。");
  }

  fs.mkdirSync(X_PROFILE_DIR, { recursive: true });

  const child = spawn(
    chromeBinary,
    [
      `--user-data-dir=${X_PROFILE_DIR}`,
      "--profile-directory=Default",
      `--remote-debugging-port=${X_REMOTE_DEBUG_PORT}`,
      "--new-window",
      "https://x.com/i/flow/login",
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  child.unref();

  console.log("");
  console.log("已用真实 Chrome 打开 X 登录窗口。");
  console.log(`登录态会保存在：${X_PROFILE_DIR}`);
  console.log(`远程调试端口：${X_REMOTE_DEBUG_PORT}`);
  console.log("请在这个 Chrome 窗口里完成登录，并确认能看到 X 首页。");
  console.log("完成后回到这里按 Enter，脚本会继续。");
  await waitForEnter();
}

async function crawlXAccounts(accounts: XLiveAccount[], options: { headed: boolean; warnings: string[] }) {
  let playwright: typeof import("playwright");
  try {
    playwright = await import("playwright");
  } catch {
    options.warnings.push("未安装 Playwright，无法抓取 X。请运行 npm install 后重试。");
    return [] as RawTweet[];
  }

  let page: import("playwright").Page | null = null;
  let closeBrowser: (() => Promise<void>) | null = null;

  try {
    const connected = await connectToRunningChrome(playwright);
    if (connected) {
      page = connected.page;
      closeBrowser = connected.close;
    } else {
      const context = await launchPersistentContext(playwright, options.headed);
      page = await context.newPage();
      closeBrowser = async () => {
        await context.close();
      };
    }
  } catch (error) {
    options.warnings.push(`Playwright 启动失败：${error instanceof Error ? error.message : String(error)}`);
    return [];
  }

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
    if (closeBrowser) {
      await closeBrowser();
    }
  }

  return tweets;
}

async function connectToRunningChrome(playwright: typeof import("playwright")) {
  try {
    const browser = await playwright.chromium.connectOverCDP(X_REMOTE_DEBUG_URL);
    const [context] = browser.contexts();
    if (!context) {
      await browser.close();
      return null;
    }

    const page = await context.newPage();
    return {
      page,
      close: async () => {
        await page.close();
        await browser.close();
      },
    };
  } catch {
    return null;
  }
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

function prepareTweet(tweet: RawTweet): PreparedTweet {
  const account = X_LIVE_ACCOUNTS.find((item) => item.handle.toLowerCase() === tweet.handle.toLowerCase());
  const publishedAt = tweet.publishedAt ?? new Date().toISOString();
  const originalText = normalizeText(tweet.text).replace(/\n{2,}/g, "\n");
  const tweetId = tweet.url?.match(/\/status\/(\d+)/)?.[1] ?? null;
  const dedupeKey = tweetId
    ? `x:${tweet.handle}:${tweetId}`
    : `x:${tweet.handle}:${normalizeForComparison(originalText).slice(0, 120)}:${publishedAt.slice(0, 13)}`;

  return {
    account,
    handle: tweet.handle,
    originalText,
    originalUrl: tweet.url,
    publishedAt,
    tweetId,
    dedupeKey,
  };
}

function dedupePreparedTweets(tweets: PreparedTweet[]) {
  const map = new Map<string, PreparedTweet>();

  for (const tweet of tweets) {
    const existing = map.get(tweet.dedupeKey);
    if (!existing || tweet.publishedAt > existing.publishedAt) {
      map.set(tweet.dedupeKey, tweet);
    }
  }

  return Array.from(map.values());
}

function shouldKeepPreparedTweet(tweet: PreparedTweet) {
  const text = tweet.originalText.trim();
  if (!text) {
    return false;
  }

  const normalized = text.toLowerCase();
  if (hardBlockPatterns.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  const hasSignal = liveSignalPatterns.some((pattern) => pattern.test(normalized)) || text.length >= 90;
  const hitsWeakPersonal = weakPersonalPatterns.some((pattern) => pattern.test(normalized));

  if (hitsWeakPersonal && !hasSignal) {
    return false;
  }

  if (text.length < 28 && !hasSignal) {
    return false;
  }

  return true;
}

function shouldKeepExistingItem(item: LiveFeedItem) {
  return shouldKeepPreparedTweet({
    account: undefined,
    handle: item.handle,
    originalText: item.original_text,
    originalUrl: item.original_url,
    publishedAt: item.published_at,
    tweetId: item.original_url?.match(/\/status\/(\d+)/)?.[1] ?? null,
    dedupeKey: item.dedupe_key,
  });
}

async function createLiveFeedItem(tweet: PreparedTweet, warnings: string[]): Promise<LiveFeedItem> {
  const account = tweet.account;
  const publishedAt = tweet.publishedAt;
  const originalText = tweet.originalText;
  const titleSeed = summarizeText(originalText, 1, 72) || originalText.slice(0, 72);
  const isChinese = containsCjk(originalText);
  const summarySeed = summarizeText(originalText, 2, 220) || originalText;
  const localized = isChinese ? null : await summarizeEnglishTweetWithDeepSeek(tweet, warnings);
  const title = localized?.title ?? (isChinese ? titleSeed : localizeEnglishTitleToSimplifiedChinese(titleSeed, account?.displayName ?? `@${tweet.handle}`));
  const summary = localized?.summary ?? (
    isChinese
      ? ensureChinesePunctuation(summarySeed)
      : localizeEnglishSummaryToSimplifiedChinese(summarySeed, account?.displayName ?? `@${tweet.handle}`)
  );
  const tags = buildLiveTags(account, localized?.tags ?? [], title, summary);
  const id = stableId(tweet.dedupeKey);

  return {
    id,
    dedupe_key: tweet.dedupeKey,
    source_type: "x",
    summary_engine: localized ? "deepseek" : isChinese ? "source" : "fallback",
    source_name: account?.displayName ?? `@${tweet.handle}`,
    handle: tweet.handle,
    profile_url: `https://x.com/${tweet.handle}`,
    original_url: tweet.originalUrl,
    original_text: originalText,
    title,
    summary,
    published_at: publishedAt,
    imported_at: new Date().toISOString(),
    tags,
    category: account?.categories[0] ?? "X平台",
  };
}

function createTradeAlphaLiveFeedItem(item: TradeAlphaNews): LiveFeedItem {
  const publishedAt = safeIsoDate(item.datetime || item.created_at || new Date().toISOString());
  const summaryText = cleanTradeAlphaText(item.content);
  const originalText = summaryText;
  const title = cleanTradeAlphaText(summarizeText(summaryText, 1, 72) || summaryText.slice(0, 72));
  const summary = ensureChinesePunctuation(
    cleanTradeAlphaText(summaryText)
      .replace(/\s+/g, " ")
      .trim(),
  );
  const dedupeKey = `tradealpha:${item.id}`;
  const tags = Array.from(
    new Set(
      [item.source, item.category, item.level]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);

  return {
    id: stableId(dedupeKey),
    dedupe_key: dedupeKey,
    source_type: "tradealpha",
    summary_engine: "source",
    source_name: item.source?.trim() || "TradeAlpha",
    handle: "TradeAlpha",
    profile_url: "https://alpha.lxaa.top/#/home",
    original_url: null,
    original_text: originalText,
    title,
    summary,
    published_at: publishedAt,
    imported_at: new Date().toISOString(),
    tags,
    category: item.category?.trim() || "快讯监控",
  };
}

function cleanTradeAlphaText(text: string) {
  return normalizeText(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function canReuseExistingItem(item: LiveFeedItem, tweet: PreparedTweet) {
  if (normalizeForComparison(item.original_text) !== normalizeForComparison(tweet.originalText)) {
    return false;
  }

  if (containsCjk(tweet.originalText)) {
    return true;
  }

  if (!DEEPSEEK_API_KEY) {
    return true;
  }

  return item.summary_engine === "deepseek";
}

function buildLiveTags(account: XLiveAccount | undefined, candidateTags: string[], title: string, summary: string) {
  const tags = new Set<string>([...(account?.tags ?? []), ...(account?.categories ?? [])]);
  const text = `${title} ${summary}`.toLowerCase();

  if (text.includes("特斯拉") || text.includes("tesla")) {
    tags.add("特斯拉");
  }
  if (text.includes("储能")) {
    tags.add("储能");
  }
  if (text.includes("电池")) {
    tags.add("电池");
  }
  if (text.includes("半导体") || text.includes("芯片")) {
    tags.add("半导体");
  }
  if (text.includes("供应链")) {
    tags.add("供应链");
  }

  for (const tag of candidateTags) {
    const normalized = tag.trim().replace(/^#/, "");
    if (normalized) {
      tags.add(normalized);
    }
    if (tags.size >= 6) {
      break;
    }
  }

  return Array.from(tags).slice(0, 6);
}

async function summarizeEnglishTweetWithDeepSeek(tweet: PreparedTweet, warnings: string[]): Promise<LocalizedLiveContent | null> {
  if (!DEEPSEEK_API_KEY) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是一名专业中文财经快讯编辑。你的任务是把 X 平台英文动态整理成自然、克制、可读的中文快讯，不要生硬直译，不要编造事实，不要添加原文里没有的数据或判断，不要把演示、口语化表达、用户体验帖夸大成正式公告。",
          },
          {
            role: "user",
            content: [
              "请基于下面这条 X 动态，输出 JSON：",
              '{"title":"18-30字中文标题","summary":"1-2句中文提炼","tags":["标签1","标签2","标签3"]}',
              "",
              "要求：",
              "1. 标题像财经终端快讯，不要照抄英文原句，不要使用营销口吻。",
              "2. summary 用简体中文，最多两句，只提炼对读者有信息量的内容，直接说发生了什么、意味着什么。",
              "3. 不要在末尾追加“该内容属于业务进展披露 / 行业观察 / 产品演示 / 公司表态 / 个人观点”之类的分类总结句。",
              "4. 除非原文明确出现 launch、release、announce、roll out 等信息，否则不要写成“上线”“发布”“正式推出”“落地”。",
              "5. 如果只是功能展示、用户体验或转发评论，优先使用“展示”“演示”“车主称”“用户分享”“提到”等表述，但不要写空泛评价。",
              "6. tags 返回 1 到 3 个中文短标签。",
              "7. 只输出 JSON，不要输出其他解释。",
              "",
              `账号：@${tweet.handle}${tweet.account ? `（${tweet.account.displayName}）` : ""}`,
              `预设分类：${tweet.account?.categories.join("、") ?? "X平台"}`,
              `预设标签：${tweet.account?.tags.join("、") ?? "无"}`,
              `发布时间：${tweet.publishedAt}`,
              "原文：",
              tweet.originalText,
            ].join("\n"),
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      warnings.push(`DeepSeek 提炼失败（${tweet.handle}）：HTTP ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      warnings.push(`DeepSeek 未返回有效内容（${tweet.handle}）。`);
      return null;
    }

    const parsed = parseLocalizedContent(content);
    if (!parsed) {
      warnings.push(`DeepSeek 返回内容无法解析（${tweet.handle}）。`);
      return null;
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`DeepSeek 调用异常（${tweet.handle}）：${message}`);
    return null;
  }
}

function parseLocalizedContent(content: string): LocalizedLiveContent | null {
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      title?: unknown;
      summary?: unknown;
      tags?: unknown;
    };
    const title = normalizeChineseSentence(typeof parsed.title === "string" ? parsed.title : "");
    const summary = stripBoilerplateSummary(normalizeChineseSentence(typeof parsed.summary === "string" ? parsed.summary : "", true));
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!title || !summary) {
      return null;
    }

    return { title, summary, tags };
  } catch {
    return null;
  }
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return trimmed.slice(start, end + 1);
}

function normalizeChineseSentence(text: string, allowLonger = false) {
  const cleaned = normalizeText(text)
    .replace(/^["'“”]|["'“”]$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const sliced = cleaned.slice(0, allowLonger ? 140 : 32).trim();
  return allowLonger ? ensureChinesePunctuation(sliced) : sliced.replace(/[。！？.!?]+$/g, "");
}

function stripBoilerplateSummary(text: string) {
  return ensureChinesePunctuation(
    normalizeText(text)
      .replace(/([。；])\s*该内容(?:主要)?(?:为|属|属于)[^。；!?！？]{0,40}[。；]?$/u, "$1")
      .replace(/([。；])\s*该消息(?:主要)?(?:为|属|属于)[^。；!?！？]{0,40}[。；]?$/u, "$1")
      .replace(/([。；])\s*内容(?:主要)?(?:为|属|属于)[^。；!?！？]{0,40}[。；]?$/u, "$1")
      .replace(/([。；])\s*(?:这|该)并非[^。；!?！？]{0,40}[。；]?$/u, "$1")
      .replace(/([。；])\s*(?:属|属于)[^。；!?！？]{0,24}(?:披露|观察|演示|表态|观点)[^。；!?！？]{0,20}[。；]?$/u, "$1")
      .replace(/[；。]\s*$/u, "")
      .trim(),
  );
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
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

  const sorted = Array.from(kept.values()).sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
  return collapseNearDuplicateLiveItems(sorted);
}

function collapseNearDuplicateLiveItems(items: LiveFeedItem[]) {
  const kept: LiveFeedItem[] = [];
  const duplicateWindowMs = LIVE_NEAR_DUPLICATE_HOURS * 60 * 60 * 1000;

  for (const item of items) {
    const duplicateIndex = kept.findIndex((existing) => isNearDuplicateLiveItem(existing, item, duplicateWindowMs));
    if (duplicateIndex === -1) {
      kept.push(item);
      continue;
    }

    const preferred = pickPreferredLiveItem(kept[duplicateIndex], item);
    kept[duplicateIndex] = preferred;
  }

  return kept.sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
}

function isNearDuplicateLiveItem(a: LiveFeedItem, b: LiveFeedItem, duplicateWindowMs: number) {
  if (Math.abs(+new Date(a.published_at) - +new Date(b.published_at)) > duplicateWindowMs) {
    return false;
  }

  if (a.handle === b.handle && a.dedupe_key === b.dedupe_key) {
    return true;
  }

  const titleSimilarity = diceCoefficient(compactForSimilarity(a.title), compactForSimilarity(b.title));
  const summarySimilarity = diceCoefficient(compactForSimilarity(a.summary), compactForSimilarity(b.summary));

  return titleSimilarity >= 0.68 || (titleSimilarity >= 0.54 && summarySimilarity >= 0.58);
}

function pickPreferredLiveItem(a: LiveFeedItem, b: LiveFeedItem) {
  const score = (item: LiveFeedItem) =>
    item.summary.length +
    item.original_text.length / 4 +
    (item.summary_engine === "deepseek" ? 40 : 0) +
    item.tags.length * 4;

  return score(b) > score(a) ? b : a;
}

function compactForSimilarity(text: string) {
  return normalizeForComparison(text)
    .replace(/\b(据称|报道|表示|称|官方|用户|车主|产品|功能|演示|分享|行业|观察)\b/gu, " ")
    .replace(/\s+/g, "");
}

function diceCoefficient(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const aBigrams = makeBigrams(a);
  const bBigrams = makeBigrams(b);
  if (aBigrams.length === 0 || bBigrams.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const gram of aBigrams) {
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  let overlap = 0;
  for (const gram of bBigrams) {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  }

  return (2 * overlap) / (aBigrams.length + bBigrams.length);
}

function makeBigrams(text: string) {
  const grams: string[] = [];
  for (let index = 0; index < text.length - 1; index += 1) {
    grams.push(text.slice(index, index + 2));
  }
  return grams;
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

function safeIsoDate(dateLike: string) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
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
