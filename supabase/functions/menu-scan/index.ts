// Scan menu dari gambar: AI (model dengan kemampuan gambar) membaca foto buku menu / papan / daftar harga
// dan mengembalikan daftar item terstruktur. Aplikasi menampilkannya untuk dicek pemilik sebelum dimasukkan ke menu.
// Memakai konfigurasi AI yang sama dengan ai-chat (tabel ordela_ai_manager_config); kunci tidak pernah keluar dari server.
// Model harus mendukung gambar (mis. gpt-4o-mini, gemini-2.0-flash). Opsional config.vision_model untuk model khusus gambar.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const J = { "Content-Type": "application/json" };
const out = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...J, ...CORS } });

async function loadRuntimeAiConfig() {
  const base = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("ORDELA_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!service) return null;
  const r = await fetch(base + "/rest/v1/ordela_ai_manager_config?id=eq.true&select=config,api_key_cipher,api_key_iv&limit=1", { headers: { apikey: service, authorization: "Bearer " + service } });
  if (!r.ok) return null;
  const row = (await r.json())?.[0];
  if (!row) return null;
  let apiKey = "";
  if (row.api_key_cipher && row.api_key_iv) {
    const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(service));
    const cryptoKey = await crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["decrypt"]);
    const cipher = Uint8Array.from(atob(row.api_key_cipher), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(row.api_key_iv), (c) => c.charCodeAt(0));
    apiKey = new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, cipher));
  }
  return { config: row.config || {}, apiKey };
}

const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) / 100 : null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return out({ error: "gunakan POST" }, 405);
  let b: { t?: string; image?: string; cur?: string; cats?: unknown };
  try { b = await req.json(); } catch { return out({ error: "JSON tidak valid" }, 400); }
  const t = String(b.t ?? "");
  if (!t) return out({ error: "token kosong" }, 400);
  const image = String(b.image ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) return out({ error: "gambar tidak valid" }, 400);
  if (image.length > 3_500_000) return out({ error: "gambar terlalu besar, coba foto lebih kecil" }, 413);

  const base = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const u = await fetch(`${base}/rest/v1/rpc/pos_api`, {
    method: "POST", headers: { ...J, apikey: anon, Authorization: `Bearer ${anon}` },
    body: JSON.stringify({ p: { m: "POST", u: "/api/ai/use", q: {}, b: {}, t } }),
  }).then((r) => r.json()).catch(() => null);
  if (!u || u.s !== 200) return out({ error: u?.b?.error ?? "Sesi tidak valid, silakan login ulang" }, u?.s === 429 ? 429 : 401);

  let rc: any = null;
  try { rc = await loadRuntimeAiConfig(); } catch (e) { console.error("[menu-scan] config", e); }
  const config = { base_url: Deno.env.get("AI_BASE_URL") || "https://api.openai.com/v1", model: Deno.env.get("AI_MODEL") || "gpt-4o-mini", ...(rc?.config || {}) } as any;
  const key = rc?.apiKey || Deno.env.get("AI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
  if (!key) return out({ error: "AI belum dikonfigurasi" }, 501);
  const cur = String(b.cur ?? "").slice(0, 8);
  const cats = (Array.isArray(b.cats) ? b.cats : []).map((x) => String(x).slice(0, 30)).slice(0, 30);
  const prompt = "Gambar ini adalah foto/scan daftar menu restoran (buku menu, papan menu, brosur, struk, atau daftar harga). Baca dengan teliti dan keluarkan SEMUA item yang bisa dijual. " +
    "Balas HANYA JSON valid tanpa teks lain, bentuk: {\"items\":[{\"name\":\"...\",\"price\":12.5,\"category\":\"...\"}]}. " +
    "Aturan: salin nama persis seperti tertulis (perbaiki salah ketik yang jelas saja). price = angka saja tanpa simbol mata uang/pemisah ribuan, sesuai angka yang tertulis" + (cur ? ` (mata uang toko: ${cur}; jangan mengubah skala angka)` : "") + "; jika harga tidak terbaca/tidak ada isi null. " +
    "Jika satu menu punya beberapa ukuran/varian dengan harga berbeda, buat item terpisah dengan nama diikuti ukuran, mis. \"Es Teh (Besar)\". " +
    "category = judul bagian di gambar bila ada" + (cats.length ? `; bila cocok pakai salah satu kategori toko yang sudah ada: ${cats.join(", ")}` : "") + "; jika tidak jelas isi \"Lainnya\". " +
    "Jangan mengarang item yang tidak terlihat. Jika gambar bukan menu, balas {\"items\":[]}.";
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 55000);
  try {
    const endpoint = String(config.base_url).trim().replace(/\/+$/, "") + "/chat/completions";
    const isGroq = /groq\.com/i.test(String(config.base_url));
    // Model teks (mis. gpt-oss) tidak bisa membaca gambar: pada Groq pakai model gambar bawaan bila vision_model belum diatur.
    const model = String(config.vision_model || (isGroq ? "qwen/qwen3.8-27b" : config.model)).trim();
    const r = await fetch(endpoint, {
      method: "POST", signal: ctrl.signal, headers: { ...J, Authorization: `Bearer ${key.trim()}` },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: 3500,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }],
      }),
    });
    const j0 = await r.json().catch(() => null);
    const j = Array.isArray(j0) ? j0[0] : j0;
    if (!r.ok) {
      const raw = String(j?.error?.message ?? j?.message ?? "").replace(/[\r\n]+/g, " ").slice(0, 140);
      const why: Record<number, string> = { 400: "model AI ini kemungkinan tidak mendukung gambar (atur vision_model di konfigurasi AI ke model dengan kemampuan gambar)", 401: "API key tidak berlaku", 402: "saldo penyedia AI habis", 403: "akses ditolak", 404: "model tidak ditemukan", 429: "kuota habis atau terlalu cepat" };
      return out({ error: `Penyedia AI menolak (${r.status}): ${why[r.status] ?? "kesalahan penyedia"}${raw ? " — " + raw : ""} [model=${model}]` }, 502);
    }
    let text = String(j?.choices?.[0]?.message?.content ?? "").trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch { /* abaikan */ } } }
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : null;
    if (!arr) return out({ error: "Hasil AI tidak bisa dibaca, coba foto yang lebih jelas" }, 502);
    const seen = new Set<string>();
    const items: { name: string; price: number | null; category: string }[] = [];
    for (const x of arr.slice(0, 120)) {
      const name = String(x?.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
      if (name.length < 2 || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      items.push({ name, price: num(x?.price), category: String(x?.category ?? "").replace(/\s+/g, " ").trim().slice(0, 30) || "Lainnya" });
    }
    return out({ items });
  } catch { return out({ error: "AI tidak merespons, coba lagi" }, 504); } finally { clearTimeout(to); }
});
