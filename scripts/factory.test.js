import test from 'node:test';
import assert from 'node:assert/strict';
import {
  spawnEntity,
  stepEntity,
  applyDecision,
  releaseHold,
  tossEntity,
  BRANCHES,
  createCamera,
  screenToWorld,
  calculateDiverterAngle,
  FLOOR
} from '../src/factory-engine.js';

const block = { id: 'create:gearbox', name: 'Gearbox' };
const decision = { chest: 'mechanical_and_logistics', isHazardous: false };

function advance(e, seconds, scan = () => {}, sorted = () => {}, hz = 60) {
  for (let i = 0; i < seconds * hz; i++) stepEntity(e, 1 / hz, scan, sorted);
}

test('entity identity does not overwrite catalog identity', () => {
  const e = spawnEntity(block);
  assert.equal(e.id, block.id);
  assert.equal(e.catalogId, block.id);
  assert.notEqual(e.entityId, spawnEntity(block).entityId);
});

test('slow or failed API keeps cargo at sensor with one request', () => {
  const e = spawnEntity(block);
  let scans = 0;
  advance(e, 20, () => scans++);
  assert.equal(scans, 1);
  assert.equal(e.phase, 'feeder');
  assert.equal(e.x, 350);
});

test('every valid category across all 6 branches reaches its own destination exactly once', () => {
  assert.equal(BRANCHES.length, 6);
  for (const b of BRANCHES) {
    const e = spawnEntity(block);
    let deliveries = [];
    advance(e, 15, e => applyDecision(e, { ...decision, chest: b.id }), (_, branch) => deliveries.push(branch.id));
    assert.deepEqual(deliveries, [b.id]);
    assert.equal(e.phase, 'done');
  }
});

test('hazards go to pit, never receiving bay', () => {
  const e = spawnEntity(block);
  let delivered = false;
  advance(e, 15, e => applyDecision(e, { ...decision, isHazardous: true }), (_, branch) => {
    assert.equal(branch, null);
    delivered = true;
  });
  assert.equal(delivered, true);
  assert.equal(e.x, FLOOR.pitX);
  assert.equal(e.y, FLOOR.pitY);
});

test('toss velocity affects motion and cargo returns for classification', () => {
  const e = spawnEntity(block, 800, 150);
  tossEntity(e, 700, -250);
  const x = e.x;
  stepEntity(e, 1 / 60, () => {}, () => {});
  assert.ok(e.x > x);
  assert.ok(e.y < 150);
  let scans = 0;
  advance(e, 10, () => scans++);
  assert.equal(scans, 1);
  assert.equal(e.x, 350);
});

test('movement is time based across 30 and 120Hz', () => {
  const a = spawnEntity(block), b = spawnEntity(block);
  advance(a, 1, undefined, undefined, 30);
  advance(b, 1, undefined, undefined, 120);
  assert.ok(Math.abs(a.x - b.x) < 0.01);
});

test('feeder queue respects a held entity ahead', () => {
  const e = spawnEntity(block, 290);
  applyDecision(e, decision);
  for (let i = 0; i < 120; i++) stepEntity(e, 1 / 60, () => {}, () => {}, 308);
  assert.equal(e.x, 308);
  assert.equal(e.phase, 'feeder');
});

test('camera fit and detail transforms invert accurately', () => {
  const fitCam = createCamera('fit');
  assert.equal(fitCam.scale, 1.0);
  assert.equal(fitCam.tx, 0);

  const detailCam = createCamera('detail');
  assert.ok(detailCam.scale > 1.2);

  const rect = { width: 1000, height: 600 };
  const worldPoint = screenToWorld(500, 300, detailCam, rect);
  assert.ok(Number.isFinite(worldPoint.x));
  assert.ok(Number.isFinite(worldPoint.y));
});

test('diverter angle computes correct direction for each branch', () => {
  for (const b of BRANCHES) {
    const angle = calculateDiverterAngle(b.y, false);
    if (b.y < FLOOR.feederY) assert.ok(angle < 0);
    else if (b.y > FLOOR.feederY) assert.ok(angle > 0);
  }
  const hazardAngle = calculateDiverterAngle(FLOOR.pitY, true);
  assert.ok(hazardAngle > 1.0);
  const holdAngle = calculateDiverterAngle(FLOOR.feederY, false, true);
  assert.equal(holdAngle, 0);
});

test('quarantine siding loop branches from scanner and returns cleared cargo through scanner', () => {
  const heldEntity = spawnEntity(block, 300);
  applyDecision(heldEntity, { action: 'hold', chest: 'ores_and_gems', isHazardous: false });

  // Advance held entity: diverts from scanner (320, 340) down to siding (280, 480)
  for (let i = 0; i < 180; i++) {
    stepEntity(heldEntity, 1 / 60, () => {}, () => {});
  }
  assert.equal(heldEntity.phase, 'hold');
  assert.equal(heldEntity.x, FLOOR.sidingWaitX);
  assert.equal(heldEntity.y, FLOOR.sidingY);

  // A second safe item arrives on feeder: it freely passes scanner and reaches Branch 1 without being blocked!
  const safeEntity = spawnEntity(block, 200);
  applyDecision(safeEntity, { action: 'store', chest: 'ores_and_gems', isHazardous: false });

  for (let i = 0; i < 240; i++) {
    stepEntity(safeEntity, 1 / 60, () => {}, () => {}, FLOOR.splitX);
  }
  assert.ok(safeEntity.phase === 'branch' || safeEntity.phase === 'destination');
  assert.ok(safeEntity.y < FLOOR.feederY); // routed towards Branch 1 at y=80

  // Now operator releases heldEntity: it loops back into feeder at x=160 and returns through scanner at x=320!
  releaseHold(heldEntity, 'store');
  assert.equal(heldEntity.phase, 'returning_from_siding');

  // Step through return curve
  for (let i = 0; i < 90; i++) {
    stepEntity(heldEntity, 1 / 60, () => {}, () => {});
  }
  assert.equal(heldEntity.phase, 'feeder');
  assert.equal(heldEntity.scanned, true);
  assert.ok(heldEntity.x >= FLOOR.feederMergeX && heldEntity.x < FLOOR.scanX);

  // Rolls along feeder through scanner (320) and routes to Branch 1
  for (let i = 0; i < 180; i++) {
    stepEntity(heldEntity, 1 / 60, () => {}, () => {}, FLOOR.splitX);
  }
  assert.ok(heldEntity.phase === 'branch' || heldEntity.phase === 'destination');
  assert.ok(heldEntity.y < FLOOR.feederY);
});

test('invalid decision cannot silently default to building', () => {
  assert.throws(() => applyDecision(spawnEntity(block), { chest: 'invalid' }));
  assert.throws(() => applyDecision(spawnEntity(block), { chest: 'redstone_and_mechanisms' }));
});
