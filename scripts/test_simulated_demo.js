import assert from 'node:assert/strict';
import { simulateJevClassification, createClassifier, validateInput, TAXONOMY } from '../server/jev.js';

console.log('=== TESTING SIMULATED ZERO-SPEND DEMO CLASSIFIER ===');

// 1. Test All 6 Categories Routing via Catalog Ground Truth
const categorySamples = {
  ores_and_gems: 'Diamond Ore',
  building_blocks: 'Oak Door',
  mechanical_and_logistics: 'Mechanical Press',
  power_and_digital: 'ME Controller',
  magic_and_ritual: 'Pure Daisy',
  mob_drops_and_food: 'Diamond Sword'
};

for (const [expectedCat, itemName] of Object.entries(categorySamples)) {
  const res = await simulateJevClassification(validateInput({ name: itemName, mod: 'Vanilla' }));
  assert.equal(res.chest, expectedCat, `${itemName} must route to ${expectedCat}`);
  assert.equal(res.source, 'live');
  assert.equal(res.isHazardous, false);
  assert.equal(res.action, 'store');
  assert.ok(res.usage.input_tokens > 500, 'Must have realistic input tokens');
  assert.ok(res.usage.output_tokens > 50, 'Must have realistic output tokens');
  assert.ok(res.latencyMs > 0, 'Must have positive latency');
  console.log(`PASS: ${itemName} -> ${res.chest} (tokens: ${res.usage.input_tokens}, latency: ${res.latencyMs}ms)`);
}

// 2. Test Hazard Detection (TNT -> shunt)
const tnt = await simulateJevClassification(validateInput({ name: 'TNT Explosive', mod: 'Vanilla' }));
assert.equal(tnt.action, 'shunt', 'TNT must shunt');
assert.equal(tnt.isHazardous, true, 'TNT must be hazardous');
assert.ok(tnt.hazardousScore >= 0.70, 'Hazard score >= 0.70');
console.log(`PASS: TNT Explosive -> ${tnt.action} (hazardousScore: ${tnt.hazardousScore})`);

// 3. Test Borderline Hazard (Respawn Anchor -> hold)
const anchor = await simulateJevClassification(validateInput({ name: 'Respawn Anchor', mod: 'Vanilla' }));
assert.equal(anchor.action, 'hold', 'Respawn Anchor must hold');
assert.equal(anchor.isHazardous, false, 'Respawn Anchor is borderline, not definite hazard');
assert.ok(anchor.hazardousScore > 0.30 && anchor.hazardousScore < 0.70, 'Hazard score in borderline range');
console.log(`PASS: Respawn Anchor -> ${anchor.action} (hazardousScore: ${anchor.hazardousScore})`);

// 4. Test Custom Anvil Submissions
const customFood = await simulateJevClassification(validateInput({
  name: 'Raspberry Jam 987',
  description: 'Sweet homemade berry jam in a glass jar. Edible preserved fruit, not a machine or dangerous chemical.',
  mod: 'Custom'
}));
assert.equal(customFood.chest, 'mob_drops_and_food', 'Raspberry Jam must route to mob_drops_and_food');
assert.equal(customFood.isHazardous, false);
console.log(`PASS: Custom Anvil "${customFood.chest}" -> ${customFood.action}`);

const customHazard = await simulateJevClassification(validateInput({
  name: 'Nitroglycerin Bomb',
  description: 'Highly volatile explosive fluid',
  mod: 'Custom'
}));
assert.equal(customHazard.action, 'shunt', 'Nitroglycerin must shunt');
assert.equal(customHazard.isHazardous, true);
console.log(`PASS: Custom Hazard "${customHazard.action}" -> isHazardous: ${customHazard.isHazardous}`);

// 5. Test Triage Mode Early Exit on Hazard
const triageTnt = await simulateJevClassification(validateInput({
  name: 'TNT Explosive',
  mod: 'Vanilla',
  mode: 'triage'
}));
assert.equal(triageTnt.action, 'shunt');
assert.equal(triageTnt.chest, null, 'Stage 1 early exit does not run router');
assert.equal(triageTnt.stages[0].stage, 'gatekeeper');
assert.equal(triageTnt.stages[0].status, 'completed');
assert.equal(triageTnt.stages[1].status, 'skipped');
console.log('PASS: Triage Mode Gatekeeper early exit on hazard!');

// 6. Test Classifier Cache & Status in Simulated Demo Mode
const classifier = createClassifier({ simulated: true });
const statusBefore = classifier.status();
assert.equal(statusBefore.mode, 'demo-simulated');

const c1 = await classifier.classify(validateInput({ name: 'Iron Ingot', mod: 'Vanilla' }));
assert.equal(c1.source, 'live');
const statusMid = classifier.status();
assert.equal(statusMid.liveCalls, 1);

const c2 = await classifier.classify(validateInput({ name: 'Iron Ingot', mod: 'Vanilla' }));
assert.equal(c2.source, 'cache');
assert.equal(c2.chargeNanoUsd, '0');
assert.equal(c2.costUsd, '0.000000000');
const statusAfter = classifier.status();
assert.equal(statusAfter.liveCalls, 1, 'Cache hit must not increment liveCalls');
console.log('PASS: Classifier in simulated demo mode handles live and cache calls cleanly!');

console.log('ALL SIMULATED DEMO TESTS PASSED 100%!');
