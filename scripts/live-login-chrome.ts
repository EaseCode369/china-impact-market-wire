import { openXLoginProfileInChrome } from "@/scripts/lib/x-live-feed";

openXLoginProfileInChrome().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
