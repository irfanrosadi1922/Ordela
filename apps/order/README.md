# Ordela Order preview

This directory contains the first isolated frontend extracted from the existing `order.html` entry point.

- Entry: `index.html` (copied from the existing customer ordering page)
- Shared runtime: `config.js`, `sbapi.js`, `qr.js`, `qris.js`
- Backend: existing Supabase `public.pos_api(jsonb)` RPC via `sbapi.js`
- No custom domain is attached. This is a staging-only extraction.

The existing root `order.html` remains unchanged as the rollback baseline. Before using this app in production, test public menu loading, QR/table context, order creation, order status, payment, and mobile browser behavior.


## Preview smoke-test status

- Static Pages deployment: successful.
- Browser-rendered page: HTTP 200.
- Preview root without `?s=<store-code>`: shows a QR instruction and does not show the fallback/demo menu.
- Real tenant QR, cart submission, status polling, and payment: not yet tested; do not use this preview as production ordering until those pass.
