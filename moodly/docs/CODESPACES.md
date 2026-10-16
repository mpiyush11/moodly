# One-click development setup

## Files and lifecycle

- `.devcontainer/devcontainer.json`: Node 22, port 3000, browser auto-forward and automatic create/start lifecycle hooks.
- `.devcontainer/auto-start.sh`: locked dependency installation/repair, existing environment preservation, concurrent-start lock, background dev startup, catalogue readiness check and healthy-server reuse. Runtime status/logs stay in ignored `.data/`; no duplicate source packages are created.
- `config/development.defaults.json`: owner-approved, tracked shared test values. Deliberately not private credentials. Never add personal/customer information to the referenced test database.
- `scripts/setup-env.mjs`: install-time env creation, host override support, 0600 permissions, existing-file preservation, no automatic production fixture creation.
- `scripts/setup-db.mjs`: predev transaction, advisory lock, private legacy archive, canonical migration, safe imports/seeds, migration ledger.
- `scripts/runtime-config.mjs`: verified Sydney endpoint correction limited to the known shared test credential set, secure CA trust, transaction-pooler settings, production guard.

## Fresh clone

Put the project contents at the **GitHub repository root** so `.devcontainer/devcontainer.json` is discoverable. Choose **Code → Codespaces → Create codespace** (or start the existing Codespace). No install, environment, database or dev-server command needs to be typed.

First creation installs locked dependencies and generates the missing `.env.local` from the explicitly shared test fixture. Each start/resume verifies dependencies, preserves existing configuration and starts `npm run dev` in the background; its existing predev hook prepares PostgreSQL automatically. The lifecycle hook returns when `/api/store` responds successfully. Port **3000** is auto-forwarded and GitHub is configured to open it in a browser.

If the Codespace existed before this configuration, update the repository and select **Codespaces: Rebuild Container** once. GitHub may require clicking port 3000 in the **Ports** panel when auto-opening a browser is restricted. Keep the testing port private. First creation is not instant: container download, dependency install and database access require working network access.

The required private-role operations use the supplied database connection, not an anonymous Supabase key. The public Supabase key remains restricted by RLS.

## Existing configuration

An existing `.env.local` is preserved exactly. To intentionally adopt the shared defaults after having a different local config, back up your old file before removing it and running `npm run setup:env`. Custom database connection strings are not redirected to the test project's endpoint.

## Admin

The dev server presents a password-only form using `ADMIN_PASSWORD`. A signed HttpOnly, same-site cookie gates each private API and dashboard request. TLS Codespaces requests get Secure cookies. This dev session is ignored completely in production; real Supabase Auth and admin membership remain mandatory there.

## Hosted database migration

The supplied project originally had three products, zero blank rows, zero orders, and one settings row in an older schema. Those four legacy tables were retained in `moodly_legacy`, with schema access revoked from public/anonymous/authenticated roles. The three products were imported into the canonical catalog. The original settings were retained when valid, and missing defaults were seeded.

The known test URI incorrectly names Mumbai. Read-only DNS/AWS-region checks identified Sydney, and the corrected pooler authenticated successfully with verified TLS. The requested `.env.local` value is not changed; its known fixture connection is adapted server-side.

## Limitations and boundaries

- The Codespaces cloud UI itself cannot be launched from this sandbox. The configuration and the same local lifecycle commands are validated; cloud auto-opening/visibility is controlled by GitHub.
- Dev uploads live in a single workspace. They are not a replacement for production Supabase Storage.
- Development admin Realtime cannot inherit an Auth identity from the local cookie. Private order refresh uses protected polling; anonymous order access stays blocked.
- Shared test credentials are visible to anyone who can read this repository. Rotate them before changing the project to hold real data. Do not assume a private storefront login makes the shared database credential private.
- The production server intentionally rejects the known shared database credentials and never accepts the development password cookie.

## Request-first revision

The website now prepares non-binding WhatsApp enquiries without customer records or automatic stock reservation. Public checkout/create-order is retired (410). Business contact/social links and honest reply/dispatch notes are editable in Studio. Login uses native FormData and exact origin matching, including the current workspace's known public host even when proxy headers are rewritten. For other trusted proxies, configure exact canonical origins rather than a wildcard bypass. See CHANGE_REPORT.md for the current behaviour and responsive changes.
