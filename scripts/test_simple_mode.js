import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING SIMPLE VIEW FOR JEV FACTORY ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });

// 1. Open with ?view=simple
console.log('1. Loading application with ?view=simple...');
await p.goto(`${base}/?view=simple&diagnostics=1`, { waitUntil: 'networkidle0' });

// Verify Simple Mode elements
const simpleBadge = await p.$eval('.simple-inspection-panel', e => e.textContent);
assert.ok(simpleBadge.includes('SIMPLE VIEW'), 'Header must indicate Simple View');
assert.ok(simpleBadge.includes('Sorting Status'), 'Title must be friendly Sorting Status');
console.log('PASS: Simple View active by default on ?view=simple!');

// 2. Check 6-item quick pick grid
console.log('2. Checking 6-item quick-pick cards...');
const cardCount = await p.$$eval('.simple-item-card', cards => cards.length);
assert.equal(cardCount, 6, 'Exactly 6 friendly cards should be rendered in quick-pick grid');
console.log('PASS: 6 friendly quick-pick cards rendered!');

// 3. Click Diamond Ore to spawn 1 item
console.log('3. Clicking Diamond Ore quick card...');
await p.evaluate(() => {
  const cards = [...document.querySelectorAll('.simple-item-card')];
  const diamond = cards.find(c => c.textContent.includes('Diamond'));
  if (diamond) diamond.click();
});
await new Promise(r => setTimeout(r, 400));

const snap1 = await p.evaluate(() => window.__factoryDiagnostics.snapshot());
assert.equal(snap1.length, 1, 'Exactly 1 block should be spawned from simple card click');
console.log('PASS: Exactly 1 block spawned on conveyor!');

// 4. Wait for item to sort and check friendly delivery card
console.log('Waiting for diamond to sort into Resources chest...');
await p.waitForFunction(() => {
  const text = document.querySelector('.simple-inspection-panel')?.textContent || '';
  return text.includes('Latest Delivered Item') && text.includes('Resources');
}, { timeout: 15000 });
console.log('PASS: Friendly delivery card displayed with target chest!');

// 5. Click "Open Chest ->" button from simple dock
console.log('4. Clicking Open Chest button from simple dock...');
const openChestBtn = await p.$('.simple-inspection-panel button');
await p.evaluate(() => {
  const btns = [...document.querySelectorAll('.simple-inspection-panel button')];
  const openBtn = btns.find(b => b.textContent.includes('Open Chest'));
  if (openBtn) openBtn.click();
});
await p.waitForSelector('.chest-modal-card');
console.log('PASS: Chest modal opened directly from friendly status card!');
await p.keyboard.press('Escape');
await p.waitForFunction(() => !document.querySelector('.chest-modal-card'));
console.log('PASS: Chest modal closed cleanly!');

// 6. Test UI mode toggle in Header (switch to Details, then back to Simple)
console.log('5. Testing [Details] toggle in header...');
await p.click('.ui-mode-toggle button:last-child');
await new Promise(r => setTimeout(r, 300));
const expertDock = await p.$('.inspection-panel');
assert.ok(expertDock, 'Expert inspection dock must be rendered');
console.log('PASS: Switched to Details mode!');

console.log('6. Testing [Simple] toggle in header...');
await p.click('.ui-mode-toggle button:first-child');
await new Promise(r => setTimeout(r, 300));
const simpleDockAgain = await p.$('.simple-inspection-panel');
assert.ok(simpleDockAgain, 'Simple inspection dock must be restored');
console.log('PASS: Switched back to Simple mode!');

await b.close();
console.log('ALL SIMPLE MODE TESTS PASSED 100%!');
