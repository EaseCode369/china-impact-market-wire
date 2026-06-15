import { execFileSync } from "node:child_process";

import { generateLiveFeed } from "@/scripts/lib/x-live-feed";
import { getConfiguredXLiveAccounts } from "@/scripts/lib/x-live-config";

async function main() {
  const collection = await generateLiveFeed({ headed: process.env.X_HEADLESS !== "1", accounts: getConfiguredXLiveAccounts() });
  console.log(`Generated ${collection.count} live items.`);
  collection.warnings.forEach((warning) => console.warn(`- ${warning}`));

  const changed = hasChanges();
  if (!changed) {
    console.log("No live feed changes to publish.");
    return;
  }

  run("git", ["add", "-f", "content/generated/live-feed.json"]);
  run("git", ["commit", "-m", "chore: update live feed"]);
  run("git", ["push", "origin", "main"]);
  console.log("Live feed pushed to GitHub. Vercel will deploy the latest content.");
}

function hasChanges() {
  const status = execFileSync("git", ["status", "--short", "content/generated/live-feed.json"], {
    encoding: "utf8",
  }).trim();
  return Boolean(status);
}

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: "inherit" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
