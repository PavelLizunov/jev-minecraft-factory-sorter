import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
await fs.mkdir('artifacts/mobile', { recursive: true });

const browser = await puppeteer.launch({
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  // --- Test 1: iPhone 14/15 (390 x 844) ---
  console.log('Testing 390x844 mobile viewport...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

  const overflow390 = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  console.log('390x844 metrics:', overflow390);
  assert.ok(
    overflow390.scrollHeight <= overflow390.innerHeight,
    `Mobile 390x844 scrollHeight (${overflow390.scrollHeight}) must be <= innerHeight (${overflow390.innerHeight})`
  );
  assert.ok(
    overflow390.scrollWidth <= overflow390.innerWidth,
    `Mobile 390x844 scrollWidth (${overflow390.scrollWidth}) must be <= innerWidth (${overflow390.innerWidth})`
  );
  console.log('PASS Mobile 390x844 is strictly single-screen (0 document scroll)');

  // Test Mobs & Bosses Filter Tab
  console.log('Testing Mobs & Bosses tab...');
  const mobTabBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.mobile-panel-content .mod-tabs button')].find(b => b.textContent.includes('Mobs'))
  );
  assert.ok(mobTabBtn.asElement(), 'Mobs & Bosses tab exists');
  await mobTabBtn.asElement().click();
  await mobTabBtn.dispose();

  const mobCount = await page.$$eval('.mobile-panel-content .block-slot', slots => slots.length);
  console.log(`Found ${mobCount} mobs in Mobs & Bosses filter`);
  assert.ok(mobCount >= 40, `Expected at least 40 mobs, found ${mobCount}`);

  // Tap a mob (Creeper Head or Zombie Head or Warden Spawn Egg)
  const creeperHeadSlot = await page.$('.mobile-panel-content [data-block-id="minecraft:creeper_head"]');
  assert.ok(creeperHeadSlot, 'Creeper Head exists in catalog');
  await creeperHeadSlot.click();
  console.log('PASS Tapped Creeper Head to spawn on conveyor');

  // Capture Mobile Catalog Screenshot
  await page.screenshot({ path: 'artifacts/mobile/mobile-390-catalog.png' });

  // Switch to Telemetry Tab
  console.log('Testing Mobile Telemetry Tab...');
  const telemBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.mobile-tab-bar button')].find(b => b.textContent.includes('Telemetry'))
  );
  await telemBtn.asElement().click();
  await telemBtn.dispose();
  await page.waitForSelector('.mobile-panel-content .inspection-panel');
  await page.screenshot({ path: 'artifacts/mobile/mobile-390-telemetry.png' });
  console.log('PASS Switched to mobile Telemetry panel');

  // Switch to Bays Tab
  console.log('Testing Mobile Bays Tab...');
  const baysBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll('.mobile-tab-bar button')].find(b => b.textContent.includes('Bays'))
  );
  await baysBtn.asElement().click();
  await baysBtn.dispose();
  await page.waitForSelector('.mobile-bays-wrapper');
  await page.screenshot({ path: 'artifacts/mobile/mobile-390-bays.png' });
  console.log('PASS Switched to mobile Bays panel');

  // Test Guide Modal
  console.log('Testing Guide Modal...');
  const guideBtn = await page.$('.guide-button');
  await guideBtn.click();
  await page.waitForSelector('.modal-card');
  assert.ok(await page.$eval('.modal-card h2', e => e.textContent.includes('Factory Sorter')));
  await page.screenshot({ path: 'artifacts/mobile/mobile-390-guide-modal.png' });
  await page.click('.modal-header .icon-button');
  await page.waitForFunction(() => !document.querySelector('.modal-backdrop'));
  console.log('PASS Guide modal opens, displays full explainer, and closes cleanly');

  // --- Test 2: Android / Pixel (412 x 915) ---
  console.log('Testing 412x915 mobile viewport...');
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
  await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });
  const overflow412 = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert.ok(overflow412.scrollHeight <= overflow412.innerHeight);
  assert.ok(overflow412.scrollWidth <= overflow412.innerWidth);
  console.log('PASS Mobile 412x915 is strictly single-screen (0 document scroll)');

  // --- Test 3: Desktop (1920 x 1080) ---
  console.log('Testing 1920x1080 desktop viewport...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });
  const overflow1080 = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert.ok(overflow1080.scrollHeight <= overflow1080.innerHeight);
  assert.ok(overflow1080.scrollWidth <= overflow1080.innerWidth);
  console.log('PASS Desktop 1920x1080 is strictly single-screen (0 document scroll)');

  assert.equal(errors.length, 0, `Expected 0 console errors, got ${errors.join('; ')}`);
  console.log('ALL MOBILE AND DESKTOP SINGLE-SCREEN ASSERTIONS PASSED!');
} finally {
  await browser.close();
}
