# Jev Minecraft Factory Sorter

A React 19 / Canvas 2D workshop that sends Minecraft blocks and custom objects to TypeSafe Jev for typed routing decisions. Express 5 serves the production app and keeps the API credential server-side.

## Run

Requires Node.js 22, pnpm, and Python 3 for catalog updates.

```sh
pnpm install
pnpm run build
pnpm start
```

The server binds port `3333` on all interfaces. `PORT` overrides the port.

By default, the server runs in **Zero-Spend Simulated Demo Mode** (`LIVE_API!=true`): it simulates TypeSafe Jev System 1 locally for all 1231 catalog items, Anvil submissions, and custom policies with 0 outbound API calls and $0.00 spend. Set `LIVE_API=true` and `TYPESAFE_API_KEY` to connect to upstream `https://api.typesafe.ai/v1/systemone` via `http://192.168.0.142:18080`.

The owner explicitly chose **public anonymous access** at `https://jev.ninitux.com` and operates the public site in simulated demo mode to prevent external API token consumption. Same-origin browser checks, bounded request bodies (8 KiB), a 1,000-entry cache, and 10-second timeouts remain active. Keep the backend listener on the private LAN.

## Public domain deployment

The separate Docker deployment and HTTPS Caddy route are documented in [`deploy/README.md`](deploy/README.md). No login or password is required. Do not reintroduce authentication without an owner request.

## Controls

- Click a catalog block to spawn it and select the placement tool.
- Drag a catalog block onto the floor. Grab existing cargo and release it to toss with pointer velocity; it returns to the feeder before routing.
- Number keys **1–9** launch hotbar blocks. **/** focuses search. **Escape** clears the placement tool. Shortcuts do not intercept form typing.
- Combine mod tabs, category selection, and instant text search.
- **Spawn 5** samples the currently filtered inventory. **Auto feed** samples the entire catalog at the selected rate. The floor holds at most 48 active entities.
- **Anvil** submits an arbitrary object name and description. These fields are sent to TypeSafe AI; do not enter sensitive data.
- Hover or keyboard-focus inventory items to inspect them. Hover canvas cargo to inspect it without belt labels.
- **Clear belt** stops automatic/batch spawning and clears cargo. Charges from already-started API calls still count when their responses arrive.
- **Clear bay** clears only that receiving bay. Audio starts muted.

The workbench fits the viewport; inventory and inspection panels scroll internally. Mobile toolbars and hotbars scroll horizontally without widening the page. Drag the floor to pan; use Ctrl/Cmd + wheel to zoom, or the Fit/Detail buttons. Plain wheel never changes camera zoom.

Layout regression checks (server must be running): `node scripts/test_viewport_access.js` tests panel visibility, hit targets and inventory scrolling at seven desktop/mobile sizes. `node scripts/test_layout_states.js` tests populated inspection/Hold panels and wheel handling using mocked classification responses (no inference calls).

## Catalog and assets

`public/data/blocks.json` contains 55 vanilla and 374 modded entries. Each entry has `id`, `name`, `mod`, `category`, `description`, and a local `texture` URL. Spawned entities have separate runtime IDs.

```sh
pnpm run catalog:update
pnpm run catalog:validate
```

`scripts/ingest_catalog.py` uses only the Python standard library. It reads pinned official GitHub trees, English language registries, blockstates and model texture references for Create, AE2, Mekanism and Botania. Legacy IndustrialCraft 2, GregTech, Thermal Expansion and Thaumcraft use discovered FTB wiki image filenames and `imageinfo` URLs. Selected flagship machines also use their recognizable wiki inventory icons, while their block identities remain derived from official registries. Downloads are bounded and cached under `.cache/catalog` for resumability. The updater validates PNG signatures/dimensions and refuses to publish fewer than 300 modded blocks. `public/data/asset-sources.json` records source URLs, pinned revisions and SHA-256 hashes.

These are distinct block identities, not multiple texture faces counted as blocks. Some upstream blocks share textures legitimately. Where a mod has no standalone inventory icon, the showcase displays a real block texture face; animated sheets show their first square frame. It does not claim to reconstruct every mod's 3D inventory model.

The requested name **“Osmotic Concentrator”** does not appear in the pinned Mekanism registry. **Osmium Compressor** is included under its real name, with that requested phrase as searchable description metadata. Legacy wiki art may depict older mod versions; its exact file page is recorded. The optional Essentia Distillation wiki image is unresolved and omitted, not replaced with fake art.

### Asset rights

Texture downloads do **not** imply permission to redistribute them. They retain their authors' rights; no asset is relicensed by this project.

- [Create](https://github.com/Creators-of-Create/Create/blob/fc9535d82a29419164a1e9dc9c678bdcddeab30d/LICENSE.md): the asset directories are **All Rights Reserved**; MIT covers other code. Public redistribution clearance is unresolved.
- [AE2](https://github.com/AppliedEnergistics/Applied-Energistics-2/blob/b7cf5822d9c128a61d9291cb2c1f92319253e4f0/LICENSE): repository LGPL-3.0 license; inspect upstream notices for the intended use.
- [Mekanism](https://github.com/mekanism/Mekanism/blob/11162452affe7b17b25cde251308c9d047c42e87/LICENSE): MIT, copyright Aidan C. Brady.
- [Botania](https://github.com/VazkiiMods/Botania/blob/d720e4b164b4c9850e36009c63c303fb8ed12389/LICENSE.txt): custom license covering assets, with distribution conditions.
- Legacy wiki assets: individual source/file pages in `asset-sources.json`; reuse clearance has not been established for each image.
- Vanilla textures: [PrismarineJS minecraft-assets](https://github.com/PrismarineJS/minecraft-assets/tree/master/data/1.20.2/blocks); Minecraft assets remain their owners' property.

Review permissions before any public/commercial distribution. This delivery is a local engineering showcase, not a licensed texture pack.

## API and billing semantics

`GET /api/blocks`, `GET /api/health`, and `GET /api/telemetry` expose catalog, configuration availability, and process-local counters. `POST /api/classify` accepts:

```json
{ "name": "Mechanical Press", "mod": "Create", "description": "A mechanical press powered by rotational force", "forceFresh": false }
```

Successful responses contain `source` (`live` or `cache`), `chest`, `isHazardous`, `model`, `latencyMs`, `usage`, `costUsd` and `chargeNanoUsd`. Input name is limited to 160 characters, description to 2,000 and mod to 80. Error responses have `source: "error"` and an English message; no heuristic result masquerades as Jev output.

- Roundtrip is measured on the backend using a monotonic clock, including proxy/network transit and receipt of the complete response. The display renders milliseconds to three decimal places; raw precision is retained in the API response. Sub-150ms roundtrip is not promised.
- Input costs exactly **42 nano-USD per token** (`$0.042 / 1,000,000`). Integers accumulate charges; USD is serialized with nine decimal places.
- Output tokens are response-derived and free. Missing usage is explicitly unavailable, never estimated.
- Cached results have `latencyMs: null`, `usage: null`, and zero new charge.
- Browser session spend counts received live responses for that page lifetime, not an account-wide invoice. The server endpoint separately tracks its process lifetime. Unknown usage is excluded from the known subtotal and visibly flagged. Requests whose responses never arrive cannot be reconciled with an upstream invoice from this app alone.

## Verification

```sh
pnpm test
pnpm run catalog:validate
pnpm run build
pnpm run test:e2e
pnpm run test:failures
```

Start the server before E2E. `TEST_URL` selects a different target; `CHROME_PATH` optionally selects Chromium. Puppeteer's installed `headless-shell` is used by default. The E2E suite makes real paid calls through the backend and checks catalog texture decoding, mod/category filtering, search, custom entity routing, TNT diversion, cache accounting, hotkeys, drag/toss/drop, controls, viewport overflow and actual canvas frame intervals. Failures return a nonzero exit status.

Artifacts: `artifacts/e2e-report.json` and `artifacts/modded-factory-1080p.png`. The `?diagnostics=1` URL enables read-only canvas snapshots and frame samples for verification; it does not replace API classification or expose a spawn bypass. Performance evidence describes the measured headless environment, not every GPU/browser.
