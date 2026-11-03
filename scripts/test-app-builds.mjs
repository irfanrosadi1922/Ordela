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

  if (mode === "business" && !html.includes("if(ORDELA_APP_MODE==='business'&&canView('home'))return 'home';")) throw new Error("Business app must open its dashboard after login");
  for (const required of ["function ssCookieGet()", "function ssCookieSet(", "function ssCookieClear()", "Domain=.ordela.my.id", "function canView(v)"]) {
    if (!html.includes(required)) throw new Error("Missing required shared app behavior in " + mode + ": " + required);
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
