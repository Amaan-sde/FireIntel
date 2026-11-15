"use client";

import React, { useState } from "react";
import {
  Flame,
  Thermometer,
  Calendar as CalendarIcon,
  Sparkles,
  Info,
  Radio,
  Sun,
  Moon,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export interface CalendarDayItem {
  date: string;
  day_of_year: number;
  month: number;
  day: number;
  weekday: string;
  total_obs: number;
  viirs_count: number;
  modis_count: number;
  day_count: number;
  night_count: number;
  mean_frp: number;
  max_frp: number;
  total_frp: number;
  severity_level: number;
  has_data: boolean;
}

interface HimalayanActivityMatrixProps {
  days: CalendarDayItem[];
  selectedDate: string | null;
  onSelectDate: (day: CalendarDayItem) => void;
  selectedMonth: number | null;
  onSelectMonth?: (month: number | null) => void;
  selectedSeason: string | null;
}

const MONTH_METADATA = [
  { num: 1, name: "January", code: "JAN", days: 31, season: "winter", seasonLabel: "Winter Dry Season", peak: false },
  { num: 2, name: "February", code: "FEB", days: 28, season: "winter", seasonLabel: "Winter Heating Surge", peak: false },
  { num: 3, name: "March", code: "MAR", days: 31, season: "winter", seasonLabel: "Fire Season Onset", peak: false },
  { num: 4, name: "April", code: "APR", days: 30, season: "pre_monsoon", seasonLabel: "Pre-Monsoon Peak Surge", peak: true },
  { num: 5, name: "May", code: "MAY", days: 31, season: "pre_monsoon", seasonLabel: "Pre-Monsoon Peak Flame", peak: true },
  { num: 6, name: "June", code: "JUN", days: 30, season: "monsoon", seasonLabel: "Late Pre-Monsoon Transition", peak: false },
  { num: 7, name: "July", code: "JUL", days: 31, season: "monsoon", seasonLabel: "Monsoon Quenching Minimum", peak: false },
  { num: 8, name: "August", code: "AUG", days: 31, season: "monsoon", seasonLabel: "Monsoon Quenching Minimum", peak: false },
  { num: 9, name: "September", code: "SEP", days: 30, season: "monsoon", seasonLabel: "Monsoon Quenching Minimum", peak: false },
  { num: 10, name: "October", code: "OCT", days: 31, season: "post_monsoon", seasonLabel: "Post-Monsoon Agricultural", peak: false },
  { num: 11, name: "November", code: "NOV", days: 30, season: "post_monsoon", seasonLabel: "Post-Monsoon Agricultural", peak: false },
  { num: 12, name: "December", code: "DEC", days: 31, season: "winter", seasonLabel: "Winter Biomass Burning", peak: false },
];

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function HimalayanActivityMatrix({
  days,
  selectedDate,
  onSelectDate,
  selectedMonth,
  onSelectMonth,
  selectedSeason,
}: HimalayanActivityMatrixProps) {
  const [hoveredDay, setHoveredDay] = useState<CalendarDayItem | null>(null);

  // Group days by month (1 to 12)
  const daysByMonth: Record<number, CalendarDayItem[]> = {};
  for (let m = 1; m <= 12; m++) {
    daysByMonth[m] = [];
  }
  for (const d of days) {
    if (daysByMonth[d.month]) {
      daysByMonth[d.month].push(d);
    }
  }

  // Get color and severity styling
  const getCellStyling = (d: CalendarDayItem, isSelected: boolean) => {
    if (isSelected) {
      return "bg-cyan-500 text-slate-950 font-black ring-2 ring-cyan-300 ring-offset-2 ring-offset-black scale-110 z-10 shadow-[0_0_15px_#38bdf8]";
    }

    if (!d.has_data || d.total_obs === 0) {
      return "bg-white/[0.02] border border-white/[0.04] text-slate-600 hover:border-white/20 hover:text-slate-400";
    }

    switch (d.severity_level) {
      case 1:
        // 1-10 obs (Subtle Surface Heating)
        return "bg-cyan-950/45 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_8px_rgba(6,182,212,0.4)]";
      case 2:
        // 11-40 obs (Moderate Active Combustion)
        return "bg-amber-950/50 border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      case 3:
        // 41-100 obs (Radiative Surge)
        return "bg-orange-950/60 border border-orange-500/50 text-orange-200 font-medium hover:border-orange-400 hover:shadow-[0_0_12px_rgba(249,115,22,0.6)]";
      case 4:
        // 101-250 obs (Severe Wildfire Outbreak)
        return "bg-rose-950/70 border border-rose-500/60 text-rose-200 font-bold hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.7)]";
      case 5:
        // 251+ obs (Extreme Himalayan Paroxysm - Peak Surge)
        return "bg-purple-900/80 border border-purple-400 text-white font-extrabold shadow-[0_0_14px_rgba(192,132,252,0.6)] hover:scale-105";
      default:
        return "bg-white/[0.03] border border-white/5 text-slate-400";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 12-Month Orbital Observatory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {MONTH_METADATA.map((m) => {
          const monthDays = daysByMonth[m.num] || [];
          const monthObs = monthDays.reduce((acc, d) => acc + d.total_obs, 0);
          const monthViirs = monthDays.reduce((acc, d) => acc + d.viirs_count, 0);
          const monthModis = monthDays.reduce((acc, d) => acc + d.modis_count, 0);
          const monthMaxFrp = monthDays.reduce((max, d) => Math.max(max, d.max_frp), 0);

          // Calculate start offset (Day of week for 1st of month in 2025)
          // 2025-01-01 was Wednesday (index 2 for Mon=0, Tue=1, Wed=2)
          const firstDate = new Date(2025, m.num - 1, 1);
          let startDayOffset = firstDate.getDay() - 1; // 0=Mon, 6=Sun
          if (startDayOffset < 0) startDayOffset = 6;

          const isMonthFocused = selectedMonth === m.num;
          const isSeasonMatched =
            !selectedSeason ||
            (selectedSeason === "pre_monsoon" && m.season === "pre_monsoon") ||
            (selectedSeason === "post_monsoon" && m.season === "post_monsoon") ||
            (selectedSeason === "winter" && m.season === "winter") ||
            (selectedSeason === "monsoon" && m.season === "monsoon");

          return (
            <div
              key={m.num}
              className={`rounded-2xl p-3.5 sm:p-4 transition-all duration-300 relative flex flex-col justify-between ${
                isMonthFocused
                  ? "bg-[#040916] border-2 border-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.25)]"
                  : m.peak
                  ? "bg-[#060812]/90 border border-amber-500/35 hover:border-amber-400/60 shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
                  : isSeasonMatched
                  ? "bg-[#030610]/85 border border-white/10 hover:border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
                  : "bg-[#020409]/60 border border-white/5 opacity-40 hover:opacity-100"
              }`}
            >
              {/* Month Header Banner */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono-telemetry font-bold text-slate-500 uppercase">
                      M{String(m.num).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-bold tracking-wider text-white">
                      {m.name}
                    </h3>
                    {m.peak && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono-telemetry font-bold border border-amber-500/35">
                        PEAK
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-telemetry mt-0.5 truncate max-w-[180px]">
                    {m.seasonLabel}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono-telemetry font-extrabold text-amber-400">
                    {monthObs.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono-telemetry">
                    detections
                  </div>
                </div>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono-telemetry text-slate-500 mb-1">
                {WEEKDAYS.map((w, idx) => (
                  <span key={idx}>{w}</span>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1 font-mono-telemetry text-xs">
                {/* Empty cells before month start */}
                {Array.from({ length: startDayOffset }).map((_, idx) => (
                  <div key={`blank-${idx}`} className="h-6.5 sm:h-7 rounded-lg opacity-0" />
                ))}

                {/* Actual Month Days */}
                {monthDays.map((d) => {
                  const isSelected = selectedDate === d.date;
                  const styling = getCellStyling(d, isSelected);

                  return (
                    <button
                      key={d.date}
                      data-date={d.date}
                      data-obs={d.total_obs}
                      data-severity={d.severity_level}
                      onClick={() => onSelectDate(d)}
                      onMouseEnter={() => setHoveredDay(d)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`relative h-6.5 sm:h-7 rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer select-none group ${styling}`}
                      title={`${d.date}: ${d.total_obs} fire detections (${d.viirs_count} VIIRS, ${d.modis_count} MODIS)`}
                    >
                      <span className="text-[10px] sm:text-[11px] leading-none">
                        {d.day}
                      </span>

                      {/* Micro indicator pip for active days */}
                      {d.total_obs > 0 && !isSelected && (
                        <div className="absolute bottom-0.5 flex items-center justify-center gap-0.5">
                          {d.viirs_count > 0 && (
                            <span className="w-1 h-1 rounded-full bg-amber-400/90 inline-block" />
                          )}
                          {d.modis_count > 0 && (
                            <span className="w-1 h-1 rounded-full bg-sky-400/90 inline-block" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Month Micro Telemetry Footnote */}
              <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400 font-mono-telemetry">
                <span className="text-slate-500">
                  V:{monthViirs.toLocaleString()} • M:{monthModis.toLocaleString()}
                </span>
                {monthMaxFrp > 0 ? (
                  <span className="text-amber-400/90 font-medium">
                    Peak: {monthMaxFrp.toFixed(1)} MW
                  </span>
                ) : (
                  <span className="text-slate-600">0 MW</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Precision Hover Tooltip (When user hovers any cell) */}
      {hoveredDay && (
        <aside
          aria-label="Daily Specimen Hover Card"
          className="fixed bottom-6 right-6 z-40 bg-[#040814]/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-3 shadow-2xl font-mono-telemetry text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150 text-slate-200 min-w-[240px]"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{hoveredDay.date}</span>
            </span>
            <span className="text-[10px] text-slate-400">DOY {hoveredDay.day_of_year}</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Detections:</span>
              <strong className="text-amber-400 text-sm">
                {hoveredDay.total_obs.toLocaleString()}
              </strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Sensors:</span>
              <span>
                VIIRS: <strong className="text-amber-300">{hoveredDay.viirs_count}</strong> • MODIS: <strong className="text-sky-300">{hoveredDay.modis_count}</strong>
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Overpass:</span>
              <span>
                Day: {hoveredDay.day_count} • Night: {hoveredDay.night_count}
              </span>
            </div>
            {hoveredDay.total_frp > 0 && (
              <div className="flex justify-between text-slate-300 pt-1 border-t border-white/10">
                <span className="text-slate-400">Total Radiative Energy:</span>
                <span className="text-amber-400 font-bold">{hoveredDay.total_frp.toFixed(1)} MW</span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Comprehensive Radiometric Visual Scale & Legend */}
      <div className="p-4 rounded-2xl bg-[#040812]/90 backdrop-blur-xl border border-white/10 shadow-lg text-slate-300 font-mono-telemetry text-xs space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white uppercase text-[11px] tracking-wider">
              Radiometric Activity Scale & Visual Encodings
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            FIRMS Daily Aggregates (2025 Calendar)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-[11px]">
          {/* Level 0 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-white/5">
            <span className="w-5 h-5 rounded-md bg-white/[0.02] border border-white/[0.04] inline-block shrink-0" />
            <div>
              <div className="text-slate-400 font-bold">0 Obs</div>
              <div className="text-[9px] text-slate-500">No Thermal Anomaly</div>
            </div>
          </div>

          {/* Level 1 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-cyan-500/20">
            <span className="w-5 h-5 rounded-md bg-cyan-950/60 border border-cyan-500/40 inline-block shrink-0" />
            <div>
              <div className="text-cyan-300 font-bold">1–10 Obs</div>
              <div className="text-[9px] text-slate-500">Subtle Surface Heat</div>
            </div>
          </div>

          {/* Level 2 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-amber-500/20">
            <span className="w-5 h-5 rounded-md bg-amber-950/60 border border-amber-500/50 inline-block shrink-0" />
            <div>
              <div className="text-amber-300 font-bold">11–40 Obs</div>
              <div className="text-[9px] text-slate-500">Moderate Fire Active</div>
            </div>
          </div>

          {/* Level 3 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-orange-500/20">
            <span className="w-5 h-5 rounded-md bg-orange-950/70 border border-orange-500/60 inline-block shrink-0" />
            <div>
              <div className="text-orange-300 font-bold">41–100 Obs</div>
              <div className="text-[9px] text-slate-500">Radiative Energy Surge</div>
            </div>
          </div>

          {/* Level 4 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-rose-500/20">
            <span className="w-5 h-5 rounded-md bg-rose-950/80 border border-rose-500/70 inline-block shrink-0" />
            <div>
              <div className="text-rose-300 font-bold">101–250 Obs</div>
              <div className="text-[9px] text-slate-500">Severe Wildfire Front</div>
            </div>
          </div>

          {/* Level 5 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/40 border border-purple-400/30">
            <span className="w-5 h-5 rounded-md bg-purple-900 border border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.6)] inline-block shrink-0" />
            <div>
              <div className="text-purple-300 font-bold">251+ Obs</div>
              <div className="text-[9px] text-slate-500">Peak Surge Outbreak</div>
            </div>
          </div>
        </div>

        {/* Footnote on Pips & Sensor Resolution */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>VIIRS 375m (High Sensitivity Nadir Footprint)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              <span>MODIS 1km (Contextual Nadir Footprint)</span>
            </span>
          </div>
          <span className="text-slate-500">
            Cell Click opens full observation specimen details & link to 3D Command
          </span>
        </div>
      </div>
    </div>
  );
}

