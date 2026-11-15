"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Radio,
  Sun,
  Moon,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ComparisonData {
  status: string;
  scope: string;
  aoi: {
    mode: string;
    area_sqkm: number;
    center?: [number, number];
    radius_km?: number;
  };
  baseline: {
    label: string;
    mode: string;
    density_per_sqkm: number;
    data: any;
  };
  comparison: {
    label: string;
    mode: string;
    density_per_sqkm: number;
    data: any;
  };
  deltas: {
    abs_obs: number;
    pct_obs: number;
    abs_viirs: number;
    pct_viirs: number;
    abs_modis: number;
    pct_modis: number;
    abs_frp_mean: number;
    abs_frp_total: number;
    abs_density: number;
  };
}

interface WorkspaceComparisonMatrixProps {
  comparisonResult: ComparisonData | null;
  loading: boolean;
}

export default function WorkspaceComparisonMatrix({
  comparisonResult,
  loading,
}: WorkspaceComparisonMatrixProps) {
  if (loading) {
    return (
      <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center space-y-3 font-mono-telemetry text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span className="text-slate-400 tracking-wider">
          Querying DuckDB In-Memory Engine across Parquet Datasets...
        </span>
      </div>
    );
  }

  if (!comparisonResult || comparisonResult.status !== "SUCCESS") {
    return (
      <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-2 font-mono-telemetry text-xs text-slate-400">
        <p>No comparative telemetry available. Select a geographical region and periods above to run analysis.</p>
      </div>
    );
  }

  const { baseline, comparison, deltas, aoi } = comparisonResult;
  const bData = baseline.data;
  const cData = comparison.data;

  const isSurge = deltas.abs_obs > 0;
  const isDrop = deltas.abs_obs < 0;

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-5 font-mono-telemetry text-xs">
      {/* Matrix Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Comparative Intelligence Telemetry
            </h3>
            <span className="text-[10px] text-slate-400">
              Direct mathematical deltas across {aoi.area_sqkm.toLocaleString()} km² study area
            </span>
          </div>
        </div>

        {/* Delta Summary Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs ${
            isSurge
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : isDrop
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : "bg-white/10 text-white border-white/20"
          }`}
        >
          {isSurge ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>
            {deltas.abs_obs > 0 ? `+${deltas.abs_obs.toLocaleString()}` : deltas.abs_obs.toLocaleString()} Hotspots ({deltas.pct_obs > 0 ? `+${deltas.pct_obs}%` : `${deltas.pct_obs}%`})
          </span>
        </div>
      </div>

      {/* 4 Core Comparison KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Observations */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">THERMAL OBSERVATIONS</span>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-bold text-cyan-300">
              {bData.total_obs.toLocaleString()}
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-lg font-bold text-rose-400">
              {cData.total_obs.toLocaleString()}
            </div>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
            <span>Baseline</span>
            <span className={deltas.abs_obs >= 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              {deltas.abs_obs >= 0 ? `+${deltas.abs_obs}` : deltas.abs_obs} ({deltas.pct_obs}%)
            </span>
            <span>Comparison</span>
          </div>
        </div>

        {/* Card 2: Spatial Density */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">OBSERVATION DENSITY</span>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-bold text-cyan-300">
              {baseline.density_per_sqkm} <span className="text-[10px] text-slate-500">/km²</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-lg font-bold text-rose-400">
              {comparison.density_per_sqkm} <span className="text-[10px] text-slate-500">/km²</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
            <span>Baseline</span>
            <span className={deltas.abs_density >= 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
              {deltas.abs_density >= 0 ? `+${deltas.abs_density}` : deltas.abs_density} /km²
            </span>
            <span>Comparison</span>
          </div>
        </div>

        {/* Card 3: Radiative Heat Output (FRP) */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">MEAN RADIATIVE POWER</span>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-bold text-cyan-300">
              {bData.mean_frp} <span className="text-[10px] text-slate-500">MW</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-lg font-bold text-rose-400">
              {cData.mean_frp} <span className="text-[10px] text-slate-500">MW</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
            <span>Baseline</span>
            <span className={deltas.abs_frp_mean >= 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
              {deltas.abs_frp_mean >= 0 ? `+${deltas.abs_frp_mean}` : deltas.abs_frp_mean} MW
            </span>
            <span>Comparison</span>
          </div>
        </div>

        {/* Card 4: VIIRS 375m Footprint */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <span className="text-[10px] text-slate-400 uppercase block">VIIRS 375M SHARE</span>
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-bold text-cyan-300">
              {bData.total_obs > 0 ? ((bData.viirs_count / bData.total_obs) * 100).toFixed(0) : 0}%
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-lg font-bold text-rose-400">
              {cData.total_obs > 0 ? ((cData.viirs_count / cData.total_obs) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="flex justify-between text-[10px] pt-1 border-t border-white/5 text-slate-400">
            <span>{bData.viirs_count.toLocaleString()} VIIRS</span>
            <span className="text-slate-300">
              {deltas.abs_viirs >= 0 ? `+${deltas.abs_viirs}` : deltas.abs_viirs}
            </span>
            <span>{cData.viirs_count.toLocaleString()} VIIRS</span>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Breakdown Table */}
      <div className="rounded-xl overflow-hidden border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/60 text-slate-400 border-b border-white/10 text-[11px]">
              <th className="py-2.5 px-4 font-bold">TELEMETRY PARAMETER</th>
              <th className="py-2.5 px-4 font-bold text-cyan-300">BASELINE ({baseline.label})</th>
              <th className="py-2.5 px-4 font-bold text-rose-300">COMPARISON ({comparison.label})</th>
              <th className="py-2.5 px-4 font-bold text-right">MATHEMATICAL DELTA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-black/30 text-[11px]">
            <tr>
              <td className="py-2 px-4 text-slate-300">VIIRS 375m Detections</td>
              <td className="py-2 px-4 text-slate-200">{bData.viirs_count.toLocaleString()}</td>
              <td className="py-2 px-4 text-slate-200">{cData.viirs_count.toLocaleString()}</td>
              <td className="py-2 px-4 text-right font-bold text-slate-200">
                {deltas.abs_viirs >= 0 ? `+${deltas.abs_viirs.toLocaleString()}` : deltas.abs_viirs.toLocaleString()} ({deltas.pct_viirs}%)
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-300">MODIS 1km Detections</td>
              <td className="py-2 px-4 text-slate-200">{bData.modis_count.toLocaleString()}</td>
              <td className="py-2 px-4 text-slate-200">{cData.modis_count.toLocaleString()}</td>
              <td className="py-2 px-4 text-right font-bold text-slate-200">
                {deltas.abs_modis >= 0 ? `+${deltas.abs_modis.toLocaleString()}` : deltas.abs_modis.toLocaleString()} ({deltas.pct_modis}%)
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-300">Total Radiative Energy (MW)</td>
              <td className="py-2 px-4 text-slate-200">{bData.total_frp_mw.toLocaleString()} MW</td>
              <td className="py-2 px-4 text-slate-200">{cData.total_frp_mw.toLocaleString()} MW</td>
              <td className="py-2 px-4 text-right font-bold text-slate-200">
                {deltas.abs_frp_total >= 0 ? `+${deltas.abs_frp_total.toLocaleString()}` : deltas.abs_frp_total.toLocaleString()} MW
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-300">Max Single-Pass FRP</td>
              <td className="py-2 px-4 text-slate-200">{bData.max_frp} MW</td>
              <td className="py-2 px-4 text-slate-200">{cData.max_frp} MW</td>
              <td className="py-2 px-4 text-right font-bold text-slate-200">
                {(cData.max_frp - bData.max_frp).toFixed(2)} MW
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-300">Solar Illumination (Day / Night)</td>
              <td className="py-2 px-4 text-slate-200">{bData.day_count} Day / {bData.night_count} Night</td>
              <td className="py-2 px-4 text-slate-200">{cData.day_count} Day / {cData.night_count} Night</td>
              <td className="py-2 px-4 text-right text-slate-400">
                {cData.day_count - bData.day_count >= 0 ? `+${cData.day_count - bData.day_count}` : cData.day_count - bData.day_count} Day
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 text-slate-300">High Confidence Anomaly Count</td>
              <td className="py-2 px-4 text-slate-200">{bData.high_conf_count}</td>
              <td className="py-2 px-4 text-slate-200">{cData.high_conf_count}</td>
              <td className="py-2 px-4 text-right text-slate-400">
                {cData.high_conf_count - bData.high_conf_count >= 0 ? `+${cData.high_conf_count - bData.high_conf_count}` : cData.high_conf_count - bData.high_conf_count}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

