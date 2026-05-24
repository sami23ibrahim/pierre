import { list, put } from "@vercel/blob";

/** A portfolio video as stored. Array order is the public 1..N numbering. */
export type Video = {
  id: string; // stable random key — not the slot number
  vimeoId: string; // numeric Vimeo ID
  client: string;
  title: string; // may be ""
};

/** A video plus its Vimeo thumbnail URL, as passed to the public site. */
export type VideoWithThumbnail = Video & { thumbnail: string | null };

/** An editable row in the admin dashboard (link is the raw user input). */
export type DraftVideo = {
  id: string;
  link: string;
  client: string;
  title: string;
};

export type PrepareResult =
  | { ok: true; videos: Video[] }
  | { ok: false; errors: { index: number; message: string }[] };

const BLOB_KEY = "videos.json";

/** The current 12 videos — the fallback when Blob has no data yet. Order
 * matches the on-site order: featured Toyota at #1, featured Du - Too
 * Distressing at #6. */
export const SEED_VIDEOS: Video[] = [
  { id: "seed-1",  vimeoId: "291694491",  client: "Toyota",        title: "If" },
  { id: "seed-2",  vimeoId: "803985634",  client: "Heineken",      title: "The Cleaners" },
  { id: "seed-3",  vimeoId: "1131470962", client: "Diriyah FC",    title: "Underdogs" },
  { id: "seed-4",  vimeoId: "1009764873", client: "Denner",        title: "The Good Life (DC)" },
  { id: "seed-5",  vimeoId: "216957056",  client: "Du",            title: "The Men Sitting Next To You" },
  { id: "seed-6",  vimeoId: "121774920",  client: "Du",            title: "Too Distressing" },
  { id: "seed-7",  vimeoId: "898044833",  client: "L'Occitane",    title: "" },
  { id: "seed-8",  vimeoId: "682546048",  client: "Molto Fino",    title: "Feeds A Village" },
  { id: "seed-9",  vimeoId: "695205162",  client: "Jeep",          title: "Rewild Yourself" },
  { id: "seed-10", vimeoId: "573367624",  client: "Rolling Stone", title: "Rockin' Mamas" },
  { id: "seed-11", vimeoId: "316674560",  client: "Diesel",        title: "Be A Follower" },
  { id: "seed-12", vimeoId: "223460819",  client: "Fischer",       title: "The Naked Truth" },
];

/** Extract a numeric Vimeo ID from a bare ID or a Vimeo URL. Null if invalid. */
export function parseVimeoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Validate + normalise admin draft rows into storable Videos. Every entry must
 * have a parseable Vimeo link and a non-blank client — this is what prevents a
 * blank card anywhere in the list. Title is optional.
 */
export function prepareVideos(drafts: DraftVideo[]): PrepareResult {
  const errors: { index: number; message: string }[] = [];
  const videos: Video[] = [];

  drafts.forEach((draft, index) => {
    const vimeoId = parseVimeoId(draft.link);
    const client = draft.client.trim();
    if (!vimeoId) {
      errors.push({ index, message: "Enter a valid Vimeo link or numeric ID." });
    }
    if (!client) {
      errors.push({ index, message: "Client name is required." });
    }
    if (vimeoId && client) {
      videos.push({ id: draft.id, vimeoId, client, title: draft.title.trim() });
    }
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, videos };
}

/** Read the video list from Blob. Falls back to SEED_VIDEOS on any failure. */
export async function getVideos(): Promise<Video[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
    if (blobs.length === 0) return SEED_VIDEOS;
    const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return SEED_VIDEOS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? (data as Video[]) : SEED_VIDEOS;
  } catch {
    return SEED_VIDEOS;
  }
}

/** Overwrite the video list in Blob. Requires BLOB_READ_WRITE_TOKEN. */
export async function saveVideos(videos: Video[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(videos, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
