# Ordela platform migration — source audit

Audit date: 2026-11-04
Repository branch: feat/ordela-multi-app-platform
Production branch inspected: main

## Confirmed application shape

- The current Business/POS experience is one static application in the root `index.html`.
- Customer QR ordering already has a separate entry point in root `order.html`.
- Shared runtime files include `auth.js`, `config.js`, `sbapi.js`, `qr.js`, `qris.js`, `native.js`, `pos2.js`, and `sw.js`.
- The application uses one Supabase project. Do not split databases as part of the frontend separation.
- The existing app registers a root-scoped service worker and uses a root-scoped PWA manifest. Any host/path split must explicitly preserve or intentionally reconfigure those scopes.

## Confirmed defects / migration hazards

1. `index.html` defines `openDash()` which navigates to `dashboard.html`, but `dashboard.html` is absent from the repository tree. The related `#dashNav` selector also has no matching element in the current HTML. Do not use this as the Business dashboard entry point without implementing and testing it.
2. `auth.js` currently canonicalizes `ordela.my.id` and `www.ordela.my.id` to `app.ordela.my.id`. Keep this behavior intentional and test verification/reset links on every new host before DNS cutover.
3. `order.html` builds its public ordering URL from configured base URL or the current page URL. A dedicated `order.ordela.my.id` host requires an explicit test of generated QR URLs and order submission.
4. A new subdomain is a separate origin. Existing localStorage sessions, service-worker registrations, printer permissions, and PWA installs are not automatically shared across subdomains. Test login/session behavior separately on Business and POS hosts.
5. The root application contains both POS and owner/management screens, and permission checks are enforced in the app. A cosmetic host-based redirect is not sufficient to make the POS host cashier-only; the UI route allowlist and backend authorization must be reviewed together.

## Supabase security advisor snapshot

The connected Supabase security advisor reported:
- 32 `rls_enabled_no_policy` informational findings. Findings include backup/private schemas and some exposed-schema tables; classify each schema/table before changing policies. No bulk policy changes were made.
- `public.pos_api(jsonb)` is a SECURITY DEFINER function executable by `anon` and `authenticated`. The SQL source describes it as the sole public API entry point and it routes requests through `pos.route(..., p ->> 't')`; retain only after reviewing token/session validation and all routes.
- Auth OTP expiry is configured above one hour.
- Leaked-password protection is disabled.

No Supabase schema, policies, function grants, Auth settings, data, or secrets were changed during this audit.

## Deployment status

- No Cloudflare Pages projects existed in the connected account at audit time.
- No production DNS records or existing GitHub Pages routing were changed.
- A Pages project must not receive custom domains until the appropriate entry point has a successful deployment and smoke tests pass.
- Cloudflare Git integration requires the Cloudflare Workers & Pages GitHub App to be authorized for the Ordela repository. If that authorization is not already present, it must be completed before Git-connected Pages projects can be created.

## Release gates

- Implement separate Business, POS, and customer-order entry points with an explicit shared-runtime strategy.
- Add automated checks for missing local assets, broken relative links, manifest/service-worker scope, and JavaScript syntax.
- Test owner, cashier, staff, and unauthenticated access against the same Supabase tenant.
- Test order creation, QR generation, payment callback handling, printer connection, push notifications, email verification, password reset, and Telegram/AI integrations.
- Deploy preview builds first; only then add custom domains and make DNS changes.


## Follow-up audit: Pages staging pipeline and backend boundaries

Follow-up date: 2026-11-04

### Cloudflare Pages staging

- Cloudflare project `ordela-platform-preview` is now connected to GitHub repository `irfanrosadi1922/Ordela` and branch `feat/ordela-multi-app-platform`.
- First deployment completed successfully: `8f6b5eb5-eeed-4568-a1cb-03e9da9f29a7`.
- Deployment URL: https://8f6b5eb5.ordela-platform-preview.pages.dev
- Build command is empty and output directory is the repository root. This verifies the Git-connected static Pages deployment pipeline only; it does not prove that authenticated workflows or backend APIs work on the preview.
- No custom domains were added.

### Additional backend findings

- `sbapi.js` intercepts same-origin `/api/*` fetches and forwards them to Supabase REST RPC `public.pos_api(jsonb)`. The browser-side Supabase publishable key is configured in `config.js`; it is not a service-role secret.
- The standalone `server.js` is a separate Node.js server using Node's built-in SQLite database and implements its own `/api/*` endpoints. Cloudflare Pages static deployment does not run this Node server. Do not assume the SQLite server is available on the Pages host.
- `order.html` loads `config.js`, `sbapi.js`, `qr.js`, and `qris.js`, then calls public ordering routes through the same `pos_api` RPC bridge. A dedicated Order app must preserve these dependencies and verify public menu/order/status/payment routes.
- The root `index.html` is approximately 503 KB and includes both POS and management functionality. The current source does not contain a separate `dashboard.html`; `openDash()` points to that missing file. A safe Business/POS split requires extracting the existing view logic and validating server-side role checks, not copying the root HTML to two folders.
- The current manifest and service worker are root-scoped. Each app origin will need a tested manifest/service-worker strategy; browser localStorage, service worker registrations, and printer permissions are not shared between subdomains.

### Next implementation gates

1. Map all current views, navigation actions, roles, and backend RPC routes from the existing monolith.
2. Extract shared runtime code without changing the current production root entry point.
3. Build an Order preview first because `order.html` is already a separate UI entry point; include its shared runtime assets and test all public RPC routes.
4. Extract Business and POS into separate entry points only after the current screen/permission matrix is mapped.
5. Add smoke/regression checks before attaching any custom domain.


### Order preview browser smoke test (2026-11-04)

- Cloudflare Pages deployment for `apps/order` completed successfully (deployment `d7b16ed8-6425-4427-9802-f121efb7f30c`).
- Cloudflare Browser Rendering fetched the deployed root with HTTP 200 and executed the page JavaScript.
- Before adding a guard, opening the page without a store code displayed the backend's fallback/demo store menu (labelled “Samehada”). This is not the user's live store data.
- Added a preview-only guard: without a valid store query parameter `s`, the preview now displays an instruction to open the page through a store QR code and hides the fallback menu.
- Re-tested the stable Pages host: HTTP 200, title `Order · Ordela`, guard message visible, menu hidden, and demo item content absent.
- This does not validate a real tenant's QR, order submission, status polling, or payment. Those flows require a real store code and must be tested before adding `order.ordela.my.id`.
- Browser Rendering returned a rate-limit response on a later asset-check batch; no further repeated calls were made.
