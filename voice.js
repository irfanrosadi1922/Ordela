/* Voice Cashier Ordela: perintah suara tanpa AI/LLM.
   Pengenalan suara memakai SpeechRecognition bawaan peramban (bila ada); hasilnya dibaca parser aturan
   (Indonesia, Inggris, Melayu) lalu memakai fungsi keranjang & pembayaran yang sudah ada di Ordela.
   Bila peramban/WebView tidak mendukung, panel tetap bisa dipakai lewat kolom ketik (atau mikrofon keyboard). */
(function (root) {
  'use strict';

  /* ---------- kosakata ---------- */
  var UNITS = { nol: 0, sifar: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, lapan: 8, sembilan: 9,
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  var TEENS = { sepuluh: 10, sebelas: 11, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, seratus: 100 };
  var TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  var MULT = { belas: 1, puluh: 1, ratus: 1, hundred: 1 };
  var UNIT_WORDS = { porsi: 1, piring: 1, gelas: 1, cangkir: 1, mangkok: 1, bungkus: 1, buah: 1, biji: 1, pcs: 1, pc: 1, pieces: 1, piece: 1, portion: 1, portions: 1, plate: 1, plates: 1, glass: 1, glasses: 1, cup: 1, cups: 1, bowl: 1, bowls: 1, orang: 1, keping: 1, potong: 1, ekor: 1, botol: 1, bottle: 1, bottles: 1, pinggan: 1, cawan: 1, mangkuk: 1, unit: 1, units: 1, tusuk: 1, stick: 1, sticks: 1 };
  var FILLER = { tolong: 1, please: 1, dong: 1, ya: 1, yah: 1, yuk: 1, aja: 1, saja: 1, lah: 1, kak: 1, mas: 1, mbak: 1, bang: 1, kakak: 1, ke: 1, to: 1, the: 1, my: 1, saya: 1, aku: 1, i: 1, want: 1, would: 1, like: 1, can: 1, you: 1, could: 1, nak: 1, mahu: 1, tambahan: 1, lagi: 1, juga: 1, a: 1, an: 1, of: 1, some: 1, sebuah: 1, seporsi: 1, segelas: 1, sebiji: 1, keranjang: 1, cart: 1, troli: 1, bakul: 1, basket: 1, pesanan: 1, order: 1, dalam: 1, into: 1, in: 1, pada: 1, di: 1, buat: 1, untuk: 1, for: 1, yang: 1, itu: 1, ini: 1, this: 1, that: 1, satunya: 1, kan: 1, deh: 1, sih: 1, nih: 1, sama: 0 };
  /* sinonim token nama menu → bentuk baku (supaya "teh ais", "es teh", "iced tea" sama) */
  var SYN = { ais: 'es', ice: 'es', iced: 'es', cold: 'es', dingin: 'es', sejuk: 'es', tea: 'teh', tehh: 'teh', coffee: 'kopi', milk: 'susu', fried: 'goreng', rice: 'nasi', chicken: 'ayam', satay: 'sate', satey: 'sate', saté: 'sate', noodle: 'mie', noodles: 'mie', mee: 'mie', mi: 'mie', orange: 'jeruk', oren: 'jeruk', water: 'air', mineral: 'mineral', beef: 'sapi', lembu: 'sapi', daging: 'daging', egg: 'telur', telor: 'telur', fish: 'ikan', soup: 'sup', sop: 'sup', juice: 'jus', jush: 'jus', burger: 'burger', fries: 'kentang', potato: 'kentang', hot: 'panas', lemon: 'lemon', sweet: 'manis', black: 'hitam', green: 'hijau', pedas: 'pedas', spicy: 'pedas' };

  var V_ADD = ['tambah', 'tambahkan', 'tambahin', 'menambah', 'menambahkan', 'masukkan', 'masukan', 'masuk', 'pesan', 'pesankan', 'memesan', 'order', 'beli', 'mau', 'minta', 'ambil', 'add', 'put', 'give', 'get', 'bagi', 'beri', 'berikan', 'bawa'];
  var V_REDUCE = ['kurangi', 'kurangkan', 'kurang', 'minus', 'subtract', 'reduce', 'kurangin'];
  var V_REMOVE = ['hapus', 'hapuskan', 'menghapus', 'buang', 'buangkan', 'batal', 'batalkan', 'remove', 'delete', 'cancel', 'padam', 'padamkan', 'singkirkan', 'keluarkan', 'cabut', 'drop'];
  var V_SET = ['ubah', 'ubahlah', 'ubahkan', 'ganti', 'gantikan', 'jadikan', 'set', 'change', 'update', 'edit', 'tukar', 'tukarkan', 'revisi', 'sesuaikan'];
  var METHODS = [[/\b(tunai|cash|kontan|tunai)\b/, 'Tunai'], [/\b(kartu|kad|card|debit|kredit|credit)\b/, 'Kartu'], [/\b(qris|duitnow|duit now|qr)\b/, 'QRIS'], [/\b(e wallet|ewallet|dompet digital|dompet|ovo|gopay|dana|shopeepay|tng|touch n go)\b/, 'E-Wallet']];

  function has(list, w) { return list.indexOf(w) > -1; }

  /* ---------- nominal uang: "lima puluh ribu", "50k", "seratus ribu", "sepuluh ringgit lima puluh sen" ---------- */
  var MONEYW = { ribu: 1e3, rb: 1e3, k: 1e3, thousand: 1e3, juta: 1e6, jt: 1e6, million: 1e6 };
  var CUR_W = { ringgit: 1, rm: 1, rupiah: 1, rp: 1, dollar: 1, dollars: 1, bucks: 1, idr: 1, myr: 1, usd: 1 };
  function readMoney(t, i) {
    var total = 0, j = i, got = false, m;
    while (j < t.length) {
      var w = t[j];
      if (w === 'seribu') { total += 1000; j++; got = true; continue; }
      if (w === 'sejuta') { total += 1e6; j++; got = true; continue; }
      if ((m = /^(?:rm|rp)(\d+)$/.exec(w))) { total += +m[1]; j++; got = true; continue; }
      if ((m = /^(\d+)(k|rb|jt)$/.exec(w))) { total += +m[1] * (m[2] === 'jt' ? 1e6 : 1e3); j++; got = true; continue; }
      var r = readNum(t, j);
      if (!r) { if (got && CUR_W[w]) { j++; continue; } break; }
      var nx = t[j + r.len];
      if (nx in MONEYW) { total += r.n * MONEYW[nx]; j += r.len + 1; got = true; continue; }
      if (nx === 'sen' || nx === 'cent' || nx === 'cents') { total += r.n / 100; j += r.len + 1; got = true; continue; }
      total += r.n; j += r.len; got = true;
      if (CUR_W[t[j]]) j++;
    }
    return got ? { v: Math.round(total * 100) / 100, len: j - i } : null;
  }
  var PAYV = { bayar: 1, bayarkan: 1, membayar: 1, checkout: 1, pay: 1, lunas: 1, lunaskan: 1, settle: 1 };
  function parsePayClause(tk) {
    var s = tk.join(' '), amount = null;
    for (var i = 0; i < tk.length; i++) { var r = readMoney(tk, i); if (r) { amount = r.v; break; } }
    var method = detectMethod(s);
    if (!method && amount !== null) method = 'Tunai';
    return { method: method, amount: amount, exact: /\b(pas|exact|lunas|pass)\b/.test(s) };
  }
  function leftOk(w) { return w.length && (has(V_ADD, w[0]) || has(V_REMOVE, w[0]) || has(V_REDUCE, w[0]) || isNumTok(w[0])); }

  /* ---------- normalisasi ---------- */
  function deaccent(s) { try { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { return String(s); } }
  function clean(s) {
    s = deaccent(String(s == null ? '' : s).toLowerCase());
    s = s.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2');          // 1.000 → 1000
    s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
  }
  function toks(s) { s = clean(s); return s ? s.split(' ') : []; }

  /* ---------- angka (kata & digit) ---------- */
  function isNumTok(t) {
    return /^\d+$/.test(t) || /^\d+x$/.test(t) || /^x\d+$/.test(t) || t in UNITS || t in TEENS || t in TENS || t in MULT;
  }
  /* baca angka mulai indeks i; kembalikan {n, len} atau null */
  function readNum(t, i) {
    var x = t[i];
    if (x === undefined) return null;
    var m = /^(\d+)x$|^x(\d+)$/.exec(x);
    if (m) return { n: +(m[1] || m[2]), len: 1 };
    if (/^\d+$/.test(x)) return { n: +x, len: 1 };
    if (!(x in UNITS || x in TEENS || x in TENS || x in MULT)) return null;
    var acc = 0, u = 0, j = i, used = false;
    for (; j < t.length; j++) {
      var w = t[j];
      if (w === 'se' && t[j + 1] in MULT) { u = 1; used = true; continue; }
      if (w in TEENS) { if (u) break; acc += TEENS[w]; used = true; continue; }
      if (w in TENS) { if (u || acc % 100 >= 10) break; acc += TENS[w]; used = true; continue; }
      if (w in UNITS && w !== 'se') {
        var v = UNITS[w];
        if (u) break;
        if (acc > 0 && acc % 10 === 0 && acc % 100 !== 0 && !(j > i && t[j - 1] in MULT && t[j - 1] !== 'puluh')) { acc += v; used = true; continue; }
        if (acc > 0 && acc % 100 === 0) { u = v; used = true; continue; }
        u = v; used = true; continue;
      }
      if (w === 'belas') { if (!u && !acc) break; acc += 10 + u; u = 0; used = true; continue; }
      if (w === 'puluh') { acc += (u || 1) * 10; u = 0; used = true; continue; }
      if (w === 'ratus' || w === 'hundred') { acc += (u || 1) * 100; u = 0; used = true; continue; }
      break;
    }
    if (!used) return null;
    return { n: acc + u, len: j - i };
  }

  /* ---------- pencocokan nama menu ---------- */
  function normTok(w) { return SYN[w] || w; }
  var NT_CACHE = {}, NT_N = 0;
  function nameToks(s) {
    var k = String(s); if (NT_CACHE[k]) return NT_CACHE[k];
    var v = toks(s).map(normTok).filter(function (w) { return w && !FILLER[w]; });
    if (NT_N > 5000) { NT_CACHE = {}; NT_N = 0; } NT_CACHE[k] = v; NT_N++; return v;
  }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var p = [], c = [], i, j;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) {
      c[0] = i;
      for (j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      var t = p; p = c; c = t;
    }
    return p[n];
  }
  /* kemiripan satu kata (0..1) */
  function tokSim(q, t) {
    if (q === t) return 1;
    var L = Math.max(q.length, t.length);
    if (q.length >= 3 && t.length >= 3 && (t.indexOf(q) === 0 || q.indexOf(t) === 0)) return 0.9;
    if (L < 4) return 0;
    var d = lev(q, t), lim = L <= 6 ? 1 : 2;
    return d <= lim ? 1 - d / (L + 1) : 0;
  }
  /* skor kecocokan kueri terhadap satu nama menu */
  function scoreName(Q, T) {
    if (!Q.length || !T.length) return 0;
    var qs = Q.slice().sort().join(' '), ts = T.slice().sort().join(' ');
    if (qs === ts) return 1;
    var used = {}, tot = 0, i, j;
    for (i = 0; i < Q.length; i++) {
      var best = 0, bj = -1;
      for (j = 0; j < T.length; j++) { if (used[j]) continue; var s = tokSim(Q[i], T[j]); if (s > best) { best = s; bj = j; } }
      if (bj > -1 && best > 0) { used[bj] = 1; tot += best; }
    }
    var qCover = tot / Q.length, tCover = tot / T.length;
    if (qCover >= 0.99) return 0.8 + 0.18 * tCover;            // semua kata kueri ada di nama menu
    if (tCover >= 0.99) return 0.7 * qCover + 0.2;              // nama menu penuh disebut, ada kata lebih
    return 0.65 * qCover * (0.5 + 0.5 * tCover);
  }
  /* kembalikan {item, score, alts[]} dari daftar item */
  function matchItem(phrase, items) {
    var Q = nameToks(phrase);
    if (!Q.length) return { item: null, score: 0, alts: [] };
    var sc = [];
    items.forEach(function (it) {
      var s = scoreName(Q, nameToks(it.name));
      if (s > 0) sc.push({ item: it, score: s });
    });
    sc.sort(function (a, b) { return b.score - a.score; });
    var top = sc[0];
    if (!top || top.score < 0.55) return { item: null, score: top ? top.score : 0, alts: sc.slice(0, 4).filter(function (x) { return x.score >= 0.4; }).map(function (x) { return x.item; }) };
    var close = sc.filter(function (x) { return x.item !== top.item && top.score - x.score < 0.08 && top.score < 1; });
    return { item: close.length ? null : top.item, score: top.score, alts: close.length ? [top.item].concat(close.slice(0, 3).map(function (x) { return x.item; })) : [] };
  }

  /* ---------- parser perintah ---------- */
  var SEPW = { dan: 1, lalu: 1, kemudian: 1, terus: 1, then: 1, and: 1, sama: 1, plus: 1, serta: 1, n: 1, also: 1, dengan: 1 };
  var SEP = /\s+(?:dan|sama|serta|lalu|kemudian|terus|plus|and|then|also|dengan|n)\s+|\s*,\s*/;

  function detectMethod(n) { for (var i = 0; i < METHODS.length; i++) if (METHODS[i][0].test(n)) return METHODS[i][1]; return null; }

  /* "dua nasi goreng tiga mie goreng" atau "nasi goreng 2 mie goreng 3" → beberapa segmen (tanpa kata sambung) */
  function splitQty(w) {
    var g = [], i = 0;
    while (i < w.length) {
      var r = readNum(w, i);
      if (r) { var e = i + r.len; if (UNIT_WORDS[w[e]]) e++; g.push({ s: i, e: e }); i = e; } else i++;
    }
    if (g.length < 2) return [w];
    var parts = [], k;
    if (g[0].s === 0) { for (k = 0; k < g.length; k++) parts.push(w.slice(g[k].s, k + 1 < g.length ? g[k + 1].s : w.length)); }
    else { var st = 0; g.forEach(function (x) { parts.push(w.slice(st, x.e)); st = x.e; }); if (st < w.length) parts.push(w.slice(st)); }
    return parts.filter(function (x) { return x.length; });
  }
  /* ubah satu segmen "[jumlah] nama [jumlah]" → {qty, explicit, name} */
  function parseSeg(words) {
    var t = words.filter(function (w) { return !FILLER[w] || w === 'a' && false; });
    var out = [], qty = null, i = 0, n;
    // jumlah di depan
    n = readNum(t, 0);
    if (n) { qty = n.n; i = n.len; if (UNIT_WORDS[t[i]]) i++; }
    var rest = t.slice(i);
    // jumlah di belakang ("nasi goreng dua", "nasi goreng 2 porsi")
    if (qty === null) {
      for (var k = rest.length - 1; k >= 1; k--) {
        var r = readNum(rest, k);
        if (r && k + r.len === rest.length || r && UNIT_WORDS[rest[k + r.len]] && k + r.len + 1 === rest.length) { qty = r.n; rest = rest.slice(0, k); break; }
      }
    }
    rest = rest.filter(function (w) { return !UNIT_WORDS[w] || rest.length === 1; });
    return { qty: qty === null ? 1 : qty, explicit: qty !== null, name: rest.join(' ') };
  }

  /* parse satu ucapan → {intent, ...} */
  function parse(text) {
    lload();
    var n = clean(text);
    if (!n) return { intent: 'empty' };
    var T = n.split(' ');

    // jawaban konfirmasi
    if (/^(ya|iya|yes|yup|ok|oke|okay|betul|benar|boleh|setuju|confirm|konfirmasi|sure|ya betul|baik)$/.test(n)) return { intent: 'yes' };
    if (/^(tidak|nggak|gak|ga|no|nope|jangan|batal|tak|tidak jadi|ga jadi|cancel)$/.test(n)) return { intent: 'no' };

    // tutup panel
    if (/^(tutup|close|selesai bicara|stop|berhenti|keluar suara|tutup suara)$/.test(n)) return { intent: 'close' };

    // keranjang kosongkan
    if (/\b(kosongkan|bersihkan|clear|empty|reset|kosongkan)\b/.test(n) && /\b(keranjang|cart|pesanan|order|troli|bakul|semua|all|basket)\b/.test(n)) return { intent: 'clear' };
    if (/\b(hapus|buang|batalkan|remove|delete|padam|cancel)\b/.test(n) && /\b(semua|semuanya|all|everything|keseluruhan)\b/.test(n)) return { intent: 'clear' };

    // tampilkan keranjang
    if (/\b(tampilkan|tunjukkan|tunjuk|lihat|buka|show|view|open|papar|display|cek|periksa|check|baca)\b/.test(n) && /\b(keranjang|cart|pesanan|order|troli|bakul|basket|isi)\b/.test(n)) return { intent: 'cart' };
    if (/^(keranjang|cart|troli|bakul|basket|isi keranjang)$/.test(n)) return { intent: 'cart' };

    // total
    if (/\b(berapa|how much|total|jumlah bayar|jumlah semua|jumlah keseluruhan|tagihan|bill|amount due|grand total|harganya|harga semua|semua berapa|all together|altogether|berapa semuanya)\b/.test(n) && !startsWithVerb(T)) return { intent: 'total' };

    // catatan
    var mn = /^(?:tambah(?:kan)?\s+)?(?:catatan|catat|note|notes|nota)\s+(.+)$/.exec(n);
    if (mn) return { intent: 'note', text: mn[1] };

    // konfirmasi / uang pas (saat layar bayar sudah terbuka)
    if (/^(uang pas|pas|exact|exact amount|wang pas)$/.test(n)) return { intent: 'exact' };
    if (/^(konfirmasi pembayaran|konfirmasi bayar|proses|process|bayar sekarang|confirm payment|selesaikan pembayaran|sudah dibayar|done)$/.test(n)) return { intent: 'confirmpay' };
    // buka layar bayar saja
    if (/^(?:buka|open|tampilkan|show|ke)\s+(?:layar|halaman|menu)?\s*(?:pembayaran|bayar|payment|bayaran)\b/.test(n) || /^(pembayaran|payment|selesai|selesaikan|proses bayar|lanjut bayar|lanjutkan pembayaran)$/.test(n)) {
      var oc = parsePayClause(T); return { intent: 'pay', method: oc.method, amount: oc.amount, exact: oc.exact, direct: false };
    }
    // bayar: "bayar tunai lima puluh ribu", "tambah 2 nasi goreng bayar qris"
    var pv = -1;
    for (var pi = 0; pi < T.length; pi++) { if (PAYV[T[pi]]) { pv = pi; break; } }
    if (pv >= 0) {
      var pc = parsePayClause(T.slice(pv + 1)), left = T.slice(0, pv);
      while (left.length && (SEPW[left[left.length - 1]] || FILLER[left[left.length - 1]])) left.pop();
      var payI = { intent: 'pay', method: pc.method, amount: pc.amount, exact: pc.exact, direct: true };
      if (leftOk(left)) { var lp = parse(left.join(' ')); if (lp.intent === 'add' || lp.intent === 'remove' || lp.intent === 'reduce') return { intent: 'seq', parts: [lp, payI] }; }
      return payI;
    }
    // uang diterima: "uang diterima lima puluh ribu", "customer paid fifty"
    if (/\b(diterima|terima|menerima|received|tendered|paid|dibayar|dikasih|dikasi|kasih|memberi|gave|given|wang diterima)\b/.test(n)) {
      var tc = parsePayClause(T);
      if (tc.amount !== null) return { intent: 'tender', amount: tc.amount, method: tc.method || 'Tunai' };
    }

    // verba utama
    var verb = null, vi = 0;
    for (var i = 0; i < Math.min(T.length, 4); i++) {
      var w = T[i];
      if (has(V_SET, w)) { verb = 'set'; vi = i + 1; break; }
      if (has(V_REDUCE, w)) { verb = 'reduce'; vi = i + 1; break; }
      if (has(V_REMOVE, w)) { verb = 'remove'; vi = i + 1; break; }
      if (has(V_ADD, w)) { verb = 'add'; vi = i + 1; break; }
      if (!FILLER[w] && !(w in UNITS) && !/^\d+$/.test(w) && i === 0 && !has(V_ADD.concat(V_SET, V_REDUCE, V_REMOVE), w)) break;
    }
    var body = T.slice(vi).join(' ');

    if (verb === 'set') {
      // "ubah jumlah [menu] menjadi N" / "jadikan N" / "set [menu] to N"
      var s = body.replace(/\b(jumlah|kuantitas|kuantiti|quantity|qty|banyak|banyaknya|amount)\b/g, ' ').replace(/\b(menjadi|jadi|ke|kepada|to|into|become)\b/g, ' | ').replace(/\s+/g, ' ').trim();
      var parts = s.split('|').map(function (x) { return x.trim(); }).filter(Boolean);
      var numPart = null, namePart = '';
      parts.forEach(function (p) { var q = readNum(p.split(' '), 0); if (q && q.len === p.split(' ').length) numPart = q.n; else namePart += ' ' + p; });
      if (numPart === null) {                                  // "jadikan nasi goreng 4"
        var sg = parseSeg(s.split(' '));
        if (sg.explicit) { numPart = sg.qty; namePart = sg.name; }
      }
      if (numPart === null) return { intent: 'unknown', text: n };
      return { intent: 'set', qty: numPart, name: namePart.trim() };
    }

    var segs = body.split(SEP).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!segs.length && verb) return { intent: 'unknown', text: n };
    if (!verb) {                                                // tanpa kata kerja: "dua nasi goreng" = tambah
      segs = n.split(SEP).map(function (x) { return x.trim(); }).filter(Boolean);
      verb = 'add';
    }
    var lines = [];
    segs.forEach(function (sg) {
      var w0 = sg.split(' '), v = null;
      // segmen dengan kata kerja sendiri ("tambah 2 kopi dan hapus teh")
      if (has(V_REDUCE, w0[0])) v = 'reduce'; else if (has(V_REMOVE, w0[0])) v = 'remove'; else if (has(V_ADD, w0[0])) v = 'add';
      if (v) w0 = w0.slice(1);
      splitQty(w0.filter(function (x) { return !FILLER[x]; })).forEach(function (w) {
        var p = parseSeg(w);
        if (p.name) { if (v) p.v = v; lines.push(p); }
      });
    });
    if (!lines.length) return { intent: 'unknown', text: n };
    return { intent: verb, lines: lines };
  }
  function startsWithVerb(T) { var w = T[0]; return has(V_ADD, w) || has(V_REMOVE, w) || has(V_SET, w) || has(V_REDUCE, w); }

  /* ---------- pesan multi-bahasa ---------- */
  var MSG = {
    id: { listen: 'Mendengarkan…', proc: 'Memproses…', idle: 'Ketuk mikrofon, lalu bicara', nosr: 'Perangkat ini belum mendukung pengenalan suara. Ketik perintah di bawah, atau pakai mikrofon di keyboard.',
      added: 'Ditambah', removed: 'Dikurangi', removedAll: 'Dihapus', set: 'Jumlah diubah', notfound: 'Menu tidak ditemukan', ambiguous: 'Maksud Anda yang mana?', total: 'Total pesanan', empty: 'Keranjang kosong', cart: 'Keranjang dibuka',
      stock: 'Stok tidak cukup', nomatch: 'Perintah belum dipahami. Contoh: “tambah dua nasi goreng”', notInCart: 'Menu itu belum ada di keranjang', noLast: 'Sebut nama menu yang diubah', mods: 'Menu ini punya pilihan, lengkapi di layar',
      clearAsk: 'Kosongkan keranjang? Ucapkan “ya”.', payOff: 'Pembayaran lewat suara dinonaktifkan di pengaturan', confirmOff: 'Selesaikan pembayaran dengan tombol Bayar. Suara dinonaktifkan di pengaturan.', cleared: 'Keranjang dikosongkan', cancelled: 'Dibatalkan', pay: 'Pembayaran dibuka', payNeed: 'Keranjang masih kosong', confirmNo: 'Buka layar pembayaran dulu', exact: 'Uang pas diisi', noted: 'Catatan disimpan',
      denied: 'Izin mikrofon ditolak. Izinkan di pengaturan peramban.', nospeech: 'Tidak ada suara terdengar. Coba lagi.', neterr: 'Pengenalan suara perlu koneksi internet.', err: 'Pengenalan suara gagal. Coba lagi atau ketik perintah.', each: 'item', hint: 'Coba: “tambah dua nasi goreng”, “berapa total?”', speakOn: 'Suara balasan', typeHolder: 'Ketik perintah…', send: 'Kirim', close: 'Tutup', mic: 'Perintah suara', heard: 'Terdengar', unsold: 'Menu tidak dijual' },
    en: { listen: 'Listening…', proc: 'Processing…', idle: 'Tap the mic, then speak', nosr: 'Speech recognition is not supported on this device. Type a command below, or use the keyboard microphone.',
      added: 'Added', removed: 'Reduced', removedAll: 'Removed', set: 'Quantity changed', notfound: 'Item not found', ambiguous: 'Which one did you mean?', total: 'Order total', empty: 'Cart is empty', cart: 'Cart opened',
      stock: 'Not enough stock', nomatch: 'Command not understood. Example: “add two fried rice”', notInCart: 'That item is not in the cart', noLast: 'Say which item to change', mods: 'This item has options, finish on screen',
      clearAsk: 'Clear the cart? Say “yes”.', payOff: 'Voice payment is turned off in settings', confirmOff: 'Finish payment with the Pay button. Voice is turned off in settings.', cleared: 'Cart cleared', cancelled: 'Cancelled', pay: 'Payment opened', payNeed: 'The cart is empty', confirmNo: 'Open the payment screen first', exact: 'Exact amount filled', noted: 'Note saved',
      denied: 'Microphone permission denied. Allow it in browser settings.', nospeech: 'No speech heard. Try again.', neterr: 'Speech recognition needs an internet connection.', err: 'Speech recognition failed. Try again or type the command.', each: 'items', hint: 'Try: “add two fried rice”, “what is the total?”', speakOn: 'Spoken replies', typeHolder: 'Type a command…', send: 'Send', close: 'Close', mic: 'Voice command', heard: 'Heard', unsold: 'Item not for sale' },
    ms: { listen: 'Mendengar…', proc: 'Memproses…', idle: 'Ketik mikrofon, kemudian cakap', nosr: 'Peranti ini tidak menyokong pengecaman suara. Taip arahan di bawah, atau guna mikrofon papan kekunci.',
      added: 'Ditambah', removed: 'Dikurangkan', removedAll: 'Dipadam', set: 'Kuantiti diubah', notfound: 'Menu tidak dijumpai', ambiguous: 'Yang mana satu?', total: 'Jumlah pesanan', empty: 'Bakul kosong', cart: 'Bakul dibuka',
      stock: 'Stok tidak mencukupi', nomatch: 'Arahan tidak difahami. Contoh: “tambah dua nasi goreng”', notInCart: 'Menu itu belum ada dalam bakul', noLast: 'Sebut nama menu yang hendak diubah', mods: 'Menu ini ada pilihan, lengkapkan di skrin',
      clearAsk: 'Kosongkan bakul? Sebut “ya”.', payOff: 'Pembayaran melalui suara dimatikan dalam tetapan', confirmOff: 'Selesaikan pembayaran dengan butang Bayar. Suara dimatikan dalam tetapan.', cleared: 'Bakul dikosongkan', cancelled: 'Dibatalkan', pay: 'Pembayaran dibuka', payNeed: 'Bakul masih kosong', confirmNo: 'Buka skrin pembayaran dahulu', exact: 'Wang pas diisi', noted: 'Catatan disimpan',
      denied: 'Kebenaran mikrofon ditolak. Benarkan dalam tetapan pelayar.', nospeech: 'Tiada suara didengar. Cuba lagi.', neterr: 'Pengecaman suara memerlukan sambungan internet.', err: 'Pengecaman suara gagal. Cuba lagi atau taip arahan.', each: 'item', hint: 'Cuba: “tambah dua nasi goreng”, “berapa jumlah?”', speakOn: 'Suara balasan', typeHolder: 'Taip arahan…', send: 'Hantar', close: 'Tutup', mic: 'Arahan suara', heard: 'Didengar', unsold: 'Menu tidak dijual' }
  };
  var EXTRA = {
    id: { bigAsk: 'jumlah besar, ucapkan “ya” untuk menambah', short: 'Uang kurang', paid: 'Lunas', change: 'Kembalian', received: 'Diterima', wakeNeed: 'Sebut “Ordela” di awal kalimat untuk membayar', seqStop: 'Periksa pesanan dulu, belum dibayar', permNeed: 'Ketuk layar sekali untuk mengaktifkan mikrofon', ready: 'Ya, silakan', live: 'Selalu mendengarkan' },
    en: { bigAsk: 'large quantity, say “yes” to add', short: 'Not enough cash', paid: 'Paid', change: 'Change', received: 'Received', wakeNeed: 'Say “Ordela” first to pay', seqStop: 'Check the order first, not paid yet', permNeed: 'Tap the screen once to enable the microphone', ready: 'Yes, go ahead', live: 'Always listening' },
    ms: { bigAsk: 'kuantiti besar, sebut “ya” untuk tambah', short: 'Wang tidak cukup', paid: 'Selesai', change: 'Baki', received: 'Diterima', wakeNeed: 'Sebut “Ordela” dahulu untuk membayar', seqStop: 'Semak pesanan dahulu, belum dibayar', permNeed: 'Ketik skrin sekali untuk mengaktifkan mikrofon', ready: 'Ya, sila', live: 'Sentiasa mendengar' }
  };
  Object.keys(EXTRA).forEach(function (l) { Object.keys(EXTRA[l]).forEach(function (k) { MSG[l][k] = EXTRA[l][k]; }); });
  var BIGQTY = 50;
  var SRLANG = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

  var API = { readMoney: readMoney, parse: parse, matchItem: matchItem, readNum: readNum, clean: clean, nameToks: nameToks, scoreName: scoreName, MSG: MSG, SRLANG: SRLANG };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof window === 'undefined') return;

  /* =====================================================================
     Bagian peramban: UI + SpeechRecognition + integrasi keranjang Ordela
     ===================================================================== */
  var S0 = root;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  var st = { open: false, listening: false, rec: null, lang: 'id', speak: true, last: null, pending: null, busy: false, timer: 0, heard: '' };
  try { st.speak = localStorage.getItem('ordela_vc_speak') !== '0'; } catch (e) { /* abaikan */ }
  function pickLang() { var l = null; try { l = localStorage.getItem('ordela_vc_lang'); } catch (e) { /* abaikan */ } if (l && MSG[l]) return l; var cl = cfg().lang; if (MSG[cl]) return cl; try { if (typeof lang === 'function' && MSG[lang()]) return lang(); } catch (e) { /* abaikan */ } return 'id'; }
  st.lang = pickLang();

  var LM = {
    id: { learned: 'Diingat', pttHint: 'Tahan, bicara, lepas', aiAsk: 'Menanyakan AI…', wakeMiss: 'Diabaikan, awali dengan', searchMenu: 'Cari menu…', vAdd: 'Tambah', vRemove: 'Hapus', vReduce: 'Kurangi' },
    en: { learned: 'Remembered', pttHint: 'Hold, speak, release', aiAsk: 'Asking AI…', wakeMiss: 'Ignored, start with', searchMenu: 'Search menu…', vAdd: 'Add', vRemove: 'Remove', vReduce: 'Reduce' },
    ms: { learned: 'Diingati', pttHint: 'Tahan, cakap, lepas', aiAsk: 'Bertanya AI…', wakeMiss: 'Diabaikan, mulakan dengan', searchMenu: 'Cari menu…', vAdd: 'Tambah', vRemove: 'Padam', vReduce: 'Kurangkan' }
  };
  Object.keys(LM).forEach(function (l) { Object.keys(LM[l]).forEach(function (k) { MSG[l][k] = LM[l][k]; }); });
  function cfg() { var c = (typeof db !== 'undefined' && db.set && db.set.vc) || {}; return { on: c.on !== 0 && c.on !== false, lang: c.lang || 'auto', speak: c.speak !== 0 && c.speak !== false, pay: c.pay !== 0 && c.pay !== false, confirm: c.confirm === 1 || c.confirm === true, al: Array.isArray(c.al) ? c.al : [], always: c.always === 1 || c.always === true, wake: c.wake !== 0 && c.wake !== false, wakeWord: String(c.wakeWord || 'ordela'), direct: c.direct !== 0 && c.direct !== false, learn: c.learn !== 0 && c.learn !== false, ai: c.ai !== 0 && c.ai !== false, fab: c.fab !== 0 && c.fab !== false }; }
  function M(k) { return (MSG[st.lang] || MSG.id)[k] || MSG.id[k] || ''; }
  function money2(v) { return typeof money === 'function' ? money(v) : String(v); }
  function sellable() { return (typeof db !== 'undefined' && db.items ? db.items : []).filter(function (i) { return !i.ns; }); }
  function bidOf(k) { return typeof bid === 'function' ? bid(k) : String(k).split('@')[0]; }
  function linesOf(id) { return Object.keys(S.cart).filter(function (k) { return bidOf(k) === id; }); }
  function qtyOf(id) { return linesOf(id).reduce(function (a, k) { return a + (S.cart[k] || 0); }, 0); }

  /* ---------- aksi keranjang (memakai fungsi Ordela yang ada) ---------- */
  function actAdd(it, qty) {
    var hasM = typeof hasMods === 'function' && hasMods(it);
    if (it.stock <= 0) return { ok: false, msg: it.name + ': ' + M('stock') };
    if (hasM) {                                              // menu berpilihan: buka form pilihan dengan jumlah terisi
      S.pop = { id: it.id, q: Math.max(1, qty), info: false, sel: {} };
      if (typeof popForm === 'function') popForm(false);
      return { ok: true, msg: it.name + ' · ' + M('mods'), warn: true };
    }
    var before = qtyOf(it.id);
    chg(it.id, qty);
    var got = qtyOf(it.id) - before;
    if (got <= 0) return { ok: false, msg: it.name + ': ' + M('stock') };
    st.last = it.id;
    return { ok: true, msg: M('added') + ' ' + got + '× ' + it.name + (got < qty ? ' (' + M('stock').toLowerCase() + ')' : ''), warn: got < qty };
  }
  function actReduce(it, qty, all) {
    var ks = linesOf(it.id);
    if (!ks.length) return { ok: false, msg: it.name + ': ' + M('notInCart') };
    var have = qtyOf(it.id), left = all ? have : Math.min(qty, have), done = left;
    while (left > 0 && ks.length) {
      var k = ks[ks.length - 1], c = S.cart[k] || 0, d = Math.min(c, left);
      chg(k, -d); left -= d;
      if (!S.cart[k]) ks.pop();
    }
    st.last = qtyOf(it.id) > 0 ? it.id : null;
    return { ok: true, msg: (qtyOf(it.id) > 0 ? M('removed') + ' ' + done + '× ' : M('removedAll') + ' ') + it.name };
  }
  function actSet(it, qty) {
    var ks = linesOf(it.id);
    if (!ks.length) return qty > 0 ? actAdd(it, qty) : { ok: false, msg: it.name + ': ' + M('notInCart') };
    var k = ks[ks.length - 1], cur = S.cart[k] || 0;
    // jika ada beberapa varian, jumlah total dipusatkan di baris terakhir
    var others = ks.slice(0, -1).reduce(function (a, x) { return a + (S.cart[x] || 0); }, 0);
    var want = Math.max(0, qty - others);
    chg(k, want - cur);
    var now = qtyOf(it.id);
    st.last = now > 0 ? it.id : null;
    return { ok: true, msg: M('set') + ': ' + it.name + ' × ' + now, warn: now !== qty };
  }

  /* ---------- belajar dari koreksi (per perangkat & per toko, tanpa AI) ---------- */
  var LS = null, LSK = '', LV = { add: V_ADD, remove: V_REMOVE, reduce: V_REDUCE };
  function lkey() {
    var s = ''; try { s = (typeof CL !== 'undefined' && CL.me && (CL.me.store_id || CL.me.sid)) || (typeof storeId !== 'undefined' && storeId) || ''; } catch (e) { /* abaikan */ }
    return 'ordela_vcl_' + s;
  }
  var LSrc = null, saveT = 0;
  function lnorm(d) { d = d && typeof d === 'object' ? d : {}; d.al = d.al || {}; d.use = d.use || {}; d.vw = d.vw || {}; d.miss = d.miss || {}; return d; }
  /* sumber utama: db.set.vcl (ikut tersinkron ke semua perangkat toko); cadangan: localStorage perangkat ini */
  function lload() {
    var k = lkey(), dbs = (typeof db !== 'undefined' && db.set) ? db.set : null;
    if (LS && LSK === k && (!dbs || LSrc === dbs.vcl)) return LS;
    LSK = k;
    if (dbs && dbs.vcl && typeof dbs.vcl === 'object') LS = lnorm(dbs.vcl);
    else { var d = null; try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { d = null; } LS = lnorm(d); }
    LSrc = dbs ? (dbs.vcl && typeof dbs.vcl === 'object' ? dbs.vcl : null) : null;
    applyVerbs(); return LS;
  }
  function lsave() {
    try { localStorage.setItem(LSK, JSON.stringify(LS)); } catch (e) { /* abaikan */ }
    if (typeof db === 'undefined' || !db.set) return;
    var u = Object.keys(LS.use).sort(function (a, b) { return LS.use[b] - LS.use[a]; }).slice(200); u.forEach(function (x) { delete LS.use[x]; });
    db.set.vcl = LS; LSrc = LS;
    clearTimeout(saveT); saveT = setTimeout(function () { try { if (typeof save === 'function') save(); } catch (e) { /* abaikan */ } }, 3000);
  }
  function learnOn() { return !!cfg().learn; }
  function akey(ph) { return nameToks(ph).slice().sort().join(' '); }
  function applyVerbs() { Object.keys(LS.vw).forEach(function (w) { var a = LV[LS.vw[w]]; if (a && !has(a, w)) a.push(w); }); }
  function learnAlias(ph, id, amb) {
    if (!learnOn()) return; var L = lload(), k = akey(ph); if (!k) return;
    var e = L.al[k];
    if (e && e.id === id) { e.n++; e.t = Date.now(); if (!amb) e.amb = 0; } else L.al[k] = { id: id, n: 1, amb: amb ? 1 : 0, p: String(ph).slice(0, 60), t: Date.now() };
    delete L.miss[k];
    var ks = Object.keys(L.al); if (ks.length > 300) { ks.sort(function (a, b) { return L.al[a].t - L.al[b].t; }); delete L.al[ks[0]]; }
    lsave();
  }
  function noteUse(id) { if (!learnOn()) return; var L = lload(); L.use[id] = (L.use[id] || 0) + 1; lsave(); }
  function noteMiss(ph) {
    if (!learnOn()) return; var L = lload(), k = akey(ph); if (!k || L.al[k]) return;
    var e = L.miss[k] || { p: String(ph).slice(0, 60), n: 0 }; e.n++; e.t = Date.now(); L.miss[k] = e;
    var ks = Object.keys(L.miss); if (ks.length > 40) { ks.sort(function (a, b) { return L.miss[a].t - L.miss[b].t; }); delete L.miss[ks[0]]; }
    lsave();
  }
  function learnVerb(w, intent) { if (!learnOn() || !LV[intent] || !/^[a-z]{3,}$/.test(w)) return; var L = lload(); L.vw[w] = intent; applyVerbs(); lsave(); }
  function learnedItem(name, items) {
    if (!learnOn()) return null;
    var L = lload(), k = akey(name), e = L.al[k], Q = nameToks(name);
    if (!e || (e.amb && e.n < 2)) { e = null; var best = 0; Object.keys(L.al).forEach(function (kk) { var a = L.al[kk]; if (a.amb && a.n < 2) return; var s = scoreName(Q, kk.split(' ')); if (s >= 0.9 && s > best) { best = s; e = a; } }); }
    if (!e) return null;
    return items.filter(function (i) { return i.id === e.id; })[0] || null;
  }
  function popular(alts) {
    var L = lload(); if (!learnOn() || !alts || alts.length < 2) return null;
    var a = alts.slice().sort(function (x, y) { return (L.use[y.id] || 0) - (L.use[x.id] || 0); });
    var u1 = L.use[a[0].id] || 0, u2 = L.use[a[1].id] || 0;
    return u1 >= 3 && u1 >= 2 * u2 ? a[0] : null;
  }
  function topUsed(n) {
    var L = lload(); if (!learnOn()) return [];
    return sellable().filter(function (i) { return L.use[i.id]; }).sort(function (a, b) { return L.use[b.id] - L.use[a.id]; }).slice(0, n);
  }

  /* ---------- eksekusi hasil parse ---------- */
  function resolve(name) {
    var items = sellable(), key = clean(name), al = cfg().al;
    for (var ai = 0; ai < al.length; ai++) { if (al[ai] && clean(al[ai].a) === key) { var hit = items.filter(function (i) { return i.id === al[ai].id; })[0]; if (hit) return { item: hit, score: 1, alts: [] }; } }
    var li = learnedItem(name, items); if (li) return { item: li, score: 1, alts: [], learned: true };
    var r = matchItem(name, items);
    if (!r.item && r.alts.length > 1 && r.score >= 0.55) { var pp = popular(r.alts); if (pp) return { item: pp, score: r.score, alts: [], pop: true }; }
    if (!r.item && !r.alts.length) { var any = (db.items || []).filter(function (i) { return i.ns; }); var r2 = matchItem(name, any); if (r2.item) return { unsold: r2.item }; }
    return r;
  }
  /* gambar ulang UI sekali saja per kalimat, bukan sekali per item (menu ribuan tetap cepat) */
  function batched(fn) {
    var g = root.renderGrid, iv = root.renderInvoice, hg = 0, hi = 0;
    if (typeof g !== 'function' || typeof iv !== 'function') return fn();
    root.renderGrid = function () { hg = 1; }; root.renderInvoice = function () { hi = 1; };
    try { return fn(); }
    finally { root.renderGrid = g; root.renderInvoice = iv; if (hg) g(); if (hi) iv(); }
  }
  function run(p) { return batched(function () { return run0(p); }); }
  function run0(p) {
    var res = [], chips = null, show = null; st.unres = [];
    if (p.intent === 'empty') return { msg: M('hint') };
    if (p.intent === 'unknown') return { msg: M('nomatch'), warn: true, noop: true };
    if (p.intent === 'close') { setTimeout(closePanel, 50); return { msg: '' }; }
    if (p.intent === 'yes' || p.intent === 'no') {
      var pd = st.pending; st.pending = null;
      if (!pd) return { msg: M('nomatch'), warn: true };
      if (p.intent === 'no') return { msg: M('cancelled') };
      if (pd.kind === 'clear') { clearCart(); st.last = null; return { msg: M('cleared') }; }
      if (pd.kind === 'add') { var bi = find(pd.id); if (bi) { var ba = actAdd(bi, pd.qty); return { msg: ba.msg, warn: !ba.ok || ba.warn }; } }
      return { msg: M('cancelled') };
    }
    if (p.intent === 'clear') {
      if (!Object.keys(S.cart).length) return { msg: M('empty') };
      st.pending = { kind: 'clear' };
      return { msg: M('clearAsk'), warn: true };
    }
    if (p.intent === 'cart') { if (typeof toggleInv === 'function') toggleInv(true); return { msg: Object.keys(S.cart).length ? M('cart') + ' · ' + cartCount() + ' ' + M('each') + ' · ' + money2(calc().total) : M('empty') }; }
    if (p.intent === 'total') {
      if (!Object.keys(S.cart).length) return { msg: M('empty') };
      var c = calc();
      return { msg: M('total') + ': ' + money2(c.total), say: M('total') + ' ' + spokenMoney(c.total), big: true };
    }
    if (p.intent === 'note') {
      S.note = ((S.note ? S.note + ', ' : '') + p.text).slice(0, 120); if (typeof noteUI === 'function') noteUI();
      var ni = $('#pNote'); if (ni) ni.value = S.note;
      return { msg: M('noted') + ': ' + S.note };
    }
    if (p.intent === 'seq') {
      var r1 = run(p.parts[0]);
      if (r1.warn || r1.chips) { r1.msg = (r1.msg ? r1.msg + '\n' : '') + M('seqStop'); r1.warn = true; return r1; }
      var r2 = run(p.parts[1]); r2.msg = (r1.msg ? r1.msg + '\n' : '') + (r2.msg || ''); return r2;
    }
    if ((p.intent === 'pay' || p.intent === 'exact' || p.intent === 'tender') && !cfg().pay) return { msg: M('payOff'), warn: true };
    if (p.intent === 'confirmpay' && !cfg().confirm) return { msg: M('confirmOff'), warn: true };
    if (p.intent === 'pay') {
      if (!Object.keys(S.cart).length) return { msg: M('payNeed'), warn: true };
      if (p.direct && cfg().direct) return directPay(p);
      if (!$('#payOk')) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
      if (p.method && typeof setM === 'function' && $('#pM')) setM(p.method);
      if (p.amount != null && $('#pPaid')) { setM('Tunai'); quick(p.amount); }
      return { msg: M('pay') + (p.method ? ' · ' + p.method : '') + ' · ' + money2(calc().total) };
    }
    if (p.intent === 'tender') {
      if (!Object.keys(S.cart).length) return { msg: M('payNeed'), warn: true };
      if (!$('#payOk')) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
      setM(p.method || 'Tunai');
      var tt = payTotals(), chg = Math.round((p.amount - tt.payable) * 100) / 100;
      quick(p.amount);
      return chg >= 0 ? { msg: M('received') + ' ' + money2(p.amount) + ' · ' + M('change') + ' ' + money2(chg), say: M('received') + ' ' + spokenMoney(p.amount) + '. ' + M('change') + ' ' + spokenMoney(chg), big: true }
                      : { msg: M('short') + ': ' + money2(-chg), warn: true };
    }
    if (p.intent === 'exact') {
      if (!$('#payOk')) return { msg: M('confirmNo'), warn: true };
      if (typeof setM === 'function') setM('Tunai');
      if (typeof quick === 'function') quick(payTotals().payable);
      return { msg: M('exact') };
    }
    if (p.intent === 'confirmpay') {
      var ok = $('#payOk');
      if (!ok || ok.disabled) return { msg: M('confirmNo'), warn: true };
      closePanel(); ok.click();                                   // alur pembayaran Ordela yang sama dengan tombol
      return { msg: '' };
    }
    if (p.intent === 'set') {
      var it = null;
      if (p.name) { var r = resolve(p.name); if (r.unsold) return { msg: r.unsold.name + ': ' + M('unsold'), warn: true }; if (!r.item) { if (st.ctxMiss && !(r.alts && r.alts.length)) noteMiss(p.name); return ambiguous(r, p.name, p.qty, 'set'); } it = r.item; }
      else { var ids = []; Object.keys(S.cart).forEach(function (k) { var b = bidOf(k); if (ids.indexOf(b) < 0) ids.push(b); }); var id = st.last && qtyOf(st.last) > 0 ? st.last : (ids.length === 1 ? ids[0] : null); if (!id) return { msg: M('noLast'), warn: true }; it = find(id); }
      if (!it) return { msg: M('notfound'), warn: true };
      var a = actSet(it, p.qty); return { msg: a.msg, warn: !a.ok || a.warn };
    }
    // add / remove / reduce (boleh beberapa baris)
    var out = [], warn = false, hit = 0, allChips = [];
    for (var i = 0; i < p.lines.length; i++) {
      var ln = p.lines[i], lv = leadVerb(ln, p);
      if (lv) { allChips = allChips.concat(lv.chips); out.push(lv.msg); warn = true; continue; }
      var r = resolve(ln.name);
      if (r.unsold) { out.push(r.unsold.name + ': ' + M('unsold')); warn = true; continue; }
      if (!r.item) {
        if (r.alts && r.alts.length) { var amb = ambiguous(r, ln.name, ln.qty, ln.v || p.intent, ln.explicit); allChips = allChips.concat(amb.chips); out.push(amb.msg + ' “' + ln.name + '”'); warn = true; continue; }
        var vt = verbTeach(ln, p, p.lines[i + 1]);
        if (vt && vt.skip) i++;
        if (vt) { allChips = allChips.concat(vt.chips); out.push(vt.msg); warn = true; continue; }
        if (!(r.alts && r.alts.length)) st.unres.push({ name: ln.name, qty: ln.qty, intent: ln.v || p.intent, explicit: ln.explicit });
        if (st.ctxMiss) noteMiss(ln.name);
        var am2 = ambiguous(r, ln.name, ln.qty, ln.v || p.intent, ln.explicit);
        if (am2.chips) allChips = allChips.concat(am2.chips);
        out.push((am2.chips ? am2.msg + ' ' : M('notfound') + ': ') + '“' + ln.name + '”'); warn = true; continue;
      }
      var res2, vb = ln.v || p.intent;
      if (vb === 'add' && ln.qty > BIGQTY) { st.pending = { kind: 'add', id: r.item.id, qty: ln.qty }; out.push(ln.qty + '× ' + r.item.name + ' — ' + M('bigAsk')); warn = true; continue; }
      if (vb === 'add') { res2 = actAdd(r.item, ln.qty); if (res2.ok) noteUse(r.item.id); }
      else if (vb === 'reduce') res2 = actReduce(r.item, ln.qty, false);
      else res2 = actReduce(r.item, ln.qty, !ln.explicit);
      out.push(res2.msg); hit++; if (!res2.ok || res2.warn) warn = true;
    }
    return { msg: out.join('\n'), warn: warn, chips: allChips.length ? allChips.slice(0, 8) : null, noop: hit === 0 && !allChips.length };
  }
  /* bayar langsung: satu kalimat, tanpa menampilkan layar bayar (semua dalam satu tugas JS, tidak sempat tergambar) */
  function directPay(p) {
    if (st.paying) return { msg: '', noop: true };
    var m = p.method || 'Tunai', opened = !!$('#payOk');
    if (!opened) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
    if (!$('#payOk')) return { msg: M('err'), warn: true };
    setM(m);
    var t = payTotals(), paid = t.payable;
    if (m === 'Tunai' && !p.exact && p.amount != null) paid = p.amount;
    if (paid + 1e-9 < t.payable) { if (!opened) closeModal(); return { msg: M('short') + ': ' + money2(t.payable - paid), warn: true }; }
    var pi = $('#pPaid'); if (pi) pi.value = paid;
    payRefresh();
    var ok = $('#payOk');
    if (!ok || ok.disabled) { if (!opened) closeModal(); return { msg: M('err'), warn: true }; }
    st.paying = true; setTimeout(function () { st.paying = false; }, 1500);
    var n0 = db.orders.length;
    checkout();
    if (db.orders.length <= n0) { return { msg: M('err'), warn: true }; }
    var ch = Math.max(0, Math.round((paid - t.payable) * 100) / 100);
    st.last = null;
    setTimeout(function () { if (!st.listening) closePanel(); }, 2600);
    return { msg: M('paid') + ' · ' + m + ' · ' + money2(t.payable) + (m === 'Tunai' ? ' · ' + M('change') + ' ' + money2(ch) : ''),
      say: M('paid') + (m === 'Tunai' && ch > 0 ? '. ' + M('change') + ' ' + spokenMoney(ch) : ''), big: true, paid: true };
  }
  function ambiguous(r, name, qty, intent, explicit) {
    var alts = (r.alts || []).slice(0, 4), sug = !alts.length;
    if (sug) alts = topUsed(3);
    var base = { qty: qty, intent: intent, explicit: explicit, ph: name, amb: sug ? 0 : 1 };
    var chips = alts.map(function (it) { return { id: it.id, name: it.name, qty: qty, intent: intent, explicit: explicit, ph: name, amb: sug ? 0 : 1 }; });
    chips.push({ pick: 1, name: M('searchMenu'), qty: qty, intent: intent, explicit: explicit, ph: name, amb: 0 });
    return { msg: sug ? M('notfound') : M('ambiguous'), warn: true, chips: chips };
  }
  /* kata kerja tidak dikenal di depan kalimat ("tmbhin 2 kopi"): tawarkan untuk diajarkan */
  /* "tmbhn dua sate ayam": kata asing + angka + menu yang dikenal */
  function leadVerb(ln, p) {
    if (!learnOn() || ln.v || ln.explicit || p.intent !== 'add') return null;
    var w = clean(ln.name).split(' ');
    if (w.length < 3 || !/^[a-z]{3,}$/.test(w[0])) return null;
    var n = readNum(w, 1); if (!n || n.len >= w.length - 1) return null;
    var first = matchItem(w[0], sellable()); if (first.item || first.alts.length) return null;
    var r3 = resolve(w.slice(1 + n.len).join(' ')); if (!r3.item) return null;
    var mk = function (lab, t, x) { return { id: r3.item.id, name: lab, qty: n.n, intent: t, explicit: x, vw: w[0], plain: 1 }; };
    return { msg: '“' + w[0] + '” = ?  ' + n.n + '× ' + r3.item.name, chips: [mk(M('vAdd'), 'add', 0), mk(M('vRemove'), 'rm', 0), mk(M('vReduce'), 'rm', 1)] };
  }
  function verbTeach(ln, p, nx) {
    if (!learnOn() || ln.v || p.intent !== 'add') return null;
    var w = clean(ln.name).split(' '), word, rest, qty = ln.qty, skip = false;
    if (w.length >= 2) { word = w[0]; rest = w.slice(1).join(' '); }
    else if (w.length === 1 && ln.explicit && nx && !nx.explicit && !nx.v) { word = w[0]; rest = nx.name; skip = true; }   // "tmbhn dua sate ayam"
    else return null;
    if (!/^[a-z]{3,}$/.test(word)) return null;
    var r3 = resolve(rest); if (!r3.item) return null;
    var mk = function (lab, t, x) { return { id: r3.item.id, name: lab, qty: qty, intent: t, explicit: x, vw: word, plain: 1 }; };
    return { skip: skip, msg: '“' + word + '” = ?  ' + r3.item.name, chips: [mk(M('vAdd'), 'add', 0), mk(M('vRemove'), 'rm', 0), mk(M('vReduce'), 'rm', 1)] };
  }
  function cartCount() { return Object.keys(S.cart).reduce(function (a, k) { return a + (S.cart[k] || 0); }, 0); }
  function spokenMoney(v) { try { return new Intl.NumberFormat(SRLANG[st.lang] || 'id-ID', { maximumFractionDigits: 2 }).format(v); } catch (e) { return String(v); } }

  /* ---------- UI ---------- */
  var ICON_MIC = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  function ensureUI() {
    if ($('#vcP')) return;
    var p = document.createElement('div'); p.id = 'vcP'; p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-live', 'polite');
    p.innerHTML = '<div class="vc-h"><span class="vc-ind" id="vcInd" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><b id="vcSt"></b><span class="vc-sp"></span>' +
      '<div class="vc-lg" id="vcLg" role="group"></div><button type="button" class="vc-x" id="vcX" aria-label="Tutup">✕</button></div>' +
      '<div class="vc-tx" id="vcTx"></div><div class="vc-res" id="vcRes"></div><div class="vc-ch" id="vcCh"></div>' +
      '<form class="vc-f" id="vcF" autocomplete="off"><input class="fi" id="vcIn" enterkeyhint="send" autocapitalize="none" spellcheck="false"><button type="button" class="vc-go" id="vcMic2" aria-label="Mikrofon">' + ICON_MIC + '</button><button class="vc-send" type="submit" id="vcSend"></button></form>' +
      '<label class="vc-sw"><input type="checkbox" id="vcSpk"><span id="vcSpkL"></span></label>';
    document.body.appendChild(p);
    var tt = document.createElement('div'); tt.id = 'vcT'; tt.hidden = true; tt.setAttribute('role', 'status'); tt.setAttribute('aria-live', 'polite'); document.body.appendChild(tt);
    $('#vcX').onclick = closePanel;
    $('#vcF').onsubmit = function (e) { e.preventDefault(); var v = $('#vcIn').value; $('#vcIn').value = ''; submit(v); };
    $('#vcMic2').onclick = toggleListen;
    $('#vcSpk').onchange = function () { st.speak = this.checked; try { localStorage.setItem('ordela_vc_speak', this.checked ? '1' : '0'); } catch (e) { /* abaikan */ } if (!this.checked && root.speechSynthesis) root.speechSynthesis.cancel(); };
    $('#vcLg').onclick = function (e) { var b = e.target.closest('button[data-l]'); if (!b) return; st.lang = b.dataset.l; try { localStorage.setItem('ordela_vc_lang', st.lang); } catch (x) { /* abaikan */ } if (st.listening) stopListen(true); paint(); };
    $('#vcCh').onclick = function (e) {
      var b = e.target.closest('button[data-i],button[data-pk]'); if (!b) return;
      if (b.dataset.pk) { openPicker(b.dataset); return; }
      var it = find(b.dataset.i); if (!it) return;
      var q = +b.dataset.q || 1, a = b.dataset.t === 'add' ? actAdd(it, q) : b.dataset.t === 'set' ? actSet(it, q) : actReduce(it, q, b.dataset.x !== '1');
      var note = '';
      if (b.dataset.vw) { learnVerb(b.dataset.vw, b.dataset.t === 'add' ? 'add' : b.dataset.x === '1' ? 'reduce' : 'remove'); note = '\n' + M('learned') + ': “' + b.dataset.vw + '”'; }
      else if (b.dataset.ph && a.ok !== false && learnOn()) { learnAlias(b.dataset.ph, it.id, b.dataset.a === '1'); note = '\n' + M('learned') + ': “' + b.dataset.ph + '” = ' + it.name; }
      if (a.ok !== false && b.dataset.t === 'add') noteUse(it.id);
      $('#vcCh').innerHTML = ''; showResult({ msg: a.msg + note, warn: !a.ok || a.warn });
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.open) closePanel(); });
  }
  function injectMic() {
    var host = $('.pill.search'); if (!host || $('#vcMic')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'vcMic'; b.className = 'vc-mic'; b.innerHTML = ICON_MIC;
    b.setAttribute('aria-label', 'Perintah suara'); b.title = 'Perintah suara';
    b.onclick = function () { openPanel(true); };
    host.appendChild(b); applyCfg();
  }
  /* tombol suara melayang: tahan = bicara (lepas untuk selesai), ketuk = buka panel */
  function injectFab() {
    var host = $('#v-pos'); if (!host || $('#vcFab')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'vcFab'; b.className = 'vc-fab'; b.innerHTML = ICON_MIC + '<i class="vcw"></i>';
    b.setAttribute('aria-label', 'Perintah suara (tahan untuk bicara)'); b.title = M('pttHint');
    try { localStorage.removeItem('ordela_vc_fab'); } catch (e) { /* abaikan */ }   // posisi tetap (fitur geser dihapus)
    var timer = 0, down = false, held = false;
    b.oncontextmenu = function (e) { e.preventDefault(); };
    b.ondragstart = function (e) { e.preventDefault(); };
    b.onpointerdown = function (e) {
      if (!cfg().on) return; down = true; held = false;
      try { b.setPointerCapture(e.pointerId); } catch (x) { /* abaikan */ }
      b.classList.add('press');
      timer = setTimeout(function () {
        if (!down) return; held = true; if (!SR) { openPanel(false); return; }
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (x) { /* abaikan */ }
        st.ptt = true; st.pttHeld = true; st.pttAcc = []; b.classList.add('hold'); toastMsg('🎙 ' + M('pttHint'), false); startListen();
      }, 300);
    };
    var end = function () {
      if (!down) return; down = false; clearTimeout(timer); b.classList.remove('hold'); b.classList.remove('press');
      if (held) { held = false; st.pttHeld = false; if (st.ptt) stopListen(false); } else if (st.open) closePanel(); else openPanel(true);
    };
    b.onpointerup = end;
    b.onpointercancel = function () { if (!down) return; if (held && st.ptt) { down = false; held = false; st.pttHeld = false; b.classList.remove('hold'); b.classList.remove('press'); stopListen(false); } else end(); };
    host.appendChild(b); applyCfg();
  }
  function paint() {
    var p = $('#vcP'); if (!p) return;
    var fb = $('#vcFab'); if (fb) fb.classList.toggle('rec', st.listening);
    p.classList.toggle('on', st.listening);
    $('#vcSt').textContent = st.listening ? M('listen') : st.busy ? M('proc') : (SR ? M('idle') : M('nosr'));
    $('#vcIn').placeholder = M('typeHolder'); $('#vcSend').textContent = M('send');
    $('#vcSpkL').textContent = M('speakOn'); $('#vcSpk').checked = !!st.speak;
    $('#vcX').setAttribute('aria-label', M('close'));
    $('#vcMic2').hidden = !SR; $('#vcMic2').classList.toggle('rec', st.listening);
    $('#vcLg').innerHTML = ['id', 'en', 'ms'].map(function (l) { return '<button type="button" data-l="' + l + '" aria-pressed="' + (st.lang === l) + '">' + l.toUpperCase() + '</button>'; }).join('');
    var m = $('#vcMic'); if (m) { m.classList.toggle('rec', st.listening); m.setAttribute('aria-label', M('mic')); }
    if (!st.heard && !$('#vcRes').textContent) $('#vcRes').textContent = '';
  }
  function showResult(r) {
    if (!st.open && root.document && !st.listening) { if ((r.chips || []).length) openPanel(false); else if (r.msg) toastMsg(r.msg, !!r.warn); }
    var el = $('#vcRes'); el.textContent = r.msg || ''; el.classList.toggle('warn', !!r.warn); el.classList.toggle('big', !!r.big);
    var ch = $('#vcCh');
    ch.innerHTML = (r.chips || []).map(function (c) { return chipHtml(c); }).join('');
    if (r.msg && st.speak && cfg().speak && root.speechSynthesis && !st.listening) say(r.say || r.msg.split('\n')[0]);
  }
  function chipHtml(c) {
    var t = c.intent === 'add' ? 'add' : c.intent === 'set' ? 'set' : 'rm';
    if (c.pick) return '<button type="button" class="chip" data-pk="1" data-q="' + (c.qty || 1) + '" data-t="' + t + '" data-x="' + (c.explicit ? '1' : '0') + '" data-ph="' + esc(c.ph || '') + '">🔍 ' + esc(c.name) + '</button>';
    return '<button type="button" class="chip" data-i="' + esc(c.id) + '" data-q="' + (c.qty || 1) + '" data-t="' + t + '" data-x="' + (c.explicit ? '1' : '0') + '" data-ph="' + esc(c.plain ? '' : c.ph || '') + '" data-a="' + (c.amb ? '1' : '0') + '"' + (c.vw ? ' data-vw="' + esc(c.vw) + '"' : '') + '>' + (!c.vw && (c.qty || 1) > 1 ? esc(c.qty + '× ') : '') + esc(c.name) + '</button>';
  }
  function openPicker(ds) {
    var ch = $('#vcCh'); if (!ch) return;
    ch.innerHTML = '<input class="fi" id="vcPk" placeholder="' + esc(M('searchMenu')) + '" autocomplete="off" style="width:100%;margin-bottom:6px"><div id="vcPl"></div>';
    var fill = function () {
      var q = $('#vcPk').value, items = sellable(), list;
      if (q.trim()) { var Q = nameToks(q); list = items.map(function (i) { return { i: i, s: Math.max(scoreName(Q, nameToks(i.name)), clean(i.name).indexOf(clean(q)) > -1 ? 0.7 : 0) }; }).filter(function (x) { return x.s > 0.3; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.i; }); }
      else list = topUsed(8).concat(items).filter(function (i, k, a) { return a.indexOf(i) === k; });
      $('#vcPl').innerHTML = list.slice(0, 8).map(function (it) { return chipHtml({ id: it.id, name: it.name, qty: +ds.q || 1, intent: ds.t === 'add' ? 'add' : ds.t === 'set' ? 'set' : 'rm', explicit: ds.x === '1', ph: ds.ph, amb: 0 }); }).join('');
    };
    $('#vcPk').oninput = fill; fill(); $('#vcPk').focus();
  }
  function say(t) {
    try {
      var u = new SpeechSynthesisUtterance(String(t).replace(/[×·]/g, ' ')); u.lang = SRLANG[st.lang] || 'id-ID'; u.rate = 1.05;
      bgStop(); st.speaking = true;
      var done = function () { st.speaking = false; bg.pausedUntil = Date.now() + 250; };
      u.onend = done; u.onerror = done; setTimeout(function () { if (st.speaking) done(); }, Math.min(9000, 1500 + String(t).length * 90));
      root.speechSynthesis.cancel(); root.speechSynthesis.speak(u);
    } catch (e) { st.speaking = false; }
  }
  function applyCfg() {
    var on = cfg().on, fab = cfg().fab, m = $('#vcMic'); if (m) m.hidden = !on || fab;
    var f = $('#vcFab'); if (f) f.hidden = !on || !fab;
    if (!on && st.open) closePanel();
    if (!on && root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
  }
  function openPanel(autoListen) {
    if (!cfg().on) return;
    ensureUI();
    if (typeof S !== 'undefined' && S.view !== 'pos' && typeof go === 'function') { try { go('pos'); } catch (e) { /* abaikan */ } }
    var p = $('#vcP'); p.hidden = false; st.open = true; $('#vcTx').textContent = ''; $('#vcRes').textContent = ''; $('#vcCh').innerHTML = '';
    var mm = $('#vcMic'); if (mm) mm.setAttribute('aria-expanded', 'true');
    paint();
    if (autoListen && SR) startListen(); else if (!SR) { setTimeout(function () { try { $('#vcIn').focus(); } catch (e) { /* abaikan */ } }, 80); showResult({ msg: M('nosr') }); }
  }
  function closePanel() {
    stopListen(true); st.open = false; st.pending = null;
    var p = $('#vcP'); if (p) p.hidden = true;
    var mm = $('#vcMic'); if (mm) { mm.setAttribute('aria-expanded', 'false'); mm.classList.remove('rec'); }
    if (root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
  }
  function toggleListen() { if (st.listening) stopListen(false); else startListen(); }

  /* ---------- pengenalan suara ---------- */
  function startListen() {
    if (!SR) { showResult({ msg: M('nosr') }); return; }
    if (st.listening) return;
    bgStop(); bg.pausedUntil = Date.now() + 1200;
    if (root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
    var rec;
    try { rec = new SR(); } catch (e) { showResult({ msg: M('err'), warn: true }); return; }
    rec.lang = SRLANG[st.lang] || 'id-ID'; rec.continuous = !!st.ptt; rec.interimResults = true; rec.maxAlternatives = 3;
    var finalAlts = null, gotErr = false, acc = st.ptt ? (st.pttAcc = st.pttAcc || []) : [];
    rec.onstart = function () { st.listening = true; st.heard = ''; $('#vcTx').textContent = ''; paint(); };
    rec.onresult = function (ev) {
      var interim = '', fin = null;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) { fin = []; for (var j = 0; j < r.length; j++) fin.push(r[j].transcript); }
        else interim = r[0].transcript;
      }
      if (fin) { if (st.ptt) { acc[0] = mergeT(acc[0], fin[0]); finalAlts = [acc[0]]; } else finalAlts = fin; $('#vcTx').textContent = '“' + (st.ptt ? acc[0] : fin[0]) + '”'; }
      else $('#vcTx').textContent = '“' + (st.ptt ? mergeT(acc[0], interim) : interim) + '”';
      if (st.ptt && !st.open) toastMsg('🎙 ' + mergeT(acc[0], interim), false);
    };
    rec.onerror = function (ev) {
      gotErr = true; var e = ev && ev.error;
      if (st.ptt && st.pttHeld && (e === 'no-speech' || e === 'aborted')) { gotErr = false; return; }   // ditahan: jeda sunyi bukan galat
      st.listening = false; paint();
      if (e === 'not-allowed' || e === 'service-not-allowed') showResult({ msg: M('denied'), warn: true });
      else if (e === 'no-speech') showResult({ msg: M('nospeech'), warn: true });
      else if (e === 'network') showResult({ msg: M('neterr'), warn: true });
      else if (e !== 'aborted') showResult({ msg: M('err'), warn: true });
    };
    rec.onend = function () {
      if (st.ptt && st.pttHeld && !gotErr) {                         // peramban menghentikan sesi sendiri (jeda/batas waktu) padahal tombol masih ditahan: sambung lagi
        st.listening = false; st.rec = null; var keep = finalAlts; finalAlts = null; setTimeout(function () { if (st.ptt && st.pttHeld) startListen(); }, 60); return;
      }
      var wasPtt = st.ptt; st.ptt = false; st.pttHeld = false; if (wasPtt) bg.pausedUntil = Date.now() + 600;
      var ptAcc = st.pttAcc; st.pttAcc = null;
      st.listening = false; st.rec = null; paint();
      if (wasPtt && ptAcc && ptAcc[0]) finalAlts = [ptAcc[0]];
      if (finalAlts) { var alts = finalAlts; finalAlts = null; submit(alts); }
      else if (!gotErr && st.open && !$('#vcTx').textContent) showResult({ msg: M('nospeech'), warn: true });
    };
    st.rec = rec;
    try { rec.start(); } catch (e) { st.rec = null; showResult({ msg: M('err'), warn: true }); }
  }
  function stopListen(abort) {
    var r = st.rec; if (!r) { st.listening = false; return; }
    try { abort ? r.abort() : r.stop(); } catch (e) { /* abaikan */ }
  }

  /* terima teks (atau beberapa alternatif) → pilih interpretasi terbaik → jalankan */
  /* ---------- bantuan AI (opsional, hanya untuk frasa yang tidak dikenal parser) ---------- */
  var aiBad = 0;
  function aiCands(unres) {
    var items = sellable(), seen = {}, out = [];
    unres.forEach(function (u) {
      var Q = nameToks(u.name);
      items.map(function (i) { return { i: i, s: scoreName(Q, nameToks(i.name)) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 15).forEach(function (x) { if (!seen[x.i.id]) { seen[x.i.id] = 1; out.push(x.i); } });
    });
    topUsed(10).forEach(function (i) { if (!seen[i.id]) { seen[i.id] = 1; out.push(i); } });
    return out.slice(0, 50);
  }
  function aiOn() {
    var C = root.POS_SB; return !!(cfg().ai && C && C.url && typeof CL !== 'undefined' && CL.on && CL.tok && Date.now() > aiBad && root.navigator && navigator.onLine !== false);
  }
  /* kirim frasa yang gagal ke fungsi voice-ai; hasilnya hanya dipakai bila cocok persis dengan menu yang ada */
  function aiResolve(unres, done) {
    var C = root.POS_SB, cands = aiCands(unres), ctrl = root.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    if (!cands.length) { clearTimeout(to); return done([]); }
    fetch(C.url + '/functions/v1/voice-ai', { method: 'POST', signal: ctrl ? ctrl.signal : undefined, headers: { 'Content-Type': 'application/json', apikey: C.key || '' },
      body: JSON.stringify({ t: CL.tok, phrases: unres.map(function (u) { return u.name; }), menu: cands.map(function (i) { return i.name; }) }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, s: r.status, j: j }; }); })
      .then(function (x) {
        clearTimeout(to);
        if (!x.ok) { if ([401, 403, 429, 501, 404].indexOf(x.s) > -1) aiBad = Date.now() + (x.s === 429 ? 120000 : 600000); return done([], x.j && x.j.error); }
        var map = (x.j && x.j.map) || [], res = [];
        unres.forEach(function (u, k) {
          var m = map.filter(function (z) { return clean(z.ph || '') === clean(u.name); })[0] || map[k];
          if (!m || !m.menu) return;
          var it = cands.filter(function (i) { return clean(i.name) === clean(m.menu); })[0];
          if (it) res.push({ u: u, it: it });
        });
        done(res);
      }).catch(function () { clearTimeout(to); aiBad = Date.now() + 60000; done([]); });
  }
  function aiApply(res) {
    var msgs = [];
    res.forEach(function (x) {
      var a = x.u.intent === 'add' ? actAdd(x.it, x.u.qty) : x.u.intent === 'set' ? actSet(x.it, x.u.qty) : actReduce(x.it, x.u.qty, !x.u.explicit);
      if (a.msg) msgs.push(a.msg);
      if (a.ok !== false) { learnAlias(x.u.name, x.it.id, false); if (x.u.intent === 'add') noteUse(x.it.id); }
    });
    return msgs;
  }
  function submit(input) {
    var alts = Array.isArray(input) ? input : [input];
    alts = alts.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
    if (!alts.length) return;
    lload(); st.ctxMiss = true;
    st.busy = true; paint(); $('#vcTx').textContent = '“' + alts[0] + '”';
    var bestP = null, bestS = -1;
    alts.forEach(function (a, idx) {
      var p = parse(a), sc = intentScore(p) - idx * 0.01;
      if (sc > bestS) { bestS = sc; bestP = p; }
    });
    var out;
    try { out = run(bestP); } catch (e) { console.error('voice', e); out = { msg: M('err'), warn: true }; }
    st.busy = false; paint(); showResult(out);
    var un = (st.unres || []).slice(); if (un.length && aiOn()) {
      st.busy = true; paint(); showResult({ msg: (out.msg ? out.msg + '\n' : '') + M('aiAsk') });
      aiResolve(un, function (res) {
        st.busy = false; paint();
        if (!res.length) { showResult(out); return; }
        var got = res.map(function (x) { return '“' + x.u.name + '”'; }), m = aiApply(res); showResult({ msg: ((out.msg || '').split('\n').filter(function (l) { return !got.some(function (g) { return l.indexOf(g) > -1 && l.indexOf(M('notfound')) === 0; }); }).concat(m)).join('\n'), warn: res.length < un.length });
      });
    }
  }
  /* seberapa yakin sebuah hasil parse (menu cocok > tidak dikenal) */
  function intentScore(p) {
    if (p.intent === 'unknown' || p.intent === 'empty') return 0;
    if (p.lines) {
      var items = sellable(), tot = 0;
      p.lines.forEach(function (l) { var r = matchItem(l.name, items); tot += r.item ? 1 + r.score : (r.alts && r.alts.length ? 0.5 : 0); });
      return 1 + tot / p.lines.length;
    }
    if (p.intent === 'set' && p.name) { var r2 = matchItem(p.name, sellable()); return 1 + (r2.item ? 1 + r2.score : 0); }
    return 2;
  }

  /* ---------- mode selalu mendengarkan (tanpa menekan mikrofon) ---------- */
  var bg = { rec: null, run: false, fail: 0, blocked: false, pausedUntil: 0, next: 0, lastDone: '', lastDoneAt: 0 };
  function setLive(on) { var fb = $('#vcFab'); if (fb) fb.classList.toggle('live', !!on); var m = $('#vcMic'); if (m) { m.classList.toggle('live', !!on); m.title = on ? M('live') : M('mic'); } }
  function bgWanted() {
    var c = cfg();
    return !!(SR && c.on && c.always && !document.hidden && !st.listening && !st.speaking && !bg.blocked && Date.now() >= bg.pausedUntil && typeof S !== 'undefined' && S.view === 'pos');
  }
  /* Android Chrome (mode continuous) sering mengirim hasil KUMULATIF ("5", "5 sate", "5 sate ayam" masing-masing final):
     gabungkan dengan menimpa bila hasil baru memperpanjang yang lama, bukan menambahkan, supaya tidak terduplikasi. */
  function nk(w) { return /^\d+$/.test(w) ? w : (w in UNITS ? String(UNITS[w]) : w); }   // “lima” = “5”
  function sameW(p, q) { p = nk(p); q = nk(q); return p === q || tokSim(p, q) >= 0.8; }
  function wl(s) { return clean(s).split(' ').filter(Boolean); }
  function lead(aw, xw) { var k = 0; while (k < aw.length && k < xw.length && sameW(aw[k], xw[k])) k++; return k; }
  function mergeT(acc, t) {
    var a = String(acc || '').trim(), x = String(t || '').trim(); if (!a) return x; if (!x) return a;
    var aw = wl(a), xw = wl(x); if (!aw.length) return x; if (!xw.length) return a;
    var k = lead(aw, xw);
    if (k === aw.length) return x;                              // hasil baru memperpanjang/merevisi yang lama
    if (k === xw.length) return a;                              // hasil lama sudah memuat yang baru
    for (var s0 = 1; s0 + xw.length <= aw.length; s0++) { if (lead(aw.slice(s0), xw) === xw.length) return a; }   // termuat di tengah
    for (var o = Math.min(aw.length, xw.length) - 1; o >= 1; o--) {                // tumpang tindih ujung-awal
      var ok = true; for (var i = 0; i < o; i++) if (!sameW(aw[aw.length - o + i], xw[i])) { ok = false; break; }
      if (ok) return a + ' ' + xw.slice(o).join(' ');
    }
    return a + ' ' + x;
  }
  /* sisa ucapan yang belum diproses setelah `done` (hasil kumulatif yang datang terlambat tidak diproses ulang) */
  function restAfter(bg.lastDone, t) {
    var dw = wl(done), xw = wl(t); if (!dw.length || !xw.length) return t;
    var k = lead(dw, xw);
    if (k === xw.length) return '';                             // sudah pernah diproses
    if (k === dw.length) return xw.slice(k).join(' ');          // lanjutan dari yang sudah diproses
    return t;
  }
  /* catatan diagnostik mode latar (untuk Pengaturan > Voice Cashier > Diagnostik) */
  var DG = [];
  function dg(type, txt) { DG.push({ t: Date.now(), k: type, x: String(txt || '').slice(0, 90) }); if (DG.length > 14) DG.shift(); bg.last = Date.now(); }
  function bgStart() {
    var rec;
    try { rec = new SR(); } catch (e) { bg.fail++; dg('gagal', 'tidak bisa membuat sesi'); return; }
    rec.lang = SRLANG[st.lang] || 'id-ID'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
    var buf = '', alt = [], tm = 0;
    var flush = function (how) {                               // proses satu ucapan utuh sekali saja
      clearTimeout(tm); if (!buf) return; var t = buf, a = [t].concat(alt.slice(1)); buf = ''; alt = [];
      if (bg.lastDone && Date.now() - bg.lastDoneAt < 3500) {                // hasil kumulatif terlambat: jangan proses ulang yang sama
        var rest = restAfter(done, t);
        if (!rest) { dg('abaikan', t); bg.lastDoneAt = Date.now(); return; }
        if (rest !== t) { dg('sisa', rest); bg.lastDone = mergeT(bg.lastDone, t); a = [rest]; t = rest; } else bg.lastDone = t;
      } else done = t;
      bg.lastDoneAt = Date.now();
      dg(how, t); try { heardBg(a); } catch (e) { console.error('voice-bg', e); }
    };
    rec.onstart = function () { bg.run = true; bg.t0 = Date.now(); setLive(true); dg('mulai', rec.lang); };
    rec.onaudiostart = function () { dg('audio', ''); };
    rec.onresult = function (ev) {
      bg.fail = 0; bg.last = Date.now(); var anyFinal = false;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i], alts = []; for (var j = 0; j < r.length; j++) alts.push(r[j].transcript);
        buf = mergeT(buf, alts[0]); alt = alts; if (r.isFinal) anyFinal = true;
      }
      clearTimeout(tm); tm = setTimeout(function () { if (bg.rec === rec) flush(anyFinal ? 'final' : 'tenang'); }, anyFinal ? 700 : 1800);   // jeda singkat agar hasil kumulatif tergabung
    };
    rec.onerror = function (ev) {
      var e = ev && ev.error; dg('galat', e);
      if (e === 'not-allowed' || e === 'service-not-allowed') { bg.blocked = true; setLive(false); toastMsg(M('permNeed'), true); waitGesture(); }
      else if (e !== 'no-speech' && e !== 'aborted') bg.fail++;
    };
    rec.onend = function () { var mine = bg.rec === rec; if (mine) flush('selesai'); clearTimeout(tm); if (!mine) return; dg('selesai', Math.round((Date.now() - (bg.t0 || Date.now())) / 1000) + ' dtk'); if (bg.t0 && Date.now() - bg.t0 > 3000) bg.fail = 0; bg.run = false; bg.rec = null; setLive(false); bg.next = Math.min(bg.next, Date.now() + 150); };
    bg.rec = rec;
    try { rec.start(); } catch (e) { bg.rec = null; bg.fail++; dg('gagal', e && e.message); }
  }
  function bgStop() { var r = bg.rec; bg.rec = null; if (r) { try { r.onend = null; r.abort(); } catch (e) { /* abaikan */ } } bg.run = false; setLive(false); }
  function waitGesture() {
    var h = function () { document.removeEventListener('pointerdown', h, true); bg.blocked = false; bg.fail = 0; bg.next = 0; };
    document.addEventListener('pointerdown', h, true);
  }
  function supervise() {
    var want = bgWanted();
    if (want && !bg.rec && Date.now() >= bg.next) { bg.next = Date.now() + Math.min(6000, 300 + 400 * bg.fail); bgStart(); }
    else if (!want && bg.rec) bgStop();
    else if (want && bg.rec && bg.run && Date.now() - (bg.last || bg.t0 || Date.now()) > 50000) { dg('segarkan', 'tanpa aktivitas 50 dtk'); bgStop(); bg.next = Date.now() + 200; }   // sesi macet diam-diam
  }
  /* ucapan latar: wajib kata panggil (bila diaktifkan); tanpa kata panggil hanya perintah yang dikenali yang dijalankan */
  function heardBg(alts) {
    var c = cfg(), ww = clean(c.wakeWord || 'ordela'), woke = false, cand = [];
    alts.forEach(function (a) {
      var t = clean(a).split(' ').filter(Boolean), k = -1, used = 1;
      for (var i = 0; i < Math.min(3, t.length); i++) {
        if (tokSim(t[i], ww) >= 0.75) { k = i; used = 1; break; }
        if (t[i + 1] && tokSim(t[i] + t[i + 1], ww) >= 0.75) { k = i; used = 2; break; }
        if (t[i + 2] && tokSim(t[i] + t[i + 1] + t[i + 2], ww) >= 0.75) { k = i; used = 3; break; }
      }
      if (k > -1) { woke = true; cand.push(t.slice(k + used).join(' ')); } else cand.push(t.join(' '));
    });
    var inWin = !woke && Date.now() < (bg.awake || 0);            // jendela percakapan: setelah “Ordela …” perintah lanjutan tak perlu kata panggil
    if (inWin) { woke = true; cand = alts.map(function (a) { return clean(a); }); }
    if (c.wake && !woke) {                                       // perintah yang jelas tapi tanpa kata panggil: beri tahu, jangan diam
      var pw = null; try { pw = parse(alts[0]); } catch (e) { /* abaikan */ }
      if (pw && pw.lines && pw.intent === 'add' && intentScore(pw) >= 2) toastMsg(M('wakeMiss') + ' “' + (c.wakeWord || 'ordela') + '”', true);
      return;
    }
    cand = cand.filter(Boolean);
    if (!cand.length) { if (woke) toastMsg(M('ready')); return; }
    var bestP = null, bestS = -1;
    cand.forEach(function (a, idx) { var p = parse(a), sc = intentScore(p) - idx * 0.01; if (sc > bestS) { bestS = sc; bestP = p; } });
    st.ctxMiss = woke;
    var risky = bestP.intent === 'confirmpay' || (bestP.intent === 'pay' && bestP.direct) || (bestP.intent === 'seq' && bestP.parts[1].direct);
    if (risky && !woke && !c.wake) { toastMsg(M('wakeNeed'), true); return; }
    var out;
    try { out = run(bestP); } catch (e) { console.error('voice', e); return; }
    if (out.noop && !woke) return;
    if (woke && !out.noop) bg.awake = Date.now() + 20000;
    toastMsg(((cand[0] ? '“' + cand[0] + '”\n' : '') + (out.msg || '')).trim(), !!out.warn, out);
    var un = (st.unres || []).slice();
    if (un.length && aiOn() && (woke || !c.wake)) aiResolve(un, function (res) { if (res.length) { var m = aiApply(res); toastMsg(m.join('\n'), false); } });
    if (out.msg && st.speak && c.speak && root.speechSynthesis && !st.listening) say(out.say || String(out.msg).split('\n')[0]);
  }
  var toastT = 0;
  function toastMsg(text, warn, out) {
    ensureUI(); var t = $('#vcT'); if (!t) return;
    t.textContent = text; t.classList.toggle('warn', !!warn); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, warn ? 6000 : 4200);
  }
  function localStorageLang() { try { return localStorage.getItem('ordela_vc_lang'); } catch (e) { return null; } }
  /* ---------- pasang ---------- */
  /* tombol headset / mic eksternal (dikirim APK sebagai event 'ordela-headset'): tekan sekali = mulai bicara, tekan lagi = berhenti */
  var hsAt = 0;
  addEventListener('ordela-headset', function () {
    if (!cfg().on || Date.now() - hsAt < 500) return; hsAt = Date.now();
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) { /* abaikan */ }
    if (st.listening) { stopListen(false); return; }
    st.ptt = false; st.pttHeld = false; startListen();
  });
  function init() {
    ensureUI(); injectMic(); injectFab(); setInterval(supervise, 300);
    var n = 0, t = setInterval(function () { injectMic(); injectFab(); if (($('#vcMic') && $('#vcFab')) || ++n > 40) clearInterval(t); }, 500);
  }
  root.VC = { refresh: function () { applyCfg(); if (!cfg().always) bgStop(); else { bg.blocked = false; bg.next = 0; } if (!localStorageLang()) { st.lang = pickLang(); if (st.open) paint(); } }, parse: parse, run: run, submit: submit, open: openPanel, close: closePanel, matchItem: matchItem, state: st, D: { log: function () { return DG.slice(); }, bg: function () { return { live: !!bg.run, blocked: !!bg.blocked, fail: bg.fail, wanted: bgWanted() }; } }, L: {
    data: function () { var L = lload(); return JSON.parse(JSON.stringify(L)); },
    delAlias: function (k) { var L = lload(); delete L.al[k]; lsave(); },
    delMiss: function (k) { var L = lload(); delete L.miss[k]; lsave(); },
    delVerb: function (w) { var L = lload(), a = LV[L.vw[w]]; delete L.vw[w]; if (a && a.indexOf(w) > -1) a.splice(a.indexOf(w), 1); lsave(); },
    assign: function (k, id) { var L = lload(), m = L.miss[k]; if (m) learnAlias(m.p, id, false); },
    clear: function () { var L = lload(); Object.keys(L.vw).forEach(function (w) { root.VC.L.delVerb(w); }); LS = { al: {}, use: {}, vw: {}, miss: {} }; lsave(); }
  }, supported: !!SR };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
