"use client";

import React from "react";
import { ArrowUpRight, Mountain, RotateCcw } from "lucide-react";

interface HeroIntroCardProps {
  telemetry: any;
  selectedMonth: number | null;
  selectedSensor: string | null;
  onResetFilters: () => void;
  onExploreSector: () => void;
  onExploreRidge: () => void;
}

export default function HeroIntroCard({
  telemetry,
  selectedMonth,
  selectedSensor,
  onResetFilters,
  onExploreSector,
  onExploreRidge,
}: HeroIntroCardProps) {
  const overview = telemetry?.overview || {
    total_detections: 7541,
    modis_detections: 918,
    viirs_detections: 6623,
    peak_frp_mw: 169.9,
  };

  const monthlyMatrix = telemetry?.monthly_matrix || {};

  // Compute dynamic filtered counts
  let displayedTotal = overview.total_detections;
  let displayedViirs = overview.viirs_detections;
  let displayedModis = overview.modis_detections;
  let displayedPeakFrp = overview.peak_frp_mw;
  let filterLabel = "";

  if (selectedMonth && monthlyMatrix[String(selectedMonth)]) {
    const mData = monthlyMatrix[String(selectedMonth)];
    displayedPeakFrp = mData.peak_frp;
    filterLabel = `${mData.month_name} 2025`;

    if (selectedSensor === "VIIRS") {
      displayedTotal = mData.viirs;
      displayedViirs = mData.viirs;
      displayedModis = 0;
      filterLabel += " // VIIRS 375m";
    } else if (selectedSensor === "MODIS") {
      displayedTotal = mData.modis;
      displayedViirs = 0;
      displayedModis = mData.modis;
      filterLabel += " // MODIS 1km";
    } else {
      displayedTotal = mData.total;
      displayedViirs = mData.viirs;
      displayedModis = mData.modis;
    }
  } else if (selectedSensor === "VIIRS") {
    displayedTotal = overview.viirs_detections;
    displayedViirs = overview.viirs_detections;
    displayedModis = 0;
    filterLabel = "VIIRS (375m) Constellation";
  } else if (selectedSensor === "MODIS") {
    displayedTotal = overview.modis_detections;
    displayedViirs = 0;
    displayedModis = overview.modis_detections;
    filterLabel = "MODIS (1km) Constellation";
  }

  const isFiltered = selectedMonth !== null || selectedSensor !== null;

  return (
    <div className="absolute bottom-24 left-8 z-20 w-[90%] max-w-lg glass-surface rounded-2xl p-6 md:p-7 transition-all shadow-2xl">
      {/* Category Pill & Active Filter Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isFiltered ? "bg-cyan-400 animate-ping" : "bg-amber-400"}`} />
          <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase font-mono-telemetry">
            {isFiltered ? `Filtered // ${filterLabel}` : "NASA Earth Observation // 2025"}
          </span>
        </div>

        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[10px] text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* Hero Headline */}
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2 leading-snug">
        Forest Fire Intelligence in the Western Himalayas
      </h1>

      {/* Editorial Narrative */}
      <p className="text-xs md:text-sm text-slate-300/90 leading-relaxed mb-5 font-normal">
        Spatiotemporal synthesis of NASA MODIS and VIIRS satellite active fire
        observations across 53,418 km² of Uttarakhand administrative territory,
        aligned with 30-meter Copernicus GLO-30 geomorphology.
      </p>

      {/* Verified Core Metrics Grid (Reacts Dynamically to Filters) */}
      <div className="grid grid-cols-4 gap-3 py-3.5 mb-5 border-y border-white/10">
        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono-telemetry">
            {displayedTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isFiltered ? "Filtered Obs" : "Total Detections"}
          </div>
        </div>

        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-amber-400 font-mono-telemetry">
            {displayedViirs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">VIIRS 375m</div>
        </div>

        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-sky-400 font-mono-telemetry">
            {displayedModis.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">MODIS 1km</div>
        </div>

        <div>
          <div className="text-xl md:text-2xl font-bold tracking-tight text-rose-400 font-mono-telemetry">
            {displayedPeakFrp.toFixed(1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Peak FRP (MW)</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExploreSector}
          className="flex-1 py-2.5 px-4 rounded-xl bg-white text-slate-950 font-medium text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          <span>Focus Uttarakhand Basin</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onExploreRidge}
          className="py-2.5 px-4 rounded-xl glass-pill text-slate-200 hover:text-white hover:bg-white/10 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Mountain className="w-3.5 h-3.5 text-amber-400" />
          <span>Himalayan 3D Relief</span>
        </button>
      </div>
    </div>
  );
}
