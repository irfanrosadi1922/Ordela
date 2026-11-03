import { readFileSync } from "node:fs";
import vm from "node:vm";

const direct = ["app-mode.js", "app-access.js", "app-navigation.js", "app-export-xlsx.js", "app-business-payroll.js", "app-business-inventory.js", "app-core.js", "config.js", "sbapi.js", "auth.js", "apps/order/config.js", "apps/order/sbapi.js"];
for (const file of direct) {
  new vm.Script(readFileSync(file, "utf8"), { filename: file });
  process.stdout.write("Syntax OK: " + file + "\n");
}
for (const file of ["index.html", "apps/order/index.html"]) {
  const html = readFileSync(file, "utf8");
  if (file === "index.html") {
    const runtimeSource = html + "\\n" + readFileSync("app-core.js", "utf8");
    for (const required of ["function ssCookieGet()", "function ssCookieSet(", "function ssCookieClear()", "Domain=.ordela.my.id", "ssCookieGet()"]) {
      if (!runtimeSource.includes(required)) throw new Error("Missing shared idle-session behavior: " + required);
    }
  }
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match, count = 0;
  while ((match = re.exec(html))) {
    const attrs = match[1] || "";
    if (/\bsrc\s*=/.test(attrs)) continue;
    const type = (attrs.match(/\btype\s*=\s*["']?([^\s"'>]+)/i) || [])[1] || "";
    if (type && !/^(text|application)\/(javascript|ecmascript)$/i.test(type) && type !== "module") continue;
    const code = match[2].trim();
    if (!code) continue;
    new vm.Script(code, { filename: file + "#inline-" + (++count) });
  }
  process.stdout.write("Syntax OK: " + file + " (" + count + " inline scripts)\n");
}
