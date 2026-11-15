"use client";

import React from "react";
import {
  Mountain,
  Compass,
  TrendingUp,
  Layers,
  Shield,
  Info,
  Activity,
  ArrowUpRight,
} from "lucide-react";

interface TerrainStats {
  cell_count?: number;
  avg_elevation_m?: number;
  min_elevation_m?: number;
  max_elevation_m?: number;
  avg_slope_deg?: number;
  max_slope_deg?: number;
  avg_aspect_deg?: number;
  avg_roughness?: number;
  error?: string;
}

interface LocationTerrainCardProps {
  terrain: TerrainStats;
  locationName: string;
  radiusKm: number;
}

export default function LocationTerrainCard({
  terrain,
  locationName,
  radiusKm,
}: LocationTerrainCardProps) {
  // Determine slope hazard classification
  const avgSlope = terrain.avg_slope_deg || 0;
  const slopeHazard = avgSlope > 25
    ? { label: "Extremely Steep / Rugged", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" }
    : avgSlope > 15
    ? { label: "Steep Montane Slopes", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" }
    : { label: "Moderate Hill Slopes", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };

  // Aspect heading description
  const aspectDeg = terrain.avg_aspect_deg || 0;
  const getAspectName = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return "North (Cool, Moist)";
    if (deg >= 22.5 && deg < 67.5) return "Northeast";
    if (deg >= 67.5 && deg < 112.5) return "East (Morning Sun)";
    if (deg >= 112.5 && deg < 157.5) return "Southeast";
    if (deg >= 157.5 && deg < 202.5) return "South (High Solar Drying)";
    if (deg >= 202.5 && deg < 247.5) return "Southwest (Peak Fire Vulnerability)";
    if (deg >= 247.5 && deg < 292.5) return "West (Afternoon Heat)";
    return "Northwest";
  };

  const reliefMeters = (terrain.max_elevation_m || 0) - (terrain.min_elevation_m || 0);

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Topographic &amp; DEM Terrain Intelligence
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold ${slopeHazard.color}`}>
            {slopeHazard.label}
          </span>
          <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
            {terrain.cell_count || 0} DEM Grid Cells
          </span>
        </div>
      </div>

      {/* Grid of 4 Terrain Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Mean & Relief Elevation */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Elevation (ASL)</span>
            <Mountain className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {terrain.avg_elevation_m ? `${terrain.avg_elevation_m.toLocaleString()}m` : "N/A"}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Relief Span:</span>
            <span className="text-slate-300 font-bold">{terrain.min_elevation_m}m - {terrain.max_elevation_m}m ({reliefMeters}m)</span>
          </div>
        </div>

        {/* Metric 2: Slope Steepness */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Mean Slope Angle</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">
            {terrain.avg_slope_deg ? `${terrain.avg_slope_deg}°` : "N/A"}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Peak Slope Observed:</span>
            <span className="text-rose-400 font-bold">{terrain.max_slope_deg}°</span>
          </div>
        </div>

        {/* Metric 3: Dominant Aspect */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Slope Solar Aspect</span>
            <Compass className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300">
            {terrain.avg_aspect_deg ? `${terrain.avg_aspect_deg}°` : "N/A"}
          </div>
          <div className="text-[10px] text-purple-200/80 pt-1 border-t border-white/5 truncate" title={getAspectName(aspectDeg)}>
            {getAspectName(aspectDeg)}
          </div>
        </div>

        {/* Metric 4: Roughness (TRI) */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
          <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
            <span>Terrain Roughness (TRI)</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {terrain.avg_roughness ?? "N/A"}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Topographic Class:</span>
            <span className="text-slate-300 font-bold">Complex Himalayan</span>
          </div>
        </div>
      </div>

      {/* Scientific Impact Callout */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-slate-200">
            Topographic Chimney Acceleration Mechanics:
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            In {locationName} ({terrain.avg_elevation_m || 0}m ASL), slopes averaging {terrain.avg_slope_deg}° induce convective chimney effects where ascending thermal drafts preheat upslope pine needles (Pinus roxburghii). South and southwest facing slopes receive intense insolation, drying ground biomass 3x faster prior to pre-monsoon precipitation.
          </div>
        </div>
      </div>
    </div>
  );
}
