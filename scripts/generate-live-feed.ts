import { generateLiveFeed } from "@/scripts/lib/x-live-feed";
import { getConfiguredXLiveAccounts } from "@/scripts/lib/x-live-config";

async function main() {
  const args = process.argv.slice(2);
  const headed = !args.includes("--headless");
  const collection = await generateLiveFeed({ headed, accounts: getConfiguredXLiveAccounts() });

  console.log(`Generated ${collection.count} live items.`);
  if (collection.warnings.length > 0) {
    console.warn("Warnings:");
    collection.warnings.forEach((warning) => console.warn(`- ${warning}`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
