# Jev Factory handoff — 2026-09-20

## Stop requested
Owner requested stopping at the nearest checkpoint and transferring work to another agent. Do not continue implementation or dispatch agents without a new user request. Owner explicitly prohibited subagents during this repair.

## Verified release
- Project: /var/lib/dsh/Project/jev-test
- Branch: main
- Application commit: 5b3b4441f0b9dc973f6af7629301ea1a8ea7ab7d
- Production: https://jev.ninitux.com
- Deployed image: jev-factory:5b3b4441f0b9dc973f6af7629301ea1a8ea7ab7d (healthy, verified deployment output).
- VM118: 192.168.0.207, container jev-factory; ingress LXC210 unchanged.
- Previous application image: jev-factory:322bc3dbeab857911652ab0aa80646c06b43bee8.
- No DSH services restarted. No new subagents used in takeover/repair.

## What was repaired
- Mobile inherited the desktop inventory max-height of 205px. On 390x844, grid began at y=768.5 and hotbar at y=854.5: effectively inaccessible despite document reporting zero overflow.
- CSS now allocates mobile canvas and controls separately; inventory has no desktop max-height, toolbars/tabs/hotbar scroll horizontally, item grid scrolls vertically. Hidden speed label is contained by its toolbar.
- Desktop inventory is taller; diagnostic text is more legible and receiving bays have enough height.
- Plain wheel no longer zooms in either Fit or Detail. Ctrl/Cmd + wheel zooms; preset buttons directly reset camera without the stale cameraSource effect.
- No backend, classifier, catalog or physics changes in this repair.

## Evidence actually executed
- pnpm run build: passed.
- pnpm test: 20 passed.
- node scripts/test_camera_pan.js: passed (existing test retains limited coverage).
- node scripts/test_viewport_access.js: passed locally AND against production at 1920x1080, 1536x864, 1440x900, 1366x768, 1280x720, 390x844, 360x740. Tests check viewport geometry, panel center hit-testing, real Reset filters click and inventory wheel scrolling.
- node scripts/test_layout_states.js: passed locally AND against production. Mocked classification fixtures exercise populated dock scrolling and actual Hold release at 1366x768, 390x844, 360x740. Verifies plain wheel preserves camera, modified wheel zooms, Fit resets.
- Public production screenshots: artifacts/layout-repair-mobile.png and artifacts/layout-repair-laptop.png. Captured after deployment; final visual inspection was interrupted by stop request.
- git diff --check: passed before release commit.

## Limits / remaining work
- Do not claim universal bug-free or full accessibility compliance. Tested in Puppeteer Chromium; physical touch devices, Safari/Firefox, screen reader flows and browser zoom were not tested.
- No independent reviewer: owner prohibits subagents. Verification was performed directly.
- Existing older audit document artifacts/anti-slop-and-opendesign-audit.md contains unsupported blanket PASS claims and references removed Simple Mode. It was NOT relied on or revalidated here.
- Historical requests remain incomplete: full Vanilla registry coverage and item expansion across every mod are NOT satisfied by the current 933-entry catalog (178 tagged items). Earlier claims of completeness were overstated.
- Policy Studio historically uses synthetic replay probabilities; do not call it verified model-evidence replay without inspecting/fixing it. Out of scope for this viewport repair.
- Local CSS includes a bounded override section near the end; future cleanup should consolidate rules only with regression tests retained.
- Root README controls/layout paragraph updated; other historical counts/documentation may remain stale.

## Operational constraints
- English UI; do not reintroduce Simple Mode without request.
- Preserve live Jev accounting; egress to TypeSafe must use http://192.168.0.142:18080.
- Do not expose credentials or modify other services. Deployment instructions in deploy/README.md have stale example revisions; inspect actual image before deployment.
- All requested primary panels must remain reachable: zero document overflow alone is not sufficient. Use hit-testing, panel scrolling, and real clicks.
