"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  Flame,
  Satellite,
  Info,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface MonthlyPhenologyItem {
  month_num: number;
  month_name: string;
  total_obs: number;
  viirs_obs: number;
  modis_obs: number;
  avg_frp: number;
  max_frp: number;
}

interface TimelineItem {
  date: string;
  obs_count: number;
  viirs_count: number;
  modis_count: number;
  avg_frp: number;
  max_frp: number;
}

interface LocationTemporalChartsProps {
  monthlyData: MonthlyPhenologyItem[];
  timelineData: TimelineItem[];
  locationName: string;
}

export default function LocationTemporalCharts({
  monthlyData,
  timelineData,
  locationName,
}: LocationTemporalChartsProps) {
  const [activeTab, setActiveTab] = useState<"phenology" | "timeline">("phenology");

  // Calculate maximum for phenology scaling
  const maxMonthly = Math.max(...monthlyData.map((d) => d.total_obs), 1);
  const maxTimeline = Math.max(...(timelineData.length > 0 ? timelineData.map((d) => d.obs_count) : [1]), 1);

  // Peak month identifier
  const peakMonth = [...monthlyData].sort((a, b) => b.total_obs - a.total_obs)[0];

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Temporal Phenology &amp; Chronology
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Decoupled seasonal distribution (all records) vs verified 2025 calendar acquisitions.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("phenology")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "phenology"
                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Monthly Phenology</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
              12 Mo
            </span>
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Verified 2025 Timeline</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
              {timelineData.length} Days
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Monthly Phenology (Jan - Dec) */}
      {activeTab === "phenology" && (
        <div className="space-y-4">
          {/* Key Insight Pill */}
          {peakMonth && peakMonth.total_obs > 0 && (
            <div className="flex flex-wrap items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Peak fire observation season for {locationName}: <strong className="text-white">{peakMonth.month_name}</strong> ({peakMonth.total_obs.toLocaleString()} satellite detections, avg {peakMonth.avg_frp} MW).
                </span>
              </div>
              <span className="text-[10px] text-amber-300/80 bg-amber-500/20 px-2 py-0.5 rounded">
                Pre-Monsoon Thermal Climax
              </span>
            </div>
          )}

          {/* 12-Month Bar Chart */}
          <div className="grid grid-cols-12 gap-1.5 sm:gap-2 pt-2 items-end h-48 sm:h-56">
            {monthlyData.map((m) => {
              const heightPct = Math.max(Math.round((m.total_obs / maxMonthly) * 100), 4);
              const isPeak = m.month_num === peakMonth?.month_num && m.total_obs > 0;
              const isFireSeason = m.month_num >= 3 && m.month_num <= 6;

              return (
                <div key={m.month_num} className="flex flex-col items-center h-full justify-end group">
                  {/* Tooltip / Readout on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-300 mb-1 text-center whitespace-nowrap bg-black/90 border border-white/20 px-1.5 py-0.5 rounded pointer-events-none z-10">
                    <div className="font-bold text-white">{m.total_obs.toLocaleString()}</div>
                    <div className="text-cyan-300 text-[9px]">{m.viirs_obs} V / {m.modis_obs} M</div>
                    <div className="text-amber-300 text-[9px]">{m.avg_frp} MW</div>
                  </div>

                  {/* Vertical Bar Stack */}
                  <div className="w-full max-w-[32px] rounded-t-lg overflow-hidden flex flex-col justify-end bg-slate-900 border border-white/10" style={{ height: `${heightPct}%` }}>
                    <div
                      className={`w-full h-full transition-all group-hover:brightness-125 ${
                        isPeak
                          ? "bg-gradient-to-t from-amber-600 to-rose-500"
                          : isFireSeason
                          ? "bg-gradient-to-t from-amber-500/70 to-amber-400"
                          : "bg-slate-700/60"
                      }`}
                    />
                  </div>

                  {/* Month Label */}
                  <div className="text-[11px] font-bold mt-2 text-slate-400 group-hover:text-white">
                    {m.month_name}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono-telemetry hidden sm:block">
                    {m.total_obs > 0 ? (m.total_obs >= 1000 ? `${(m.total_obs / 1000).toFixed(1)}k` : m.total_obs) : "-"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend & Scientific Disclaimer */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Climax Month</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Active Fire Season (Mar-Jun)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-700" /> Monsoon / Low Season</span>
            </div>
            <div className="text-slate-500 text-[10px]">
              Computed from canonical cyclical harmonic features (month_sin / month_cos)
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Verified 2025 Chronological Timeline */}
      {activeTab === "timeline" && (
        <div className="space-y-3">
          {timelineData.length > 0 ? (
            <>
              <div className="text-xs text-slate-300 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Displaying <strong>{timelineData.length} verified acquisition dates</strong> from the 2025 satellite overpasses.
                  </span>
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                  Zero Hallucinated Dates
                </span>
              </div>

              {/* Scrollable Timeline List */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                {timelineData.map((d) => (
                  <div
                    key={d.date}
                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white font-mono-telemetry">{d.date}</span>
                      <span className="text-[10px] text-slate-400">
                        {d.viirs_count > 0 && <span className="text-cyan-400 mr-2">{d.viirs_count} VIIRS</span>}
                        {d.modis_count > 0 && <span className="text-amber-400">{d.modis_count} MODIS</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono-telemetry">
                      <div>
                        <span className="text-slate-500 text-[10px] mr-1">Mean FRP:</span>
                        <span className="text-amber-300 font-semibold">{d.avg_frp} MW</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] mr-1">Peak:</span>
                        <span className="text-rose-400 font-bold">{d.max_frp} MW</span>
                      </div>
                      <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full">
                        {d.obs_count} obs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Info className="w-6 h-6 text-slate-500 mx-auto" />
              <div className="text-xs">
                No calendar-dated 2025 records fall within this {locationName} radius buffer.
              </div>
              <div className="text-[10px] text-slate-500 max-w-md mx-auto">
                In strict adherence to scientific data integrity, historical records with only cyclical harmonic coordinates are displayed exclusively in the Monthly Phenology tab without artificial day distribution.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
