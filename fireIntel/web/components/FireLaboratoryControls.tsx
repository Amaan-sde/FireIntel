"use client";

import React, { useState } from "react";
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp, Sun, Moon, Sparkles, Filter, ShieldCheck, Flame, Radio } from "lucide-react";

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
      className="fixed top-18 sm:top-20 right-3 sm:right-6 z-20 w-[94vw] sm:w-[320px] max-w-sm pointer-events-auto transition-all duration-300"
    >
      <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-cyan-500/20 max-h-[calc(100vh-6rem)] flex flex-col text-slate-200">
        {/* Header Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3.5 px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors border-b border-white/[0.08] flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wider text-white uppercase font-mono-telemetry">
              Filter Laboratory
            </span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResetAll();
                }}
                className="text-[10px] font-mono-telemetry text-rose-300 hover:text-white bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Control Panel */}
        {isExpanded && (
          <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1 scrollbar-none">
            {/* 1. Constellation Sensor Selector */}
            <div>
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1.5 font-mono-telemetry">
                <span>CONSTELLATION PLATFORM</span>
                <span className="text-cyan-400 text-[10px]">
                  {selectedSensor === "VIIRS" ? "VIIRS 375m" : selectedSensor === "MODIS" ? "MODIS 1km" : "Dual Constellation"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => setSelectedSensor("ALL")}
                  aria-label="Filter Sensor: All"
                  className={`py-1.5 rounded-lg text-center font-medium font-mono-telemetry text-[11px] transition-all cursor-pointer ${
                    !selectedSensor || selectedSensor === "ALL"
                      ? "bg-white/20 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All (240,365)
                </button>
                <button
                  onClick={() => setSelectedSensor("VIIRS")}
                  aria-label="Filter Sensor: VIIRS"
                  className={`py-1.5 rounded-lg text-center font-medium font-mono-telemetry text-[11px] transition-all cursor-pointer ${
                    selectedSensor === "VIIRS"
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  VIIRS (201,993)
                </button>
                <button
                  onClick={() => setSelectedSensor("MODIS")}
                  aria-label="Filter Sensor: MODIS"
                  className={`py-1.5 rounded-lg text-center font-medium font-mono-telemetry text-[11px] transition-all cursor-pointer ${
                    selectedSensor === "MODIS"
                      ? "bg-sky-500/30 text-sky-300 border border-sky-500/40 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  MODIS (38,372)
                </button>
              </div>
            </div>

            {/* 2. Diurnal Day / Night Overpass */}
            <div>
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1.5 font-mono-telemetry">
                <span>DIURNAL ORBITAL PASS</span>
                <span className="text-slate-400 text-[10px]">
                  {selectedDaynight === "D" ? "Day Solar" : selectedDaynight === "N" ? "Night Nadir" : "24h Pass"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => setSelectedDaynight("ALL")}
                  aria-label="Filter Pass: All"
                  className={`py-1.5 rounded-lg text-center font-medium font-mono-telemetry text-[11px] transition-all cursor-pointer ${
                    !selectedDaynight || selectedDaynight === "ALL"
                      ? "bg-white/20 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All Passes
                </button>
                <button
                  onClick={() => setSelectedDaynight("D")}
                  aria-label="Filter Pass: Day"
                  className={`py-1.5 rounded-lg text-center font-medium font-mono-telemetry text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    selectedDaynight === "D"
                      ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>Day (4,911)</span>
                </button>
                <button
                  onClick={() => setSelectedDaynight("N")}
                  aria-label="Filter Pass: Night"
                  className={`py-1.5 rounded-lg text-center font-medium font-mono-telemetry text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    selectedDaynight === "N"
                      ? "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>Night (2,630)</span>
                </button>
              </div>
            </div>

            {/* 3. Decoupled Confidence Semantics */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/[0.06] space-y-3">
              <div className="text-[10px] font-mono-telemetry font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sensor Confidence Semantics</span>
              </div>

              {/* MODIS Continuous Percentage */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-sky-300 font-mono-telemetry">MODIS Quantitative:</span>
                  <span className="font-mono-telemetry text-sky-400 font-bold">
                    &ge; {minModisConf}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minModisConf}
                  onChange={(e) => setMinModisConf(Number(e.target.value))}
                  aria-label="MODIS Confidence Threshold Slider"
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono-telemetry mt-0.5">
                  <span>0% (All 918)</span>
                  <span>50%</span>
                  <span>100% (High)</span>
                </div>
              </div>

              {/* VIIRS Categorical Flags */}
              <div>
                <div className="flex justify-between items-center text-[11px] mb-1.5">
                  <span className="text-amber-300 font-mono-telemetry">VIIRS Qualitative:</span>
                  <span className="text-slate-400 text-[10px] font-mono-telemetry">
                    {[viirsConfLow && "Low", viirsConfNominal && "Nominal", viirsConfHigh && "High"].filter(Boolean).join(", ") || "None"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setViirsConfLow(!viirsConfLow)}
                    className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-mono-telemetry transition-all cursor-pointer border ${
                      viirsConfLow
                        ? "bg-slate-700/50 text-slate-200 border-slate-600 font-semibold"
                        : "bg-black/20 text-slate-600 border-transparent hover:text-slate-400"
                    }`}
                  >
                    Low (l)
                  </button>
                  <button
                    onClick={() => setViirsConfNominal(!viirsConfNominal)}
                    className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-mono-telemetry transition-all cursor-pointer border ${
                      viirsConfNominal
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                        : "bg-black/20 text-slate-600 border-transparent hover:text-slate-400"
                    }`}
                  >
                    Nominal (n)
                  </button>
                  <button
                    onClick={() => setViirsConfHigh(!viirsConfHigh)}
                    className={`py-1 px-1.5 rounded-lg text-center text-[10px] font-mono-telemetry transition-all cursor-pointer border ${
                      viirsConfHigh
                        ? "bg-rose-500/30 text-rose-300 border-rose-500/40 font-semibold"
                        : "bg-black/20 text-slate-600 border-transparent hover:text-slate-400"
                    }`}
                  >
                    High (h)
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Minimum Fire Radiative Power (FRP) Slider */}
            <div>
              <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1 font-mono-telemetry">
                <span>RADIATIVE POWER THRESHOLD</span>
                <span className="font-mono-telemetry text-amber-400 font-bold">
                  &ge; {minFrp} MW
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minFrp}
                onChange={(e) => setMinFrp(Number(e.target.value))}
                aria-label="Minimum Radiative Power Slider"
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono-telemetry mt-0.5">
                <span>0 MW (All)</span>
                <span>20 MW (Severe)</span>
                <span>50+ MW (Extreme)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
