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
  "app-access.js",
  "app-core.js",
  "app-export-xlsx.js",
  "app-mode.js",
  "app-navigation.js",
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
if (mode === "business") {
  const payrollModule = join(ROOT, "app-business-payroll.js");
  if (!existsSync(payrollModule)) throw new Error("Required Business payroll module missing.");
  cpSync(payrollModule, join(output, "app-business-payroll.js"));
}
if (mode === "business") {
  const inventoryModule = join(ROOT, "app-business-inventory.js");
  if (!existsSync(inventoryModule)) throw new Error("Required Business inventory module missing.");
  cpSync(inventoryModule, join(output, "app-business-inventory.js"));
}
if (mode === "business") {
  const usersModule = join(ROOT, "app-business-users.js");
  if (!existsSync(usersModule)) throw new Error("Required Business users module missing.");
  cpSync(usersModule, join(output, "app-business-users.js"));
}
if (mode === "business") {
  const dashboardModule = join(ROOT, "app-business-dashboard.js");
  if (!existsSync(dashboardModule)) throw new Error("Required Business dashboard module missing.");
  cpSync(dashboardModule, join(output, "app-business-dashboard.js"));
}

const indexPath = join(output, "index.html");
const html = readFileSync(indexPath, "utf8");
const payrollTag = '<script src="app-business-payroll.js"></script>';
if (mode === "pos" && html.includes(payrollTag)) {
  writeFileSync(indexPath, html.replace(payrollTag, ""));
}
const inventoryTag = '<script src="app-business-inventory.js"></script>';
if (mode === "pos" && html.includes(inventoryTag)) {
  const current = readFileSync(indexPath, "utf8");
  writeFileSync(indexPath, current.replace(inventoryTag, ""));
}
const usersTag = '<script src="app-business-users.js"></script>';
if (mode === "pos" && html.includes(usersTag)) {
  const current = readFileSync(indexPath, "utf8");
  writeFileSync(indexPath, current.replace(usersTag, ""));
}
const dashboardTag = '<script src="app-business-dashboard.js"></script>';
if (mode === "pos" && html.includes(dashboardTag)) {
  const current = readFileSync(indexPath, "utf8");
  writeFileSync(indexPath, current.replace(dashboardTag, ""));
}
if (!html.includes('<script src="app-mode.js"></script>')) {
  throw new Error("App entrypoint does not load the extracted app-mode module.");
}
const modePath = join(output, "app-mode.js");
let modeSource = readFileSync(modePath, "utf8");
const hostSelector = /  var host = window\.location\.hostname;[\s\S]*?      : 'legacy';/;
if (!hostSelector.test(modeSource)) {
  throw new Error("Expected preview hostname selector not found; refusing to emit an unlocked app build.");
}
modeSource = modeSource.replace(hostSelector, "  var mode = '" + mode + "';");
writeFileSync(modePath, modeSource);
writeFileSync(join(output, "ordela-app.json"), JSON.stringify({
  name: mode === "pos" ? "Ordela POS" : "Ordela Business",
  mode,
  buildTarget: "preview",
  sharedBackend: "supabase",
  source: "index.html"
}, null, 2) + "\n");
console.log("Built " + mode + " app at dist/" + mode);
