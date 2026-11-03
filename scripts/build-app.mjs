import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
if (!["pos", "business"].includes(mode)) {
  throw new Error("Usage: node scripts/build-app.mjs <pos|business>");
}

const output = join(ROOT, "dist", mode);
const publicFiles = [
  "auth.js",
  "brand",
  "config.js",
  "html5-qrcode.min.js",
  "icon-192.png",
  "icon-512.png",
  "icon-light-192.png",
  "icon-light-512.png",
  "icon-maskable-512.png",
  "icon-ordela-dark.svg",
  "icon-ordela-maskable.svg",
  "icon-ordela-red.svg",
  "index.html",
  "ios-icon-1024.png",
  "manifest.webmanifest",
  "native.js",
  "pos2.js",
  "qr.js",
  "qris.js",
  "sbapi.js",
  "sw.js"
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of publicFiles) {
  const source = join(ROOT, file);
  if (!existsSync(source)) throw new Error("Required app asset missing: " + file);
  cpSync(source, join(output, file), { recursive: true });
}

const indexPath = join(output, "index.html");
let html = readFileSync(indexPath, "utf8");
const modeLine = "const ORDELA_APP_MODE=location.hostname==='pos-preview.ordela.my.id'?'pos':location.hostname==='app-preview.ordela.my.id'?'business':'legacy';";
if (!html.includes(modeLine)) throw new Error("Expected staging app-mode selector not found; refusing to emit an unfiltered build.");
html = html.replace(modeLine, "const ORDELA_APP_MODE='" + mode + "';");
writeFileSync(indexPath, html);
writeFileSync(join(output, "ordela-app.json"), JSON.stringify({
  name: mode === "pos" ? "Ordela POS" : "Ordela Business",
  mode,
  buildTarget: "preview",
  sharedBackend: "supabase",
  source: "index.html"
}, null, 2) + "\n");
console.log("Built " + mode + " app at dist/" + mode);
