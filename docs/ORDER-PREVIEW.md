# Customer Order app preview

- Cloudflare Pages project: `ordela-order-preview`
- Project root: `apps/order`
- Entry point: `apps/order/index.html`
- Shared Supabase RPC bridge and runtime files are copied into `apps/order/` so the app can load independently at the host root.
- Existing root `order.html` is intentionally unchanged.
- No production custom domain is attached.

This is the first isolated frontend extraction. It is not approved for production until mobile smoke tests cover menu loading, store/table QR context, cart submission, order status polling, and payment flow.
