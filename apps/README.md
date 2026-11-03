# Application workspaces

This directory is reserved for the staged extraction of Ordela's frontends.

Target workspaces:
- `business/`: owner/admin/manager dashboard
- `pos/`: cashier and operational POS
- `order/`: customer-facing QR and online ordering

Do not add placeholder production entrypoints or point DNS here. Each workspace must be populated from the existing tested implementation, have its own build and regression checks, and be deployed to a preview before any production hostname is moved.

The current root-level app remains the production baseline during migration.


## Temporary staging hostnames

- `app-preview.ordela.my.id` and `pos-preview.ordela.my.id` are temporary sibling hostnames for browser cookie-scope and SSO integration checks.
- Both hostnames currently attach to the existing `ordela-platform-preview` Pages project because the dashboard/POS frontend extraction has not yet been completed.
- They are **not yet two independent app deployments**. Do not use them as production endpoints or claim the apps have been separated.
- `api-preview.ordela.my.id` routes to the `ordela-sso-preview` Worker only.
- Production `app.ordela.my.id`, the apex domain, and existing production DNS records remain untouched.

## Independent preview build artifacts

The build pipeline now emits two separate static artifacts from the shared root application:
- `npm run build:pos` → `dist/pos`
- `npm run build:business` → `dist/business`

Each output locks its app mode at build time, includes its own public asset tree and app metadata, and excludes repository-only content and the root `CNAME`. The existing Supabase/API session integration is retained. Run `npm run test:apps` after both builds to validate mode isolation, required assets, SSO/session code, and inline JavaScript syntax.

**Important limitation:** this is an independent deployment artifact boundary, not yet independent feature source code. Both builds still derive from the shared monolithic `index.html`; feature modules must be extracted in a later phase. The two preview hostnames still need separate Cloudflare Pages projects before they can be called independently deployed applications. The current preview config must not be used for production domains.

## Dedicated Cloudflare Pages preview projects

Two separate Pages projects have been provisioned without changing the existing staging hostnames or production DNS:
- `ordela-business-preview` → build command `npm run build:business`, output `dist/business`, Pages host `ordela-business-preview.pages.dev`.
- `ordela-pos-preview` → build command `npm run build:pos`, output `dist/pos`, Pages host `ordela-pos-preview.pages.dev`.

The first deployments are triggered by the next branch commit. The old `app-preview.ordela.my.id` and `pos-preview.ordela.my.id` aliases remain attached to the original shared Pages project until the new builds are deployed and browser-tested. No production hostname or DNS record was changed.
