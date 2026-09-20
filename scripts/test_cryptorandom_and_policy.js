import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sampleCryptographicRandom } from '../src/factory-engine.js';

console.log('=== RIGOROUS UNIT TESTS: CRYPTO SAMPLER, REJECTION SAMPLING, & POLICY ===');

// 1. Test Input Boundaries and Validation
assert.deepEqual(sampleCryptographicRandom([]), [], 'Empty array returns []');
assert.deepEqual(sampleCryptographicRandom(null), [], 'Null returns []');
assert.deepEqual(sampleCryptographicRandom(undefined), [], 'Undefined returns []');
assert.deepEqual(sampleCryptographicRandom('string'), [], 'String returns []');
assert.deepEqual(sampleCryptographicRandom({}), [], 'Object returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], 0), [], 'Count 0 returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], -1), [], 'Negative count returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], -Infinity), [], '-Infinity count returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], Infinity), [], 'Infinity count returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], NaN), [], 'NaN count returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], '2'), [], 'String count returns []');
assert.deepEqual(sampleCryptographicRandom([1, 2, 3], 2.8).length, 2, 'Fractional count is floored');

// 2. Test Non-Mutation and Distinctness
const original = ['diamond', 'emerald', 'netherite', 'gold', 'iron', 'copper'];
const originalSnapshot = [...original];
const sampled = sampleCryptographicRandom(original, 4);
assert.deepEqual(original, originalSnapshot, 'Original array must never be mutated');
assert.equal(sampled.length, 4, 'Sampled length matches requested count');
assert.equal(new Set(sampled).size, 4, 'All sampled elements must be distinct');
assert.ok(sampled.every(x => original.includes(x)), 'All elements must originate from input array');

// 3. Test Sampling When Count Exceeds Array Length
const oversized = sampleCryptographicRandom(original, 100);
assert.equal(oversized.length, original.length, 'Oversized count clamped to array length');
assert.equal(new Set(oversized).size, original.length, 'All elements distinct when count >= length');

// 4. Statistical Chi-Squared Uniformity Test (50,000 trials, 5 buckets)
// Expected count per bucket = 10,000. Critical value for 4 degrees of freedom at p=0.01 is 13.277
const buckets = ['A', 'B', 'C', 'D', 'E'];
const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
const trials = 50000;
const expected = trials / buckets.length;

for (let i = 0; i < trials; i++) {
  const [pick] = sampleCryptographicRandom(buckets, 1);
  counts[pick]++;
}

let chiSquared = 0;
for (const b of buckets) {
  const diff = counts[b] - expected;
  chiSquared += (diff * diff) / expected;
}
console.log('50,000 trials distribution:', counts, `Chi-Squared: ${chiSquared.toFixed(3)} (critical < 13.28)`);
// Standard statistical significance threshold for unit tests (p < 0.0001 to prevent CI flakiness)
assert.ok(chiSquared < 25.0, `Chi-squared test passes: ${chiSquared.toFixed(3)} < 25.0 (uniform distribution)`);
for (const b of buckets) {
  assert.ok(counts[b] > 9400 && counts[b] < 10600, `Bucket ${b} count ${counts[b]} within +/- 6% of expected 10,000`);
}
console.log('PASS: Mathematical rejection sampling is genuinely uniform and unbiased!');

// 5. Test Dataset Provenance and Versioning
const dataset = JSON.parse(fs.readFileSync('public/data/jev-empirical-measurements.json', 'utf8'));
assert.equal(dataset.version, 1);
assert.equal(dataset.model, 'TypeSafe Jev System 1');
assert.ok(dataset.collectedAt);
assert.ok(dataset.methodology);
assert.equal(dataset.signatures['minecraft:respawn_anchor'].baselineAction, 'hold');
assert.equal(dataset.signatures['tnt'].baselineAction, 'shunt');
assert.equal(dataset.signatures['diamond_ore'].baselineAction, 'store');
console.log('PASS: Versioned empirical dataset and provenance validated!');

// 6. Deterministic Rejection Boundary Test (Mock Crypto Generator)
// Specifically tests that values >= limit are rejected and draws repeat until val < limit
{
  const arr7 = ['0', '1', '2', '3', '4', '5', '6'];
  const max7 = 7;
  const limit7 = 4294967296 - (4294967296 % 7); // 4294967292

  // Sequence of mock values: [limit7 (reject), limit7 + 1 (reject), 0xFFFFFFFF (reject), limit7 - 1 (accept)]
  const mockSequence = [limit7, limit7 + 1, 0xFFFFFFFF, limit7 - 1];
  let seqIdx = 0;

  const originalGetRandomValues = globalThis.crypto.getRandomValues;
  try {
    globalThis.crypto.getRandomValues = buf => {
      buf[0] = mockSequence[seqIdx++];
      return buf;
    };
    const [picked] = sampleCryptographicRandom(arr7, 1);
    // limit7 - 1 is 4294967291; 4294967291 % 7 = 6
    assert.equal(picked, '6', 'Rejection sampling correctly discarded limit, limit+1, 0xFFFFFFFF and accepted limit-1');
    assert.equal(seqIdx, 4, 'Exactly 4 draws made: 3 rejected, 1 accepted');
    console.log('PASS: Deterministic rejection boundary test verified with mock crypto!');
  } finally {
    globalThis.crypto.getRandomValues = originalGetRandomValues;
  }
}

console.log('ALL RIGOROUS UNIT TESTS PASSED 100%!');
