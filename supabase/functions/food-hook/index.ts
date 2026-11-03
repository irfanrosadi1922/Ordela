// Penerima pesanan GoFood / GrabFood / ShopeeFood untuk Ordela.
// Deploy:  supabase functions deploy food-hook --no-verify-jwt
// URL per restoran (ditampilkan di Integrasi Center):  https://<project>.supabase.co/functions/v1/food-hook?k=TOKEN
// Token juga boleh dikirim lewat header  x-ordela-key.  Body: JSON pesanan (lihat panduan di halaman Integrasi).
Deno.serve(async (req: Request) => {
  const cors = { "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response('{"error":"gunakan POST"}', { status: 405, headers: cors });
  const url = new URL(req.url);
  const k = url.searchParams.get("k") || req.headers.get("x-ordela-key") || "";
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > 200_000) return new Response('{"error":"payload terlalu besar"}', { status: 413, headers: cors });
  let body: unknown;
  try { const txt = await req.text(); if (txt.length > 200_000) throw new Error("big"); body = JSON.parse(txt); } catch { return new Response('{"error":"JSON tidak valid"}', { status: 400, headers: cors }); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return new Response('{"error":"JSON harus objek"}', { status: 400, headers: cors });
  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const r = await fetch(`${base}/rest/v1/rpc/pos_api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anon, Authorization: `Bearer ${anon}` },
    body: JSON.stringify({ p: { m: "POST", u: "/api/food/hook", q: {}, t: "", b: { ...(body as object), k } } }),
  });
  const j = await r.json().catch(() => null);
  if (!j || typeof j.s !== "number") return new Response('{"error":"gagal meneruskan"}', { status: 502, headers: cors });
  return new Response(JSON.stringify(j.b ?? {}), { status: j.s, headers: cors });
});
