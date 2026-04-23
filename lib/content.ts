import fs from "node:fs";
import path from "node:path";

import type { GeneratedCollection, NewsPost } from "@/lib/content-schema";

const generatedDir = path.join(process.cwd(), "content", "generated");
const postsPath = path.join(generatedDir, "posts.json");

const emptyCollection: GeneratedCollection = {
  generatedAt: new Date(0).toISOString(),
  count: 0,
  posts: [],
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

export function getSources() {
  const counts = new Map<string, number>();

  for (const post of getAllPosts()) {
    counts.set(post.source_name, (counts.get(post.source_name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      slug: encodeURIComponent(name),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
}

export function getSiteStats() {
  const posts = getAllPosts();
  const externalCount = posts.filter((post) => post.original_url).length;
  const localCount = posts.length - externalCount;

  return {
    total: posts.length,
    localCount,
    externalCount,
    latestPublishedAt: posts[0]?.published_at ?? null,
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
