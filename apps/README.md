# Application workspaces

This directory is reserved for the staged extraction of Ordela's frontends.

Target workspaces:
- `business/`: owner/admin/manager dashboard
- `pos/`: cashier and operational POS
- `order/`: customer-facing QR and online ordering

Do not add placeholder production entrypoints or point DNS here. Each workspace must be populated from the existing tested implementation, have its own build and regression checks, and be deployed to a preview before any production hostname is moved.

The current root-level app remains the production baseline during migration.


## Temporary staging hostnames

- `app-preview.ordela.my.id` and `pos-preview.ordela.my.id` are temporary sibling hostnames for browser cookie-scope and SSO integration checks.
- Both hostnames currently attach to the existing `ordela-platform-preview` Pages project because the dashboard/POS frontend extraction has not yet been completed.
- They are **not yet two independent app deployments**. Do not use them as production endpoints or claim the apps have been separated.
- `api-preview.ordela.my.id` routes to the `ordela-sso-preview` Worker only.
- Production `app.ordela.my.id`, the apex domain, and existing production DNS records remain untouched.
