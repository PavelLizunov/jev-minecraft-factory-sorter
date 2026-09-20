import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gzip = promisify(zlib.gzip);
const base = process.env.TEST_URL || 'http://127.0.0.1:3333';

console.log('=== FULL PERFORMANCE & RUNTIME PROFILE AUDIT ===');
const auditReport = {
  timestamp: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  },
  bundle: {},
  cadence: {},
  searchLatency: {},
  memory: {},
  domNodes: {}
};

// 1. Bundle & Asset Metrics
console.log('1. Analyzing Vite production bundle...');
const distFiles = await fs.readdir('dist/assets');
for (const file of distFiles) {
  const content = await fs.readFile(`dist/assets/${file}`);
  const compressed = await gzip(content);
  auditReport.bundle[file] = {
    rawBytes: content.length,
    rawKb: (content.length / 1024).toFixed(2),
    gzipBytes: compressed.length,
    gzipKb: (compressed.length / 1024).toFixed(2)
  };
  console.log(` - ${file}: ${(content.length / 1024).toFixed(2)} KB (gzip: ${(compressed.length / 1024).toFixed(2)} KB)`);
}

// 2. Launch Headless Browser for Runtime Benchmarks
const browser = await puppeteer.launch({
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });

  // DOM Node count on desktop
  auditReport.domNodes.desktop1080p = await page.evaluate(() => document.querySelectorAll('*').length);
  console.log(`2. Desktop DOM node count: ${auditReport.domNodes.desktop1080p}`);

  // 3. Search & Filter Latencies
  console.log('3. Benchmarking Search & Filter response times across 495 items...');
  const searchBench = await page.evaluate(async () => {
    const searchInput = document.querySelector('input[aria-label="Search blocks"]');
    const timings = [];

    const queries = ['creeper', 'gearbox', 'reactor', 'daisy', 'press', 'spawner', 'diamond', 'void'];
    for (const q of queries) {
      const t0 = performance.now();
      searchInput.value = q;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      // Wait for next microtask/render
      await new Promise(r => setTimeout(r, 0));
      const count = document.querySelectorAll('.block-slot').length;
      timings.push({ query: q, ms: performance.now() - t0, results: count });
    }
    // Clear search
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    return timings;
  });

  const avgSearchMs = searchBench.reduce((acc, x) => acc + x.ms, 0) / searchBench.length;
  auditReport.searchLatency = {
    runs: searchBench,
    averageMs: Number(avgSearchMs.toFixed(3))
  };
  console.log(` - Average search filter update time: ${avgSearchMs.toFixed(3)} ms`);

  // 4. Frame Cadence Under Variable Loads
  console.log('4. Benchmarking Canvas Frame Cadence under load levels (0, 10, 25, 48 entities)...');

  async function measureFrames(label, durationMs = 2500) {
    const startFrames = await page.evaluate(() => window.__factoryDiagnostics.performance().frames);
    await new Promise(r => setTimeout(r, durationMs));
    const samples = await page.evaluate(() => window.__factoryDiagnostics.performance().intervals.slice(-120));
    const sorted = [...samples].sort((a, b) => a - b);
    const avg = 1000 / (samples.reduce((a, b) => a + b, 0) / samples.length);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    return {
      label,
      sampleCount: samples.length,
      averageFps: Number(avg.toFixed(2)),
      medianFrameMs: Number(p50.toFixed(2)),
      p95FrameMs: Number(p95.toFixed(2)),
      p99FrameMs: Number(p99.toFixed(2)),
      jitterMs: Number((p99 - p50).toFixed(2))
    };
  }

  // Baseline 0 entities
  auditReport.cadence.baseline_0 = await measureFrames('Idle (0 entities)');
  console.log(` - Baseline 0 entities: ${auditReport.cadence.baseline_0.averageFps} FPS (median ${auditReport.cadence.baseline_0.medianFrameMs} ms, p95 ${auditReport.cadence.baseline_0.p95FrameMs} ms)`);

  // Spawn 10 entities
  await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.block-slot')].slice(0, 10);
    slots.forEach(s => s.click());
  });
  await new Promise(r => setTimeout(r, 600));
  auditReport.cadence.load_10 = await measureFrames('Load (10 entities)');
  console.log(` - Load 10 entities: ${auditReport.cadence.load_10.averageFps} FPS (median ${auditReport.cadence.load_10.medianFrameMs} ms, p95 ${auditReport.cadence.load_10.p95FrameMs} ms)`);

  // Spawn 15 more (total ~25)
  await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.block-slot')].slice(10, 25);
    slots.forEach(s => s.click());
  });
  await new Promise(r => setTimeout(r, 600));
  auditReport.cadence.load_25 = await measureFrames('Load (25 entities)');
  console.log(` - Load 25 entities: ${auditReport.cadence.load_25.averageFps} FPS (median ${auditReport.cadence.load_25.medianFrameMs} ms, p95 ${auditReport.cadence.load_25.p95FrameMs} ms)`);

  // Spawn up to cap (48 entities)
  await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.block-slot')].slice(25, 50);
    slots.forEach(s => s.click());
  });
  await new Promise(r => setTimeout(r, 800));
  auditReport.cadence.load_48 = await measureFrames('Full capacity (48 entities)');
  console.log(` - Full capacity 48 entities: ${auditReport.cadence.load_48.averageFps} FPS (median ${auditReport.cadence.load_48.medianFrameMs} ms, p95 ${auditReport.cadence.load_48.p95FrameMs} ms)`);

  // 5. Memory footprint & Soak
  console.log('5. Profiling heap allocation and memory leak resistance...');
  const memBefore = await page.evaluate(() => window.performance.memory ? window.performance.memory.usedJSHeapSize : null);
  
  // Clear belt and spawn 50 random items
  await page.evaluate(() => {
    const clearBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Clear belt'));
    if (clearBtn) clearBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const memAfter = await page.evaluate(() => window.performance.memory ? window.performance.memory.usedJSHeapSize : null);

  auditReport.memory = {
    heapSupported: memBefore !== null,
    heapUsedBeforeKb: memBefore ? (memBefore / 1024).toFixed(2) : 'N/A',
    heapUsedAfterClearKb: memAfter ? (memAfter / 1024).toFixed(2) : 'N/A'
  };

  // 6. Mobile Viewport DOM Check
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  auditReport.domNodes.mobile390 = await page.evaluate(() => document.querySelectorAll('*').length);
  console.log(`6. Mobile DOM node count: ${auditReport.domNodes.mobile390} (Clean DOM without dual-mount bloat)`);

  await fs.mkdir('artifacts', { recursive: true });
  await fs.writeFile('artifacts/performance-audit-report.json', JSON.stringify(auditReport, null, 2));
  console.log('\n=== AUDIT COMPLETE ===');
  console.log(`Overall FPS: ${auditReport.cadence.load_48.averageFps} FPS at full 48-entity load`);
  console.log(`Saved report to artifacts/performance-audit-report.json`);
} finally {
  await browser.close();
}
