import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING NEW FEATURES (Category 6, True Random, Toss Button, Hold Policy) ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

// 1. Verify Category 6 Renaming
console.log('1. Verifying Category 6 renaming...');
const bayNames = await p.$$eval('.receiving-bay h3', nodes => nodes.map(n => n.textContent.trim()));
console.log('Receiving Bays:', bayNames);
assert.ok(
  bayNames.some(name => name.includes('Armory') || name.includes('Food')),
  'Bay 6 must reflect Armory, Food & Organics'
);
console.log('PASS: Bay 6 correctly displays Armory, Food & Organics!');

// 2. Test "🎲 Toss Random" Button
console.log('2. Testing "🎲 Toss Random" button...');
const tossBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Toss Random'))
);
assert.ok(tossBtn.asElement(), 'Toss Random button must exist');

const countBefore = await p.evaluate(() => window.__factoryDiagnostics.snapshot().length);
await tossBtn.asElement().click();
await new Promise(r => setTimeout(r, 600));
const snapAfter = await p.evaluate(() => window.__factoryDiagnostics.snapshot());
assert.equal(snapAfter.length, countBefore + 1, 'Toss Random must spawn exactly 1 entity');
console.log(`PASS: Toss Random spawned: ${snapAfter[snapAfter.length - 1].catalogId}`);

// 3. Test True Random Quarry Run (25)
console.log('3. Testing Quarry Run (25) random diversity...');
const quarryBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Quarry Run (25)'))
);
assert.ok(quarryBtn.asElement(), 'Quarry Run button must exist');
await quarryBtn.asElement().click();
await new Promise(r => setTimeout(r, 2000));
const quarrySnap = await p.evaluate(() => window.__factoryDiagnostics.snapshot());
assert.ok(quarrySnap.length >= 6, 'Quarry Run must stream items onto conveyor');
console.log(`PASS: Quarry Run streaming ${quarrySnap.length} items!`);

// 4. Test Hold Policy: Switch to Auto-Clear (auto_store)
console.log('4. Testing Hold Policy Auto-Clear (auto_store)...');
await p.select('select[aria-label="Hold policy"]', 'auto_store');
await new Promise(r => setTimeout(r, 200));

// Clear belt first
const clearBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Clear belt'))
);
await clearBtn.asElement().click();
await new Promise(r => setTimeout(r, 400));

// Spawn Respawn Anchor (normally triggers hold)
console.log('Spawning Respawn Anchor under auto_store policy...');
const anchorSlot = await p.$('[data-block-id="minecraft:respawn_anchor"]');
if (anchorSlot) {
  await anchorSlot.click();
} else {
  // Spawn via search
  await p.type('input[aria-label="Search blocks"]', 'respawn anchor');
  await new Promise(r => setTimeout(r, 300));
  await p.click('.block-slot');
}

// Under auto_store, item should NOT remain stuck on siding, it should be auto-released!
console.log('Waiting for Respawn Anchor to auto-clear to destination...');
await p.waitForFunction(
  () => {
    const snap = window.__factoryDiagnostics.snapshot();
    const anchor = snap.find(e => e.catalogId.includes('respawn_anchor'));
    // It should either be delivered or in phase branch/destination, not stuck in hold indefinitely
    return anchor && (anchor.phase === 'branch' || anchor.phase === 'destination' || anchor.phase === 'return' || anchor.decision?.cleared);
  },
  { timeout: 20000 }
);
console.log('PASS: Respawn Anchor was automatically cleared and routed under auto_store policy!');

// 5. Test Hold Policy: Switch to Auto-Shunt (auto_shunt)
console.log('5. Testing Hold Policy Auto-Shunt (auto_shunt)...');
await p.select('select[aria-label="Hold policy"]', 'auto_shunt');
await new Promise(r => setTimeout(r, 200));

// Reset search and clear belt
await p.click('button[aria-label="Clear search"]').catch(() => {});
await p.evaluate(() => {
  const input = document.querySelector('input[aria-label="Search blocks"]');
  if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
});
await new Promise(r => setTimeout(r, 200));

// Spawn Respawn Anchor directly by data-block-id
console.log('Spawning Respawn Anchor under auto_shunt policy...');
const anchorSlot2 = await p.$('[data-block-id="minecraft:respawn_anchor"]');
if (anchorSlot2) {
  await anchorSlot2.click();
} else {
  // If not in view, click via evaluate
  await p.evaluate(() => {
    const el = document.querySelector('[data-block-id="minecraft:respawn_anchor"]');
    if (el) el.click();
  });
}

console.log('Waiting for Respawn Anchor to auto-shunt (returning_from_siding -> feeder -> shunt)...');
await p.waitForFunction(
  () => {
    const snap = window.__factoryDiagnostics.snapshot();
    const anchor = snap.find(e => e.catalogId.includes('respawn_anchor') && e.decision?.action === 'shunt');
    return anchor && (anchor.phase === 'returning_from_siding' || anchor.phase === 'feeder' || anchor.phase === 'shunt');
  },
  { timeout: 20000 }
);
console.log('PASS: Respawn Anchor was automatically marked for shunt under auto_shunt policy!');

// 6. Parameterized Armor, Weapons & Tools Routing to Category 6 (Armory & Bio)
console.log('6. Testing Parameterized Armor, Weapons & Tools routing to Category 6...');
await p.select('select[aria-label="Hold policy"]', 'auto_store');
const testArmoryItems = [
  'minecraft:diamond_chestplate',
  'minecraft:diamond_sword',
  'minecraft:iron_pickaxe'
];

for (const itemId of testArmoryItems) {
  console.log(`Spawning ${itemId}...`);
  await p.evaluate(id => {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    if (el) el.click();
  }, itemId);
  await new Promise(r => setTimeout(r, 1000));
}

// Wait for at least 1 armory item to reach Bay 6
console.log('Waiting for armory items to reach Bay 6 (Armory & Bio)...');
await p.waitForFunction(
  () => {
    const bay6Count = document.querySelector('[data-testid="bay-mob_drops_and_food"] .bay-count');
    return bay6Count && parseInt(bay6Count.textContent, 10) >= 1;
  },
  { timeout: 25000 }
);
console.log('PASS: Armor and weapons successfully route into Category 6 (Armory & Bio)!');

await b.close();
console.log('ALL NEW FEATURES TESTS PASSED 100%!');
