"use client";

import React from "react";
import {
  Flame,
  Satellite,
  Sun,
  Moon,
  CalendarCheck,
  Zap,
  Gauge,
  AlertTriangle,
  Info,
  Clock,
  Layers,
} from "lucide-react";

interface TelemetrySummary {
  total_observations: number;
  viirs_count: number;
  modis_count: number;
  day_count: number;
  night_count: number;
  verified_dated_count: number;
  avg_frp: number;
  max_frp: number;
  min_frp: number;
  avg_brightness: number;
  query_time_ms?: number;
}

interface LocationTelemetryDeckProps {
  summary: TelemetrySummary;
  locationName: string;
  radiusKm: number;
  areaSqKm: number;
  northernBoundaryNote?: string | null;
}

export default function LocationTelemetryDeck({
  summary,
  locationName,
  radiusKm,
  areaSqKm,
  northernBoundaryNote,
}: LocationTelemetryDeckProps) {
  const viirsPct = summary.total_observations > 0
    ? Math.round((summary.viirs_count / summary.total_observations) * 100)
    : 0;
  const modisPct = summary.total_observations > 0
    ? 100 - viirsPct
    : 0;

  const dayPct = summary.total_observations > 0
    ? Math.round((summary.day_count / summary.total_observations) * 100)
    : 0;
  const nightPct = summary.total_observations > 0
    ? 100 - dayPct
    : 0;

  return (
    <div className="space-y-4 font-mono-telemetry">
      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Observations */}
        <div className="bg-[#040816]/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-2 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-amber-300">
              <Flame className="w-4 h-4 text-amber-400" />
              Observations
            </span>
            <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">
              {radiusKm}km Radius
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-white tracking-tight">
              {summary.total_observations.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400">records</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Buffer Area:</span>
            <span className="font-semibold text-slate-300">{areaSqKm.toLocaleString()} km²</span>
          </div>
        </div>

        {/* Card 2: Multi-Sensor Distribution */}
        <div className="bg-[#040816]/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-2 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-cyan-300">
              <Satellite className="w-4 h-4 text-cyan-400" />
              Sensors
            </span>
            <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Dual Ingestion
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-sm">
              <span className="text-xs text-cyan-400 font-bold">VIIRS (375m): </span>
              <span className="text-base font-black text-white">{summary.viirs_count.toLocaleString()}</span>
            </div>
            <div className="text-sm">
              <span className="text-xs text-amber-400 font-bold">MODIS (1km): </span>
              <span className="text-base font-black text-white">{summary.modis_count.toLocaleString()}</span>
            </div>
          </div>

          {/* Sensor Ratio Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${viirsPct}%` }}
              className="h-full bg-cyan-400 transition-all"
              title={`VIIRS: ${viirsPct}%`}
            />
            <div
              style={{ width: `${modisPct}%` }}
              className="h-full bg-amber-400 transition-all"
              title={`MODIS: ${modisPct}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span className="text-cyan-400">{viirsPct}% VIIRS</span>
            <span className="text-amber-400">{modisPct}% MODIS</span>
          </div>
        </div>

        {/* Card 3: Radiative Power (FRP) */}
        <div className="bg-[#040816]/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-2 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-purple-300">
              <Zap className="w-4 h-4 text-purple-400" />
              Fire Radiative Power
            </span>
            <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded">
              MW
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Mean FRP</div>
              <div className="text-2xl font-black text-purple-300">{summary.avg_frp} <span className="text-xs text-slate-400">MW</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase">Peak Observed</div>
              <div className="text-2xl font-black text-rose-400">{summary.max_frp} <span className="text-xs text-slate-400">MW</span></div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Avg Brightness:</span>
            <span className="font-semibold text-slate-300">{summary.avg_brightness} K</span>
          </div>
        </div>

        {/* Card 4: Verified Chronology vs Phenology */}
        <div className="bg-[#040816]/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl space-y-2 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-emerald-300">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              Verified Chronology
            </span>
            <span className="text-[10px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              2025 Calendar
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-white tracking-tight">
              {summary.verified_dated_count.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400">dated records</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Day / Night:</span>
            <span className="font-semibold text-slate-300">
              {summary.day_count.toLocaleString()} D ({dayPct}%) / {summary.night_count.toLocaleString()} N ({nightPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Northern Alpine Boundary Limitation Banner (if active) */}
      {northernBoundaryNote && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Administrative Border Limitation Disclosed: </span>
            <span>{northernBoundaryNote}</span>
          </div>
        </div>
      )}
    </div>
  );
}
