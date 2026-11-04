# Deploy aplikasi per subdomain (SSO)

Satu kode, empat aplikasi. **Mode default: tiap aplikasi punya layar login sendiri** dan sesinya hanya berlaku untuk aplikasi itu; hak tiap jabatan tetap berlaku (jabatan tanpa izin ditolak saat login). Mode SSO lewat `app.ordela.my.id` masih ada dan aktif bila `window.POS_SSO = true` di `config.js` aplikasi.

| Aplikasi | Subdomain | Repo tujuan |
|---|---|---|
| Kasir (staf) | kasir.ordela.my.id | `<owner>/ordela-kasir` |
| Admin / Owner | admin.ordela.my.id | `<owner>/ordela-admin` |
| Dapur (KDS) | dapur.ordela.my.id | `<owner>/ordela-dapur` |
| Pelanggan (QR order) | pesan.ordela.my.id | `<owner>/ordela-pesan` |

## Langkah satu kali (oleh pemilik)
1. Buat 4 repo kosong di atas (boleh public; GitHub Pages gratis).
2. Di tiap repo: Settings → Pages → Source: branch `gh-pages` / root. Custom domain terisi otomatis dari file `CNAME`.
3. DNS: buat 4 record `CNAME` (kasir, admin, dapur, pesan) menuju `<owner>.github.io`. Aktifkan "Enforce HTTPS" setelah sertifikat terbit.
4. Buat fine-grained token GitHub (akses Contents: Read & write ke 4 repo tadi), simpan di repo utama sebagai secret `DEPLOY_TOKEN`.
5. Jalankan SQL terbaru `setup.sql` di Supabase SQL Editor (berisi tabel/route SSO).
6. Supabase → Authentication → URL Configuration: tambahkan keempat subdomain ke Redirect URLs.

## Cara kerja
- `scripts/build-apps.mjs` membangun `dist/<app>` (config.js diberi `POS_APP`, `POS_IDP`, `POS_PUBLIC_URL`).
- Workflow `.github/workflows/apps.yml` berjalan tiap push ke `main` dan mengirim hasil ke repo tujuan. Tanpa `DEPLOY_TOKEN`, hanya build.
- Lokal: `node scripts/build-apps.mjs [kasir|admin|dapur|pesan]`.
- Pembatasan sisi server: tiap sesi terikat aplikasi (`aud`); rute di luar cakupan aplikasi ditolak 403.
