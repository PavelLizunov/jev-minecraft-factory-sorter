import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Send, Package, Info, CheckCircle2 } from 'lucide-react';

export default function ChestModal({
  isOpen,
  branchConfig,
  items = [],
  onClose,
  onClearChest,
  onEjectItem
}) {
  const [selectedItemKey, setSelectedItemKey] = useState(null);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const modalElement = document.querySelector('.chest-modal-card');
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

  // Group items by unique catalog ID into stacks
  const stacks = useMemo(() => {
    const map = new Map();
    items.forEach(it => {
      const key = it.catalogId || it.id;
      if (!map.has(key)) {
        map.set(key, { ...it, count: 1, instances: [it] });
      } else {
        const entry = map.get(key);
        entry.count += 1;
        entry.instances.push(it);
      }
    });
    return Array.from(map.values());
  }, [items]);

  // Set default selected item
  useEffect(() => {
    if (stacks.length > 0 && (!selectedItemKey || !stacks.some(s => (s.catalogId || s.id) === selectedItemKey))) {
      setSelectedItemKey(stacks[0].catalogId || stacks[0].id);
    }
  }, [stacks, selectedItemKey]);

  if (!isOpen || !branchConfig) return null;

  const activeStack = stacks.find(s => (s.catalogId || s.id) === selectedItemKey) || stacks[0];

  const handleEject = () => {
    if (!activeStack || activeStack.count <= 0) return;
    onEjectItem?.(activeStack);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="chest-title">
      <div className="chest-modal-card" onClick={e => e.stopPropagation()}>
        {/* Chest Header */}
        <div className="chest-modal-header" style={{ borderBottomColor: `${branchConfig.color}40` }}>
          <div className="flex items-center gap-3">
            <span className="chest-badge" style={{ background: `${branchConfig.color}25`, color: branchConfig.color, borderColor: branchConfig.color }}>
              0{branchConfig.index}
            </span>
            <div>
              <span className="eyebrow" style={{ color: branchConfig.color }}>RECEIVING BAY STORAGE CHEST</span>
              <h2 id="chest-title" className="text-lg md:text-xl font-bold text-gray-100 flex items-center gap-2">
                {branchConfig.name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono text-xs bg-[#111613] px-2.5 py-1 rounded border border-[#2f3d32] text-yellow-300">
              {items.length} {items.length === 1 ? 'item' : 'items'} stored
            </span>
            {items.length > 0 && (
              <button
                type="button"
                className="button subtle text-xs text-red-400 hover:text-red-300"
                onClick={() => onClearChest(branchConfig.id)}
                title="Clear all items in this receiving bay"
              >
                <Trash2 size={13} /> Clear Bay
              </button>
            )}
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close chest view">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chest Body (Two Columns: Slot Grid + Item Details) */}
        <div className="chest-modal-body">
          {/* Left: 54-Slot Minecraft Chest Grid */}
          <div className="chest-grid-container">
            <div className="chest-grid-label">
              <span>Chest Inventory ({stacks.length} unique stacks)</span>
              <small className="text-gray-500">Click any stack to inspect</small>
            </div>

            {stacks.length === 0 ? (
              <div className="chest-empty-state">
                <Package size={32} className="text-gray-600 mb-2" />
                <p className="font-semibold text-gray-300">This storage chest is empty</p>
                <small className="text-gray-500 mt-1">
                  Spawn blocks on the conveyor belt to route items into this bay automatically.
                </small>
              </div>
            ) : (
              <div className="chest-slots-grid">
                {stacks.map(stack => {
                  const key = stack.catalogId || stack.id;
                  const isSelected = selectedItemKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`chest-slot ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedItemKey(key)}
                      title={`${stack.name} (x${stack.count}) · ${stack.mod}`}
                      aria-label={`${stack.name}, quantity ${stack.count}`}
                    >
                      <img src={stack.texture} alt="" className="w-7 h-7 pixelated" loading="lazy" />
                      {stack.count > 1 && (
                        <span className="chest-count-badge">
                          {stack.count}
                        </span>
                      )}
                      {stack.isHazard && (
                        <span className="chest-hazard-badge">!</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detailed Item Inspector & Actions */}
          <div className="chest-inspector-panel">
            {activeStack ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-[#2a362d]">
                  <div className="w-14 h-14 bg-[#111714] border border-[#3b4c3e] rounded p-2 flex items-center justify-center shrink-0 shadow-inner">
                    <img src={activeStack.texture} alt="" className="w-10 h-10 pixelated" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">
                      {activeStack.mod}
                    </span>
                    <h3 className="text-sm font-bold text-yellow-300 truncate">
                      {activeStack.name}
                    </h3>
                    <code className="text-[10px] text-gray-400 block truncate">
                      {activeStack.catalogId || activeStack.id}
                    </code>
                  </div>
                </div>

                {/* Stack count and category */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#121815] p-2 rounded border border-[#273429]">
                    <span className="text-[10px] text-gray-400 block">Total Quantity</span>
                    <strong className="text-sm font-mono text-emerald-300 font-bold">
                      {activeStack.count} {activeStack.count === 1 ? 'block' : 'blocks'}
                    </strong>
                  </div>
                  <div className="bg-[#121815] p-2 rounded border border-[#273429]">
                    <span className="text-[10px] text-gray-400 block">Assigned Bay</span>
                    <strong className="text-[11px] font-semibold truncate block" style={{ color: branchConfig.color }}>
                      0{branchConfig.index} {branchConfig.shortName}
                    </strong>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[#121815] p-2.5 rounded border border-[#273429] text-xs text-gray-300 leading-relaxed">
                  <p>{activeStack.description || 'Verified Minecraft / modded block item.'}</p>
                </div>

                {/* Eject to conveyor action */}
                <div className="pt-2">
                  <button
                    type="button"
                    className="button primary w-full flex items-center justify-center gap-2 py-2"
                    onClick={handleEject}
                    title="Send this block back onto the conveyor feeder line"
                  >
                    <Send size={14} />
                    <span>Eject to Conveyor Belt</span>
                  </button>
                  <small className="text-[10px] text-gray-400 block text-center mt-1.5">
                    Returns 1 item back to the feeder for re-sorting.
                  </small>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs">
                Select an item from the chest to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
