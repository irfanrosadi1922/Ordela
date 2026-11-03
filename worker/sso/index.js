const COOKIE = "__Host-ordela_session";
const COOKIE_DOMAIN = ".ordela.my.id";
const MAX_BODY = 750_000;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PUBLIC_PATHS = new Set([
  "/api/health",
  "/api/register/check",
  "/api/public/menu",
  "/api/public/order"
]);

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function corsHeaders(origin, allowed) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Ordela-Client",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}
function cookieValue(token, host) {
  const domain = host === "api.ordela.my.id" ? `; Domain=${COOKIE_DOMAIN}` : "";
  return `${COOKIE}=${token}; Path=/; Max-Age=1209600; HttpOnly; Secure; SameSite=Lax${domain}`;
}
function clearCookie(host) {
  const domain = host === "api.ordela.my.id" ? `; Domain=${COOKIE_DOMAIN}` : "";
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax${domain}`;
}
function validOrigin(origin, env) {
  if (!origin) return false;
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin);
}
async function handle(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin") || "";
  const host = url.hostname;
  const isProductionHost = host === "api.ordela.my.id";
  if (!isProductionHost && host !== env.PREVIEW_HOST) return json({ error: "host_not_allowed" }, 421);
  if (!validOrigin(origin, env)) return json({ error: "origin_not_allowed" }, 403);

  const cors = corsHeaders(origin, (env.ALLOWED_ORIGINS || "").split(","));
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (!url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
  if (!SAFE_METHODS.has(request.method) && request.headers.get("X-Ordela-Client") !== "web-v1") {
    return json({ error: "csrf_check_failed" }, 403, cors);
  }

  let body = {};
  if (!["GET", "HEAD"].includes(request.method)) {
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BODY) return json({ error: "request_too_large" }, 413, cors);
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "request_too_large" }, 413, cors);
    if (raw) {
      try { body = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400, cors); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_json" }, 400, cors);
    }
  }

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[COOKIE] || "";
  const query = {};
  url.searchParams.forEach((value, key) => { query[key] = value; });
  const path = url.pathname;
  const publicPath = PUBLIC_PATHS.has(path) || /^\/api\/public\/order\/[A-Za-z0-9_-]{10,40}(?:\/(?:cancel|paid))?$/.test(path);
  const incomingMethod = request.method;
  const isLogin = path === "/api/login" && incomingMethod === "POST";
  const isPasswordChange = path === "/api/me/password" && incomingMethod === "POST";
  const isLogout = path === "/api/logout" && incomingMethod === "POST";

  if (!publicPath && !isLogin && !token) return json({ error: "unauthorized" }, 401, cors);

  const rpcBody = {
    p: {
      m: incomingMethod,
      u: path,
      q: query,
      b: body,
      t: publicPath || isLogin ? "" : token
    }
  };
  let upstream;
  try {
    upstream = await fetch(env.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/rpc/pos_api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_ANON_KEY,
        ...(env.SUPABASE_ANON_KEY.startsWith("eyJ") ? { "Authorization": "Bearer " + env.SUPABASE_ANON_KEY } : {})
      },
      body: JSON.stringify(rpcBody),
      signal: AbortSignal.timeout(25000)
    });
  } catch {
    return json({ error: "upstream_unavailable" }, 502, cors);
  }

  let envelope;
  try { envelope = await upstream.json(); } catch { return json({ error: "upstream_bad_response" }, 502, cors); }
  if (!envelope || typeof envelope.s !== "number") return json({ error: "upstream_bad_response" }, 502, cors);
  const payload = envelope.b && typeof envelope.b === "object" ? { ...envelope.b } : envelope.b;
  const headers = { ...cors };
  if ((isLogin || isPasswordChange) && envelope.s >= 200 && envelope.s < 300 && payload && typeof payload.token === "string") {
    headers["Set-Cookie"] = cookieValue(payload.token, host);
    delete payload.token;
  }
  if (isLogout) headers["Set-Cookie"] = clearCookie(host);
  return json(payload ?? {}, envelope.s, headers);
}
export default { fetch: handle };
