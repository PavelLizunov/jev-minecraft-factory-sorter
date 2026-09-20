import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Info, Sparkles, X, Play } from 'lucide-react';
import {
  BRANCHES,
  FLOOR,
  spawnEntity,
  applyDecision,
  releaseHold,
  tossEntity,
  stepEntity,
  createCamera,
  screenToWorld,
  calculateDiverterAngle
} from '../factory-engine';

export const FACTORY_BRANCHES = BRANCHES;

const FactoryFloorCanvas = forwardRef(function FactoryFloorCanvas(
  {
    onScanItem,
    onItemSorted,
    onCountChange,
    onInspect,
    onStatus,
    blocks = [],
    selectedToolBlock,
    highlightBranchId,
    showWelcome = false,
    onDismissWelcome,
    onRunDemo
  },
  ref
) {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('fit'); // 'fit' | 'detail'
  const [isPanning, setIsPanning] = useState(false);
  const [liveStatus, setLiveStatus] = useState({ type: 'idle', label: 'Factory Ready' });
  const liveStatusRef = useRef(liveStatus);
  const state = useRef({
    entities: [],
    textures: new Map(),
    dragged: null,
    hover: null,
    pointer: null,
    panning: false,
    panStart: null,
    activePointerId: null,
    angle: 0,
    targetAngle: 0,
    time: 0,
    flash: 0,
    samples: [],
    frames: 0,
    camera: createCamera('fit')
  });

  const callbacks = useRef({});
  callbacks.current = { onScanItem, onItemSorted, onCountChange, onInspect, onStatus, blocks, selectedToolBlock };

  // Preset buttons reset the camera directly, even when the mode is unchanged.
  const selectCameraMode = mode => {
    state.current.camera = createCamera(mode);
    setViewMode(mode);
  };

  const image = url => {
    if (!url) return null;
    if (!state.current.textures.has(url)) {
      const img = new Image();
      img.src = url;
      state.current.textures.set(url, img);
    }
    return state.current.textures.get(url);
  };

  const spawn = (block, x = 65, y = FLOOR.feederY) => {
    const s = state.current;
    if (s.entities.length >= 48) {
      callbacks.current.onStatus?.('Conveyor full: clear cargo or wait for delivery.');
      return false;
    }
    image(block.texture);
    if (x <= 100 && Math.abs(y - FLOOR.feederY) < 30) {
      const feederEntities = s.entities.filter(e => e.phase === 'feeder');
      if (feederEntities.length > 0) {
        const last = Math.min(...feederEntities.map(e => e.x));
        x = Math.min(x, last - 60);
      }
    }
    const e = spawnEntity(block, x, y);
    if (x > 310 || Math.abs(y - FLOOR.feederY) > 50) e.phase = 'return';
    s.entities.push(e);
    callbacks.current.onCountChange?.(s.entities.length);
    return true;
  };

  useImperativeHandle(ref, () => ({
    spawnBlock: spawn,
    updateBlockClassification(id, decision) {
      const e = state.current.entities.find(x => x.entityId === id);
      if (e) applyDecision(e, decision);
    },
    releaseHold(id, overrideAction = 'store') {
      const e = state.current.entities.find(x => x.entityId === id);
      if (e && (e.phase === 'hold' || e.phase === 'to_siding')) {
        releaseHold(e, overrideAction);
      }
    },
    failClassification(id, error) {
      const e = state.current.entities.find(x => x.entityId === id);
      if (e) e.error = error;
    },
    retryFailed() {
      for (const e of state.current.entities) {
        if (e.error) {
          e.error = null;
          callbacks.current.onScanItem?.({ ...e });
        }
      }
    },
    clearAll() {
      state.current.entities = [];
      state.current.dragged = null;
      state.current.hover = null;
      callbacks.current.onCountChange?.(0);
    },
    snapshot() {
      return state.current.entities.map(({ entityId, catalogId, phase, x, y, decision, error, kind }) => ({
        entityId,
        catalogId,
        phase,
        x,
        y,
        decision,
        error,
        kind
      }));
    },
    performance() {
      return {
        frames: state.current.frames,
        intervals: [...state.current.samples],
        camera: { ...state.current.camera }
      };
    },
    setCameraMode(mode) {
      selectCameraMode(mode);
    }
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });

    // Static backdrop rasterized at 1200x720
    const backdrop = document.createElement('canvas');
    backdrop.width = FLOOR.width;
    backdrop.height = FLOOR.height;
    const bg = backdrop.getContext('2d');
    drawWorkshop(bg);

    let frameId, last = 0;
    const frame = now => {
      const raw = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      const dt = Math.min(raw, 0.05), s = state.current;
      s.time += dt;
      s.frames++;
      s.samples.push(raw * 1000);
      if (s.samples.length > 900) s.samples.shift();

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== FLOOR.width * dpr || canvas.height !== FLOOR.height * dpr) {
        canvas.width = FLOOR.width * dpr;
        canvas.height = FLOOR.height * dpr;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Explicitly clear and fill full canvas screen buffer to prevent any ghosting or trails
      ctx.fillStyle = '#171e1b';
      ctx.fillRect(0, 0, FLOOR.width, FLOOR.height);

      // Apply camera zoom transform
      const cam = s.camera;
      ctx.save();
      if (cam.scale !== 1.0 || cam.tx !== 0 || cam.ty !== 0) {
        ctx.translate(cam.tx, cam.ty);
        ctx.scale(cam.scale, cam.scale);
      }

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(backdrop, 0, 0);
      drawTracks(ctx, s.time, highlightBranchId);

      // Compute and update Operator Live Status
      let currentOp = { type: 'idle', label: 'Factory Ready' };
      const scanningEntity = s.entities.find(e => e.scanned && !e.decision);
      const holdingEntity = s.entities.find(e => e.phase === 'hold' || e.phase === 'to_siding');
      const shuntingEntity = s.entities.find(e => e.phase === 'shunt');
      const routingEntity = s.entities.find(e => e.phase === 'branch' || e.phase === 'destination');

      if (scanningEntity) {
        currentOp = { type: 'scanning', label: scanningEntity.name };
      } else if (holdingEntity) {
        currentOp = { type: 'hold', label: `${holdingEntity.name} (Hold: ${holdingEntity.decision?.actionReason || 'review'})` };
      } else if (shuntingEntity) {
        currentOp = { type: 'shunt', label: shuntingEntity.name };
      } else if (routingEntity) {
        const b = BRANCHES.find(br => br.id === routingEntity.decision?.chest);
        currentOp = { type: 'routing', label: `${b?.shortName || 'Bay'} (${routingEntity.name})` };
      }

      if (liveStatusRef.current.type !== currentOp.type || liveStatusRef.current.label !== currentOp.label) {
        liveStatusRef.current = currentOp;
        setLiveStatus(currentOp);
      }

      // Determine active sensor target entity:
      // Priority 1: Entity currently on feeder at or after scanX
      // Priority 2: Entity on siding or holding
      // Priority 3: Entity currently branching/shunting near splitX
      const sensorEntity =
        s.entities.find(e => e.phase === 'feeder' && e.scanned) ||
        s.entities.find(e => e.phase === 'to_siding' || e.phase === 'hold') ||
        s.entities.find(e => (e.phase === 'branch' || e.phase === 'shunt') && e.progress < 0.45);

      drawSensor(ctx, s.time, sensorEntity);

      // Diverter flipper angle calculation at splitX (430, 340)
      const routed = s.entities.find(e => e.phase === 'branch' || e.phase === 'shunt');
      if (routed) {
        const isHazard = routed.phase === 'shunt';
        const targetBranch = BRANCHES.find(b => b.id === routed.decision?.chest);
        const targetY = isHazard ? FLOOR.pitY : (targetBranch ? targetBranch.y : FLOOR.feederY);
        s.targetAngle = calculateDiverterAngle(targetY, isHazard);
      } else {
        s.targetAngle = 0;
      }
      s.angle += (s.targetAngle - s.angle) * (1 - Math.exp(-10 * dt));

      drawDiverter(ctx, s.angle, routed);
      drawPit(ctx, s.time, s.flash);
      s.flash = Math.max(0, s.flash - dt);

      // Step and draw entities (Quarantine Loop branches directly from scanner at 320, 340)
      const before = s.entities.length;
      const sortedEntities = [...s.entities].sort((a, b) => b.x - a.x);
      let nextFeederLimit = FLOOR.splitX;
      let nextSidingLimit = FLOOR.sidingWaitX;

      for (const e of sortedEntities) {
        const feederLimit = e.phase === 'feeder' ? nextFeederLimit : FLOOR.splitX;
        const sidingLimit = (e.phase === 'to_siding' || e.phase === 'hold') ? nextSidingLimit : FLOOR.sidingWaitX;
        stepEntity(
          e,
          dt,
          entity => callbacks.current.onScanItem?.({ ...entity }),
          (entity, branch) => {
            if (!branch) s.flash = 0.6;
            callbacks.current.onItemSorted?.({ ...entity }, branch);
          },
          feederLimit,
          sidingLimit
        );
        if (e.phase === 'feeder') {
          nextFeederLimit = Math.min(nextFeederLimit, e.x - 60);
        }
        if (e.phase === 'to_siding' || e.phase === 'hold') {
          nextSidingLimit = Math.min(340, e.x + 56);
        }
        if (e.phase !== 'done') {
          drawCargo(ctx, e, image(e.texture), e.entityId === s.hover || e.entityId === s.dragged);
        }
      }
      s.entities = s.entities.filter(e => e.phase !== 'done');
      if (before !== s.entities.length) callbacks.current.onCountChange?.(s.entities.length);

      ctx.restore(); // Restore camera transform
      ctx.restore(); // Restore dpr transform

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const coords = e => {
    const r = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    return screenToWorld(px, py, state.current.camera, r);
  };

  const down = e => {
    const p = coords(e), s = state.current;
    if (s.activePointerId !== null) return; // Pointer isolation: ignore secondary touch points
    const entity = [...s.entities].reverse().find(b => Math.hypot(b.x - p.x, b.y - p.y) < 36);

    if (e.button === 0 && entity) {
      s.activePointerId = e.pointerId;
      s.dragged = entity.entityId;
      s.dragStart = {
        x: p.x,
        y: p.y,
        clientX: e.clientX,
        clientY: e.clientY,
        originalPhase: entity.phase,
        originalY: entity.y
      };
      s.pointer = { ...p, time: performance.now(), vx: 0, vy: 0 };
      s.isDragging = false;
      try { canvasRef.current?.setPointerCapture(e.pointerId); } catch {}
      callbacks.current.onInspect?.(entity);
    } else if (e.button === 0 || e.button === 1 || e.button === 2) {
      // Clicked on empty floor: activate camera panning across the canvas
      s.activePointerId = e.pointerId;
      s.panning = true;
      setIsPanning(true);
      s.panStart = {
        clientX: e.clientX,
        clientY: e.clientY,
        tx: s.camera.tx,
        ty: s.camera.ty
      };
      try { canvasRef.current?.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const move = e => {
    const s = state.current;
    if (s.activePointerId !== null && e.pointerId !== s.activePointerId) return;

    if (s.panning && s.panStart) {
      const r = canvasRef.current.getBoundingClientRect();
      const sx = FLOOR.width / r.width;
      const sy = FLOOR.height / r.height;
      const dx = (e.clientX - s.panStart.clientX) * sx;
      const dy = (e.clientY - s.panStart.clientY) * sy;

      const scale = s.camera.scale;
      let newTx = s.panStart.tx + dx;
      let newTy = s.panStart.ty + dy;

      if (scale > 1.0) {
        const minTx = FLOOR.width * (1 - scale);
        const maxTx = 0;
        const minTy = FLOOR.height * (1 - scale);
        const maxTy = 0;
        newTx = Math.max(minTx, Math.min(maxTx, newTx));
        newTy = Math.max(minTy, Math.min(maxTy, newTy));
      } else {
        newTx = 0;
        newTy = 0;
      }

      s.camera.tx = newTx;
      s.camera.ty = newTy;
      return;
    }

    const p = coords(e);
    if (s.dragged) {
      const entity = s.entities.find(b => b.entityId === s.dragged);
      if (!entity) return;

      // Screen-space click deadzone (10px touch, 6px mouse) to prevent accidental mobile tap ejections
      if (!s.isDragging) {
        const screenDist = Math.hypot(e.clientX - s.dragStart.clientX, e.clientY - s.dragStart.clientY);
        const threshold = e.pointerType === 'touch' ? 10 : 6;
        if (screenDist > threshold) {
          s.isDragging = true;
          entity.phase = 'dragging';
        } else {
          return;
        }
      }

      const now = performance.now(), dt = Math.max(0.008, (now - s.pointer.time) / 1000);
      const vx = (p.x - s.pointer.x) / dt, vy = (p.y - s.pointer.y) / dt;
      s.pointer = { ...p, time: now, vx, vy };
      entity.x = Math.max(25, Math.min(1175, p.x));
      entity.y = Math.max(25, Math.min(695, p.y));
    } else {
      const entity = [...s.entities].reverse().find(b => Math.hypot(b.x - p.x, b.y - p.y) < 32);
      if (entity && s.hover !== entity.entityId) callbacks.current.onInspect?.(entity);
      s.hover = entity?.entityId ?? null;
    }
  };

  const up = e => {
    const s = state.current;
    if (s.activePointerId !== null && e.pointerId !== s.activePointerId) return;
    s.activePointerId = null;

    if (s.panning) {
      s.panning = false;
      setIsPanning(false);
      s.panStart = null;
      if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
        try { canvasRef.current.releasePointerCapture(e.pointerId); } catch {}
      }
      return;
    }

    if (s.dragged) {
      const entity = s.entities.find(b => b.entityId === s.dragged);
      if (entity) {
        if (!s.isDragging) {
          // Plain click on an item: inspect without tossing or resetting conveyor progress
          entity.phase = s.dragStart?.originalPhase || 'feeder';
        } else {
          // Intentional drag: evaluate release velocity and destination snapping
          const stale = performance.now() - s.pointer.time > 120;
          const speed = Math.hypot(s.pointer.vx, s.pointer.vy);
          if (!stale && speed > 80) {
            tossEntity(entity, s.pointer.vx, s.pointer.vy);
          } else {
            // Gently released: snap to track if near one
            if (entity.x < FLOOR.splitX) {
              if (Math.abs(entity.y - FLOOR.feederY) < 60) {
                entity.phase = 'feeder';
                entity.y = FLOOR.feederY;
              } else if (Math.abs(entity.y - FLOOR.sidingY) < 60) {
                entity.phase = 'hold';
                entity.y = FLOOR.sidingY;
              } else {
                entity.phase = 'return';
              }
            } else if (entity.x >= FLOOR.splitX) {
              let closestBranch = null;
              let minDist = 9999;
              for (const b of BRANCHES) {
                const dist = Math.abs(entity.y - b.y);
                if (dist < minDist) {
                  minDist = dist;
                  closestBranch = b;
                }
              }
              if (closestBranch && minDist < 55) {
                entity.phase = 'destination';
                entity.y = closestBranch.y;
                entity.decision = {
                  ...(entity.decision || { action: 'store', isHazardous: false }),
                  chest: closestBranch.id
                };
              } else {
                entity.phase = 'return';
              }
            } else {
              entity.phase = 'return';
            }
          }
        }
      }
      s.dragged = null;
      s.isDragging = false;
      if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
        try { canvasRef.current.releasePointerCapture(e.pointerId); } catch {}
      }
    }
  };

  // Attach non-passive wheel event listener directly to DOM node to reliably preventDefault page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = e => {
      // Plain wheel belongs to scrolling in every camera mode.
      if ((!e.ctrlKey && !e.metaKey) || e.deltaY === 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const r = canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) * (FLOOR.width / r.width);
      const py = (e.clientY - r.top) * (FLOOR.height / r.height);
      const s = state.current;
      const oldScale = s.camera.scale;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.max(1.0, Math.min(2.5, oldScale * zoomFactor));
      if (Math.abs(newScale - oldScale) < 0.002) return;

      if (newScale <= 1.02) {
        s.camera.scale = 1.0;
        s.camera.tx = 0;
        s.camera.ty = 0;
        s.camera.mode = 'fit';
        setViewMode('fit');
      } else {
        const wx = (px - s.camera.tx) / oldScale;
        const wy = (py - s.camera.ty) / oldScale;
        s.camera.scale = newScale;
        let tx = px - wx * newScale;
        let ty = py - wy * newScale;
        const minTx = FLOOR.width * (1 - newScale);
        const minTy = FLOOR.height * (1 - newScale);
        s.camera.tx = Math.max(minTx, Math.min(0, tx));
        s.camera.ty = Math.max(minTy, Math.min(0, ty));
        s.camera.mode = 'detail';
        setViewMode('detail');
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel, { passive: false });
  }, []);

  const drop = e => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const block = callbacks.current.blocks.find(b => b.id === id);
    if (block) {
      const p = coords(e);
      spawn(block, p.x, p.y);
    }
  };

  return (
    <section className="floor-panel" aria-label="Interactive factory floor">
      <div className="panel-heading">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="status-dot shrink-0" />
          <span className="font-semibold text-gray-200 shrink-0">Factory floor</span>
          <span className="muted text-xs truncate">/ 6 Divergent Branches + Blast Pit</span>
        </div>

        {/* Prominent Operator Live Status HUD (Fixed width - zero horizontal jitter) */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#101713] border border-[#2e3e33] text-[10px] font-mono shadow-sm w-[260px] shrink-0 justify-center">
          {liveStatus.type === 'scanning' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span className="text-amber-300 font-bold">SCANNING</span>
              <span className="text-gray-400 truncate max-w-[140px]">· {liveStatus.label}</span>
            </>
          )}
          {liveStatus.type === 'hold' && (
            <>
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
              <span className="text-orange-400 font-bold">HOLD (SIDING)</span>
              <span className="text-amber-200 truncate max-w-[140px]">· {liveStatus.label}</span>
            </>
          )}
          {liveStatus.type === 'routing' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-bold">ROUTING</span>
              <span className="text-gray-300 truncate max-w-[140px]">→ {liveStatus.label}</span>
            </>
          )}
          {liveStatus.type === 'shunt' && (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-bold">LAVA SHUNT</span>
              <span className="text-red-300 truncate max-w-[140px]">· {liveStatus.label}</span>
            </>
          )}
          {liveStatus.type === 'idle' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
              <span className="text-gray-400">IDLE · Factory Ready</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Fit vs Detail View Zoom Toggle */}
          <div className="camera-view-toggle" role="group" aria-label="Camera Zoom">
            <button
              type="button"
              className={viewMode === 'fit' ? 'active' : ''}
              onClick={() => selectCameraMode('fit')}
              title="Overview of all 6 branches"
              aria-pressed={viewMode === 'fit'}
            >
              Fit
            </button>
            <button
              type="button"
              className={viewMode === 'detail' ? 'active' : ''}
              onClick={() => selectCameraMode('detail')}
              title="1.5x Magnified zoom on Jev sensor and diverter flipper"
              aria-pressed={viewMode === 'detail'}
            >
              Detail 1.5×
            </button>
          </div>
          <span className="mono muted text-[10px] hidden md:inline">Feed → Scan → 6 Routes</span>
        </div>
      </div>

      <div
        className="floor-stage"
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={drop}
      >
        {showWelcome && (
          <div className="welcome-callout-overlay">
            <div className="welcome-callout-card">
              <div className="welcome-callout-header">
                <span className="welcome-badge">
                  <Sparkles size={13} />
                  <span>Interactive AI Showcase</span>
                </span>
                <button
                  type="button"
                  onClick={onDismissWelcome}
                  className="welcome-close"
                  aria-label="Dismiss guide"
                >
                  <X size={14} />
                </button>
              </div>
              <h3>Welcome to Jev Factory Sorter</h3>
              <p>
                Watch <strong>TypeSafe Jev AI</strong> classify and route Minecraft blocks & items across 6 kinetic belts at 60 FPS in real-time.
              </p>
              <div className="welcome-actions">
                <button
                  type="button"
                  className="button primary text-xs py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                  onClick={onRunDemo}
                >
                  <Play size={13} className="fill-current" />
                  <span>Launch Demo Run (10 items)</span>
                </button>
                <button
                  type="button"
                  className="button text-xs py-2 px-3 text-gray-300 hover:text-white cursor-pointer"
                  onClick={onDismissWelcome}
                >
                  Pick an item below ↓
                </button>
              </div>
              <div className="welcome-steps">
                <span>① Click block below</span>
                <span>→</span>
                <span>② Jev sorts on belt</span>
                <span>→</span>
                <span>③ Check loot chests</span>
              </div>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={FLOOR.width}
          height={FLOOR.height}
          data-testid="factory-canvas"
          aria-label="Factory conveyor. Click blocks or keys 1-9 to spawn; drag and toss items directly; drag floor to pan."
          style={{
            cursor: isPanning ? 'grabbing' : viewMode === 'detail' ? 'grab' : 'default',
            touchAction: 'none'
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={e => e.preventDefault()}
          onPointerLeave={() => {
            if (!state.current.dragged && !state.current.panning) state.current.hover = null;
          }}
        />
      </div>

      <div className="floor-caption">
        <span className="flex items-center gap-1.5">
          <Info size={13} className="text-yellow-400 shrink-0 inline" />
          Drag cargo to toss · Drag floor to pan · Ctrl/Cmd + wheel to zoom · Toggle <strong>Detail</strong> for close-up
        </span>
        <span className="mono">CANVAS 2D • 6 BRANCHES</span>
      </div>
    </section>
  );
});

function text(ctx, value, x, y, color = '#aeb9b6', size = 12, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px "IBM Plex Mono", "Courier New", monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function path(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    p.length === 6 ? ctx.bezierCurveTo(...p) : ctx.lineTo(...p);
  }
}

function drawWorkshop(ctx) {
  const w = FLOOR.width, h = FLOOR.height;
  ctx.fillStyle = '#171e1b';
  ctx.fillRect(0, 0, w, h);

  // Andesite Casing floor grid tiles (Create mod aesthetic)
  for (let x = 0; x < w; x += 48) {
    for (let y = 0; y < h; y += 48) {
      ctx.fillStyle = ((x + y) / 48) % 2 ? '#1b2420' : '#19211d';
      ctx.fillRect(x + 1, y + 1, 46, 46);
      ctx.fillStyle = '#29352e';
      ctx.fillRect(x + 2, y + 2, 44, 1);
      ctx.fillRect(x + 2, y + 2, 1, 44);
      ctx.fillStyle = '#121715';
      ctx.fillRect(x + 46, y + 2, 1, 44);
      ctx.fillRect(x + 2, y + 46, 45, 1);
      // Subtle brass corner rivets every 96px
      if (x % 96 === 0 && y % 96 === 0) {
        ctx.fillStyle = '#b88628';
        ctx.fillRect(x + 3, y + 3, 2, 2);
        ctx.fillRect(x + 43, y + 3, 2, 2);
        ctx.fillRect(x + 3, y + 43, 2, 2);
        ctx.fillRect(x + 43, y + 43, 2, 2);
      }
    }
  }

  // Top & bottom brass industrial girder trim
  ctx.fillStyle = '#0f1412';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillRect(0, h - 14, w, 14);
  for (let x = 20; x < w; x += 32) {
    ctx.fillStyle = '#9e7529';
    ctx.fillRect(x, 4, 14, 6);
    ctx.fillStyle = '#f5c464';
    ctx.fillRect(x + 1, 5, 12, 1);
    ctx.fillStyle = '#9e7529';
    ctx.fillRect(x, h - 10, 14, 6);
    ctx.fillStyle = '#f5c464';
    ctx.fillRect(x + 1, h - 9, 12, 1);
  }

  // Perimeter structural framing
  ctx.strokeStyle = '#0a0f0d';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.strokeStyle = '#324237';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  // Informative labels
  text(ctx, 'FEEDER 01 / MECHANICAL BELT', 40, FLOOR.feederY - 55, '#dbe5de', 13, 'left', 'bold');
  text(ctx, 'SMART OBSERVER & NIXIE DISPLAY', FLOOR.scanX, FLOOR.feederY - 86, '#ffffff', 14, 'center', 'bold');
  text(ctx, 'CREATE BRASS TUNNEL SORTING MANIFOLD', 650, FLOOR.feederY + 6, '#e0a944', 12, 'left', 'bold');
  text(ctx, 'CREATE 0.5.1 KINETIC LOGISTICS', 50, 48, '#e2ede7', 14, 'left', 'bold');
  text(ctx, '6-BRANCH AUTOMATED MATERIAL DISPATCH', 50, 68, '#a3b5ac', 11, 'left', 'normal');

  // Feeder hopper entrance (Andesite funnel design)
  ctx.fillStyle = '#101714';
  ctx.fillRect(36, FLOOR.feederY - 40, 72, 80);
  ctx.fillStyle = '#3f4c45';
  ctx.fillRect(44, FLOOR.feederY - 32, 56, 64);
  ctx.fillStyle = '#202924';
  ctx.fillRect(52, FLOOR.feederY - 24, 40, 48);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#65786f';
    ctx.fillRect(46 + i * 14, FLOOR.feederY - 30, 3, 60);
  }

  // 6 Destination bay receiving Brass Funnels & Station Signage
  BRANCHES.forEach((b, i) => {
    // Create Brass Funnel at belt destination
    ctx.fillStyle = '#0c120f';
    ctx.fillRect(1030, b.y - 32, 130, 64);
    // Brass casing trim
    ctx.fillStyle = '#b88628';
    ctx.fillRect(1034, b.y - 28, 122, 56);
    ctx.fillStyle = '#2c1e0b';
    ctx.fillRect(1040, b.y - 22, 60, 44);
    ctx.fillStyle = '#111714';
    ctx.fillRect(1044, b.y - 18, 52, 36);

    // Brass Funnel sorting flap plates
    for (let n = 0; n < 3; n++) {
      ctx.fillStyle = '#e5a83b';
      ctx.fillRect(1046, b.y - 14 + n * 12, 48, 8);
      ctx.fillStyle = '#9e7529';
      ctx.fillRect(1046, b.y - 14 + n * 12 + 7, 48, 1);
    }

    // Branch Color Glow Indicator
    ctx.fillStyle = b.color;
    ctx.fillRect(1112, b.y - 18, 6, 36);
    text(ctx, `0${i + 1}`, 1146, b.y + 6, '#ffffff', 15, 'right', 'bold');

    // Dedicated Station Signage above each branch track
    const signX = 710;
    const signY = b.y - 54;
    const signW = 310;
    const signH = 24;
    ctx.fillStyle = '#0e1411';
    ctx.fillRect(signX, signY, signW, signH);
    ctx.strokeStyle = '#35483b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX, signY, signW, signH);
    ctx.fillStyle = b.color;
    ctx.fillRect(signX + 2, signY + 2, 5, signH - 4);
    text(ctx, `0${i + 1}  ${b.name.toUpperCase()}`, signX + 14, signY + 17, '#ffffff', 13, 'left', 'bold');
  });

  // Dedicated Quarantine Re-circulation Loop Station
  const loopSignX = 185;
  const loopSignY = FLOOR.sidingY + 36;
  const loopSignW = 210;
  const loopSignH = 22;
  ctx.fillStyle = '#141108';
  ctx.fillRect(loopSignX, loopSignY, loopSignW, loopSignH);
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(loopSignX, loopSignY, loopSignW, loopSignH);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(loopSignX + 2, loopSignY + 2, 5, loopSignH - 4);
  text(ctx, 'QUARANTINE SIDING LOOP', loopSignX + 12, loopSignY + 15, '#fde68a', 11, 'left', 'bold');
}

function drawTracks(ctx, time, highlightBranchId) {
  const routes = [
    { points: [[100, FLOOR.feederY], [FLOOR.splitX, FLOOR.feederY]], color: '#8bab9e' },
    // Dedicated Quarantine Re-circulation Loop: branches from scanner (320), holds at 480, returns through scanner via (160)
    {
      points: [
        [FLOOR.scanX, FLOOR.feederY],
        [390, FLOOR.feederY, 410, FLOOR.sidingY, FLOOR.sidingStartX, FLOOR.sidingY],
        [FLOOR.sidingReturnX, FLOOR.sidingY],
        [140, FLOOR.sidingY, 110, FLOOR.feederY, FLOOR.feederMergeX, FLOOR.feederY]
      ],
      color: '#f59e0b'
    },
    ...BRANCHES.map(b => ({
      branchId: b.id,
      points: [
        [FLOOR.splitX, FLOOR.feederY],
        [FLOOR.splitX + 100, FLOOR.feederY, FLOOR.splitX + 130, b.y, 640, b.y],
        [1032, b.y]
      ],
      color: b.color
    })),
    {
      points: [
        [FLOOR.splitX, FLOOR.feederY],
        [FLOOR.splitX + 50, FLOOR.feederY, FLOOR.splitX + 80, FLOOR.pitY, FLOOR.pitX, FLOOR.pitY]
      ],
      color: '#f97316'
    }
  ];

  // Draw Create Mechanical Belts with ribbed dark rubber and brass guide trims
  for (const route of routes) {
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    // Highlight hovered branch with glowing border
    if (route.branchId && route.branchId === highlightBranchId) {
      path(ctx, route.points);
      ctx.strokeStyle = route.color + '66';
      ctx.lineWidth = 68;
      ctx.stroke();
    }

    // 1. Andesite casing base underneath belt
    path(ctx, route.points);
    ctx.strokeStyle = '#090e0c';
    ctx.lineWidth = 62;
    ctx.stroke();

    path(ctx, route.points);
    ctx.strokeStyle = '#323d38';
    ctx.lineWidth = 54;
    ctx.stroke();

    // 2. Vulcanized rubber belt surface
    path(ctx, route.points);
    ctx.strokeStyle = '#1d2320';
    ctx.lineWidth = 44;
    ctx.stroke();

    path(ctx, route.points);
    ctx.strokeStyle = '#151a18';
    ctx.lineWidth = 36;
    ctx.stroke();

    // 3. Animated transverse rubber cleats/ribs
    path(ctx, route.points);
    ctx.strokeStyle = '#2b332f';
    ctx.lineWidth = 32;
    ctx.setLineDash([3, 14]);
    ctx.lineDashOffset = -time * 54;
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Subtle brass guide line
    path(ctx, route.points);
    ctx.strokeStyle = route.color + '55';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw kinetic steel drive shafts & brass pulleys at key mechanical nodes
  const shaftNodes = [
    [100, FLOOR.feederY],
    [FLOOR.splitX, FLOOR.feederY],
    [FLOOR.scanX, FLOOR.feederY],
    [FLOOR.sidingStartX, FLOOR.sidingY],
    [FLOOR.sidingReturnX, FLOOR.sidingY],
    [FLOOR.feederMergeX, FLOOR.feederY],
    ...BRANCHES.map(b => [640, b.y]),
    ...BRANCHES.map(b => [1030, b.y])
  ];

  for (const [sx, sy] of shaftNodes) {
    ctx.fillStyle = '#0a0d0c';
    ctx.beginPath();
    ctx.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Brass shaft hub
    ctx.fillStyle = '#b88628';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();

    // Steel shaft center with rotating kinetic notch
    ctx.fillStyle = '#73807a';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5a83b';
    const angle = time * 6;
    ctx.fillRect(sx + Math.cos(angle) * 3 - 1, sy + Math.sin(angle) * 3 - 1, 2, 2);
  }
}

function drawSensor(ctx, time, entity) {
  const x = FLOOR.scanX, y = FLOOR.feederY;
  const isBusy = entity && entity.scanned && !entity.decision;
  const decision = entity?.decision;
  const isHazard = decision?.isHazardous === true || decision?.action === 'shunt';
  const isHolding = decision?.action === 'hold' && !decision?.cleared;
  const isCleared = decision?.cleared === true;

  let glyph = '--';
  let glowColor = '#ff851b';
  let labelText = 'SMART OBSERVER (READY)';
  let eyeColor = '#00f0ff';

  if (isBusy) {
    glyph = '..';
    glowColor = '#fbbf24';
    labelText = 'ANALYZING CARGO...';
    eyeColor = '#fbbf24';
  } else if (decision) {
    if (isHazard) {
      glyph = 'LV';
      glowColor = '#f97316';
      labelText = '→ LAVA BLAST PIT';
      eyeColor = '#f97316';
    } else {
      const targetBranch = BRANCHES.find(b => b.id === decision.chest);
      const branchNum = targetBranch ? `0${targetBranch.index}` : '01';
      glyph = branchNum;
      glowColor = targetBranch?.color || '#38bdf8';
      eyeColor = glowColor;

      if (isHolding) {
        labelText = `HOLD → ${branchNum} ${targetBranch?.shortName.toUpperCase() || 'SIDING'}`;
        glowColor = '#f59e0b';
      } else if (isCleared) {
        labelText = `CLEARED → ${branchNum} ${targetBranch?.shortName.toUpperCase() || 'DEST'}`;
      } else {
        labelText = `→ ${branchNum} ${targetBranch?.name.toUpperCase() || 'ROUTING'}`;
      }
    }
  }

  // 1. Create Smart Observer Casing (Brass and andesite casing with copper rivets)
  ctx.fillStyle = '#1c2420';
  ctx.fillRect(x - 30, y - 32, 60, 64);
  ctx.strokeStyle = '#b88628';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x - 29, y - 31, 58, 62);

  // Rivets on Observer corners
  ctx.fillStyle = '#f5c464';
  ctx.fillRect(x - 27, y - 29, 2, 2);
  ctx.fillRect(x + 25, y - 29, 2, 2);
  ctx.fillRect(x - 27, y + 27, 2, 2);
  ctx.fillRect(x + 25, y + 27, 2, 2);

  // Optical lens socket
  ctx.fillStyle = '#0e1411';
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a6d63';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Glowing Electronic Eye (Smart Observer reticle)
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(x, y, isBusy ? 10 + Math.sin(time * 8) * 2 : 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Authentic Create Nixie Tube Display (mounted above observer at y - 66)
  const nixieX = x, nixieY = y - 66;

  // Copper mounting socket
  ctx.fillStyle = '#b86532';
  ctx.fillRect(nixieX - 24, nixieY + 14, 48, 6);
  ctx.fillStyle = '#8f471e';
  ctx.fillRect(nixieX - 22, nixieY + 18, 44, 2);

  // Dark glass vacuum envelope
  ctx.fillStyle = '#0f1412';
  ctx.beginPath();
  ctx.roundRect(nixieX - 20, nixieY - 18, 40, 32, 6);
  ctx.fill();
  ctx.strokeStyle = '#3c4e44';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Glass reflection highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(nixieX - 16, nixieY - 14, 4, 20);

  // Glowing Neon Filament Display (shows exact destination channel: 01, 02, 03, 04, 05, 06, LV, etc.)
  text(ctx, glyph, nixieX, nixieY + 4, glowColor, 15, 'center', 'bold');

  // Backing plate for high-contrast readability (per GPT-Pro audit)
  ctx.fillStyle = '#0b100de6';
  ctx.fillRect(x - 95, y + 36, 190, 22);
  ctx.strokeStyle = eyeColor + '66';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 95, y + 36, 190, 22);

  // Status text under observer
  text(
    ctx,
    labelText,
    x,
    y + 51,
    eyeColor,
    11,
    'center',
    'bold'
  );
}

function drawDiverter(ctx, angle, routed) {
  const x = FLOOR.splitX, y = FLOOR.feederY;
  ctx.save();
  ctx.translate(x, y);

  // Create Brass Tunnel casing structure
  ctx.fillStyle = '#101614';
  ctx.fillRect(-28, -32, 56, 64);

  // Riveted Brass Casing outer frame
  ctx.fillStyle = '#b88628';
  ctx.fillRect(-26, -30, 52, 60);
  ctx.fillStyle = '#dfa53c';
  ctx.fillRect(-24, -28, 48, 56);
  ctx.fillStyle = '#151e19';
  ctx.fillRect(-18, -20, 36, 40);

  // Brass bolts
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-23, -27, 2, 2);
  ctx.fillRect(21, -27, 2, 2);
  ctx.fillRect(-23, 25, 2, 2);
  ctx.fillRect(21, 25, 2, 2);

  // Brass Filter display slot above tunnel
  const targetBranch = BRANCHES.find(b => b.id === routed?.decision?.chest);
  const filterColor = routed?.phase === 'shunt' ? '#f97316' : targetBranch ? targetBranch.color : '#b88628';
  ctx.fillStyle = '#0c120f';
  ctx.fillRect(-12, -40, 24, 10);
  ctx.strokeStyle = '#b88628';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-12, -40, 24, 10);
  ctx.fillStyle = filterColor;
  ctx.fillRect(-9, -37, 18, 4);

  // Swinging Brass Sorting Flaps (plates that open when angle changes)
  ctx.rotate(angle);
  ctx.fillStyle = '#b88628';
  ctx.fillRect(-6, -8, 52, 16);
  ctx.fillStyle = '#f5c464';
  ctx.fillRect(-4, -6, 48, 12);
  ctx.fillStyle = '#9e7529';
  for (let f = 0; f < 3; f++) {
    ctx.fillRect(2 + f * 14, -6, 2, 12);
  }

  // Central brass pivot pin
  ctx.fillStyle = '#0c110f';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPit(ctx, time, flash) {
  const px = FLOOR.pitX - 25, py = FLOOR.pitY - 32;
  ctx.fillStyle = '#0c1011';
  ctx.fillRect(px, py, 150, 60);
  ctx.fillStyle = '#58605b';
  ctx.fillRect(px + 4, py + 4, 142, 52);
  ctx.fillStyle = '#4a281e';
  ctx.fillRect(px + 10, py + 10, 130, 40);

  // Animated bubbling lava cells
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 3; j++) {
      const v = (Math.sin(i * 2 + j * 3 + time * 1.8) + 1) / 2;
      ctx.fillStyle = `rgb(${155 + v * 85}, ${45 + v * 55}, ${20 + v * 15})`;
      ctx.fillRect(px + 11 + i * 10, py + 11 + j * 12, 9.5, 11);
    }
  }

  // Warning guard bar
  for (let x = px + 8; x < px + 140; x += 18) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x, py + 2, 8, 4);
  }

  if (flash) {
    ctx.fillStyle = `rgba(250, 174, 87, ${flash * 0.6})`;
    ctx.fillRect(px + 10, py + 10, 130, 40);
  }
  text(ctx, 'REINFORCED LAVA BLAST PIT', px + 155, py + 26, '#fb923c', 13, 'left', 'bold');
}

function drawCargo(ctx, e, img, hover) {
  const isItem = e.kind === 'item';

  if (isItem) {
    // Authentic Create Mod Item Rendering: 2D item rests flat on belt with soft contact shadow
    const size = hover ? 44 : 38;
    ctx.save();
    ctx.translate(e.x, e.y);

    // Soft oval contact drop shadow directly on the belt rubber
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(2, 10, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hover or error highlight ring
    if (hover || e.error) {
      ctx.strokeStyle = e.error ? '#f87171' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, size / 2 + 4, size / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Exact 12-degree isometric tilt matching Create conveyor perspective
    ctx.rotate(12 * Math.PI / 180);

    if (img?.complete && img.naturalWidth) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = '#b88628';
      ctx.fillRect(-12, -12, 24, 24);
      text(ctx, 'i', 0, 4, '#ffffff', 14, 'center', 'bold');
    }
    ctx.restore();
  } else {
    // Block Model Rendering (Cube with shadow)
    const size = hover || e.phase === 'flight' ? 50 : 44;
    ctx.fillStyle = '#00000066';
    ctx.beginPath();
    ctx.ellipse(e.x + 3, e.y + 16, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hover || e.error) {
      ctx.strokeStyle = e.error ? '#f2b574' : '#e7eee6';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(e.x - size / 2 - 3), Math.round(e.y - size / 2 - 3), size + 6, size + 6);
    }

    if (img?.complete && img.naturalWidth) {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, 0, 0, side, side, Math.round(e.x - size / 2), Math.round(e.y - size / 2), size, size);
    } else {
      ctx.fillStyle = '#89978e';
      ctx.fillRect(e.x - 16, e.y - 16, 32, 32);
      text(ctx, '?', e.x, e.y + 6, '#17211c', 18, 'center');
    }
  }
}


export default FactoryFloorCanvas;
