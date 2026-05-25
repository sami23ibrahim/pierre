# Data-driven Portfolio + Video Admin — Design

**Date:** 2026-05-21
**Status:** Approved design, ready for implementation planning

## Goal

Let the site owner add, edit, remove, and reorder portfolio videos through an
admin dashboard — without touching code. Today every video is hand-coded JSX;
after this work the video list is data, and the public site renders from it.

## Background — current state

- `app/components/Portfolio.tsx` — all 12 videos are hand-written JSX, each tile
  written **twice**: once for the desktop collage (absolute `left/top/width/height`
  percentages inside a `.row`) and once for the mobile list (a per-tile
  `aspectRatio`). Two of the rows are **featured full-width** (`.row.is-full`)
  with a single tile; the rest are two-tile paired rows.
- `app/page.tsx` — a 12-item `VIDEO_IDS` array, used only to pre-fetch Vimeo
  thumbnails via the oembed API.
- The site is effectively static. Thumbnails come free from Vimeo given a video
  ID; no image uploads are involved.
- Deployed on Vercel (Next.js 15, App Router, React 19, TypeScript).

## Core concept — the 12-slot blueprint

The 12 current tile shapes become a fixed **layout blueprint of 12 slots**. This
is *design*, not content (Pierre's hand-tuned arrangement), so it stays in code.

- **Video N renders in slot `(N − 1) mod 12`.** The collage repeats every 12
  videos: video 13 reuses slot 1's shape, video 14 reuses slot 2's, and so on.
- Each slot has a **kind**:
  - `featured` — a full-width row containing only this video (`.row.is-full`).
    Slots 1 and 6 are featured.
  - `left` / `right` — half of a two-tile paired row. A `left` slot is always
    immediately followed by a `right` slot in the blueprint, so they always
    share a row.
- Each slot carries **both** a desktop shape and a mobile aspect ratio, so the
  mobile list is also a 12-card blueprint (cards stay individually sized; card
  13 reuses card 1's aspect ratio). On mobile, featured cards render as a
  single widescreen tile, same as a regular tile but at a 16:9 aspect.

### Slot data

`lib/layout.ts` exports `LAYOUT`, an array of 12 slots extracted **verbatim**
from today's `Portfolio.tsx` so the site stays pixel-identical.

Each slot:

```ts
type Slot = {
  kind: "featured" | "left" | "right";
  desktop: {
    media: { left: string; top: string; width: string; height: string };
    label: { left: string; top: string; width: string };
  };
  mobile: { aspectRatio: string };
};
```

Desktop values (percentages, as in current JSX). Paired rows have
`aspect-ratio: 1337.5 / 720`. Featured rows use the same row aspect ratio
(via `.row.is-full`) so the visual rhythm is preserved.

| Slot | Kind     | media L/T/W/H                 | label L/T/W           | mobile AR |
|------|----------|-------------------------------|-----------------------|-----------|
| 1    | featured | 1.65 / 2.22 / 96.7 / 88       | 1.65 / 92 / 96.7      | 1.778 |
| 2    | left     | 1.65 / 30.97 / 62.35 / 57.50  | 1.87 / 89.86 / 62.35  | 2.014 |
| 3    | right    | 66.39 / 2.22 / 33.50 / 89.03  | 66.39 / 92.64 / 33.50 | 0.699 |
| 4    | left     | 1.65 / 2.22 / 39.63 / 58.89   | 1.65 / 62.64 / 39.63  | 1.250 |
| 5    | right    | 43.14 / 7.36 / 56.82 / 84.44  | 43.14 / 92.22 / 56.82 | 1.250 |
| 6    | featured | 1.65 / 2.22 / 96.7 / 88       | 1.65 / 92 / 96.7      | 1.778 |
| 7    | left     | 1.65 / 2.22 / 33.36 / 89.03   | 1.65 / 92.64 / 33.36  | 0.695 |
| 8    | right    | 36.49 / 28.06 / 63.55 / 63.33 | 36.49 / 92.64 / 63.55 | 1.865 |
| 9    | left     | 2.17 / 5.69 / 56.82 / 63.75   | 2.17 / 70.83 / 56.82  | 1.655 |
| 10   | right    | 61.23 / 39.86 / 38.66 / 47.22 | 61.23 / 88.47 / 38.66 | 1.519 |
| 11   | left     | 2.17 / 17.08 / 63.55 / 63.33  | 2.17 / 81.81 / 63.55  | 1.865 |
| 12   | right    | 67.81 / 2.22 / 32.09 / 89.03  | 67.81 / 92.64 / 32.09 | 0.670 |

Row layout: a slot of kind `featured` is its own full-width row. Consecutive
`left`+`right` slots share a paired row. So in the seed blueprint:
row 1 = slot 1 (featured), row 2 = slots 2+3, row 3 = slots 4+5,
row 4 = slot 6 (featured), row 5 = slots 7+8, row 6 = slots 9+10,
row 7 = slots 11+12. Wrapping past 12 starts again at slot 1 (featured).

## Variable video count

The blueprint has 12 slots, but the live list may hold any number — 6, 7, 15…
Slots are filled **in order, only as many as there are videos**.

- **Mobile** — a single vertical column; any count works directly. Featured-kind
  slots render at a 16:9 aspect; paired-kind slots use their hand-tuned aspect.
- **Desktop** — rows are built by walking the slot sequence:
  - A `featured` slot is always its own full-width row.
  - A `left` slot pairs with the immediately following `right` slot to form a
    two-tile row.
  - If the list ends on a `left` slot (the next slot in the blueprint would be
    `right`), that final row holds the single left tile in its designed shape
    and the right half of the row is empty space. **Decision: leave it left,
    empty right** — keep the tile's designed proportions, no special centering.
- Fewer than 12 videos → only the needed rows render. More than 12 → rows keep
  cycling through the blueprint, so video 13 reuses slot 1 (a new featured row).

## No-gaps rule

The video list is one ordered array, so it cannot contain holes — deleting
video 4 immediately shifts 5-6-7 up to 4-5-6, and numbering is always a
contiguous `1..N`.

The only way a blank card could appear is an entry saved with an empty Vimeo
link. Therefore: **the admin blocks Save if any entry has an empty or
unparseable Vimeo link.** Client name and title remain optional (e.g.
L'Occitane has no title). This guarantees no empty card anywhere — middle or
end.

## Content storage — Vercel Blob

The video list lives in a single Vercel Blob file, `videos.json`:

```json
[
  { "id": "v1", "vimeoId": "291694491",  "client": "Toyota",     "title": "If" },
  { "id": "v2", "vimeoId": "803985634",  "client": "Heineken",   "title": "The Cleaners" }
]
```

- Array order **is** the 1-2-3 numbering.
- `id` — a stable random key, generated once when an entry is created; used as
  the React key so edits/reorders stay stable. It is not the slot number.
- `vimeoId` — numeric Vimeo ID (required).
- `client` — required text. `title` — optional text (may be `""`).
- Thumbnails are **not** stored; they are fetched from Vimeo by ID at render
  time, as today.

`lib/videos.ts` exposes:
- `getVideos(): Promise<Video[]>` — reads `videos.json` from Blob.
- `saveVideos(list: Video[]): Promise<void>` — overwrites `videos.json`.

## Public site

- `app/page.tsx` (server component): `getVideos()` → fetch each video's Vimeo
  thumbnail via the existing oembed call (24h `revalidate`) → pass the combined
  list to `Portfolio`.
- `app/components/Portfolio.tsx`: the two hand-written blocks become two
  `.map()`s — desktop walks the list through a `layoutRows()` helper that
  groups consecutive `left`+`right` slots into paired rows and gives each
  `featured` slot its own full-width row; mobile renders a flat list — each
  video `i` paired with `LAYOUT[i mod 12]`. Existing behavior (modal,
  scroll-spy nav, intersection-observer animations, mobile nav hide/reveal)
  is unchanged.
- `alt` text and play-button `aria-label` are derived as
  `client` + `" — "` + `title` (or just `client` when there is no title).
- Per-video local fallback images (`/images/Heinken.png`, etc.) are dropped —
  new videos have no local fallback. If a Vimeo thumbnail fails to load the
  tile shows its existing dark background (`#0a0a0a`).

## Admin

Route: `app/admin`.

- **Auth** — a single password in the `ADMIN_PASSWORD` env var. A login form
  sets a signed, httpOnly cookie; `middleware.ts` guards all `/admin` routes.
  Sufficient for a single owner.
- **UI** — a numbered list, **1, 2, 3 …**, each entry showing three fields —
  `Vimeo link`, `Client`, `Title` — plus **↑ / ↓** reorder buttons and a
  **Delete** button (with a confirm step). An **"Add video"** button appends a
  new empty entry at the next number. A **Save** button writes the whole list.
- The `Vimeo link` field accepts either a full Vimeo URL or a bare numeric ID;
  the numeric ID is extracted on save.
- A small live hint per entry, e.g. *"#11 → row 6, left"*, so the owner sees
  where each number lands in the collage.
- **Save** runs a server action: validate (every entry has a parseable Vimeo
  link) → `saveVideos()` → `revalidatePath("/")` so the public site updates
  immediately. If validation fails, Save is blocked and the offending entries
  are flagged.

## Build order

Each phase leaves the site fully working and deployable.

1. **Phase 1 — make the site data-driven.** Extract `LAYOUT` to `lib/layout.ts`.
   Add `lib/videos.ts` with the `Video` type and a hardcoded `SEED_VIDEOS`
   array (today's 12). Refactor `Portfolio.tsx` and `page.tsx` to render from
   that list. Verify the site is pixel-identical to today on desktop and
   mobile.
2. **Phase 2 — move the list into Vercel Blob.** Add `@vercel/blob`, create the
   Blob store and `BLOB_READ_WRITE_TOKEN` env var. Implement `getVideos()` /
   `saveVideos()`. Seed `videos.json` with the current 12. `page.tsx` reads
   from Blob.
3. **Phase 3 — admin.** Add `ADMIN_PASSWORD` auth + `middleware.ts`, the
   `/admin` UI, and the save server action with validation and revalidation.

## Out of scope (non-goals)

- Drag-and-drop reordering — ↑/↓ buttons only.
- Image uploads / custom thumbnails — thumbnails always come from Vimeo.
- Multiple admin users, roles, or an audit log.
- Per-video analytics.
- Editing the layout blueprint from the admin (slot shapes stay in code).

## Verification

- **Phase 1** — diff the rendered desktop collage and mobile list against the
  current production site; they must match exactly.
- **Phase 2** — edit `videos.json` in Blob directly; confirm the public site
  reflects the change after revalidation.
- **Phase 3** — through the admin: add a video (appears as the next number /
  correct slot), edit fields, delete a middle entry (following numbers shift
  up, no gap), reorder, and confirm Save is blocked when a Vimeo link is empty.
