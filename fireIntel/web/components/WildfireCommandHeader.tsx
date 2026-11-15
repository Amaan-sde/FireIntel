"use client";

import React from "react";
import {
  Orbit,
  Flame,
  Radio,
  SlidersHorizontal,
  Compass,
  Mountain,
  Layers,
  ShieldCheck,
  Globe2,
  Maximize2,
  Eye,
  Crosshair,
  AlertTriangle,
} from "lucide-react";

interface WildfireCommandHeaderProps {
  scope: "uttarakhand" | "regional";
  onScopeChange: (scope: "uttarakhand" | "regional") => void;
  filteredStats: {
    total: number;
    viirs: number;
    modis: number;
    peakFrp: number;
  };
  totalBaseline: number;
  isFiltered: boolean;
  activeVantage: "tectonic" | "garhwal" | "kumaon" | "nadir";
  onVantageChange: (vantage: "tectonic" | "garhwal" | "kumaon" | "nadir") => void;
  terrainEnabled: boolean;
  onToggleTerrain: () => void;
  boundaryEnabled: boolean;
  onToggleBoundary: () => void;
  isControlsOpen: boolean;
  onToggleControls: () => void;
  activeFilterCount: number;
}

export default function WildfireCommandHeader({
  scope,
  onScopeChange,
  filteredStats,
  totalBaseline,
  isFiltered,
  activeVantage,
  onVantageChange,
  terrainEnabled,
  onToggleTerrain,
  boundaryEnabled,
  onToggleBoundary,
  isControlsOpen,
  onToggleControls,
  activeFilterCount,
}: WildfireCommandHeaderProps) {
  const viirsPct =
    filteredStats.total > 0
      ? ((filteredStats.viirs / filteredStats.total) * 100).toFixed(1)
      : "0";
  const modisPct =
    filteredStats.total > 0
      ? ((filteredStats.modis / filteredStats.total) * 100).toFixed(1)
      : "0";

  return (
    <aside
      aria-label="Wildfire Observation Command Status Bar"
      className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-7xl pointer-events-auto transition-all duration-300"
    >
      <div className="bg-[#040810]/90 backdrop-blur-2xl rounded-2xl p-2.5 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-cyan-500/30 text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 1. Command Callout & Scope Switcher */}
          <div className="flex items-center gap-3">
            {/* Pulsing Command Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 font-mono-telemetry text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="font-bold text-white tracking-widest uppercase text-[11px]">
                WILDFIRE OBSERVATION COMMAND
              </span>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <span className="text-cyan-400 text-[10px] hidden sm:inline">
                HIMALAYAN SATELLITE RADIOMETRY
              </span>
            </div>

            {/* Scope Toggle Capsule */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-[11px] font-mono-telemetry">
              <button
                onClick={() => onScopeChange("uttarakhand")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  scope === "uttarakhand"
                    ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Strictly boundary-validated observations within Uttarakhand state"
              >
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Uttarakhand (240k)</span>
              </button>
              <button
                onClick={() => onScopeChange("regional")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  scope === "regional"
                    ? "bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Regional Northern India source basin [28°N–31°N, 77°E–81°E]"
              >
                <Globe2 className="w-3 h-3 text-sky-400" />
                <span>Regional (510k)</span>
              </button>
            </div>
          </div>

          {/* 2. Real-time Live Sensor Spectrum Counters */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono-telemetry">
            {/* Matching Observations */}
            <div className="flex items-baseline gap-2">
              <span className="text-slate-400 text-[10px] uppercase">Active Detections:</span>
              <span className="text-lg font-extrabold text-white">
                {filteredStats.total.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500">
                / {totalBaseline.toLocaleString()}
              </span>
            </div>

            <div className="h-4 w-px bg-white/15" />

            {/* VIIRS vs MODIS Sensor Split */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300" title="VIIRS 375m high-resolution nadir active fire pixels">
                <span className="w-2 h-2 rounded-sm bg-amber-400 rotate-45 inline-block" />
                <span>VIIRS 375m:</span>
                <span className="font-bold">{filteredStats.viirs.toLocaleString()}</span>
                <span className="text-slate-500 text-[10px]">({viirsPct}%)</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-300" title="MODIS 1km contextual active fire pixels">
                <span className="w-2 h-2 rounded-full border border-sky-400 inline-block" />
                <span>MODIS 1km:</span>
                <span className="font-bold">{filteredStats.modis.toLocaleString()}</span>
                <span className="text-slate-500 text-[10px]">({modisPct}%)</span>
              </div>
            </div>

            <div className="h-4 w-px bg-white/15" />

            {/* Peak FRP */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase">Peak FRP:</span>
              <span className="text-amber-400 font-bold">
                {filteredStats.peakFrp.toFixed(1)}
              </span>
              <span className="text-slate-500 text-[10px]">MW</span>
            </div>
          </div>

          {/* 3. Camera Vantage Presets & Tactical Toggles */}
          <div className="flex items-center gap-2">
            {/* Camera Vantage Capsule */}
            <div className="hidden xl:flex items-center p-0.5 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono-telemetry">
              <span className="px-2 text-slate-500 uppercase tracking-wider">Vantage:</span>
              <button
                onClick={() => onVantageChange("tectonic")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeVantage === "tectonic"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Himalayan Tectonic Overview (3D Oblique)"
              >
                Tectonic
              </button>
              <button
                onClick={() => onVantageChange("garhwal")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeVantage === "garhwal"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Garhwal Drainage Basin Focus"
              >
                Garhwal
              </button>
              <button
                onClick={() => onVantageChange("kumaon")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeVantage === "kumaon"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Kumaon Chir Pine Fire Arc Focus"
              >
                Kumaon
              </button>
              <button
                onClick={() => onVantageChange("nadir")}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  activeVantage === "nadir"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Orthogonal Nadir Planar View (2D Cartographic)"
              >
                Nadir 2D
              </button>
            </div>

            {/* 3D Terrain Toggle */}
            <button
              onClick={onToggleTerrain}
              className={`p-1.5 px-2 rounded-xl text-xs font-mono-telemetry border transition-all flex items-center gap-1.5 cursor-pointer ${
                terrainEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
              }`}
              title="Toggle 3D Copernicus Elevation Extrusion"
            >
              <Mountain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">3D Relief</span>
            </button>

            {/* Instrument Controls Drawer Trigger */}
            <button
              onClick={onToggleControls}
              className={`p-1.5 px-3 rounded-xl text-xs font-mono-telemetry border transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isControlsOpen
                  ? "bg-cyan-500/30 text-cyan-200 border-cyan-500/50"
                  : "bg-white/10 text-white border-white/15 hover:bg-white/15"
              }`}
              title="Open Scientific Instrument Controls"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-[11px]">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sub-bar: Scientific Disclosures & Coordinates Bounds */}
        <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono-telemetry">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">ENVELOPE:</span>
            <span className="text-slate-300">28.0°N–31.0°N • 77.0°E–81.0°E (EPSG:4326)</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-amber-400/90 flex items-center gap-1" title="Northern Uttarakhand extending north of 31.0°N (up to 31.456°N in Chamoli/Uttarkashi) was truncated at source. Complete state coverage is not claimed.">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Alpine &gt;31°N Truncated at Source</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-400">
            <span>Thermal Pixels ≠ Fire Incidents</span>
            <span>•</span>
            <span>Radiative Power in MW</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

