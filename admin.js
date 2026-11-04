/* Ordela Admin — susunan ulang menu & tab bawah untuk aplikasi admin. Dimuat hanya di build admin (lihat scripts/build-apps.mjs). */
(function () {
  'use strict';
  if (window.POS_APP !== 'admin') return;
  document.documentElement.setAttribute('data-app', 'admin');
  /* warna bilah status = warna latar, agar tidak ada pita di bawah jam/sinyal */
  function themeColor() {
    var m = document.querySelector('meta[name=theme-color]'); if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    if (document.documentElement.getAttribute('data-theme') !== 'dark' && m.getAttribute('content') !== '#eaf1ff') m.setAttribute('content', '#eaf1ff');
    return m;
  }
  try { var tm = themeColor(); new MutationObserver(themeColor).observe(tm, { attributes: true, attributeFilter: ['content'] }); } catch (e) {}
  var $ = function (s) { return document.querySelector(s); };
  var esc = (typeof window.esc === 'function' ? window.esc : null) || function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  /* Ikon duotone sendiri (24px): garis 1.8 + isi tipis (.d). Satu ikon untuk satu fungsi, tidak ada yang dipakai ganda. */
  var ICO = {
    home: '<path class="d" d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    chart: '<rect class="d" x="3.5" y="12" width="4" height="8" rx="1.2"/><rect class="d" x="10" y="4" width="4" height="16" rx="1.2"/><rect class="d" x="16.5" y="9" width="4" height="11" rx="1.2"/>',
    receipt: '<path class="d" d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    bag: '<path class="d" d="M5 8h14l-1 12H6z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
    timer: '<circle class="d" cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5M12 3v3"/>',
    wallet: '<rect class="d" x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2" fill="currentColor"/>',
    idcard: '<rect class="d" x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.6 1.7-2.3 2.5-2.3s1.9.7 2.5 2.3M14 10h4M14 14h3"/>',
    tag: '<path class="d" d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3" fill="currentColor"/>',
    gift: '<rect class="d" x="3.5" y="9" width="17" height="11" rx="2"/><path d="M3.5 13h17M12 9v11"/><path d="M12 9C9 9 7.5 7.5 8 6s3-1 4 3c1-4 3.5-4.5 4-3s-1 3-4 3"/>',
    cal: '<rect class="d" x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    box: '<path class="d" d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    clip: '<rect class="d" x="5" y="4.5" width="14" height="17" rx="3"/><path d="M9 3h6v3H9z"/><path d="M9 14l2.2 2.2L15.5 12"/>',
    truck: '<path class="d" d="M2.5 7h11v9h-11z"/><path d="M13.5 10h4l3 3v3h-7"/><circle class="d" cx="7" cy="17.5" r="1.9"/><circle class="d" cx="17" cy="17.5" r="1.9"/>',
    usercheck: '<circle class="d" cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1 0 1.9.2 2.7.5"/><path d="M15 17.5l2 2 4-4"/>',
    users: '<circle class="d" cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.5-3.3 3-5 6-5s5.5 1.7 6 5"/><path d="M16 5.5a3 3 0 0 1 0 6M18.5 14.8c1.6.6 2.6 2 2.9 4.2"/>',
    cash: '<rect class="d" x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
    store: '<path class="d" d="M5 12v8h14v-8"/><path d="M3 9.5L4.5 4.5h15L21 9.5a2.8 2.8 0 0 1-5.5 0 2.8 2.8 0 0 1-5.5 0 2.8 2.8 0 0 1-5.5 0z"/><path d="M10 20v-4h4v4"/>',
    nodes: '<circle class="d" cx="6" cy="12" r="2.8"/><circle class="d" cx="18" cy="6" r="2.8"/><circle class="d" cx="18" cy="18" r="2.8"/><path d="M8.6 10.8l6.8-3.6M8.6 13.2l6.8 3.6"/>',
    printer: '<rect class="d" x="3.5" y="9" width="17" height="8" rx="2.5"/><path d="M7 9V3.5h10V9M7 14h10v6.5H7z"/>',
    set: '<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle class="d" cx="14" cy="7" r="2.3"/><circle class="d" cx="10" cy="17" r="2.3"/>',
    spark: '<path class="d" d="M10 4l1.8 4.7L16.5 10.5l-4.7 1.8L10 17l-1.8-4.7L3.5 10.5l4.7-1.8z"/><path d="M18 3v4M16 5h4M18.5 14v3.5M16.8 15.8h3.4"/>',
    hist: '<path d="M4 4v5h5"/><path d="M4.6 9A8.5 8.5 0 1 1 3.5 12"/><path d="M12 7.5V12l3 2"/>'
  };
  function ico(k) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + (ICO[k] || '') + '</svg>'; }
  /* tab bawah admin: 5 tujuan utama. Kasir/Meja tidak ada di admin; Akun lewat avatar di bilah atas. */
  var TABS = [['menu', 'Beranda', 'home'], ['home', 'Laporan', 'chart'], ['inv', 'Produk', 'box'], ['riw', 'Riwayat', 'receipt'], ['set', 'Pengaturan', 'set']];
  function buildNav() {
    var n = $('#bnav'); if (!n) return;
    var vis = TABS.filter(function (t) { return typeof canView !== 'function' || canView(t[0]); });
    n.innerHTML = vis.map(function (t) {
      return '<button data-v="' + t[0] + '" onclick="go(\'' + t[0] + '\')" aria-label="' + t[1] + '"><span class="bi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[t[2]] + '</svg></span>' + t[1] + '</button>';
    }).join('');
    n.classList.add('none');
    var v = (typeof S !== 'undefined' && S.view) || 'menu';
    n.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v); });
  }
  function buildAvatar() {
    var top = $('.top'); if (!top || $('#adav')) return;
    var b = document.createElement('button'); b.id = 'adav'; b.className = 'adav'; b.setAttribute('aria-label', 'Akun'); b.onclick = function () { accTap(); };
    top.appendChild(b); setAvatar();
  }
  function setAvatar() {
    var b = $('#adav'); if (!b) return;
    var nm = (typeof CL !== 'undefined' && CL.on && CL.me && CL.me.name) || 'A';
    b.textContent = String(nm).trim().charAt(0).toUpperCase() || 'A';
  }

  /* ---------- Beranda: ringkasan + daftar bergrup ---------- */
  var G = [
    ['Penjualan', 'Omzet, pesanan, dan kas', [
      ['home', 'Beranda & Laporan', 'Omzet, grafik, ekspor Excel', 'chart', '#2f6bff'],
      ['riw', 'Riwayat Pesanan', 'Semua transaksi & struk', 'receipt', '#8b5cf6'],
      ['co', 'Pesanan Online', 'Pesanan pelanggan & GoFood/Grab', 'bag', '#0ea5e9'],
      ['shift', 'Shift Kasir', 'Buka-tutup kas per shift', 'timer', '#06b6d4'],
      ['exp', 'Pengeluaran', 'Catat biaya operasional', 'wallet', '#64748b']]],
    ['Pelanggan & Promosi', 'Bangun loyalitas', [
      ['mem', 'Member', 'Poin & data pelanggan', 'idcard', '#14b8a6'],
      ['promo', 'Promo', 'Diskon & voucher', 'tag', '#eab308'],
      ['gift', 'Kartu Hadiah', 'Saldo & penukaran', 'gift', '#ec4899'],
      ['rsv', 'Reservasi', 'Booking meja', 'cal', '#f59e0b']]],
    ['Produk & Stok', 'Menu dan persediaan', [
      ['inv', 'Inventori', 'Menu, harga, modal, stok', 'box', '#3b82f6'],
      ['opname', 'Stok Opname', 'Cocokkan stok fisik', 'clip', '#0d9488'],
      ['buy', 'Pembelian & Pemasok', 'Belanja bahan & utang', 'truck', '#6366f1']]],
    ['Tim', 'Staf dan jabatan', [
      ['att', 'Absensi', 'Jam masuk & pulang', 'usercheck', '#06b6d4'],
      ['usr', 'Pengguna', 'Akun & hak tiap jabatan', 'users', '#a855f7'],
      ['pyr', 'Payroll', 'Gaji & slip', 'cash', '#22c55e']]],
    ['Toko', 'Pengaturan dan koneksi', [
      ['branch', 'Cabang', 'Pindah stok antar cabang', 'store', '#d946ef'],
      ['integ', 'Integrasi', 'GoFood, GrabFood, ShopeeFood, webhook', 'nodes', '#0ea5e9'],
      ['prn', 'Printer', 'Struk & printer', 'printer', '#475569'],
      ['set', 'Pengaturan', 'Toko, pajak, pembayaran', 'set', '#2f6bff']]]
  ];
  var CHEV = '<svg class="go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
  function ok(v) { return typeof canView === 'function' ? canView(v) : true; }
  function sales(a, b) { return (db.orders || []).filter(function (o) { var t = new Date(o.t).getTime(); return t >= a && t < b; }); }
  function sum(l) { return l.reduce(function (s, o) { return s + (+o.total || 0); }, 0); }

  function menu() {
    var el = $('#v-menu'); if (!el) return;
    var h = new Date().getHours(), g = h >= 4 && h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
    var nm = (typeof CL !== 'undefined' && CL.on && CL.me && CL.me.name) || 'Owner';
    var store = (db.set && db.set.store) || 'Ordela';
    var d0 = dayStart(Date.now()), D = 864e5;
    var today = sales(d0, d0 + D), tsum = sum(today);
    var wk = sales(d0 - 7 * D, d0), avg = sum(wk) / 7;
    var pct = avg > 0 ? Math.min(1, tsum / avg) : (tsum > 0 ? 1 : 0);
    var C = 2 * Math.PI * 24, low = (db.items || []).filter(function (i) { return !i.ns && +i.stock <= +i.min; }).length;
    var nb = (typeof CO !== 'undefined' && CO.list) ? CO.list.filter(function (o) { return o.status === 'new'; }).length : 0;
    var canRep = ok('home');
    var hero = '<div class="adh"><div class="adchips"><span class="adchip"><i><i class="ic" data-ic="dash"></i></i>Admin</span><span class="adchip g">' + esc(store) + '</span></div>' +
      '<small>' + g + ', ' + esc(nm) + '</small><h2>' + (canRep ? esc(money(tsum)) : 'Ringkasan') + '</h2>' +
      '<p class="sub">' + (canRep ? 'Penjualan hari ini · ' + today.length + ' transaksi' : new Date().toLocaleDateString(dloc(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</p>' +
      (canRep ? '<button class="adbtn" onclick="go(\'home\')">' + ico('chart') + 'Lihat laporan lengkap</button>' : '') + '</div>';
    var stats = canRep ? '<div class="adst"><div class="adc"><h4>Target harian</h4><div class="adring"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="24"/><circle class="pg" cx="30" cy="30" r="24" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><div><b>' + Math.round(pct * 100) + '%</b><span>dari rata-rata 7 hari</span></div></div></div>' +
      '<div class="adc w ' + (low ? '' : 'ok') + '"><h4>Stok</h4><div class="big"><i><i class="ic" data-ic="' + (low ? 'alert' : 'check') + '"></i></i>' + low + '</div><small>' + (low ? 'item menipis' : 'semua aman') + '</small></div></div>' : '';
    var secs = G.map(function (gr) {
      var rows = gr[2].filter(function (r) { return ok(r[0]); });
      if (!rows.length) return '';
      return '<div class="adgt"><h3>' + gr[0] + '</h3><span>' + gr[1] + '</span></div><div class="adl">' + rows.map(function (r) {
        var act = r[0] === 'branch' ? 'P2.branch()' : "go('" + r[0] + "')";
        return '<button class="adr" onclick="' + act + '"><span class="ti" style="--c:' + r[4] + '">' + ico(r[3]) + (r[0] === 'co' && nb ? '<b class="nb">' + nb + '</b>' : '') + '</span><span class="tx"><b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + '</span></span>' + CHEV + '</button>';
      }).join('') + '</div>';
    }).join('');
    var ai = ok('ai') ? '<div class="adgt"><h3>Asisten</h3><span>Tanya data toko</span></div><div class="adl"><button class="adr" onclick="go(\'ai\')"><span class="ti" style="--c:#7c3aed">' + ico('spark') + '</span><span class="tx"><b>Asisten Ordela</b><span>Tanya omzet, menu terlaris, stok menipis</span></span>' + CHEV + '</button></div>' : '';
    el.innerHTML = hero + stats + ai + secs;
  }

  /* status bar menyatu dengan latar; pita kosong di atas (offset viewport iOS yang tertinggal) dihapus kecuali saat keyboard terbuka */
  function fixTop() {
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', '#eaf1ff');
    var a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'radio';
    if (!typing && document.documentElement.style.getPropertyValue('--vvTop') && document.documentElement.style.getPropertyValue('--vvTop') !== '0px') document.documentElement.style.setProperty('--vvTop', '0px');
  }
  function init() {
    fixTop(); setInterval(fixTop, 400);
    if (window.P2 && P2.views) P2.views.menu = menu;
    buildNav(); buildAvatar();
    /* susun ulang tab bila hak akses berubah (login/keluar) */
    var last = '';
    setInterval(function () {
      var k = (typeof CL !== 'undefined' && CL.me ? JSON.stringify(CL.me.perms || '') + CL.me.role : '') + (typeof CL !== 'undefined' && CL.on);
      if (k !== last) { last = k; buildNav(); setAvatar(); if (typeof S !== 'undefined' && S.view === 'menu' && typeof render === 'function') render(); }
    }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
