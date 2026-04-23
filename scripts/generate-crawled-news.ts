import { generateCrawledNews } from "@/scripts/lib/crawled-news";

async function main() {
  const posts = await generateCrawledNews();
  console.log(`Generated ${posts.length} crawled news posts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
