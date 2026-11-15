"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Flame,
  Globe2,
  ShieldCheck,
  SlidersHorizontal,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  BarChart2,
  Clock,
  Orbit,
} from "lucide-react";

interface HimalayanCalendarHeaderProps {
  scope: "uttarakhand" | "regional";
  onScopeChange: (scope: "uttarakhand" | "regional") => void;
  yearMode: "2025" | "multi_year";
  onYearModeChange: (mode: "2025" | "multi_year") => void;
  viewMode: "matrix" | "comparison";
  onViewModeChange: (mode: "matrix" | "comparison") => void;
  activeFilterCount: number;
  isControlsOpen: boolean;
  onToggleControls: () => void;
  onOpenExport: () => void;
  totalVerifiedObs: number;
  totalMultiYearObs: number;
  activeDays: number;
  viirsCount: number;
  modisCount: number;
  peakDayDate: string;
  peakDayCount: number;
  peakDayFrp: number;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

export default function HimalayanCalendarHeader({
  scope,
  onScopeChange,
  yearMode,
  onYearModeChange,
  viewMode,
  onViewModeChange,
  activeFilterCount,
  isControlsOpen,
  onToggleControls,
  onOpenExport,
  totalVerifiedObs,
  totalMultiYearObs,
  activeDays,
  viirsCount,
  modisCount,
  peakDayDate,
  peakDayCount,
  peakDayFrp,
  onResetFilters,
  isFiltered,
}: HimalayanCalendarHeaderProps) {
  const currentTotal = yearMode === "2025" ? totalVerifiedObs : totalMultiYearObs;
  const viirsPct = currentTotal > 0 ? ((viirsCount / currentTotal) * 100).toFixed(1) : "0";
  const modisPct = currentTotal > 0 ? ((modisCount / currentTotal) * 100).toFixed(1) : "0";

  return (
    <aside
      aria-label="Himalayan Burning Activity Calendar Command Ribbon"
      className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-7xl pointer-events-auto transition-all duration-300"
    >
      <div className="bg-[#03060f]/95 backdrop-blur-2xl rounded-2xl p-3 sm:p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-cyan-500/35 text-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Section 1: Brand Capsule & Year / Phenology Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Pill */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 font-mono-telemetry text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="font-bold text-white tracking-widest uppercase text-[11px]">
                BURNING ACTIVITY CALENDAR
              </span>
              <span className="text-slate-600 hidden lg:inline">|</span>
              <span className="text-amber-400 text-[10px] hidden lg:inline">
                NASA ORBITAL CHRONOLOGY
              </span>
            </div>

            {/* Scope Switcher Capsule */}
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

            {/* Temporal Mode Capsule (Verified 2025 vs Multi-Year Phenology) */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-[11px] font-mono-telemetry">
              <button
                onClick={() => onYearModeChange("2025")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  yearMode === "2025"
                    ? "bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Verified 2025 FIRMS daily chronological timeline"
              >
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>2025 Chronology ({totalVerifiedObs.toLocaleString()} Obs)</span>
              </button>
              <button
                onClick={() => onYearModeChange("multi_year")}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  yearMode === "multi_year"
                    ? "bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Multi-Year Phenological Matrix across all observations (Dates omitted at source)"
              >
                <Orbit className="w-3 h-3 text-purple-400" />
                <span>Multi-Year Phenology ({totalMultiYearObs.toLocaleString()} Obs)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Real-time Live Mission Metrics */}
          <div className="hidden xl:flex items-center gap-4 text-xs font-mono-telemetry">
            {/* Total Active Burning Days in 2025 */}
            {yearMode === "2025" ? (
              <div className="flex items-baseline gap-1.5" title="Active days with verified FIRMS fire detections in 2025">
                <span className="text-slate-400 text-[10px] uppercase">Active Days:</span>
                <span className="text-base font-extrabold text-white">
                  {activeDays}
                </span>
                <span className="text-[10px] text-slate-500">/ 365</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5" title="Complete seasonal cycle decoded from harmonic features">
                <span className="text-slate-400 text-[10px] uppercase">Decoded Seasons:</span>
                <span className="text-base font-extrabold text-purple-300">
                  12 Months
                </span>
              </div>
            )}

            <div className="h-4 w-px bg-white/15" />

            {/* Sensor Split */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1 text-amber-300" title="VIIRS 375m active fire detections">
                <span className="w-2 h-2 rounded-sm bg-amber-400 rotate-45 inline-block" />
                <span>VIIRS:</span>
                <span className="font-bold">{viirsCount.toLocaleString()}</span>
                <span className="text-slate-500 text-[10px]">({viirsPct}%)</span>
              </div>
              <div className="flex items-center gap-1 text-sky-300" title="MODIS 1km active fire detections">
                <span className="w-2 h-2 rounded-full border border-sky-400 inline-block" />
                <span>MODIS:</span>
                <span className="font-bold">{modisCount.toLocaleString()}</span>
                <span className="text-slate-500 text-[10px]">({modisPct}%)</span>
              </div>
            </div>

            <div className="h-4 w-px bg-white/15" />

            {/* Peak Day Callout */}
            {yearMode === "2025" && peakDayDate && (
              <div className="flex items-baseline gap-1.5" title={`Highest single-day fire surge: ${peakDayDate} (${peakDayFrp.toFixed(1)} MW total FRP)`}>
                <span className="text-slate-400 text-[10px] uppercase">Peak Day:</span>
                <span className="text-rose-400 font-bold">{peakDayDate}</span>
                <span className="text-slate-400 text-[10px]">({peakDayCount} obs)</span>
              </div>
            )}
          </div>

          {/* Section 3: Navigation Views & Tactical Action Triggers */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle Capsule (Matrix vs Historical Comparison) */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono-telemetry">
              <button
                onClick={() => onViewModeChange("matrix")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "matrix"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="12-Month Orbital Calendar Matrix"
              >
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span>12-Mo Matrix</span>
              </button>
              <button
                onClick={() => onViewModeChange("comparison")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === "comparison"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Compare 2025 Chronology against Multi-Year Phenological Baseline"
              >
                <BarChart2 className="w-3 h-3 text-purple-400" />
                <span>Phenology Comparison</span>
              </button>
            </div>

            {/* Filter Drawer Trigger */}
            <button
              onClick={onToggleControls}
              className={`p-1.5 px-3 rounded-xl text-xs font-mono-telemetry border transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                isControlsOpen
                  ? "bg-cyan-500/30 text-cyan-200 border-cyan-500/50"
                  : "bg-white/10 text-white border-white/15 hover:bg-white/15"
              }`}
              title="Open Scientific Instrument Controls"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-semibold text-[11px]">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Reset Filters (if active) */}
            {isFiltered && onResetFilters && (
              <button
                onClick={onResetFilters}
                className="p-1.5 px-2 rounded-xl text-xs font-mono-telemetry border bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                title="Reset active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden md:inline text-[10px]">Reset</span>
              </button>
            )}

            {/* Export Trigger */}
            <button
              onClick={onOpenExport}
              className="p-1.5 px-2.5 rounded-xl text-xs font-mono-telemetry border bg-white/5 text-slate-300 border-white/15 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export Calendar Observations (CSV, JSON, GeoJSON)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline text-[11px]">Export</span>
            </button>

            {/* Link to 3D Command Map */}
            <Link
              href="/fires"
              className="p-1.5 px-2.5 rounded-xl text-xs font-mono-telemetry border bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Orient 3D Himalayan Terrain & Hotspot Lab (/fires)"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">3D Command</span>
              <ExternalLink className="w-3 h-3 text-amber-400/70" />
            </Link>
          </div>
        </div>

        {/* Sub-bar: Scientific Disclosures & Envelope Telemetry */}
        <div className="mt-2 pt-1.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono-telemetry">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">ENVELOPE:</span>
            <span className="text-slate-300">28.0°N–31.0°N • 77.0°E–81.0°E</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-amber-400/90 flex items-center gap-1" title="Northern Uttarakhand extending north of 31.0°N was truncated at source. Complete state coverage is not claimed.">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Alpine &gt;31°N Truncated at Source</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span>Thermal Pixels ≠ Fire Incidents</span>
            <span>•</span>
            <span className="text-emerald-400/90">2025 FIRMS Verified Dates</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline text-slate-500">Multi-Year Dates NULL (No Fabrication)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

