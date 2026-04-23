import { generateLocalNews } from "@/scripts/lib/local-news";

async function main() {
  const posts = await generateLocalNews();
  console.log(`Generated ${posts.length} local news posts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
