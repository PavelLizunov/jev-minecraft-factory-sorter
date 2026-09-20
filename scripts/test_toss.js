import puppeteer from 'puppeteer';

async function testToss() {
  const browser = await puppeteer.launch({
    executablePath: '/var/lib/dsh/.cache/puppeteer/chrome-headless-shell/linux-153.0.8010.36/chrome-headless-shell-linux64/chrome-headless-shell',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1100 });

  await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Get canvas bounding box
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  console.log('Canvas bounding box:', box);

  // Drag a block from X=100 to X=400 with upward velocity
  console.log('Simulating mouse grab and toss...');
  await page.mouse.move(box.x + 80, box.y + 190);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 100));

  await page.mouse.move(box.x + 200, box.y + 120, { steps: 5 });
  await new Promise(r => setTimeout(r, 50));
  await page.mouse.move(box.x + 350, box.y + 80, { steps: 5 });
  await page.mouse.up();

  console.log('Tossed! Waiting 400ms to capture mid-air flight...');
  await new Promise(r => setTimeout(r, 400));

  await page.screenshot({ path: 'test_toss_flight.png' });
  console.log('Saved test_toss_flight.png');

  await browser.close();
}

testToss().catch(console.error);
