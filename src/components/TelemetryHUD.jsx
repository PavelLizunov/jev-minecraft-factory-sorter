import React from 'react';
import { BRANCHES } from '../factory-engine';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight, Play } from 'lucide-react';

export default function TelemetryHUD({
  inspection,
  lastRecord,
  session,
  pending,
  onRetry,
  onReleaseHold,
  holdingEntity,
  heldQueue = [],
  currentProgram,
  holdPolicy = 'manual',
  onHoldPolicyChange
}) {
  const result = lastRecord?.result;
  const item = holdingEntity || inspection || lastRecord?.item;
  const branch = BRANCHES.find(b => b.id === result?.chest);
  const value = v => (v === null || v === undefined ? 'Unavailable' : v);

  const chestProbs = result?.probabilities?.chest || {};
  const hazardProb = result?.probabilities?.hazard ?? result?.hazardousScore;

  return (
    <aside className="inspection-panel">
      {/* Top Header */}
      <div className="panel-heading">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-gray-200">Inspection dock</span>
          <span className="mono muted text-[10px] truncate">
            {currentProgram ? `[${currentProgram.shortName}]` : '[Storage]'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {holdPolicy === 'auto_shunt' && (
            <span className="bg-red-950 text-red-300 border border-red-600/70 px-1.5 py-0.5 rounded text-[8px] font-bold animate-pulse">
              ⚠️ AUTO-LAVA
            </span>
          )}
          {holdPolicy === 'auto_store' && (
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-600/70 px-1.5 py-0.5 rounded text-[8px] font-bold">
              AUTO-BAY
            </span>
          )}
          <label className="flex items-center gap-1 text-[9px] text-gray-400" title="Auto-action resolution policy for held items">
            <span>Hold:</span>
            <select
              aria-label="Hold policy"
              value={holdPolicy}
              onChange={e => onHoldPolicyChange?.(e.target.value)}
              className="bg-[#111714] text-[9px] text-amber-300 border border-[#354538] rounded px-1 py-0.5 cursor-pointer"
            >
              <option value="manual">Manual</option>
              <option value="auto_store">Auto-Bay</option>
              <option value="auto_shunt">Auto-Lava</option>
            </select>
          </label>
          <span className="mono text-[9px] text-cyan-400 bg-[#111714] px-1.5 py-0.5 rounded border border-[#2a382d]">
            {result?.mode === 'triage' ? 'TRIAGE' : 'PARALLEL'}
          </span>
        </div>
      </div>

      {/* Manual Hold Clearance Card (Active when an entity is in Inspection Hold) */}
      {holdingEntity && (
        <div className="inspection-hold-banner">
          <div className="flex items-center justify-between text-amber-300 font-bold text-xs pb-1.5 border-b border-amber-500/30">
            <span className="flex items-center gap-2">
              <AlertTriangle size={15} className="animate-pulse text-amber-400 shrink-0" />
              <span>INSPECTION HOLD</span>
            </span>
            {heldQueue.length > 1 && (
              <span className="bg-amber-950/80 px-1.5 py-0.2 rounded text-[10px] text-amber-300 border border-amber-600/50">
                {heldQueue.length} queued
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-200/90 mt-1.5 leading-snug">
            <strong>{holdingEntity.name}:</strong> {lastRecord?.result?.actionReason || 'Borderline hazard or low confidence requires review.'}
          </p>
          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-amber-500/20">
            <div className="flex gap-1.5 flex-1">
              <button
                type="button"
                className="button primary text-[10px] flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
                onClick={() => onReleaseHold?.(holdingEntity.entityId, 'store')}
                title="Clear item to proceed to assigned storage bay"
              >
                <CheckCircle2 size={12} /> Clear to Bay
              </button>
              <button
                type="button"
                className="button text-[10px] flex-1 py-1 bg-red-900 hover:bg-red-800 border-red-700 text-red-200"
                onClick={() => onReleaseHold?.(holdingEntity.entityId, 'shunt')}
                title="Shunt item into emergency lava blast pit"
              >
                <ShieldAlert size={12} /> Shunt to Lava
              </button>
            </div>
            <select
              aria-label="Hold auto-action"
              value={holdPolicy}
              onChange={e => onHoldPolicyChange?.(e.target.value)}
              className="bg-[#1a1306] text-[9px] text-amber-200 border border-amber-500/40 rounded px-1.5 py-1 cursor-pointer"
              title="Change hold auto-action policy"
            >
              <option value="manual">Manual</option>
              <option value="auto_store">Always Bay</option>
              <option value="auto_shunt">Always Lava</option>
            </select>
          </div>
        </div>
      )}

      {/* Middle Scrollable Body */}
      <div className="inspection-scroll-body">
        {/* 1. Persistent Item Inspector Card (Permanent fixed height - zero DOM jumping) */}
        <div className="inspected-item bg-[#141d18]/80 border-b border-[#2d3a31] flex-shrink-0">
          <div className="section-label flex justify-between items-center text-cyan-300 mb-0.5">
            <span>{inspection ? 'Selected Catalog Item' : 'Catalog Inspector'}</span>
            <span className="mono text-[8px] text-gray-400 truncate max-w-[140px]">
              {inspection ? (inspection.catalogId || inspection.id) : (lastRecord?.item ? `Cargo #${lastRecord.item.entityId?.slice(-4)}` : 'Select any item')}
            </span>
          </div>
          <div className="inspection-texture">
            {inspection ? (
              <img src={inspection.texture} alt="" className="pixelated" />
            ) : lastRecord?.item ? (
              <img src={lastRecord.item.texture} alt="" className="pixelated" />
            ) : (
              <span className="muted text-xs">?</span>
            )}
          </div>
          <span className="eyebrow">{inspection?.mod || lastRecord?.item?.mod || '1231 ITEMS & BLOCKS'}</span>
          <h2 className="truncate">{inspection?.name || lastRecord?.item?.name || 'Select a block below'}</h2>
          <p className="line-clamp-2">{inspection?.description || lastRecord?.item?.description || 'Click or drag any block/item from the catalog below to launch onto the conveyor.'}</p>
        </div>

        {/* 2. Latest Processed Cargo & Decision Section */}
        <div className="decision-section">
          <div className="section-label">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
              <span>Latest Processed Cargo</span>
            </span>
            <span className="mono">
              {holdingEntity
                ? 'HOLD ACTIVE'
                : pending
                  ? `${pending} pending`
                  : result?.source === 'cache'
                    ? 'CACHED'
                    : result
                      ? 'LIVE'
                      : 'WAITING'}
            </span>
          </div>

          <div className="decision-item-name flex items-center justify-between font-semibold">
            <span>{lastRecord?.item?.name || 'No cargo processed yet'}</span>
            {lastRecord?.item?.entityId && (
              <span className="mono text-[9px] text-gray-500 font-normal">#{lastRecord.item.entityId.slice(-4)}</span>
            )}
          </div>

        {lastRecord?.error ? (
          <div className="error-box" role="status">
            {lastRecord.error}
            <button onClick={onRetry}>Retry held cargo</button>
          </div>
        ) : result ? (
          <>
            <div className="route-result" style={{ color: result.isHazardous ? '#f97316' : branch?.color }}>
              <span className="route-square" />
              {result.action === 'hold'
                ? 'Held for Inspection'
                : result.isHazardous
                  ? 'Emergency lava blast pit'
                  : branch?.name}
            </div>

            <div className="decision-facts">
              <span>
                Action: <b>{result.action?.toUpperCase() || 'STORE'}</b>
              </span>
              <span>
                Priority: <b>{result.priority === 'high' ? 'EXPRESS' : 'NORMAL'}</b>
              </span>
              <span>
                Hazard: <b>{result.isHazardous ? 'YES' : 'NO'}</b>
              </span>
              <span>
                Conf: <b>{result.confidence != null ? `${(result.confidence * 100).toFixed(0)}%` : '—'}</b>
              </span>
            </div>

            {/* Probability Breakdown Visualization (Active on both choice probabilities and hazard noul) */}
            {(Object.keys(chestProbs).length > 0 || (hazardProb != null && hazardProb > 0.05)) && (
              <div className="probability-breakdown">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">
                  Model Probabilities (Jev System 1)
                </span>
                <div className="space-y-1">
                  {BRANCHES.map(b => {
                    const prob = chestProbs[b.id] ?? 0;
                    if (prob < 0.03) return null; // hide negligible
                    return (
                      <div key={b.id} className="prob-row">
                        <span className="prob-label truncate" style={{ color: b.color }}>
                          {b.shortName}
                        </span>
                        <div className="prob-bar-track">
                          <div
                            className="prob-bar-fill"
                            style={{ width: `${Math.round(prob * 100)}%`, background: b.color }}
                          />
                        </div>
                        <span className="prob-value">{(prob * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                  {hazardProb != null && hazardProb > 0.05 && (
                    <div className="prob-row">
                      <span className="prob-label text-orange-400">Hazard P(True)</span>
                      <div className="prob-bar-track">
                        <div
                          className="prob-bar-fill bg-orange-500"
                          style={{ width: `${Math.round(hazardProb * 100)}%` }}
                        />
                      </div>
                      <span className="prob-value text-orange-300">{(hazardProb * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Triage Stages Pipeline Steps if mode === 'triage' */}
            {result.stages && result.stages.length > 0 && (
              <div className="triage-stages-box">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">
                  Pipeline Execution Trace
                </span>
                <div className="space-y-1">
                  {result.stages.map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] text-gray-300">
                      <span className="flex items-center gap-1">
                        <CornerDownRight size={10} className="text-gray-500" />
                        <span className="capitalize">{st.stage.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="mono">
                        {st.status === 'completed' ? (
                          <span className="text-emerald-400 font-semibold">{st.costUsd ? `$${st.costUsd}` : '—'}</span>
                        ) : st.status === 'skipped' ? (
                          <span className="text-cyan-400">Saved ($0.00)</span>
                        ) : (
                          <span className="text-amber-400">Held</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="muted compact">Send cargo through the sensor to request a typed routing decision.</p>
        )}
      </div>
      </div>

      {/* API Measurements & Billing */}
      <div className="telemetry-section">
        <div className="section-label">API measurements</div>
        <dl className="telemetry-grid">
          <div>
            <dt>HTTP roundtrip</dt>
            <dd data-testid="latency">
              {result?.source === 'cache' ? (
                'No API call'
              ) : result?.latencyMs != null ? (
                <>
                  {result.latencyMs.toFixed(1)} <small>ms</small>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>
              Call charge <small>USD</small>
            </dt>
            <dd data-testid="call-cost">
              {result ? (result.costUsd === null ? 'Unavailable' : `$${result.costUsd}`) : '—'}
            </dd>
          </div>
          <div>
            <dt>Input tokens</dt>
            <dd data-testid="input-tokens">
              {result?.source === 'cache' ? '—' : value(result?.usage?.input_tokens ?? null)}
            </dd>
          </div>
          <div>
            <dt>
              Output tokens <small>$0.00</small>
            </dt>
            <dd data-testid="output-tokens">
              {result?.source === 'cache' ? '—' : value(result?.usage?.output_tokens ?? null)}
            </dd>
          </div>
        </dl>
        <div className="session-spend">
          <span>{session.unknown ? 'Known session spend' : 'Session spend'}</span>
          <strong data-testid="session-spend">${session.spend}</strong>
        </div>
        {session.unknown > 0 && (
          <p className="warning compact">{session.unknown} live response(s) omitted usage; full spend is unavailable.</p>
        )}
        <p className="measurement-note">
          Input: $0.042 / 1M tokens · Output: free
          <br />
          Cache reuse adds no API charge.
        </p>
      </div>
    </aside>
  );
}
