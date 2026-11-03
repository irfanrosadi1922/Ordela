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
