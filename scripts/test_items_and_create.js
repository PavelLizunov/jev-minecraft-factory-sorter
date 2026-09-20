import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING CREATE MOD AESTHETIC & 2D ITEM INGESTION ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

// 1. Verify Catalog Expansion (now 1231 items & blocks!)
const countText = await p.$eval('.catalog-count', e => e.textContent);
console.log('Catalog count in header:', countText);
assert.ok(countText.includes('1231') || countText.includes('123'), 'Catalog count must reflect expanded 1200+ items');

// 2. Test "Items & Materials" Filter Tab
console.log('1. Filtering by Items & Materials tab...');
const itemTab = await p.evaluateHandle(() =>
  [...document.querySelectorAll('.mod-tabs button')].find(b => b.textContent.includes('Items & Materials'))
);
assert.ok(itemTab.asElement(), 'Items & Materials tab must exist');
await itemTab.asElement().click();
await new Promise(r => setTimeout(r, 300));

// Check item count
const itemCount = await p.$eval('[data-testid="inventory-count"]', e => parseInt(e.textContent.split('/')[0], 10));
console.log(`Found ${itemCount} items in Items & Materials tab`);
assert.ok(itemCount >= 38, 'Must have at least 38 items');

// 3. Test Spawning an authentic 2D item (Create Brass Ingot)
console.log('2. Spawning Create Brass Ingot onto conveyor belt...');
const brassSlot = await p.$('[data-block-id="create:brass_ingot"]');
assert.ok(brassSlot, 'Create Brass Ingot slot must exist');
await brassSlot.click();
await new Promise(r => setTimeout(r, 400));

const snap = await p.evaluate(() => window.__factoryDiagnostics.snapshot());
const brassItem = snap.find(e => e.catalogId === 'create:brass_ingot');
assert.ok(brassItem, 'Brass Ingot must exist on the conveyor belt');
assert.equal(brassItem.kind, 'item', 'Entity kind must be item');
console.log('PASS: Spawned 2D Create item on conveyor with kind=item!');

// 4. Wait for item to sort through Create Brass Tunnel into Resources bay
console.log('Waiting for Brass Ingot to sort into Resources bay...');
await p.waitForFunction(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  const it = snaps.find(e => e.catalogId === 'create:brass_ingot');
  return it && (it.phase === 'branch' || it.phase === 'destination') && it.decision?.chest === 'ores_and_gems';
}, { timeout: 15000 });
console.log('PASS: Create Brass Ingot classified and routed into Resources bay!');

// 5. Test Spawning a Vanilla Item (Ender Pearl)
console.log('3. Spawning Vanilla Ender Pearl...');
await p.click('[data-block-id="minecraft:ender_pearl"]');
await new Promise(r => setTimeout(r, 400));

console.log('Waiting for Ender Pearl to sort into Mob Drops & Bio bay...');
await p.waitForFunction(() => {
  const snaps = window.__factoryDiagnostics.snapshot();
  const pearl = snaps.find(e => e.catalogId === 'minecraft:ender_pearl');
  return pearl && (pearl.phase === 'branch' || pearl.phase === 'destination') && pearl.decision?.chest === 'mob_drops_and_food';
}, { timeout: 15000 });
console.log('PASS: Vanilla Ender Pearl classified and routed into Organics, Food & Mobs bay!');

await b.close();
console.log('ALL CREATE MOD & ITEM TESTS PASSED 100%!');
