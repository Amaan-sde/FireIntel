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
  Layers,
  LayoutGrid,
} from "lucide-react";

export interface CalendarDayItem {
  date: string;
  day_of_year: number;
  month: number;
  day: number;
  weekday?: string;
  date_label?: string;
  month_name?: string;
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
  season?: string;
  specimens?: any[];
}

interface MonthSummary {
  month: number;
  month_name: string;
  month_abbr: string;
  season: string;
  total_obs: number;
  percentage_of_annual: number;
  viirs_count: number;
  modis_count: number;
  day_count: number;
  night_count: number;
  mean_frp: number;
  max_frp: number;
  total_frp: number;
  num_days: number;
  days: CalendarDayItem[];
}

interface HimalayanActivityMatrixProps {
  days: CalendarDayItem[];
  months?: MonthSummary[];
  selectedDate: string | null;
  onSelectDate: (day: CalendarDayItem) => void;
  selectedMonth: number | null;
  onSelectMonth?: (month: number | null) => void;
  selectedSeason: string | null;
  scope?: "uttarakhand" | "regional";
}

const MONTH_METADATA = [
  { num: 1, name: "January", code: "JAN", days: 31, season: "Winter Biomass Burning", peak: false },
  { num: 2, name: "February", code: "FEB", days: 28, season: "Winter Biomass Burning", peak: false },
  { num: 3, name: "March", code: "MAR", days: 31, season: "Pre-Monsoon Transition", peak: false },
  { num: 4, name: "April", code: "APR", days: 30, season: "Pre-Monsoon Peak Crisis", peak: true },
  { num: 5, name: "May", code: "MAY", days: 31, season: "Pre-Monsoon Peak Crisis", peak: true },
  { num: 6, name: "June", code: "JUN", days: 30, season: "Pre-Monsoon Transition", peak: false },
  { num: 7, name: "July", code: "JUL", days: 31, season: "Monsoon Quenching", peak: false },
  { num: 8, name: "August", code: "AUG", days: 31, season: "Monsoon Quenching", peak: false },
  { num: 9, name: "September", code: "SEP", days: 30, season: "Monsoon Cessation", peak: false },
  { num: 10, name: "October", code: "OCT", days: 31, season: "Post-Monsoon Agricultural", peak: false },
  { num: 11, name: "November", code: "NOV", days: 30, season: "Post-Monsoon Agricultural", peak: false },
  { num: 12, name: "December", code: "DEC", days: 31, season: "Winter Biomass Burning", peak: false },
];

export default function HimalayanActivityMatrix({
  days,
  months = [],
  selectedDate,
  onSelectDate,
  selectedMonth,
  onSelectMonth,
  selectedSeason,
  scope = "uttarakhand",
}: HimalayanActivityMatrixProps) {
  const [hoveredDay, setHoveredDay] = useState<CalendarDayItem | null>(null);

  // Group days by month if months array is not directly passed
  const groupedMonths: MonthSummary[] = React.useMemo(() => {
    if (months && months.length === 12) return months;

    const map = new Map<number, CalendarDayItem[]>();
    for (let m = 1; m <= 12; m++) map.set(m, []);
    days.forEach((d) => {
      const list = map.get(d.month);
      if (list) list.push(d);
    });

    const totalScopeObs = days.reduce((acc, d) => acc + d.total_obs, 0) || 1;

    return MONTH_METADATA.map((meta) => {
      const mDays = map.get(meta.num) || [];
      const mObs = mDays.reduce((acc, d) => acc + d.total_obs, 0);
      const mViirs = mDays.reduce((acc, d) => acc + d.viirs_count, 0);
      const mModis = mDays.reduce((acc, d) => acc + d.modis_count, 0);
      const mDay = mDays.reduce((acc, d) => acc + d.day_count, 0);
      const mNight = mDays.reduce((acc, d) => acc + d.night_count, 0);
      const mFrpTotal = mDays.reduce((acc, d) => acc + d.total_frp, 0);
      const mFrpMean = mObs > 0 ? Number((mFrpTotal / mObs).toFixed(2)) : 0;
      const mFrpMax = mDays.reduce((max, d) => Math.max(max, d.max_frp), 0);

      return {
        month: meta.num,
        month_name: meta.name,
        month_abbr: meta.code,
        season: meta.season,
        total_obs: mObs,
        percentage_of_annual: Number(((mObs / totalScopeObs) * 100).toFixed(2)),
        viirs_count: mViirs,
        modis_count: mModis,
        day_count: mDay,
        night_count: mNight,
        mean_frp: mFrpMean,
        max_frp: mFrpMax,
        total_frp: mFrpTotal,
        num_days: meta.days,
        days: mDays,
      };
    });
  }, [days, months]);

  const getSeverityStyle = (level: number, hasData: boolean) => {
    if (!hasData || level === 0) {
      return "bg-slate-900/60 border-slate-800 text-slate-600 hover:border-slate-600";
    }
    switch (level) {
      case 1:
        return "bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:border-emerald-400";
      case 2:
        return "bg-cyan-950/50 border-cyan-500/40 text-cyan-200 hover:border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]";
      case 3:
        return "bg-amber-950/60 border-amber-500/50 text-amber-200 hover:border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]";
      case 4:
        return "bg-orange-950/80 border-orange-500/70 text-orange-200 hover:border-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.35)]";
      case 5:
      default:
        return "bg-rose-950/90 border-rose-500 text-rose-100 hover:border-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.5)] font-bold";
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>12-Month Himalayan Wildfire Observatory</span>
            <span className="text-xs font-mono-telemetry px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {scope === "uttarakhand" ? "240,365 Canonical Observations" : "510,299 Regional Observations"}
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-mono-telemetry mt-0.5">
            Click any month card or individual day tile to inspect real observation specimens and ML feature embeddings
          </p>
        </div>

        {/* Severity Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-telemetry bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
          <span className="text-slate-400 mr-1">Daily Hotspot Volume:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-950 border border-emerald-500/40" /> 1–100
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-cyan-950 border border-cyan-500/50" /> 101–500
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-950 border border-amber-500/60" /> 501–1.5k
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-orange-950 border border-orange-500/70" /> 1.5k–3k
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-950 border border-rose-500 shadow-[0_0_6px_#f43f5e]" /> &gt;3k Peak
          </span>
        </div>
      </div>

      {/* 12-Month Cards Deck: Spacious, Clean, Beautiful */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
        {groupedMonths.map((m) => {
          const isMonthSelected = selectedMonth === m.month;
          const isPeak = m.month === 4 || m.month === 5;
          const viirsShare = m.total_obs > 0 ? ((m.viirs_count / m.total_obs) * 100).toFixed(0) : "0";
          const dayShare = m.total_obs > 0 ? ((m.day_count / m.total_obs) * 100).toFixed(0) : "0";

          return (
            <div
              key={m.month}
              className={`group relative rounded-2xl p-4.5 transition-all duration-300 flex flex-col justify-between ${
                isMonthSelected
                  ? "bg-gradient-to-b from-rose-950/40 to-[#050b1a]/95 border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.35)]"
                  : isPeak
                  ? "bg-[#040817]/90 border border-rose-500/30 hover:border-rose-500/60 shadow-[0_10px_25px_rgba(244,63,94,0.1)] hover:shadow-[0_15px_35px_rgba(244,63,94,0.25)]"
                  : "bg-[#030612]/80 border border-white/10 hover:border-cyan-500/40 shadow-lg hover:shadow-cyan-500/10"
              }`}
            >
              {/* Card Top: Month Name & Season Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white tracking-wide uppercase">
                        {m.month_name}
                      </span>
                      {isPeak && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          <Flame className="w-2.5 h-2.5" /> PEAK
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono-telemetry text-slate-400 mt-0.5 line-clamp-1">
                      {m.season}
                    </p>
                  </div>

                  <span className="text-xs font-mono-telemetry font-bold text-slate-300 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {m.percentage_of_annual}%
                  </span>
                </div>

                {/* Big Observation Metric */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                      isPeak
                        ? "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                        : "text-white"
                    }`}
                  >
                    {m.total_obs.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-mono-telemetry">hotspots</span>
                </div>

                {/* Telemetry Multi-Bars */}
                <div className="space-y-2 mb-4 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono-telemetry text-[10px]">
                  {/* Sensor Split */}
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>VIIRS 375m: <strong className="text-cyan-300">{viirsShare}%</strong></span>
                      <span>MODIS 1km: <strong className="text-amber-300">{(100 - Number(viirsShare)).toFixed(0)}%</strong></span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${viirsShare}%` }} className="bg-cyan-400 h-full" />
                      <div style={{ width: `${100 - Number(viirsShare)}%` }} className="bg-amber-400 h-full" />
                    </div>
                  </div>

                  {/* Day / Night Solar Split */}
                  <div className="pt-1 border-t border-white/5 flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sun className="w-2.5 h-2.5 text-amber-400" /> Day: <strong className="text-slate-200">{dayShare}%</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Moon className="w-2.5 h-2.5 text-indigo-400" /> Night: <strong className="text-slate-200">{(100 - Number(dayShare)).toFixed(0)}%</strong>
                    </span>
                  </div>

                  {/* FRP Metrics */}
                  <div className="pt-1 border-t border-white/5 flex justify-between text-slate-400">
                    <span>Mean FRP: <strong className="text-emerald-300">{m.mean_frp} MW</strong></span>
                    <span>Max FRP: <strong className="text-rose-300">{m.max_frp} MW</strong></span>
                  </div>
                </div>

                {/* Interactive Day Tiles Matrix */}
                <div className="mb-3">
                  <div className="text-[10px] font-mono-telemetry text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Daily Observations ({m.num_days} Days)</span>
                    <span className="text-[9px] text-slate-500">Click day to inspect</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {m.days.map((d) => {
                      const isSelected = selectedDate === d.date;
                      return (
                        <button
                          key={d.date}
                          data-date={d.date}
                          onClick={() => onSelectDate(d)}
                          onMouseEnter={() => setHoveredDay(d)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`aspect-square rounded-md border text-[9px] font-mono-telemetry flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? "ring-2 ring-white scale-110 z-10 font-bold bg-white text-black border-white shadow-lg"
                              : getSeverityStyle(d.severity_level, d.has_data)
                          }`}
                          title={`${d.date_label || d.date}: ${d.total_obs.toLocaleString()} hotspots, mean FRP ${d.mean_frp} MW`}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <button
                onClick={() => {
                  if (m.days.length > 0) {
                    onSelectDate(m.days[0]);
                  }
                  if (onSelectMonth) {
                    onSelectMonth(m.month);
                  }
                }}
                className="w-full mt-2 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/40 text-xs font-mono-telemetry text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Inspect {m.month_name} Telemetry</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Hover Readout */}
      {hoveredDay && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-2xl bg-black/95 border border-amber-500/60 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex items-center gap-4 text-xs font-mono-telemetry pointer-events-none transition-all">
          <div className="flex items-center gap-2 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <strong className="text-amber-300 uppercase">{hoveredDay.date_label || hoveredDay.date}</strong>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400 font-bold">{hoveredDay.total_obs.toLocaleString()} Hotspots</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-400">
            <span>VIIRS: <strong className="text-cyan-300">{hoveredDay.viirs_count}</strong></span>
            <span>MODIS: <strong className="text-amber-300">{hoveredDay.modis_count}</strong></span>
            <span>Total FRP: <strong className="text-emerald-300">{hoveredDay.total_frp.toLocaleString()} MW</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
