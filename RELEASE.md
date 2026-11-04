# Rilis Ordela — checklist & catatan

## Isi rilis (sejak a973b0f)
- **Keamanan:** IP klien tidak bisa dipalsukan (x-forwarded-for), batas 10 MB dokumen data, kredensial integrasi terenkripsi (write-only), batas pemakaian AI 30/jam per akun, riwayat chat AI ikut terhapus saat akun dihapus.
- **SSO + 4 aplikasi:** kasir / admin / dapur / pesan di subdomain `*.ordela.my.id`; login satu kali via `app.ordela.my.id`; sesi terikat ke aplikasi dan rute dibatasi di server.
- **Integrasi Center:** GoFood / GrabFood / ShopeeFood (penerima pesanan per toko) + Webhook keluar bertanda tangan HMAC.
- **Riwayat Pesanan** menggantikan tombol keranjang; Meja dipindah ke sana. **Asisten AI** (aturan lokal + cloud AI).
- **Deploy otomatis** ke 4 repo lewat `.github/workflows/apps.yml` (secret `DEPLOY_TOKEN`).

## Sudah diuji
- Server (Postgres lokal): kds, cabang, integrasi, food-hook, keamanan, SSO — lulus.
- Browser (Playwright): integrasi, riwayat, SSO klien, pembatasan menu per aplikasi — lulus.
- Produksi (baca-saja): objek SQL baru ada; route SSO menolak kode palsu dengan benar.
- Manual oleh pemilik: alur login SSO di 4 subdomain — lancar.

## Belum / perlu perhatian
- Tes AI lama (`t18`, `t19`, `t21`) usang sejak logika chat AI ditulis ulang; perlu disesuaikan, bukan bug SSO/keamanan yang diketahui.
- Integrasi resmi GoFood/Grab/Shopee butuh kredensial mitra dari platform masing-masing.
- Belum diuji di perangkat nyata untuk APK/IPA: bangun ulang dan coba login SSO di aplikasi native.
- Supabase Auth: pendekkan masa berlaku OTP (<1 jam); aktifkan perlindungan kata sandi bocor (mungkin butuh paket berbayar).
- Edge Functions `food-hook` dan `ai-chat`: pastikan versi terbaru ter-deploy (Verify JWT mati).

## Checklist sebelum umumkan
- [ ] `setup.sql` terbaru sudah dijalankan (terverifikasi di produksi)
- [ ] 4 subdomain terbuka dengan HTTPS dan alur SSO lancar
- [ ] Secret `DEPLOY_TOKEN` terisi, workflow deploy hijau
- [ ] Naikkan versi service worker tiap rilis (`sw.js`)
- [ ] Bangun ulang APK/IPA lalu uji di perangkat
- [ ] Cadangkan database Supabase sebelum rilis besar

## Rollback
- Aplikasi: deploy ulang commit sebelumnya dari Actions (Run workflow pada commit lama) atau `git revert`.
- Aplikasi lama tetap ada di `app.ordela.my.id` (penuh, tanpa pembatasan), jadi staf bisa kembali ke sana kapan pun.
