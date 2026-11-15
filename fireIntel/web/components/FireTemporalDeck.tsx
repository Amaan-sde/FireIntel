"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Calendar, Flame, Sparkles, RotateCcw, Clock, Activity } from "lucide-react";

interface FireTemporalDeckProps {
  selectedMonth: number | null;
  setSelectedMonth: (month: number | null) => void;
  dayOfYearRange: [number, number] | null;
  setDayOfYearRange: (range: [number, number] | null) => void;
  onSetMinFrp: (frp: number) => void;
  monthlyCounts: Record<number, number>;
}

export default function FireTemporalDeck({
  selectedMonth,
  setSelectedMonth,
  dayOfYearRange,
  setDayOfYearRange,
  onSetMinFrp,
  monthlyCounts,
}: FireTemporalDeckProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(dayOfYearRange ? dayOfYearRange[1] : 365);
  const playIntervalRef = useRef<any>(null);

  const months = [
    { num: 1, name: "Jan", days: 31, start: 1, end: 31 },
    { num: 2, name: "Feb", days: 28, start: 32, end: 59 },
    { num: 3, name: "Mar", days: 31, start: 60, end: 90 },
    { num: 4, name: "Apr", days: 30, start: 91, end: 120 },
    { num: 5, name: "May", days: 31, start: 121, end: 151 },
    { num: 6, name: "Jun", days: 30, start: 152, end: 181 },
    { num: 7, name: "Jul", days: 31, start: 182, end: 212 },
    { num: 8, name: "Aug", days: 31, start: 213, end: 243 },
    { num: 9, name: "Sep", days: 30, start: 244, end: 273 },
    { num: 10, name: "Oct", days: 31, start: 274, end: 304 },
    { num: 11, name: "Nov", days: 30, start: 305, end: 334 },
    { num: 12, name: "Dec", days: 31, start: 335, end: 365 },
  ];

  // Helper to convert day-of-year (1-365) to date string
  const dayToDateStr = (day: number) => {
    let acc = 0;
    for (const m of months) {
      if (day <= acc + m.days) {
        const d = day - acc;
        return `${m.name} ${d}, 2025`;
      }
      acc += m.days;
    }
    return "Dec 31, 2025";
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
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
  }, [isPlaying, setDayOfYearRange]);

  const handleDayScrubberChange = (val: number) => {
    setIsPlaying(false);
    setCurrentDay(val);
    // When scrubbing manually, set a rolling 5-day window around the selected day
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
      const mObj = months.find((m) => m.num === mNum);
      if (mObj) {
        setDayOfYearRange([mObj.start, mObj.end]);
        setCurrentDay(mObj.end);
      }
    }
  };

  const handlePreset = (preset: string) => {
    setIsPlaying(false);
    if (preset === "all") {
      setSelectedMonth(null);
      setDayOfYearRange(null);
      onSetMinFrp(0);
    } else if (preset === "pre_monsoon") {
      setSelectedMonth(null);
      setDayOfYearRange([91, 151]); // April 1 to May 31
      setCurrentDay(120);
      onSetMinFrp(0);
    } else if (preset === "april") {
      setSelectedMonth(4);
      setDayOfYearRange([91, 120]);
      setCurrentDay(120);
      onSetMinFrp(0);
    } else if (preset === "winter") {
      setSelectedMonth(12);
      setDayOfYearRange([335, 365]);
      setCurrentDay(365);
      onSetMinFrp(0);
    } else if (preset === "high_frp") {
      setSelectedMonth(null);
      setDayOfYearRange(null);
      onSetMinFrp(50);
    }
  };

  const isFiltered = selectedMonth !== null || dayOfYearRange !== null;

  // Find max monthly count for normalizing histogram bar heights
  const maxMonthCount = Math.max(...Object.values(monthlyCounts), 2255);

  return (
    <nav
      aria-label="Temporal fire timeline controls"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl pointer-events-auto transition-all duration-300"
    >
      <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] border border-cyan-500/20 text-slate-200">
        {/* Top Deck: Date Readout & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-white/[0.08] pb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold tracking-wider text-white font-mono-telemetry uppercase">
                {dayOfYearRange
                  ? `${dayToDateStr(dayOfYearRange[0])} — ${dayToDateStr(dayOfYearRange[1])}`
                  : selectedMonth
                  ? `${months.find((m) => m.num === selectedMonth)?.name} 2025`
                  : "Complete Year 2025 (7,541 Obs)"}
              </span>
            </div>

            {isFiltered && (
              <button
                onClick={() => handlePreset("all")}
                className="text-[10px] font-mono-telemetry text-rose-300 hover:text-white bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Full Year</span>
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-telemetry">
            <button
              onClick={() => handlePreset("all")}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-all cursor-pointer border border-white/[0.06]"
            >
              All Year
            </button>
            <button
              onClick={() => handlePreset("pre_monsoon")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all border border-amber-500/20 cursor-pointer"
            >
              Apr–May Peak (2,883)
            </button>
            <button
              onClick={() => handlePreset("april")}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-all border border-amber-500/30 cursor-pointer"
            >
              April (2,255)
            </button>
            <button
              onClick={() => handlePreset("winter")}
              className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-all border border-sky-500/20 cursor-pointer"
            >
              Dec Winter (1,678)
            </button>
            <button
              onClick={() => handlePreset("high_frp")}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all border border-purple-500/20 cursor-pointer"
            >
              &ge; 50 MW Extremes
            </button>
          </div>
        </div>

        {/* Middle Deck: Continuous Day Scrubber with Playback */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-lg ${
              isPlaying
                ? "bg-amber-400 text-slate-950 font-semibold ring-2 ring-amber-400/50"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
            title={isPlaying ? "Pause temporal playback" : "Play temporal sequence across 2025"}
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <div className="flex-1 space-y-1">
            <input
              type="range"
              min="1"
              max="365"
              value={currentDay}
              onChange={(e) => handleDayScrubberChange(Number(e.target.value))}
              aria-label="365-day chronological timeline scrubber"
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono-telemetry">
              <span>Jan 1 (Day 1)</span>
              <span className="text-cyan-400 font-medium">
                Current: Day {currentDay} ({dayToDateStr(currentDay)})
              </span>
              <span>Dec 31 (Day 365)</span>
            </div>
          </div>
        </div>

        {/* Bottom Deck: 12-Month Segmented Buttons with Fire Frequency Histogram Sparklines */}
        <div className="grid grid-cols-12 gap-1 sm:gap-1.5 text-center">
          {months.map((m) => {
            const count = monthlyCounts[m.num] || 0;
            const isSelected = selectedMonth === m.num;
            const barHeightPct = Math.max(8, Math.min(100, Math.round((count / maxMonthCount) * 100)));

            return (
              <button
                key={m.num}
                onClick={() => handleMonthClick(m.num)}
                className={`group py-1.5 px-0.5 sm:px-1 rounded-xl transition-all flex flex-col items-center justify-between gap-1 cursor-pointer border ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 font-bold shadow-md scale-105"
                    : "bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white border-white/[0.04]"
                }`}
                title={`${m.name} 2025: ${count.toLocaleString()} fire detections`}
              >
                {/* Mini Histogram Bar */}
                <div className="w-full h-5 flex items-end justify-center px-1">
                  <div
                    className={`w-full max-w-[8px] rounded-t transition-all duration-300 ${
                      isSelected
                        ? "bg-cyan-400 shadow-[0_0_8px_#38bdf8]"
                        : count > 1500
                        ? "bg-amber-400/90"
                        : count > 500
                        ? "bg-amber-500/60"
                        : "bg-slate-700/60"
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  />
                </div>

                <span className="text-[10px] sm:text-[11px] font-mono-telemetry uppercase">{m.name}</span>
                <span className="text-[9px] font-mono-telemetry text-slate-500 group-hover:text-slate-300 hidden sm:inline">
                  {count > 0 ? (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count) : "-"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
