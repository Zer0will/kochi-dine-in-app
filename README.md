# Kochi Po-cha Direct Ordering Preview

A standalone direct-ordering preview for Kochi Po-cha / 코치포차 in Lynnwood, WA.

## Goal

Replace a percentage-based third-party ordering flow with an owned, lower-fee direct system:

1. Customer orders on Kochi-branded site.
2. Restaurant receives order via email/SMS/tablet/POS middleware.
3. Payment can start as pay-at-pickup, then move to Stripe Checkout.

## Current production status

- Static responsive ordering UI: complete.
- Menu data stored in `data/menu.json`: complete.
- Cart/order form: complete.
- Vercel API boundary at `/api/order`: complete, preview-only.
- Real restaurant notification: not connected yet.
- Real payment: not connected yet.

## Lower-fee recommendation

Best rollout:

### Phase 1 — Direct order + pay at pickup

- Orders POST to `/api/order`.
- Add Resend/SendGrid email or Twilio SMS credentials in Vercel env.
- Customer pays at pickup.
- Lowest complexity, no payment processor work, no marketplace commission.

### Phase 2 — Stripe Checkout

- API creates Stripe Checkout session.
- Stripe collects card payment.
- Webhook confirms paid order before notifying kitchen.
- Usually processor-fee only rather than Menu11-style percentage platform commission.

### Phase 3 — Kitchen ops dashboard/POS

- Add Supabase, Google Sheets, Airtable, Square, Toast middleware, or a small kitchen dashboard.
- Only do this after the owner validates direct order demand.

## Dine-in table ordering (`/table/:id`)

The QR dine-in experience is a small Preact + Vite app in `table-app/`, built from the
`design_handoff_dine_in_ordering` bundle. Guests scan a QR at their table, order together on
one live table cart, send rounds to the kitchen, then close out with one bill or split by
person (by items / evenly / custom amounts).

- Menu, prices and tax rate are read at runtime from `public/data/menu.json` — edit that file, not the app.
- Rail order, hangul labels, sauces, extras and the seeded demo guests live in `table-app/src/config.js`.
- Money and split math is in `table-app/src/money.js`; session state in `table-app/src/store.js`.
- Sending a round POSTs to `api/round.js` (preview: validates + logs, no kitchen notification yet).
- `?seed=0` on the URL turns the demo guests off (single diner, one bill).
- State is kept per table in `localStorage`, so a refresh mid-meal doesn't lose the cart.

```bash
npm install
npm run dev      # Vite dev server → http://localhost:5173/table/7 (menu JSON + /api/round mocked)
npm run build    # builds to public/table/ (gitignored; Vercel builds it on deploy)
```

Production still needs: a real table session from the QR (guest identity), realtime cart sync
between phones (Supabase realtime is the lightest fit), kitchen notification, and Stripe /
Apple Pay in `payNow()` — see the comments in `store.js` and `api/round.js`.

## Development

```bash
npm run check
vercel dev
```

## Deployment

Static files deploy directly on Vercel. `vercel.json` runs `npm run build` (which emits the
dine-in app into `public/table/`) and serves `public/`. Serverless functions live in `api/`.

## Safety

No secrets are stored in the repo. Add production credentials only as Vercel environment variables.
