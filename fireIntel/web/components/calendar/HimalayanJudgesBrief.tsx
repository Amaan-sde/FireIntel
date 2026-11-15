"use client";

import React, { useState } from "react";
import { Sparkles, Award, ShieldCheck, ChevronDown, ChevronUp, Cpu, Radio, Flame } from "lucide-react";

export default function HimalayanJudgesBrief() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#030612]/95 to-cyan-500/10 border border-amber-500/30 p-5 backdrop-blur-xl shadow-2xl transition-all">
      {/* Top Banner */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              NASA Space Apps Challenge — Judges Executive Brief
              <span className="text-[10px] font-mono-telemetry px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SCIENTIFIC ML FOUNDATION
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono-telemetry">
              Why this 240,365-observation harmonised master dataset powers the predictive intelligence engine
            </p>
          </div>
        </div>

        <button
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title={isOpen ? "Collapse brief" : "Expand brief"}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-telemetry text-slate-300">
          {/* Pillar 1: Temporal Compression */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>61.2% Seasonal Compression</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              In Uttarakhand, wildfire activity is overwhelmingly concentrated into a 60-day window: April (75,601 obs) and May (71,468 obs). The calendar visualizes this extreme phenological surge to guide regional disaster preparedness.
            </p>
          </div>

          {/* Pillar 2: Cyclical Trigonometric Embeddings */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Cyclical ML Embeddings</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Standard date numbers create artificial numerical discontinuities at year-end. By projecting month and hour onto 2D continuous trigonometric manifolds (<code className="text-cyan-300">month_sin</code>, <code className="text-cyan-300">month_cos</code>), the ML model learns seamless seasonal risk transitions.
            </p>
          </div>

          {/* Pillar 3: Multi-Sensor Harmonisation */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Dual-Sensor Radiometry</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Combines VIIRS 375m I-Band (201,993 obs) with MODIS 1km (38,372 obs). VIIRS provides 5.26× higher detection sensitivity in steep Himalayan valleys, while MODIS preserves decades of baseline continuity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
