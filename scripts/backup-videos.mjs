// Download the live videos.json from Vercel Blob into docs/backups/.
// Usage: node --env-file=.env.local scripts/backup-videos.mjs [outfile]
import { list } from "@vercel/blob";
import { writeFileSync, mkdirSync } from "node:fs";

const date = new Date().toISOString().slice(0, 10);
const outfile = process.argv[2] ?? `docs/backups/${date}-videos.json`;

const { blobs } = await list({ prefix: "videos.json", limit: 1 });
if (blobs.length === 0) {
  console.error("No videos.json in Blob — nothing to back up (site runs on SEED_VIDEOS).");
  process.exit(2);
}
const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: "no-store" });
if (!res.ok) {
  console.error(`Blob fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const text = await res.text();
const videos = JSON.parse(text); // fail loudly rather than back up garbage
mkdirSync("docs/backups", { recursive: true });
writeFileSync(outfile, text);
console.log(`Backed up ${videos.length} videos (blob uploaded ${blobs[0].uploadedAt}) -> ${outfile}`);
for (const [i, v] of videos.entries()) {
  console.log(`${String(i + 1).padStart(2)}. ${v.client}${v.title ? ` — ${v.title}` : ""} (vimeo ${v.vimeoId})`);
}
