# Video Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the portfolio site render videos from data, and add a password-protected admin dashboard where the owner can add / edit / delete / reorder videos.

**Architecture:** The 12 hand-tuned tile shapes become a fixed 12-slot layout *blueprint* in code (`lib/layout.ts`). Each slot has a `kind`: `featured` (a full-width row containing one tile — slots 1 and 6) or `left` / `right` (one half of a two-tile paired row). Video N renders in slot `(N-1) mod 12`, so the collage repeats every 12. Video *content* (Vimeo ID, client, title) lives in a single ordered JSON array in Vercel Blob. The public site reads that array; an admin dashboard writes it and triggers a cache revalidation. No deploys on content change.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vercel Blob (`@vercel/blob`), Vitest for unit tests, HMAC cookie auth via Web Crypto.

---

## Parallel Execution Map

Tasks are grouped into **waves**. Tasks *within* a wave touch disjoint files and have no ordering dependency — dispatch them as parallel subagents. Integrate (merge + green build) at each wave boundary before starting the next wave.

```
Wave 0 ─ T0  Project setup                         (1 agent)
              │
Wave A ─ T1  Layout blueprint   ┐
         T2  Video data layer   ├─ no shared files  (3 agents in parallel)
         T3  Admin auth         ┘
              │
Wave B ─ T4  Data-driven public site  ┐
         T5  Admin dashboard          ┘─ no shared files (2 agents in parallel)
              │
Wave C ─ T6  Integration, deploy & verification     (1 agent)
```

**Dependencies:** T0 → everything. T1/T2/T3 → T0 only. T4 → T0+T1+T2. T5 → T0+T1+T2. T6 → all.

**File ownership (no two parallel tasks share a file):**

| Task | Creates / modifies |
|------|--------------------|
| T0 | `package.json`, `package-lock.json`, `vitest.config.ts` |
| T1 | `lib/layout.ts`, `lib/layout.test.ts` |
| T2 | `lib/videos.ts`, `lib/videos.test.ts` |
| T3 | `lib/auth.ts`, `lib/auth.test.ts`, `middleware.ts`, `app/admin/login/page.tsx`, `app/admin/login/actions.ts`, `.gitignore`, `.env.example`, `.env.local` |
| T4 | `app/page.tsx`, `app/components/Portfolio.tsx` |
| T5 | `app/admin/page.tsx`, `app/admin/actions.ts`, `app/components/AdminEditor.tsx` |
| T6 | `.env.local` (local only), Vercel dashboard config |

---

## Task T0: Project setup

**Wave 0 — must complete before any other task. Depends on: nothing.**

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install the Vercel Blob client**

Run: `npm install @vercel/blob`
Expected: `@vercel/blob` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Install Vitest as a dev dependency**

Run: `npm install -D vitest`
Expected: `vitest` appears under `devDependencies` in `package.json`.

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Add the `test` script**

In `package.json`, add to the `"scripts"` object:

```json
    "test": "vitest run"
```

The `scripts` block should now read:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
```

- [ ] **Step 5: Verify Vitest runs**

Run: `npx vitest run --passWithNoTests`
Expected: exits 0 with "No test files found" (no tests exist yet — that is correct).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add @vercel/blob and vitest"
```

---

## Task T1: Layout blueprint

**Wave A — parallel with T2, T3. Depends on: T0.**

The 12-slot layout blueprint (two `featured` full-width slots + five `left`+`right` paired pairs) plus two pure helpers. Values are transcribed verbatim from the current `app/components/Portfolio.tsx` so the rendered site stays pixel-identical.

**Files:**
- Create: `lib/layout.ts`
- Test: `lib/layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/layout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { LAYOUT, slotForIndex, layoutRows } from "./layout";

describe("LAYOUT", () => {
  it("has 12 slots", () => {
    expect(LAYOUT).toHaveLength(12);
  });

  it("marks slots 0 and 5 as featured (full-width)", () => {
    expect(LAYOUT[0].kind).toBe("featured");
    expect(LAYOUT[5].kind).toBe("featured");
  });

  it("every left slot is followed by a right slot (so they always pair)", () => {
    LAYOUT.forEach((slot, i) => {
      if (slot.kind === "left") {
        expect(LAYOUT[i + 1]?.kind).toBe("right");
      }
    });
  });
});

describe("slotForIndex", () => {
  it("maps indexes 0-11 to slots 0-11", () => {
    expect(slotForIndex(7)).toBe(LAYOUT[7]);
  });

  it("wraps every 12 — video 13 (index 12) reuses slot 0 (a featured row)", () => {
    expect(slotForIndex(12)).toBe(LAYOUT[0]);
    expect(slotForIndex(12).kind).toBe("featured");
  });

  it("wraps — video 15 (index 14) reuses slot 2", () => {
    expect(slotForIndex(14)).toBe(LAYOUT[2]);
  });
});

describe("layoutRows", () => {
  // Each item carries its 0-based slot index so the test can assert the row
  // structure independent of any specific video data.
  const items = (indexes: number[]) => indexes.map((i) => ({ i }));

  it("puts a featured slot in its own row", () => {
    // index 0 is featured.
    expect(layoutRows(items([0]))).toEqual([
      { kind: "featured", items: [{ i: 0 }] },
    ]);
  });

  it("pairs consecutive left + right slots into one row", () => {
    // indexes 1, 2 are left + right.
    expect(layoutRows(items([1, 2]))).toEqual([
      { kind: "paired", items: [{ i: 1 }, { i: 2 }] },
    ]);
  });

  it("mixes featured and paired rows in the right order for the seed list", () => {
    const result = layoutRows(items([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
    expect(result.map((r) => r.kind)).toEqual([
      "featured", "paired", "paired", "featured", "paired", "paired", "paired",
    ]);
  });

  it("leaves a lone item in the final paired row when the list ends on a left slot", () => {
    // indexes 1, 2, 3: left + right pair, then a lone left.
    expect(layoutRows(items([1, 2, 3]))).toEqual([
      { kind: "paired", items: [{ i: 1 }, { i: 2 }] },
      { kind: "paired", items: [{ i: 3 }] },
    ]);
  });

  it("returns no rows for an empty list", () => {
    expect(layoutRows([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/layout.test.ts`
Expected: FAIL — cannot resolve `./layout` (file does not exist yet).

- [ ] **Step 3: Create the implementation**

Create `lib/layout.ts`:

```ts
export type SlotKind = "featured" | "left" | "right";

export type Slot = {
  kind: SlotKind;
  desktop: {
    media: { left: string; top: string; width: string; height: string };
    label: { left: string; top: string; width: string };
  };
  mobile: { aspectRatio: string };
};

/** A row produced by layoutRows: a featured slot alone, or a left+right pair
 * (which degrades to a lone left when the list ends mid-pair). */
export type LayoutRow<T> =
  | { kind: "featured"; items: [T] }
  | { kind: "paired"; items: [T] | [T, T] };

/**
 * The fixed 12-slot collage blueprint, transcribed verbatim from the original
 * hand-tuned tiles plus the two featured full-width rows (Toyota at slot 0,
 * Du - Too Distressing at slot 5). Video N renders in slot (N-1) mod 12, so
 * the layout repeats every 12 videos. This is design, not content — it stays
 * in code.
 */
export const LAYOUT: Slot[] = [
  { kind: "featured", desktop: { media: { left: "1.65%",  top: "2.22%",  width: "96.7%",  height: "88%"    }, label: { left: "1.65%",  top: "92%",    width: "96.7%"  } }, mobile: { aspectRatio: "1.778" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "30.97%", width: "62.35%", height: "57.50%" }, label: { left: "1.87%",  top: "89.86%", width: "62.35%" } }, mobile: { aspectRatio: "2.014" } },
  { kind: "right",    desktop: { media: { left: "66.39%", top: "2.22%",  width: "33.50%", height: "89.03%" }, label: { left: "66.39%", top: "92.64%", width: "33.50%" } }, mobile: { aspectRatio: "0.699" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "2.22%",  width: "39.63%", height: "58.89%" }, label: { left: "1.65%",  top: "62.64%", width: "39.63%" } }, mobile: { aspectRatio: "1.250" } },
  { kind: "right",    desktop: { media: { left: "43.14%", top: "7.36%",  width: "56.82%", height: "84.44%" }, label: { left: "43.14%", top: "92.22%", width: "56.82%" } }, mobile: { aspectRatio: "1.250" } },
  { kind: "featured", desktop: { media: { left: "1.65%",  top: "2.22%",  width: "96.7%",  height: "88%"    }, label: { left: "1.65%",  top: "92%",    width: "96.7%"  } }, mobile: { aspectRatio: "1.778" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "2.22%",  width: "33.36%", height: "89.03%" }, label: { left: "1.65%",  top: "92.64%", width: "33.36%" } }, mobile: { aspectRatio: "0.695" } },
  { kind: "right",    desktop: { media: { left: "36.49%", top: "28.06%", width: "63.55%", height: "63.33%" }, label: { left: "36.49%", top: "92.64%", width: "63.55%" } }, mobile: { aspectRatio: "1.865" } },
  { kind: "left",     desktop: { media: { left: "2.17%",  top: "5.69%",  width: "56.82%", height: "63.75%" }, label: { left: "2.17%",  top: "70.83%", width: "56.82%" } }, mobile: { aspectRatio: "1.655" } },
  { kind: "right",    desktop: { media: { left: "61.23%", top: "39.86%", width: "38.66%", height: "47.22%" }, label: { left: "61.23%", top: "88.47%", width: "38.66%" } }, mobile: { aspectRatio: "1.519" } },
  { kind: "left",     desktop: { media: { left: "2.17%",  top: "17.08%", width: "63.55%", height: "63.33%" }, label: { left: "2.17%",  top: "81.81%", width: "63.55%" } }, mobile: { aspectRatio: "1.865" } },
  { kind: "right",    desktop: { media: { left: "67.81%", top: "2.22%",  width: "32.09%", height: "89.03%" }, label: { left: "67.81%", top: "92.64%", width: "32.09%" } }, mobile: { aspectRatio: "0.670" } },
];

/** The slot a video at the given 0-based index renders in. Wraps every 12. */
export function slotForIndex(index: number): Slot {
  const len = LAYOUT.length;
  return LAYOUT[((index % len) + len) % len];
}

/**
 * Walk a list of videos through the layout blueprint and group them into rows.
 * A featured slot becomes its own row; consecutive left+right slots share a
 * paired row. A list that ends on a left slot produces a final paired row
 * with only its left tile (the right half stays empty space).
 */
export function layoutRows<T>(items: T[]): LayoutRow<T>[] {
  const rows: LayoutRow<T>[] = [];
  let i = 0;
  while (i < items.length) {
    const slot = slotForIndex(i);
    if (slot.kind === "featured") {
      rows.push({ kind: "featured", items: [items[i]] });
      i += 1;
    } else {
      // slot.kind === "left" by construction; pair with the next slot if there
      // is one (which is always "right" per the blueprint invariant).
      const pair: [T] | [T, T] =
        i + 1 < items.length ? [items[i], items[i + 1]] : [items[i]];
      rows.push({ kind: "paired", items: pair });
      i += pair.length;
    }
  }
  return rows;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/layout.test.ts`
Expected: PASS — 11 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/layout.ts lib/layout.test.ts
git commit -m "feat: add 12-slot layout blueprint"
```

---

## Task T2: Video data layer

**Wave A — parallel with T1, T3. Depends on: T0.**

All video data: the `Video` type, Vimeo-link parsing, the validation that enforces the "no blank cards" rule, the seed list, and the Blob read/write functions. The pure functions are unit-tested; the Blob functions are verified end-to-end in T6.

**Files:**
- Create: `lib/videos.ts`
- Test: `lib/videos.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/videos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseVimeoId, prepareVideos, type DraftVideo } from "./videos";

describe("parseVimeoId", () => {
  it("accepts a bare numeric ID", () => {
    expect(parseVimeoId("803985634")).toBe("803985634");
  });
  it("accepts a standard vimeo.com URL", () => {
    expect(parseVimeoId("https://vimeo.com/803985634")).toBe("803985634");
  });
  it("accepts a vimeo URL with a privacy hash", () => {
    expect(parseVimeoId("https://vimeo.com/803985634/abc123def")).toBe("803985634");
  });
  it("accepts a player.vimeo.com URL", () => {
    expect(parseVimeoId("https://player.vimeo.com/video/803985634")).toBe("803985634");
  });
  it("trims surrounding whitespace", () => {
    expect(parseVimeoId("  803985634  ")).toBe("803985634");
  });
  it("rejects an empty string", () => {
    expect(parseVimeoId("")).toBeNull();
  });
  it("rejects a non-Vimeo string", () => {
    expect(parseVimeoId("not a link")).toBeNull();
  });
});

describe("prepareVideos", () => {
  const draft = (over: Partial<DraftVideo>): DraftVideo => ({
    id: "x", link: "803985634", client: "Acme", title: "", ...over,
  });

  it("accepts a fully valid list", () => {
    const r = prepareVideos([draft({}), draft({ id: "y" })]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.videos).toHaveLength(2);
  });
  it("parses each link into a numeric vimeoId", () => {
    const r = prepareVideos([draft({ link: "https://vimeo.com/12345" })]);
    expect(r.ok && r.videos[0].vimeoId).toBe("12345");
  });
  it("allows an empty title", () => {
    expect(prepareVideos([draft({ title: "" })]).ok).toBe(true);
  });
  it("rejects an entry with an empty link (no blank cards)", () => {
    const r = prepareVideos([draft({ link: "" })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].index).toBe(0);
  });
  it("rejects an entry with a blank client", () => {
    expect(prepareVideos([draft({ client: "   " })]).ok).toBe(false);
  });
  it("reports the index of a bad entry in the middle of the list", () => {
    const r = prepareVideos([draft({}), draft({ link: "" }), draft({})]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.index === 1)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/videos.test.ts`
Expected: FAIL — cannot resolve `./videos`.

- [ ] **Step 3: Create the implementation**

Create `lib/videos.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/videos.test.ts`
Expected: PASS — 13 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/videos.ts lib/videos.test.ts
git commit -m "feat: add video data layer with Blob storage and validation"
```

---

## Task T3: Admin authentication

**Wave A — parallel with T1, T2. Depends on: T0.**

A single-password gate for `/admin`: an HMAC session token in an httpOnly cookie, a middleware guard, and a login page. The HMAC helpers are unit-tested.

**Files:**
- Create: `lib/auth.ts`, `lib/auth.test.ts`, `middleware.ts`
- Create: `app/admin/login/page.tsx`, `app/admin/login/actions.ts`
- Create: `.env.example`, `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing test**

Create `lib/auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

describe("session tokens", () => {
  it("verifies a token created with the same secret", async () => {
    const token = await createSessionToken("hunter2");
    expect(await verifySessionToken(token, "hunter2")).toBe(true);
  });
  it("rejects a token checked against the wrong secret", async () => {
    const token = await createSessionToken("hunter2");
    expect(await verifySessionToken(token, "wrong-secret")).toBe(false);
  });
  it("rejects an empty token", async () => {
    expect(await verifySessionToken("", "hunter2")).toBe(false);
  });
  it("rejects a garbage token", async () => {
    expect(await verifySessionToken("deadbeef", "hunter2")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/auth.test.ts`
Expected: FAIL — cannot resolve `./auth`.

- [ ] **Step 3: Create the auth helpers**

Create `lib/auth.ts`:

```ts
/**
 * Minimal single-owner auth: the session cookie holds an HMAC of a fixed
 * payload keyed by the admin password. It is not forgeable without the
 * password. Uses Web Crypto so it runs in both Edge middleware and Node.
 */
const PAYLOAD = "pierre-admin-session";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  return hmacHex(secret, PAYLOAD);
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const expected = await hmacHex(secret, PAYLOAD);
  if (token.length !== expected.length) return false;
  // Constant-time comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/auth.test.ts`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Create the middleware guard**

Create `middleware.ts` (project root):

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page itself must stay reachable.
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get("pm_admin")?.value ?? "";
  const secret = process.env.ADMIN_PASSWORD ?? "";
  if (await verifySessionToken(token, secret)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
```

- [ ] **Step 6: Create the login server action**

Create `app/admin/login/actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken } from "@/lib/auth";

export type LoginState = { error: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const secret = process.env.ADMIN_PASSWORD ?? "";

  if (!secret) return { error: "ADMIN_PASSWORD is not configured." };
  if (password !== secret) return { error: "Incorrect password." };

  const token = await createSessionToken(secret);
  const store = await cookies();
  store.set("pm_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  redirect("/admin");
}
```

- [ ] **Step 7: Create the login page**

Create `app/admin/login/page.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: 12, width: 260 }}
      >
        <h1
          style={{
            color: "#eee",
            fontSize: 16,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}
        >
          Admin
        </h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          style={{
            background: "#141414",
            border: "1px solid #333",
            borderRadius: 5,
            color: "#eee",
            padding: "10px 12px",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#eee",
            border: "none",
            borderRadius: 5,
            color: "#111",
            padding: "10px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {pending ? "…" : "Enter"}
        </button>
        {state.error && (
          <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0 }}>{state.error}</p>
        )}
      </form>
    </main>
  );
}
```

- [ ] **Step 8: Create the committed env example**

Create `.env.example`:

```
# Password for the /admin dashboard. Set a strong value in Vercel too.
ADMIN_PASSWORD=change-me

# Auto-added by Vercel when a Blob store is created; pull locally with
# `vercel env pull .env.local`. Leave blank locally to use the seed data.
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 9: Create the local dev env file**

Create `.env.local` (this file is git-ignored — local only):

```
ADMIN_PASSWORD=devpassword
```

- [ ] **Step 10: Ensure git ignores secrets but keeps the example**

Open `.gitignore`. Confirm a line ignoring local env files exists (e.g. `.env*` or `.env.local`). If neither is present, add `.env*`. Then add an exception line so the example file is committable:

```
!.env.example
```

- [ ] **Step 11: Verify the build and the auth gate**

Run: `npm run build`
Expected: compiles with no type errors; `middleware` is listed in the build output.

Run: `npm run dev`, then in a browser:
1. Visit `http://localhost:3000/admin` → redirected to `/admin/login`.
2. Enter the wrong password → "Incorrect password." shown, no redirect.
3. Enter `devpassword` → redirected to `/admin` (which currently 404s — the page is built in T5; the redirect itself working is what matters here).

- [ ] **Step 12: Commit**

```bash
git add lib/auth.ts lib/auth.test.ts middleware.ts app/admin/login .env.example .gitignore
git commit -m "feat: add admin password authentication"
```

(`.env.local` is git-ignored and is not committed — intentional.)

---

## Task T4: Data-driven public site

**Wave B — parallel with T5. Depends on: T0, T1, T2.**

Refactor the homepage so it reads videos from `getVideos()` and renders them through the layout blueprint, replacing the hand-coded tile JSX. After this task the site looks pixel-identical to today (because `getVideos()` returns `SEED_VIDEOS` until Blob is wired in T6).

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/Portfolio.tsx`

- [ ] **Step 1: Rewrite `app/page.tsx`**

Replace the entire contents of `app/page.tsx` with:

```tsx
import Portfolio from "./components/Portfolio";
import { getVideos } from "@/lib/videos";
import type { VideoWithThumbnail } from "@/lib/videos";

async function fetchVimeoThumbnail(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=1280`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.thumbnail_url as string) ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const videos = await getVideos();
  const withThumbnails: VideoWithThumbnail[] = await Promise.all(
    videos.map(async (video) => ({
      ...video,
      thumbnail: await fetchVimeoThumbnail(video.vimeoId),
    }))
  );

  return <Portfolio videos={withThumbnails} />;
}
```

- [ ] **Step 2: Update the imports in `app/components/Portfolio.tsx`**

Replace this (lines 4-5):

```tsx
import { useEffect, useState } from "react";
import VideoModal from "./VideoModal";
```

with:

```tsx
import { Fragment, useEffect, useState } from "react";
import VideoModal from "./VideoModal";
import { slotForIndex, layoutRows } from "@/lib/layout";
import type { VideoWithThumbnail } from "@/lib/videos";
```

- [ ] **Step 3: Update the `Props` type and add a caption helper**

Replace this:

```tsx
type Props = {
  thumbnails: Record<string, string | null>;
};
```

with:

```tsx
type Props = {
  videos: VideoWithThumbnail[];
};

function captionFor(v: VideoWithThumbnail): string {
  return v.title ? `${v.client} — ${v.title}` : v.client;
}
```

- [ ] **Step 4: Update the component signature**

Replace this:

```tsx
export default function Portfolio({ thumbnails }: Props) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"work" | "contact">("work");
  const [navHidden, setNavHidden] = useState(false);
  const open = (id: string) => () => setActiveVideo(id);
  const thumb = (id: string, fallback: string) => thumbnails[id] || fallback;
```

with:

```tsx
export default function Portfolio({ videos }: Props) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"work" | "contact">("work");
  const [navHidden, setNavHidden] = useState(false);
  const open = (id: string) => () => setActiveVideo(id);
```

(The three `useEffect` hooks, `scrollToTop`, the hero, nav, contact sections and footer are unchanged — leave them exactly as they are.)

- [ ] **Step 5: Replace the desktop work section**

Replace the entire desktop `<section id="work"> … </section>` block (the seven hand-coded `<div className="row">` rows, including the two `.row.is-full` featured rows) with:

```tsx
          <section id="work">
            {(() => {
              const rows = layoutRows(videos);
              // Track the global video index so each tile can look up its slot.
              let videoIndex = 0;
              return rows.map((row, rowIndex) => {
                const rowClass = row.kind === "featured" ? "row is-full" : "row";
                return (
                  <div className={rowClass} key={rowIndex}>
                    {row.items.map((v) => {
                      const slot = slotForIndex(videoIndex);
                      videoIndex += 1;
                      const caption = captionFor(v);
                      return (
                        <Fragment key={v.id}>
                          <button
                            type="button"
                            className="tile-media is-video"
                            style={slot.desktop.media}
                            onClick={open(v.vimeoId)}
                            aria-label={`Play ${caption}`}
                          >
                            {v.thumbnail && <img src={v.thumbnail} alt={caption} />}
                            <PlayIcon />
                          </button>
                          <div className="tile-label" style={slot.desktop.label}>
                            <span className="client">{v.client}</span>
                            {v.title && <span className="ttl">{v.title}</span>}
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </section>
```

- [ ] **Step 6: Replace the mobile work section**

Replace the entire mobile `<section id="work-m"> … </section>` block (the hand-coded `<div className="tile">` tiles) with:

```tsx
        <section id="work-m">
          {videos.map((v, index) => {
            const slot = slotForIndex(index);
            const caption = captionFor(v);
            return (
              <div className="tile" key={v.id}>
                <button
                  type="button"
                  className="tile-media is-video"
                  style={{ aspectRatio: slot.mobile.aspectRatio }}
                  onClick={open(v.vimeoId)}
                  aria-label={`Play ${caption}`}
                >
                  {v.thumbnail && <img src={v.thumbnail} alt={caption} />}
                  <PlayIcon />
                </button>
                <div className="tile-label">
                  <span className="client">{v.client}</span>
                  {v.title && <span className="ttl">{v.title}</span>}
                </div>
              </div>
            );
          })}
        </section>
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: compiles with no type errors.

- [ ] **Step 8: Verify the site renders identically**

Run: `npm run dev`, then open `http://localhost:3000`:
- **Desktop (wide window):** the collage shows 7 rows / 12 video tiles — featured full-width Toyota at row 1, paired rows for Heineken+Diriyah and Denner+Du, featured full-width Du - Too Distressing at row 4, then paired rows for L'Occitane+Molto Fino, Jeep+Rolling Stone, and Diesel+Fischer. Every tile shows its Vimeo thumbnail; labels read correctly (Toyota — If, Heineken — The Cleaners, … L'Occitane with no title line, … Fischer — The Naked Truth).
- **Mobile (narrow window or device emulation):** 12 stacked tiles with the same per-tile proportions and labels. The two featured tiles (Toyota and Du - Too Distressing) render at a 16:9 aspect.
- Clicking any tile opens the video modal and the video plays.
- Scroll-in fade animations and the nav underline still behave as before. Featured rows fade up; paired rows still slide in from the sides.

The desktop arrangement must match the current production site exactly. Mobile gains the two featured tiles (which were desktop-only before this refactor) — that is intentional. If anything else differs, fix before committing.

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx app/components/Portfolio.tsx
git commit -m "feat: render portfolio from video data"
```

---

## Task T5: Admin dashboard

**Wave B — parallel with T4. Depends on: T0, T1, T2.**

The `/admin` editor: a numbered list of videos with link / client / title fields, add / delete / reorder, and a Save that validates and writes to Blob.

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/actions.ts`
- Create: `app/components/AdminEditor.tsx`

- [ ] **Step 1: Create the save server action**

Create `app/admin/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prepareVideos, saveVideos } from "@/lib/videos";
import type { DraftVideo, PrepareResult } from "@/lib/videos";

export async function saveVideosAction(
  drafts: DraftVideo[],
): Promise<PrepareResult> {
  const result = prepareVideos(drafts);
  if (!result.ok) return result;

  await saveVideos(result.videos);
  revalidatePath("/"); // refresh the public homepage cache — no deploy
  return result;
}
```

- [ ] **Step 2: Create the admin editor component**

Create `app/components/AdminEditor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { slotForIndex } from "@/lib/layout";
import { saveVideosAction } from "@/app/admin/actions";
import type { Video, DraftVideo, PrepareResult } from "@/lib/videos";

type Props = { initialVideos: Video[] };

const toDraft = (v: Video): DraftVideo => ({
  id: v.id,
  link: v.vimeoId,
  client: v.client,
  title: v.title,
});

export default function AdminEditor({ initialVideos }: Props) {
  const [drafts, setDrafts] = useState<DraftVideo[]>(initialVideos.map(toDraft));
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const updateField = (index: number, field: keyof DraftVideo, value: string) => {
    setSaved(false);
    setDrafts((d) =>
      d.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addVideo = () => {
    setSaved(false);
    setDrafts((d) => [
      ...d,
      { id: crypto.randomUUID(), link: "", client: "", title: "" },
    ]);
  };

  const removeVideo = (index: number) => {
    if (!confirm(`Remove video #${index + 1}?`)) return;
    setSaved(false);
    setDrafts((d) => d.filter((_, i) => i !== index));
  };

  const moveVideo = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= drafts.length) return;
    setSaved(false);
    setDrafts((d) => {
      const next = [...d];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const result: PrepareResult = await saveVideosAction(drafts);
      if (result.ok) {
        setRowErrors({});
        setSaved(true);
      } else {
        const byRow: Record<number, string[]> = {};
        for (const e of result.errors) {
          (byRow[e.index] ??= []).push(e.message);
        }
        setRowErrors(byRow);
        setSaved(false);
      }
    });
  };

  return (
    <main style={S.page}>
      <header style={S.header}>
        <h1 style={S.h1}>Portfolio videos</h1>
        <p style={S.sub}>
          {drafts.length} video{drafts.length === 1 ? "" : "s"} — they appear on
          the site in this order, #1 first.
        </p>
      </header>

      <ol style={S.list}>
        {drafts.map((row, index) => {
          const slot = slotForIndex(index);
          const errs = rowErrors[index] ?? [];
          return (
            <li key={row.id} style={S.row}>
              <div style={S.badge}>{index + 1}</div>
              <div style={S.fields}>
                <input
                  style={S.input}
                  placeholder="Vimeo link or ID"
                  value={row.link}
                  onChange={(e) => updateField(index, "link", e.target.value)}
                />
                <input
                  style={S.input}
                  placeholder="Client (e.g. Heineken)"
                  value={row.client}
                  onChange={(e) => updateField(index, "client", e.target.value)}
                />
                <input
                  style={S.input}
                  placeholder="Title (optional)"
                  value={row.title}
                  onChange={(e) => updateField(index, "title", e.target.value)}
                />
                <span style={S.hint}>
                  #{index + 1} → {slot.kind === "featured"
                    ? "featured full-width row"
                    : `paired row, ${slot.kind}`}
                </span>
                {errs.map((msg) => (
                  <span key={msg} style={S.error}>
                    {msg}
                  </span>
                ))}
              </div>
              <div style={S.actions}>
                <button
                  style={S.iconBtn}
                  onClick={() => moveVideo(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  style={S.iconBtn}
                  onClick={() => moveVideo(index, 1)}
                  disabled={index === drafts.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  style={S.deleteBtn}
                  onClick={() => removeVideo(index)}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div style={S.footer}>
        <button style={S.addBtn} onClick={addVideo}>
          + Add video
        </button>
        <div style={S.saveArea}>
          {saved && <span style={S.savedMsg}>Saved — the site is updated.</span>}
          <button style={S.saveBtn} onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "48px 20px 120px", color: "#eee", fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh" },
  header: { marginBottom: 28 },
  h1: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" },
  sub: { fontSize: 13, color: "#888", marginTop: 6 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", gap: 12, alignItems: "flex-start", background: "#141414", border: "1px solid #262626", borderRadius: 8, padding: 12 },
  badge: { flex: "0 0 28px", height: 28, borderRadius: 14, background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  fields: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  input: { background: "#0c0c0c", border: "1px solid #333", borderRadius: 5, color: "#eee", padding: "8px 10px", fontSize: 13 },
  hint: { fontSize: 11, color: "#666" },
  error: { fontSize: 12, color: "#ff6b6b" },
  actions: { display: "flex", flexDirection: "column", gap: 4 },
  iconBtn: { width: 30, height: 26, background: "#222", border: "1px solid #333", borderRadius: 5, color: "#ccc", cursor: "pointer", fontSize: 13 },
  deleteBtn: { width: 30, height: 26, background: "#2a1414", border: "1px solid #4a1f1f", borderRadius: 5, color: "#ff6b6b", cursor: "pointer", fontSize: 13 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 16 },
  addBtn: { background: "#1a1a1a", border: "1px dashed #444", borderRadius: 6, color: "#ccc", padding: "10px 16px", fontSize: 13, cursor: "pointer" },
  saveArea: { display: "flex", alignItems: "center", gap: 12 },
  savedMsg: { fontSize: 12, color: "#5ec98a" },
  saveBtn: { background: "#eee", border: "none", borderRadius: 6, color: "#111", padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
};
```

- [ ] **Step 3: Create the admin page**

Create `app/admin/page.tsx`:

```tsx
import { getVideos } from "@/lib/videos";
import AdminEditor from "@/app/components/AdminEditor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const videos = await getVideos();
  return <AdminEditor initialVideos={videos} />;
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: compiles with no type errors.

- [ ] **Step 5: Verify the admin UI**

Run: `npm run dev`. Log in at `http://localhost:3000/admin/login` with `devpassword` (from `.env.local`), landing on `/admin`. Confirm:
- 12 numbered rows, each pre-filled with a Vimeo ID, client, and title; row 7 (L'Occitane) has an empty title.
- Each row shows a hint like `#1 → featured full-width row`, `#2 → paired row, left`, `#3 → paired row, right`, `#6 → featured full-width row`.
- **Add video** appends row 13 with empty fields and the hint `#13 → featured full-width row` (it wraps back to slot 1).
- ↑ / ↓ swap adjacent rows and the numbers + hints update; ↑ is disabled on row 1, ↓ on the last row.
- ✕ asks for confirmation, then removes the row; the rows below renumber with no gap.
- Clear a row's Vimeo link and click **Save** → that row shows "Enter a valid Vimeo link or numeric ID." and nothing is saved.

Note: a *successful* Save writes to Vercel Blob, which is not configured locally yet — that path is verified in T6. Here, only confirm the validation-rejection path.

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/admin/actions.ts app/components/AdminEditor.tsx
git commit -m "feat: add admin dashboard for managing videos"
```

---

## Task T6: Integration, deploy & verification

**Wave C — final. Depends on: T0–T5 all merged.**

Wire Vercel Blob, set production env vars, and verify the whole feature end-to-end.

**Files:**
- Modify: `.env.local` (local only — not committed)
- Vercel dashboard configuration (no repo files)

- [ ] **Step 1: Confirm the integrated build is green**

With all of T0–T5 merged, run:

```bash
npm run lint
npm run build
npm test
```

Expected: lint clean; build compiles; all unit tests pass (28 tests across the three `lib/*.test.ts` files).

- [ ] **Step 2: USER ACTION — create the Vercel Blob store**

In the Vercel dashboard: open the project → **Storage** → **Create Database** → **Blob** → connect it to this project. Vercel automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable to the project (all environments).

- [ ] **Step 3: USER ACTION — set the admin password in Vercel**

In the Vercel dashboard: project → **Settings** → **Environment Variables** → add `ADMIN_PASSWORD` with a strong value, for all environments (Production, Preview, Development).

- [ ] **Step 4: Pull the env vars locally**

Run: `vercel env pull .env.local`
Expected: `.env.local` now contains both `BLOB_READ_WRITE_TOKEN` and `ADMIN_PASSWORD`. (If the Vercel CLI is not set up, instead copy `BLOB_READ_WRITE_TOKEN` from the dashboard into `.env.local` manually, keeping `ADMIN_PASSWORD` set.)

- [ ] **Step 5: Verify the full save cycle locally**

Run: `npm run dev`. Log in to `/admin`. The list shows the 12 seed videos (Blob is still empty, so `getVideos()` falls back to the seed). Click **Save**:
- "Saved — the site is updated." appears. This first save writes `videos.json` into Blob — the list is now seeded.
- Open `http://localhost:3000` → the homepage still shows the same 12 videos.

- [ ] **Step 6: Verify add / edit / delete / reorder end-to-end**

In `/admin`:
1. **Add** a real 13th Vimeo video (link + client), Save → open `/` → it appears as a 13th tile, reusing slot 1's shape (a new featured full-width row), and as a 13th mobile card at the featured 16:9 aspect.
2. **Edit** a client name, Save → the new label shows on `/`.
3. **Delete** video #4, Save → the homepage now has one fewer tile and everything after #4 shifted up with no gap. Note that this shifts which videos land in the two featured slots (1 and 6) — that is expected; the blueprint is shape, not identity.
4. **Reorder** with ↑/↓, Save → the homepage order matches. Reordering a video into/out of a featured slot changes its rendered shape accordingly.
5. Confirm none of these triggered a Vercel deployment (the dashboard's Deployments list is unchanged).

- [ ] **Step 7: Verify the lone-left desktop behavior**

If you delete videos until the list ends on a `left`-kind slot (e.g. delete the last video so the list ends at slot 11 / Diesel), load `/` on a wide screen: the final desktop row has a single tile on the left in its designed shape and empty space on the right. This is the intended behavior.

- [ ] **Step 8: Deploy and verify in production**

Push the branch and let Vercel deploy (or merge to `main`). On the production URL:
- The homepage renders the videos from Blob.
- `/admin` requires the password; a wrong password is rejected.
- A save in the production admin updates the live site within a few seconds, with no deployment.

- [ ] **Step 9: Final commit (if any local files changed)**

No repository files should need changing in this task. If `.gitignore` or docs were touched, commit them:

```bash
git add -A
git commit -m "chore: finalize video admin integration"
```

`.env.local` must NOT be committed — confirm `git status` does not list it.

---

## Notes

- **No deploys on content change.** `saveVideos()` writes to Blob and `revalidatePath("/")` refreshes the cached homepage in place. Deploys happen only for code pushes.
- **Blob CDN caching.** `getVideos()` fetches the blob with `cache: "no-store"` and a `?t=` cache-buster so a save is reflected immediately.
- **Local dev without Blob.** With no `BLOB_READ_WRITE_TOKEN`, `getVideos()` returns `SEED_VIDEOS` and the public site works; only `saveVideos()` needs the token.
- **No `next.config.ts` change** — thumbnails use a plain `<img>` (already lint-exempt), so no `next/image` domain config is needed.
- The per-video local fallback images under `public/images/` (e.g. `Heinken.png`) become unreferenced after T4. Leaving them is harmless; do **not** delete `Contact portrait.png`, which the contact section still uses.

## Spec Coverage

Every requirement in `docs/superpowers/specs/2026-05-21-video-admin-design.md` maps to a task: the 12-slot blueprint with `featured`/`left`/`right` kinds and `(N-1) mod 12` mapping → T1; variable count + lone-left rule → T1 (`layoutRows`) + T4; the no-gaps rule → T2 (`prepareVideos`); Vercel Blob `videos.json` + the `Video` type → T2; the data-driven public site (including the `.row.is-full` featured rows) → T4; the admin (3 fields, add/edit/delete/reorder, live hint, validated Save + revalidate) → T5; password auth → T3; the 3-phase build order → the wave structure; verification → each task's verify steps + T6.
