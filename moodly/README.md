# MOODLY — catalogue + WhatsApp request assistant

The original minimalist Moodly desktop design, now with a lighter request-first workflow, responsive mobile layouts and corrected local/Codespaces login handling. Next.js 15 / React / TypeScript / Tailwind / Supabase.

> **Shared TEST setup:** the owner explicitly chose tracked shared test credentials in `config/development.defaults.json`. Anyone with repository access can access that test database. Do not use it for real customer data or payment. Production requires private credentials and real Supabase Auth administration.

## Local: no manual environment commands

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. Node 20.9+; devcontainer uses Node 22.

Install creates `.env.local` if absent; existing values are never overwritten. Predev automatically applies the canonical schema and catalogue-support migration, seeds without overwriting owner products/stock, then launches Next.js on 0.0.0.0:3000. Hash-containing passwords are correctly quoted.

## Codespaces

Commit the project contents with `.devcontainer/devcontainer.json` at the repository root. Choose **Code → Codespaces → Create codespace**.

- First creation: dependencies install automatically from the lockfile; missing `.env.local` is generated.
- Every start/resume: the startup hook repairs missing/changed dependencies, prepares the database through the existing dev hook and starts the website in the background.
- An already-running healthy website is reused, not duplicated. The hook finishes when the catalogue responds successfully.
- Port **3000** is forwarded with `onAutoForward: openBrowser`; unrelated development ports are ignored.
- **You do not type any terminal commands in Codespaces.** First creation can take a little time for the container/install/database startup.

For an existing Codespace created before this configuration, use **Codespaces: Rebuild Container** once after updating the repository. GitHub controls browser auto-opening; if a browser tab does not open, click port 3000 in the **Ports** tab.
- `*.app.github.dev` development assets are supported. API origin checks trust only the actual workspace hostname, not every preview domain.

Keep the Codespaces port private while testing. Codespaces is not a permanent customer-facing ad destination.

## Login

Open `/login` or **Studio Access**. With the development server, enter `ADMIN_PASSWORD` from `.env.local`. No email provisioning is required for this test login.

Correct login gives an eight-hour signed HttpOnly session. Password is read from the native form, so typing before React hydration does not silently submit an empty state. Wrong passwords, untrusted origins and unauthorised private APIs remain blocked.

Production never accepts this development password/cookie. It uses Supabase Auth and `moodly_admins` membership. Known shared test DB credentials are blocked in a production server.

### Reverse-proxy domains

Codespaces auto-detects its own public hostname from platform environment variables. A private production reverse proxy should set `NEXT_PUBLIC_SITE_URL=https://your-real-domain`. For another trusted proxy, optionally use `MOODLY_TRUSTED_ORIGINS` with **exact** comma-separated origins. Do not add wildcard preview domains or disable the CSRF check.

## Customer flow

1. Browse products, then choose colour/size/quantity.
2. Add to selection or request the single design.
3. Choose delivery preference and optionally city.
4. Prepare the WhatsApp draft; the server checks catalogue prices and stock.
5. Open WhatsApp and tap Send.
6. The business confirms actual availability, printing, final amount, delivery and timing before discussing QR payment.

No name/phone/pincode/customer account is required on the website. Requests do not create order records, reserve blanks, start a countdown, collect payment or send messages automatically. The legacy public create-order endpoint is intentionally retired (410).

Displayed request totals are indicative server-calculated catalogue values—not a final payable amount. WhatsApp text is editable; business confirmation is authoritative. Never mark received payment from a screenshot alone.

## Less daily admin

Studio tabs: Catalog, Blank stock, Order history, WhatsApp tools, Store settings.

- Add real product images/descriptions/prices without code changes.
- Update actual colour/size quantities after accepting orders; enquiries do not decrement stock.
- Add real Instagram and WhatsApp Business catalogue links, reply hours and dispatch notes.
- Copy/download WhatsApp quick replies; use the suggested labels in the Business app.
- Old orders remain private history. New requests stay in WhatsApp.

The website cannot create Instagram ads, publish a WhatsApp Business catalogue or configure app away messages without access to those external accounts. No paid bot/API/gateway was introduced.

## Database and storage

The supplied test URI names Mumbai while the project is actually in Sydney. Only its known shared credential set is directed to the verified Sydney pooler. Custom credentials/endpoints are not rewritten. TLS hostname/certificate verification uses system roots plus the official public Supabase CA; prepared statements are disabled for transaction pooling.

Legacy tables were preserved in private `moodly_legacy`. The new `20261006_catalogue_support.sql` migration adds public business-contact settings and corrects only agent-provided fabric templates. It does not delete old products or orders.

Development uploads are validated JPEG/PNG/WebP files stored in the individual workspace. Production uses authorised Supabase Storage. Existing demo mode (`.env.demo`) remains available explicitly.

## Tests and reports

```bash
npm run typecheck
npm test
npm run test:db
npm run build
```

With the development server running:

```bash
npm run test:development
npm run test:browser
```

The hosted suite uses only the authorised test database, proves zero order writes/stock reservations from requests, exercises login/proxy origins/catalog/settings/uploads, and removes its disposable test product. The browser suite covers mobile/tablet/desktop and a known browser-extension annotation regression. Stop dev before building to avoid concurrent writes into `.next`.

See **[the change report](docs/CHANGE_REPORT.md)**, **[cleanup / code audit](docs/CODE_AUDIT.md)** and compact results in `docs/verification/revision/`.

## Before actual customers

Upload actual print photos; confirm measured sizes and 240 GSM claims; publish only actual products/fits; enter the real 100-blank colour/size split rather than default counts; add real contacts/timelines/terms. Do not invent testimonials or scarcity. Rotate shared credentials and configure a private production environment before any real customer data. A production build passing does not itself deploy the store or configure those business details.

For the complete viewport matrix in a low-memory workspace, stop the normal dev server and use `npm run test:responsive`. It isolates each dev instance, saving reports in `docs/verification/revision/matrix/`. For an already running server you can test one width with `npm run test:browser -- --project=width-390`.

## Current project only

The current working project is `moodly/`. Duplicate ZIPs and generated verification artifacts were removed; no release ZIP is kept alongside the working code. For GitHub, put the **contents** of this project at the repository root, including the hidden `.devcontainer/` directory.

Successful browser screenshots are optional (`MOODLY_TEST_SCREENSHOTS=true`); upload tests remove the exact local files they create. Runtime `.data/`, private `.env.local`, dependencies and build caches are deliberately not included in the archive.
