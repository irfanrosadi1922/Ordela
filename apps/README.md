# Application workspaces

This directory is reserved for the staged extraction of Ordela's frontends.

Target workspaces:
- `business/`: owner/admin/manager dashboard
- `pos/`: cashier and operational POS
- `order/`: customer-facing QR and online ordering

Do not add placeholder production entrypoints or point DNS here. Each workspace must be populated from the existing tested implementation, have its own build and regression checks, and be deployed to a preview before any production hostname is moved.

The current root-level app remains the production baseline during migration.
