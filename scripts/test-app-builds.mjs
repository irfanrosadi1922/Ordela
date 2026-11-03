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
  new vm.Script(accessConfig, { filename: mode + "/app-access.js" });
  if (!accessConfig.includes("window.ORDELA_ACCESS_CONFIG") || !accessConfig.includes("viewPermissions") || !accessConfig.includes("permissionLabels")) throw new Error("Missing extracted app-access module: " + mode);
  new vm.Script(modeConfig, { filename: mode + "/app-mode.js" });
  if (!modeConfig.includes("window.ORDELA_APP_CONFIG") || !modeConfig.includes("posOnly") || !modeConfig.includes("businessOnly")) throw new Error("Missing extracted app-mode module: " + mode);
  if (!html.includes('<script src="app-mode.js"></script>') || !html.includes('<script src="app-access.js"></script>')) throw new Error("App configuration modules are not loaded before the main app: " + mode);
  if (!modeConfig.includes("var mode = '" + mode + "';")) throw new Error("Build mode not locked in app-mode.js: " + mode);
  if (modeConfig.includes("window.location.hostname")) throw new Error("Runtime hostname selector leaked into " + mode);
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
