# Ordela Order preview

This directory contains the first isolated frontend extracted from the existing `order.html` entry point.

- Entry: `index.html` (copied from the existing customer ordering page)
- Shared runtime: `config.js`, `sbapi.js`, `qr.js`, `qris.js`
- Backend: existing Supabase `public.pos_api(jsonb)` RPC via `sbapi.js`
- No custom domain is attached. This is a staging-only extraction.

The existing root `order.html` remains unchanged as the rollback baseline. Before using this app in production, test public menu loading, QR/table context, order creation, order status, payment, and mobile browser behavior.
