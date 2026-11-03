# Ordela SSO API Worker

This is a preview-only API gateway implementation. It is not yet connected to production DNS or production app clients.

## Environment bindings
- `SUPABASE_URL`: existing Supabase project URL.
- `SUPABASE_ANON_KEY`: publishable/anon key only; never service-role.
- `ALLOWED_ORIGINS`: comma-separated exact origins for the preview app(s).
- `PREVIEW_HOST`: exact Workers hostname for this preview deployment.

## Security behavior
- Exact Origin allowlist and credentialed CORS; no wildcard origins.
- Mutations require `X-Ordela-Client: web-v1` as a CSRF preflighted custom header.
- Private API calls require the HttpOnly session cookie.
- Login and password-change responses move the session token into the cookie and remove it from JSON.
- Logout revokes the existing session through the current Ordela RPC and clears the cookie.
- Production cookie domain is only set when served by `api.ordela.my.id`; preview uses a host-only cookie.
- Request/response bodies are not logged. Responses are no-store.

## Important integration work still required
The current browser app still calls same-origin `/api/*`, stores `pos_tok`, and does not send `credentials: include` or the CSRF header. Do not route production traffic to this Worker until the browser API client has been migrated and regression-tested. Native clients and offline mode must keep their legacy path until separately migrated.

The `workers.dev` preview hostname cannot share a cookie with Pages preview sites on `pages.dev`. It is suitable for gateway/API tests, not full cross-subdomain SSO validation. Full browser SSO testing requires a dedicated preview hostname under `ordela.my.id` (for example, a temporary preview subdomain) before production rollout.

## Temporary custom-domain staging

- `api-preview.ordela.my.id` routes to this preview Worker and returns the health response.
- The Worker accepts browser origins `https://app-preview.ordela.my.id` and `https://pos-preview.ordela.my.id`.
- The staging API cookie is scoped to `.ordela.my.id` so sibling preview hostnames can share it.
- The Pages custom-domain records for both app preview hostnames have passed HTTP validation and are active. The staging-only SSO client switch is deployed. A real-browser smoke check passed for the API health request with credentialed CORS and for reading the shared activity cookie from the sibling preview hostname. Actual account login, authenticated cookie issuance, logout, and full app-switch session behavior still require a signed-in browser test.
- Both app preview hostnames currently serve the same monolithic Pages project. This is only a hostname/cookie integration test; actual Business Dashboard and POS extraction remains pending.
- A temporary browser diagnostic page at `/apps/staging/sso-check.html` verifies API CORS and sibling-host activity-cookie visibility. Remove this temporary page before production merge.
- No production hostname, production DNS record, production Worker, or Supabase schema was changed.

## Shared idle activity across app subdomains

The current app-level idle timer remains enabled. Its activity timestamp is mirrored to a first-party cookie named `ordela_pos_act` scoped to `.ordela.my.id` when the page is served from an Ordela hostname. This allows activity in `app.ordela.my.id` and `pos.ordela.my.id` to update the same browser timestamp while preserving the existing owner-configured idle duration and warning UI. Logout clears the shared activity cookie.

This timestamp is intentionally readable by the frontend and is only a cross-subdomain UI coordination mechanism; it is **not** an authentication credential or a server-side security boundary. The existing database session validation remains authoritative and currently rejects sessions after 12 hours without an authenticated API request. Do not describe the configurable idle timer as server-enforced. Before enabling SSO, test the shared cookie in a real browser on temporary sibling subdomains under `ordela.my.id`, including login, cross-app activity, warning countdown, logout, and idle expiry. Pages.dev and workers.dev previews cannot prove shared-domain cookie behavior.

## Tests
Run with a recent Node.js version:
```sh
node --test worker/sso/test/worker.test.js
```
