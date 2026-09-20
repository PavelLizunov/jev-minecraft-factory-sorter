import taxonomy from '../shared/routing-taxonomy.json' with { type: 'json' };

export const BRANCHES = taxonomy.branches.map(b => ({
  id: b.id,
  index: b.index,
  name: b.name,
  shortName: b.shortName,
  color: b.color,
  borderColor: b.borderColor,
  y: b.targetY,
}));

export const EMERGENCY_SHUNT = taxonomy.emergencyShunt;

// Mathematically exact, unbiased cryptographically secure uniform random sampler
// Uses rejection sampling against the uniform 32-bit unsigned ceiling: 2^32 - (2^32 % max)
export function sampleCryptographicRandom(array, count = 1) {
  if (!Array.isArray(array) || array.length === 0) return [];
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return [];
  const safeCount = Math.min(array.length, Math.floor(count));
  if (safeCount === 0) return [];

  const cryptoObj = typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : null;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Cryptographic random generation is not supported in this environment (crypto.getRandomValues unavailable)');
  }

  // Unbiased uniform integer in [0, max - 1] with zero modulo bias via rejection sampling
  const getRandomInt = max => {
    if (max <= 1) return 0;
    const maxUint32 = 0x100000000;
    const limit = maxUint32 - (maxUint32 % max);
    const buf = new Uint32Array(1);
    let val;
    do {
      cryptoObj.getRandomValues(buf);
      val = buf[0];
    } while (val >= limit);
    return val % max;
  };

  if (safeCount === 1) {
    return [array[getRandomInt(array.length)]];
  }

  // Non-mutating Fisher-Yates sample without replacement
  const pool = [...array];
  for (let i = 0; i < safeCount; i++) {
    const remaining = pool.length - i;
    const pickedIdx = i + getRandomInt(remaining);
    const tmp = pool[i];
    pool[i] = pool[pickedIdx];
    pool[pickedIdx] = tmp;
  }
  return pool.slice(0, safeCount);
}

export const FLOOR = {
  width: 1200,
  height: 720,
  scanX: 320,
  splitX: 430,
  feederY: 340,
  destX: 1060,
  pitX: taxonomy.emergencyShunt.targetX || 590,
  pitY: taxonomy.emergencyShunt.targetY || 670,
  // Quarantine Re-circulation Loop
  sidingY: 480,
  sidingStartX: 360,
  sidingWaitX: 280,
  sidingReturnX: 220,
  feederMergeX: 160,
  beltWidth: 72,
  cargoSize: 48,
};

let serial = 0;

export function evalDiversionCurve(t) {
  t = Math.max(0, Math.min(1, t));
  const u = 1 - t;
  const x = u * u * u * 320 + 3 * u * u * t * 390 + 3 * u * t * t * 410 + t * t * t * 360;
  const y = u * u * u * 340 + 3 * u * u * t * 340 + 3 * u * t * t * 480 + t * t * t * 480;
  return { x, y };
}

export function evalReturnCurve(t) {
  t = Math.max(0, Math.min(1, t));
  const u = 1 - t;
  const x = u * u * u * 220 + 3 * u * u * t * 140 + 3 * u * t * t * 110 + t * t * t * 160;
  const y = u * u * u * 480 + 3 * u * u * t * 480 + 3 * u * t * t * 340 + t * t * t * 340;
  return { x, y };
}

export function spawnEntity(block, x = 65, y = 340) {
  return {
    ...block,
    catalogId: block.id,
    entityId: `cargo-${++serial}`,
    x,
    y,
    vx: 0,
    vy: 0,
    phase: 'feeder',
    scanned: false,
    decision: null,
    error: null,
    progress: 0,
    loopProgress: 0,
  };
}

export function applyDecision(entity, decision) {
  const isHazard = decision.isHazardous === true || decision.action === 'shunt';
  if (!isHazard && !BRANCHES.some(b => b.id === decision.chest)) {
    throw new Error('Invalid routing decision');
  }
  if (typeof decision.isHazardous !== 'boolean') {
    throw new Error('Invalid routing decision');
  }
  entity.decision = decision;
  entity.error = null;
  // If flagged for hold, divert directly from the scanner into the quarantine siding loop
  if (decision.action === 'hold' && !decision.cleared && entity.phase === 'feeder') {
    entity.phase = 'to_siding';
    entity.loopProgress = 0;
  }
}

export function releaseHold(entity, overrideAction = 'store') {
  if (!entity || (entity.phase !== 'hold' && entity.phase !== 'to_siding')) return;
  const isHazard = overrideAction === 'shunt';
  entity.decision = { ...entity.decision, action: overrideAction, isHazardous: isHazard, cleared: true };
  entity.releaseStartX = entity.x;
  entity.phase = 'returning_from_siding';
  entity.loopProgress = 0;
}

export function tossEntity(entity, vx, vy) {
  entity.phase = 'flight';
  entity.vx = Math.max(-1000, Math.min(1000, vx));
  entity.vy = Math.max(-1000, Math.min(1000, vy));
  entity.flightTime = 0;
}

export function stepEntity(e, dt, scan, sorted, feederLimit = 430, sidingLimit = 280) {
  dt = Math.min(Math.max(dt, 0), 0.05);
  if (e.phase === 'dragging' || e.phase === 'done') return;

  if (e.phase === 'hold') {
    // Parked in quarantine siding at y = 480 awaiting operator selection
    e.y = FLOOR.sidingY;
    return;
  }

  if (e.phase === 'to_siding') {
    e.loopProgress = Math.min(1, (e.loopProgress || 0) + dt * 0.7);
    const p = e.loopProgress;
    if (p < 0.65) {
      const t = p / 0.65;
      const pt = evalDiversionCurve(t);
      e.x = pt.x;
      e.y = pt.y;
    } else {
      const t = (p - 0.65) / 0.35;
      e.y = FLOOR.sidingY;
      const targetX = Math.max(sidingLimit, FLOOR.sidingWaitX);
      e.x = FLOOR.sidingStartX - t * (FLOOR.sidingStartX - targetX);
    }
    if (e.loopProgress >= 1) {
      e.phase = 'hold';
      e.x = Math.max(sidingLimit, FLOOR.sidingWaitX);
      e.y = FLOOR.sidingY;
    }
    return;
  }

  if (e.phase === 'returning_from_siding') {
    e.loopProgress = Math.min(1, (e.loopProgress || 0) + dt * 0.75);
    const p = e.loopProgress;
    const startX = e.releaseStartX || FLOOR.sidingWaitX;
    if (p < 0.35) {
      const t = p / 0.35;
      e.y = FLOOR.sidingY;
      e.x = startX - t * (startX - FLOOR.sidingReturnX);
    } else {
      const t = (p - 0.35) / 0.65;
      const pt = evalReturnCurve(t);
      e.x = pt.x;
      e.y = pt.y;
    }
    if (e.loopProgress >= 1) {
      // Re-enter main feeder before the scanner so it returns through the scanner!
      e.phase = 'feeder';
      e.x = FLOOR.feederMergeX;
      e.y = FLOOR.feederY;
      e.scanned = true; // Already verified by operator; do not trigger new API request
    }
    return;
  }

  if (e.phase === 'flight') {
    e.flightTime += dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx *= Math.exp(-3 * dt);
    e.vy *= Math.exp(-3 * dt);
    if (e.x < 30 || e.x > 1170) {
      e.x = Math.max(30, Math.min(1170, e.x));
      e.vx *= -0.4;
    }
    if (e.y < 35 || e.y > 685) {
      e.y = Math.max(35, Math.min(685, e.y));
      e.vy *= -0.4;
    }
    if (e.flightTime > 0.65) e.phase = 'return';
    return;
  }

  if (e.phase === 'return') {
    const dx = 205 - e.x, dy = FLOOR.feederY - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      e.x = 205;
      e.y = FLOOR.feederY;
      e.phase = 'feeder';
      e.scanned = false;
      e.decision = null;
      e.error = null;
    } else {
      e.x += dx / d * Math.min(d, 420 * dt);
      e.y += dy / d * Math.min(d, 420 * dt);
    }
    return;
  }

  if (e.phase === 'feeder') {
    e.y += (FLOOR.feederY - e.y) * (1 - Math.exp(-8 * dt));
    e.x = Math.min(feederLimit, FLOOR.splitX, e.x + 160 * dt);
    if (!e.scanned && e.x >= FLOOR.scanX) {
      e.scanned = true;
      scan(e);
    }
    if (!e.decision) {
      e.x = Math.min(e.x, 350);
      return;
    }
    // If flagged for hold, divert directly into the quarantine loop from the scanner
    if (e.decision.action === 'hold' && !e.decision.cleared) {
      e.phase = 'to_siding';
      e.loopProgress = 0;
      return;
    }
    // Cleared item or normal item passes straight through scanner to splitX (430) and branches!
    if (e.x >= FLOOR.splitX && e.decision) {
      if (e.decision.isHazardous || e.decision.action === 'shunt') {
        e.phase = 'shunt';
        e.progress = 0;
      } else {
        e.phase = 'branch';
        e.progress = 0;
      }
    }
    return;
  }

  if (e.phase === 'branch' || e.phase === 'shunt') {
    e.progress = Math.min(1, e.progress + dt * 0.85);
    const t = e.progress;
    const eased = t * t * (3 - 2 * t);
    const hazard = e.phase === 'shunt';
    const targetY = hazard ? FLOOR.pitY : (BRANCHES.find(b => b.id === e.decision?.chest)?.y ?? FLOOR.feederY);
    e.x = FLOOR.splitX + ((hazard ? FLOOR.pitX : 640) - FLOOR.splitX) * t;
    e.y = FLOOR.feederY + (targetY - FLOOR.feederY) * eased;
    if (t === 1) {
      if (hazard) {
        e.phase = 'done';
        sorted(e, null);
      } else {
        e.phase = 'destination';
      }
    }
    return;
  }

  if (e.phase === 'destination') {
    e.x += 220 * dt;
    if (e.x >= FLOOR.destX) {
      e.phase = 'done';
      sorted(e, BRANCHES.find(b => b.id === e.decision.chest));
    }
  }
}

export function createCamera(mode = 'fit') {
  if (mode === 'detail') {
    const scale = 1.45;
    // Focus camera around sensor & diverter manifold (x: 420, y: 340)
    const cx = 430;
    const cy = 340;
    const rawTx = FLOOR.width / 2 - cx * scale;
    const rawTy = FLOOR.height / 2 - cy * scale;
    const minTx = FLOOR.width * (1 - scale);
    const minTy = FLOOR.height * (1 - scale);
    return {
      mode: 'detail',
      scale,
      tx: Math.max(minTx, Math.min(0, rawTx)),
      ty: Math.max(minTy, Math.min(0, rawTy)),
    };
  }
  return { mode: 'fit', scale: 1.0, tx: 0, ty: 0 };
}

export function screenToWorld(px, py, camera, canvasBoundingRect) {
  // First map DOM client coordinates into Canvas logical 1200x720 space
  const sx = FLOOR.width / canvasBoundingRect.width;
  const sy = FLOOR.height / canvasBoundingRect.height;
  const canvasX = px * sx;
  const canvasY = py * sy;

  // Then invert camera transform
  const wx = (canvasX - camera.tx) / camera.scale;
  const wy = (canvasY - camera.ty) / camera.scale;
  return { x: wx, y: wy };
}

export function calculateDiverterAngle(targetY, isHazard) {
  if (isHazard) return 1.05;
  const dy = targetY - FLOOR.feederY;
  const dx = 200;
  return Math.atan2(dy, dx);
}
