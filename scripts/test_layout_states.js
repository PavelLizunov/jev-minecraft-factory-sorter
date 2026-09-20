import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({headless:'shell',args:['--no-sandbox']});
const base=process.env.TEST_URL || 'http://127.0.0.1:3333';
try {
 for (const [width,height] of [[1366,768],[390,844],[360,740]]) {
  const page=await browser.newPage(); await page.setViewport({width,height});
  await page.setRequestInterception(true);
  page.on('request',r=>r.url().endsWith('/api/classify') ? r.respond({status:200,contentType:'application/json',body:JSON.stringify({source:'live',chest:'ores_and_gems',action:'hold',isHazardous:false,actionReason:'Test fixture: operator review required.',confidence:0.5,hazardousScore:0.5,usage:{input_tokens:200,output_tokens:20},chargeNanoUsd:'8400',costUsd:'0.000008400',latencyMs:123,probabilities:{chest:{ores_and_gems:0.3,building_blocks:0.2,mechanical_and_logistics:0.1,power_and_digital:0.1,magic_and_ritual:0.1,mob_drops_and_food:0.2}},stages:[{stage:'test_fixture',status:'completed',costUsd:'0.000008400'}]})}) : r.continue());
  await page.goto(`${base}/?diagnostics=1`,{waitUntil:'networkidle0'});
  await page.click('[data-block-id="diamond_ore"]');
  await page.waitForFunction(()=>window.__factoryDiagnostics.snapshot().some(e=>e.decision?.action==='hold'));
  if(width<=768) {const tab=await page.evaluateHandle(()=>[...document.querySelectorAll('.mobile-tab-bar button')].find(e=>e.textContent.includes('Telemetry')));await tab.asElement().click();}
  await page.waitForSelector('.inspection-hold-banner');
  const scrollSelector=width<=768?'.inspection-panel':'.inspection-scroll-body';
  const scroll=await page.$(scrollSelector), rect=await scroll.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height-10);
  await page.mouse.wheel({deltaY:900});
  await page.waitForFunction(s=>document.querySelector(s).scrollTop>0,{},scrollSelector);
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.$eval(scrollSelector,e=>e.scrollTop=0);
  const release=await page.$('.inspection-hold-banner button');
  const hit=await release.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
  assert.ok(hit,'Hold control must be reachable without overlay');
  await release.click();
  console.log(`PASS ${width}x${height}: populated dock scroll and real Hold release`);
  await page.close();
 }
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});await page.goto(`${base}/?diagnostics=1`,{waitUntil:'networkidle0'});
 const welcomeClose = await page.$('.welcome-close');
 if (welcomeClose) await welcomeClose.click();
 const cam=()=>page.evaluate(()=>window.__factoryDiagnostics.performance().camera);
 const c=await page.$('canvas'),r=await c.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);
 let before=await cam();await page.mouse.wheel({deltaY:-120});await page.evaluate(()=>new Promise(requestAnimationFrame));assert.deepEqual(await cam(),before);
 await page.keyboard.down('Control');await page.mouse.wheel({deltaY:-120});await page.keyboard.up('Control');
 await page.waitForFunction(()=>window.__factoryDiagnostics.performance().camera.scale>1);
 before=await cam();await page.mouse.wheel({deltaY:120});await page.evaluate(()=>new Promise(requestAnimationFrame));assert.deepEqual(await cam(),before);
 await page.click('button[title*="Overview of all"]');await page.waitForFunction(()=>window.__factoryDiagnostics.performance().camera.scale===1);
 console.log('PASS plain wheel preserves Fit/Detail; modified wheel zooms; Fit resets');
} finally {await browser.close();}
