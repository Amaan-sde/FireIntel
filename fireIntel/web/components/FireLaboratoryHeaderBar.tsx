"use client";

import React from "react";
import { Orbit, Flame, Activity } from "lucide-react";

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
      className="fixed top-20 left-8 z-20 glass-surface rounded-2xl p-4 md:p-5 shadow-2xl border border-white/10 w-[92%] max-w-sm pointer-events-auto"
    >
      {/* Category Pill */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase font-mono-telemetry">
          NASA Earth Observation Laboratory
        </span>
      </div>

      {/* Main Active Fire Count */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono-telemetry">
            {filteredStats.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Active Thermal Observations
          </div>
        </div>

        <div className="text-right">
          <div className="text-base font-bold font-mono-telemetry text-amber-400">
            {filteredStats.peakFrp.toFixed(1)}{" "}
            <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[10px] text-slate-400">Filtered Peak FRP</div>
        </div>
      </div>

      {/* Sensor Breakdown Micro-Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/5 text-[11px]">
        <div>
          <span className="text-slate-500 text-[10px]">VIIRS 375m (nadir):</span>
          <div className="font-mono-telemetry font-bold text-amber-300">
            {filteredStats.viirs.toLocaleString()}
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[10px]">MODIS 1km (nadir):</span>
          <div className="font-mono-telemetry font-bold text-sky-300">
            {filteredStats.modis.toLocaleString()}
          </div>
        </div>

        <div>
          <span className="text-slate-500 text-[10px]">Ratio (V/M):</span>
          <div className="font-mono-telemetry font-semibold text-slate-200">
            {ratio}x
          </div>
        </div>
      </div>
    </aside>
  );
}

