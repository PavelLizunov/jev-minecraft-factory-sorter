import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING WELCOME CALLOUT, DEMO RUN, & ZERO LAYOUT JITTER ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

// 1. Verify Welcome Callout Card is visible on fresh empty factory
console.log('1. Verifying Welcome Callout Card presence on empty floor...');
const welcomeCard = await p.$('.welcome-callout-card');
assert.ok(welcomeCard, 'Welcome callout card must be visible on initial load');
const welcomeTitle = await p.$eval('.welcome-callout-card h3', e => e.textContent.trim());
console.log('Welcome title:', welcomeTitle);
assert.ok(welcomeTitle.includes('Welcome to Jev Factory'), 'Welcome title must greet user');

// 2. Click "Launch Demo Run (10 items)" on Welcome Card
console.log('2. Clicking "Launch Demo Run (10 items)" on Welcome Card...');
const demoBtnOnCard = await p.$('.welcome-callout-card button.primary');
assert.ok(demoBtnOnCard, 'Launch Demo button must exist on welcome card');
await demoBtnOnCard.click();
await new Promise(r => setTimeout(r, 600));

// Check that welcome card is dismissed
const welcomeCardAfter = await p.$('.welcome-callout-card');
assert.equal(welcomeCardAfter, null, 'Welcome card must dismiss after launching demo');

// Check that demo items stream onto the conveyor
const snap = await p.evaluate(() => window.__factoryDiagnostics.snapshot());
console.log(`Demo items spawned: ${snap.length}`);
assert.ok(snap.length >= 2, 'Demo items must stream onto conveyor');
console.log('PASS: Welcome card successfully launched demo and dismissed!');

// 3. Test Toolbar Demo Run Button
console.log('3. Testing Toolbar [🚀 Demo Run (10)] button...');
const demoToolbarBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Demo Run'))
);
assert.ok(demoToolbarBtn.asElement(), 'Demo Run button must exist in toolbar');

// 4. Test Zero Layout Shift in Inspection Dock on Hover / Selection
console.log('4. Verifying Zero Layout Shift in Inspection Dock during hover/selection...');
// Record bounding box of Latest Processed Cargo section
const getCargoSectionBox = () => p.$eval('.decision-section', e => {
  const r = e.getBoundingClientRect();
  return { y: r.y, height: r.height };
});

const getInspectorCardBox = () => p.$eval('.inspected-item', e => {
  const r = e.getBoundingClientRect();
  return { y: r.y, height: r.height };
});

const initialInspectorBox = await getInspectorCardBox();
const initialCargoBox = await getCargoSectionBox();
console.log('Initial Inspector Box:', initialInspectorBox);
console.log('Initial Cargo Box:', initialCargoBox);

// Hover over 5 different catalog items
for (const id of ['minecraft:diamond_sword', 'create:mechanical_press', 'tnt', 'botania:pure_daisy', 'minecraft:respawn_anchor']) {
  const slot = await p.$(`[data-block-id="${id}"]`);
  if (slot) {
    await slot.hover();
    await new Promise(r => setTimeout(r, 100));
    const currentInspectorBox = await getInspectorCardBox();
    const currentCargoBox = await getCargoSectionBox();
    assert.equal(currentInspectorBox.height, initialInspectorBox.height, 'Inspector card height must remain strictly fixed (no vertical shift)');
    assert.equal(currentCargoBox.y, initialCargoBox.y, 'Latest decision section top position must never jump on item hover');
  }
}
console.log('PASS: Zero layout shift in Inspection Dock verified across multiple item hovers!');

// 5. Test Live Status HUD Fixed Width
console.log('5. Verifying Live Status HUD has fixed width to prevent header jitter...');
const statusHudWidth = await p.$eval('.panel-heading > div:nth-child(2)', e => e.getBoundingClientRect().width);
console.log('Live Status HUD width:', statusHudWidth);
assert.equal(statusHudWidth, 260, 'Live Status HUD must maintain fixed 260px width');
console.log('PASS: Live Status HUD fixed width prevents header jitter!');

// 6. Test Footer Status Line Truncation
console.log('6. Verifying Footer Status Line does not push right-hand branding...');
const footerRightSpanBox = await p.$eval('.app-footer > span:last-child', e => e.getBoundingClientRect().toJSON());
// Trigger a very long status message
await p.evaluate(() => {
  window.__factoryDiagnostics?.snapshot();
  const el = document.querySelector('.app-footer span[role="status"]');
  if (el) el.textContent = 'A'.repeat(500);
});
await new Promise(r => setTimeout(r, 50));
const footerRightSpanBoxAfter = await p.$eval('.app-footer > span:last-child', e => e.getBoundingClientRect().toJSON());
assert.equal(footerRightSpanBoxAfter.x, footerRightSpanBox.x, 'Right-hand branding text must never move when status text changes length');
console.log('PASS: Footer status line properly truncates with zero horizontal shift!');

await b.close();
console.log('ALL WELCOME & ZERO-JITTER TESTS PASSED 100%!');
