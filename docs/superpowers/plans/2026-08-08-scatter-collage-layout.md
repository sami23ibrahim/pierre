# Scatter-Collage Layout + Curated Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 12-slot collage blueprint with the 7-slot scatter unit measured from `docs/reference/newlayout.jpeg`, and stage the curated 18-video order for a safe local preview (production Blob untouched until ship).

**Architecture:** `lib/layout.ts` keeps its "position determines shape" model but the cycle becomes 7 slots rendered inside ONE absolutely-positioned unit canvas (aspect 1280/1984 ≈ 0.645 — the reference composition scaled to full bleed, since the image shows card shapes, not page margins) per 7 videos — units replace featured/paired rows because the reference's left/right columns interleave vertically. Consumers (`Portfolio.tsx` desktop render, `AdminEditor.tsx` grouping, reveal CSS) switch from rows to units. The curated list ships as `data/videos-new.json`, previewed via a `VIDEOS_FILE` env override in `getVideos()`.

**Tech Stack:** Next.js 15 App Router, vitest, Vercel Blob (`@vercel/blob`), plain CSS in `app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-08-08-scatter-collage-layout-design.md` — geometry table, curated list with Vimeo IDs, ship/rollback procedure.

**Branch:** all work on `new-layout`. Do NOT push `main`. Do NOT write to Blob (no admin Save, no `restore-videos.mjs`) until the ship step, which needs Sami's explicit go.

---

### Task 1: Swap the blueprint (layout lib + tests + both consumers + reveal CSS)

One atomic task: the lib API changes (`layoutRows` → `layoutUnits`) and both consumers must move together or the build breaks. Commit only at the end when tests AND build are green.

**Files:**
- Modify: `lib/layout.test.ts` (full rewrite)
- Modify: `lib/layout.ts` (full rewrite)
- Modify: `app/components/Portfolio.tsx:6,115-150`
- Modify: `app/components/AdminEditor.tsx:4,74-76,101-111,247-249`
- Modify: `app/globals.css:121-129,461-472`

- [ ] **Step 1: Rewrite the layout tests for the 7-slot unit model**

Replace the entire contents of `lib/layout.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { LAYOUT, slotForIndex, layoutUnits, unitAspect } from "./layout";

describe("LAYOUT", () => {
  it("has 7 slots (one scatter unit)", () => {
    expect(LAYOUT).toHaveLength(7);
  });

  it("slot 0 is the featured card; the rest alternate left/right", () => {
    expect(LAYOUT.map((s) => s.kind)).toEqual([
      "featured", "left", "right", "left", "right", "left", "right",
    ]);
  });
});

describe("slotForIndex", () => {
  it("maps indexes 0-6 to slots 0-6", () => {
    expect(slotForIndex(4)).toBe(LAYOUT[4]);
  });

  it("wraps every 7 — video 8 (index 7) reuses slot 0 (featured)", () => {
    expect(slotForIndex(7)).toBe(LAYOUT[0]);
    expect(slotForIndex(7).kind).toBe("featured");
  });

  it("puts videos 1, 8 and 15 (indexes 0, 7, 14) on featured slots", () => {
    for (const index of [0, 7, 14]) {
      expect(slotForIndex(index).kind).toBe("featured");
    }
  });
});

describe("layoutUnits", () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ label: `v${i}` }));

  it("returns no units for an empty list", () => {
    expect(layoutUnits([])).toEqual([]);
  });

  it("puts fewer than 7 items in a single partial unit", () => {
    expect(layoutUnits(items(3))).toEqual([items(3)]);
  });

  it("chunks exactly 7 items into one full unit", () => {
    expect(layoutUnits(items(7))).toEqual([items(7)]);
  });

  it("chunks 18 items into 7 + 7 + 4, preserving order", () => {
    const units = layoutUnits(items(18));
    expect(units.map((u) => u.length)).toEqual([7, 7, 4]);
    expect(units[2][0]).toEqual({ label: "v14" });
  });
});

describe("unitAspect", () => {
  const FULL = 1280 / 1984; // full-bleed unit canvas, ≈ 0.645

  it("matches the full unit canvas for a full unit", () => {
    expect(unitAspect(7)).toBeCloseTo(FULL, 5);
  });

  it("trims a 4-card trailing unit to ~74% height", () => {
    // deepest of slots 0-3 is slot 3: bottom 70.13% + 4% pad
    expect(unitAspect(4)).toBeCloseTo(FULL / 0.7413, 3);
  });

  it("trims a 1-card unit to the featured card's band", () => {
    // slot 0 bottom 28.87% + 4% pad
    expect(unitAspect(1)).toBeCloseTo(FULL / 0.3287, 3);
  });

  it("clamps out-of-range counts instead of failing", () => {
    expect(unitAspect(0)).toBeCloseTo(unitAspect(1), 5);
    expect(unitAspect(99)).toBeCloseTo(FULL, 5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/layout.test.ts`
Expected: FAIL — `layoutUnits`/`unitAspect` are not exported; LAYOUT length is 12.

- [ ] **Step 3: Rewrite `lib/layout.ts` with the measured 7-slot unit**

Replace the entire contents of `lib/layout.ts` with:

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

/**
 * The 7-slot scatter unit. Card shapes, relative sizes and stagger are
 * measured programmatically from docs/reference/newlayout.jpeg; the whole
 * composition is then scaled uniformly (x1.2402) to full bleed — the image
 * shows the card shapes, not page margins — so the deepest cards sit on the
 * site's usual 1.65% side margins and the featured card stays centered.
 * Unit canvas: 1280x1984 (aspect ~0.645). Video N renders in slot
 * (N-1) mod 7, so the unit repeats every 7 videos — featured cards land on
 * videos 1, 8, 15, …
 *
 * All percentages are relative to the unit canvas. Slots 2 and 3 interleave
 * vertically across the left/right columns (slot 3 starts above slot 2's
 * bottom edge), which is why a unit renders as one positioning canvas
 * rather than stacked rows. Labels sit 0.75% below their card, aligned to
 * its left edge. This is design, not content — it stays in code.
 */
export const LAYOUT: Slot[] = [
  { kind: "featured", desktop: { media: { left: "13.57%", top: "5.50%",  width: "72.86%", height: "23.37%" }, label: { left: "13.57%", top: "29.62%", width: "72.86%" } }, mobile: { aspectRatio: "2.011" } },
  { kind: "left",     desktop: { media: { left: "5.72%",  top: "30.50%", width: "33.33%", height: "16.13%" }, label: { left: "5.72%",  top: "47.38%", width: "33.33%" } }, mobile: { aspectRatio: "1.333" } },
  { kind: "right",    desktop: { media: { left: "45.06%", top: "29.62%", width: "45.93%", height: "23.75%" }, label: { left: "45.06%", top: "54.12%", width: "45.93%" } }, mobile: { aspectRatio: "1.247" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "50.00%", width: "41.27%", height: "20.13%" }, label: { left: "1.65%",  top: "70.88%", width: "41.27%" } }, mobile: { aspectRatio: "1.323" } },
  { kind: "right",    desktop: { media: { left: "45.06%", top: "54.38%", width: "53.29%", height: "19.12%" }, label: { left: "45.06%", top: "74.25%", width: "53.29%" } }, mobile: { aspectRatio: "1.797" } },
  { kind: "left",     desktop: { media: { left: "1.65%",  top: "75.25%", width: "58.13%", height: "22.75%" }, label: { left: "1.65%",  top: "98.75%", width: "58.13%" } }, mobile: { aspectRatio: "1.648" } },
  { kind: "right",    desktop: { media: { left: "62.30%", top: "78.25%", width: "33.33%", height: "16.13%" }, label: { left: "62.30%", top: "95.13%", width: "33.33%" } }, mobile: { aspectRatio: "1.333" } },
];

/** The slot a video at the given 0-based index renders in. Wraps every 7. */
export function slotForIndex(index: number): Slot {
  const len = LAYOUT.length;
  return LAYOUT[((index % len) + len) % len];
}

/** Chunk videos into scatter units of up to 7; the last unit may be partial. */
export function layoutUnits<T>(items: T[]): T[][] {
  const units: T[][] = [];
  for (let i = 0; i < items.length; i += LAYOUT.length) {
    units.push(items.slice(i, i + LAYOUT.length));
  }
  return units;
}

/** Full-unit canvas aspect (width / height): the reference composition scaled
 * to full bleed — 1280 / 1984. */
const UNIT_ASPECT = 1280 / 1984;
/** Breathing room below the deepest card of a partial unit (unit-height fraction). */
const BOTTOM_PAD = 0.04;

/**
 * Rendered aspect ratio for a unit holding `count` cards. A full unit uses
 * the whole canvas; a partial trailing unit shrinks so the page doesn't end
 * on dead whitespace: height stops at the deepest present card plus label
 * padding.
 */
export function unitAspect(count: number): number {
  const n = Math.max(1, Math.min(count, LAYOUT.length));
  let maxBottom = 0;
  for (const slot of LAYOUT.slice(0, n)) {
    const bottom =
      (parseFloat(slot.desktop.media.top) + parseFloat(slot.desktop.media.height)) / 100;
    if (bottom > maxBottom) maxBottom = bottom;
  }
  return UNIT_ASPECT / Math.min(1, maxBottom + BOTTOM_PAD);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/layout.test.ts`
Expected: PASS (all 4 describes green). `lib/videos.test.ts` and `lib/auth.test.ts` stay green; the app does NOT compile yet (consumers still import `layoutRows`) — that's the next steps.

- [ ] **Step 5: Update the desktop render in `app/components/Portfolio.tsx`**

Change the import on line 6:

```tsx
import { slotForIndex, layoutUnits, unitAspect } from "@/lib/layout";
```

Replace the `<section id="work">…</section>` block (lines 115–150, the IIFE over `layoutRows`) with:

```tsx
          <section id="work">
            {(() => {
              const units = layoutUnits(videos);
              let videoIndex = 0;
              return units.map((unit, unitIndex) => (
                <div
                  className="row"
                  style={{ aspectRatio: String(unitAspect(unit.length)) }}
                  key={unitIndex}
                >
                  {unit.map((v) => {
                    const slot = slotForIndex(videoIndex);
                    videoIndex += 1;
                    const caption = captionFor(v);
                    const reveal =
                      slot.kind === "featured"
                        ? "reveal-rise"
                        : slot.kind === "left"
                          ? "reveal-left"
                          : "reveal-right";
                    return (
                      <Fragment key={v.id}>
                        <button
                          type="button"
                          className={`tile-media is-video ${reveal}`}
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
              ));
            })()}
          </section>
```

The mobile section (`videos.map` with `slot.mobile.aspectRatio`) is untouched.

- [ ] **Step 6: Update `app/components/AdminEditor.tsx` grouping**

Change the import on line 4:

```tsx
import { layoutUnits, slotForIndex } from "@/lib/layout";
```

Replace lines 74–76:

```tsx
  const units = layoutUnits<Indexed>(
    drafts.map((draft, index) => ({ draft, index })),
  );
```

In the JSX (around lines 101–111), replace the rows loop header — from `{rows.map((row, rowIdx) => (` through `{row.items.map(({ draft, index }) => {` and the two lines after it — so the block reads:

```tsx
      <div style={S.rows}>
        {units.map((unit, unitIdx) => (
          <div key={unitIdx} style={S.unitRow}>
            {unit.map(({ draft, index }) => {
              const errs = rowErrors[index] ?? [];
              const isLast = index === drafts.length - 1;
              const featured = slotForIndex(index).kind === "featured";
              return (
                <article
                  key={draft.id}
                  style={featured ? { ...S.card, gridColumn: "1 / -1" } : S.card}
                >
```

(The rest of the `<article>` body is unchanged; the closing braces `})}` / `</div>` / `))}` already match.)

In the `S` style object (lines 247–249), replace `featuredRow` and `pairedRow` with a single style:

```tsx
  rows: { display: "flex", flexDirection: "column", gap: 12 },
  unitRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
```

- [ ] **Step 7: Update `app/globals.css` — row aspect + reveal classes**

Replace lines 121–129 (`.layout-desktop .row` and `.layout-desktop .row.is-full`):

```css
.layout-desktop .row {
  position: relative;
  width: 100%;
  /* aspect-ratio is set inline per unit: ~0.645 full, shorter for a trailing partial unit */
  container-type: inline-size;
}
```

In the SCROLL REVEAL block, replace the desktop nth-child rules (lines 463–472, from `.layout-desktop .row > .tile-media:nth-child(1),` through the `.row.is-full` line) with:

```css
  .layout-desktop .row > .tile-media.reveal-left,
  .layout-desktop .row > .tile-media.reveal-right,
  .layout-desktop .row > .tile-media.reveal-rise {
    opacity: 0;
    transition: opacity .9s ease, transform 1s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform, opacity;
  }
  .layout-desktop .row > .tile-media.reveal-left { transform: translateX(-80px); }
  .layout-desktop .row > .tile-media.reveal-right { transform: translateX(80px); }
  /* Featured tile rises from below instead of sliding sideways. */
  .layout-desktop .row > .tile-media.reveal-rise { transform: translateY(60px); }
```

Leave `.tile-media.is-visible`, the mobile rules, and the label rules exactly as they are.

- [ ] **Step 8: Verify the whole suite and the build**

Run: `npm test`
Expected: PASS — layout, videos, auth suites all green.

Run: `npm run build`
Expected: compiles with no type errors (this catches any leftover `layoutRows`/`is-full` references).

- [ ] **Step 9: Commit**

```bash
git add lib/layout.ts lib/layout.test.ts app/components/Portfolio.tsx app/components/AdminEditor.tsx app/globals.css
git commit -m "feat: swap 12-slot blueprint for 7-slot scatter unit from newlayout reference"
```

---

### Task 2: `VIDEOS_FILE` override for safe local preview

**Files:**
- Modify: `lib/videos.ts:82-94` (`getVideos`)
- Test: `lib/videos.test.ts` (append a describe block)

- [ ] **Step 1: Write the failing tests**

Append to `lib/videos.test.ts` (top of file gains two imports):

```ts
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
```

…and at the bottom:

```ts
describe("getVideos with VIDEOS_FILE override", () => {
  const fixture = join(tmpdir(), "pierre-videos-fixture.json");

  afterEach(() => {
    delete process.env.VIDEOS_FILE;
    try { unlinkSync(fixture); } catch {}
  });

  it("reads the list from the file instead of Blob", async () => {
    const list = [{ id: "t-1", vimeoId: "123", client: "Acme", title: "" }];
    writeFileSync(fixture, JSON.stringify(list));
    process.env.VIDEOS_FILE = fixture;
    expect(await getVideos()).toEqual(list);
  });

  it("falls back to the normal path when the file is missing", async () => {
    process.env.VIDEOS_FILE = join(tmpdir(), "does-not-exist.json");
    // No Blob credentials in tests, so the normal path resolves to the seeds.
    expect(await getVideos()).toEqual(SEED_VIDEOS);
  });
});
```

Extend the existing import from `./videos` to include `getVideos` and `SEED_VIDEOS`, and the vitest import to include `afterEach`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { parseVimeoId, prepareVideos, getVideos, SEED_VIDEOS, type DraftVideo } from "./videos";
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx vitest run lib/videos.test.ts`
Expected: the first new test FAILS (override not implemented, falls back to seeds); the second may already pass — that's fine.

- [ ] **Step 3: Implement the override in `getVideos`**

In `lib/videos.ts`, add to the top imports:

```ts
import { readFileSync } from "node:fs";
```

Replace `getVideos` with:

```ts
/** Read the video list from Blob. Falls back to SEED_VIDEOS on any failure.
 * Dev override: if VIDEOS_FILE is set, read that local JSON file instead —
 * lets the new-layout branch preview a different list without touching the
 * shared production Blob. Never set VIDEOS_FILE in production. */
export async function getVideos(): Promise<Video[]> {
  if (process.env.VIDEOS_FILE) {
    try {
      const data = JSON.parse(readFileSync(process.env.VIDEOS_FILE, "utf8"));
      if (Array.isArray(data) && data.length > 0) return data as Video[];
    } catch {
      // unreadable override — fall through to the normal path
    }
  }
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/videos.test.ts`
Expected: PASS, including both new tests.

- [ ] **Step 5: Commit**

```bash
git add lib/videos.ts lib/videos.test.ts
git commit -m "feat: VIDEOS_FILE override in getVideos for safe local preview"
```

---

### Task 3: Curated list file + local preview

**Files:**
- Create: `data/videos-new.json`
- Modify: `.env.local` (NOT committed — it is already untracked)

- [ ] **Step 1: Create `data/videos-new.json`**

17 entries — CST (position 11, id `n-7`) is pending; when its Vimeo link arrives, insert `{ "id": "n-7", "vimeoId": "<ID>", "client": "CST", "title": "The Hand" }` between Heineken and Jeep. Wording follows Sami's list verbatim (see spec §3 for the flagged divergences).

```json
[
  { "id": "n-1",     "vimeoId": "1025249190", "client": "Visa",           "title": "Never Walk Alone" },
  { "id": "seed-11", "vimeoId": "316674560",  "client": "Diesel",         "title": "Be A Follower" },
  { "id": "n-2",     "vimeoId": "692524648",  "client": "Kärcher",        "title": "Like Nothing Happened" },
  { "id": "seed-7",  "vimeoId": "898044833",  "client": "L'Occitane",     "title": "" },
  { "id": "seed-3",  "vimeoId": "1131470962", "client": "Diriyah FC",     "title": "Underdogs" },
  { "id": "seed-10", "vimeoId": "573367624",  "client": "Rolling Stones", "title": "Rockin' Mamas" },
  { "id": "n-3",     "vimeoId": "212541794",  "client": "Danone",         "title": "Fifty Years Of Motherhood" },
  { "id": "seed-6",  "vimeoId": "121774920",  "client": "Du",             "title": "Too Distressing" },
  { "id": "n-4",     "vimeoId": "121786400",  "client": "Du",             "title": "Too Informative" },
  { "id": "seed-2",  "vimeoId": "803985634",  "client": "Heineken",       "title": "The Cleaners" },
  { "id": "seed-9",  "vimeoId": "695205162",  "client": "Jeep",           "title": "Rewild Yourself" },
  { "id": "n-5",     "vimeoId": "648106703",  "client": "Lavazza",        "title": "Alexa" },
  { "id": "seed-5",  "vimeoId": "216957056",  "client": "Du",             "title": "The Man Sitting Next To You" },
  { "id": "seed-1",  "vimeoId": "291694491",  "client": "Toyota",         "title": "If" },
  { "id": "seed-8",  "vimeoId": "682546048",  "client": "Molto Fino",     "title": "Feeds A Town" },
  { "id": "seed-12", "vimeoId": "223460819",  "client": "Fisher",         "title": "The Naked Truth" },
  { "id": "n-6",     "vimeoId": "194804690",  "client": "Center Point",   "title": "The Piano" }
]
```

Carried-over videos keep their existing `seed-*` ids (stable keys); new videos use `n-*`.

- [ ] **Step 2: Enable the preview locally**

Append to `.env.local` (do not commit):

```
VIDEOS_FILE=data/videos-new.json
```

Restart the dev server (`npm run dev`) so Next picks up the env change.

- [ ] **Step 3: Verify the preview renders the curated order**

Run: `curl -s http://localhost:3000 | grep -c tile-media`
Expected: `34` (17 videos × desktop + mobile).

Open http://localhost:3000 — first card must be Visa (featured, centered), Du — Too Distressing featured mid-page; with 17 entries the third featured is Molto Fino (Toyota once CST lands). Production is untouched throughout (verify: pierre-sable.vercel.app still shows the old order).

- [ ] **Step 4: Commit**

```bash
git add data/videos-new.json
git commit -m "feat: curated video order (17 of 18 — CST pending) as local preview list"
```

---

### Task 4: Full verification against the reference

No new code — evidence gathering before Sami reviews.

- [ ] **Step 1: Suite + build**

Run: `npm test` → all green. Run: `npm run build` → no errors.

- [ ] **Step 2: Visual comparison, desktop**

With the dev server running and `VIDEOS_FILE` set, screenshot http://localhost:3000 at ~1280 px width (browser tools or manual) and compare against `docs/reference/newlayout.jpeg` — same composition, but scaled to full bleed (the reference's outer margins are NOT reproduced): centered 2:1 featured card up top at ~73% width; small-left/tall-right band; the tall right card's bottom edge reaching below the next left card's top (interleave); big-left/small-right final band with the deepest cards touching the normal 1.65% side margins like today's grid; ragged left/right edges otherwise; labels under every card.

- [ ] **Step 3: Interactions and mobile**

Click a few tiles (modal opens with the right video, incl. a NEW one, e.g. Visa 1025249190); narrow the window (or device emulation) — mobile stack shows all 17 in order with varied aspect ratios; scroll-reveal animations fire (featured rises, lefts slide in from the left, rights from the right).

- [ ] **Step 4: Admin sanity (do NOT press Save)**

Open http://localhost:3000/admin (password in `.env.local`): cards grouped 7 per unit box, featured entries full-width. NOTE: the admin edits the LIVE Blob list (it does not read `VIDEOS_FILE`), so look, don't Save.

- [ ] **Step 5: Report to Sami**

Show desktop + mobile screenshots next to the reference. Ship and rollback are deliberately NOT part of this plan — see spec §4; both require Sami's explicit go (ship = merge to `main` + push + upload `data/videos-new.json` to Blob; rollback = restore `docs/backups/2026-08-08-videos.json`).
