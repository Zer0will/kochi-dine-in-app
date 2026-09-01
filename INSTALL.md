# Kochi Po-cha · dine-in table app — drop-in instructions

Everything in this zip is at its repo-relative path. Unzip over the root of
`Zer0will/kochi-pocha-ordering` (main) and commit.

## What's new / changed

| Path | What |
| --- | --- |
| `table-app/` | The Preact + Vite app (index.html, src/*) — menu, item sheet, table cart, close out, paid |
| `api/round.js` | New serverless endpoint: a table sends a round to the kitchen (preview: validates + logs) |
| `package.json` | Adds `dev` / `build` / `preview` scripts and Vite + Preact devDependencies |
| `vite.config.js` | Builds `table-app/` → `public/table/` under `/table/`; dev server serves menu JSON + mocks `/api/round` |
| `vercel.json` | Adds `buildCommand` + `outputDirectory`, and routes `/table/*` to the new app (filesystem first so assets resolve) |
| `.gitignore` | Ignores the `public/table/` build output |
| `README.md` | New "Dine-in table ordering" section |
| `scripts/shoot.mjs` | Optional QA script: walks the whole flow in headless Chromium and screenshots every screen (`npm i -D playwright` first) |

Nothing existing was removed. `public/order.html` (the earlier table prototype) still serves at `/order`;
`/table/:id` now goes to the new app. Delete `INSTALL.md` after reading.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173/table/7
npm run build      # emits public/table/ — Vercel does this on deploy
```

First push to Vercel: it picks up `buildCommand` from `vercel.json` automatically. If the
project was previously set to "no build step" in the dashboard, make sure the Framework Preset
is "Other" and the build command isn't overridden there.

## Where to change things

- Menu, prices, tax → `public/data/menu.json` (unchanged; the app reads it live)
- Category rail order / hangul, sauces, extras, demo guests, pay methods → `table-app/src/config.js`
- Photos → set `photo: '/img/...'` on an item in `menu.js`'s `toCategory` or add a `photo` key to menu.json; the striped placeholder is used when absent
- Seeded guests off: append `?seed=0` to the table URL

## What's still preview-only (same as before)

- No kitchen notification yet — `api/round.js` logs the round; wire Twilio / Resend / a KDS webhook there
- Payment goes straight to the paid screen — put Stripe Checkout / Apple Pay in `payNow()` (`store.js`) and confirm via webhook
- Other guests are seeded (Soo, Min). Real multi-phone sync needs a small backend (Supabase realtime fits) — the store already separates "my lines" from "other lines" so it slots in
