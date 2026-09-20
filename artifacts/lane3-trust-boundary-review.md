# Lane 3: Trust Boundary, API Security & Billing Accounting

**Adversarial Review — Policy Studio Spec vs. Existing Implementation**

Date: 2026-09-19
Reviewer: Claude Opus (independent adversarial lane)
Scope: `server.js`, `server/jev.js`, `deploy/compose.yaml`, `deploy/jev.ninitux.com.caddy`, `shared/routing-taxonomy.json`, `src/App.jsx`, `src/components/CreativeInventory.jsx`, `src/components/TelemetryHUD.jsx`, all scripts

---

## 1. Executive Summary & Verdict

**Verdict: REVISE — two High and two Medium findings must be resolved before Policy Studio is safe to ship.**

The existing server has solid structural hygiene: credential isolation, fixed egress proxy, Origin checking, bounded upstream responses, and honest billing propagation. However, the code was built for a trusted-LAN showcase, then made publicly accessible without compensating rate/concurrency controls. The proposed Policy Studio feature would dramatically amplify three latent risks that are currently contained only by the absence of a UI triggering them: uncapped upstream fan-out, unvalidated policy thresholds, and a body-size arithmetic conflict with the 8 KiB Express limit. Two of these are actionable today even without the Policy Studio.

| # | Finding | Severity | Status | File:Line |
|---|---------|----------|--------|-----------|
| F1 | `body.policy` is spread without type/range validation | **HIGH** | Confirmed | `server/jev.js:62` |
| F2 | No rate limit, concurrency cap, or pacing — full-catalog fan-out unbounded | **HIGH** | Confirmed | `server.js:42`, `server/jev.js:374-428` |
| F3 | Policy Studio payload arithmetic exceeds 8 KiB body limit for non-ASCII | **MEDIUM** | Reasoned Hypothesis | `server.js:36`, `server/jev.js:41-63` |
| F4 | Client-side session spend is cosmetic; no tamper-detection or reconciliation | **MEDIUM** | Confirmed | `src/App.jsx:200-202`, `server/jev.js:417-419` |
| F5 | `Array.isArray(body.policy)` not excluded; array spread creates numeric keys | **LOW** | Confirmed | `server/jev.js:62` |

---

## 2. Concrete Failing Scenarios & Edge Cases

### F1 — HIGH / Confirmed: `body.policy` spread without validation

**Location:** `server/jev.js:62`
```js
policy: { ...DEFAULT_POLICY, ...(body.policy && typeof body.policy === 'object' ? body.policy : {}) },
```

**What goes wrong:** `typeof body.policy === 'object'` passes for any object (including arrays — see F5). No field name allowlist, no numeric range check, no type enforcement. A client can submit:

**Failing scenario A — Bypass all hazard detection:**
```bash
curl -X POST https://jev.ninitux.com/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"name":"TNT","policy":{"hazardMin":2.0}}'
```
Result: `evaluatePolicy()` at `server/jev.js:72` evaluates `hazardVal >= 2.0` — always false, even for actual TNT (`noul ≈ 0.98`). Every hazardous item is routed to a storage bay instead of the blast pit. **Safety-critical bypass.**

**Failing scenario B — Shunt everything to the blast pit:**
```bash
curl -X POST https://jev.ninitux.com/api/classify \
  -H 'Content-Type: application/json' \
  -d '{"name":"Diamond Ore","policy":{"hazardMin":0.0}}'
```
Result: `hazardVal >= 0.0` is always true. Every item — including diamonds — is marked hazardous and shunted. Denial-of-service against correct sorting.

**Failing scenario C — Non-numeric policy values:**
```json
{"name":"Iron Ore","policy":{"hazardMin":"banana","safeMax":null}}
```
Result: `hazardVal >= "banana"` uses mixed-type coercion. `NaN >= "banana"` → `false`. `hazardVal > null` → `0.1 > 0` → true (null coerces to 0), causing unexpected holds. The server never validates these are finite numbers.

**Failing scenario D — Extraneous key injection:**
```json
{"name":"Test","policy":{"hazardMin":0.7,"__proto__":{"polluted":true}}}
```
Result: With `JSON.parse` in modern Node.js, `__proto__` becomes an own property on the plain object, not a prototype chain injection — so this is *not* a prototype pollution vector in practice. However, extraneous keys like `customField: "value"` silently leak into the policy object and are carried through to `parseDecision()` at `server/jev.js:146`, potentially appearing in cached results.

**Impact:** Any public internet user can silently override the safety classification thresholds for their request. The Policy Studio would formalize this capability but the vulnerability exists *today*.

---

### F2 — HIGH / Confirmed: No rate limit, concurrency cap, or pacing

**Location:** `server.js:42` (the `/api/classify` handler), `server/jev.js:374-428` (`createClassifier`), `server/jev.js:20-26` (proxy agent config)

**Context from `deploy/README.md:17`:**
> Local artificial caps (the 120 requests/minute throttle and 6-concurrency cap) have been removed per owner specification.

**Current state:** The `createClassifier` function tracks `active` as telemetry (`server/jev.js:376,414,426`) but does not enforce any maximum. The only upstream throughput bound is `maxSockets: 32` on the HTTPS proxy agent (`server/jev.js:23`), which limits TCP connections, not logical requests.

**Failing scenario — "Evaluate Full Catalog" fan-out:**

If Policy Studio adds an "Evaluate Full Catalog" button for 755 items:

1. Client fires 755 concurrent `POST /api/classify` requests (no client-side pacing observed in `src/App.jsx`; the existing auto-spawn at `App.jsx:153` is spaced at `1900/spawnSpeed` ms, but a custom UI or curl loop has no such limit).
2. All 755 reach `classifier.classify()` concurrently. Cache misses for a new program/policy.
3. In **parallel mode**: 755 upstream HTTPS requests queue through `maxSockets: 32`. Bursts of 32 hit TypeSafe API simultaneously.
4. In **triage mode**: each item makes TWO sequential upstream calls (`server/jev.js:215,272`), so 1,510 upstream requests total.
5. Each request has a 10-second timeout (`server/jev.js:191`). No retry-after backoff: if TypeSafe returns HTTP 429 with `Retry-After` header, it's captured (`server/jev.js:180`) but never acted upon — the error is thrown and the cargo fails.
6. **Billing impact:** 755 × ~469 input tokens × $0.042/MTok ≈ $0.015 per catalog sweep. Repeated sweeps with `forceFresh: true` accumulate. An automated script could run 1000 sweeps/hour ≈ $15/hr with no authentication.

**The missing controls, in order of priority:**
| Control | Status | Required? |
|---------|--------|-----------|
| Server-side concurrency cap on `active` in-flight upstream calls | ❌ Removed | **Mandatory** |
| Per-IP or per-session rate window (requests/minute) | ❌ Removed | **Mandatory** for public endpoint |
| Batch endpoint with server-side pacing and AbortController | ❌ Absent | Required for catalog sweep |
| Retry-After backoff on upstream 429 | ❌ Not implemented | Required |
| Client-visible cost estimate before batch | ❌ Absent | Recommended |
| Cancellation mechanism for in-flight batch | ❌ Absent | Recommended |

---

### F3 — MEDIUM / Reasoned Hypothesis: Policy Studio payloads vs. 8 KiB body limit

**Location:** `server.js:36` (`express.json({ limit: '8kb' })`), `server/jev.js:41-63` (`validateInput`)

**Arithmetic for the proposed Policy Studio spec:**

The review asks about: custom objective (≤800 chars) + 6 branch criteria (≤400 chars each).

| Field | Max chars | ASCII bytes | UTF-8 worst (4B) |
|-------|-----------|-------------|-------------------|
| `name` | 160 | 160 | 640 |
| `description` | 2000 | 2000 | 8000 |
| `mod` | 80 | 80 | 320 |
| `objective` | 800 | 800 | 3200 |
| 6 × `criteria` | 2400 | 2400 | 9600 |
| JSON structure overhead | — | ~500 | ~500 |
| **Total** | — | **~5940** | **~22,260** |

**Result by encoding:**
- **Pure ASCII:** 5,940 bytes → **fits in 8,192** ✅ (but only 2,252 bytes of headroom)
- **Mixed 2-byte UTF-8 (Cyrillic, accented Latin):** ≈11,380 bytes → **exceeds 8,192** ❌
- **CJK / Emoji (3–4 byte UTF-8):** ≈18,000–22,000 bytes → **far exceeds** ❌

**Even without Policy Studio fields**, the existing `description` limit of 2000 chars can conflict:
- 2000 emoji characters → 8000 bytes for description alone, which plus name+mod+overhead > 8192.
- The 8 KiB body-parser rejection (`server.js:55`, type `entity.too.large` → HTTP 413) fires *before* `validateInput` runs, so the user gets a generic "Invalid JSON request body" error instead of a field-specific message.

**Corrective requirement:** Either raise the body limit proportionally to the maximum validated payload (considering 4-byte UTF-8), or enforce *byte-length* limits instead of *character-length* limits in validation.

---

### F4 — MEDIUM / Confirmed: Client-side session spend is cosmetic

**Location:**
- Client accumulation: `src/App.jsx:200-202`
- Server accumulation: `server/jev.js:417-419`
- Display: `src/components/TelemetryHUD.jsx:253-256`

**How client spend works:**
```jsx
// App.jsx:200-202
setSession(prev => {
  const units = prev.units + BigInt(result.chargeNanoUsd ?? '0');
  return { units, spend: money(units), unknown: prev.unknown + (result.chargeNanoUsd === null ? 1 : 0) };
});
```

**What can go wrong:**

1. **Tampered client:** A modified client can set `chargeNanoUsd` to `'0'` before accumulating, hiding real spend from the user. This is cosmetic — actual charges happen at the TypeSafe API — but deceives the person watching the HUD.

2. **Network interruption after upstream billing:** If the upstream TypeSafe call succeeds (and is billed) but the response is lost in transit, the client never accumulates the charge. The server's `spend` counter in `classifier.status()` also misses it because the `catch` branch fires before `spend +=` at `server/jev.js:419`.

3. **No reconciliation path:** The `GET /api/telemetry` endpoint (`server.js:41`) exposes the server's independent spend counter, but no client code calls it for verification. The HUD shows only the client's accumulated total.

4. **Credentials cannot leak to browser:** Verified — the API key is used only in `executeRawJevRequest()` at `server/jev.js:165`. Error messages are sanitized (`server.js:48`). The Caddy config strips incoming Authorization (`deploy/jev.ninitux.com.caddy:9`). The key file is outside the container image and static file paths. **No credential leak vector found.**

**Impact:** The "Session spend" counter can undercount or be tampered with, but cannot cause overbilling at the TypeSafe API level, and credentials never reach the browser.

---

### F5 — LOW / Confirmed: Array passes `typeof === 'object'` check

**Location:** `server/jev.js:62`

```js
body.policy && typeof body.policy === 'object' ? body.policy : {}
```

`typeof [] === 'object'` is `true`. If a client sends `"policy": [0.3, 0.7, 0.65, 1.5]`, the spread creates:
```js
{ ...DEFAULT_POLICY, 0: 0.3, 1: 0.7, 2: 0.65, 3: 1.5 }
```

The numeric keys are harmless (they don't overwrite named policy fields), but the resulting object is nonsensical. `evaluatePolicy` uses only named fields, so it would use DEFAULT_POLICY values — functionally a no-op but semantically dirty.

**Fix:** Add `Array.isArray(body.policy)` exclusion to the guard.

---

## 3. Smallest Corrective Contract Amendments

### Amendment A (resolves F1): Validate policy fields strictly

**In `server/jev.js`, replace line 62 with a gated merge:**

```js
policy: sanitizePolicy(body.policy),
```

Where `sanitizePolicy` is:
```js
const POLICY_FIELDS = ['safeMax', 'hazardMin', 'confidenceMin', 'highPriorityRarityMin'];
const POLICY_BOUNDS = { safeMax: [0, 1], hazardMin: [0, 1], confidenceMin: [0, 1], highPriorityRarityMin: [0, 3] };

function sanitizePolicy(raw) {
  const base = { ...DEFAULT_POLICY };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  for (const key of POLICY_FIELDS) {
    if (key in raw) {
      const v = raw[key];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const [lo, hi] = POLICY_BOUNDS[key];
      base[key] = Math.max(lo, Math.min(hi, v));
    }
  }
  return base;
}
```

This:
- Allows *only* the four known fields
- Rejects non-finite numbers, strings, null
- Clamps to physically meaningful ranges
- Blocks arrays, prototype-carrying objects, and extraneous keys
- Preserves DEFAULT_POLICY for any field not explicitly overridden

### Amendment B (resolves F2): Reinstate concurrency + rate limits

**In `server.js`, before the classify handler:**

```js
// Mandatory for public-facing deployment
const MAX_ACTIVE = 8;            // concurrent upstream calls
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;            // requests per window

// In createClassifier or as middleware:
if (active >= MAX_ACTIVE) {
  return res.status(429).json({ error: 'Too many concurrent requests', retryAfter: 2 });
}
```

**For batch catalog evaluation, add a dedicated endpoint:**
```
POST /api/classify-batch
Body: { items: [...], programId, mode, policy }
```
- Server-side sequential pacing: 50 ms between upstream calls
- AbortController-aware: client disconnect cancels remaining items
- Hard cap: `items.length <= 100` per request (8 batches for full catalog)
- Response: streamed NDJSON or collected array
- Cost pre-estimate header: `X-Estimated-Cost-Usd`

**In `server/jev.js:176-194`, add retry-after backoff:**
```js
if (res.statusCode === 429) {
  const wait = parseInt(res.headers['retry-after'], 10) || 2;
  err.retryAfter = wait;
  // Caller should await this before retrying
}
```

### Amendment C (resolves F3): Align body limit with maximum validated payload

Either:
1. **Raise the limit** to `32kb` and add per-field *byte-length* checks (not just char-length):
   ```js
   if (Buffer.byteLength(body.description, 'utf8') > 6000) throw new Error('...');
   ```
2. **Or keep 8 KiB** and reduce character limits proportionally:
   - `name`: 100 chars max
   - `description`: 800 chars max
   - `objective` (new): 400 chars max
   - Each `criterion` (new): 200 chars max

   With these limits, worst-case 4-byte UTF-8 = (100 + 800 + 400 + 6×200) × 4 + overhead = (2500) × 4 + 500 = 10,500 bytes — still exceeds 8 KiB. So option 1 (raise limit + byte-length checks) is the safer path.

### Amendment D (resolves F4): Periodic client-side reconciliation

Add a reconciliation poll in `App.jsx`:
```jsx
// Every 30 seconds while session has live calls, verify server-side spend
useEffect(() => {
  if (session.units === 0n) return;
  const id = setInterval(async () => {
    const data = await fetch('/api/telemetry').then(r => r.json());
    // Surface discrepancy if server spend exceeds client by > 10%
  }, 30_000);
  return () => clearInterval(id);
}, [session.units > 0n]);
```

---

## 4. Anti-Slop & Implementation Recommendations

### What NOT to build

1. **Do not add a full RBAC/auth system** for this showcase. The right control is a rate limit and concurrency cap, not user accounts. The deployment is a portfolio piece, not a multi-tenant platform.

2. **Do not add client-side rate limiting** as a substitute for server-side limits. Any rate-limiting logic in `App.jsx` is trivially bypassed by curl or a modified client. Server-side limits are the only trust boundary.

3. **Do not rely on `maxSockets: 32`** as a concurrency limit. It bounds TCP connections to the proxy, not logical requests. With HTTP keep-alive, 32 sockets can pipeline many more requests than 32 concurrently.

### What to verify before shipping Policy Studio

1. **Prompt injection resilience:** If user-supplied `objective` and `criteria` strings are sent to the Jev API as `instructions` and `criteria` fields (currently hardcoded from taxonomy at `server/jev.js:343-346`), verify that Jev's typed-output guarantee holds even with adversarial instructions. The `stateText` construction at `server/jev.js:202` uses `JSON.stringify()` for user data, which escapes special characters — apply the same discipline to any new user-controlled fields sent in the `questions` structure.

2. **Cache key stability:** The cache key at `server/jev.js:390-397` does not include `policy` fields. Two requests with the same name/description/mod but different policy thresholds would share a cached result, causing the second policy evaluation to be skipped. If Policy Studio allows per-evaluation policy overrides, the policy must be incorporated into the cache key.

3. **Cost transparency:** Before a batch evaluation of 755 items, display an estimated cost: `755 × avg_input_tokens × $0.042/1M`. For triage mode, double the estimate. Add a confirmation step before dispatching.

4. **Cancellation:** The client already tracks AbortControllers (`src/App.jsx:181,98`). A batch evaluation must propagate cancellation to pending upstream calls. The server should accept a `Connection: close` or client disconnect signal and abort queued items.

### Existing controls confirmed sound

| Control | Location | Status |
|---------|----------|--------|
| API key never in responses/logs | `server.js:48`, `server/jev.js:165` | ✅ Sound |
| Upstream body bounded at 256 KiB | `server/jev.js:173` | ✅ Sound |
| Origin / Sec-Fetch-Site checking | `server.js:22-31` | ✅ Sound |
| X-Powered-By disabled | `server.js:21` | ✅ Sound |
| Container: read-only, no-new-privileges, caps dropped | `deploy/compose.yaml:11-17` | ✅ Sound |
| Caddy strips incoming Authorization | `deploy/jev.ninitux.com.caddy:9` | ✅ Sound |
| Fixed proxy egress (no user-selectable destination) | `server/jev.js:19-26` | ✅ Sound |
| Invalid routing choices throw (never silent fallback) | `server/jev.js:115` | ✅ Sound |
| Cache never re-bills on reuse | `server/jev.js:399-410`, `scripts/jev.test.js:73-88` | ✅ Sound |
| Upstream timeout (10s) with cleanup | `server/jev.js:191-192` | ✅ Sound |
| BigInt billing (no floating-point rounding) | `server/jev.js:28,119,419` | ✅ Sound |

---

## Coverage Boundaries

- No live upstream abuse/load testing was performed.
- TypeSafe API's own rate-limiting behavior (HTTP 429 thresholds, account-level quotas) was not empirically tested.
- The proxy at `192.168.0.142:18080` was not inspected for its own request-rate enforcement.
- No independent reviewer was available for this lane; findings are single-assessor.
- Policy Studio UI code does not exist yet; findings F3 and the batch-evaluation scenarios in F2 are prospective analysis of the proposed spec against existing architecture.
