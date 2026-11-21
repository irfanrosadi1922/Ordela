// Laporan harian ke WhatsApp: teks ringkasan + file Excel, dikirim lewat Fonnte (https://fonnte.com).
// Secret yang HARUS diset sendiri di Supabase (Edge Functions → Secrets): FONNTE_TOKEN
// Deploy:  supabase functions deploy daily-report --no-verify-jwt
// Alur: token sesi Ordela dicek lewat pos_api '/api/me' (harus owner) → file Excel dikirim sebagai upload langsung.
// Batas: file maks 4 MB (aturan Fonnte); paket Fonnte harus mendukung kirim file.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const J = { "Content-Type": "application/json" };
const out = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...J, ...CORS } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return out({ error: "gunakan POST" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return out({ error: "JSON tidak valid" }, 400); }
  const t = String(b.t ?? ""), phone = String(b.phone ?? "").replace(/[\s-]/g, "").replace(/^\+/, "");
  const text = String(b.text ?? "").slice(0, 3000), file = String(b.file ?? ""), name = String(b.name ?? "laporan.xlsx").replace(/[^\w.\-]/g, "_").slice(0, 60);
  if (!t) return out({ error: "token kosong" }, 400);
  if (!/^\d{8,15}$/.test(phone)) return out({ error: "nomor WhatsApp tidak valid" }, 400);
  if (!text) return out({ error: "isi laporan kosong" }, 400);
  if (file.length > 5_300_000) return out({ error: "file terlalu besar (maks 4 MB)" }, 400);

  const token = Deno.env.get("FONNTE_TOKEN");
  if (!token) return out({ error: "FONNTE_TOKEN belum diatur di Supabase" }, 500);

  const base = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const me = await fetch(`${base}/rest/v1/rpc/pos_api`, {
    method: "POST", headers: { ...J, apikey: anon, Authorization: `Bearer ${anon}` },
    body: JSON.stringify({ p: { m: "GET", u: "/api/me", q: {}, b: {}, t } }),
  }).then((r) => r.json()).catch(() => null);
  if (!me || me.s !== 200) return out({ error: "Sesi tidak valid, silakan login ulang" }, 401);
  const role = String(me.b?.role ?? "");
  if (role !== "owner") return out({ error: "Hanya pemilik yang boleh mengirim laporan" }, 403);

  const f = new FormData();
  f.append("target", phone); f.append("message", text);
  if (file) {
    const bytes = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));
    f.append("file", new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name);
    f.append("filename", name);
  }
  const r = await fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: token }, body: f });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) return out({ error: String(j.reason ?? "Penyedia WhatsApp menolak (" + r.status + ")").slice(0, 160) }, 502);
  return out({ ok: true });
});
