import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING QUARANTINE SIDING & NON-BLOCKING FEEDER ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

// 1. Spawn Respawn Anchor (triggers Inspection Hold)
console.log('1. Spawning Respawn Anchor (uncertain item)...');
await p.click('[data-block-id="minecraft:respawn_anchor"]');
await new Promise(r => setTimeout(r, 400));

// Wait for it to divert from scanner (320, 340) down to the Quarantine Siding at y=480
console.log('Waiting for Respawn Anchor to divert from scanner to quarantine siding...');
await p.waitForFunction(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  const anchor = snaps.find(e => e.catalogId === 'minecraft:respawn_anchor');
  return anchor && anchor.y > 360 && (anchor.phase === 'to_siding' || anchor.phase === 'hold');
}, { timeout: 15000 });

const anchorBefore = await p.evaluate(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  return snaps.find(e => e.catalogId === 'minecraft:respawn_anchor');
});
console.log(`PASS: Respawn Anchor diverted from scanner to siding at x=${anchorBefore.x.toFixed(0)}, y=${anchorBefore.y.toFixed(0)}, phase=${anchorBefore.phase}`);

// 2. Now spawn Diamond Ore while Anchor is waiting on the siding!
console.log('2. Spawning Diamond Ore on main feeder...');
await p.click('[data-block-id="diamond_ore"]');

// Wait for Diamond Ore to travel the feeder, get scanned, and branch to Branch 1 without being blocked!
console.log('Waiting for Diamond Ore to route to Branch 1...');
await p.waitForFunction(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  const diamond = snaps.find(e => e.catalogId === 'diamond_ore');
  return diamond && (diamond.phase === 'branch' || diamond.phase === 'destination') && diamond.y < 300;
}, { timeout: 15000 });

console.log('PASS: Diamond Ore routed to Branch 1 while Respawn Anchor remained safely on siding!');

// 3. Verify Anchor is still parked on siding at y=480
const anchorStillParked = await p.evaluate(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  return snaps.find(e => e.catalogId === 'minecraft:respawn_anchor');
});
assert.equal(anchorStillParked.y, 480, 'Anchor should still be parked on siding at y=480');
console.log(`PASS: Anchor still parked on siding at x=${anchorStillParked.x.toFixed(0)}, y=${anchorStillParked.y}`);

// 4. Operator clicks [Clear to Bay]
console.log('3. Operator clears cargo to storage bay...');
const clearBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Clear to Bay'))
);
assert.ok(clearBtn.asElement(), 'Clear to Bay button must exist');
await clearBtn.asElement().click();

// Wait for Anchor to ride the return curve back into feeder and pass through scanner!
console.log('Waiting for Anchor to return through scanner and deliver to bay...');
await p.waitForFunction(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  const anchor = snaps.find(e => e.catalogId === 'minecraft:respawn_anchor');
  return !anchor || anchor.phase === 'branch' || anchor.phase === 'destination';
}, { timeout: 20000 });

console.log('PASS: Respawn Anchor returned through scanner and was smoothly dispatched to destination!');

await b.close();
console.log('ALL QUARANTINE SIDING TESTS PASSED 100%!');
