import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const setupSql = readFileSync(join(root, "setup.sql"), "utf8");
const permissionAllowlist = setupSql.match(/where x in \\(([^)]*)\\) group by x\\) s \\$\\$;/)?.[1] || "";
for (const permission of ["'ai'", "'gift'", "'rsv'"]) {
  if (!permissionAllowlist.includes(permission)) throw new Error("Database permission allowlist is missing " + permission);
}
if (!setupSql.includes('"att","ai","gift","rsv"]\'::jsonb')) throw new Error("Owner permission set is out of sync with the app");
if (!setupSql.includes("if not pos.can(me, 'ai') then return pos.r(403")) throw new Error("AI Manager API is missing server-side permission enforcement");
if (!setupSql.includes("not (pm ? 'gift' or pm ? 'pos')") || !setupSql.includes("not (pm ? 'rsv')")) throw new Error("Gift or reservation writes are missing server-side permission enforcement");
if (!setupSql.includes("'perms', '[\\\"pos\\\",\\\"shift\\\",\\\"co\\\",\\\"kds\\\",\\\"mem\\\",\\\"inv\\\",\\\"opn\\\",\\\"buy\\\",\\\"exp\\\",\\\"hist\\\",\\\"prn\\\",\\\"set\\\",\\\"att\\\",\\\"ai\\\",\\\"gift\\\",\\\"rsv\\\"]'::jsonb")) throw new Error("User administration permission catalog is out of sync");
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
  const inventoryTag = '<script src="app-business-inventory.js"></script>';
  const inventoryPath = join(dir, "app-business-inventory.js");
  const usersTag = '<script src="app-business-users.js"></script>';
  const usersPath = join(dir, "app-business-users.js");
  const dashboardTag = '<script src="app-business-dashboard.js"></script>';
  const dashboardPath = join(dir, "app-business-dashboard.js");
  const financeTag = '<script src="app-business-finance.js"></script>';
  const financePath = join(dir, "app-business-finance.js");
  const aiTag = '<script src="app-business-ai.js"></script>';
  const aiPath = join(dir, "app-business-ai.js");
  const integrationsTag = '<script src="app-business-integrations.js"></script>';
  const integrationsPath = join(dir, "app-business-integrations.js");
  const branchesTag = '<script src="app-business-branches.js"></script>';
  const branchesPath = join(dir, "app-business-branches.js");
  if (mode === "business") {
    if (!html.includes(branchesTag) || !existsSync(branchesPath)) throw new Error("Business branches module is missing from Business build");
    const branchesSource = readFileSync(branchesPath, "utf8");
    new vm.Script(branchesSource, { filename: mode + "/app-business-branches.js" });
    const branchesP2 = {};
    const branchesSandbox = { window: { P2: branchesP2 }, P2: branchesP2 };
    vm.runInNewContext(branchesSource, branchesSandbox, { filename: mode + "/app-business-branches.js" });
    for (const name of ["branch", "brSwitch", "brRep", "brTr", "brTrGo", "brDel", "brAdd"]) {
      if (typeof branchesP2[name] !== "function") throw new Error("Business branches API missing P2." + name);
    }
  } else if (html.includes(branchesTag) || existsSync(branchesPath)) {
    throw new Error("Business branches source leaked into POS build");
  }
  const reservationsTag = '<script src="app-business-reservations.js"></script>';
  const reservationsPath = join(dir, "app-business-reservations.js");
  const stocktakeTag = '<script src="app-business-stocktake.js"></script>';
  const stocktakePath = join(dir, "app-business-stocktake.js");
  const giftsTag = '<script src="app-business-gifts.js"></script>';
  const giftsPath = join(dir, "app-business-gifts.js");
  const promosTag = '<script src="app-business-promos.js"></script>';
  const promosPath = join(dir, "app-business-promos.js");
  if (mode === "business") {
    if (!html.includes(promosTag) || !existsSync(promosPath)) throw new Error("Business promo module is missing from Business build");
    const promosSource = readFileSync(promosPath, "utf8");
    new vm.Script(promosSource, { filename: mode + "/app-business-promos.js" });
    const promosP2 = { views: {} };
    const promosSandbox = { window: { P2: promosP2 }, P2: promosP2 };
    vm.runInNewContext(promosSource, promosSandbox, { filename: mode + "/app-business-promos.js" });
    if (typeof promosP2.views.promo !== "function" ||
        typeof promosSandbox.window.promoForm !== "function" ||
        typeof promosSandbox.window.PF_day !== "function" ||
        typeof promosSandbox.window.promoSave !== "function" ||
        typeof promosSandbox.window.promoDel !== "function") {
      throw new Error("Business promo feature API is incomplete");
    }
  } else if (html.includes(promosTag) || existsSync(promosPath)) {
    throw new Error("Business promo administration leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(giftsTag) || !existsSync(giftsPath)) throw new Error("Business gift-card module is missing from Business build");
    const giftsSource = readFileSync(giftsPath, "utf8");
    new vm.Script(giftsSource, { filename: mode + "/app-business-gifts.js" });
    const giftsP2 = { views: {} };
    const giftsSandbox = { window: { P2: giftsP2 }, P2: giftsP2 };
    vm.runInNewContext(giftsSource, giftsSandbox, { filename: mode + "/app-business-gifts.js" });
    for (const name of ["giftForm", "giftSave", "giftDetail", "giftTop", "giftDel"]) {
      if (typeof giftsP2[name] !== "function") throw new Error("Business gift-card API missing P2." + name);
    }
    if (typeof giftsP2.views.gift !== "function" ||
        !readFileSync(join(root, "pos2.js"), "utf8").includes("P2.giftUse=function(){") ||
        !readFileSync(join(root, "pos2.js"), "utf8").includes("P2.giftClear=function(){")) {
      throw new Error("Gift-card management/redemption boundary is invalid");
    }
  } else if (html.includes(giftsTag) || existsSync(giftsPath)) {
    throw new Error("Business gift-card administration leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(stocktakeTag) || !existsSync(stocktakePath)) throw new Error("Business stocktake module is missing from Business build");
    const stocktakeSource = readFileSync(stocktakePath, "utf8");
    new vm.Script(stocktakeSource, { filename: mode + "/app-business-stocktake.js" });
    const stocktakeP2 = { views: {} };
    const stocktakeSandbox = { window: { P2: stocktakeP2 }, P2: stocktakeP2 };
    vm.runInNewContext(stocktakeSource, stocktakeSandbox, { filename: mode + "/app-business-stocktake.js" });
    for (const name of ["opnReset", "opF", "opSet", "opEnter", "opScan", "opReview"]) {
      if (typeof stocktakeP2[name] !== "function") throw new Error("Business stocktake API missing P2." + name);
    }
    if (typeof stocktakeP2.views.opname !== "function" || typeof stocktakeSandbox.window.OPN_q !== "function") {
      throw new Error("Business stocktake view/search API is incomplete");
    }
    if (!readFileSync(join(root, "app-business-inventory.js"), "utf8").includes("window.OP = OP;")) {
      throw new Error("Business stocktake dependency on inventory workbook module is missing");
    }
  } else if (html.includes(stocktakeTag) || existsSync(stocktakePath)) {
    throw new Error("Business stocktake source leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(reservationsTag) || !existsSync(reservationsPath)) throw new Error("Business reservations module is missing from Business build");
    const reservationsSource = readFileSync(reservationsPath, "utf8");
    new vm.Script(reservationsSource, { filename: mode + "/app-business-reservations.js" });
    const reservationsP2 = { views: {} };
    const reservationsSandbox = { window: { P2: reservationsP2 }, P2: reservationsP2 };
    vm.runInNewContext(reservationsSource, reservationsSandbox, { filename: mode + "/app-business-reservations.js" });
    for (const name of ["rsvForm", "rsvSave", "rsvSet"]) {
      if (typeof reservationsP2[name] !== "function") throw new Error("Business reservations API missing P2." + name);
    }
    if (typeof reservationsP2.views.rsv !== "function") throw new Error("Business reservations view is not registered");
  } else if (html.includes(reservationsTag) || existsSync(reservationsPath)) {
    throw new Error("Business reservations source leaked into POS build");
  }
  if (mode === "business" && !readFileSync(join(root, "pos2.js"), "utf8").includes("P2.rsvFor=function(k)")) {
    throw new Error("Shared POS table reservation lookup was removed");
  }
  if (mode === "business") {
    if (!html.includes(integrationsTag) || !existsSync(integrationsPath)) throw new Error("Business integrations module is missing from Business build");
    const integrationsSource = readFileSync(integrationsPath, "utf8");
    new vm.Script(integrationsSource, { filename: mode + "/app-business-integrations.js" });
    const integrationsP2 = { views: {}, t: {} };
    const integrationsSandbox = { window: { P2: integrationsP2 }, P2: integrationsP2 };
    vm.runInNewContext(integrationsSource, integrationsSandbox, { filename: mode + "/app-business-integrations.js" });
    for (const name of ["igForm", "igSave", "igHook", "igRegen", "igTest", "igDel", "igReload"]) {
      if (typeof integrationsP2[name] !== "function") throw new Error("Business integrations API missing P2." + name);
    }
    if (typeof integrationsP2.views.integ !== "function" || appCore.includes("const IG=")) {
      throw new Error("Business integrations feature boundary or view registration is invalid");
    }
  } else if (html.includes(integrationsTag) || existsSync(integrationsPath)) {
    throw new Error("Business integrations source leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(aiTag) || !existsSync(aiPath)) throw new Error("Business AI module is missing from Business build");
    const aiSource = readFileSync(aiPath, "utf8");
    new vm.Script(aiSource, { filename: mode + "/app-business-ai.js" });
    const aiP2 = { views: {}, t: {} };
    const aiSandbox = { window: { P2: aiP2 }, P2: aiP2 };
    vm.runInNewContext(aiSource, aiSandbox, { filename: mode + "/app-business-ai.js" });
    for (const name of ["aiSend", "aiAsk", "aiClear", "aiAnswer", "aiCtx"]) {
      if (typeof aiP2[name] !== "function") throw new Error("Business AI API missing P2." + name);
    }
    if (typeof aiP2.views.ai !== "function" || appCore.includes("const AI=")) {
      throw new Error("Business AI feature boundary or view registration is invalid");
    }
  } else if (html.includes(aiTag) || existsSync(aiPath)) {
    throw new Error("Business AI source leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(financeTag) || !existsSync(financePath)) throw new Error("Business finance module is missing from Business build");
    const financeSource = readFileSync(financePath, "utf8");
    new vm.Script(financeSource, { filename: mode + "/app-business-finance.js" });
    const financeSandbox = { window: { P2: { views: {}, t: {} } } };
    vm.runInNewContext(financeSource, financeSandbox, { filename: mode + "/app-business-finance.js" });
    if (typeof financeSandbox.window.P2.views.exp !== "function" ||
        typeof financeSandbox.window.P2.views.buy !== "function" ||
        typeof financeSandbox.window.profit !== "function" ||
        typeof financeSandbox.window.debtOf !== "function" ||
        !financeSandbox.window.BP || !financeSandbox.window.EP) {
      throw new Error("Business finance feature API is incomplete");
    }
  } else if (html.includes(financeTag) || existsSync(financePath)) {
    throw new Error("Business finance source leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(dashboardTag) || !existsSync(dashboardPath)) throw new Error("Business dashboard module is missing from Business build");
    const dashboardSource = readFileSync(dashboardPath, "utf8");
    new vm.Script(dashboardSource, { filename: mode + "/app-business-dashboard.js" });
    const dashboardSandbox = { window: {} };
    vm.runInNewContext(dashboardSource, dashboardSandbox, { filename: mode + "/app-business-dashboard.js" });
    const dashboardApi = dashboardSandbox.window;
    for (const name of ["salesSeries", "hrPrev", "hrLabel", "areaChart", "donutSvg", "histJump", "renderHome"]) {
      if (typeof dashboardApi[name] !== "function") throw new Error("Business dashboard API missing " + name);
    }
    if (!Array.isArray(dashboardApi.HR_PRE) || dashboardApi.HR_PRE.length !== 5 || typeof dashboardApi.KI !== "function" ||
        appCore.includes("function renderHome(") || !appCore.includes("if(S.view==='home')renderHome();")) {
      throw new Error("Business dashboard feature boundary or shared boot integration is invalid");
    }
  } else if (html.includes(dashboardTag) || existsSync(dashboardPath)) {
    throw new Error("Business dashboard source leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(usersTag) || !existsSync(usersPath)) throw new Error("Business users module is missing from Business build");
    const usersSource = readFileSync(usersPath, "utf8");
    new vm.Script(usersSource, { filename: mode + "/app-business-users.js" });
    const usersSandbox = { window: {} };
    vm.runInNewContext(usersSource, usersSandbox, { filename: mode + "/app-business-users.js" });
    if (!usersSandbox.window.USR || !usersSandbox.window.ULOG ||
        typeof usersSandbox.window.renderUsr !== "function" ||
        typeof usersSandbox.window.usrSave !== "function" ||
        typeof usersSandbox.window.usrRoleOptions !== "function") {
      throw new Error("Business users feature API is incomplete");
    }
    if (appCore.includes("const USR=") || !appCore.includes("function usrRoleLabel(s){") ||
        !appCore.includes("if(S.view==='usr')renderUsr();")) {
      throw new Error("Business users feature boundary or shared role-label integration is invalid");
    }
  } else if (html.includes(usersTag) || existsSync(usersPath)) {
    throw new Error("Business users source leaked into POS build");
  }
  if (mode === "business") {
    if (!html.includes(inventoryTag) || !existsSync(inventoryPath)) throw new Error("Business inventory module is missing from Business build");
    const inventorySource = readFileSync(inventoryPath, "utf8");
    new vm.Script(inventorySource, { filename: mode + "/app-business-inventory.js" });
    const inventorySandbox = { window: {} };
    vm.runInNewContext(inventorySource, inventorySandbox, { filename: mode + "/app-business-inventory.js" });
    if (!inventorySandbox.window.OP || typeof inventorySandbox.window.opnLoad !== "function" ||
        typeof inventorySandbox.window.opnApply !== "function" || typeof inventorySandbox.window.xlsxRead !== "function") {
      throw new Error("Business inventory feature API is incomplete");
    }
    if (appCore.includes("const OP=") || !appCore.includes("function renderInv()")) {
      throw new Error("Inventory count feature boundary or shared inventory integration is invalid");
    }
  } else if (html.includes(inventoryTag) || existsSync(inventoryPath)) {
    throw new Error("Business inventory source leaked into POS build");
  }
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
  const xlsxTagIndex = html.indexOf('<script src="app-export-xlsx.js"></script>');
  const payrollTagIndex = html.indexOf(payrollTag);
  const coreTagIndex = html.indexOf('<script src="app-core.js"></script>');
  const inventoryTagIndex = html.indexOf(inventoryTag);
  const usersTagIndex = html.indexOf(usersTag);
  const dashboardTagIndex = html.indexOf(dashboardTag);
  const financeTagIndex = html.indexOf(financeTag);
  const pos2TagIndex = html.indexOf('<script src="pos2.js"></script>');
  const promosTagIndex = html.indexOf(promosTag);
  const giftsTagIndex = html.indexOf(giftsTag);
  const stocktakeTagIndex = html.indexOf(stocktakeTag);
  const branchesTagIndex = html.indexOf(branchesTag);
  const reservationsTagIndex = html.indexOf(reservationsTag);
  const integrationsTagIndex = html.indexOf(integrationsTag);
  const aiTagIndex = html.indexOf(aiTag);
  if (xlsxTagIndex < 0 || coreTagIndex < 0 || xlsxTagIndex >= coreTagIndex ||
      (mode === "business" && !(pos2TagIndex >= 0 && pos2TagIndex < financeTagIndex && xlsxTagIndex < payrollTagIndex && payrollTagIndex < inventoryTagIndex && inventoryTagIndex < usersTagIndex && usersTagIndex < dashboardTagIndex && dashboardTagIndex < financeTagIndex && financeTagIndex < aiTagIndex && aiTagIndex < integrationsTagIndex && integrationsTagIndex < branchesTagIndex && branchesTagIndex < reservationsTagIndex && reservationsTagIndex < stocktakeTagIndex && stocktakeTagIndex < giftsTagIndex && giftsTagIndex < promosTagIndex && promosTagIndex < coreTagIndex)) ||
      (mode === "pos" && (payrollTagIndex >= 0 || inventoryTagIndex >= 0 || usersTagIndex >= 0 || dashboardTagIndex >= 0 || financeTagIndex >= 0 || aiTagIndex >= 0 || integrationsTagIndex >= 0 || branchesTagIndex >= 0 || reservationsTagIndex >= 0 || stocktakeTagIndex >= 0 || giftsTagIndex >= 0 || promosTagIndex >= 0))) {
    throw new Error("Feature modules are not loaded in the required order: " + mode);
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
