# Verification — active request-first revision

Current evidence lives in `docs/verification/revision/`. Obsolete saved-order reports and duplicate screenshots were removed during the source cleanup. Compact current logs and JSON results are retained; PostgreSQL historical-order regression results are explicitly separate from current enquiry behaviour.

- Domain/setup/origin/request tests: validate authoritative prices, safe env creation, exact proxy-origin acceptance and CSRF rejection, stable design references, non-binding WhatsApp/custom drafts and production auth guards.
- PostgreSQL/RLS/RPC regression tests: preserve tested private historical order behaviour. New public enquiries do not call the old create-order RPC.
- Hosted API suite: authenticates the test Studio, emulates the rewritten-host proxy case, rejects unrelated origins, creates a server-checked enquiry and verifies directly in PostgreSQL that order counts/stock are unchanged. Product/settings/upload tests use disposable test input, remove their test product and clean up the local upload files they create.
- Browser suite: checks responsive public pages, custom brief, selection/request, size chart, login/Studio/logout at 320–1920px. Known extension annotation is emulated once on desktop. No test opens WhatsApp or sends money.
- Optimised production compilation and TypeScript are verified separately from development startup.

Codespaces lifecycle JSON and equivalent local commands are exercised, but GitHub's actual cloud UI/pop-up behaviour is not launched from this sandbox. The request flow needs no personal test inputs. Shared database fixture credentials are not a production configuration.

## Reproduce

```bash
npm install
npm run dev
```

In a second terminal:

```bash
npm test
npm run test:db
npm run test:development
npm run test:uploads
npx playwright install --with-deps chromium # one-time browser-test prerequisite
npm run test:browser
```

Stop dev before `npm run build`. The known shared defaults are deliberately blocked in a production server; configure a private production project and real Supabase admin for an actual deployment.

## Low-memory full matrix

On small 2GB sandboxes, repeated Turbopack and Chromium sessions can exhaust cached dev-server memory. `npm run test:responsive` starts an isolated dev server for each viewport on port 3040, runs that same browser suite, closes it and records per-viewport reports. This resets tooling caches only: it does not alter authentication, suppress errors or reset product/stock data. Use its `responsive-summary.json` as the full matrix result. `npm run test:browser` remains available for a normally sized dev environment or an individual project.

## Optional screenshot evidence

Browser tests do not keep successful-run screenshots by default. Set `MOODLY_TEST_SCREENSHOTS=true` when you specifically need them; failures still save normal Playwright diagnostics. Generated `test-results/`, `playwright-report/`, `.next/`, `node_modules/` and `*.tsbuildinfo` are not source files.

See [the cleanup and code audit](CODE_AUDIT.md) for the final package scope, verification results and dependency advisories.
