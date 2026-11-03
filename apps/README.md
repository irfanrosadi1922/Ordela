# Ordela application workspaces

Target workspaces:
- `business/`: owner/admin/manager dashboard
- `pos/`: cashier and operational POS
- `order/`: customer-facing QR and online ordering

The root-level app remains the production rollback baseline during migration. Do not move production DNS or merge the migration PR until each extracted app has passed functional regression and deployment checks.

## Preview applications

Dedicated Cloudflare Pages projects are provisioned and the preview aliases are attached to the matching projects:

- `app-preview.ordela.my.id` → `ordela-business-preview` → `dist/business`
- `pos-preview.ordela.my.id` → `ordela-pos-preview` → `dist/pos`
- `api-preview.ordela.my.id` → `ordela-sso-preview` Worker

The two Pages projects also have their own `.pages.dev` hostnames. The latest deployment for branch commit `8aa889f7ddf97e1f1888cd3509e5e5c3a9fbf623` was still processing when this document was last checked. Earlier canonical deployments for both projects completed successfully. Re-check the latest deployment and browser behavior before relying on the newest build.

Production hostnames and DNS remain unchanged.

## Frontend build boundary

The current pipeline emits two separate static artifacts:

- `npm run build:pos` → `dist/pos`
- `npm run build:business` → `dist/business`

Each output locks its app mode at build time, carries its own public assets and app metadata, and excludes repository-only content and the root `CNAME`. Run `npm run test:apps` after both builds to validate mode isolation, required assets, SSO/session code, and inline JavaScript syntax.

**Important limitation:** these are separate deployment artifacts, not yet fully independent frontend source trees. Both are still generated from the shared monolithic root `index.html`. POS and Business feature code must be extracted into their respective workspaces with regression coverage before this migration can be considered complete.

## Ordering app

`apps/order/` contains the first isolated customer ordering frontend copied from the existing root `order.html` entry point. It uses the existing Supabase `public.pos_api(jsonb)` RPC through the shared API client. Its own README records the preview smoke-test status and the remaining real-tenant QR, cart, order-status, and payment tests.

## Authentication and release gates

- SSO preview uses a shared secure cookie across Ordela subdomains and an exact-origin CORS allowlist.
- The preview Worker and browser integration still require an authenticated end-to-end test using the same browser session across Business and POS. Never share passwords or session cookies during testing.
- UI route filtering is not a replacement for server-side role/tenant authorization.
- Verify login, logout, password change, cross-app switching, role permissions, session expiry, ordering, payments, printing, and mobile/PWA behavior before production migration.
- Keep the migration PR in Draft and do not merge or change production DNS without explicit approval.
