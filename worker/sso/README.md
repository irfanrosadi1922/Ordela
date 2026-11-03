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

## Tests
Run with a recent Node.js version:
```sh
node --test worker/sso/test/worker.test.js
```
