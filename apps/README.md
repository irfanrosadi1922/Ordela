# Ordela application workspaces

Target workspaces:
- `business/`: owner/admin/manager dashboard
- `pos/`: cashier and operational POS
- `order/`: customer-facing QR and online ordering

The root-level app remains the production rollback baseline during migration. Do not move production DNS or merge the migration PR until each extracted app has passed functional regression and deployment checks.

## Preview applications

Dedicated Cloudflare Pages projects are provisioned and the preview aliases are attached to the matching projects:

- `app-preview.ordela.my.id` → `ordela-business-preview` → `dist/business`
- `pos-preview.ordela.my.id` → `ordela-pos-preview` → `dist/pos`
- `api-preview.ordela.my.id` → `ordela-sso-preview` Worker

The two Pages projects also have their own `.pages.dev` hostnames. The latest deployment for branch commit `8aa889f7ddf97e1f1888cd3509e5e5c3a9fbf623` was still processing when this document was last checked. Earlier canonical deployments for both projects completed successfully. Re-check the latest deployment and browser behavior before relying on the newest build.

Production hostnames and DNS remain unchanged.

## Frontend build boundary

The current pipeline emits two separate static artifacts:

- `npm run build:pos` → `dist/pos`
- `npm run build:business` → `dist/business`

Each output locks its app mode at build time, carries its own public assets and app metadata, and excludes repository-only content and the root `CNAME`. Run `npm run test:apps` after both builds to validate mode isolation, required assets, SSO/session code, and inline JavaScript syntax.

**Important limitation:** these are separate deployment artifacts, not yet fully independent frontend source trees. Both are still generated from the shared monolithic root `index.html`. POS and Business feature code must be extracted into their respective workspaces with regression coverage before this migration can be considered complete.

## Ordering app

`apps/order/` contains the first isolated customer ordering frontend copied from the existing root `order.html` entry point. It uses the existing Supabase `public.pos_api(jsonb)` RPC through the shared API client. Its own README records the preview smoke-test status and the remaining real-tenant QR, cart, order-status, and payment tests.

## Authentication and release gates

- SSO preview uses a shared secure cookie across Ordela subdomains and an exact-origin CORS allowlist.
- The preview Worker and browser integration still require an authenticated end-to-end test using the same browser session across Business and POS. Never share passwords or session cookies during testing.
- UI route filtering is not a replacement for server-side role/tenant authorization.
- Verify login, logout, password change, cross-app switching, role permissions, session expiry, ordering, payments, printing, and mobile/PWA behavior before production migration.
- Keep the migration PR in Draft and do not merge or change production DNS without explicit approval.

## Extracted shared frontend module

The hostname-to-app-mode selection and the POS-only/Business-only route classification now live in the standalone `app-mode.js` module. The root entrypoint loads this module before the main application script, and both dedicated build artifacts include it. The POS and Business build scripts lock the selected mode inside the copied module at build time; regression checks validate that the selector is locked and that the module is loaded by the entrypoint.

This is the first safe source extraction, not the completion of feature-source separation. The navigation route lists for secondary and account views live in `app-navigation.js`. The former large inline application runtime has been extracted to `app-core.js` and is loaded synchronously at the same point in the document to preserve script order. Both workspace builds include this runtime, and the build tests syntax-check it and verify that shared session and Business landing behavior remain present. The runtime still contains mixed POS and Business behavior; feature-specific code must be split in small dependency-aware slices with regression tests.

## Feature ownership and access map

The shared app-mode configuration defines the route ownership boundary:

| Workspace | Routes / features |
| --- | --- |
| POS | Kasir/transaksi, Meja, Shift Kasir, Layar Dapur |
| Business | Beranda/analitik, Inventori, Pengguna, Payroll, Integrasi, Kartu Hadiah, Reservasi, Stok Opname, Pengeluaran & Laba, Member, Pembelian & Pemasok, Promo, AI Manager, Cabang |
| Shared | Menu Utama, Riwayat Pesanan, Pesanan Online, Notifikasi, Absensi, Pengaturan, Desain Struk, Printer |

Shared routes still apply each user's permission checks. Business-only and POS-only classification controls which app exposes a route; it is not an authorization boundary.

The shared `app-access.js` module owns permission labels, descriptions, short labels, and the view-to-permission map. The separate `app-navigation.js` module owns the secondary-view and account-view route lists. The mode, access, navigation, and runtime modules are loaded before/at the main application entrypoint and included in both workspace builds. AI Manager, Kartu Hadiah, and Reservasi now have dedicated permission keys (`ai`, `gift`, and `rsv`) instead of inheriting the broad cashier permission. Owner-only areas remain owner-only. The build regression test evaluates the access module and fails if a mapped permission has no corresponding label or page section, if route groups overlap, if navigation metadata contains duplicates, or if a required feature is missing from its workspace group.

**Security note:** current per-user permission checks are still enforced in the existing frontend logic and existing API behavior. The route map and client-side checks do not prove database-level enforcement for each operation. Before general release, every sensitive read/write must be verified against server-side role and tenant policies.


## Shared XLSX export module

The dependency-light XLSX ZIP/CRC/XML builder now lives in `app-export-xlsx.js`, loaded immediately before `app-core.js`. POS inventory count sheets, Business payroll/attendance sheets, and sales history exports call the same frozen `window.OrdelaXlsx` API. The app build regression test validates the CRC-32 reference vector, creates a sample workbook, and checks the required ZIP entries in both build outputs. This is a shared utility extraction; feature workflows that assemble the workbook data remain in the shared runtime until their dependencies can be separated safely.


## Business payroll feature boundary

Owner payroll and attendance reporting now live in `app-business-payroll.js`, not in the shared runtime. The Business build includes and loads this feature module after the shared XLSX utility; the POS build excludes both its script tag and source file. The module exposes the existing payroll state and UI handlers for the shared navigation integration, while keeping payroll calculations, salary records, payslip actions, and owner attendance exports together. Automated build tests execute the module in isolation, verify its public API, and fail if the Business module leaks into the POS artifact. Employee self-service attendance capture and shift configuration remain in the shared runtime for now; they are not claimed as separated by this change.


## Business inventory stock-count feature boundary

Stock-count import and adjustment now live in `app-business-inventory.js`. The Business artifact includes this module after the shared XLSX utility and payroll feature; the POS artifact removes its script tag and does not contain the module. The feature owns CSV/XLSX parsing, template generation, discrepancy review, applying stock corrections, and the result report. Shared inventory listing and normal stock editing remain in the common runtime; the module boundary does not replace server-side permission checks.


## Business user administration feature boundary

Owner-only user administration, custom staff roles, permission editing, account activation/deletion, password resets, and the user audit log now live in `app-business-users.js`. Only the Business artifact contains and loads this module. The shared runtime retains the small role-key/role-label helpers because the account profile screens in both applications display the signed-in user's role. Tests verify the module's exported handlers, preserve the shared role-label dependency, and ensure the POS artifact contains neither the module nor its script reference.


## Business dashboard feature boundary

The sales dashboard now lives in `app-business-dashboard.js`: period comparisons, sales series, chart rendering, category breakdowns, and the home summary. The Business build loads it before the shared runtime; the POS build excludes the module and script reference. The small shared date-range synchronizer and generic comparison-label helper remain in the common runtime because other screens use them. The build test verifies the dashboard API, five standard period presets, shared boot integration, script order, and POS exclusion.


## Business finance feature boundary

Operating-expense entry, profit calculation, supplier management, purchases, supplier debt tracking, and purchase-driven stock updates now live in `app-business-finance.js`. The module is loaded after `pos2.js` has initialized the shared view registry, and it is included only in the Business build. Compatibility exports for profit and supplier debt remain available to existing Business-only AI and stock-count workflows. The POS build excludes the module and its script tag; the shared shift screen retains its own shift statistics implementation.


## Business AI assistant feature boundary

The Ordela AI assistant now lives in `app-business-ai.js`, loaded after the Business finance module because its store analysis reads the shared profit summary. It owns the guided feature-help responses, data-aware analysis entry point, AI cloud request, per-account conversation history, and chat UI. The Business artifact includes and tests the P2 AI API; the POS artifact excludes the module and its script reference. The AI still relies on existing server-side authorization and the configured AI Edge Function; this extraction does not change provider credentials or production AI configuration.


## Business integrations feature boundary

The Integration Center's provider connection UI, integration configuration forms, one-time webhook URL display/regeneration, test-order action, and disconnect flow now live in `app-business-integrations.js`. It registers the `integ` view and P2 actions after the shared `pos2.js` registry is initialized. Only the Business build includes this module; tests execute it in isolation and assert the POS build has no copy or script tag. This extraction does not grant GoFood, GrabFood, or ShopeeFood API access; official platform partner approval and credentials remain required.


## Business branch and reservation feature boundaries

Branch switching, consolidated branch reporting, inter-branch stock transfer, branch creation and deletion now live in `app-business-branches.js`. Reservation administration, creation, seating/cancellation actions, and the reservation view live in `app-business-reservations.js`. The small `P2.rsvFor` lookup remains in the shared operational runtime because the POS table screen uses it to show reserved tables. Both new feature modules are Business-only and are verified as isolated build artifacts; the shared POS table lookup is regression-tested separately.


## Business stocktake page boundary

The full-page barcode/manual stocktake workflow now lives in `app-business-stocktake.js`: item search, physical count entry, discrepancy filters, barcode scan, review and apply. It consumes the workbook import/report helpers from `app-business-inventory.js`, which is loaded earlier. The POS artifact excludes the stocktake page module; its checkout and ordinary inventory flows are unaffected. The inventory regression tests verify both module syntax and the required dependency order.


## Gift-card administration and POS redemption boundary

Gift-card issuance, top-ups, balance history, and owner deletion now live in `app-business-gifts.js` and are loaded only in Business. The POS-facing redemption and release actions (`P2.giftUse` / `P2.giftClear`) remain in shared `pos2.js` because the checkout/payment screen depends on them. This preserves checkout behavior while removing the administration page and handlers from the POS artifact; regression tests explicitly verify both sides of this boundary.


## Business promo administration boundary

Promo and voucher administration (schedule/rules, code and automatic discounts, usage limits, activation and deletion) now lives in `app-business-promos.js`. POS discount application and invoice recalculation remain in the shared checkout runtime so the cashier can still apply eligible promotions without loading the Business management screen. The Business-only build test validates all management handlers and confirms the POS artifact excludes the administration module.


## Business member administration boundary

Member directory, search, member profile/history, loyalty-point configuration, manual point adjustment, and member deletion now live in `app-business-members.js`. The POS checkout's member selection and point redemption/earning logic remains in the cashier runtime, while the Business-only member administration page is excluded from POS. The build tests check the Business handlers and the absence of this management module from POS.


## AI conversation history and authorization

The setup SQL now provisions a store-scoped `pos.ai_history` table and a restricted `public.ai_chat_history` RPC. The RPC validates the active Ordela session, resolves the owner’s active branch, checks the AI Manager permission, bounds message count/size, and only grants execution to `service_role`; the Edge Function never trusts a client-supplied user or store ID. The AI history endpoint maps unauthorized/forbidden results to HTTP errors, and the Business chat renderer sanitizes stored assistant HTML through a small element allowlist before inserting it into the page. Applying this SQL and configuring the Edge Function’s `SUPABASE_SERVICE_ROLE_KEY` secret are still deployment steps; neither was changed in production.


## POS kitchen display feature boundary

The KDS ticket board, station filter, local/online ticket state updates, and timed refresh now live in `app-pos-kds.js`. The POS build includes and loads this module after the shared operational registry; the Business build excludes it. Online-order reception itself remains shared, while the kitchen execution screen is POS-only. Automated tests validate the KDS view/action API and ensure the module is absent from Business.


## POS shift screen boundary

The cashier shift screen, opening/closing cash drawer, cash-in/cash-out forms, variance calculation, and shift detail view now live in `app-pos-shift.js`, included only in the POS artifact. The lightweight `window.shiftCur` lookup and shift statistics remain in the shared operational registry because Business expense/purchase records can be associated with a currently active cashier shift. Tests check the POS module API and preserve the shared lookup.


## POS catalog and cart feature boundary

The cashier product grid, category filter, quick-add cards, modifier selection, quantity editing, and cart update handlers now live in `app-pos-catalog.js`, loaded only by the POS build. The Business render loop no longer calls POS catalog/invoice renderers, and inventory ordering/grid preferences are guarded by the build mode. Online orders opened in Business now show a clear message directing payment to the POS app instead of opening a hidden cashier form. Tests validate the exported cashier API and verify the Business artifact excludes the module.


## POS checkout feature boundary

Discount eligibility, cart totals, parked-ticket management, member/loyalty redemption, split tender, cash/change validation, and final transaction commit now live in `app-pos-checkout.js`, included only in the POS build. The Business app keeps only the shared `promoUsed` and `holdTotal` summaries because its promotion administration and table-occupancy views consume them. The table screen hides the parked-ticket action in Business, and online-order payment is routed to POS. Receipt display/printing remains shared for historical reprints. Build tests check the POS API and the shared helper boundary.
