# MOODLY — source cleanup and code audit

**Date:** 11 October 2026  
**Canonical download:** `Moodly-source.zip`  
**Working application:** `moodly/`

The canonical ZIP replaces the old original file with the latest cleaned catalogue + WhatsApp request code. The working folder is the application; the ZIP is its downloadable source copy. There is no need to keep or combine several release ZIPs.

## Cleanup

- Removed the superseded Codespaces and responsive release ZIPs, duplicate standalone screenshot-heavy report and unused image-search downloads.
- Removed old saved-order verification reports, duplicate before/after screenshots and successful browser screenshot sets. Current compact JSON/log evidence is retained in `docs/verification/revision/`.
- Checked **all 15 hosted catalogue products**, hosted banner settings and **21 existing local demo products** before deleting 12 unreferenced upload-test JPGs. Every deleted JPG was an exact-byte copy of the retained `public/images/tee-black.jpg`; no catalogue/data record or required image was deleted.
- Removed generated Playwright state and TypeScript incremental metadata. Dependencies and build caches are required runtime tooling but are never included in the source archive.
- Preserved source, required images/font/license/icon, migrations/seeds/operations/certificate, lockfile, tests, Codespaces setup, existing private `.env.local`, local demo data and the three original user attachments.

The initial file cleanup removed approximately **88.9 MiB** of redundant files. Exact paths/reasons are recorded in `verification/revision/cleanup-results.json`.

## Code review and fixes

1. Audited **81 source/test/script/config modules**, their imports, npm-script targets and local image references. No unresolved imports, broken script paths, unreferenced non-entry modules, unreferenced packaged images or client-to-server-only import violations were found after cleanup.
2. Removed 13 unused imports. Enabled TypeScript `noUnusedLocals` and `noUnusedParameters` so new unused code is detected automatically.
3. Removed the unused JavaScript order-creation writer, retired customer checkout schemas/types and old confirmed-order WhatsApp helper. The active request schema is now shared by its API and unit tests. Historical `Order` data, protected management, database/RLS/RPC regressions and the compatibility endpoint returning HTTP 410 are retained.
4. Removed leftover historical reservation-expiry side effects from **public catalogue and quote reads**. New enquiries remain read-only with respect to stock/orders. Expiry/cancellation remains available only through protected historic-order tools or private maintenance.
5. Consolidated duplicate script/config wrappers while preserving familiar npm commands. `test:api` aliases the hosted test suite; `test:development:browser` aliases the main browser suite. The opt-in live script is now accurately named `verify-live-request.ts`.
6. Upload tests now delete only the local URLs created by their own run. Browser tests keep successful screenshots only when `MOODLY_TEST_SCREENSHOTS=true`; normal failure diagnostics remain available. Stock-toggle browser tests restore the original value in `finally`.
7. Corrected obsolete launch-check documentation that still described website order creation/payment reservations. No desktop markup, styling, product photos, stock distribution or business promises were redesigned or invented.

## Verification

All of the following were rerun on the cleaned source, not merely copied from the previous release:

| Check | Result |
|---|---:|
| Clean lockfile install (`npm ci`) | Passed; existing private environment preserved |
| Strict TypeScript, including unused-code checks | Passed |
| Unit/setup/origin/request tests | 20 passed, 0 failed |
| Historical PostgreSQL/RLS/RPC regressions | 13 passed |
| Optimised Next.js production build | Passed |
| Static module/script/asset/boundary audit | 81 modules; passed |
| Actual hosted TEST API integration | 14 passed |
| Responsive Chromium browser matrix | 25 passed, 0 failed |
| JPEG upload/readback suite | 3 exact-byte round trips passed |
| SVG/oversize/malformed/unauthorised upload rejection | 4 passed |
| Opt-in request-only smoke check | Passed; no WhatsApp opened, order created or payment made |
| Production dependency audit | 0 reported vulnerabilities |

Browser widths: **320, 360, 390, 430, 768, 1024, 1440 and 1920 px**. Three customer/Studio flows run at each width plus the known extension-annotation regression once at 1440px. The seven duplicate extension cases are intentionally skipped, not failed.

The hosted suite directly confirms unchanged order counts and stock for a new enquiry. Disposable test products/uploads were cleaned up. Historical SQL order-creation tests run in isolated PGlite/PostgreSQL; they do not create new website customer orders in the hosted project.

This is Chromium emulation and a shared TEST backend, not exhaustive physical-phone/Safari testing or a private production deployment. Passing covered checks is not a promise that every possible browser, extension or external service is error-free. Browser runner binaries/system libraries had to be restored in the sandbox before the final successful matrix; no website security checks were bypassed.

## Dependency security review

Compatible fixes were applied without migrating the website's Next/Tailwind architecture:

- PostCSS **8.5.29**, including Next's nested copy via an override.
- PostCSS selector parser **7.1.6**.
- Baseline browser mapping **2.11.28**.

`npm audit --omit=dev` now reports **0 vulnerabilities**. The complete audit still reports **5 high-severity affected build-tool packages**: `braces`, `chokidar`, `micromatch`, `fast-glob` and `tailwindcss`. These are related dependency findings rooted in the `braces` nested-pattern denial-of-service advisory; the available `braces` release remains affected. They are **not fixed** and are not being presented as harmless.

Tailwind 4 migration would remove this older build dependency chain but is an architectural/style-system change, not a safe automatic patch to the existing Tailwind 3 desktop design. It was deliberately not forced during file cleanup. Until that migration or an upstream compatible fix is undertaken, compile only trusted repository CSS/config/glob patterns and do not expose development tooling publicly. Review these advisories again before production rollout.

Machine-readable before/after/full/production audit results are in `verification/revision/`. Registry audits are point-in-time dependency checks, not a comprehensive security guarantee.

## Run the cleaned project

```bash
npm install
npm run dev
```

Environment creation and shared TEST database setup remain automatic. Existing `.env.local` is never overwritten. Use `/login` and its development `ADMIN_PASSWORD` when running the development server. A private production deployment still requires Supabase Auth, admin membership and private credentials; the shared test fixture is not for real customer data.

Browser automation additionally needs its test runner prerequisites once: `npx playwright install --with-deps chromium`. This is not required to start or use the website.

## Archive verification

- One canonical archive, `Moodly-source.zip`, containing a single `moodly/` project folder (163 files; approximately 1.3 MB compressed).
- ZIP integrity verified and required source, npm lockfile, Codespaces hooks, shared TEST fixture, migrations and TLS certificate checked.
- Extracted source passed TypeScript **without any `.next` build cache**.
- Fresh extracted source automatically generated its environment from the authorised defaults with file mode **0600**; no manual credential copying was required.
- Private `.env.local`, existing runtime `.data/`, user attachments, dependencies and build/test caches are not bundled. Existing private environment/data and the attachments remain preserved in the working workspace.
