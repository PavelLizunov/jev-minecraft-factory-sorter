import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export const CHESTS_CONFIG = [
  { id: 'ores_and_gems', name: 'Руды и Драгоценности', icon: '💎', x: 420, color: '#38bdf8', border: '#0284c7' },
  { id: 'building_blocks', name: 'Строительные блоки', icon: '🧱', x: 570, color: '#fb923c', border: '#ea580c' },
  { id: 'redstone_and_mechanisms', name: 'Редстоун и Механика', icon: '⚙️', x: 720, color: '#f87171', border: '#dc2626' },
  { id: 'mob_drops_and_food', name: 'Дроп и Провизия', icon: '🍖', x: 870, color: '#4ade80', border: '#16a34a' }
];

const SCENE_TEXTURES = {
  deepslateBricks: '/textures/scene/deepslate_bricks.png',
  stoneBricks: '/textures/scene/stone_bricks.png',
  waterStill: '/textures/scene/water_still.png',
  waterFlow: '/textures/scene/water_flow.png',
  poweredRail: '/textures/scene/powered_rail_on.png',
  hopper: '/textures/scene/hopper_outside.png',
  pistonSide: '/textures/scene/piston_side.png',
  pistonTop: '/textures/scene/piston_top.png',
  pistonInner: '/textures/scene/piston_inner.png',
  observer: '/textures/scene/observer_front.png',
  redstoneLamp: '/textures/scene/redstone_lamp.png',
  redstoneLampOn: '/textures/scene/redstone_lamp_on.png',
  lavaStill: '/textures/scene/lava_still.png',
  barrelSide: '/textures/scene/barrel_side.png',
  barrelTop: '/textures/scene/barrel_top.png',
  barrelTopOpen: '/textures/scene/barrel_top_open.png'
};

const ConveyorCanvas = forwardRef(function ConveyorCanvas({
  onScanItem,
  onItemSorted,
  onCountChange,
  activeHazard,
  speedMultiplier = 1,
  selectedToolBlock,
  onUserInteract,
  onDropCatalogBlock
}, ref) {
  const canvasRef = useRef(null);
  const texturesRef = useRef(new Map());
  const entitiesRef = useRef([]);
  const particlesRef = useRef([]);
  const floatingTextsRef = useRef([]);
  const pistonStatesRef = useRef([0, 0, 0, 0]);
  const chestBounceRef = useRef([0, 0, 0, 0]);
  const draggedItemRef = useRef(null);
  const hoveredBlockRef = useRef(null);
  const lastMousePosRef = useRef({ x: 0, y: 0, time: 0 });
  const mouseVelRef = useRef({ vx: 0, vy: 0 });
  const waterOffsetRef = useRef(0);

  const loadTexture = (url) => {
    if (!url) return null;
    if (!texturesRef.current.has(url)) {
      const img = new Image();
      img.src = url;
      texturesRef.current.set(url, img);
      return img;
    }
    return texturesRef.current.get(url);
  };

  useEffect(() => {
    Object.values(SCENE_TEXTURES).forEach(url => loadTexture(url));
  }, []);

  useImperativeHandle(ref, () => ({
    spawnBlock(catalogBlock, startX = 30, startY = 180, vx = 0, vy = 0) {
      if (!catalogBlock) return;
      loadTexture(catalogBlock.texture);
      const newEntity = {
        ...catalogBlock,
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        isFreeFalling: startY < 180 || Math.abs(vy) > 0.5,
        scanned: false,
        classified: false,
        targetChestIndex: undefined
      };
      entitiesRef.current.push(newEntity);
      if (onCountChange) onCountChange(entitiesRef.current.length);
    },

    updateBlockClassification(blockId, classification) {
      const b = entitiesRef.current.find(e => e.id === blockId);
      if (b) {
        b.classified = true;
        let targetIndex = CHESTS_CONFIG.findIndex(c => c.id === classification.chest);
        if (targetIndex < 0) targetIndex = 1;
        b.targetChestIndex = targetIndex;
        b.isHazardous = classification.isHazardous;
        b.rarityTier = classification.rarityTier;
      }
    },

    clearAll() {
      entitiesRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      hoveredBlockRef.current = null;
      if (onCountChange) onCountChange(0);
    },

    getCount() {
      return entitiesRef.current.length;
    }
  }));

  // 60 FPS Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const beltY = 200;
    const beltSpeed = 2.0 * speedMultiplier;

    const frame = () => {
      waterOffsetRef.current = (waterOffsetRef.current + beltSpeed * 0.8) % 32;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawDeepslateWall(ctx, canvas.width, canvas.height);
      drawHoppersAndChests(ctx, beltY);
      drawWaterConveyor(ctx, canvas.width, beltY);
      drawObserverScanner(ctx, 260, beltY);
      drawMechanicalPistons(ctx, beltY);

      updateParticles(ctx);
      updateFloatingTexts(ctx);
      updateAndDrawEntities(ctx, canvas.width, beltY, beltSpeed);

      // Draw Minecraft Tooltip if a block is hovered
      if (hoveredBlockRef.current) {
        drawMinecraftTooltip(ctx, hoveredBlockRef.current);
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [speedMultiplier, activeHazard]);

  // Scene rendering
  const drawDeepslateWall = (ctx, w, h) => {
    const tile = loadTexture(SCENE_TEXTURES.deepslateBricks);
    ctx.imageSmoothingEnabled = false;

    if (tile && tile.complete && tile.naturalWidth > 0) {
      const tileSize = 32;
      for (let x = 0; x < w; x += tileSize) {
        for (let y = 0; y < h; y += tileSize) {
          ctx.drawImage(tile, x, y, tileSize, tileSize);
        }
      }
      ctx.fillStyle = 'rgba(15, 16, 22, 0.45)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#1e1f26';
      ctx.fillRect(0, 0, w, h);
    }
  };

  const drawWaterConveyor = (ctx, w, beltY) => {
    const waterTile = loadTexture(SCENE_TEXTURES.waterFlow) || loadTexture(SCENE_TEXTURES.waterStill);
    const stoneTile = loadTexture(SCENE_TEXTURES.stoneBricks);

    ctx.imageSmoothingEnabled = false;

    // Stone foundation
    const fHeight = 24;
    if (stoneTile && stoneTile.complete && stoneTile.naturalWidth > 0) {
      for (let x = 0; x < w; x += 32) {
        ctx.drawImage(stoneTile, x, beltY + 16, 32, fHeight);
      }
    } else {
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, beltY + 16, w, fHeight);
    }

    // Moving water current
    const waterHeight = 16;
    if (waterTile && waterTile.complete && waterTile.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, beltY, w, waterHeight);
      ctx.clip();

      for (let x = -32 + waterOffsetRef.current; x < w + 32; x += 32) {
        ctx.drawImage(waterTile, x, beltY, 32, waterHeight);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.7)';
      ctx.fillRect(0, beltY, w, waterHeight);
    }

    // Foam reflection line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(0, beltY, w, 2);

    // Redstone power wire
    ctx.strokeStyle = activeHazard ? '#ef4444' : '#b91c1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, beltY + 16 + fHeight + 2);
    ctx.lineTo(w, beltY + 16 + fHeight + 2);
    ctx.stroke();
  };

  const drawObserverScanner = (ctx, scanX, beltY) => {
    const obsImg = loadTexture(SCENE_TEXTURES.observer);
    const lampImg = activeHazard
      ? loadTexture(SCENE_TEXTURES.redstoneLampOn)
      : loadTexture(SCENE_TEXTURES.redstoneLamp);

    ctx.imageSmoothingEnabled = false;
    const obsSize = 36;
    const obsY = beltY - 140;

    if (obsImg && obsImg.complete && obsImg.naturalWidth > 0) {
      ctx.drawImage(obsImg, scanX - obsSize / 2, obsY, obsSize, obsSize);
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(scanX - obsSize / 2, obsY, obsSize, obsSize);
    }

    const lampSize = 28;
    if (lampImg && lampImg.complete && lampImg.naturalWidth > 0) {
      ctx.drawImage(lampImg, scanX - lampSize / 2, obsY - lampSize, lampSize, lampSize);
    }

    const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.012);
    const beamColor = activeHazard
      ? `rgba(239, 68, 68, ${pulse})`
      : `rgba(56, 189, 248, ${pulse})`;

    ctx.fillStyle = beamColor;
    ctx.fillRect(scanX - 2, obsY + obsSize, 4, beltY - (obsY + obsSize) + 4);

    const grad = ctx.createLinearGradient(scanX - 16, 0, scanX + 16, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.5, activeHazard ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(scanX - 16, obsY + obsSize, 32, beltY - (obsY + obsSize));

    ctx.fillStyle = activeHazard ? '#f87171' : '#38bdf8';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('JEV SCAN', scanX, obsY - lampSize - 6);
  };

  const drawMechanicalPistons = (ctx, beltY) => {
    const pSide = loadTexture(SCENE_TEXTURES.pistonSide);
    const pTop = loadTexture(SCENE_TEXTURES.pistonTop);
    const pInner = loadTexture(SCENE_TEXTURES.pistonInner);

    ctx.imageSmoothingEnabled = false;

    CHESTS_CONFIG.forEach((chest, i) => {
      const px = chest.x;
      const baseY = beltY - 110;
      const ext = pistonStatesRef.current[i] * 36;

      if (pSide && pSide.complete && pSide.naturalWidth > 0) {
        ctx.drawImage(pSide, px - 18, baseY, 36, 32);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(px - 18, baseY, 36, 32);
      }

      if (ext > 2) {
        if (pInner && pInner.complete && pInner.naturalWidth > 0) {
          ctx.drawImage(pInner, px - 6, baseY + 32, 12, ext);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(px - 6, baseY + 32, 12, ext);
        }
      }

      if (pTop && pTop.complete && pTop.naturalWidth > 0) {
        ctx.drawImage(pTop, px - 18, baseY + 32 + ext, 36, 12);
      } else {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px - 18, baseY + 32 + ext, 36, 12);
      }
    });

    for (let i = 0; i < pistonStatesRef.current.length; i++) {
      if (pistonStatesRef.current[i] > 0) {
        pistonStatesRef.current[i] = Math.max(0, pistonStatesRef.current[i] - 0.1);
      }
    }
  };

  const drawHoppersAndChests = (ctx, beltY) => {
    const hopperImg = loadTexture(SCENE_TEXTURES.hopper);
    const barrelSide = loadTexture(SCENE_TEXTURES.barrelSide);
    const barrelOpen = loadTexture(SCENE_TEXTURES.barrelTopOpen);
    const lavaImg = loadTexture(SCENE_TEXTURES.lavaStill) || loadTexture(SCENE_TEXTURES.lavaFlow);

    ctx.imageSmoothingEnabled = false;

    CHESTS_CONFIG.forEach((chest, i) => {
      const cx = chest.x;
      const hopperY = beltY + 24;
      const bounce = chestBounceRef.current[i] * 8;
      const chestY = hopperY + 30 - bounce;

      // Hopper
      if (hopperImg && hopperImg.complete && hopperImg.naturalWidth > 0) {
        ctx.drawImage(hopperImg, cx - 18, hopperY, 36, 28);
      } else {
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(cx - 16, hopperY, 32, 24);
      }

      // Barrel / Chest
      const bW = 40;
      const bH = 40;
      const imgToUse = chestBounceRef.current[i] > 0.3 ? barrelOpen : barrelSide;

      if (imgToUse && imgToUse.complete && imgToUse.naturalWidth > 0) {
        ctx.drawImage(imgToUse, cx - bW / 2, chestY, bW, bH);
      } else {
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(cx - bW / 2, chestY, bW, bH);
      }

      ctx.fillStyle = chest.color;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(chest.icon, cx, chestY + bH + 16);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`CHEST ${i + 1}`, cx, chestY + bH + 28);

      if (chestBounceRef.current[i] > 0) {
        chestBounceRef.current[i] = Math.max(0, chestBounceRef.current[i] - 0.08);
      }
    });

    // Lava disposal pit
    const lavaX = 990;
    const lavaW = 48;
    const lavaH = 70;
    if (lavaImg && lavaImg.complete && lavaImg.naturalWidth > 0) {
      ctx.drawImage(lavaImg, lavaX - lavaW / 2, beltY + 16, lavaW, lavaH);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(lavaX - lavaW / 2, beltY + 16, lavaW, lavaH);
    }
    ctx.fillStyle = '#f97316';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LAVA PIT', lavaX, beltY + lavaH + 28);
  };

  // Entities motion and drawing
  const updateAndDrawEntities = (ctx, canvasWidth, beltY, beltSpeed) => {
    const scannerX = 260;
    const nextEntities = [];

    entitiesRef.current.forEach(block => {
      if (draggedItemRef.current && draggedItemRef.current.id === block.id) {
        nextEntities.push(block);
        drawBlock(ctx, block);
        return;
      }

      if (block.isFreeFalling) {
        block.x += block.vx;
        block.y += block.vy;
        block.vy += 0.5;

        if (block.y >= beltY - 14 && block.vy > 0) {
          block.y = beltY - 14;
          block.vy = -block.vy * 0.2;
          block.vx *= 0.7;
          if (Math.abs(block.vy) < 0.6) {
            block.isFreeFalling = false;
            block.vy = 0;
            block.vx = beltSpeed;
          }
          spawnSplash(block.x, beltY);
        }
      } else {
        block.x += beltSpeed;
        block.y = beltY - 14 + Math.sin(Date.now() * 0.008 + block.x * 0.05) * 2;
      }

      if (!block.scanned && block.x >= scannerX) {
        block.scanned = true;
        spawnScannerSparks(scannerX, beltY - 14);
        if (onScanItem) onScanItem(block);
      }

      let sorted = false;
      if (block.classified && block.targetChestIndex !== undefined) {
        const chest = CHESTS_CONFIG[block.targetChestIndex];
        if (chest && Math.abs(block.x - chest.x) < 8) {
          sorted = true;
          pistonStatesRef.current[block.targetChestIndex] = 1.0;
          chestBounceRef.current[block.targetChestIndex] = 1.0;
          spawnChestParticles(chest.x, beltY + 30, chest.color);

          // Anti-collision floating text: stack above existing active labels at this chest
          let initialY = beltY - 26;
          const nearby = floatingTextsRef.current.filter(t => Math.abs(t.x - chest.x) < 45 && t.alpha > 0.3);
          if (nearby.length > 0) {
            const minY = Math.min(...nearby.map(t => t.y));
            initialY = minY - 18;
          }

          floatingTextsRef.current.push({
            text: `+1 ${block.displayName || block.nameRu || block.name}`,
            x: chest.x,
            y: initialY,
            color: chest.color,
            alpha: 1.0
          });

          if (onItemSorted) onItemSorted(block, chest);
        }
      }

      if (block.x > canvasWidth - 24) {
        sorted = true;
        spawnChestParticles(canvasWidth - 24, beltY + 20, '#ef4444');
        floatingTextsRef.current.push({
          text: `🔥 Сгорело`,
          x: canvasWidth - 40,
          y: beltY - 20,
          color: '#ef4444',
          alpha: 1.0
        });
      }

      if (!sorted) {
        nextEntities.push(block);
        drawBlock(ctx, block);
      }
    });

    if (entitiesRef.current.length !== nextEntities.length) {
      entitiesRef.current = nextEntities;
      if (onCountChange) onCountChange(entitiesRef.current.length);
    }
  };

  const drawBlock = (ctx, block) => {
    const img = loadTexture(block.texture);
    const size = 32;

    ctx.save();
    ctx.translate(block.x, block.y);

    if (block.isHazardous) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }

    if (block.scanned && !block.classified) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8);
    }

    ctx.restore();
  };

  // Authentic Minecraft Tooltip (dark purple box with border)
  const drawMinecraftTooltip = (ctx, block) => {
    const title = block.nameRu || block.name;
    const sub = `minecraft:${block.id || 'item'}`;

    ctx.save();
    ctx.font = 'bold 12px Inter, sans-serif';
    const tWidth = ctx.measureText(title).width;
    ctx.font = '10px monospace';
    const sWidth = ctx.measureText(sub).width;
    const boxW = Math.max(tWidth, sWidth) + 24;
    const boxH = 46;

    let bx = block.x + 16;
    let by = block.y - boxH - 8;
    if (bx + boxW > 1020) bx = block.x - boxW - 16;
    if (by < 10) by = block.y + 36;

    // Outer dark border & background
    ctx.fillStyle = 'rgba(16, 17, 24, 0.96)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#272b3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, boxH);

    // Inner subtle glow border
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 2, by + 2, boxW - 4, boxH - 4);

    // Title
    ctx.fillStyle = block.rarityTier === 2 ? '#fbbf24' : '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, bx + 10, by + 19);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(sub, bx + 10, by + 35);

    ctx.restore();
  };

  const spawnSplash = (x, y) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3 - 1,
        color: '#38bdf8',
        size: 2 + Math.random() * 2,
        life: 18,
        maxLife: 18
      });
    }
  };

  const spawnScannerSparks = (x, y) => {
    for (let i = 0; i < 14; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        color: Math.random() > 0.4 ? '#38bdf8' : '#e0f2fe',
        size: 3,
        life: 25,
        maxLife: 25
      });
    }
  };

  const spawnChestParticles = (x, y, color) => {
    for (let i = 0; i < 16; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 2,
        color: color,
        size: 3 + Math.random() * 2,
        life: 30,
        maxLife: 30
      });
    }
  };

  const updateParticles = (ctx) => {
    const alive = [];
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      const alpha = p.life / p.maxLife;

      if (p.life > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillRect(p.x, p.y, p.size, p.size);
        alive.push(p);
      }
    });
    ctx.globalAlpha = 1.0;
    particlesRef.current = alive;
  };

  const updateFloatingTexts = (ctx) => {
    const alive = [];
    floatingTextsRef.current.forEach(t => {
      t.y -= 0.8;
      t.alpha -= 0.02;
      if (t.alpha > 0) {
        ctx.save();
        ctx.fillStyle = t.color;
        ctx.globalAlpha = Math.min(1.0, t.alpha);
        ctx.font = 'bold 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
        alive.push(t);
      }
    });
    floatingTextsRef.current = alive;
  };

  // Pointer interactions
  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / rect.width;
    const sy = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy
    };
  };

  const handlePointerDown = (e) => {
    if (onUserInteract) onUserInteract();
    const coords = getCoords(e);
    lastMousePosRef.current = { x: coords.x, y: coords.y, time: Date.now() };

    for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
      const b = entitiesRef.current[i];
      if (Math.hypot(b.x - coords.x, b.y - coords.y) < 28) {
        draggedItemRef.current = b;
        b.isFreeFalling = true;
        return;
      }
    }

    if (selectedToolBlock) {
      loadTexture(selectedToolBlock.texture);
      const newEntity = {
        ...selectedToolBlock,
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: coords.x,
        y: coords.y,
        vx: 0,
        vy: 2,
        isFreeFalling: true,
        scanned: false,
        classified: false
      };
      entitiesRef.current.push(newEntity);
      if (onCountChange) onCountChange(entitiesRef.current.length);
    }
  };

  const handlePointerMove = (e) => {
    const coords = getCoords(e);
    const now = Date.now();
    const dt = Math.max(1, now - lastMousePosRef.current.time);

    mouseVelRef.current = {
      vx: (coords.x - lastMousePosRef.current.x) / dt * 16,
      vy: (coords.y - lastMousePosRef.current.y) / dt * 16
    };

    lastMousePosRef.current = { x: coords.x, y: coords.y, time: now };

    if (draggedItemRef.current) {
      draggedItemRef.current.x = coords.x;
      draggedItemRef.current.y = coords.y;
    } else {
      // Check hover
      let found = null;
      for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
        const b = entitiesRef.current[i];
        if (Math.hypot(b.x - coords.x, b.y - coords.y) < 24) {
          found = b;
          break;
        }
      }
      hoveredBlockRef.current = found;
    }
  };

  const handlePointerUp = () => {
    if (draggedItemRef.current) {
      const it = draggedItemRef.current;
      it.vx = Math.max(-8, Math.min(8, mouseVelRef.current.vx));
      it.vy = Math.max(-10, Math.min(6, mouseVelRef.current.vy));
      it.isFreeFalling = true;
      draggedItemRef.current = null;
    }
  };

  // Drag-and-drop from outside (HTML5 drag)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const blockData = e.dataTransfer.getData('application/json');
    if (!blockData) return;
    try {
      const block = JSON.parse(blockData);
      const coords = getCoords(e);
      if (onDropCatalogBlock) {
        onDropCatalogBlock(block, coords.x, coords.y);
      }
    } catch (err) {}
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative w-full overflow-hidden rounded-lg border-4 border-[#1e1f29] bg-[#12131a] shadow-2xl"
    >
      <canvas
        ref={canvasRef}
        width={1040}
        height={340}
        className="w-full h-auto cursor-grab active:cursor-grabbing block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div className="absolute bottom-2 left-4 text-[10px] text-yellow-300/80 font-pixel pointer-events-none drop-shadow">
        ⛏️ Кликайте или перетаскивайте блоки мышкой прямо в поток воды!
      </div>
    </div>
  );
});

export default ConveyorCanvas;
