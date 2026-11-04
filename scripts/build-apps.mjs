// Membangun folder siap-deploy untuk tiap subdomain dari satu basis kode:  node scripts/build-apps.mjs [app ...]
//   kasir / admin / dapur : aplikasi yang sama dengan profil terbatas (window.POS_APP) + SSO lewat pusat identitas (POS_IDP)
//   pesan                 : halaman pelanggan (order.html menjadi index.html)
// Hasil di dist/<app>/ lengkap dengan CNAME. Pusat identitas = aplikasi penuh di app.ordela.my.id (repo ini, tidak dibangun ulang).
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const IDP = process.env.POS_IDP || 'https://app.ordela.my.id';
const DOMAIN = process.env.POS_DOMAIN || 'ordela.my.id';
const APPS = {
  kasir: { name: 'Ordela Kasir', short: 'Kasir' },
  admin: { name: 'Ordela Admin', short: 'Admin' },
  dapur: { name: 'Ordela Dapur', short: 'Dapur' },
  pesan: { name: 'Ordela Pesan', short: 'Pesan' },
};
const SHARED = ['sw.js', 'skin.css', 'skin.js', 'viewport.js', 'sbapi.js', 'config.js', 'qr.js', 'qris.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-light-192.png', 'icon-light-512.png',
  'icon-ordela-dark.svg', 'icon-ordela-red.svg', 'icon-ordela-maskable.svg'];
const STAFF = ['index.html', 'order.html', 'auth.js', 'native.js', 'pos2.js', 'sso.js', 'html5-qrcode.min.js', 'manifest.webmanifest'];

const want = process.argv.slice(2).filter((a) => APPS[a]);
const list = want.length ? want : Object.keys(APPS);
rmSync(DIST, { recursive: true, force: true });

for (const app of list) {
  const out = join(DIST, app);
  mkdirSync(out, { recursive: true });
  const files = app === 'pesan' ? SHARED.filter((f) => f !== 'sw.js') : [...SHARED, ...STAFF.filter((f) => f !== 'order.html')];
  for (const f of files) {
    if (!existsSync(join(ROOT, f))) throw new Error('berkas tidak ditemukan: ' + f);
    cpSync(join(ROOT, f), join(out, f));
  }
  if (existsSync(join(ROOT, 'brand'))) cpSync(join(ROOT, 'brand'), join(out, 'brand'), { recursive: true });   // logo dipakai Asisten & lainnya
  let cfg = readFileSync(join(ROOT, 'config.js'), 'utf8').replace(/\s+$/, '');
  if (app === 'pesan') {
    cpSync(join(ROOT, 'order.html'), join(out, 'index.html'));
    cpSync(join(ROOT, 'order.html'), join(out, 'order.html'));
  } else {
    cfg += `\nwindow.POS_APP = ${JSON.stringify(app)};\nwindow.POS_IDP = ${JSON.stringify(IDP)};\nwindow.POS_PUBLIC_URL = ${JSON.stringify(process.env.POS_PESAN_URL || `https://pesan.${DOMAIN}/`)};   // QR pelanggan menuju aplikasi pesan\n`;
    const m = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
    m.name = APPS[app].name; m.short_name = APPS[app].short; m.description = APPS[app].name;
    writeFileSync(join(out, 'manifest.webmanifest'), JSON.stringify(m, null, 2));
    const sw = readFileSync(join(out, 'sw.js'), 'utf8').replace(/const V = 'ordela-/, `const V = '${app}-ordela-`);   // cache terpisah per aplikasi
    writeFileSync(join(out, 'sw.js'), sw);
  }
  writeFileSync(join(out, 'config.js'), cfg + '\n');
  writeFileSync(join(out, 'CNAME'), `${app}.${DOMAIN}\n`);
  writeFileSync(join(out, '.nojekyll'), '');
  console.log('OK', app, '→', `dist/${app}`, `(${app}.${DOMAIN})`);
}
