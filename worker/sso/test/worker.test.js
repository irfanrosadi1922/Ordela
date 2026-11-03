import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../index.js";

const env = {
  PREVIEW_HOST: "ordela-sso-preview.workers.dev",
  ALLOWED_ORIGINS: "https://ordela-platform-preview.pages.dev,https://ordela-order-preview.pages.dev",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_test"
};

test("rejects unapproved origins before upstream access", async () => {
  const r = await worker.fetch(new Request("https://ordela-sso-preview.workers.dev/api/health", {
    headers: { Origin: "https://evil.example" }
  }), env);
  assert.equal(r.status, 403);
});

test("requires CSRF header on mutations", async () => {
  const r = await worker.fetch(new Request("https://ordela-sso-preview.workers.dev/api/login", {
    method: "POST", headers: { Origin: "https://ordela-platform-preview.pages.dev", "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test", password: "test" })
  }), env);
  assert.equal(r.status, 403);
});

test("does not expose private routes without cookie", async () => {
  const r = await worker.fetch(new Request("https://ordela-sso-preview.workers.dev/api/me", {
    headers: { Origin: "https://ordela-platform-preview.pages.dev" }
  }), env);
  assert.equal(r.status, 401);
});

test("responds to allowed CORS preflight", async () => {
  const r = await worker.fetch(new Request("https://ordela-sso-preview.workers.dev/api/login", {
    method: "OPTIONS", headers: { Origin: "https://ordela-platform-preview.pages.dev" }
  }), env);
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://ordela-platform-preview.pages.dev");
  assert.equal(r.headers.get("Access-Control-Allow-Credentials"), "true");
});

test("login puts the token only in a secure HttpOnly cookie", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    s: 200, b: { token: "ps_test_secret_token_123456789", days: 14, me: { username: "owner" } }
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  const r = await worker.fetch(new Request("https://ordela-sso-preview.workers.dev/api/login", {
    method: "POST",
    headers: {
      Origin: "https://ordela-platform-preview.pages.dev",
      "Content-Type": "application/json",
      "X-Ordela-Client": "web-v1"
    },
    body: JSON.stringify({ username: "owner", password: "example" })
  }), env);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.token, undefined);
  assert.equal(body.me.username, "owner");
  const cookie = r.headers.get("Set-Cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /__Secure-ordela_session=/);
  assert.doesNotMatch(cookie, /Domain=/);
});

test("production cookie is scoped to Ordela subdomains", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    s: 200, b: { token: "ps_test_secret_token_123456789", days: 14, me: { username: "owner" } }
  }), { status: 200 }));
  const r = await worker.fetch(new Request("https://api.ordela.my.id/api/login", {
    method: "POST",
    headers: {
      Origin: "https://app.ordela.my.id",
      "Content-Type": "application/json",
      "X-Ordela-Client": "web-v1"
    },
    body: JSON.stringify({ username: "owner", password: "example" })
  }), {
    ...env,
    ALLOWED_ORIGINS: "https://app.ordela.my.id"
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Set-Cookie"), /Domain=\.ordela\.my\.id/);
});

test("staging API cookie is scoped to Ordela subdomains", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    s: 200, b: { token: "ps_test_secret_token_123456789", days: 14, me: { username: "owner" } }
  }), { status: 200 }));
  const r = await worker.fetch(new Request("https://api-preview.ordela.my.id/api/login", {
    method: "POST",
    headers: {
      Origin: "https://app-preview.ordela.my.id",
      "Content-Type": "application/json",
      "X-Ordela-Client": "web-v1"
    },
    body: JSON.stringify({ username: "owner", password: "example" })
  }), {
    ...env,
    ALLOWED_ORIGINS: "https://app-preview.ordela.my.id,https://pos-preview.ordela.my.id"
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Set-Cookie"), /Domain=\.ordela\.my\.id/);
});

test("preview logout clears the shared Ordela subdomain cookie", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    s: 200, b: { ok: true }
  }), { status: 200 }));
  const r = await worker.fetch(new Request("https://api-preview.ordela.my.id/api/logout", {
    method: "POST",
    headers: {
      Origin: "https://pos-preview.ordela.my.id",
      Cookie: "__Secure-ordela_session=ps_test_secret_token_123456789",
      "Content-Type": "application/json",
      "X-Ordela-Client": "web-v1"
    },
    body: "{}"
  }), {
    ...env,
    ALLOWED_ORIGINS: "https://app-preview.ordela.my.id,https://pos-preview.ordela.my.id"
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("Set-Cookie"), /Domain=\\.ordela\\.my\\.id/);
  assert.match(r.headers.get("Set-Cookie"), /Max-Age=0/);
});

test("health endpoint is available for infrastructure checks without browser Origin", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    s: 200, b: { ok: true, pos: true, sb: true }
  }), { status: 200 }));
  const r = await worker.fetch(new Request("https://ordela-sso-preview.workers.dev/api/health"), env);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, pos: true, sb: true });
});
