import puppeteer from 'puppeteer';

async function testPage() {
  const browser = await puppeteer.launch({
    executablePath: '/var/lib/dsh/.cache/puppeteer/chrome-headless-shell/linux-153.0.8010.36/chrome-headless-shell-linux64/chrome-headless-shell',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE_ERROR] ${err.toString()}`));

  console.log('Navigating to http://127.0.0.1:3333...');
  try {
    await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) {
    console.error('Navigation warning:', e.message);
  }

  // Wait 3 seconds to observe
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: 'test_screenshot.png' });
  console.log('Screenshot saved to test_screenshot.png');

  console.log('--- BROWSER CONSOLE LOGS ---');
  logs.forEach(l => console.log(l));
  console.log('---------------------------');

  await browser.close();
}

testPage().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
