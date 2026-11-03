import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

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
