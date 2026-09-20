import React from 'react';
import { X, Cpu, Zap, DollarSign, ShieldAlert, MousePointer2, AlertTriangle } from 'lucide-react';

export default function AboutModal({ isOpen, onClose, count }) {
  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const modalElement = document.querySelector('.modal-card');
    modalElement?.focus();

    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = modalElement?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow">SHOWCASE & ENGINEERING GUIDE</span>
            <h2 id="guide-title">Jev Minecraft Factory Sorter</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close Guide">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Section 1: Core Concept */}
          <div className="guide-section">
            <div className="guide-section-header">
              <Cpu className="text-cyan-400" size={18} />
              <h3>What is this showcase?</h3>
            </div>
            <p>
              This is a live industrial engineering demo connecting an interactive Minecraft factory conveyor
              to <strong>TypeSafe AI Jev</strong> (System 1 model). Blocks and entities travel down the feeder line
              into the circular Jev sensor, which performs typed categorical routing via HTTP roundtrips measured in milliseconds.
            </p>
          </div>

          {/* Section 2: System 1 vs Heavy LLM */}
          <div className="guide-section">
            <div className="guide-section-header">
              <Zap className="text-yellow-400" size={18} />
              <h3>System 1 Determinism vs General-Purpose LLMs</h3>
            </div>
            <p>
              General-purpose conversational LLMs are designed for open-ended text generation, where structured routing requires schema repair and multi-second execution.
            </p>
            <p className="mt-1">
              <strong>Jev</strong> operates as a specialized System 1 model: it evaluates input context directly into typed enums (<code>choice</code>),
              boolean predicates (<code>noul</code>), and ratings (<code>score</code>) with strict schema enforcement and calibrated probabilities.
            </p>
          </div>

          {/* Section 3: Honest Economics */}
          <div className="guide-section">
            <div className="guide-section-header">
              <DollarSign className="text-emerald-400" size={18} />
              <h3>Transparent Telemetry (Anti-Slop)</h3>
            </div>
            <p>
              No fake marketing badges or simulated numbers. The Telemetry HUD displays raw measurements:
            </p>
            <ul className="guide-list">
              <li><strong>HTTP Roundtrip:</strong> Exact backend monotonic clock latency through homelab proxy.</li>
              <li><strong>Token Usage:</strong> Actual response <code>input_tokens</code> and <code>output_tokens</code>.</li>
              <li><strong>Calculated Call Cost:</strong> Calculated strictly at <strong>$0.042 / 1M input tokens</strong> (output tokens free).</li>
              <li><strong>In-Memory Cache:</strong> Repeat classifications hit memory instantly with zero additional API charge ($0.000000000).</li>
            </ul>
          </div>

          {/* Section 4: Factory Floor & Hazardous Shunt */}
          <div className="guide-section">
            <div className="guide-section-header">
              <ShieldAlert className="text-red-400" size={18} />
              <h3>Conveyor Routes & Hazardous Blast Pit</h3>
            </div>
            <div className="guide-routes-grid">
              <div className="guide-route-item" style={{ borderColor: '#38bdf8' }}>
                <span className="route-dot" style={{ background: '#38bdf8' }} />
                <div>
                  <strong>Branch 01: Resources & Materials</strong>
                  <p>Raw ores, deepslate minerals, metal blocks, ingots (Steel, Manyullyn, Draconium, Enderium, Bronze), gems, crystals, dusts.</p>
                </div>
              </div>
              <div className="guide-route-item" style={{ borderColor: '#fb923c' }}>
                <span className="route-dot" style={{ background: '#fb923c' }} />
                <div>
                  <strong>Branch 02: Construction & Decor</strong>
                  <p>Planks, stone bricks, architectural casings (Andesite/Brass/Copper Casing), warded/seared glass, scaffolding, tiles, walls.</p>
                </div>
              </div>
              <div className="guide-route-item" style={{ borderColor: '#eab308' }}>
                <span className="route-dot" style={{ background: '#eab308' }} />
                <div>
                  <strong>Branch 03: Mechanics & Logistics</strong>
                  <p>Create kinetic shafts, gears, presses, belts, physical conveyors, chutes, hoppers, and Tinkers smeltery casting vats.</p>
                </div>
              </div>
              <div className="guide-route-item" style={{ borderColor: '#f87171' }}>
                <span className="route-dot" style={{ background: '#f87171' }} />
                <div>
                  <strong>Branch 04: Power & Digital Systems</strong>
                  <p>Nuclear reactors, dynamos, generators, RF energy cells, cables, redstone logic gates, AE2 ME drives, terminals, quantum bridges.</p>
                </div>
              </div>
              <div className="guide-route-item" style={{ borderColor: '#c084fc' }}>
                <span className="route-dot" style={{ background: '#c084fc' }} />
                <div>
                  <strong>Branch 05: Magic & Rituals</strong>
                  <p>Botania generating and functional flowers (Pure Daisy, Hydroangeas), mana pools, altars (Blood/Runic/Infusion), warded jars, catalysts, runes.</p>
                </div>
              </div>
              <div className="guide-route-item" style={{ borderColor: '#4ade80' }}>
                <span className="route-dot" style={{ background: '#4ade80' }} />
                <div>
                  <strong>Branch 06: Armory, Food & Organics</strong>
                  <p>Armor sets, weapons, combat equipment, tools, shields, mob heads, agricultural crops, food, and organic resources.</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-red-300/90 text-xs flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-red-400 shrink-0" />
              <span><strong>Emergency Shunt:</strong> If Jev flags an item as hazardous (TNT, armed explosives, radioactive fuel rods, lava),
              the diverter flipper redirects it downwards into the Reinforced Lava Blast Pit.</span>
            </p>
          </div>

          {/* Section 5: Interaction Controls */}
          <div className="guide-section">
            <div className="guide-section-header">
              <MousePointer2 className="text-purple-400" size={18} />
              <h3>Interaction Controls & The Anvil</h3>
            </div>
            <ul className="guide-list">
              <li><strong>Click / Tap Block:</strong> Spawns cargo onto the feeder belt and selects it in the hotbar.</li>
              <li><strong>Drag & Toss:</strong> Grab any block on the floor and fling it with cursor/touch velocity.</li>
              <li><strong>Keyboard Hotbar:</strong> Press keys <strong>1–9</strong> for quick spawn; press <strong>/</strong> to search; <strong>Esc</strong> to clear tool.</li>
              <li><strong>The Anvil:</strong> Submit custom real-world items (e.g. <em>"Grandma's Raspberry Jam"</em> or <em>"Tesla Turbine"</em>) to test zero-shot generalization.</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <span className="mono text-xs text-gray-400">TypeSafe AI Jev • {count ? `${count} blocks & mobs loaded` : '755 blocks & mobs loaded'}</span>
          <button className="button primary" onClick={onClose}>
            Got it, let's sort!
          </button>
        </div>
      </div>
    </div>
  );
}
