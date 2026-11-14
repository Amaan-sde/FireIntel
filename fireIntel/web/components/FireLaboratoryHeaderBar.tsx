"use client";

import React from "react";
import { Orbit, Flame, Activity, Satellite, Sparkles, Radio } from "lucide-react";

interface FireLaboratoryHeaderBarProps {
  filteredStats: {
    total: number;
    viirs: number;
    modis: number;
    peakFrp: number;
  };
}

export default function FireLaboratoryHeaderBar({
  filteredStats,
}: FireLaboratoryHeaderBarProps) {
  const ratio =
    filteredStats.modis > 0
      ? (filteredStats.viirs / filteredStats.modis).toFixed(2)
      : "∞";

  return (
    <aside
      aria-label="Laboratory observational telemetry"
      className="fixed top-18 sm:top-20 left-3 sm:left-8 z-20 pointer-events-auto transition-all duration-300"
    >
      <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-cyan-500/20 w-[94vw] sm:w-[380px] text-slate-200">
        {/* Aerospace Mission Status Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono-telemetry font-bold tracking-widest uppercase text-cyan-400">
              NASA FIRMS // SATELLITE RADAR
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono-telemetry text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>SECTOR LOCKED: UTTARAKHAND</span>
          </div>
        </div>

        {/* Primary Observation Telemetry HUD */}
        <div className="flex items-baseline justify-between mb-3.5">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono-telemetry flex items-baseline gap-1.5">
              <span>{filteredStats.total.toLocaleString()}</span>
              <span className="text-xs font-normal text-cyan-400 font-sans tracking-normal">Detections</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Boundary-Validated Thermal Hotspots</span>
            </div>
          </div>

          <div className="text-right pl-3 border-l border-white/[0.08]">
            <div className="text-lg sm:text-xl font-bold font-mono-telemetry text-amber-400">
              {filteredStats.peakFrp.toFixed(1)}{" "}
              <span className="text-[11px] font-normal text-slate-400">MW</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono-telemetry">Filtered Peak FRP</div>
          </div>
        </div>

        {/* Sensor Constellation Matrix */}
        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/[0.08] text-[11px]">
          <div className="bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-amber-300/80 mb-0.5 font-mono-telemetry">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>VIIRS 375m (nadir):</span>
            </div>
            <div className="font-mono-telemetry font-bold text-amber-300 text-sm">
              {filteredStats.viirs.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-sky-300/80 mb-0.5 font-mono-telemetry">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>MODIS 1km (nadir):</span>
            </div>
            <div className="font-mono-telemetry font-bold text-sky-300 text-sm">
              {filteredStats.modis.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/[0.02] p-2 rounded-xl border border-white/[0.04]">
            <div className="text-[10px] text-slate-400 mb-0.5 font-mono-telemetry">
              Ratio (V/M):
            </div>
            <div className="font-mono-telemetry font-semibold text-emerald-300 text-sm">
              {ratio}x
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
