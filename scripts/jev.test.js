import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecision, validateInput, money, createClassifier, evaluatePolicy, getProgramCriteria, DEFAULT_POLICY } from '../server/jev.js';
const fixture = { model: 'test-model', answers: { chest: { choice: 'power_and_digital', confidence: 0.8 }, is_hazardous: { noul: 0.1 }, rarity: { score: 1 } }, usage: { input_tokens: 469, output_tokens: 88 } };
test('exact token billing, roundtrip preserved', () => {
  const r = parseDecision(fixture, 173.2567);
  assert.equal(r.costUsd, '0.000019698');
  assert.equal(r.chargeNanoUsd, '19698');
  assert.equal(r.latencyMs, 173.2567);
  assert.deepEqual(r.usage, fixture.usage);
  assert.equal(money(1000000042n), '1.000000042');
});
test('zero usage is zero, not a fabricated default', () => {
  const r = parseDecision({ ...fixture, usage: { input_tokens: 0, output_tokens: 0 } }, 0);
  assert.equal(r.costUsd, '0.000000000');
  assert.equal(r.usage.input_tokens, 0);
});
test('missing/invalid usage is explicitly unknown', () => {
  for (const usage of [undefined, { input_tokens: -1 }, { input_tokens: '469' }]) {
    const r = parseDecision({ ...fixture, usage }, 7);
    assert.equal(r.costUsd, null);
    assert.equal(r.chargeNanoUsd, null);
  }
});
test('typed routing and hazard answers are mandatory across all 6 categories', () => {
  for (const choice of ['ores_and_gems', 'building_blocks', 'mechanical_and_logistics', 'power_and_digital', 'magic_and_ritual', 'mob_drops_and_food']) {
    const r = parseDecision({ ...fixture, answers: { chest: { choice, confidence: 1 }, is_hazardous: { noul: 0 }, rarity: { score: 1 } } }, 5);
    assert.equal(r.chest, choice);
    assert.equal(r.taxonomyVersion, 2);
  }
  for (const answers of [{}, { chest: { choice: 'invented' }, is_hazardous: { noul: 0 } }, { chest: { choice: 'ancient_unknown' } }]) {
    assert.throws(() => parseDecision({ ...fixture, answers }, 5));
  }
});
test('input validation rejects malformed and oversized values', () => {
  for (const body of [null, [], {}, { name: 4 }, { name: ' ' }, { name: 'x'.repeat(161) }, { name: 'x', description: {} }, { name: 'x', description: 'a'.repeat(2001) }, { name: 'x', forceFresh: 'yes' }]) assert.throws(() => validateInput(body));
  assert.equal(validateInput({ name: ' ME Drive ' }).name, 'ME Drive');
});
test('policy evaluation correctly flags shunt, hold, and store actions', () => {
  // 1. Definite hazard -> shunt
  const shunt = evaluatePolicy({ is_hazardous: { noul: 0.85 }, chest: { choice: 'building_blocks', confidence: 1 }, rarity: { score: 1 } }, DEFAULT_POLICY);
  assert.equal(shunt.action, 'shunt');
  assert.equal(shunt.isHazardous, true);

  // 2. Borderline hazard -> hold
  const holdHazard = evaluatePolicy({ is_hazardous: { noul: 0.50 }, chest: { choice: 'building_blocks', confidence: 1 }, rarity: { score: 1 } }, DEFAULT_POLICY);
  assert.equal(holdHazard.action, 'hold');

  // 3. Low routing confidence -> hold
  const holdConf = evaluatePolicy({ is_hazardous: { noul: 0.1 }, chest: { choice: 'building_blocks', confidence: 0.55 }, rarity: { score: 1 } }, DEFAULT_POLICY);
  assert.equal(holdConf.action, 'hold');

  // 4. Safe and confident -> store
  const store = evaluatePolicy({ is_hazardous: { noul: 0.05 }, chest: { choice: 'ores_and_gems', confidence: 0.95 }, rarity: { score: 2 } }, DEFAULT_POLICY);
  assert.equal(store.action, 'store');
  assert.equal(store.priority, 'high');
});

test('getProgramCriteria loads specialized criteria for storage, expedition, and recycling', () => {
  const storage = getProgramCriteria('storage');
  assert.equal(storage.program.id, 'storage');
  assert.ok(storage.criteria.ores_and_gems);

  const expedition = getProgramCriteria('expedition');
  assert.equal(expedition.program.id, 'expedition');
  assert.ok(expedition.criteria.ores_and_gems.includes('expedition currency'));

  const recycling = getProgramCriteria('recycling');
  assert.equal(recycling.program.id, 'recycling');
  assert.ok(recycling.criteria.ores_and_gems.includes('Smeltable high-purity ores'));
});

test('cached decisions never duplicate charges or claim a new roundtrip', async () => {
  let calls = 0;
  const classifier = createClassifier({ apiKey: 'test', call: async () => { calls++; return parseDecision(fixture, 12); } });
  const input = validateInput({ name: 'Drive' });
  const live = await classifier.classify(input);
  const cache = await classifier.classify(input);
  assert.equal(live.source, 'live');
  assert.equal(cache.source, 'cache');
  assert.equal(cache.costUsd, '0.000000000');
  assert.equal(cache.latencyMs, null);
  assert.equal(cache.usage, null);
  assert.equal(calls, 1);
  assert.equal(classifier.status().spendUsd, '0.000019698');
  await classifier.classify({ ...input, forceFresh: true });
  assert.equal(classifier.status().spendUsd, '0.000039396');
});
test('missing credentials and upstream failure never become fallback success', async () => {
  const input = validateInput({ name: 'TNT' });
  await assert.rejects(createClassifier().classify(input), { status: 503 });
  const c = createClassifier({ apiKey: 'test', call: async () => { throw new Error('offline'); } });
  await assert.rejects(c.classify(input), /offline/);
  assert.equal(c.status().liveCalls, 0);
  assert.equal(c.status().active, 0);
});
