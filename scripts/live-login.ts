import { openXLoginProfile } from "@/scripts/lib/x-live-feed";

openXLoginProfile().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
