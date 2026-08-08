# Pierre Mouarkech — portfolio site

Next.js 15 (App Router) portfolio for director Pierre Mouarkech. Videos are
hosted on Vimeo; the video list lives in Vercel Blob (`videos.json`); a
password-gated admin dashboard sits at `/admin`.

## Branch state — read this first

- **`main` = production.** Vercel auto-deploys every push of `main` to
  https://pierre-sable.vercel.app (Vercel project `pierre`). **All current
  work — design tweaks, card order/shape changes — happens here, on the
  normal code.**
- **`row-templates` = the new admin dashboard, PARKED.** A complete rewrite
  (per-row template picker, 31 layout templates, `Row[]` data model) is
  committed on that branch. **We are deliberately NOT using it in
  production for now.** Do not merge or cherry-pick it into `main` without
  an explicit decision: its `Row[]` Blob format is unreadable by `main`'s
  code, and deploying it requires the migration path described in
  `docs/superpowers/specs/2026-05-30-row-template-picker.md` (file exists
  on that branch only).

## Gotchas

- Localhost and production share **one** Vercel Blob store. A **Save** in
  the local admin edits the live site's video list for real.
- On `main`'s layout model, a card's rendered shape is a function of its
  **position** (7-slot scatter unit in `lib/layout.ts`, transcribed from
  `docs/reference/newlayout.jpeg`; spec:
  `docs/superpowers/specs/2026-08-08-scatter-collage-layout-design.md`) —
  reordering videos changes their shapes. Featured cards land on videos
  1, 8, 15, …
- `getVideos()` honors a `VIDEOS_FILE` env var (local JSON path) to preview
  a different list without touching Blob. Dev-only; never set in production.
- Blob snapshot/rollback: `scripts/backup-videos.mjs` /
  `scripts/restore-videos.mjs` (see `docs/backups/`). The restore script is
  also the ship tool for uploading a curated list.
- CST "The Hand" is still awaited (no Vimeo upload); when it lands, insert
  at position 11 (id `n-7`) per the spec — that puts Toyota back on the
  third featured slot.
- Local admin password: see `.env.local`. Production `ADMIN_PASSWORD` in
  Vercel is currently an **empty string**, so the production admin login is
  impossible (it fails closed) until a real value is set there.

## Commands

- `npm run dev` — dev server on :3000
- `npm test` — vitest suite
- `npm run build` — production build
