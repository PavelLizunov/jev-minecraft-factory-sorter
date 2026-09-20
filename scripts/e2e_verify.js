import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
const outputDir = process.env.TEST_OUTPUT_DIR || 'artifacts';
const report = { viewport: { width: 1920, height: 1080 }, checks: [], api: [], errors: [] };
const check = (name, value = true) => { assert.ok(value, name); report.checks.push(name); console.log(`PASS ${name}`); };
const format = units => `${units / 1000000000n}.${(units % 1000000000n).toString().padStart(9, '0')}`;
let browser;
try {
  await fs.mkdir(outputDir, { recursive: true });
  browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage();
  if (process.env.TEST_AUTH_FILE) {
    const auth = JSON.parse(await fs.readFile(process.env.TEST_AUTH_FILE, 'utf8'));
    await page.authenticate({ username: auth.username, password: auth.password });
  }
  await page.setViewport(report.viewport);
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push(msg.text()); });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('requestfailed', req => report.errors.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`));
  page.on('response', async response => {
    if (response.url().endsWith('/api/classify')) {
      try { report.api.push({ status: response.status(), body: await response.json() }); } catch { report.errors.push('Unreadable classification response'); }
    }
  });
  const button = async text => {
    const handle = await page.evaluateHandle(label => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === label), text);
    assert.ok(handle.asElement(), `Button exists: ${text}`); await handle.asElement().click(); await handle.dispose();
  };
  const search = async text => { await page.click('input[aria-label="Search blocks"]'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); if (text) await page.type('input[aria-label="Search blocks"]', text); };
  await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-block-id="create:mechanical_press"]');
  const catalog = await page.evaluate(async () => (await (await fetch('/api/blocks')).json()).blocks);
  check('At least 55 vanilla blocks preserved', catalog.filter(b => b.mod === 'Vanilla').length >= 55);
  check('At least 300 real modded blocks', catalog.filter(b => b.mod !== 'Vanilla').length >= 300);
  check('English document language', await page.$eval('html', e => e.lang) === 'en');
  check('No document overflow at 1920×1080', await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth));
  // Decode every catalog texture, not only lazy images currently visible.
  const broken = await page.evaluate(async blocks => {
    const failed = [];
    for (let i = 0; i < blocks.length; i += 16) await Promise.all(blocks.slice(i, i + 16).map(b => new Promise(resolve => {
      const img = new Image(); img.onload = () => { if (!img.naturalWidth) failed.push(b.id); resolve(); }; img.onerror = () => { failed.push(b.id); resolve(); }; img.src = b.texture;
    })));
    return failed;
  }, catalog);
  check('Every catalog PNG decodes in Chromium', broken.length === 0);
  const groups = {
    Vanilla: ['Vanilla'],
    Create: ['Create'],
    AE2: ['AE2'],
    'Industrial & Tech': ['IndustrialCraft 2', 'GregTech', 'Thermal Expansion', 'Immersive Engineering', "Tinkers' Construct", 'Ender IO'],
    Mekanism: ['Mekanism'],
    Magic: ['Botania', 'Thaumcraft', 'Blood Magic'],
    Endgame: ['Draconic Evolution', 'Avaritia']
  };
  for (const [label, mods] of Object.entries(groups)) {
    await button(label);
    const visible = await page.$$eval('.block-slot', nodes => nodes.map(n => n.dataset.mod));
    check(`${label} filter contains only its mods`, visible.length > 0 && visible.every(m => mods.includes(m)));
  }
  await button('All');
  const start = performance.now(); await search('mechanical press');
  await page.waitForFunction(() => document.querySelectorAll('.block-slot').length >= 1);
  report.searchEndToEndMs = performance.now() - start;
  check('Search finds Mechanical Press', await page.$eval('.block-slot', e => e.dataset.blockId) === 'create:mechanical_press');
  await search('zzzz-no-such-block');
  check('Search empty state is explicit', await page.$eval('.block-grid', e => e.textContent.includes('match these filters')));
  await button('Reset filters');
  await page.select('select[aria-label="Category filter"]', 'ores_and_gems');
  const ids = await page.$$eval('.block-slot', nodes => nodes.map(n => n.dataset.blockId));
  check('Category filter combines with inventory', ids.length > 0 && ids.every(id => catalog.find(b => b.id === id).category === 'ores_and_gems'));
  await page.select('select[aria-label="Category filter"]', 'all');
  // A unique custom item guarantees a fresh live response on reruns.
  await button('Anvil');
  await page.waitForSelector('dialog[open]');
  await page.type('dialog input', `Raspberry Jam ${Date.now()}`);
  await page.type('dialog textarea', 'Sweet homemade berry jam in a glass jar. Edible preserved fruit, not a machine or dangerous chemical.');
  const liveResponse = page.waitForResponse(r => r.url().endsWith('/api/classify'), { timeout: 25000 });
  await button('Launch onto feeder');
  const live = await (await liveResponse).json();
  check('Fresh Jev classification succeeds without fallback', live.source === 'live' && live.chest === 'mob_drops_and_food' && live.isHazardous === false);
  check('Actual input and output usage present', Number.isSafeInteger(live.usage?.input_tokens) && Number.isSafeInteger(live.usage?.output_tokens));
  check('Exact charge derives only from response input usage', live.costUsd === format(BigInt(live.usage.input_tokens) * 42n));
  check('Measured live HTTP roundtrip is positive', live.latencyMs > 0);
  await page.waitForFunction(cost => document.querySelector('[data-testid="call-cost"]').textContent === `$${cost}`, {}, live.costUsd);
  check('HUD matches exact live response cost');
  await page.waitForFunction(() => document.querySelector('[data-testid="bay-mob_drops_and_food"] .bay-count').textContent === '1', { timeout: 16000 });
  check('Custom entity physically arrives in biological bay');
  await page.click('[aria-label*="Clear Armory"], [aria-label*="Clear Organics"]');
  check('Clear bay works', await page.$eval('[data-testid="bay-mob_drops_and_food"] .bay-count', e => e.textContent) === '0');
  // Test hazard path using real TNT classification, then cache accounting.
  const tnt = catalog.find(b => b.id === 'tnt');
  await search('TNT Explosive');
  const hazardResponse = page.waitForResponse(r => r.url().endsWith('/api/classify'), { timeout: 25000 });
  await page.click('[data-block-id="tnt"]');
  const hazard = await (await hazardResponse).json();
  check('Jev identifies TNT hazard', hazard.isHazardous === true);
  await page.waitForFunction(() => document.querySelector('[data-testid="diverted-count"]').textContent.startsWith('1 '), { timeout: 16000 });
  check('Hazard reaches lava pit instead of a bay');
  const beforeCache = await page.$eval('[data-testid="session-spend"]', e => e.textContent);
  const cacheResponse = page.waitForResponse(r => r.url().endsWith('/api/classify'), { timeout: 25000 });
  await page.click('[data-block-id="tnt"]');
  const cache = await (await cacheResponse).json();
  check('Repeated cargo returns explicit zero-charge cache result', cache.source === 'cache' && cache.chargeNanoUsd === '0' && cache.latencyMs === null && cache.usage === null);
  await page.waitForFunction(() => document.querySelector('[data-testid="latency"]').textContent === 'No API call');
  check('Cache does not inflate session spend', await page.$eval('[data-testid="session-spend"]', e => e.textContent) === beforeCache);
  await button('Clear belt'); await search('');
  await page.click('.workspace-topline h2'); await page.keyboard.press('1');
  await page.waitForFunction(() => window.__factoryDiagnostics.snapshot().some(e => e.catalogId === 'create:mechanical_press'));
  check('Number-key hotbar spawns modded cargo');
  // Drag a real canvas entity, release it with velocity, and inspect the engine state.
  const cargo = await page.evaluate(() => window.__factoryDiagnostics.snapshot()[0]);
  const rect = await page.$eval('canvas', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const point = (x, y) => ({ x: rect.x + x / 1200 * rect.width, y: rect.y + y / 720 * rect.height });
  const from = point(cargo.x + 10, cargo.y), to = point(760, 180);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
  check('Pointer drag releases cargo into flight', await page.evaluate(() => window.__factoryDiagnostics.snapshot().some(e => e.phase === 'flight')));
  // Real DataTransfer event validates the inventory-to-canvas drop contract.
  await page.evaluate(() => {
    const slot = document.querySelector('[data-block-id="ae2:controller"]');
    const transfer = new DataTransfer(); slot.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
    const canvas = document.querySelector('canvas'), r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: r.x + r.width * 0.6, clientY: r.y + r.height * 0.65 }));
  });
  check('Inventory drop creates correct catalog entity', await page.evaluate(() => window.__factoryDiagnostics.snapshot().some(e => e.catalogId === 'ae2:controller')));
  await button('Anvil'); await page.keyboard.press('Escape'); check('Anvil closes with Escape', await page.$('dialog[open]') === null);
  await button('Anvil'); await page.click('[aria-label="Close Anvil"]'); check('Anvil close control works', await page.$('dialog[open]') === null);
  await page.click('[aria-label="Unmute audio"]'); await page.click('[aria-label="Mute audio"]'); check('Audio toggle works');
  await button('Clear belt');
  await button('Create'); await button('Spawn 5');
  await page.waitForFunction(() => window.__factoryDiagnostics.snapshot().length >= 5);
  check('Batch spawning respects current mod filter', await page.evaluate(() => window.__factoryDiagnostics.snapshot().every(e => e.catalogId.startsWith('create:'))));
  await button('Auto feed'); await page.select('select[aria-label="Feed speed"]', '4');
  // Sampling starts after controls settle, then waits on actual rendered frames.
  const baseline = await page.evaluate(() => window.__factoryDiagnostics.performance().frames);
  await page.waitForFunction(start => window.__factoryDiagnostics.performance().frames >= start + 300, { timeout: 15000 }, baseline);
  await button('Stop feed');
  const intervals = await page.evaluate(() => window.__factoryDiagnostics.performance().intervals.slice(-300));
  const sorted = [...intervals].sort((a, b) => a - b);
  report.animation = { frames: intervals.length, averageFps: 1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length), medianFrameMs: sorted[150], p95FrameMs: sorted[285] };
  check('Active canvas sustains approximately 60 FPS', report.animation.averageFps >= 57 && report.animation.p95FrameMs <= 25);
  // Let all outstanding paid requests settle before reconciling spend.
  await page.waitForFunction(() => !document.querySelector('.section-label .mono')?.textContent.includes('pending'), { timeout: 20000 });
  const expected = report.api.filter(r => r.body.source === 'live').reduce((sum, r) => sum + BigInt(r.body.chargeNanoUsd || '0'), 0n);
  check('Session spend exactly matches sum of live response charges', await page.$eval('[data-testid="session-spend"]', e => e.textContent) === `$${format(expected)}`);
  await button('All'); await button('Clear belt');
  // Screenshot captures active modded cargo with genuine recent telemetry.
  for (const id of ['create:mechanical_press', 'ae2:controller', 'mekanism:digital_miner', 'botania:pure_daisy']) {
    await page.click(`[data-block-id="${id}"]`);
  }
  await page.waitForFunction(() => window.__factoryDiagnostics.snapshot().some(e => e.phase === 'branch' || e.phase === 'destination'), { timeout: 20000 });
  await page.hover('[data-block-id="create:mechanical_press"]');
  check('Full-HD layout still fits during active operation', await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  await page.screenshot({ path: `${outputDir}/modded-factory-1080p.png`, fullPage: true });
  await button('Clear belt');
  for (const width of [1280, 768, 390]) {
    await page.setViewport({ width, height: 900 });
    check(`No horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewport(report.viewport);
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Tab');
  check('Keyboard focus reaches an interactive control', await page.evaluate(() => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)));
  check('Zero console, page, or request errors', report.errors.length === 0);
  report.verdict = 'passed';
  await fs.writeFile(`${outputDir}/e2e-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks.length, animation: report.animation, liveCalls: report.api.filter(r => r.body.source === 'live').length, verdict: report.verdict }, null, 2));
} catch (error) {
  report.verdict = 'failed'; report.failure = error.stack;
  await fs.mkdir(outputDir, { recursive: true }); await fs.writeFile(`${outputDir}/e2e-report.json`, JSON.stringify(report, null, 2));
  console.error(error); process.exitCode = 1;
} finally { await browser?.close(); }
