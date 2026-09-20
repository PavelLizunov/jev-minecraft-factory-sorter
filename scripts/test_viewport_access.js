import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const base = process.env.TEST_URL || 'http://127.0.0.1:3333';
try {
  for (const [width, height] of [[1920,1080],[1536,864],[1440,900],[1366,768],[1280,720],[390,844],[360,740]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto(`${base}/?diagnostics=1`, { waitUntil: 'networkidle0' });
    const geometry = await page.evaluate(() => {
      const inspect = selector => {
        const el = document.querySelector(selector), r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return { top:r.top, bottom:r.bottom, height:r.height, accessible: !!hit && (el===hit || el.contains(hit)) };
      };
      return { width:innerWidth, height:innerHeight, docW:document.documentElement.scrollWidth,
        docH:document.documentElement.scrollHeight, grid:inspect('.block-grid'), hotbar:inspect('.hotbar-row'),
        inventory:inspect('.inventory-panel'), floor:inspect('.floor-panel') };
    });
    assert.ok(geometry.docH<=height && geometry.docW<=width, JSON.stringify(geometry));
    for (const key of ['grid','hotbar','inventory','floor']) {
      assert.ok(geometry[key].top>=0 && geometry[key].bottom<=height && geometry[key].accessible, `${key}: ${JSON.stringify(geometry)}`);
    }
    assert.ok(geometry.grid.height>=48, 'At least one complete item row must remain visible');
    const grid = await page.$('.block-grid');
    const box = await grid.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.wheel({deltaY:400});
    await page.waitForFunction(()=>document.querySelector('.block-grid').scrollTop>0);
    assert.equal(await page.evaluate(()=>scrollY),0);
    await page.click('input[aria-label="Search blocks"]');
    await page.type('input[aria-label="Search blocks"]','zzzz-no-such-item');
    const reset = await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Reset filters'));
    await reset.asElement().click();
    await page.waitForFunction(()=>document.querySelector('input[aria-label="Search blocks"]').value==='');
    console.log(`PASS ${width}x${height}: visible panels, real Reset click, inventory wheel; grid ${geometry.grid.height.toFixed(1)}px`);
    if (width<=768) {
      for (const label of ['Telemetry','Bays']) {
        const tab = await page.evaluateHandle(t=>[...document.querySelectorAll('.mobile-tab-bar button')].find(e=>e.textContent.includes(t)),label);
        await tab.asElement().click();
        assert.equal(await page.evaluate(()=>document.querySelectorAll('canvas').length),1);
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
