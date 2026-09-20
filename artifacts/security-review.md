# Differential security review

Date: 2026-09-19 (Europe/Moscow)

## Scope and method

Reviewed the task-owned change from baseline `af1d684` to checkpoint `ad79787` plus subsequent working-tree updater/documentation changes. The checkpoint appeared during implementation; its files were reconciled with the executed working tree without resetting or rewriting it.

Skills used: `security-review`, `change-verification`. Review performed directly in-session. No authorized explicit Gemini orchestration route was requested, and Astra self-delegation is prohibited; **independent reviewer acceptance was unavailable**.

Reviewed request flow: `src/App.jsx` → `POST /api/classify` in `server.js:44–54` → `validateInput` and `createClassifier` in `server/jev.js:12–18,79–105` → fixed proxy HTTPS client in `server/jev.js:39–76` → escaped React text and Canvas drawing. Reviewed downloader input/redirect/path handling in `scripts/ingest_catalog.py`. Historical `git log -S classificationCache` and `git blame` confirmed that fake cache latency and copied billing fields existed in the original implementation; these are removed.

## Confirmed controls and executed local checks

- Credentials stay in backend memory. Environment takes precedence over the pre-existing local credential reference. Neither upstream response bodies nor credentials are logged or returned in error messages.
- All Jev traffic uses the fixed `HttpsProxyAgent` and endpoint; user input cannot select the destination. No direct egress fallback exists.
- Name/description/mod lengths and value types are checked. Body limit: 8 KiB. Cache: at most 1,000 entries. Upstream concurrency: six. Application request window: 120/minute. Request timeout: 10 seconds. Response body is bounded.
- Unknown routing choices and invalid hazard values cannot silently default to a valid route. Failure holds cargo for retry.
- Cross-site browser requests, mismatching Origin, and non-JSON POSTs are rejected. Wildcard CORS was removed.
- Local HTTP checks, without calling upstream: malformed name → 400; oversized description → 400; foreign Origin → 403; cross-site Fetch Metadata → 403; text/plain → 415; removed mock-LLM endpoint → 404. All passed.
- Unit tests cover malformed inputs, absent credentials, invalid upstream decisions, missing/zero usage, exact integer billing, and zero-charge cached results. Browser fixtures cover an outage/retry and a late response after cargo clearing. All passed.
- Inventory drag/drop resolves a local catalog ID; arbitrary dropped JSON cannot inject a texture URL or custom object.
- React renders untrusted names/descriptions as text. No `dangerouslySetInnerHTML`, command execution, or dynamic code evaluation is used in the active application path.
- Downloader permits only HTTPS on the configured GitHub/FTB hosts, checks redirects before following them, constrains byte/dimension sizes, sanitizes filenames, and verifies local paths and SHA-256 provenance during catalog validation.

## Residual findings and operational boundaries

### MEDIUM / Confirmed: paid endpoint is not authenticated

`server.js:44–54,60–61` exposes classification to any network client able to reach port 3333. A non-browser client can omit Origin and spend the configured key within the global rate/concurrency limits. This was also true before the upgrade. Same-origin protection is not authentication. The intended deployment is a trusted LAN/Tailscale showcase; do not expose it publicly without an authenticated reverse proxy or application authentication.

### LOW / Confirmed: one global rate budget is shared by all clients

`server.js:41–49` allows one reachable client to consume the shared request allowance, briefly denying legitimate users. The scope is a single-user engineering showcase, not a multi-tenant service.

### Accounting boundary

Browser spend is the exact sum of received live responses with known usage, not an authoritative account invoice. Network interruption after upstream billing, invalid response bodies, or missing usage can prevent reconciliation. Missing usage is visibly unknown and is never estimated. A cached result never adds the original charge again.

### Asset redistribution boundary

Create's source explicitly reserves asset rights separately from MIT code. Botania has distribution conditions; legacy wiki image rights remain individually unresolved. The source manifest and README disclose these restrictions. Local technical verification is not public/commercial redistribution clearance.

## Untested limits

No external penetration testing, upstream abuse/load testing, firewall verification, account-invoice reconciliation, or independent reviewer was performed. Semantic classification quality was exercised on representative live items, not every one of the 429 entries. This review is scoped evidence, not a general security certification.
