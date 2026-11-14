"use client";

import React, { useState } from "react";
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp, Sun, Moon, Sparkles, Filter } from "lucide-react";

interface FireLaboratoryControlsProps {
  selectedSensor: string | null;
  setSelectedSensor: (sensor: string | null) => void;
  selectedDaynight: string | null;
  setSelectedDaynight: (dn: string | null) => void;
  minModisConf: number;
  setMinModisConf: (conf: number) => void;
  viirsConfLow: boolean;
  setViirsConfLow: (val: boolean) => void;
  viirsConfNominal: boolean;
  setViirsConfNominal: (val: boolean) => void;
  viirsConfHigh: boolean;
  setViirsConfHigh: (val: boolean) => void;
  minFrp: number;
  setMinFrp: (frp: number) => void;
  onResetAll: () => void;
  isFiltered: boolean;
}

export default function FireLaboratoryControls({
  selectedSensor,
  setSelectedSensor,
  selectedDaynight,
  setSelectedDaynight,
  minModisConf,
  setMinModisConf,
  viirsConfLow,
  setViirsConfLow,
  viirsConfNominal,
  setViirsConfNominal,
  viirsConfHigh,
  setViirsConfHigh,
  minFrp,
  setMinFrp,
  onResetAll,
  isFiltered,
}: FireLaboratoryControlsProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <aside 
      aria-label="Fire cartography and confidence controls"
      className="fixed top-20 right-4 sm:right-6 z-20 w-[92vw] sm:w-80 max-w-xs glass-surface rounded-2xl shadow-2xl border border-white/10 max-h-[calc(100vh-6rem)] flex flex-col transition-all duration-200"
    >
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors border-b border-white/5 flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold tracking-wide text-white uppercase font-mono-telemetry">
            Filter Laboratory
          </span>
          {isFiltered && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isFiltered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResetAll();
              }}
              className="text-[10px] text-rose-300 hover:text-white bg-rose-500/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}
          <button 
            aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
            className="text-slate-400 hover:text-white p-0.5"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Control Panel */}
      {isExpanded && (
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          {/* 1. Constellation Sensor Selector */}
          <div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1.5">
              <span>Platform / Sensor</span>
              <span className="text-slate-500 font-mono-telemetry text-[10px]">
                {selectedSensor === "VIIRS" ? "VIIRS 375m (Suomi-NPP)" : selectedSensor === "MODIS" ? "MODIS 1km (Terra/Aqua)" : "Dual Constellation (7,541)"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                onClick={() => setSelectedSensor("ALL")}
                aria-label="Filter Sensor: All"
                className={`py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  !selectedSensor || selectedSensor === "ALL"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All (7,541)
              </button>
              <button
                onClick={() => setSelectedSensor("VIIRS")}
                aria-label="Filter Sensor: VIIRS"
                className={`py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  selectedSensor === "VIIRS"
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                VIIRS (6,623)
              </button>
              <button
                onClick={() => setSelectedSensor("MODIS")}
                aria-label="Filter Sensor: MODIS"
                className={`py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  selectedSensor === "MODIS"
                    ? "bg-sky-500/30 text-sky-300 border border-sky-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                MODIS (918)
              </button>
            </div>
          </div>

          {/* 2. Diurnal Day / Night Overpass */}
          <div>
            <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1.5">
              <span>Diurnal Overpass Pass</span>
              <span className="text-slate-500 font-mono-telemetry text-[10px]">
                {selectedDaynight === "D" ? "Day Solar Pass" : selectedDaynight === "N" ? "Night Nadir Pass" : "Day + Night"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
              <button
                onClick={() => setSelectedDaynight("ALL")}
                aria-label="Filter Pass: All"
                className={`py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  !selectedDaynight || selectedDaynight === "ALL"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Passes
              </button>
              <button
                onClick={() => setSelectedDaynight("D")}
                aria-label="Filter Pass: Day"
                className={`py-1.5 rounded-lg text-center font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectedDaynight === "D"
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Day (4,911)</span>
              </button>
              <button
                onClick={() => setSelectedDaynight("N")}
                aria-label="Filter Pass: Night"
                className={`py-1.5 rounded-lg text-center font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  selectedDaynight === "N"
                    ? "bg-sky-500/30 text-sky-300 border border-sky-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Night (2,630)</span>
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 my-2" />

          {/* 3. Independent MODIS Confidence Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px] font-medium text-sky-400">
                MODIS Confidence Threshold:
              </span>
              <span className="font-mono-telemetry font-bold text-white text-[11px]">
                ≥ {minModisConf}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={minModisConf}
              onChange={(e) => setMinModisConf(Number(e.target.value))}
              aria-label="MODIS Confidence Threshold Slider"
              className="w-full accent-sky-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0% (All 918)</span>
              <span>50%</span>
              <span>100% (Strict)</span>
            </div>
          </div>

          {/* 4. Independent VIIRS Categorical Confidence Checkboxes */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-amber-400">
              VIIRS Categorical Confidence:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setViirsConfLow(!viirsConfLow)}
                className={`p-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  viirsConfLow
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                    : "bg-black/30 border-white/5 text-slate-600 line-through"
                }`}
              >
                <div className="font-mono-telemetry font-semibold text-[11px]">Low (l)</div>
                <div className="text-[9px] opacity-75">Smolder</div>
              </button>

              <button
                onClick={() => setViirsConfNominal(!viirsConfNominal)}
                className={`p-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  viirsConfNominal
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                    : "bg-black/30 border-white/5 text-slate-600 line-through"
                }`}
              >
                <div className="font-mono-telemetry font-semibold text-[11px]">Nominal (n)</div>
                <div className="text-[9px] opacity-75">Standard</div>
              </button>

              <button
                onClick={() => setViirsConfHigh(!viirsConfHigh)}
                className={`p-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  viirsConfHigh
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-200"
                    : "bg-black/30 border-white/5 text-slate-600 line-through"
                }`}
              >
                <div className="font-mono-telemetry font-semibold text-[11px]">High (h)</div>
                <div className="text-[9px] opacity-75">Flaming</div>
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 my-2" />

          {/* 5. Minimum Fire Radiative Power (FRP) Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-[11px] font-medium text-amber-300">
                Minimum Radiative Power:
              </span>
              <span className="font-mono-telemetry font-bold text-amber-400 text-[11px]">
                ≥ {minFrp.toFixed(1)} MW
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="2"
              value={minFrp}
              onChange={(e) => setMinFrp(Number(e.target.value))}
              aria-label="Minimum Radiative Power Slider"
              className="w-full accent-amber-400 bg-slate-800 rounded-lg cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.0 MW</span>
              <span>20 MW</span>
              <span>60+ MW (Peak 169.9)</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
