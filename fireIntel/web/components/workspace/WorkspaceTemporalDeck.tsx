"use client";

import React from "react";
import { Calendar, Flame, Sparkles, ArrowRight, ShieldCheck, Sun, Moon } from "lucide-react";

interface TemporalFilter {
  mode: "chronological" | "seasonal";
  label?: string;
  start_date?: string;
  end_date?: string;
  start_month?: number;
  end_month?: number;
  season_id?: string;
}

interface WorkspaceTemporalDeckProps {
  temporalMode: "chronological" | "seasonal";
  baseline: TemporalFilter;
  comparison: TemporalFilter;
  onBaselineChange: (b: TemporalFilter) => void;
  onComparisonChange: (c: TemporalFilter) => void;
  onApplyPreset: (b: TemporalFilter, c: TemporalFilter) => void;
}

const MONTH_OPTIONS = [
  { val: 1, name: "January" },
  { val: 2, name: "February" },
  { val: 3, name: "March" },
  { val: 4, name: "April (Peak)" },
  { val: 5, name: "May (Peak)" },
  { val: 6, name: "June" },
  { val: 7, name: "July" },
  { val: 8, name: "August" },
  { val: 9, name: "September" },
  { val: 10, name: "October" },
  { val: 11, name: "November" },
  { val: 12, name: "December" },
];

export default function WorkspaceTemporalDeck({
  temporalMode,
  baseline,
  comparison,
  onBaselineChange,
  onComparisonChange,
  onApplyPreset,
}: WorkspaceTemporalDeckProps) {
  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry text-xs">
      {/* Header & Quick Preset Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Temporal Comparison Engine
            </h3>
            <span className="text-[10px] text-slate-400">
              Configure Baseline vs Comparison periods for delta analytics
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-500 text-[10px] mr-1 hidden sm:inline">Presets:</span>

          {temporalMode === "chronological" ? (
            <>
              <button
                onClick={() =>
                  onApplyPreset(
                    { mode: "chronological", label: "April 2025", start_date: "2025-04-01", end_date: "2025-04-30" },
                    { mode: "chronological", label: "May 2025", start_date: "2025-05-01", end_date: "2025-05-31" }
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Apr 2025 vs May 2025
              </button>
              <button
                onClick={() =>
                  onApplyPreset(
                    { mode: "chronological", label: "Early April 2025", start_date: "2025-04-01", end_date: "2025-04-15" },
                    { mode: "chronological", label: "Late April Peak 2025", start_date: "2025-04-16", end_date: "2025-04-30" }
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Early vs Late April 2025
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  onApplyPreset(
                    { mode: "seasonal", label: "Pre-Monsoon Peak (Apr-May)", start_month: 4, end_month: 5 },
                    { mode: "seasonal", label: "Winter Biomass (Dec-Feb)", start_month: 12, end_month: 2 }
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Peak (Apr–May) vs Winter (Dec–Feb)
              </button>
              <button
                onClick={() =>
                  onApplyPreset(
                    { mode: "seasonal", label: "Pre-Monsoon Peak (Apr-May)", start_month: 4, end_month: 5 },
                    { mode: "seasonal", label: "Post-Monsoon Agricultural (Oct-Nov)", start_month: 10, end_month: 11 }
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Peak vs Post-Monsoon Agro
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two Visually Distinct Period Cards: Baseline (Cyan) vs Comparison (Rose) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: BASELINE PERIOD (Cyan Theme) */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
                BASELINE PERIOD
              </span>
            </div>
            <span className="text-[10px] text-cyan-400/80 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              {baseline.label || "Reference Window"}
            </span>
          </div>

          {temporalMode === "chronological" ? (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">START DATE (YYYY-MM-DD)</label>
                <input
                  type="date"
                  min="2025-01-01"
                  max="2025-12-31"
                  value={baseline.start_date || "2025-04-01"}
                  onChange={(e) =>
                    onBaselineChange({
                      ...baseline,
                      start_date: e.target.value,
                      label: `${e.target.value} to ${baseline.end_date || ""}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400 font-mono-telemetry text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">END DATE (YYYY-MM-DD)</label>
                <input
                  type="date"
                  min="2025-01-01"
                  max="2025-12-31"
                  value={baseline.end_date || "2025-04-30"}
                  onChange={(e) =>
                    onBaselineChange({
                      ...baseline,
                      end_date: e.target.value,
                      label: `${baseline.start_date || ""} to ${e.target.value}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400 font-mono-telemetry text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">START MONTH</label>
                <select
                  value={baseline.start_month || 4}
                  onChange={(e) =>
                    onBaselineChange({
                      ...baseline,
                      start_month: parseInt(e.target.value),
                      label: `Months ${e.target.value}–${baseline.end_month || 5}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400 font-mono-telemetry text-xs"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">END MONTH</label>
                <select
                  value={baseline.end_month || 5}
                  onChange={(e) =>
                    onBaselineChange({
                      ...baseline,
                      end_month: parseInt(e.target.value),
                      label: `Months ${baseline.start_month || 4}–${e.target.value}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-white focus:outline-none focus:border-cyan-400 font-mono-telemetry text-xs"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: COMPARISON PERIOD (Rose Theme) */}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              <span className="text-xs font-bold text-rose-300 tracking-wider uppercase">
                COMPARISON PERIOD
              </span>
            </div>
            <span className="text-[10px] text-rose-400/80 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
              {comparison.label || "Analysis Window"}
            </span>
          </div>

          {temporalMode === "chronological" ? (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">START DATE (YYYY-MM-DD)</label>
                <input
                  type="date"
                  min="2025-01-01"
                  max="2025-12-31"
                  value={comparison.start_date || "2025-05-01"}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      start_date: e.target.value,
                      label: `${e.target.value} to ${comparison.end_date || ""}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-rose-500/30 text-white focus:outline-none focus:border-rose-400 font-mono-telemetry text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">END DATE (YYYY-MM-DD)</label>
                <input
                  type="date"
                  min="2025-01-01"
                  max="2025-12-31"
                  value={comparison.end_date || "2025-05-31"}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      end_date: e.target.value,
                      label: `${comparison.start_date || ""} to ${e.target.value}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-rose-500/30 text-white focus:outline-none focus:border-rose-400 font-mono-telemetry text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">START MONTH</label>
                <select
                  value={comparison.start_month || 12}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      start_month: parseInt(e.target.value),
                      label: `Months ${e.target.value}–${comparison.end_month || 2}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-rose-500/30 text-white focus:outline-none focus:border-rose-400 font-mono-telemetry text-xs"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">END MONTH</label>
                <select
                  value={comparison.end_month || 2}
                  onChange={(e) =>
                    onComparisonChange({
                      ...comparison,
                      end_month: parseInt(e.target.value),
                      label: `Months ${comparison.start_month || 12}–${e.target.value}`,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-rose-500/30 text-white focus:outline-none focus:border-rose-400 font-mono-telemetry text-xs"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

