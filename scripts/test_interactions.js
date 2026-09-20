import puppeteer from 'puppeteer';

async function testInteractions() {
  const browser = await puppeteer.launch({
    executablePath: '/var/lib/dsh/.cache/puppeteer/chrome-headless-shell/linux-153.0.8010.36/chrome-headless-shell-linux64/chrome-headless-shell',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1100 });

  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));

  await page.goto('http://127.0.0.1:3333', { waitUntil: 'networkidle0' });

  console.log('Page loaded. Looking for inventory buttons...');
  // Find all block slot buttons
  const slots = await page.$$('.mc-slot');
  console.log(`Found ${slots.length} item slots in inventory`);

  if (slots.length > 0) {
    console.log('Clicking on 3 different block slots...');
    await slots[0].click();
    await new Promise(r => setTimeout(r, 300));
    await slots[5].click();
    await new Promise(r => setTimeout(r, 300));
    await slots[10].click();
  }

  // Click on Cascade button
  const buttons = await page.$$('button');
  for (let b of buttons) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('Каскад')) {
      console.log('Clicking "Каскад" button...');
      await b.click();
      break;
    }
  }

  // Wait 1.5 seconds for blocks to travel and be scanned
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: 'test_interaction.png' });
  console.log('Saved test_interaction.png');

  await browser.close();
}

testInteractions().catch(console.error);
