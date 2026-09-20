import React from 'react';
import { BRANCHES } from '../factory-engine';
import { Maximize2, Trash2 } from 'lucide-react';

export default function ChestsView({ chestInventories, onClearChest, onOpenChest, onHoverBranch, highlightBranchId }) {
  return (
    <section className="receiving-bays" aria-label="Receiving bays">
      {BRANCHES.map((branch, i) => {
        const items = chestInventories[branch.id] || [];
        const isHighlighted = highlightBranchId === branch.id;
        return (
          <div
            className={`receiving-bay group ${isHighlighted ? 'ring-2 ring-cyan-400 shadow-lg' : ''}`}
            key={branch.id}
            data-testid={`bay-${branch.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpenChest?.(branch.id)}
            onMouseEnter={() => onHoverBranch?.(branch.id)}
            onMouseLeave={() => onHoverBranch?.(null)}
            onFocus={() => onHoverBranch?.(branch.id)}
            onBlur={() => onHoverBranch?.(null)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenChest?.(branch.id);
              }
            }}
            style={{
              cursor: 'pointer',
              borderColor: isHighlighted ? branch.color : undefined
            }}
            title={`Click or press Enter to inspect full storage chest for 0${i + 1} ${branch.name}`}
            aria-label={`Open receiving bay 0${i + 1} ${branch.name}, ${items.length} items stored`}
          >
            <div className="bay-title">
              <span className="bay-index" style={{ color: branch.color }}>
                0{i + 1}
              </span>
              <h3 className="truncate" style={{ color: branch.color }}>
                {branch.shortName}
              </h3>
              <span className="mono bay-count">{items.length}</span>
            </div>

            {/* Thumbnail items preview */}
            <div className="bay-items">
              {items.length ? (
                items.slice(-7).map((item, idx) => (
                  <img
                    className="pixelated hover:scale-110 transition-transform"
                    key={`${item.entityId}-${idx}`}
                    src={item.texture}
                    alt={item.name}
                    title={`${item.name} · ${item.mod}`}
                  />
                ))
              ) : (
                <span className="muted text-[10px]">Awaiting cargo</span>
              )}
            </div>

            {/* Bay Footer Controls */}
            <div className="bay-footer-actions">
              <span className="bay-open-hint flex items-center gap-1 text-[9px] text-gray-400 group-hover:text-cyan-300 transition-colors">
                <Maximize2 size={10} />
                <span>Open Chest</span>
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  className="text-button text-red-400 hover:text-red-300"
                  onClick={e => {
                    e.stopPropagation();
                    onClearChest(branch.id);
                  }}
                  aria-label={`Clear ${branch.name}`}
                  title="Clear all items in this receiving bay"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
