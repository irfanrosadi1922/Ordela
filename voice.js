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
        if (acc > 0 && acc % 100 === 0) { acc += v; used = true; continue; }
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
  function nameToks(s) { return toks(s).map(normTok).filter(function (w) { return w && !FILLER[w]; }); }
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
  var SEP = /\s+(?:dan|sama|serta|lalu|kemudian|terus|plus|and|then|also|dengan|n)\s+|\s*,\s*/;

  function detectMethod(n) { for (var i = 0; i < METHODS.length; i++) if (METHODS[i][0].test(n)) return METHODS[i][1]; return null; }

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

    // bayar
    if (/^(?:tolong\s+|please\s+)?(bayar|bayarkan|pembayaran|checkout|check out|pay|payment|bayaran|proses bayar|lanjut bayar|lanjutkan pembayaran|selesai|selesaikan)\b/.test(n)) return { intent: 'pay', method: detectMethod(n) };
    if (/^(uang pas|pas|exact|exact amount|bayar pas|wang pas)$/.test(n)) return { intent: 'exact' };
    if (/^(konfirmasi pembayaran|konfirmasi bayar|proses|process|bayar sekarang|confirm payment|selesaikan pembayaran|sudah dibayar|done)$/.test(n)) return { intent: 'confirmpay' };

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
      var w = sg.split(' '), v = null;
      // segmen dengan kata kerja sendiri ("tambah 2 kopi dan hapus teh")
      if (has(V_REDUCE, w[0])) v = 'reduce'; else if (has(V_REMOVE, w[0])) v = 'remove'; else if (has(V_ADD, w[0])) v = 'add';
      if (v) w = w.slice(1);
      var p = parseSeg(w);
      if (p.name) { if (v) p.v = v; lines.push(p); }
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
      clearAsk: 'Kosongkan keranjang? Ucapkan “ya”.', cleared: 'Keranjang dikosongkan', cancelled: 'Dibatalkan', pay: 'Pembayaran dibuka', payNeed: 'Keranjang masih kosong', confirmNo: 'Buka layar pembayaran dulu', exact: 'Uang pas diisi', noted: 'Catatan disimpan',
      denied: 'Izin mikrofon ditolak. Izinkan di pengaturan peramban.', nospeech: 'Tidak ada suara terdengar. Coba lagi.', neterr: 'Pengenalan suara perlu koneksi internet.', err: 'Pengenalan suara gagal. Coba lagi atau ketik perintah.', each: 'item', hint: 'Coba: “tambah dua nasi goreng”, “berapa total?”', speakOn: 'Suara balasan', typeHolder: 'Ketik perintah…', send: 'Kirim', close: 'Tutup', mic: 'Perintah suara', heard: 'Terdengar', unsold: 'Menu tidak dijual' },
    en: { listen: 'Listening…', proc: 'Processing…', idle: 'Tap the mic, then speak', nosr: 'Speech recognition is not supported on this device. Type a command below, or use the keyboard microphone.',
      added: 'Added', removed: 'Reduced', removedAll: 'Removed', set: 'Quantity changed', notfound: 'Item not found', ambiguous: 'Which one did you mean?', total: 'Order total', empty: 'Cart is empty', cart: 'Cart opened',
      stock: 'Not enough stock', nomatch: 'Command not understood. Example: “add two fried rice”', notInCart: 'That item is not in the cart', noLast: 'Say which item to change', mods: 'This item has options, finish on screen',
      clearAsk: 'Clear the cart? Say “yes”.', cleared: 'Cart cleared', cancelled: 'Cancelled', pay: 'Payment opened', payNeed: 'The cart is empty', confirmNo: 'Open the payment screen first', exact: 'Exact amount filled', noted: 'Note saved',
      denied: 'Microphone permission denied. Allow it in browser settings.', nospeech: 'No speech heard. Try again.', neterr: 'Speech recognition needs an internet connection.', err: 'Speech recognition failed. Try again or type the command.', each: 'items', hint: 'Try: “add two fried rice”, “what is the total?”', speakOn: 'Spoken replies', typeHolder: 'Type a command…', send: 'Send', close: 'Close', mic: 'Voice command', heard: 'Heard', unsold: 'Item not for sale' },
    ms: { listen: 'Mendengar…', proc: 'Memproses…', idle: 'Ketik mikrofon, kemudian cakap', nosr: 'Peranti ini tidak menyokong pengecaman suara. Taip arahan di bawah, atau guna mikrofon papan kekunci.',
      added: 'Ditambah', removed: 'Dikurangkan', removedAll: 'Dipadam', set: 'Kuantiti diubah', notfound: 'Menu tidak dijumpai', ambiguous: 'Yang mana satu?', total: 'Jumlah pesanan', empty: 'Bakul kosong', cart: 'Bakul dibuka',
      stock: 'Stok tidak mencukupi', nomatch: 'Arahan tidak difahami. Contoh: “tambah dua nasi goreng”', notInCart: 'Menu itu belum ada dalam bakul', noLast: 'Sebut nama menu yang hendak diubah', mods: 'Menu ini ada pilihan, lengkapkan di skrin',
      clearAsk: 'Kosongkan bakul? Sebut “ya”.', cleared: 'Bakul dikosongkan', cancelled: 'Dibatalkan', pay: 'Pembayaran dibuka', payNeed: 'Bakul masih kosong', confirmNo: 'Buka skrin pembayaran dahulu', exact: 'Wang pas diisi', noted: 'Catatan disimpan',
      denied: 'Kebenaran mikrofon ditolak. Benarkan dalam tetapan pelayar.', nospeech: 'Tiada suara didengar. Cuba lagi.', neterr: 'Pengecaman suara memerlukan sambungan internet.', err: 'Pengecaman suara gagal. Cuba lagi atau taip arahan.', each: 'item', hint: 'Cuba: “tambah dua nasi goreng”, “berapa jumlah?”', speakOn: 'Suara balasan', typeHolder: 'Taip arahan…', send: 'Hantar', close: 'Tutup', mic: 'Arahan suara', heard: 'Didengar', unsold: 'Menu tidak dijual' }
  };
  var SRLANG = { id: 'id-ID', en: 'en-US', ms: 'ms-MY' };

  var API = { parse: parse, matchItem: matchItem, readNum: readNum, clean: clean, nameToks: nameToks, scoreName: scoreName, MSG: MSG, SRLANG: SRLANG };
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
  try { var sl = localStorage.getItem('ordela_vc_lang'); if (sl && MSG[sl]) st.lang = sl; else if (typeof lang === 'function' && MSG[lang()]) st.lang = lang(); } catch (e) { /* abaikan */ }

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

  /* ---------- eksekusi hasil parse ---------- */
  function resolve(name) {
    var items = sellable(), r = matchItem(name, items);
    if (!r.item && !r.alts.length) { var any = (db.items || []).filter(function (i) { return i.ns; }); var r2 = matchItem(name, any); if (r2.item) return { unsold: r2.item }; }
    return r;
  }
  function run(p) {
    var res = [], chips = null, show = null;
    if (p.intent === 'empty') return { msg: M('hint') };
    if (p.intent === 'unknown') return { msg: M('nomatch'), warn: true };
    if (p.intent === 'close') { setTimeout(closePanel, 50); return { msg: '' }; }
    if (p.intent === 'yes' || p.intent === 'no') {
      var pd = st.pending; st.pending = null;
      if (!pd) return { msg: M('nomatch'), warn: true };
      if (p.intent === 'no') return { msg: M('cancelled') };
      if (pd.kind === 'clear') { clearCart(); st.last = null; return { msg: M('cleared') }; }
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
    if (p.intent === 'pay') {
      if (!Object.keys(S.cart).length) return { msg: M('payNeed'), warn: true };
      if (!$('#payOk')) { if (typeof closeModal === 'function' && $('#mw.on')) closeModal(); payForm(); }
      if (p.method && typeof setM === 'function' && $('#pM')) setM(p.method);
      return { msg: M('pay') + (p.method ? ' · ' + p.method : '') + ' · ' + money2(calc().total) };
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
      if (p.name) { var r = resolve(p.name); if (r.unsold) return { msg: r.unsold.name + ': ' + M('unsold'), warn: true }; if (!r.item) return ambiguous(r, p.name, p.qty, 'set'); it = r.item; }
      else { var ids = []; Object.keys(S.cart).forEach(function (k) { var b = bidOf(k); if (ids.indexOf(b) < 0) ids.push(b); }); var id = st.last && qtyOf(st.last) > 0 ? st.last : (ids.length === 1 ? ids[0] : null); if (!id) return { msg: M('noLast'), warn: true }; it = find(id); }
      if (!it) return { msg: M('notfound'), warn: true };
      var a = actSet(it, p.qty); return { msg: a.msg, warn: !a.ok || a.warn };
    }
    // add / remove / reduce (boleh beberapa baris)
    var out = [], warn = false;
    for (var i = 0; i < p.lines.length; i++) {
      var ln = p.lines[i], r = resolve(ln.name);
      if (r.unsold) { out.push(r.unsold.name + ': ' + M('unsold')); warn = true; continue; }
      if (!r.item) {
        if (r.alts && r.alts.length) { var amb = ambiguous(r, ln.name, ln.qty, ln.v || p.intent, ln.explicit); chips = amb.chips; out.push(amb.msg); warn = true; continue; }
        out.push(M('notfound') + ': “' + ln.name + '”'); warn = true; continue;
      }
      var res2, vb = ln.v || p.intent;
      if (vb === 'add') res2 = actAdd(r.item, ln.qty);
      else if (vb === 'reduce') res2 = actReduce(r.item, ln.qty, false);
      else res2 = actReduce(r.item, ln.qty, !ln.explicit);
      out.push(res2.msg); if (!res2.ok || res2.warn) warn = true;
    }
    return { msg: out.join('\n'), warn: warn, chips: chips };
  }
  function ambiguous(r, name, qty, intent, explicit) {
    var alts = (r.alts || []).slice(0, 4);
    if (!alts.length) return { msg: M('notfound') + ': “' + name + '”', warn: true };
    return { msg: M('ambiguous'), warn: true, chips: alts.map(function (it) { return { id: it.id, name: it.name, qty: qty, intent: intent, explicit: explicit }; }) };
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
    $('#vcX').onclick = closePanel;
    $('#vcF').onsubmit = function (e) { e.preventDefault(); var v = $('#vcIn').value; $('#vcIn').value = ''; submit(v); };
    $('#vcMic2').onclick = toggleListen;
    $('#vcSpk').onchange = function () { st.speak = this.checked; try { localStorage.setItem('ordela_vc_speak', this.checked ? '1' : '0'); } catch (e) { /* abaikan */ } if (!this.checked && root.speechSynthesis) root.speechSynthesis.cancel(); };
    $('#vcLg').onclick = function (e) { var b = e.target.closest('button[data-l]'); if (!b) return; st.lang = b.dataset.l; try { localStorage.setItem('ordela_vc_lang', st.lang); } catch (x) { /* abaikan */ } if (st.listening) stopListen(true); paint(); };
    $('#vcCh').onclick = function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var it = find(b.dataset.i); if (!it) return;
      var q = +b.dataset.q || 1, a = b.dataset.t === 'add' ? actAdd(it, q) : b.dataset.t === 'set' ? actSet(it, q) : actReduce(it, q, b.dataset.x !== '1');
      $('#vcCh').innerHTML = ''; showResult({ msg: a.msg, warn: !a.ok || a.warn });
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.open) closePanel(); });
  }
  function injectMic() {
    var host = $('.pill.search'); if (!host || $('#vcMic')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'vcMic'; b.className = 'vc-mic'; b.innerHTML = ICON_MIC;
    b.setAttribute('aria-label', 'Perintah suara'); b.title = 'Perintah suara';
    b.onclick = function () { openPanel(true); };
    host.appendChild(b);
  }
  function paint() {
    var p = $('#vcP'); if (!p) return;
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
    var el = $('#vcRes'); el.textContent = r.msg || ''; el.classList.toggle('warn', !!r.warn); el.classList.toggle('big', !!r.big);
    var ch = $('#vcCh');
    ch.innerHTML = (r.chips || []).map(function (c) { return '<button type="button" class="chip" data-i="' + esc(c.id) + '" data-q="' + (c.qty || 1) + '" data-t="' + esc(c.intent === 'add' ? 'add' : c.intent === 'set' ? 'set' : 'rm') + '" data-x="' + (c.explicit ? '1' : '0') + '">' + esc(c.name) + '</button>'; }).join('');
    if (r.msg && st.speak && root.speechSynthesis && !st.listening) say(r.say || r.msg.split('\n')[0]);
  }
  function say(t) {
    try {
      var u = new SpeechSynthesisUtterance(String(t).replace(/[×·]/g, ' ')); u.lang = SRLANG[st.lang] || 'id-ID'; u.rate = 1.05;
      root.speechSynthesis.cancel(); root.speechSynthesis.speak(u);
    } catch (e) { /* abaikan */ }
  }
  function openPanel(autoListen) {
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
    if (root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) { /* abaikan */ }
    var rec;
    try { rec = new SR(); } catch (e) { showResult({ msg: M('err'), warn: true }); return; }
    rec.lang = SRLANG[st.lang] || 'id-ID'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 3;
    var finalAlts = null, gotErr = false;
    rec.onstart = function () { st.listening = true; st.heard = ''; $('#vcTx').textContent = ''; paint(); };
    rec.onresult = function (ev) {
      var interim = '', fin = null;
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) { fin = []; for (var j = 0; j < r.length; j++) fin.push(r[j].transcript); }
        else interim += r[0].transcript;
      }
      if (fin) { finalAlts = fin; $('#vcTx').textContent = '“' + fin[0] + '”'; }
      else $('#vcTx').textContent = '“' + interim + '”';
    };
    rec.onerror = function (ev) {
      gotErr = true; var e = ev && ev.error;
      st.listening = false; paint();
      if (e === 'not-allowed' || e === 'service-not-allowed') showResult({ msg: M('denied'), warn: true });
      else if (e === 'no-speech') showResult({ msg: M('nospeech'), warn: true });
      else if (e === 'network') showResult({ msg: M('neterr'), warn: true });
      else if (e !== 'aborted') showResult({ msg: M('err'), warn: true });
    };
    rec.onend = function () {
      st.listening = false; st.rec = null; paint();
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
  function submit(input) {
    var alts = Array.isArray(input) ? input : [input];
    alts = alts.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
    if (!alts.length) return;
    st.busy = true; paint(); $('#vcTx').textContent = '“' + alts[0] + '”';
    var bestP = null, bestS = -1;
    alts.forEach(function (a, idx) {
      var p = parse(a), sc = intentScore(p) - idx * 0.01;
      if (sc > bestS) { bestS = sc; bestP = p; }
    });
    var out;
    try { out = run(bestP); } catch (e) { console.error('voice', e); out = { msg: M('err'), warn: true }; }
    st.busy = false; paint(); showResult(out);
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

  /* ---------- pasang ---------- */
  function init() {
    ensureUI(); injectMic();
    var n = 0, t = setInterval(function () { injectMic(); if ($('#vcMic') || ++n > 40) clearInterval(t); }, 500);
  }
  root.VC = { parse: parse, run: run, submit: submit, open: openPanel, close: closePanel, matchItem: matchItem, state: st, supported: !!SR };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
