"use client";

import React from "react";
import {
  SlidersHorizontal,
  RotateCcw,
  X,
  Radio,
  Sun,
  Moon,
  Flame,
  Calendar,
  Mountain,
} from "lucide-react";

interface HimalayanCalendarControlsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSensor: string | null;
  setSelectedSensor: (sensor: string | null) => void;
  selectedDaynight: string | null;
  setSelectedDaynight: (dn: string | null) => void;
  minFrp: number;
  setMinFrp: (frp: number) => void;
  selectedMonth: number | null;
  setSelectedMonth: (m: number | null) => void;
  selectedSeason: string | null;
  setSelectedSeason: (season: string | null) => void;
  onResetAll: () => void;
  isFiltered: boolean;
  activeFilterCount: number;
}

const MONTHS = [
  { num: 1, name: "Jan" },
  { num: 2, name: "Feb" },
  { num: 3, name: "Mar" },
  { num: 4, name: "Apr" },
  { num: 5, name: "May" },
  { num: 6, name: "Jun" },
  { num: 7, name: "Jul" },
  { num: 8, name: "Aug" },
  { num: 9, name: "Sep" },
  { num: 10, name: "Oct" },
  { num: 11, name: "Nov" },
  { num: 12, name: "Dec" },
];

export default function HimalayanCalendarControls({
  isOpen,
  onClose,
  selectedSensor,
  setSelectedSensor,
  selectedDaynight,
  setSelectedDaynight,
  minFrp,
  setMinFrp,
  selectedMonth,
  setSelectedMonth,
  selectedSeason,
  setSelectedSeason,
  onResetAll,
  isFiltered,
  activeFilterCount,
}: HimalayanCalendarControlsProps) {
  if (!isOpen) return null;

  return (
    <aside
      aria-label="Calendar Scientific Instrument Controls"
      className="fixed top-28 sm:top-32 right-3 sm:right-6 z-30 w-[94vw] sm:w-[360px] max-w-sm pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-right-4 font-mono-telemetry"
    >
      <div className="bg-[#03060d]/95 backdrop-blur-2xl rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-cyan-500/35 max-h-[calc(100vh-9.5rem)] flex flex-col text-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-3.5 px-4 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <div className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-2">
              <span>CALENDAR FILTERS</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 font-bold">
                  {activeFilterCount} ACTIVE
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={onResetAll}
                className="text-[10px] text-rose-300 hover:text-white bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
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
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1 scrollbar-none">
          {/* Section 1: Sensor Instrument Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sensor Instrument</span>
              </span>
              <span className="text-cyan-400 text-[10px]">
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

          {/* Section 2: Diurnal Overpass Filter */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Diurnal Solar Overpass</span>
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

          {/* Section 3: Radiative Power Minimum Threshold (FRP MW) */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Minimum FRP Threshold</span>
              </span>
              <span className="text-amber-400 font-bold">
                {minFrp > 0 ? `≥${minFrp} MW` : "All (>0 MW)"}
              </span>
            </div>

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
              max="100"
              step="5"
              value={minFrp}
              onChange={(e) => setMinFrp(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Section 4: Seasonal Regime Presets */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-cyan-400" />
                <span>Seasonal Regime Preset</span>
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
                <div className="text-[9px] text-slate-500">Apr–May (Pine Dry Season)</div>
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
                <div className="text-[9px] text-slate-500">Oct–Nov (Stubble/Agri)</div>
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
                <div className="text-[9px] text-slate-500">Dec–Mar (Low Heating)</div>
              </button>
              <button
                onClick={() => setSelectedSeason(selectedSeason === "monsoon" ? null : "monsoon")}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  selectedSeason === "monsoon"
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold"
                    : "bg-white/[0.02] text-slate-400 border-white/10 hover:text-white"
                }`}
              >
                <div className="text-[11px]">Monsoon Quenching</div>
                <div className="text-[9px] text-slate-500">Jun–Sep (&lt;2% Fires)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-black/70 border-t border-white/[0.08] text-[10px] text-slate-400 flex items-center justify-between">
          <span>In-Memory Parquet Engine</span>
          <span className="text-cyan-400">DuckDB &lt;15ms</span>
        </div>
      </div>
    </aside>
  );
}

