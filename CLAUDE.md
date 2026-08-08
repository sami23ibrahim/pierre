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
  **position** (fixed 12-slot cycle in `lib/layout.ts`) — reordering videos
  changes their shapes.
- Local admin password: see `.env.local`. Production `ADMIN_PASSWORD` in
  Vercel is currently an **empty string**, so the production admin login is
  impossible (it fails closed) until a real value is set there.

## Commands

- `npm run dev` — dev server on :3000
- `npm test` — vitest suite
- `npm run build` — production build
