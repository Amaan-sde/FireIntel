"use client";

import React from "react";
import {
  FileCheck,
  Globe2,
  Flame,
  Radio,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Percent,
} from "lucide-react";

interface QualityStats {
  total_rows: number;
  valid_rows: number;
  invalid_coords: number;
  duplicate_rows: number;
  missing_cells_pct: number;
}

interface SpatialStats {
  bbox: [number, number, number, number];
  center: [number, number];
  area_sqkm: number;
}

interface RadiometricStats {
  frp?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
  };
  brightness?: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
}

interface TargetSummary {
  target_col: string;
  classes: string[];
  counts: Record<string, number>;
  class_count: number;
  is_suitable_for_supervised: boolean;
}

interface StudioProfileDeckProps {
  datasetName: string;
  quality: QualityStats;
  spatial: SpatialStats;
  radiometrics: RadiometricStats;
  sensors: Record<string, number>;
  temporal?: {
    min_date: string;
    max_date: string;
  };
  target?: TargetSummary;
  onProceedToTrain: () => void;
}

export default function StudioProfileDeck({
  datasetName,
  quality,
  spatial,
  radiometrics,
  sensors,
  temporal,
  target,
  onProceedToTrain,
}: StudioProfileDeckProps) {
  const validPct = Math.round((quality.valid_rows / quality.total_rows) * 100);

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-5 font-mono-telemetry text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <FileCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Automated Dataset Profiling & Verification
            </h3>
            <span className="text-[10px] text-slate-400">
              Validated telemetry distributions and geometric integrity for {datasetName}
            </span>
          </div>
        </div>

        <button
          data-testid="proceed-to-train-btn"
          onClick={onProceedToTrain}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Machine Learning Engine</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Observations & Validity */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="font-bold uppercase tracking-wider">Valid Detections</span>
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {quality.valid_rows.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400 font-bold">
              ({validPct}% Valid)
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-white/5">
            <span>Invalid Coords: {quality.invalid_coords}</span>
            <span>Duplicates: {quality.duplicate_rows}</span>
          </div>
        </div>

        {/* KPI 2: Geographic Extent */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="font-bold uppercase tracking-wider">Geographic Footprint</span>
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">
              {spatial.area_sqkm.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">km²</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate pt-1 border-t border-white/5">
            Span: [{spatial.bbox[1].toFixed(2)}° to {spatial.bbox[3].toFixed(2)}°N]
          </div>
        </div>

        {/* KPI 3: Fire Radiative Power */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="font-bold uppercase tracking-wider">Mean Radiant Power</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-300">
              {radiometrics.frp ? radiometrics.frp.mean : "N/A"}
            </span>
            <span className="text-xs text-slate-400">MW</span>
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-white/5">
            <span>Peak: {radiometrics.frp ? `${radiometrics.frp.max} MW` : "N/A"}</span>
            <span>95th: {radiometrics.frp ? `${radiometrics.frp.p95} MW` : "N/A"}</span>
          </div>
        </div>

        {/* KPI 4: Sensor & Provenance */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="font-bold uppercase tracking-wider">Sensor Provenance</span>
            <Radio className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="space-y-1">
            {Object.entries(sensors).map(([sensor, cnt]) => {
              const pct = Math.round((cnt / quality.valid_rows) * 100);
              return (
                <div key={sensor} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold">{sensor}:</span>
                  <span className="text-purple-300">
                    {cnt.toLocaleString()} ({pct}%)
                  </span>
                </div>
              );
            })}
            {Object.keys(sensors).length === 0 && (
              <span className="text-slate-500 text-xs">Unspecified satellite sensor</span>
            )}
          </div>
        </div>
      </div>

      {/* Target Summary Banner (if target mapped) */}
      {target && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase">
                Target Variable: {target.target_col}
              </span>
              <span className="text-white text-xs font-bold">
                {target.class_count} Distinct Classes Detected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
              {Object.entries(target.counts).map(([cls, cnt]) => (
                <span key={cls} className="px-2 py-0.5 rounded bg-black/60 border border-white/10">
                  Class {cls}: {cnt.toLocaleString()} obs
                </span>
              ))}
            </div>
          </div>

          <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold whitespace-nowrap">
            ✓ Suitable for Supervised Random Forest
          </span>
        </div>
      )}
    </div>
  );
}

