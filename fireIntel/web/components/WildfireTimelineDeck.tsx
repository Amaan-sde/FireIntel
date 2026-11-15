"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Calendar,
  Flame,
  Sparkles,
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronRight,
} from "lucide-react";

interface WildfireTimelineDeckProps {
  temporalMode: "seasonal" | "verified_2025";
  onToggleMode: (mode: "seasonal" | "verified_2025") => void;
  selectedMonth: number | null;
  setSelectedMonth: (month: number | null) => void;
  selectedSeason: string | null;
  setSelectedSeason: (season: string | null) => void;
  dayOfYearRange: [number, number] | null;
  setDayOfYearRange: (range: [number, number] | null) => void;
  monthlyCounts: Record<number, number>;
  onSetMinFrp?: (frp: number) => void;
}

const MONTHS = [
  { num: 1, name: "Jan", days: 31, start: 1, end: 31 },
  { num: 2, name: "Feb", days: 28, start: 32, end: 59 },
  { num: 3, name: "Mar", days: 31, start: 60, end: 90 },
  { num: 4, name: "Apr", days: 30, start: 91, end: 120, peak: true },
  { num: 5, name: "May", days: 31, start: 121, end: 151, peak: true },
  { num: 6, name: "Jun", days: 30, start: 152, end: 181 },
  { num: 7, name: "Jul", days: 31, start: 182, end: 212 },
  { num: 8, name: "Aug", days: 31, start: 213, end: 243 },
  { num: 9, name: "Sep", days: 30, start: 244, end: 273 },
  { num: 10, name: "Oct", days: 31, start: 274, end: 304 },
  { num: 11, name: "Nov", days: 30, start: 305, end: 334 },
  { num: 12, name: "Dec", days: 31, start: 335, end: 365 },
];

export default function WildfireTimelineDeck({
  temporalMode,
  onToggleMode,
  selectedMonth,
  setSelectedMonth,
  selectedSeason,
  setSelectedSeason,
  dayOfYearRange,
  setDayOfYearRange,
  monthlyCounts,
  onSetMinFrp,
}: WildfireTimelineDeckProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(
    dayOfYearRange ? dayOfYearRange[1] : 365
  );
  const playIntervalRef = useRef<any>(null);

  // Helper to convert day-of-year (1-365) to date string
  const dayToDateStr = (day: number) => {
    let acc = 0;
    for (const m of MONTHS) {
      if (day <= acc + m.days) {
        const d = day - acc;
        return `${m.name} ${d}, 2025`;
      }
      acc += m.days;
    }
    return "Dec 31, 2025";
  };

  // Playback timer for Verified 2025 mode
  useEffect(() => {
    if (isPlaying && temporalMode === "verified_2025") {
      playIntervalRef.current = setInterval(() => {
        setCurrentDay((prev) => {
          const next = prev >= 365 ? 1 : prev + 1;
          setDayOfYearRange([Math.max(1, next - 7), next]); // rolling 7-day window
          return next;
        });
      }, 150);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, temporalMode, setDayOfYearRange]);

  const handleDayScrubberChange = (val: number) => {
    setIsPlaying(false);
    setCurrentDay(val);
    setDayOfYearRange([Math.max(1, val - 3), Math.min(365, val + 3)]);
    setSelectedMonth(null);
  };

  const handleMonthClick = (mNum: number) => {
    setIsPlaying(false);
    if (selectedMonth === mNum) {
      setSelectedMonth(null);
      setDayOfYearRange(null);
    } else {
      setSelectedMonth(mNum);
      setSelectedSeason(null);
      if (temporalMode === "verified_2025") {
        const mObj = MONTHS.find((m) => m.num === mNum);
        if (mObj) {
          setDayOfYearRange([mObj.start, mObj.end]);
          setCurrentDay(mObj.end);
        }
      }
    }
  };

  const handleSeasonalPreset = (preset: "all" | "pre_monsoon" | "post_monsoon" | "winter") => {
    setIsPlaying(false);
    setSelectedMonth(null);
    if (preset === "all") {
      setSelectedSeason(null);
      setDayOfYearRange(null);
    } else {
      setSelectedSeason(preset);
    }
  };

  const maxMonthCount = Math.max(...Object.values(monthlyCounts), 75601);

  return (
    <nav
      aria-label="Wildfire Temporal Exploration Deck"
      className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-5xl pointer-events-auto transition-all duration-300"
    >
      <div className="bg-[#03060d]/90 backdrop-blur-2xl rounded-2xl p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-cyan-500/30 text-slate-200">
        {/* Top Ribbon: Mode Switcher & Active Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-xs font-mono-telemetry">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  onToggleMode("seasonal");
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  temporalMode === "seasonal"
                    ? "bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Explore phenological fire cycles across all 240,365 observations using decoded calendar months"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Seasonal Exploration (All 240k Obs)</span>
              </button>
              <button
                onClick={() => {
                  onToggleMode("verified_2025");
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  temporalMode === "verified_2025"
                    ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Chronological day-of-year scrubber strictly for the 11,904 verified 2025 FIRMS matches"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Verified 2025 Timeline (11.9k Obs)</span>
              </button>
            </div>

            {/* Active Readout */}
            <div className="text-xs font-mono-telemetry text-slate-300 hidden md:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>
                {temporalMode === "seasonal"
                  ? selectedMonth
                    ? `Selected Month: ${MONTHS.find((m) => m.num === selectedMonth)?.name}`
                    : selectedSeason
                    ? `Seasonal Regime: ${selectedSeason.replace("_", "-").toUpperCase()}`
                    : "Baseline Annual Cycle (Months 1–12)"
                  : dayOfYearRange
                  ? `Window: ${dayToDateStr(dayOfYearRange[0])} — ${dayToDateStr(dayOfYearRange[1])}`
                  : "Verified 2025 Range (Full Year)"}
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono-telemetry">
            {temporalMode === "seasonal" ? (
              <>
                <button
                  onClick={() => handleSeasonalPreset("all")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectedMonth === null && selectedSeason === null
                      ? "bg-white/20 text-white font-bold"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  All Months
                </button>
                <button
                  onClick={() => handleSeasonalPreset("pre_monsoon")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectedSeason === "pre_monsoon"
                      ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                      : "bg-amber-500/10 text-amber-300/80 hover:bg-amber-500/20"
                  }`}
                >
                  Pre-Monsoon Peak (Apr–May)
                </button>
                <button
                  onClick={() => handleSeasonalPreset("post_monsoon")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectedSeason === "post_monsoon"
                      ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40"
                      : "bg-emerald-500/10 text-emerald-300/80 hover:bg-emerald-500/20"
                  }`}
                >
                  Post-Monsoon (Oct–Nov)
                </button>
                <button
                  onClick={() => handleSeasonalPreset("winter")}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    selectedSeason === "winter"
                      ? "bg-sky-500/30 text-sky-300 font-bold border border-sky-500/40"
                      : "bg-sky-500/10 text-sky-300/80 hover:bg-sky-500/20"
                  }`}
                >
                  Winter (Dec–Mar)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? "Pause" : "Play 2025"}</span>
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setDayOfYearRange(null);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 hover:text-white"
                >
                  Full 2025
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Timeline Canvas */}
        {temporalMode === "seasonal" ? (
          /* Mode A: 12-Month Interactive Scientific Histogram */
          <div className="grid grid-cols-12 gap-1 sm:gap-2 pt-1 font-mono-telemetry">
            {MONTHS.map((m) => {
              const count = monthlyCounts[m.num] || 0;
              const isSelected = selectedMonth === m.num;
              const barHeightPct = Math.max(12, Math.round((count / maxMonthCount) * 100));

              return (
                <button
                  key={m.num}
                  onClick={() => handleMonthClick(m.num)}
                  className={`group relative flex flex-col items-center justify-end h-16 sm:h-20 p-1 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/25 border border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                      : m.peak
                      ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20"
                      : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
                  }`}
                >
                  {/* Histogram Bar */}
                  <div
                    className={`w-full rounded-md transition-all duration-300 ${
                      isSelected
                        ? "bg-cyan-400 shadow-[0_0_12px_#38bdf8]"
                        : m.peak
                        ? "bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300"
                        : "bg-gradient-to-t from-slate-700 to-slate-500 group-hover:from-slate-600 group-hover:to-slate-400"
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  />

                  {/* Month Label */}
                  <span
                    className={`mt-1.5 text-[10px] sm:text-[11px] font-bold ${
                      isSelected
                        ? "text-cyan-300"
                        : m.peak
                        ? "text-amber-300"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  >
                    {m.name}
                  </span>

                  {/* Hover Count Pill */}
                  <span className="hidden sm:inline-block text-[9px] text-slate-500">
                    {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Mode B: Verified 2025 Continuous Chronological Scrubber */
          <div className="space-y-2 pt-1 font-mono-telemetry">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-300 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Verified Observation Date:</span>
                <strong className="text-white font-bold">{dayToDateStr(currentDay)}</strong>
              </span>
              <span className="text-[10px] text-slate-500">
                Rolling 7-Day Window // Verified 2025 FIRMS Telemetry
              </span>
            </div>

            {/* Scrubber slider */}
            <input
              type="range"
              min="1"
              max="365"
              value={currentDay}
              onChange={(e) => handleDayScrubberChange(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Jan 01, 2025</span>
              <span>Apr–May Fire Surge</span>
              <span>Dec 31, 2025</span>
            </div>

            {/* Scientific Rigor Disclosure */}
            <div className="text-[10px] text-amber-400/80 pt-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                Historical records without verified acquisition dates are omitted from chronological playback to prevent false temporal reconstruction.
              </span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

