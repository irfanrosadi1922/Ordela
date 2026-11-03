# Ordela SSO Implementation Plan

Status: design only; no production authentication, database, DNS, or secrets changed.

## Current behavior verified
- The browser stores the Ordela bearer token as `pos_tok` in origin-scoped localStorage.
- `pos.login(jsonb)` creates a 14-day token with `pos.new_session(uid)`.
- `pos.auth(token)` validates the hashed token in `pos.sessions`, expiry, kick state, inactivity window, and active user.
- `pos.login` invalidates existing sessions when `coalesce(user.single, user.role <> 'owner')` is true. Staff therefore default to single-session behavior.
- `sbapi.js` intercepts same-origin `/api/*` requests and forwards the supplied bearer token to `public.pos_api(jsonb)` using the Supabase publishable/anon key.
- The current static Pages deployments do not execute the repository's Node `server.js`.

## Proposed target
Use a dedicated same-origin API gateway at `api.ordela.my.id` backed by a Cloudflare Worker. Both `app.ordela.my.id` and `pos.ordela.my.id` call that gateway. The gateway proxies the existing `public.pos_api` RPC and uses an opaque Ordela session token held only in a Secure, HttpOnly cookie scoped to `.ordela.my.id`.

Cookie requirements:
- `Secure; HttpOnly; SameSite=Lax; Path=/; Domain=.ordela.my.id`.
- Never put the bearer token in a URL, query string, browser storage, logs, or response JSON.
- Exact allowlist for the two approved application origins; credentialed CORS must never use wildcard origins.
- Require a CSRF defense for state-changing requests (strict Origin validation plus a custom request header; evaluate preflight behavior).
- Clear the cookie on logout and revoke the corresponding server session.
- Do not expose Supabase service-role credentials. Worker uses only the existing publishable key to call the public RPC.

## Compatibility and migration constraints
- Keep existing `pos.login`, `pos.auth`, role checks, permissions, idle timeout, single-session policy, and session revocation semantics initially.
- Login response consumed by the browser must omit the raw token; only the HttpOnly cookie receives it.
- Refactor `sbapi.js` and the app API wrapper as one coordinated change so all private and public `/api/*` calls use the gateway correctly.
- Native builds, local development, QR customer ordering, push subscriptions, printer access, and offline mode need explicit compatibility handling. Do not silently force these clients through a browser-only cookie flow.
- Do not change the default staff single-session policy as part of SSO. A single cookie session should be shared by POS and Business on one browser profile, not interpreted as two logins.
- Ensure logout from one app invalidates the shared session consistently across both apps.

## Implementation sequence
1. Build and test the Worker on a non-production preview hostname with no custom domain.
2. Add strict origin/CORS/CSRF handling and automated tests for login, cookie flags, invalid origins, logout, expired/kicked sessions, and public QR ordering.
3. Refactor the browser API client behind a feature flag; preserve the legacy bearer-token path for native/local clients during migration.
4. Verify same-browser login on both preview apps, role and permission enforcement, session timeout, printer/push behavior, and cross-app logout.
5. Only after review, configure `api.ordela.my.id`, then app/POS custom domains and rollout. Keep rollback to the legacy path available.


## Implementation progress (2026-11-04)
- Added `worker/sso/index.js`: Cloudflare Worker gateway that proxies the existing `public.pos_api(jsonb)` RPC.
- Added `sbapi.js` cookie transport behind the `window.POS_SSO_API` switch. It strips the legacy Authorization header, uses `credentials: include`, and adds the CSRF header on mutations.
- Added app-shell support for an in-memory SSO session marker. In SSO mode, startup does not trust the old `pos_tok` or cached `pos_me`; the server must validate the HttpOnly cookie.
- The SSO switch in `config.js` is intentionally empty/disabled. Existing login transport remains active until the gateway and client rollout are validated together.
- Deployed a preview Worker at `https://ordela-sso-preview.irfanrosadi1922.workers.dev`. Its health endpoint returned HTTP 200 with `ok=true`, `pos=true`, and `sb=true`.
- Worker bindings use the existing Supabase URL and publishable key only. No service-role key, Supabase schema, production DNS, or production app setting was changed.
- GitHub Actions run `41706629162` passed both the app JavaScript syntax check and SSO Worker unit tests.

## Remaining blockers before enabling SSO
- The `workers.dev` preview and `pages.dev` app previews are different sites, so they cannot validate the real shared-domain cookie behavior. A temporary preview hostname under `ordela.my.id` is required for browser-level cross-subdomain testing.
- The existing idle-timeout UI tracks activity in origin-scoped localStorage. Once POS and Business are split across origins, those local timers can disagree and one app could end a session while the user is active in the other. Shared cross-subdomain activity/idle enforcement must be designed and tested before enabling the SSO flag.
- The login, logout, password-change, account setup, email verification, QR ordering, native push, printer, and iOS PWA flows still need end-to-end regression testing through the gateway.
- The current PR remains a draft. Do not merge, attach production domains, or enable `POS_SSO_API` until the blockers above are closed.

## Not yet verified
- End-to-end SSO, cookie behavior on iOS Safari/PWA, CSRF protection, push, printer, QR ordering, and native builds.
- Whether any existing production deployment relies on the legacy same-origin Node server routes.
