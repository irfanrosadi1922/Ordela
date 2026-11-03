import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
for (const mode of ["pos", "business"]) {
  const dir = join(root, "dist", mode);
  const meta = JSON.parse(readFileSync(join(dir, "ordela-app.json"), "utf8"));
  if (meta.mode !== mode || meta.buildTarget !== "preview") throw new Error("Incorrect build metadata: " + mode);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  if (!html.includes("const ORDELA_APP_MODE='" + mode + "';")) throw new Error("Build mode not locked: " + mode);
  if (html.includes("const ORDELA_APP_MODE=location.hostname")) throw new Error("Runtime hostname mode selector leaked into " + mode);
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
