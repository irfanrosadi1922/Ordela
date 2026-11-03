# Ordela multi-app platform architecture

Status: migration design only. Production routing and DNS are intentionally unchanged.

## Goals
- Keep the current production application available at https://app.ordela.my.id until the replacement passes acceptance tests.
- Separate Business, POS, and customer Ordering into independently deployable frontends.
- Keep one Supabase project and one authentication identity system.
- Enforce tenant isolation and role authorization on the server/database, never only in the browser.
- Preserve existing POS workflows, PWA behavior, printer support, QR ordering, Telegram/AI integrations, billing, and email flows.

## Proposed hostnames
| Hostname | Application | Deployment |
| --- | --- | --- |
| ordela.my.id | Public marketing site | Cloudflare Pages project: ordela-site |
| www.ordela.my.id | Redirect to canonical marketing host | Cloudflare redirect |
| app.ordela.my.id | Business dashboard | Cloudflare Pages project: ordela-business |
| pos.ordela.my.id | Cashier/POS | Cloudflare Pages project: ordela-pos |
| order.ordela.my.id | Customer ordering | Cloudflare Pages project: ordela-order |
| api.ordela.my.id | Only if a dedicated API gateway is introduced | Not provisioned yet |

## Important current-state facts
- The current repository is a static, root-level web app with a large index.html (~504 KB), a separate order.html (~51 KB), and supporting JavaScript files.
- app.ordela.my.id currently points to GitHub Pages (irfanrosadi1922.github.io).
- Cloudflare zone ordela.my.id is active and currently contains apex GitHub Pages A records, app/www CNAME records, and Resend email records.
- A Cloudflare Pages staging project named `ordela-platform-preview` now exists and has one successful static deployment from `feat/ordela-multi-app-platform`. No production app custom domains are attached.
- The production branch is main. Work must be staged on a feature branch and reviewed before merge.

## Migration sequence
1. Preserve the current main branch and live DNS as rollback baseline.
2. Inventory all page routes, auth redirects, service worker scope, manifest start_url/scope, deep links, Capacitor config, payment callbacks, and external integrations.
3. Extract shared auth/session, Supabase client/config, tenant context, permission checks, and design tokens into a shared package/module.
4. Extract the existing POS UI and behavior without changing its business logic.
5. Extract Business dashboard routes and expose only authorized owner/admin/manager capabilities.
6. Extract customer ordering from order.html; keep public order tokens scoped to one store/table/order session.
7. Add cross-app navigation and same-origin-safe auth redirects. Do not assume localStorage or cookies are shared across subdomains.
8. Add automated static checks and regression tests for login, roles, transaction create/complete, inventory, receipt printing, QR order, payment callback, AI chat, and PWA installation.
9. Create Cloudflare Pages projects with Git integration only after app directories and build outputs are real and verified.
10. Add custom domains and DNS records only after the corresponding Pages project has a successful production deployment and Cloudflare has issued the domain binding.
11. Validate HTTPS, redirects, auth confirmation/reset URLs, email delivery, PWA scope, printer/QR flows, and rollback.
12. Merge only after the acceptance checklist passes.

## Security gates
- Audit public SECURITY DEFINER RPCs (including public.pos_api) before exposing more routes.
- Resolve the Supabase security advisor findings for exposed schemas and verify RLS policies table by table. Do not mass-create permissive policies.
- Confirm every business-owned row is tenant-scoped and every role check is enforced in RLS/RPC/Edge Functions.
- Never put service-role keys, DOKU secrets, Resend API keys, Telegram tokens, or AI provider secrets in browser bundles.
- Validate webhook signatures and make payment/order handlers idempotent.
- Use exact allow-listed Auth redirect URLs for each app; avoid wildcard redirects unless reviewed.

## DNS safety
Do not delete or replace the current apex A records, app/www CNAMEs, MX, or Resend DKIM records during staging. Do not point a hostname at a Pages project until the project exists and has a successful deployment. Keep email DNS untouched.

## Acceptance checklist
- [ ] Build succeeds for all three apps.
- [ ] Existing production app remains reachable until cutover.
- [ ] Owner/admin/manager/cashier/staff role matrix passes.
- [ ] Cross-tenant access tests fail as expected.
- [ ] Login, signup verification, password reset, and logout work from each app.
- [ ] Existing transaction and inventory flows pass regression tests.
- [ ] Bluetooth/USB receipt printing and QR scanning work on target devices.
- [ ] Customer ordering and payment callback pass end-to-end tests.
- [ ] Telegram/AI Manager still reads only the authorized store context.
- [ ] PWA install, update, offline behavior, and Capacitor builds are checked.
- [ ] HTTPS and DNS verified for every hostname.
- [ ] Rollback procedure tested.
