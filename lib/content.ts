import fs from "node:fs";
import path from "node:path";

import type { GeneratedCollection, NewsPost, SiteSummary, SourceSummary } from "@/lib/content-schema";

const generatedDir = path.join(process.cwd(), "content", "generated");
const postsPath = path.join(generatedDir, "posts.json");
const summaryPath = path.join(generatedDir, "summary.json");

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
