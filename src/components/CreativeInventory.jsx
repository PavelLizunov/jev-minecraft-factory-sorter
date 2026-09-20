import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Play, Pause, Hammer, Plus, X, GitFork, Sliders, Zap, Dices } from 'lucide-react';
import { BRANCHES } from '../factory-engine';

export const MOD_FILTERS = {
  All: null,
  'Items & Materials': b => b.kind === 'item',
  'Mobs & Bosses': b =>
    b.category === 'mob_drops_and_food' ||
    b.id.includes('head') ||
    b.id.includes('skull') ||
    b.id.includes('spawner') ||
    b.id.includes('egg'),
  Vanilla: ['Vanilla'],
  Create: ['Create'],
  AE2: ['AE2'],
  'Industrial & Tech': ['IndustrialCraft 2', 'GregTech', 'Thermal Expansion', 'Immersive Engineering', "Tinkers' Construct", 'Ender IO'],
  Mekanism: ['Mekanism'],
  Magic: ['Botania', 'Thaumcraft', 'Blood Magic'],
  Endgame: ['Draconic Evolution', 'Avaritia']
};

export default function CreativeInventory({
  blocks,
  onSpawnBlock,
  onSpawnBatch,
  onDropRandom,
  onClearBelt,
  autoSpawn,
  setAutoSpawn,
  spawnSpeed,
  setSpawnSpeed,
  selectedToolBlock,
  setSelectedToolBlock,
  onInspect,
  loading,
  error,
  onReload,
  programs = [],
  currentProgramId,
  onChangeProgram,
  pipelineMode = 'parallel',
  onTogglePipelineMode,
  onTriggerQuarryRun,
  onTriggerDemoRun,
  onOpenPolicyStudio
}) {
  const [mod, setMod] = useState('All');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const dialog = useRef(null);
  const searchRef = useRef(null);

  const index = useMemo(
    () =>
      blocks.map(b => ({
        block: b,
        search: `${b.name} ${b.mod} ${b.id} ${b.description}`.toLowerCase()
      })),
    [blocks]
  );

  const filtered = useMemo(() => {
    const filterRule = MOD_FILTERS[mod];
    return index
      .filter(({ block, search }) => {
        const matchesMod = !filterRule
          ? true
          : typeof filterRule === 'function'
            ? filterRule(block)
            : filterRule.includes(block.mod);

        const matchesCat = category === 'all' || category === block.category;
        const matchesKind = kindFilter === 'all' || block.kind === kindFilter;
        const matchesQuery = !query.trim() || search.includes(query.trim().toLowerCase());
        return matchesMod && matchesCat && matchesKind && matchesQuery;
      })
      .map(x => x.block);
  }, [index, mod, query, category, kindFilter]);

  const hotbar = useMemo(() => {
    const ids = [
      'create:mechanical_press',
      'ae2:controller',
      'ae2:drive',
      'mekanism:digital_miner',
      'botania:pure_daisy',
      'ic2:nuclear_reactor',
      'minecraft:creeper_head',
      'minecraft:warden_spawn_egg',
      'tnt'
    ];
    return ids.map(id => blocks.find(b => b.id === id)).filter(Boolean);
  }, [blocks]);

  const launch = block => {
    onSpawnBlock(block);
    setSelectedToolBlock(block);
    onInspect(block);
  };

  useEffect(() => {
    const handler = e => {
      if (
        /input|textarea|select/i.test(e.target.tagName) ||
        e.target.isContentEditable ||
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        dialog.current?.open ||
        document.querySelector('.modal-backdrop')
      )
        return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (/^[1-9]$/.test(e.key) && hotbar[Number(e.key) - 1]) {
        e.preventDefault();
        launch(hotbar[Number(e.key) - 1]);
      }
      if (e.key === 'Escape') setSelectedToolBlock(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hotbar, launch, setSelectedToolBlock]);

  const submit = e => {
    e.preventDefault();
    if (!customName.trim()) return;
    const block = {
      id: `custom:${Date.now()}`,
      name: customName.trim(),
      mod: 'Custom',
      category: 'custom',
      description: customDesc.trim() || 'A custom real-world entity submitted for zero-shot Jev classification.',
      texture: '/textures/scene/iron_block.png'
    };
    launch(block);
    setCustomName('');
    setCustomDesc('');
    dialog.current.close();
  };

  return (
    <section className="inventory-panel" aria-label="Creative inventory">
      {/* Top Toolbar */}
      <div className="inventory-toolbar">
        <div className="inventory-heading">
          <h2>Creative inventory</h2>
          <span className="muted mono" data-testid="inventory-count">
            {filtered.length} / {blocks.length}
          </span>
        </div>
        <div className="spawn-controls">
          {/* Program Preset Selector */}
          <div className="flex items-center gap-1 bg-[#101713] px-2 py-0.5 rounded border border-[#2d3e31]" title="Select active Jev System 1 program policy">
            <Sliders size={12} className="text-cyan-400 shrink-0" />
            <select
              aria-label="Active Jev Program"
              value={currentProgramId || 'storage'}
              onChange={e => onChangeProgram?.(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-gray-200 cursor-pointer p-0 focus:ring-0"
            >
              {programs.map(p => (
                <option key={p.id} value={p.id} className="bg-[#19221d] text-gray-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cluster 1: AI Processing & Policy */}
          <div className="flex items-center gap-1 bg-[#141b17] p-0.5 rounded border border-[#2e3e33]" title="AI Processing & Policy Tuning">
            <button
              type="button"
              className={`button text-xs py-1 px-2 ${pipelineMode === 'triage' ? 'border-cyan-500 bg-cyan-950/60 text-cyan-200' : ''}`}
              onClick={onTogglePipelineMode}
              title={
                pipelineMode === 'triage'
                  ? 'Triage Pipeline: Stage 1 Gatekeeper filters hazards early, saving tokens!'
                  : 'Parallel Scan: Single all-in-one call evaluates all questions simultaneously.'
              }
            >
              <GitFork size={12} />
              <span className="hidden sm:inline">{pipelineMode === 'triage' ? 'Triage' : 'Parallel'}</span>
            </button>
            <button
              type="button"
              className="button text-xs py-1 px-2.5 bg-amber-950/60 border-amber-600/60 text-amber-200 hover:bg-amber-900/60"
              onClick={onTriggerQuarryRun}
              title="Stream 25 cryptographically random items from catalog without duplicates"
            >
              <Zap size={12} className="text-amber-400" />
              <span>Quarry Run (25)</span>
            </button>
            <button
              type="button"
              className="button text-xs py-1 px-2"
              onClick={onOpenPolicyStudio}
              title="Open Policy Studio to edit natural-language criteria and tune decision thresholds"
            >
              <Sliders size={12} className="text-cyan-400" />
              <span className="hidden sm:inline">Policy Studio</span>
            </button>
          </div>

          {/* Cluster 2: Logistics & Spawning */}
          <div className="flex items-center gap-1 bg-[#141b17] p-0.5 rounded border border-[#2e3e33]" title="Logistics & Item Spawning">
            <button
              className={autoSpawn ? 'button primary' : 'button'}
              onClick={() => setAutoSpawn(!autoSpawn)}
              aria-pressed={autoSpawn}
              title={autoSpawn ? 'Pause automatic conveyor feed' : 'Continuously spawn random items'}
            >
              {autoSpawn ? <Pause size={13} /> : <Play size={13} />}
              {autoSpawn ? 'Stop feed' : 'Auto feed'}
            </button>
            <label className="speed-control" title="Conveyor feed speed rate">
              <span className="sr-only">Feed speed</span>
              <select aria-label="Feed speed" value={spawnSpeed} onChange={e => setSpawnSpeed(Number(e.target.value))}>
                <option value="1">1×</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
              </select>
            </label>
            <button className="button" onClick={() => onSpawnBatch(filtered)} disabled={!filtered.length} title="Spawn 5 items from current filter">
              <Plus size={13} />
              Spawn 5
            </button>
            <button
              type="button"
              className="button bg-cyan-950/80 border-cyan-500/80 text-cyan-200 hover:bg-cyan-900/80 font-semibold"
              onClick={onTriggerDemoRun}
              title="Launch instant 10-item demonstration across all 6 branches, lava pit, and siding"
            >
              <Play size={13} className="text-cyan-400 fill-cyan-400" />
              <span>🚀 Demo Run (10)</span>
            </button>
            <button
              type="button"
              className="button bg-emerald-950/70 border-emerald-600/70 text-emerald-200 hover:bg-emerald-900/70 font-medium"
              onClick={onDropRandom}
              title="Toss 1 cryptographically random item from the entire 1231-item catalog"
            >
              <Dices size={13} className="text-emerald-400" />
              <span>🎲 Toss Random</span>
            </button>
            <button className="button" onClick={() => dialog.current.showModal()} title="Test custom prompt with zero-shot Jev classification">
              <Hammer size={13} />
              Anvil
            </button>
          </div>

          {/* Cluster 3: Belt Management */}
          <button className="button subtle text-gray-400 hover:text-red-300 hover:border-red-800" onClick={onClearBelt} title="Clear all in-flight conveyor items (in-flight charges still count)">
            Clear belt
          </button>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="inventory-filters">
        <div className="mod-tabs" role="group" aria-label="Mod Filter">
          {Object.keys(MOD_FILTERS).map(label => (
            <button
              key={label}
              className={mod === label ? 'active' : ''}
              aria-pressed={mod === label}
              onClick={() => setMod(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inventory-search">
          <label className="search-box">
            <Search size={15} />
            <input
              ref={searchRef}
              aria-label="Search blocks"
              placeholder="Search blocks, mobs, machinery…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </label>
          <select aria-label="Kind filter" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>
            <option value="all">All forms</option>
            <option value="item">Items (2D)</option>
            <option value="block">Blocks (3D)</option>
          </select>
          <select aria-label="Category filter" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {BRANCHES.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Block Slot Grid */}
      <div className="block-grid" data-testid="block-grid">
        {loading ? (
          <p className="inventory-message" role="status">
            Loading {blocks.length || 755} blocks & mobs…
          </p>
        ) : error ? (
          <div className="inventory-message error-box" role="alert">
            {error}
            <button onClick={onReload}>Reload catalog</button>
          </div>
        ) : !filtered.length ? (
          <p className="inventory-message">
            No blocks or mobs match these filters.{' '}
            <button
              className="text-button"
              onClick={() => {
                setQuery('');
                setMod('All');
                setCategory('all');
              }}
            >
              Reset filters
            </button>
          </p>
        ) : (
          filtered.map(block => (
            <button
              key={block.id}
              className={`block-slot ${selectedToolBlock?.id === block.id ? 'selected' : ''}`}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('text/plain', block.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => launch(block)}
              onMouseEnter={() => onInspect(block)}
              onFocus={() => onInspect(block)}
              aria-label={`Spawn ${block.name} (${block.mod})`}
              title={`${block.name} · ${block.mod}`}
              data-block-id={block.id}
              data-mod={block.mod}
            >
              <img src={block.texture} alt="" className="pixelated" loading="lazy" />
              {block.isHazard && <span className="hazard-indicator" title="Hazardous entity">!</span>}
            </button>
          ))
        )}
      </div>

      {/* Hotbar Row */}
      <div className="hotbar-row">
        <span className="hotbar-label">
          Quick spawn <small>KEYS 1–9</small>
        </span>
        <div className="hotbar" aria-label="Quick-spawn hotbar">
          {hotbar.map((block, i) => (
            <button
              key={block.id}
              className="hotbar-slot"
              onClick={() => launch(block)}
              onFocus={() => onInspect(block)}
              onMouseEnter={() => onInspect(block)}
              aria-label={`Quick spawn ${block.name}`}
              title={`${i + 1}: ${block.name}`}
            >
              <kbd>{i + 1}</kbd>
              <img src={block.texture} alt="" className="pixelated" />
            </button>
          ))}
        </div>
        <span className="hotbar-help">
          Click to spawn · Drag onto the floor
          <br />
          <span className="muted">Escape clears the selected placement tool</span>
        </span>
      </div>

      {/* The Anvil (Custom Entity Dialog) */}
      <dialog ref={dialog} className="anvil-dialog" aria-labelledby="anvil-title">
        <form onSubmit={submit}>
          <div className="dialog-title">
            <Hammer size={22} />
            <div>
              <span className="eyebrow">CUSTOM ENTITY INSPECTOR</span>
              <h2 id="anvil-title">The Anvil</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close Anvil" onClick={() => dialog.current.close()}>
              <X size={20} />
            </button>
          </div>
          <p>Give Jev an unfamiliar real-world object. The System 1 sensor will decide its route and hazard status instantly.</p>
          <label>
            Entity name
            <input
              autoFocus
              required
              maxLength={160}
              placeholder="e.g. Grandma's Raspberry Jam, Tesla Turbine, Nitro Tank"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={2000}
              rows={3}
              placeholder="e.g. Sweet homemade berry jam in a glass jar. Preserved edible fruit, not a machine."
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
            />
          </label>
          <p className="muted compact">Your text is sent to TypeSafe AI for classification. Do not include sensitive credentials.</p>
          <button className="button primary" type="submit">
            Launch onto feeder
          </button>
        </form>
      </dialog>
    </section>
  );
}
