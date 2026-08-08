# Scatter-collage layout + curated 18-video order — design

Date: 2026-08-08 · Branch: `new-layout` · Status: approved by Sami (captions stay,
list order/wording as given), pending CST video link.

## Goal

Replace the current 12-slot collage blueprint with a new 7-slot "scatter" unit
transcribed from the reference image `docs/reference/newlayout.jpeg`, and apply
the new curated video order below. Captions (client + title under each card)
stay. Everything else — admin, video modal, contact, mobile stacking model,
"order determines shape" — keeps working exactly as today.

## 1. Layout geometry (desktop)

The reference (`newlayout.jpeg`, 1280×1600) shows **card shapes, relative
sizes, and the staggered arrangement** — NOT the page margins. Sami: "no
white margins, the image is just to show how the cards' new shape will be."
So the whole 7-card composition is scaled up uniformly (×1.2402) until its
widest cards sit on the site's normal 1.65 % side margins (same as today's
grid). Uniform scaling preserves every card's aspect ratio and the stagger;
the featured card is re-centered (it is deliberately centered in the
reference).

**Caption clearance (revision after first build):** the reference has no
captions, and placing two-line labels in its raw gaps let lower cards paint
over them (featured→slot 1, slot 2→slot 4, slot 4→slot 5). Each band below
the featured card is therefore pushed down just far enough for every caption
to have guaranteed room — 45 / 85 / 110 px on the reference scale, computed
so that a 460 px-wide two-line caption block (16 px gap + 44 px text) never
intersects a lower card sharing its x-range. Card shapes are untouched; the
slot 2/3 interleave survives (27 px). Unit canvas: **1280×2146**
(aspect ≈ 0.596).

That composition is one repeating **unit**: videos 1–7 fill unit 1, videos
8–14 unit 2, and so on. Final card boxes (percent of unit width/height,
rounded to 2 dp):

| Slot | Kind     | Box (left, top, width, height) | Aspect | Notes |
|------|----------|--------------------------------|--------|-------|
| 0    | featured | 13.57, 5.09, 72.86, 21.61      | 2.01   | horizontally centered |
| 1    | left     | 5.72, 30.31, 33.33, 14.91      | 1.33   | small |
| 2    | right    | 45.06, 29.50, 45.93, 21.96     | 1.25   | tall — starts above slot 1, ends below it |
| 3    | left     | 1.65, 50.21, 41.28, 18.61      | 1.32   | starts *above* slot 2's bottom edge (columns interleave); touches left margin |
| 4    | right    | 45.06, 54.25, 53.29, 17.68     | 1.80   | touches right margin (98.35) |
| 5    | left     | 1.65, 74.73, 58.14, 21.04      | 1.65   | large; touches left margin |
| 6    | right    | 62.31, 77.51, 33.33, 14.91     | 1.33   | small |

The left/right edges stay deliberately ragged (only the deepest cards touch
the margins) — that is the scatter look, at full width. A regression test
asserts the no-card-covers-a-caption invariant directly on `LAYOUT`.

Slot order = reading order used by the curated list: featured first, then each
band left card before right card. Video N (1-based) renders in slot (N−1) mod 7.

**Labels:** same treatment as today — absolutely positioned under each card:
`left` = card left, `width` = card width, `top` = card bottom + 16 px (on the
1280 canvas scale). Existing `.tile-label` typography unchanged (CSS
uppercases it).

**Because slots 2 and 3 overlap vertically across columns, a unit renders as
ONE positioning canvas** (one `.row` holding up to 7 tiles, `aspect-ratio:
1280 / 2146 ≈ 0.596`), not as stacked featured/pair rows. `lib/layout.ts`
changes from "12 slots grouped into featured/paired rows" to "7 slots grouped
into units":

- `LAYOUT: Slot[]` — 7 entries with the boxes above (same `Slot` shape:
  desktop media + label + mobile aspectRatio; percentages relative to the unit).
- `slotForIndex(i)` — unchanged logic, cycle length 7.
- `layoutRows(items)` → `layoutUnits(items)`: chunks of 7, last chunk may be
  partial (1–6 items).
- **Partial trailing unit:** the unit's height shrinks to fit its cards.
  `unitAspect(count)` = full aspect ÷ `f`, where `f` = deepest present
  caption bottom + padding (1 for a full unit). Crucially the slot
  percentages are **rescaled by 1/f** for that unit (`slotStyles(index,
  count)`) so every card keeps exactly the same rendered pixel shape and
  position as in a full unit — the row just ends sooner. (First build got
  this wrong — cards squashed — now locked by a shape-invariance test.)

**Reveal animations:** current CSS keys off `nth-child(1)/(3)` inside pair
rows — that breaks with 7 tiles per row. Replace with per-slot classes derived
from `kind` (`featured` → rise from below, `left` → slide from left, `right` →
slide from right), same timings/easing as today.

## 2. Mobile

Unchanged model: full-width stacked tiles + label, aspect ratio per slot from
the table's Aspect column: `[2.01, 1.33, 1.25, 1.32, 1.80, 1.65, 1.33]`.

## 3. Curated video list (source of truth: Sami's message, 2026-08-08)

Order and wording below are deliberate; stored strings use title case (site CSS
uppercases display anyway). Carried-over videos keep their existing `id`s; new
videos get ids `n-1`…`n-7`.

| # | Client | Title | Vimeo ID | Status |
|---|--------|-------|----------|--------|
| 1 | Visa | Never Walk Alone | 1025249190 | new · ⚠ Vimeo upload is titled "never alone" — Sami's wording kept, flag at review |
| 2 | Diesel | Be A Follower | 316674560 | existing |
| 3 | Kärcher | Like Nothing Happened | 692524648 | new |
| 4 | L'Occitane | — | 898044833 | existing (list wrote "LOCCITANE"; brand apostrophe kept) |
| 5 | Diriyah FC | Underdogs | 1131470962 | existing |
| 6 | Rolling Stones | Rockin' Mamas | 573367624 | existing · ⚠ stored client was "Rolling Stone" — list's "Stones" kept |
| 7 | Danone | Fifty Years Of Motherhood | 212541794 | new |
| 8 | Du | Too Distressing | 121774920 | existing · featured (slot 0 of unit 2) |
| 9 | Du | Too Informative | 121786400 | new |
| 10 | Heineken | The Cleaners | 803985634 | existing |
| 11 | CST | The Hand | **pending** | ⚠ not on the Vimeo account (all 67 checked) — awaiting link/upload |
| 12 | Jeep | Rewild Yourself | 695205162 | existing |
| 13 | Denner | The Good Life (DC) | 1009764873 | existing (kept after all — replaces Lavazza) |
| 14 | Du | The Man Sitting Next To You | 216957056 | existing · list wording "Man" kept (was "Men") |
| 15 | Toyota | If | 291694491 | existing · featured (slot 0 of unit 3) |
| 16 | Molto Fino | Feeds A Town | 682546048 | existing · ⚠ Vimeo/stored say "feeds a village" — list's "Town" kept, flag at review |
| 17 | Fisher | The Naked Truth | 223460819 | existing · ⚠ stored client "Fischer" — list's "Fisher" kept, flag at review |
| 18 | Center Point | The Piano | 194804690 | new (Vimeo: "CENTER POINT . piano") |
| — | ~~Lavazza — Alexa~~ | | 648106703 | **removed 2026-08-08**: Vimeo rights-locked (Article 17 music match) — cannot be made Public, no thumbnail available; Denner takes its slot per Sami |

The featured slots land on videos 1, 8, 15 → **Visa, Du — Too Distressing,
Toyota** — matching the emphasis in Sami's list. **This alignment assumes all
18 entries.** If CST is still missing at ship time, positions 12–18 shift up
one and Molto Fino (not Toyota) becomes the third featured card — Sami decides
then: ship 17 accepting that, or wait for CST.

## 4. Preview / ship / rollback

- **The curated list lives in the repo** as `data/videos-new.json` (committed
  on `new-layout`), in the exact `Video[]` shape of `videos.json`.
- **Local preview without touching production:** `getVideos()` gains a
  dev-only override — if env `VIDEOS_FILE` is set, read that file instead of
  Blob (server-side, fail → fall through to Blob). Put
  `VIDEOS_FILE=data/videos-new.json` in `.env.local` (not committed) while
  previewing. Production never sets it.
- **Ship (both halves together, since order drives shapes):**
  1. merge `new-layout` → `main`, push (Vercel deploys the new blueprint);
  2. `node --env-file=.env.local scripts/restore-videos.mjs data/videos-new.json`
     (uploads the curated list to Blob — the same validated uploader used for
     restores).
- **Rollback:** `git revert`/reset `main` to pre-merge + push, and
  `node --env-file=.env.local scripts/restore-videos.mjs docs/backups/2026-08-08-videos.json`.
  Restore point commit: `a8869db` on `main`.

## 5. Out of scope

Admin dashboard (still edits the same list; its row grouping just follows the
new units), VideoModal, contact/hero/nav/footer, the parked `row-templates`
branch, and any Blob write before ship time.

## 6. Testing

- Unit tests (vitest, alongside existing layout tests): 7-cycle `slotForIndex`
  wrap; `layoutUnits` chunking at 7/14/18 items; partial-unit aspect helper
  (including the 4-card case ≈ 74 % height, and a 1-card unit).
- Manual: dev server with `VIDEOS_FILE` preview — compare desktop render
  against `docs/reference/newlayout.jpeg` at 1280 px; check mobile stack,
  reveal animations, admin still lists/edits normally.
