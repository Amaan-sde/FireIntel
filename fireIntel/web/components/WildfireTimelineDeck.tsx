"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Calendar,
  Clock,
  AlertTriangle,
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
  { num: 1,  name: "Jan", days: 31, start: 1,   end: 31,  peak: false },
  { num: 2,  name: "Feb", days: 28, start: 32,  end: 59,  peak: false },
  { num: 3,  name: "Mar", days: 31, start: 60,  end: 90,  peak: false },
  { num: 4,  name: "Apr", days: 30, start: 91,  end: 120, peak: true  },
  { num: 5,  name: "May", days: 31, start: 121, end: 151, peak: true  },
  { num: 6,  name: "Jun", days: 30, start: 152, end: 181, peak: false },
  { num: 7,  name: "Jul", days: 31, start: 182, end: 212, peak: false },
  { num: 8,  name: "Aug", days: 31, start: 213, end: 243, peak: false },
  { num: 9,  name: "Sep", days: 30, start: 244, end: 273, peak: false },
  { num: 10, name: "Oct", days: 31, start: 274, end: 304, peak: false },
  { num: 11, name: "Nov", days: 30, start: 305, end: 334, peak: false },
  { num: 12, name: "Dec", days: 31, start: 335, end: 365, peak: false },
];

/** Formats a count into a compact string like 75.6k */
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

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
  const [mounted, setMounted] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const playIntervalRef = useRef<any>(null);

  // Trigger mount animation after first paint
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Helper: day-of-year → readable date string
  const dayToDateStr = (day: number) => {
    let acc = 0;
    for (const m of MONTHS) {
      if (day <= acc + m.days) return `${m.name} ${day - acc}, 2025`;
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
          setDayOfYearRange([Math.max(1, next - 7), next]);
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
      {/* Outer glow halo */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

      <div className="relative bg-[#03060d]/95 backdrop-blur-2xl rounded-2xl p-2.5 sm:p-3 shadow-[0_24px_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(56,189,248,0.2)] border border-cyan-500/25 text-slate-200 overflow-hidden">

        {/* Subtle scanline overlay */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg,#ffffff 0px,#ffffff 1px,transparent 1px,transparent 4px)",
          }}
        />

        {/* Top Ribbon: Mode Switcher & Active Telemetry */}
        <div className="relative flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.07]">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-xs font-mono-telemetry">
              <button
                onClick={() => { setIsPlaying(false); onToggleMode("seasonal"); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  temporalMode === "seasonal"
                    ? "bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
                title="Explore phenological fire cycles across all 240,365 observations using decoded calendar months"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Seasonal Exploration (All 240k Obs)</span>
              </button>
              <button
                onClick={() => onToggleMode("verified_2025")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  temporalMode === "verified_2025"
                    ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                }`}
                title="Chronological day-of-year scrubber strictly for the 11,904 verified 2025 FIRMS matches"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Verified 2025 Timeline (11.9k Obs)</span>
              </button>
            </div>

            {/* Live status dot + active readout */}
            <div className="text-xs font-mono-telemetry text-slate-300 hidden md:flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
              </span>
              <span className="text-slate-400">
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

          {/* Quick Preset / Playback Buttons */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono-telemetry">
            {temporalMode === "seasonal" ? (
              <>
                <button
                  onClick={() => handleSeasonalPreset("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                    selectedMonth === null && selectedSeason === null
                      ? "bg-white/20 text-white font-bold border-white/20 shadow-sm"
                      : "bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10"
                  }`}
                >
                  All Months
                </button>
                <button
                  onClick={() => handleSeasonalPreset("pre_monsoon")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                    selectedSeason === "pre_monsoon"
                      ? "bg-amber-500/30 text-amber-200 font-bold border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      : "bg-amber-500/8 text-amber-300/70 border-amber-500/15 hover:bg-amber-500/20 hover:text-amber-200"
                  }`}
                >
                  Pre-Monsoon Peak (Apr–May)
                </button>
                <button
                  onClick={() => handleSeasonalPreset("post_monsoon")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                    selectedSeason === "post_monsoon"
                      ? "bg-emerald-500/30 text-emerald-200 font-bold border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "bg-emerald-500/8 text-emerald-300/70 border-emerald-500/15 hover:bg-emerald-500/20 hover:text-emerald-200"
                  }`}
                >
                  Post-Monsoon (Oct–Nov)
                </button>
                <button
                  onClick={() => handleSeasonalPreset("winter")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                    selectedSeason === "winter"
                      ? "bg-sky-500/30 text-sky-200 font-bold border-sky-500/50 shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                      : "bg-sky-500/8 text-sky-300/70 border-sky-500/15 hover:bg-sky-500/20 hover:text-sky-200"
                  }`}
                >
                  Winter (Dec–Mar)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_16px_rgba(245,158,11,0.4)]"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? "Pause" : "Play 2025"}</span>
                </button>
                <button
                  onClick={() => { setIsPlaying(false); setDayOfYearRange(null); }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 hover:text-white border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Full 2025
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Dynamic Timeline Canvas ── */}
        {temporalMode === "seasonal" ? (
          /* Mode A: 12-Month Interactive Scientific Histogram */
          <div className="relative grid grid-cols-12 gap-1.5 sm:gap-2 pt-1 font-mono-telemetry">

            {MONTHS.map((m) => {
              const count = monthlyCounts[m.num] || 0;
              const isSelected = selectedMonth === m.num;
              const isHovered = hoveredMonth === m.num;
              const rawPct = Math.max(10, Math.round((count / maxMonthCount) * 100));
              // After mount we show real height; before: 0 for entry animation
              const barH = mounted ? rawPct : 0;

              // Choose colour tier based on relative intensity
              const intensity = count / maxMonthCount;
              const barGradient = isSelected
                ? "from-cyan-500 to-cyan-300"
                : m.peak
                ? intensity > 0.85
                  ? "from-orange-700 via-amber-500 to-yellow-300"
                  : "from-amber-700 via-amber-500 to-amber-300"
                : intensity > 0.3
                ? "from-slate-700 via-slate-500 to-slate-400"
                : "from-slate-800 via-slate-700 to-slate-500";

              const glowColor = isSelected
                ? "rgba(56,189,248,0.5)"
                : m.peak && intensity > 0.5
                ? "rgba(251,146,60,0.45)"
                : "transparent";

              return (
                <button
                  key={m.num}
                  data-month={m.num}
                  aria-label={`Select ${m.name}`}
                  onClick={() => handleMonthClick(m.num)}
                  onMouseEnter={() => setHoveredMonth(m.num)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  className={`group relative flex flex-col items-center justify-end h-14 sm:h-16 p-1 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-400/60"
                      : m.peak
                      ? "bg-amber-500/8 hover:bg-amber-500/18 border border-amber-500/20 hover:border-amber-400/40"
                      : "bg-white/[0.025] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/10"
                  } ${isSelected || isHovered ? "scale-[1.03] -translate-y-0.5" : ""}`}
                  style={{
                    boxShadow: isSelected
                      ? `0 0 18px ${glowColor}, 0 0 4px ${glowColor}`
                      : isHovered && m.peak
                      ? `0 0 12px ${glowColor}`
                      : undefined,
                    transition: "transform 0.18s ease, box-shadow 0.18s ease, background-color 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  {/* Peak fire badge */}
                  {m.peak && !isSelected && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-pulse" />
                  )}

                  {/* Animated histogram bar */}
                  <div className="relative w-full overflow-hidden rounded-md" style={{ height: "72%" }}>
                    {/* Background track */}
                    <div className="absolute inset-0 rounded-md bg-white/[0.04]" />
                    {/* Filled bar */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-md bg-gradient-to-t ${barGradient}`}
                      style={{
                        height: `${barH}%`,
                        transition: mounted
                          ? "height 0.65s cubic-bezier(0.34,1.56,0.64,1)"
                          : "none",
                        boxShadow: isSelected
                          ? `0 -4px 16px ${glowColor}`
                          : m.peak && intensity > 0.5
                          ? `0 -2px 10px rgba(251,146,60,0.35)`
                          : undefined,
                      }}
                    />
                    {/* Shimmer sweep on hover */}
                    <div
                      className={`absolute inset-0 rounded-md pointer-events-none transition-opacity duration-300 ${isHovered || isSelected ? "opacity-100" : "opacity-0"}`}
                      style={{
                        background:
                          "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.14) 50%,transparent 60%)",
                        backgroundSize: "200% 100%",
                        animation: isHovered || isSelected ? "shimmer 1.4s linear infinite" : undefined,
                      }}
                    />
                  </div>

                  {/* Month label */}
                  <span
                    className={`mt-1.5 text-[10px] sm:text-[11px] font-bold leading-none transition-colors ${
                      isSelected
                        ? "text-cyan-300"
                        : m.peak
                        ? "text-amber-300"
                        : "text-slate-500 group-hover:text-slate-200"
                    }`}
                  >
                    {m.name}
                  </span>

                  {/* Count chip below label */}
                  <span
                    className={`text-[9px] leading-none mt-0.5 transition-colors ${
                      isSelected
                        ? "text-cyan-400/90"
                        : m.peak
                        ? "text-amber-400/70"
                        : "text-slate-600 group-hover:text-slate-400"
                    }`}
                  >
                    {fmtCount(count)}
                  </span>

                  {/* Tooltip on hover */}
                  {isHovered && count > 0 && (
                    <div
                      className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[10px] font-mono-telemetry pointer-events-none"
                      style={{
                        background: "rgba(4,8,16,0.95)",
                        border: "1px solid rgba(56,189,248,0.3)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                        color: "#e2e8f0",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <span className="font-bold text-cyan-300">{m.name}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-white font-bold">{count.toLocaleString()}</span>
                      <span className="text-slate-400 ml-1">obs</span>
                      <span className="text-slate-500 ml-1.5">({((count / maxMonthCount) * 100).toFixed(0)}%)</span>
                      {/* Tooltip arrow */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2.5 h-2.5 rotate-45"
                        style={{ background: "rgba(4,8,16,0.95)", borderRight: "1px solid rgba(56,189,248,0.3)", borderBottom: "1px solid rgba(56,189,248,0.3)" }}
                      />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Shimmer keyframe (injected once) */}
            <style>{`
              @keyframes shimmer {
                0%   { background-position: 200% center; }
                100% { background-position: -200% center; }
              }
            `}</style>
          </div>
        ) : (
          /* Mode B: Verified 2025 Continuous Chronological Scrubber */
          <div className="space-y-3 pt-1 font-mono-telemetry">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-300 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Verified Observation Date:</span>
                <strong className="text-white font-bold">{dayToDateStr(currentDay)}</strong>
              </span>
              <span className="text-[10px] text-slate-500">Rolling 7-Day Window // Verified 2025 FIRMS Telemetry</span>
            </div>

            {/* Styled scrubber */}
            <div className="relative">
              <input
                type="range"
                min="1"
                max="365"
                value={currentDay}
                onChange={(e) => handleDayScrubberChange(parseInt(e.target.value, 10))}
                className="w-full cursor-pointer h-2 rounded-full appearance-none"
                style={{
                  background: `linear-gradient(to right, #f59e0b ${((currentDay - 1) / 364) * 100}%, rgba(255,255,255,0.08) ${((currentDay - 1) / 364) * 100}%)`,
                  accentColor: "#f59e0b",
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Jan 01, 2025</span>
              <span className="text-amber-400/70">Apr–May Fire Surge ▲</span>
              <span>Dec 31, 2025</span>
            </div>

            <div className="text-[10px] text-amber-400/80 pt-0.5 flex items-center gap-1.5">
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
