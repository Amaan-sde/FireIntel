"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  X,
  Sun,
  Moon,
  Sparkles,
  Flame,
  Radio,
  Calendar,
  Mountain,
  ShieldAlert,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WildfireObservationControlsProps {
  isOpen: boolean;
  onClose: () => void;
  // Sensor
  selectedSensor: string | null;
  setSelectedSensor: (sensor: string | null) => void;
  // Diurnal
  selectedDaynight: string | null;
  setSelectedDaynight: (dn: string | null) => void;
  // Temporal Mode & Selection
  temporalMode: "seasonal" | "verified_2025";
  setTemporalMode: (mode: "seasonal" | "verified_2025") => void;
  selectedMonth: number | null;
  setSelectedMonth: (month: number | null) => void;
  selectedSeason: string | null;
  setSelectedSeason: (season: string | null) => void;
  // Hotspot Type
  selectedType: string | null;
  setSelectedType: (type: string | null) => void;
  // FRP
  minFrp: number;
  setMinFrp: (frp: number) => void;
  // Confidence
  minModisConf: number;
  setMinModisConf: (conf: number) => void;
  viirsConfLow: boolean;
  setViirsConfLow: (val: boolean) => void;
  viirsConfNominal: boolean;
  setViirsConfNominal: (val: boolean) => void;
  viirsConfHigh: boolean;
  setViirsConfHigh: (val: boolean) => void;
  // Reset
  onResetAll: () => void;
  isFiltered: boolean;
  activeFilterCount: number;
}

export default function WildfireObservationControls({
  isOpen,
  onClose,
  selectedSensor,
  setSelectedSensor,
  selectedDaynight,
  setSelectedDaynight,
  temporalMode,
  setTemporalMode,
  selectedMonth,
  setSelectedMonth,
  selectedSeason,
  setSelectedSeason,
  selectedType,
  setSelectedType,
  minFrp,
  setMinFrp,
  minModisConf,
  setMinModisConf,
  viirsConfLow,
  setViirsConfLow,
  viirsConfNominal,
  setViirsConfNominal,
  viirsConfHigh,
  setViirsConfHigh,
  onResetAll,
  isFiltered,
  activeFilterCount,
}: WildfireObservationControlsProps) {
  if (!isOpen) return null;

  return (
    <aside
      aria-label="Wildfire Scientific Instrument Controls"
      className="fixed top-28 sm:top-32 right-3 sm:right-6 z-30 w-[94vw] sm:w-[360px] max-w-sm pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-right-4"
    >
      <div className="bg-[#03060d]/95 backdrop-blur-2xl rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-cyan-500/30 max-h-[calc(100vh-9.5rem)] flex flex-col text-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-3.5 px-4 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-bold tracking-wider text-white uppercase font-mono-telemetry flex items-center gap-2">
                <span>OBSERVATION FILTERS</span>
                {activeFilterCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 font-bold">
                    {activeFilterCount} ACTIVE
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={onResetAll}
                className="text-[10px] font-mono-telemetry text-rose-300 hover:text-white bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                title="Reset all filters to full baseline"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close instrument controls"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Control Body */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1 scrollbar-none font-mono-telemetry">
          {/* Section 1: Observation Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Temporal Exploration Mode</span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setTemporalMode("seasonal")}
                className={`py-1.5 px-2 rounded-lg text-center font-medium text-[11px] transition-all cursor-pointer ${
                  temporalMode === "seasonal"
                    ? "bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/35 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Applies to all 240,365 observations using decoded seasonal attributes"
              >
                Seasonal Regimes (240k)
              </button>
              <button
                onClick={() => setTemporalMode("verified_2025")}
                className={`py-1.5 px-2 rounded-lg text-center font-medium text-[11px] transition-all cursor-pointer ${
                  temporalMode === "verified_2025"
                    ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/35 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Restricts to 11,904 observations with verified 2025 FIRMS timestamps"
              >
                Verified 2025 (11.9k)
              </button>
            </div>
            <div className="text-[10px] text-slate-500">
              {temporalMode === "seasonal"
                ? "Exploring phenological seasonal cycles across all observations"
                : "Timeline animation locked to verified 2025 FIRMS matches only"}
            </div>
          </div>

          {/* Section 2: Sensor Constellation & Footprint */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sensor Instrument</span>
              </span>
              <span className="text-[10px] text-cyan-400">
                {selectedSensor === "VIIRS" ? "375m Nadir" : selectedSensor === "MODIS" ? "1km Nadir" : "Dual Constellation"}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setSelectedSensor("ALL")}
                className={`py-1.5 rounded-lg text-center font-medium text-[11px] transition-all cursor-pointer ${
                  !selectedSensor || selectedSensor === "ALL"
                    ? "bg-white/20 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Sensors
              </button>
              <button
                onClick={() => setSelectedSensor("VIIRS")}
                className={`py-1.5 rounded-lg text-center font-medium text-[11px] transition-all cursor-pointer ${
                  selectedSensor === "VIIRS"
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                VIIRS (375m)
              </button>
              <button
                onClick={() => setSelectedSensor("MODIS")}
                className={`py-1.5 rounded-lg text-center font-medium text-[11px] transition-all cursor-pointer ${
                  selectedSensor === "MODIS"
                    ? "bg-sky-500/30 text-sky-300 border border-sky-500/40 shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                MODIS (1km)
              </button>
            </div>
          </div>

          {/* Section 3: Diurnal Solar Pass */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Diurnal Overpass Pass</span>
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setSelectedDaynight("ALL")}
                className={`py-1.5 rounded-lg text-center font-medium text-[11px] transition-all cursor-pointer ${
                  !selectedDaynight || selectedDaynight === "ALL"
                    ? "bg-white/20 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                24h Passes
              </button>
              <button
                onClick={() => setSelectedDaynight("D")}
                className={`py-1.5 rounded-lg text-center font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectedDaynight === "D"
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Day</span>
              </button>
              <button
                onClick={() => setSelectedDaynight("N")}
                className={`py-1.5 rounded-lg text-center font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectedDaynight === "N"
                    ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Moon className="w-3 h-3 text-indigo-400" />
                <span>Night</span>
              </button>
            </div>
          </div>

          {/* Section 4: Seasonal Regime Filter */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-cyan-400" />
                <span>Seasonal Regime</span>
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setSelectedSeason(selectedSeason === "pre_monsoon" ? null : "pre_monsoon")}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSeason === "pre_monsoon"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/10 hover:text-white"
                }`}
              >
                <div className="text-[11px]">Pre-Monsoon Peak</div>
                <div className="text-[9px] text-slate-500">Apr–May (61.2% fires)</div>
              </button>
              <button
                onClick={() => setSelectedSeason(selectedSeason === "post_monsoon" ? null : "post_monsoon")}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSeason === "post_monsoon"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/10 hover:text-white"
                }`}
              >
                <div className="text-[11px]">Post-Monsoon</div>
                <div className="text-[9px] text-slate-500">Oct–Nov (Stubble/agri)</div>
              </button>
              <button
                onClick={() => setSelectedSeason(selectedSeason === "winter" ? null : "winter")}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSeason === "winter"
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/10 hover:text-white"
                }`}
              >
                <div className="text-[11px]">Winter Season</div>
                <div className="text-[9px] text-slate-500">Dec–Mar (Low heating)</div>
              </button>
              <button
                onClick={() => setSelectedSeason(selectedSeason === "monsoon" ? null : "monsoon")}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSeason === "monsoon"
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/10 hover:text-white"
                }`}
              >
                <div className="text-[11px]">Monsoon Buffer</div>
                <div className="text-[9px] text-slate-500">Jun–Sep (&lt;1% fires)</div>
              </button>
            </div>
          </div>

          {/* Section 5: Radiative Power Brackets (FRP MW) */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Radiative Power (FRP)</span>
              </span>
              <span className="text-amber-400 font-bold">
                {minFrp > 0 ? `≥${minFrp} MW` : "All (>0 MW)"}
              </span>
            </div>

            {/* Quick Brackets */}
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-black/60 rounded-xl border border-white/[0.08] text-[10px]">
              <button
                onClick={() => setMinFrp(0)}
                className={`py-1 rounded-lg text-center cursor-pointer ${
                  minFrp === 0 ? "bg-white/20 text-white font-bold" : "text-slate-400"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMinFrp(10)}
                className={`py-1 rounded-lg text-center cursor-pointer ${
                  minFrp === 10 ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-400"
                }`}
              >
                ≥10MW
              </button>
              <button
                onClick={() => setMinFrp(25)}
                className={`py-1 rounded-lg text-center cursor-pointer ${
                  minFrp === 25 ? "bg-rose-500/30 text-rose-300 font-bold" : "text-slate-400"
                }`}
              >
                ≥25MW
              </button>
              <button
                onClick={() => setMinFrp(50)}
                className={`py-1 rounded-lg text-center cursor-pointer ${
                  minFrp === 50 ? "bg-purple-500/30 text-purple-300 font-bold" : "text-slate-400"
                }`}
              >
                ≥50MW
              </button>
            </div>

            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={minFrp}
              onChange={(e) => setMinFrp(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Section 6: Decoupled Sensor Confidence */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider">
              <span>Decoupled Confidence</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5">
              {/* VIIRS Categorical */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-amber-300 mb-1">
                  <span>VIIRS Categories</span>
                  <span className="text-slate-500">l / n / h</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={viirsConfLow}
                      onChange={(e) => setViirsConfLow(e.target.checked)}
                      className="rounded bg-slate-900 border-white/20 text-amber-400 focus:ring-0"
                    />
                    <span>Low</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={viirsConfNominal}
                      onChange={(e) => setViirsConfNominal(e.target.checked)}
                      className="rounded bg-slate-900 border-white/20 text-amber-400 focus:ring-0"
                    />
                    <span>Nominal</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={viirsConfHigh}
                      onChange={(e) => setViirsConfHigh(e.target.checked)}
                      className="rounded bg-slate-900 border-white/20 text-amber-400 focus:ring-0"
                    />
                    <span>High</span>
                  </label>
                </div>
              </div>

              {/* MODIS Continuous */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-sky-300 mb-1">
                  <span>MODIS Quantitative</span>
                  <span className="text-white font-bold">{minModisConf}%+</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minModisConf}
                  onChange={(e) => setMinModisConf(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Hotspot Classification Type */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Hotspot Type (FIRMS type)</span>
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-xl border border-white/[0.08] text-[10px]">
              <button
                onClick={() => setSelectedType(null)}
                className={`py-1.5 rounded-lg text-center cursor-pointer ${
                  selectedType === null ? "bg-white/20 text-white font-bold" : "text-slate-400"
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setSelectedType("0")}
                className={`py-1.5 rounded-lg text-center cursor-pointer ${
                  selectedType === "0" ? "bg-amber-500/30 text-amber-300 font-bold" : "text-slate-400"
                }`}
                title="Type 0: Presumed Vegetation Fire (99.4%)"
              >
                Vegetation
              </button>
              <button
                onClick={() => setSelectedType("2")}
                className={`py-1.5 rounded-lg text-center cursor-pointer ${
                  selectedType === "2" ? "bg-purple-500/30 text-purple-300 font-bold" : "text-slate-400"
                }`}
                title="Type 2: Other Static Land Source (0.6%)"
              >
                Static Source
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-black/70 border-t border-white/[0.08] text-[10px] text-slate-400 font-mono-telemetry flex items-center justify-between">
          <span>Active DuckDB Views</span>
          <span className="text-cyan-400">Snappy Parquet &lt;16ms</span>
        </div>
      </div>
    </aside>
  );
}

