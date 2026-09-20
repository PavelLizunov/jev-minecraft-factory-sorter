# Jev factory verification

Verified on 2026-09-19 (Europe/Moscow) in `/var/lib/dsh/Project/jev-test`, Node v22.23.2, Chromium headless-shell 153, 1920×1080. Scope: the approved modded factory upgrade, checkpoint `ad79787` plus final updater/documentation/evidence changes. No unrelated service was restarted.

## Executed evidence

| Check | Result |
|---|---|
| `pnpm test` | 15/15 passed, exit 0 |
| `python3 scripts/ingest_catalog.py --validate` | 429 unique entries; required fields, iconic coverage, local PNGs and provenance hashes passed, exit 0 |
| `pnpm run build` | Vite production build passed, exit 0 |
| `node scripts/e2e_verify.js` | 40/40 live browser assertions passed, exit 0 |
| `node scripts/ui-failures.js` | Four fixture-based failure/recovery checks passed, exit 0 |
| `git diff --check` and JavaScript syntax checks | Passed, exit 0 |
| Rendered DOM text contrast sample | 87 visible enabled text elements, no failures against WCAG AA thresholds |
| Local HTTP trust-boundary probes | Six expected status-code checks passed; no upstream calls |

## Catalog

55 vanilla + 374 modded blocks: Create 100, AE2 65, Mekanism 85, Botania 85, IndustrialCraft 2 15, GregTech 5, Thermal Expansion 11, Thaumcraft 8. Every catalog PNG decoded successfully in Chromium. Official registries, pinned revisions, actual model textures and selected wiki inventory icons establish identities and asset provenance; texture faces are not counted as separate blocks.

The supplied phrase “Osmotic Concentrator” is not present in the pinned Mekanism registry. The real **Osmium Compressor** is included and searchable by that phrase. All other mandatory example names are represented, including ME Drive, the crafting storage family, Runic Altar and legacy Infusion Altar art.

## Measured browser results

- 300 actual canvas frame intervals under active cargo: **60.0024 FPS average**, **16.7 ms median**, **16.7 ms p95**.
- Zero console errors, page exceptions or failed requests in the live success suite.
- Complete workbench fits 1920×1080 without document scroll. No horizontal overflow at 1280, 768 or 390 pixels.
- Search interaction including automated typing: approximately **82 ms** in the final run. This is an end-to-end test observation, not a model speed metric.
- Six fresh live Jev calls in the final suite; cache was already warm from prior runs. Fresh custom item ensured that success could not be satisfied by cache alone.
- Live HTTP roundtrips: **1211.775–1288.904 ms**, including required egress proxy. The sub-150ms network target was **not achieved** and is not claimed.
- 3,665 input tokens across those live responses, totaling **$0.000153930**. Every displayed per-call cost was checked as input tokens × 42 nano-USD; session spend was reconciled against received live charges.

## Exercised behavior

All seven mod filters, category filtering, search/reset/empty state, catalog image loading, keyboard hotbar, batch spawn, auto feed/stop/speed, custom Anvil submission/close/Escape, pointer drag and real velocity release, inventory drop, normal physical delivery, TNT lava diversion, bay clearing, belt clearing, and sound toggling were exercised. Unit tests cover all four branch destinations and delayed/invalid classification. Fixture browser tests confirm outage holding, successful retry, catalog reload UI and late cleared-cargo accounting without resurrection.

Screenshot: `artifacts/modded-factory-1080p.png`, 1920×1080, inspected after the final icon/queue changes. Raw live test data: `artifacts/e2e-report.json`.

## Design and anti-slop review

- English primary UI and document language; no mock comparison endpoint or marketing cost-saving counters in the active app.
- Actual latency, usage and integer-derived costs only. Cache explicitly says “No API call”; no fake 120 ms/480-token defaults.
- Pixel-art cargo has no floating labels. Route colors carry destination meaning; animation represents transport, scanning and shunting. Inspector contains the detailed metadata.
- Inventory and form empty/loading/error states are implemented. Keyboard focus and native dialog operation passed. Native controls provide keyboard alternatives to canvas interaction.
- Purposeful palette and static workshop detail were visually inspected. No generated marketing figures, testimonials or speculative scale calculators were added.

## Limits and release caveats

This is a verified local engineering showcase, **not an unrestricted public-production release**. Create assets are all-rights-reserved; other mod/wiki assets carry upstream terms. Redistribution clearance is unresolved and documented in README/source manifest. Port 3333 has no user authentication and must stay on a trusted network. See `artifacts/security-review.md`.

Independent review was unavailable under the session's permitted model/delegation route; coordinator review is not represented as independent acceptance. Browser tests cover Chromium headless, not all GPUs, mobile touch hardware or screen readers. DOM contrast sampling excludes canvas text and disabled controls; it is not a complete accessibility audit. Semantic correctness is not proven for every block, and API schema constraints do not guarantee semantic truth.
