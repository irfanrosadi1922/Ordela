// Suara AI untuk AI Cashier (ElevenLabs): teks -> audio mp3 yang natural dan berekspresi.
// Kunci disimpan sebagai secret Supabase (ELEVENLABS_API_KEY) oleh pemilik; tidak pernah dikirim ke klien.
// Opsional: ELEVENLABS_VOICE_ID (suara), ELEVENLABS_MODEL (default eleven_flash_v2_5, cepat dan mendukung Indonesia).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const J = { "Content-Type": "application/json" };
const out = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...J, ...CORS } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return out({ error: "gunakan POST" }, 405);
  let b: { t?: string; text?: string; lang?: string; ping?: boolean };
  try { b = await req.json(); } catch { return out({ error: "JSON tidak valid" }, 400); }
  const t = String(b.t ?? "");
  if (!t) return out({ error: "token kosong" }, 400);
  const key = (Deno.env.get("ELEVENLABS_API_KEY") || "").trim();
  if (!key) return out({ error: "Suara AI belum diaktifkan (secret ELEVENLABS_API_KEY belum diisi)" }, 501);

  const base = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const u = await fetch(`${base}/rest/v1/rpc/pos_api`, {
    method: "POST", headers: { ...J, apikey: anon, Authorization: `Bearer ${anon}` },
    body: JSON.stringify({ p: { m: "POST", u: "/api/voice/use", q: {}, b: {}, t } }),
  }).then((r) => r.json()).catch(() => null);
  if (!u || u.s !== 200) return out({ error: u?.b?.error ?? "Sesi tidak valid, silakan login ulang" }, u?.s === 429 ? 429 : 401);
  if (b.ping) return out({ ok: true });

  const text = String(b.text ?? "").replace(/\s+/g, " ").trim().slice(0, 450);
  if (text.length < 1) return out({ error: "teks kosong" }, 400);
  const voice = (Deno.env.get("ELEVENLABS_VOICE_ID") || "EXAVITQu4vr4xnSDxMaL").trim();
  const model = (Deno.env.get("ELEVENLABS_MODEL") || "eleven_flash_v2_5").trim();
  const lang = b.lang === "en" ? "en" : b.lang === "id" ? "id" : undefined;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`, {
      method: "POST", signal: ctrl.signal, headers: { ...J, "xi-api-key": key, Accept: "audio/mpeg" },
      body: JSON.stringify({
        text, model_id: model, ...(lang ? { language_code: lang } : {}),
        // stabilitas rendah + gaya = intonasi dan emosi lebih hidup
        voice_settings: { stability: 0.38, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 1.0 },
      }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      const raw = String(j?.detail?.message ?? j?.detail?.status ?? j?.detail ?? "").replace(/[\r\n]+/g, " ").slice(0, 140);
      const why: Record<number, string> = { 401: "API key ElevenLabs tidak berlaku", 402: "kuota/saldo ElevenLabs habis", 404: "suara tidak ditemukan (periksa ELEVENLABS_VOICE_ID)", 422: "permintaan tidak valid", 429: "terlalu cepat atau kuota habis" };
      return out({ error: `ElevenLabs menolak (${r.status}): ${why[r.status] ?? "kesalahan penyedia"}${raw ? " — " + raw : ""}` }, 502);
    }
    return new Response(await r.arrayBuffer(), { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", ...CORS } });
  } catch { return out({ error: "Suara AI tidak merespons, coba lagi" }, 504); } finally { clearTimeout(to); }
});
