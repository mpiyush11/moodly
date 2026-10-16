# Architecture — request-first revision

## Customer boundary

The website is a catalogue and WhatsApp draft assistant. Public requests contain only product IDs/colour/size/quantity/delivery preference and optional city. Server validation computes an indicative catalogue quote. No request inserts an order/customer row, reserves stock, collects payment or sends WhatsApp messages automatically. The legacy public create-order route returns 410.

`verifiedQuote` aggregates shared colour/size demand and rejects invalid/inactive/insufficient variants. Browser code never computes the payable amount. WhatsApp text is editable and non-binding: availability, delivery, final amount and print feasibility are confirmed by the business before payment.

## Data access

The current Next/React/Tailwind/Lucide/Supabase structure is retained. Direct PostgreSQL is server-only with verified TLS, prepared statements disabled for its transaction pooler and a bounded pool. Public snapshots explicitly select active products, inventory and public settings; private historic orders are returned only after admin authentication. Snapshot reads use one aggregate query rather than four parallel database connections. React request memoisation removes duplicated reads within a render.

Optional private service-role REST access remains supported. Anonymous Supabase reads are governed by RLS; orders and membership stay private. Old order/RPC data is kept for protected history and cancellation, not used for new enquiries. Public catalogue and quote reads do not run historical reservation expiry; expiry is limited to protected historic-order management or the private scheduled maintenance job.

## Authentication and origins

Development-only password mode uses ADMIN_PASSWORD and a signed HttpOnly cookie; production always verifies Supabase Auth plus moodly_admins. Shared test credentials remain explicitly blocked in production.

Mutation CSRF checks use exact origins: request URL, Host, first forwarded Host, canonical NEXT_PUBLIC_SITE_URL, explicit MOODLY_TRUSTED_ORIGINS, and the current Codespaces workspace's computed public hostname. Unrelated preview domains are never globally trusted. Malformed/null origins and cross-site browser POSTs fail closed.

Native FormData login prevents pre-hydration typing from submitting stale empty React state. Fresh post-login/logout navigation avoids auth-router cache races. Studio data remains protected independently of middleware.

## Images and extension annotations

Protected uploads are bounded, signature checked and limited to JPEG/PNG/WebP. Test development stores images per workspace; private production Storage uses authorised Supabase Auth/service-role access. URLs and filenames are validated.

A bounded pre-hydration observer removes only the known non-semantic bis_skin_checked annotation shown in the screenshot, then disconnects. React warnings are not globally suppressed. Fieldset markup, initial footer year and historic date formatting are deterministic. An extension-injection browser regression covers this specific case; unknown extensions can still modify a page.

## Business controls

Catalogue-support migration adds Instagram/catalogue links, reply hours and dispatch notes without deleting original tables/rows. It corrects only agent-created template GSM claims. Product reference codes derive stably from UUIDs. Studio exposes catalogue/availability, historic orders, contact settings and downloadable quick replies. WhatsApp app labels/away settings and Instagram ads are external owner actions, not claimed as configured here.

Desktop styling/structure is retained; mobile uses viewport-safe drawers, larger controls/readable fields and stacked stock/history cards. No paid gateway/chatbot/API subscription was added. A real launch still needs actual imagery, measured sizes, real stock quantities and private credentials.
