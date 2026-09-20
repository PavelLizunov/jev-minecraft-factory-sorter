import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1920, height: 1080 });
  await page.setRequestInterception(true);
  let mode = 'failure', heldRequest = null;
  const result = { source: 'live', model: 'explicit-test-fixture', chest: 'mechanical_and_logistics', isHazardous: false, latencyMs: 300, usage: { input_tokens: 100, output_tokens: 10 }, chargeNanoUsd: '4200', costUsd: '0.000004200' };
  page.on('request', request => {
    if (request.url().endsWith('/api/classify')) {
      if (mode === 'failure') return request.respond({ status: 502, contentType: 'application/json', body: JSON.stringify({ source: 'error', error: 'Explicit test outage. Cargo held for retry.' }) });
      if (mode === 'delay') { heldRequest = request; return; }
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    }
    request.continue();
  });
  await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });
  await page.click('[aria-label="Quick spawn Mechanical Press"]');
  await page.waitForFunction(() => window.__factoryDiagnostics.snapshot().some(e => e.error));
  assert.equal(await page.$eval('[data-testid="session-spend"]', e => e.textContent), '$0.000000000');
  assert.equal(await page.evaluate(() => window.__factoryDiagnostics.snapshot()[0].phase), 'feeder');
  console.log('PASS upstream outage holds cargo and invents no spend');
  mode = 'success';
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Retry held cargo').click());
  await page.waitForFunction(() => document.querySelector('[data-testid="bay-mechanical_and_logistics"] .bay-count').textContent === '1', { timeout: 15000 });
  console.log('PASS held-cargo retry delivers exactly once');
  mode = 'delay';
  await page.click('[aria-label="Quick spawn Mechanical Press"]');
  await page.waitForFunction(() => window.__factoryDiagnostics.snapshot().some(e => e.x === 350));
  assert.ok(heldRequest);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Clear belt').click());
  await heldRequest.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
  await page.waitForFunction(() => document.querySelector('[data-testid="session-spend"]').textContent === '$0.000008400');
  assert.equal(await page.evaluate(() => window.__factoryDiagnostics.snapshot().length), 0);
  assert.equal(await page.$eval('[data-testid="bay-mechanical_and_logistics"] .bay-count', e => e.textContent), '1');
  console.log('PASS late cleared-cargo response counts charge but never resurrects cargo');
  const errors = await browser.newPage(); await errors.setRequestInterception(true);
  errors.on('request', request => request.url().endsWith('/api/blocks') ? request.respond({ status: 503, contentType: 'application/json', body: '{}' }) : request.continue());
  await errors.goto(base, { waitUntil: 'networkidle0' });
  assert.ok(await errors.$('[role="alert"]'));
  assert.ok(await errors.$eval('[role="alert"]', e => e.textContent.includes('Reload catalog')));
  console.log('PASS catalog failure presents reload control');
  await errors.close();
} finally { await browser.close(); }
