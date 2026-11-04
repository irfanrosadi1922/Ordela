/* Ordela Admin — susunan ulang menu & tab bawah untuk aplikasi admin. Dimuat hanya di build admin (lihat scripts/build-apps.mjs). */
(function () {
  'use strict';
  if (window.POS_APP !== 'admin') return;
  document.documentElement.setAttribute('data-app', 'admin');
  var $ = function (s) { return document.querySelector(s); };
  var esc = (typeof window.esc === 'function' ? window.esc : null) || function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ICO = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    hist: '<path d="M4 4v5h5"/><path d="M4.6 9A8.5 8.5 0 1 1 3.5 12"/><path d="M12 7v5l3 2"/>',
    set: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'
  };
  /* tab bawah admin: 5 tujuan utama. Kasir/Meja tidak ada di admin; Akun lewat avatar di bilah atas. */
  var TABS = [['menu', 'Beranda', 'home'], ['home', 'Laporan', 'chart'], ['inv', 'Produk', 'box'], ['riw', 'Riwayat', 'hist'], ['set', 'Pengaturan', 'set']];
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
      ['riw', 'Riwayat Pesanan', 'Semua transaksi & struk', 'list', '#8b5cf6'],
      ['co', 'Pesanan Online', 'Pesanan pelanggan & GoFood/Grab', 'cart', '#0ea5e9'],
      ['shift', 'Shift Kasir', 'Buka-tutup kas per shift', 'clock', '#06b6d4'],
      ['exp', 'Pengeluaran', 'Catat biaya operasional', 'card', '#64748b']]],
    ['Pelanggan & Promosi', 'Bangun loyalitas', [
      ['mem', 'Member', 'Poin & data pelanggan', 'users', '#14b8a6'],
      ['promo', 'Promo', 'Diskon & voucher', 'bolt', '#eab308'],
      ['gift', 'Kartu Hadiah', 'Saldo & penukaran', 'gift', '#ec4899'],
      ['rsv', 'Reservasi', 'Booking meja', 'cal', '#f59e0b']]],
    ['Produk & Stok', 'Menu dan persediaan', [
      ['inv', 'Inventori', 'Menu, harga, modal, stok', 'box', '#3b82f6'],
      ['opname', 'Stok Opname', 'Cocokkan stok fisik', 'check', '#0d9488'],
      ['buy', 'Pembelian & Pemasok', 'Belanja bahan & utang', 'download', '#6366f1']]],
    ['Tim', 'Staf dan jabatan', [
      ['att', 'Absensi', 'Jam masuk & pulang', 'clock', '#06b6d4'],
      ['usr', 'Pengguna', 'Akun & hak tiap jabatan', 'users', '#a855f7'],
      ['pyr', 'Payroll', 'Gaji & slip', 'card', '#22c55e']]],
    ['Toko', 'Pengaturan dan koneksi', [
      ['branch', 'Cabang', 'Pindah stok antar cabang', 'bank', '#d946ef'],
      ['integ', 'Integrasi', 'GoFood, GrabFood, ShopeeFood, webhook', 'plug', '#0ea5e9'],
      ['prn', 'Printer', 'Struk & printer', 'print', '#475569'],
      ['set', 'Pengaturan', 'Toko, pajak, pembayaran', 'sliders', '#2f6bff']]]
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
      (canRep ? '<button class="adbtn" onclick="go(\'home\')"><i class="ic" data-ic="chart"></i>Lihat laporan lengkap</button>' : '') + '</div>';
    var stats = canRep ? '<div class="adst"><div class="adc"><h4>Target harian</h4><div class="adring"><svg viewBox="0 0 60 60"><circle class="tr" cx="30" cy="30" r="24"/><circle class="pg" cx="30" cy="30" r="24" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><div><b>' + Math.round(pct * 100) + '%</b><span>dari rata-rata 7 hari</span></div></div></div>' +
      '<div class="adc w ' + (low ? '' : 'ok') + '"><h4>Stok</h4><div class="big"><i><i class="ic" data-ic="' + (low ? 'alert' : 'check') + '"></i></i>' + low + '</div><small>' + (low ? 'item menipis' : 'semua aman') + '</small></div></div>' : '';
    var secs = G.map(function (gr) {
      var rows = gr[2].filter(function (r) { return ok(r[0]); });
      if (!rows.length) return '';
      return '<div class="adgt"><h3>' + gr[0] + '</h3><span>' + gr[1] + '</span></div><div class="adl">' + rows.map(function (r) {
        var act = r[0] === 'branch' ? 'P2.branch()' : "go('" + r[0] + "')";
        return '<button class="adr" onclick="' + act + '"><span class="ti" style="--c:' + r[4] + '"><i class="ic" data-ic="' + r[3] + '"></i>' + (r[0] === 'co' && nb ? '<b class="nb">' + nb + '</b>' : '') + '</span><span class="tx"><b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + '</span></span>' + CHEV + '</button>';
      }).join('') + '</div>';
    }).join('');
    var ai = ok('ai') ? '<div class="adgt"><h3>Asisten</h3><span>Tanya data toko</span></div><div class="adl"><button class="adr" onclick="go(\'ai\')"><span class="ti" style="--c:#7c3aed"><i class="ic" data-ic="bolt"></i></span><span class="tx"><b>Asisten Ordela</b><span>Tanya omzet, menu terlaris, stok menipis</span></span>' + CHEV + '</button></div>' : '';
    el.innerHTML = hero + stats + ai + secs;
  }

  function init() {
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
