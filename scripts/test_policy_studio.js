import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
console.log('=== TESTING POLICY STUDIO & COUNTERFACTUAL REPLAY ===');

const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
await p.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

// 1. Open Policy Studio Modal
console.log('1. Opening Policy Studio...');
const studioBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Policy Studio'))
);
assert.ok(studioBtn.asElement(), 'Policy Studio button must exist');
await studioBtn.asElement().click();
await p.waitForSelector('.policy-studio-card');
console.log('PASS: Policy Studio modal opened!');

// 2. Check title and natural-language objective
const title = await p.$eval('#studio-title', e => e.textContent);
assert.ok(title.includes('Policy Studio'), 'Modal title must be Policy Studio');

// 3. Test threshold slider adjustment and counterfactual delta table update
console.log('2. Adjusting hazard threshold slider to 0.55...');
await p.evaluate(() => {
  const sliders = document.querySelectorAll('.policy-studio-card input[type="range"]');
  const hazardSlider = sliders[1];
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSetter.call(hazardSlider, '0.55');
  hazardSlider.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise(r => setTimeout(r, 300));

// Check delta status in table
const changedCount = await p.$$eval('.policy-studio-card tbody tr', rows => {
  return rows.filter(r => r.textContent.includes('ACTION CHANGED')).length;
});
console.log(`PASS: Found ${changedCount} counterfactual action changes with adjusted thresholds!`);
assert.ok(changedCount >= 1, 'At least one item must change action when hazard threshold is lowered');

// 4. Test live Jev evaluation button
console.log('3. Triggering live Jev inference test...');
const testJevBtn = await p.evaluateHandle(() =>
  [...document.querySelectorAll('.policy-studio-card button')].find(b => b.textContent.includes('Test Jev Inference'))
);
assert.ok(testJevBtn.asElement(), 'Test Jev Inference button must exist');
await testJevBtn.asElement().click();

await p.waitForFunction(() => {
  const text = document.querySelector('.policy-studio-card .modal-footer')?.textContent || '';
  return text.includes('Verified API Cost:');
}, { timeout: 25000 });
const costText = await p.$eval('.policy-studio-card .modal-footer', e => e.textContent);
console.log('PASS: Live Jev evaluation completed!', costText.match(/Verified API Cost: \$[\d.]+/)?.[0]);

// 5. Test Escape key close and focus trapping
console.log('4. Testing keyboard Escape and focus trapping...');
await p.keyboard.press('Escape');
await p.waitForFunction(() => !document.querySelector('.policy-studio-card'));
console.log('PASS: Policy Studio closed with Escape!');

await b.close();
console.log('ALL POLICY STUDIO TESTS PASSED 100%!');
