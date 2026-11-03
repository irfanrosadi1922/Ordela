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
