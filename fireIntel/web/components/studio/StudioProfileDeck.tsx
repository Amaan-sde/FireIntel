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
  CheckCircle2,
  Activity,
  Satellite,
  Compass,
} from "lucide-react";

interface SpatialStats {
  bbox: [number, number, number, number];
  center: [number, number];
  area_sqkm: number;
}

interface RadiometricStats {
  frp?: {
    total_mw: number;
    min_mw?: number;
    max_mw: number;
    mean_mw: number;
    median_mw: number;
    p95_mw: number;
  };
  brightness?: {
    min_k: number;
    max_k: number;
    mean_k: number;
  };
}

interface TargetSummary {
  has_target_label: boolean;
  classes: string[];
  counts: Record<string, number>;
  is_suitable_for_supervised: boolean;
}

interface StudioProfileDeckProps {
  datasetName: string;
  harmonisationSummary: any;
  spatial: SpatialStats;
  radiometrics: RadiometricStats;
  breakdowns: {
    sensors: Record<string, number>;
    categories: Record<string, number>;
    confidence: Record<string, number>;
    daynight: Record<string, number>;
    monthly?: Record<string, number>;
  };
  target?: TargetSummary;
  onProceedToTrain: () => void;
}

export default function StudioProfileDeck({
  datasetName,
  harmonisationSummary,
  spatial,
  radiometrics,
  breakdowns,
  target,
  onProceedToTrain,
}: StudioProfileDeckProps) {
  const totalHarmonised = harmonisationSummary?.net_harmonised_observations || 0;
  const viirsCount = breakdowns.sensors?.VIIRS || 0;
  const modisCount = breakdowns.sensors?.MODIS || 0;
  const archiveCount = breakdowns.categories?.ARCHIVE || 0;
  const nrtCount = breakdowns.categories?.NRT || 0;

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
              Harmonised Multi-Satellite Quality & Spatial Telemetry
            </h3>
            <span className="text-[10px] text-slate-400">
              Validated coordinate geometries and sensor distributions for {datasetName}
            </span>
          </div>
        </div>

        <button
          data-testid="proceed-to-train-btn"
          onClick={onProceedToTrain}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold transition-all shadow-lg hover:shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Machine Learning Engine</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Key Analytical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Harmonised */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Harmonised Obs</span>
          <div className="text-xl font-black text-white">
            {totalHarmonised.toLocaleString()}
          </div>
          <div className="text-[9px] text-emerald-400 font-bold">100% WGS-84 Valid</div>
        </div>

        {/* Geographic Footprint */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Surface Footprint</span>
          <div className="text-xl font-black text-cyan-300">
            {spatial.area_sqkm?.toLocaleString() || "0"} <span className="text-xs font-normal text-slate-400">km²</span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            {spatial.center ? `${spatial.center[1]}°N, ${spatial.center[0]}°E` : "Global"}
          </div>
        </div>

        {/* VIIRS vs MODIS */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Sensor Breakdown</span>
          <div className="text-sm font-bold text-white flex justify-between">
            <span className="text-cyan-400">VIIRS:</span>
            <span>{viirsCount.toLocaleString()}</span>
          </div>
          <div className="text-sm font-bold text-white flex justify-between">
            <span className="text-amber-400">MODIS:</span>
            <span>{modisCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Archive vs NRT */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Stream Category</span>
          <div className="text-sm font-bold text-white flex justify-between">
            <span className="text-emerald-400">Archive:</span>
            <span>{archiveCount.toLocaleString()}</span>
          </div>
          <div className="text-sm font-bold text-white flex justify-between">
            <span className="text-rose-400">NRT:</span>
            <span>{nrtCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Mean Radiative Power (FRP) */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mean Radiant Power</span>
          <div className="text-xl font-black text-amber-300">
            {radiometrics.frp?.mean_mw || 0} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[9px] text-slate-400">
            Peak: {radiometrics.frp?.max_mw || 0} MW
          </div>
        </div>

        {/* Ground Truth Status */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Ground Truth</span>
          <div className={`text-sm font-black ${target?.has_target_label ? "text-emerald-400" : "text-amber-400"}`}>
            {target?.has_target_label ? "Class 0 vs Class 2" : "Unlabelled NRT"}
          </div>
          <div className="text-[9px] text-slate-400">
            {target?.has_target_label ? "Supervised Ready" : "Unsupervised Mode"}
          </div>
        </div>
      </div>
    </div>
  );
}
