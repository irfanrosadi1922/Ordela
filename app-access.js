/* Shared permission labels and view-to-permission mapping for the Ordela apps. */
(function (window) {
  'use strict';

  window.ORDELA_ACCESS_CONFIG = Object.freeze({
    permissionLabels: Object.freeze({
      pos: 'Kasir & Transaksi', shift: 'Shift Kasir', co: 'Pesanan Online', kds: 'Layar Dapur',
      mem: 'Member', inv: 'Inventori', opn: 'Stok Opname', buy: 'Pembelian & Pemasok',
      exp: 'Pengeluaran', hist: 'Rekap & Riwayat Penjualan', prn: 'Printer', set: 'Pengaturan', att: 'Absensi',
      ai: 'AI Manager', gift: 'Kartu Hadiah', rsv: 'Reservasi Meja'
    }),
    permissionDescriptions: Object.freeze({
      shift: 'Buka dan tutup shift, hitung uang laci, catat kas masuk/keluar.',
      kds: 'Lihat dan ubah status masak di Layar Dapur.',
      mem: 'Kelola data member dan poin.',
      opn: 'Hitung stok fisik (scan/ketik/Excel) dan terapkan selisih.',
      buy: 'Catat pembelian barang, pemasok, dan hutang.',
      exp: 'Catat dan lihat pengeluaran serta laba.',
      pos: 'Operasional kasir: Kasir, Meja, Beranda, Notifikasi, dan membuat transaksi.',
      co: 'Terima dan proses pesanan dari pelanggan.',
      inv: 'Lihat dan ubah stok, menu bahan, dan riwayat perubahan stok.',
      hist: 'Lihat rekap, riwayat, dan ekspor penjualan di Beranda.',
      prn: 'Sambungkan printer dan cetak struk.',
      set: 'Toko, desain struk, pembayaran, tampilan, data & cadangan.',
      att: 'Absen masuk dan pulang sendiri.',
      ai: 'Mengakses Asisten Ordela dan analisis bisnis berbasis data toko.',
      gift: 'Mengelola kartu hadiah, saldo, dan riwayat penggunaannya.',
      rsv: 'Mengelola reservasi meja dan status kedatangan pelanggan.'
    }),
    permissionShortLabels: Object.freeze({
      shift: 'Shift', kds: 'Dapur', mem: 'Member', opn: 'Opname', buy: 'Pembelian',
      exp: 'Pengeluaran', pos: 'Kasir', co: 'Pesanan Online', inv: 'Inventori',
      hist: 'Rekap', prn: 'Printer', set: 'Pengaturan', att: 'Absensi',
      ai: 'AI Manager', gift: 'Kartu Hadiah', rsv: 'Reservasi'
    }),
    viewPermissions: Object.freeze({
      ai: 'ai', riw: 'pos', integ: '#owner', pyr: '#owner', pos: 'pos', home: 'pos',
      table: 'pos', alert: 'pos', inv: 'inv', rc: 'set', prn: 'prn', set: 'set',
      co: 'co', att: 'att', usr: '#owner', gift: 'gift', rsv: 'rsv',
      shift: 'shift', exp: 'exp', mem: 'mem', buy: 'buy', promo: '#owner',
      kds: 'kds', opname: 'opn'
    })
  });
})(window);
