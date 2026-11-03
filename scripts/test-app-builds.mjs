import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
for (const mode of ["pos", "business"]) {
  const dir = join(root, "dist", mode);
  const meta = JSON.parse(readFileSync(join(dir, "ordela-app.json"), "utf8"));
  if (meta.mode !== mode || meta.buildTarget !== "preview") throw new Error("Incorrect build metadata: " + mode);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const modeConfig = readFileSync(join(dir, "app-mode.js"), "utf8");
  const accessConfig = readFileSync(join(dir, "app-access.js"), "utf8");
  const navigationConfig = readFileSync(join(dir, "app-navigation.js"), "utf8");
  const appCore = readFileSync(join(dir, "app-core.js"), "utf8");
  const payrollTag = '<script src="app-business-payroll.js"></script>';
  const payrollPath = join(dir, "app-business-payroll.js");
  if (mode === "business") {
    if (!html.includes(payrollTag) || !existsSync(payrollPath)) throw new Error("Business payroll module is missing from Business build");
    const payrollSource = readFileSync(payrollPath, "utf8");
    new vm.Script(payrollSource, { filename: mode + "/app-business-payroll.js" });
    const payrollSandbox = { window: {} };
    vm.runInNewContext(payrollSource, payrollSandbox, { filename: mode + "/app-business-payroll.js" });
    if (!payrollSandbox.window.PY || typeof payrollSandbox.window.pyRender !== "function" ||
        typeof payrollSandbox.window.attPair !== "function" || typeof payrollSandbox.window.pyXlsx !== "function") {
      throw new Error("Business payroll public feature API is incomplete");
    }
    if (appCore.includes("const PY=") || !appCore.includes("if(S.view==='pyr')pyRender();")) {
      throw new Error("Payroll feature boundary or Business integration point is invalid");
    }
  } else if (html.includes(payrollTag) || existsSync(payrollPath)) {
    throw new Error("Business payroll source leaked into POS build");
  }
  const xlsxModule = readFileSync(join(dir, "app-export-xlsx.js"), "utf8");
  new vm.Script(xlsxModule, { filename: mode + "/app-export-xlsx.js" });
  if (!html.includes('<script src="app-export-xlsx.js"></script><script src="app-core.js"></script>')) {
    throw new Error("XLSX helper must load before the shared runtime: " + mode);
  }
  const xlsxSandbox = { window: {}, TextEncoder, Blob, Uint8Array };
  vm.runInNewContext(xlsxModule, xlsxSandbox, { filename: mode + "/app-export-xlsx.js" });
  const xlsxApi = xlsxSandbox.window.OrdelaXlsx;
  if (!xlsxApi || xlsxApi.crc32(new TextEncoder().encode("123456789")) !== 0xcbf43926) {
    throw new Error("XLSX CRC-32 regression failed: " + mode);
  }
  const xlsxBlob = xlsxApi.build([{ name: "Uji", rows: [["Nama", "Nilai"], ["Ordela", 123]], head: 1, w: [20, 12] }], 0);
  if (xlsxBlob.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    throw new Error("XLSX MIME type regression failed: " + mode);
  }
  const xlsxBytes = new Uint8Array(await xlsxBlob.arrayBuffer());
  const zipView = new DataView(xlsxBytes.buffer, xlsxBytes.byteOffset, xlsxBytes.byteLength);
  const zipNames = [];
  for (let offset = 0; offset + 30 <= xlsxBytes.length && zipView.getUint32(offset, true) === 0x04034b50;) {
    const nameLength = zipView.getUint16(offset + 26, true);
    const extraLength = zipView.getUint16(offset + 28, true);
    const size = zipView.getUint32(offset + 18, true);
    const nameStart = offset + 30;
    zipNames.push(new TextDecoder().decode(xlsxBytes.slice(nameStart, nameStart + nameLength)));
    offset = nameStart + nameLength + extraLength + size;
  }
  for (const required of ["[Content_Types].xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]) {
    if (!zipNames.includes(required)) throw new Error("Generated XLSX is missing " + required + ": " + mode);
  }
  if (appCore.includes("function xlsxBuild") || !appCore.includes("OrdelaXlsx.build(")) {
    throw new Error("Shared runtime did not migrate to the standalone XLSX module: " + mode);
  }
  new vm.Script(appCore, { filename: mode + "/app-core.js" });
  if (!html.includes('<script src="app-core.js"></script>')) throw new Error("Main app core is not loaded as an external module: " + mode);
  if (html.includes("const $=s=>document.querySelector(s)")) throw new Error("Main app core remains duplicated inline: " + mode);
  new vm.Script(accessConfig, { filename: mode + "/app-access.js" });
  if (!accessConfig.includes("window.ORDELA_ACCESS_CONFIG") || !accessConfig.includes("viewPermissions") || !accessConfig.includes("permissionLabels")) throw new Error("Missing extracted app-access module: " + mode);
  new vm.Script(modeConfig, { filename: mode + "/app-mode.js" });
  if (!modeConfig.includes("window.ORDELA_APP_CONFIG") || !modeConfig.includes("posOnly") || !modeConfig.includes("businessOnly")) throw new Error("Missing extracted app-mode module: " + mode);
  if (!html.includes('<script src="app-mode.js"></script>') || !html.includes('<script src="app-access.js"></script>') || !html.includes('<script src="app-navigation.js"></script>')) throw new Error("App configuration modules are not loaded before the main app: " + mode);
  new vm.Script(navigationConfig, { filename: mode + "/app-navigation.js" });
  const navigationSandbox = { window: {} };
  vm.runInNewContext(navigationConfig, navigationSandbox, { filename: mode + "/app-navigation.js" });
  const navigation = navigationSandbox.window.ORDELA_NAV_CONFIG;
  for (const key of ["secondaryViews", "accountViews"]) {
    const values = navigation[key];
    if (!Array.isArray(values) || new Set(values).size !== values.length || values.some(value => typeof value !== "string" || !value)) {
      throw new Error("Invalid or duplicate navigation metadata: " + key + " (" + mode + ")");
    }
  }
  for (const view of navigation.secondaryViews) {
    if (!["ai", "riw", "integ", "gift", "rsv", "opname", "menu", "shift", "exp", "buy", "mem", "promo", "kds"].includes(view)) {
      throw new Error("Unknown secondary navigation view: " + view);
    }
  }
  if (!navigation.accountViews.includes("acc") || !navigation.accountViews.includes("pw")) throw new Error("Account navigation metadata is incomplete: " + mode);
  if (!modeConfig.includes("var mode = '" + mode + "';")) throw new Error("Build mode not locked in app-mode.js: " + mode);
  if (modeConfig.includes("window.location.hostname")) throw new Error("Runtime hostname selector leaked into " + mode);
  const accessSandbox = { window: {} };
  vm.runInNewContext(accessConfig, accessSandbox, { filename: mode + "/app-access.js" });
  const permissions = accessSandbox.window.ORDELA_ACCESS_CONFIG;
  for (const [view, permission] of Object.entries(permissions.viewPermissions)) {
    if (permission !== "#owner" && !Object.prototype.hasOwnProperty.call(permissions.permissionLabels, permission)) {
      throw new Error("View " + view + " maps to an undefined permission: " + permission);
    }
    if (!html.includes('id="v-' + view + '"')) {
      throw new Error("Permission map points to a missing page section: " + view + " (" + mode + ")");
    }
  }
  const modeSandbox = { window: { location: { hostname: "build.invalid" } } };
  vm.runInNewContext(modeConfig, modeSandbox, { filename: mode + "/app-mode.js" });
  const appConfig = modeSandbox.window.ORDELA_APP_CONFIG;
  const allGroups = [...appConfig.posOnly, ...appConfig.businessOnly, ...appConfig.shared];
  if (new Set(allGroups).size !== allGroups.length) throw new Error("App route groups overlap: " + mode);
  if (!appConfig.posOnly.includes("pos") || !appConfig.posOnly.includes("table") || !appConfig.posOnly.includes("shift") || !appConfig.posOnly.includes("kds")) throw new Error("POS feature ownership is incomplete: " + mode);
  for (const view of ["home", "inv", "usr", "pyr", "integ", "gift", "rsv", "opname", "exp", "mem", "buy", "promo", "ai", "branch"]) {
    if (!appConfig.businessOnly.includes(view)) throw new Error("Business feature ownership is incomplete: " + view);
  }
  for (const view of ["menu", "riw", "co", "alert", "att", "set", "rc", "prn"]) {
    if (!appConfig.shared.includes(view)) throw new Error("Shared feature ownership is incomplete: " + view);
  }

  const runtimeSource = html + "\\n" + appCore;
  if (mode === "business" && !runtimeSource.includes("if(ORDELA_APP_MODE==='business'&&canView('home'))return 'home';")) throw new Error("Business app must open its dashboard after login");
  for (const required of ["function ssCookieGet()", "function ssCookieSet(", "function ssCookieClear()", "Domain=.ordela.my.id", "function canView(v)"]) {
    if (!runtimeSource.includes(required)) throw new Error("Missing required shared app behavior in " + mode + ": " + required);
  }
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match, count = 0;
  while ((match = scriptRe.exec(html))) {
    if (/\bsrc\s*=/.test(match[1] || "")) continue;
    const type = (match[1].match(/\btype\s*=\s*["']?([^\s"'>]+)/i) || [])[1] || "";
    if (type && !/^(text|application)\/(javascript|ecmascript)$/i.test(type) && type !== "module") continue;
    if (!match[2].trim()) continue;
    new vm.Script(match[2], { filename: mode + "/index.html#inline-" + (++count) });
  }
  for (const asset of ["config.js", "sbapi.js", "auth.js", "pos2.js", "qr.js", "qris.js", "sw.js", "manifest.webmanifest", "brand"]) {
    const path = join(dir, asset);
    if (!statSync(path).isDirectory() && !readFileSync(path, "utf8").length) throw new Error("Empty app asset: " + mode + "/" + asset);
  }
  if (readdirSync(dir).includes("CNAME")) throw new Error("Root CNAME must not be copied to app-specific Pages builds");
  console.log("PASS " + mode + " build (" + count + " inline scripts)");
}
