// Re-upload a backup over the live videos.json in Vercel Blob.
// This edits the LIVE site's video list immediately.
// Usage: node --env-file=.env.local scripts/restore-videos.mjs docs/backups/<file>.json
import { put } from "@vercel/blob";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node --env-file=.env.local scripts/restore-videos.mjs <backup.json>");
  process.exit(2);
}
const videos = JSON.parse(readFileSync(file, "utf8"));
const valid =
  Array.isArray(videos) &&
  videos.length > 0 &&
  videos.every((v) => v.id && v.vimeoId && v.client && typeof v.title === "string");
if (!valid) {
  console.error(`${file} is not a valid video list — refusing to upload.`);
  process.exit(1);
}
console.log(`Restoring ${videos.length} videos to Blob:`);
for (const [i, v] of videos.entries()) {
  console.log(`${String(i + 1).padStart(2)}. ${v.client}${v.title ? ` — ${v.title}` : ""} (vimeo ${v.vimeoId})`);
}
await put("videos.json", JSON.stringify(videos, null, 2), {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
});
console.log("Done — live videos.json overwritten with the backup.");
