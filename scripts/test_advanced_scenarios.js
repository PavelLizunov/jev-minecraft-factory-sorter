import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING ADVANCED JEV USE CASES (PROGRAMS, TRIAGE, QUARRY RUN) ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

// 1. Check Program Preset Selector
console.log('1. Checking Program Preset Selector...');
const programSelect = await p.$('select[aria-label="Active Jev Program"]');
assert.ok(programSelect, 'Program selector must exist');
const programs = await p.$$eval('select[aria-label="Active Jev Program"] option', opts => opts.map(o => o.value));
console.log('Available programs:', programs);
assert.deepEqual(programs, ['storage', 'expedition', 'recycling']);

// 2. Switch to Expedition Prep Program
console.log('2. Switching to Expedition Prep program...');
await p.select('select[aria-label="Active Jev Program"]', 'expedition');
await new Promise(r => setTimeout(r, 200));

// 3. Test Pipeline Mode Toggle (Parallel Scan -> Triage Pipeline)
console.log('3. Testing Pipeline Mode Toggle...');
const modeBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Parallel Scan') || b.textContent.includes('Triage Pipeline'))
);
assert.ok(modeBtn.asElement(), 'Pipeline mode toggle button must exist');
await modeBtn.asElement().click();
await new Promise(r => setTimeout(r, 200));
const modeText = await (await modeBtn.getProperty('textContent')).jsonValue();
assert.ok(modeText.includes('Triage Pipeline'), 'Mode button must reflect Triage Pipeline');
console.log('PASS: Toggled to Triage Pipeline mode!');

// 4. Test Quarry Run 25-Item Stream
console.log('4. Triggering Quarry Run (25-item stream)...');
const quarryBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Quarry Run'))
);
assert.ok(quarryBtn.asElement(), 'Quarry Run button must exist');
await quarryBtn.asElement().click();

// Wait for items to stream onto conveyor
await p.waitForFunction(() => window.__factoryDiagnostics.snapshot().length >= 5, { timeout: 10000 });
const inFlight = await p.evaluate(() => window.__factoryDiagnostics.snapshot().length);
console.log(`PASS: Quarry Run successfully streaming (${inFlight} items in flight on conveyor)!`);

// 5. Verify probability breakdown rendering
await p.waitForFunction(() => {
  return document.querySelector('.probability-breakdown') !== null;
}, { timeout: 15000 });
console.log('PASS: Calibrated probability distribution visualizer rendered in HUD!');

await b.close();
console.log('ALL ADVANCED SCENARIO TESTS PASSED 100%!');
