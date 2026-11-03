# Cloudflare Pages preview

- Project: `ordela-platform-preview`
- Preview host: `ordela-platform-preview.pages.dev`
- Git repository: `irfanrosadi1922/Ordela`
- Connected branch: `feat/ordela-multi-app-platform`
- Build command: none (static site)
- Output directory: repository root (`.`)
- Custom domains: none

This is an isolated staging deployment. It does not replace `main`, change production DNS, or alter Supabase, authentication, payment, or email configuration.

The current repository still contains the legacy monolithic app at the root. This deployment is for verifying the Pages pipeline only, not a completed split into Business, POS, and Order apps.

## Staging route separation (2026-11-04)

- The existing monolithic app now detects only the two temporary staging hostnames: `app-preview.ordela.my.id` selects Business mode and `pos-preview.ordela.my.id` selects POS mode.
- POS mode hides and rejects navigation to Business-only views; Business mode hides and rejects navigation to POS-only views. Existing role/permission checks remain in place as an additional UI gate.
- This is a first-stage route separation on the same static bundle, not yet two independently built/deployed frontend projects. It does not replace server-side authorization or tenant/RLS enforcement.
- All non-preview hostnames, including production `app.ordela.my.id`, retain legacy behavior. No production rollout was made.
- GitHub Actions run `41709560072` completed JavaScript syntax and SSO Worker unit-test steps successfully; final workflow status was still completing at the time of this note.
- Remaining: browser-verify both staging modes after Pages deployment, perform real authenticated SSO switching, then extract the two frontends into independent build outputs.
