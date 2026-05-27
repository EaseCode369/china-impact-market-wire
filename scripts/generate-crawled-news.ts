import { generateCrawledNews } from "@/scripts/lib/crawled-news";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await generateCrawledNews(args);
  console.log(`Generated ${result.posts.length} external news posts.`);
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
