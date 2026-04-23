import fs from "node:fs";
import path from "node:path";

import type { NewsPost } from "@/lib/content-schema";
import { generateCrawledNews } from "@/scripts/lib/crawled-news";
import { generateLocalNews } from "@/scripts/lib/local-news";
import { writeCollection } from "@/scripts/lib/helpers";

async function main() {
  const [localPosts, crawledPosts] = await Promise.all([generateLocalNews(), generateCrawledNews()]);
  const deduped = new Map<string, NewsPost>();

  for (const post of [...localPosts, ...crawledPosts]) {
    const key = post.original_url ?? `${post.source_name}:${post.title}`;
    if (!deduped.has(key)) {
      deduped.set(key, post);
    }
  }

  const posts = Array.from(deduped.values()).sort(
    (a, b) => +new Date(b.published_at) - +new Date(a.published_at),
  );

  writeCollection("posts.json", posts);
  writeCollection("latest.json", posts.slice(0, 12));

  const summary = {
    generatedAt: new Date().toISOString(),
    total: posts.length,
    local: localPosts.length,
    crawled: crawledPosts.length,
    sources: Array.from(new Set(posts.map((post) => post.source_name))),
  };

  fs.writeFileSync(path.join(process.cwd(), "content", "generated", "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Generated ${posts.length} total posts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
