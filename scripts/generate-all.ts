import fs from "node:fs";
import path from "node:path";

import type { NewsPost, SiteSummary } from "@/lib/content-schema";
import { generateCrawledNews } from "@/scripts/lib/crawled-news";
import { compareContentLevel, isNearDuplicate, writeCollection } from "@/scripts/lib/helpers";
import { getPausedSourceConfigs } from "@/scripts/lib/source-config";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { posts: crawledPosts, activeSources } = await generateCrawledNews(args);
  const dedupeResult = dedupePosts(crawledPosts);
  const posts = dedupeResult.posts.sort(sortPosts);

  writeCollection("posts.json", posts);
  writeCollection("latest.json", posts.slice(0, 12));

  const summary: SiteSummary = {
    generatedAt: new Date().toISOString(),
    total: posts.length,
    external: posts.length,
    chinaRelevantCount: posts.filter((post) => post.is_china_stock_relevant).length,
    dedupedCount: dedupeResult.removedCount,
    activeSources,
    pausedSources: getPausedSourceConfigs().map((source) => source.displayName),
    lastSuccessfulRunAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(process.cwd(), "content", "generated", "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(`Generated ${posts.length} total posts after dedupe.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function parseArgs(argv: string[]) {
  const sourceArg = argv.find((item) => item.startsWith("--source="));
  const limitArg = argv.find((item) => item.startsWith("--limit="));
  const sinceArg = argv.find((item) => item.startsWith("--since="));

  return {
    sourceIds: sourceArg ? sourceArg.replace("--source=", "").split(",").filter(Boolean) : undefined,
    limit: limitArg ? Number(limitArg.replace("--limit=", "")) : undefined,
    since: sinceArg ? sinceArg.replace("--since=", "") : null,
  };
}

function dedupePosts(posts: NewsPost[]) {
  const kept: NewsPost[] = [];
  let removedCount = 0;

  for (const candidate of posts.sort(sortPosts)) {
    const existingIndex = kept.findIndex((post) => isNearDuplicate(post, candidate));
    if (existingIndex === -1) {
      kept.push(candidate);
      continue;
    }

    const existing = kept[existingIndex];
    const winner = pickPreferredPost(existing, candidate);
    if (winner.id !== existing.id) {
      kept[existingIndex] = winner;
    }
    removedCount += 1;
  }

  return { posts: kept, removedCount };
}

function pickPreferredPost(a: NewsPost, b: NewsPost) {
  if (a.source_priority !== b.source_priority) {
    return a.source_priority > b.source_priority ? a : b;
  }

  const levelComparison = compareContentLevel(a.content_level, b.content_level);
  if (levelComparison !== 0) {
    return levelComparison > 0 ? a : b;
  }

  if (a.summary.length !== b.summary.length) {
    return a.summary.length > b.summary.length ? a : b;
  }

  return +new Date(a.published_at) >= +new Date(b.published_at) ? a : b;
}

function sortPosts(a: NewsPost, b: NewsPost) {
  if (a.is_china_stock_relevant !== b.is_china_stock_relevant) {
    return a.is_china_stock_relevant ? -1 : 1;
  }

  if (a.source_priority !== b.source_priority) {
    return b.source_priority - a.source_priority;
  }

  return +new Date(b.published_at) - +new Date(a.published_at);
}
