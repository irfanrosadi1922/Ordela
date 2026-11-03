# Ordela Cross-App SSO Design

Status: design only; no production resources or database objects changed.

## Goal

Allow one Ordela account session to work across:

- `app.ordela.my.id` — Business Dashboard and central login screen
- `pos.ordela.my.id` — cashier POS
- `auth.ordela.my.id` — central session broker
- `order.ordela.my.id` — public customer ordering; no staff login required

All staff applications continue to use the existing Ordela session model and the same Supabase project. Customer ordering remains public and separate.

## Current implementation findings

- The cashier/business application uses Ordela's own opaque bearer token, stored in origin-scoped `localStorage` under `pos_tok`.
- `sbapi.js` forwards `/api/*` requests to `public.pos_api(jsonb)`; the token is passed in `p.t`.
- `pos.auth(text)` validates the token against `pos.sessions`, including expiry, kicked state, inactivity and active user.
- `pos.login(jsonb)` creates a 14-day session. By default, non-owner accounts use single-session behavior and a fresh password login can kick earlier sessions.
- Supabase Auth is also used for email registration, verification, recovery and email changes. It is not currently the POS bearer-session system.
- Browser localStorage is isolated between subdomains. Copying the same HTML to another subdomain does not share a login.
- Existing Cloudflare Worker `ordela` is already present and has no bindings. It must not be overwritten for SSO.
- Existing Pages preview projects are static deployments and currently have no Pages Functions.
- No KV namespaces or Worker routes are currently configured for this account/zone.

## Recommended design

Use a dedicated Cloudflare Worker on `auth.ordela.my.id` with a Durable Object for session coordination. Do not reuse or overwrite the existing `ordela` Worker.

### Session establishment

1. User signs in through the existing Ordela `/api/login` flow on either staff app.
2. The app sends its newly issued Ordela token to the SSO Worker over HTTPS.
3. The Worker validates the token by calling the existing Supabase `public.pos_api` endpoint with `/api/me`; it does not trust a client-supplied user ID or role.
4. The Durable Object stores the validated token against a cryptographically random opaque session ID.
5. The Worker sets a Secure, HttpOnly, SameSite=Lax cookie scoped to `.ordela.my.id`. The cookie contains only the opaque session ID, never the POS token.
6. The browser can now reach either staff subdomain with the same central session cookie.

### Opening the other staff app

1. If an app has no local `pos_tok`, it redirects to the SSO Worker with a fixed allowlisted destination (`app` or `pos`).
2. The Worker reads the HttpOnly central cookie and asks the Durable Object to create a short-lived, one-use ticket bound to that destination.
3. The browser is redirected back to the requested app with only the temporary ticket code in the query string.
4. The destination app immediately removes the ticket from browser history and POSTs it to the Worker.
5. The Durable Object atomically consumes the ticket, checks expiry and destination binding, and returns the existing POS bearer token in the HTTPS response body.
6. The app stores the token in its own origin-scoped `pos_tok` storage and continues using the existing API client.

Ticket properties:
- cryptographically random and unguessable
- expires after approximately 60 seconds
- bound to one destination app
- single-use, atomically consumed
- never contains the POS token
- rejected if expired, replayed or redeemed by the wrong app

The ticket must not be placed in a URL fragment with any long-lived credential. The app must scrub the ticket from browser history before loading third-party resources.

### Logout and revocation

- Logout from either staff app calls the central SSO logout endpoint.
- The Worker removes the central Durable Object session and calls the existing Ordela `/api/logout` endpoint to revoke the POS token.
- Any copy of that token in another app then fails the existing `pos.auth` check and is cleared by the current 401 handling.
- A new explicit password login continues to respect the existing single-session rule.

### Security controls

- Allowlist exact origins and exact destination hostnames; never accept arbitrary redirect URLs.
- Require HTTPS, validate request Origin, use strict CORS, and reject unexpected methods/content types.
- Cookie: Secure, HttpOnly, SameSite=Lax, Path=/, Domain=.ordela.my.id; use a bounded lifetime and refresh only after successful server-side token validation.
- Store only opaque session IDs in cookies. Keep POS tokens server-side in Durable Object storage until a one-time ticket is redeemed.
- Use Durable Object transactional storage for atomic ticket consumption; do not use KV get-then-delete for one-time tickets because KV is eventually consistent.
- Do not expose service-role keys or other server secrets to browser code.
- Rate-limit establishment, ticket creation and failed redemption. Avoid logging tokens, cookies or ticket values.
- Keep customer QR ordering public and do not issue staff sessions to customer pages.

## Rollout plan

1. Keep all work on `feat/ordela-multi-app-platform`; keep PR #7 open and draft.
2. Add the SSO Worker and Durable Object source code in the repository, with no production hostname or route attached.
3. Review the Supabase RPC validation and implement a narrow, auditable token-validation call.
4. Add the staff-app bootstrap and logout integration behind a feature flag; preserve the existing login fallback.
5. Test with isolated staging hostnames on the same parent domain. A `.pages.dev` preview alone cannot test a parent-domain cookie, so do not claim cross-subdomain SSO is verified until same-parent-domain staging hosts are available.
6. Test owner, cashier, dashboard and staff roles; inactive accounts; kicked/expired sessions; simultaneous tabs; logout from both apps; ticket expiry/replay/wrong-destination; mobile Safari; and printer access.
7. Only after tests pass, review the SQL/Worker changes and request explicit approval before applying production database changes, adding DNS records, attaching custom domains, merging the PR or switching users to the split apps.

## Explicitly not done

- No Supabase schema, function, RLS, secret or data changes.
- No Cloudflare Worker, Durable Object, KV, DNS record, route or custom domain created for SSO.
- No production app routing or login behavior changed.
- Existing Worker `ordela`, Pages projects, Resend records and current user sessions are untouched.
