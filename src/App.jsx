import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Package, Activity, Inbox } from 'lucide-react';
import Header from './components/Header';
import FactoryFloorCanvas from './components/FactoryFloorCanvas';
import TelemetryHUD from './components/TelemetryHUD';
import ChestsView from './components/ChestsView';
import CreativeInventory from './components/CreativeInventory';
import AboutModal from './components/AboutModal';
import ChestModal from './components/ChestModal';
import PolicyStudioModal from './components/PolicyStudioModal';
import { BRANCHES, sampleCryptographicRandom } from './factory-engine';

const initialBays = () => Object.fromEntries(BRANCHES.map(b => [b.id, []]));
const money = n => `${n / 1000000000n}.${(n % 1000000000n).toString().padStart(9, '0')}`;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = e => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

const VALID_HOLD_POLICIES = new Set(['manual', 'auto_store', 'auto_shunt']);
function getValidHoldPolicy(val) {
  return VALID_HOLD_POLICIES.has(val) ? val : 'manual';
}

export default function App() {
  const isMobile = useIsMobile();
  const factory = useRef(null);
  const [blocks, setBlocks] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [currentProgramId, setCurrentProgramId] = useState('storage');
  const [pipelineMode, setPipelineMode] = useState('parallel'); // 'parallel' | 'triage'
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [reload, setReload] = useState(0);
  const [health, setHealth] = useState('loading');
  const [transit, setTransit] = useState(0);
  const [bays, setBays] = useState(initialBays);
  const [diverted, setDiverted] = useState(0);
  const [inspection, setInspection] = useState(null);
  const [lastRecord, setLastRecord] = useState(null);
  const [heldQueue, setHeldQueue] = useState([]);
  const [session, setSession] = useState({ units: 0n, spend: '0.000000000', unknown: 0 });
  const [pending, setPending] = useState(0);
  const [autoSpawn, setAutoSpawn] = useState(false);
  const [spawnSpeed, setSpawnSpeed] = useState(1);
  const [selectedToolBlock, setSelectedToolBlock] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [status, setStatus] = useState('Select any block or mob to spawn onto conveyor.');
  const [showGuide, setShowGuide] = useState(false);
  const [showPolicyStudio, setShowPolicyStudio] = useState(false);
  const [customPolicy, setCustomPolicy] = useState(null);
  const [activeProgramDraft, setActiveProgramDraft] = useState(null);
  const [activeChestBranchId, setActiveChestBranchId] = useState(null);
  const [highlightBranchId, setHighlightBranchId] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [mobileTab, setMobileTab] = useState('catalog'); // 'catalog' | 'telemetry' | 'bays'
  const [holdPolicy, setHoldPolicy] = useState(() => {
    try { return getValidHoldPolicy(localStorage.getItem('jev_hold_policy')); } catch { return 'manual'; }
  }); // 'manual' | 'auto_store' | 'auto_shunt'

  const audio = useRef(null);
  const timers = useRef(new Set());
  const holdAutomationTimers = useRef(new Map());
  const releasedEntities = useRef(new Set());
  const generation = useRef(0);
  const alive = useRef(true);
  const requests = useRef(new Set());
  const muteRef = useRef(isMuted);
  muteRef.current = isMuted;

  // Stale closure guards for conveyor scans
  const currentProgramIdRef = useRef(currentProgramId);
  currentProgramIdRef.current = currentProgramId;
  const pipelineModeRef = useRef(pipelineMode);
  pipelineModeRef.current = pipelineMode;
  const customPolicyRef = useRef(customPolicy);
  customPolicyRef.current = customPolicy;
  const activeProgramDraftRef = useRef(activeProgramDraft);
  activeProgramDraftRef.current = activeProgramDraft;
  const holdPolicyRef = useRef(holdPolicy);
  holdPolicyRef.current = holdPolicy;

  const sound = useCallback((frequency = 300) => {
    if (muteRef.current) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audio.current) audio.current = new Audio();
      const ctx = audio.current;
      if (ctx.state !== 'running') {
        ctx.resume().catch(() => {});
        return;
      }
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      /* Audio availability does not affect routing */
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
      requests.current.forEach(c => c.abort());
      audio.current?.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCatalogError(null);
    fetch('/api/blocks', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => {
        if (!Array.isArray(data.blocks) || !data.blocks.length) throw new Error();
        setBlocks(data.blocks);
        setLoading(false);
        setInspection(data.blocks.find(b => b.id === 'create:mechanical_press') || data.blocks[0]);
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          setCatalogError('The catalog could not be loaded.');
          setLoading(false);
        }
      });
    fetch('/api/programs', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.programs)) setPrograms(data.programs);
        if (data.defaultProgramId) setCurrentProgramId(data.defaultProgramId);
      })
      .catch(() => {});
    fetch('/api/health', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setHealth(data.apiKeyPresent ? 'configured' : 'unavailable'))
      .catch(e => {
        if (e.name !== 'AbortError') setHealth('unavailable');
      });
    return () => controller.abort();
  }, [reload]);

  const spawn = useCallback(
    block => {
      setShowWelcome(false);
      if (factory.current?.spawnBlock(block)) {
        sound(370);
        setStatus(`${block.name} entered the feeder.`);
      }
    },
    [sound]
  );

  useEffect(() => {
    if (!autoSpawn || !blocks.length) return;
    const timer = setInterval(() => {
      const picked = sampleCryptographicRandom(blocks, 1)[0];
      if (picked) spawn(picked);
    }, 1900 / spawnSpeed);
    return () => clearInterval(timer);
  }, [autoSpawn, blocks, spawnSpeed, spawn]);

  const batch = list => {
    if (!list.length) return;
    const sampled = sampleCryptographicRandom(list, 5);
    sampled.forEach((item, i) => {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        spawn(item);
      }, i * 260);
      timers.current.add(timer);
    });
  };

  const dropRandom = () => {
    if (!blocks.length) return;
    setShowWelcome(false);
    const picked = sampleCryptographicRandom(blocks, 1)[0];
    if (picked) {
      spawn(picked);
      setStatus(`🎲 Random drop: ${picked.name} (${picked.mod}) spawned onto feeder.`);
    }
  };

  const triggerDemoRun = useCallback(() => {
    if (!blocks.length) return;
    setShowWelcome(false);
    setStatus('🚀 Factory Demo initiated: launching 10 diverse items across all branches & hazard pit...');
    const demoItemIds = [
      'diamond_ore',
      'minecraft:oak_door',
      'create:mechanical_press',
      'ae2:controller',
      'botania:pure_daisy',
      'minecraft:diamond_sword',
      'minecraft:golden_carrot',
      'tnt',
      'minecraft:respawn_anchor',
      'minecraft:ender_pearl'
    ];
    const sequence = demoItemIds.map(id => blocks.find(b => b.id === id) || blocks[0]);
    sequence.forEach((blk, idx) => {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        spawn(blk);
      }, idx * 280);
      timers.current.add(timer);
    });
  }, [blocks, spawn]);

  const clear = () => {
    generation.current++;
    factory.current?.clearAll();
    setAutoSpawn(false);
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    holdAutomationTimers.current.forEach(clearTimeout);
    holdAutomationTimers.current.clear();
    releasedEntities.current.clear();
    setHeldQueue([]);
    setStatus('Conveyor cleared. In-flight API charges remain in session spend.');
  };

  const scan = useCallback(
    async item => {
      const startedGeneration = generation.current;
      const controller = new AbortController();
      requests.current.add(controller);
      setPending(n => n + 1);
      try {
        const res = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            name: item.name,
            description: item.description,
            mod: item.mod,
            programId: currentProgramIdRef.current,
            mode: pipelineModeRef.current,
            policy: customPolicyRef.current || undefined,
            programDraft: activeProgramDraftRef.current || undefined
          })
        });
        const result = await res.json();
        if (!res.ok || result.source === 'error') throw new Error(result.error || 'Classification unavailable');
        if (!alive.current) return;
        if (result.source === 'live')
          setSession(prev => {
            const units = prev.units + BigInt(result.chargeNanoUsd ?? '0');
            return { units, spend: money(units), unknown: prev.unknown + (result.chargeNanoUsd === null ? 1 : 0) };
          });
        setHealth('ready');
        if (generation.current === startedGeneration) {
          factory.current?.updateBlockClassification(item.entityId, result);
          setLastRecord({ item, result });

          if (result.action === 'hold') {
            setHeldQueue(prev => [...prev.filter(e => e.entityId !== item.entityId), item]);
            setStatus(`⚠️ INSPECTION HOLD: ${item.name} held for review (${result.actionReason})`);
            sound(440);

            const policy = holdPolicyRef.current;
            if (policy === 'auto_store' || policy === 'auto_shunt') {
              // Safety: If item has confirmed high hazard, never auto-store into normal bay!
              const targetAction = (policy === 'auto_store' && !result.isHazardous) ? 'store' : 'shunt';
              const timerId = setTimeout(() => {
                holdAutomationTimers.current.delete(item.entityId);
                if (generation.current === startedGeneration) {
                  handleReleaseHold(item.entityId, targetAction);
                }
              }, 700);
              holdAutomationTimers.current.set(item.entityId, timerId);
            }
          } else {
            setHeldQueue(prev => prev.filter(e => e.entityId !== item.entityId));
            setStatus(`${item.name}: ${result.isHazardous ? 'emergency blast pit' : BRANCHES.find(b => b.id === result.chest)?.name}.`);
            sound(result.isHazardous ? 140 : 620);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError' && alive.current && generation.current === startedGeneration) {
          factory.current?.failClassification(item.entityId, error.message);
          setLastRecord({ item, error: error.message });
          setHealth('unavailable');
          setStatus('Cargo held. Retry from the inspection dock.');
        }
      } finally {
        requests.current.delete(controller);
        if (alive.current) setPending(n => Math.max(0, n - 1));
      }
    },
    [sound]
  );

  const triggerQuarryRun = () => {
    if (!blocks.length) return;
    setStatus('⛏️ Quarry Run initiated: streaming 25 truly random items into the facility...');
    const sequence = sampleCryptographicRandom(blocks, 25);
    sequence.forEach((blk, idx) => {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        spawn(blk);
      }, idx * 280);
      timers.current.add(timer);
    });
  };

  const updateHoldPolicy = policy => {
    const valid = getValidHoldPolicy(policy);
    setHoldPolicy(valid);
    try { localStorage.setItem('jev_hold_policy', valid); } catch {}
    const label = valid === 'auto_store' ? 'Auto-Clear to Bay' : valid === 'auto_shunt' ? 'Auto-Shunt to Lava' : 'Manual Review';
    setStatus(`Hold policy updated: ${label}.`);

    // If switched to auto policy while items are currently in hold, trigger their release!
    if (valid === 'auto_store' || valid === 'auto_shunt') {
      const targetAction = valid === 'auto_store' ? 'store' : 'shunt';
      heldQueue.forEach(item => {
        if (!holdAutomationTimers.current.has(item.entityId) && !releasedEntities.current.has(item.entityId)) {
          const timerId = setTimeout(() => {
            holdAutomationTimers.current.delete(item.entityId);
            handleReleaseHold(item.entityId, targetAction);
          }, 400);
          holdAutomationTimers.current.set(item.entityId, timerId);
        }
      });
    } else {
      // Switched to manual: cancel any pending automated timers
      holdAutomationTimers.current.forEach(timerId => clearTimeout(timerId));
      holdAutomationTimers.current.clear();
    }
  };

  const handleReleaseHold = (entityId, action) => {
    if (releasedEntities.current.has(entityId)) return; // idempotent guard
    releasedEntities.current.add(entityId);

    // Cancel any pending automated timer
    if (holdAutomationTimers.current.has(entityId)) {
      clearTimeout(holdAutomationTimers.current.get(entityId));
      holdAutomationTimers.current.delete(entityId);
    }

    factory.current?.releaseHold(entityId, action);
    setHeldQueue(prev => prev.filter(e => e.entityId !== entityId));
    setStatus(`Cargo released: dispatched as ${action.toUpperCase()}.`);
    sound(action === 'shunt' ? 140 : 520);
  };

  const handleApplyPolicy = config => {
    if (config.programId) setCurrentProgramId(config.programId);
    if (config.policy) setCustomPolicy(config.policy);
    if (config.programDraft) setActiveProgramDraft(config.programDraft);
    setStatus(`Policy Studio: activated policy for [${config.programId.toUpperCase()}]. Applied to future conveyor scans.`);
    sound(580);
  };

  const sorted = useCallback(
    (item, branch) => {
      if (!branch) setDiverted(n => n + 1);
      else setBays(prev => ({ ...prev, [branch.id]: [...prev[branch.id], item] }));
      sound(220);
    },
    [sound]
  );

  // Read-only diagnostics for browser verification
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('diagnostics')) return;
    window.__factoryDiagnostics = {
      snapshot: () => factory.current?.snapshot(),
      performance: () => factory.current?.performance()
    };
    return () => {
      delete window.__factoryDiagnostics;
    };
  }, []);

  const totalReceived = Object.values(bays).reduce((n, items) => n + items.length, 0);

  return (
    <div className="app-shell">
      <Header
        isMuted={isMuted}
        toggleSound={() => {
          setIsMuted(v => !v);
          if (isMuted) {
            muteRef.current = false;
            sound();
          }
        }}
        health={health}
        count={blocks.length}
        onOpenAbout={() => setShowGuide(true)}
      />

      <main className="workbench">
        {/* Topline summary */}
        <div className="workspace-topline">
          <div>
            <span className="eyebrow">TYPE-SAFE SYSTEM 1 CONVEYOR</span>
            <h2>A place for every block & mob.</h2>
          </div>
          <div className="line-state">
            <span>{transit} in transit</span>
            <span>{totalReceived} received</span>
            <span data-testid="diverted-count">{diverted} diverted</span>
          </div>
        </div>

        {/* Unified Responsive Factory Layout (Single Persistent Canvas) */}
        <div className="factory-layout">
          <div className="factory-column">
            <div className="factory-canvas-stage">
              <FactoryFloorCanvas
                ref={factory}
                blocks={blocks}
                onScanItem={scan}
                onItemSorted={sorted}
                onCountChange={setTransit}
                onInspect={setInspection}
                onStatus={setStatus}
                selectedToolBlock={selectedToolBlock}
                highlightBranchId={highlightBranchId}
                showWelcome={showWelcome && transit === 0 && totalReceived === 0}
                onDismissWelcome={() => setShowWelcome(false)}
                onRunDemo={triggerDemoRun}
              />
            </div>
            {/* Desktop Receiving Bays */}
            {!isMobile && (
              <ChestsView
                chestInventories={bays}
                onClearChest={id => setBays(prev => ({ ...prev, [id]: [] }))}
                onOpenChest={setActiveChestBranchId}
                onHoverBranch={setHighlightBranchId}
                highlightBranchId={highlightBranchId}
              />
            )}
          </div>

          {/* Desktop Telemetry HUD */}
          {!isMobile && (
            <TelemetryHUD
              inspection={inspection}
              lastRecord={lastRecord}
              session={session}
              pending={pending}
              onRetry={() => factory.current?.retryFailed()}
              onReleaseHold={handleReleaseHold}
              holdingEntity={heldQueue[0] || null}
              heldQueue={heldQueue}
              currentProgram={programs.find(p => p.id === currentProgramId)}
              holdPolicy={holdPolicy}
              onHoldPolicyChange={updateHoldPolicy}
            />
          )}
        </div>

        {/* Desktop Inventory Panel */}
        {!isMobile ? (
          <CreativeInventory
            blocks={blocks}
            onSpawnBlock={spawn}
            onSpawnBatch={batch}
            onDropRandom={dropRandom}
            onClearBelt={clear}
            autoSpawn={autoSpawn}
            setAutoSpawn={setAutoSpawn}
            spawnSpeed={spawnSpeed}
            setSpawnSpeed={setSpawnSpeed}
            selectedToolBlock={selectedToolBlock}
            setSelectedToolBlock={setSelectedToolBlock}
            onInspect={setInspection}
            loading={loading}
            error={catalogError}
            onReload={() => setReload(n => n + 1)}
            programs={programs}
            currentProgramId={currentProgramId}
            onChangeProgram={setCurrentProgramId}
            pipelineMode={pipelineMode}
            onTogglePipelineMode={() => setPipelineMode(m => (m === 'parallel' ? 'triage' : 'parallel'))}
            onTriggerQuarryRun={triggerQuarryRun}
            onTriggerDemoRun={triggerDemoRun}
            onOpenPolicyStudio={() => setShowPolicyStudio(true)}
          />
        ) : (
          /* Mobile View Selector & Active Tab Panel (max-width: 768px) */
          <div className="mobile-only mobile-controls-container">
            <nav className="mobile-tab-bar" aria-label="Mobile View Selector">
              <button
                className={mobileTab === 'catalog' ? 'active' : ''}
                onClick={() => setMobileTab('catalog')}
                aria-pressed={mobileTab === 'catalog'}
              >
                <Package size={14} className="shrink-0" /> Catalog <span className="tab-badge">{blocks.length}</span>
              </button>
              <button
                className={mobileTab === 'telemetry' ? 'active' : ''}
                onClick={() => setMobileTab('telemetry')}
                aria-pressed={mobileTab === 'telemetry'}
              >
                <Activity size={14} className="shrink-0" /> Telemetry
                {heldQueue.length > 0 ? (
                  <span className="tab-badge bg-amber-500 text-black font-bold animate-pulse">{heldQueue.length} HOLD</span>
                ) : pending > 0 ? (
                  <span className="tab-badge live-pulse">{pending}</span>
                ) : null}
              </button>
              <button
                className={mobileTab === 'bays' ? 'active' : ''}
                onClick={() => setMobileTab('bays')}
                aria-pressed={mobileTab === 'bays'}
              >
                <Inbox size={14} className="shrink-0" /> Bays <span className="tab-badge">{totalReceived}</span>
              </button>
            </nav>

            <div className="mobile-panel-content">
              {mobileTab === 'catalog' && (
                <CreativeInventory
                  blocks={blocks}
                  onSpawnBlock={spawn}
                  onSpawnBatch={batch}
                  onDropRandom={dropRandom}
                  onClearBelt={clear}
                  autoSpawn={autoSpawn}
                  setAutoSpawn={setAutoSpawn}
                  spawnSpeed={spawnSpeed}
                  setSpawnSpeed={setSpawnSpeed}
                  selectedToolBlock={selectedToolBlock}
                  setSelectedToolBlock={setSelectedToolBlock}
                  onInspect={setInspection}
                  loading={loading}
                  error={catalogError}
                  onReload={() => setReload(n => n + 1)}
                  programs={programs}
                  currentProgramId={currentProgramId}
                  onChangeProgram={setCurrentProgramId}
                  pipelineMode={pipelineMode}
                  onTogglePipelineMode={() => setPipelineMode(m => (m === 'parallel' ? 'triage' : 'parallel'))}
                  onTriggerQuarryRun={triggerQuarryRun}
                  onTriggerDemoRun={triggerDemoRun}
                />
              )}

              {mobileTab === 'telemetry' && (
                <TelemetryHUD
                  inspection={inspection}
                  lastRecord={lastRecord}
                  session={session}
                  pending={pending}
                  onRetry={() => factory.current?.retryFailed()}
                  onReleaseHold={handleReleaseHold}
                  holdingEntity={heldQueue[0] || null}
                  heldQueue={heldQueue}
                  currentProgram={programs.find(p => p.id === currentProgramId)}
                  holdPolicy={holdPolicy}
                  onHoldPolicyChange={updateHoldPolicy}
                />
              )}

              {mobileTab === 'bays' && (
                <div className="mobile-bays-wrapper">
                  <ChestsView
                    chestInventories={bays}
                    onClearChest={id => setBays(prev => ({ ...prev, [id]: [] }))}
                    onOpenChest={setActiveChestBranchId}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <span role="status">{status}</span>
        <span>
          TypeSafe AI / Jev System 1 <span className="footer-separator">·</span> Real API. Sub-second Typed Decisions.
        </span>
      </footer>

      {/* Interactive Guide / Onboarding Modal */}
      <AboutModal isOpen={showGuide} onClose={() => setShowGuide(false)} count={blocks.length} />

      {/* Policy Studio / Programmable Jev Modal */}
      <PolicyStudioModal
        isOpen={showPolicyStudio}
        onClose={() => setShowPolicyStudio(false)}
        programs={programs}
        currentProgramId={currentProgramId}
        currentPolicy={customPolicy}
        onApplyPolicy={handleApplyPolicy}
        catalog={blocks}
        sessionHistory={lastRecord ? [lastRecord] : []}
      />

      {/* Full Chest Inventory Inspection Modal */}
      <ChestModal
        isOpen={Boolean(activeChestBranchId)}
        branchConfig={BRANCHES.find(b => b.id === activeChestBranchId)}
        items={bays[activeChestBranchId] || []}
        onClose={() => setActiveChestBranchId(null)}
        onClearChest={id => setBays(prev => ({ ...prev, [id]: [] }))}
        onEjectItem={item => {
          setBays(prev => {
            const list = prev[activeChestBranchId] || [];
            const idx = list.findIndex(x => (x.catalogId || x.id) === (item.catalogId || item.id));
            if (idx === -1) return prev;
            const next = [...list];
            next.splice(idx, 1);
            return { ...prev, [activeChestBranchId]: next };
          });
          spawn(item);
        }}
      />
    </div>
  );
}
