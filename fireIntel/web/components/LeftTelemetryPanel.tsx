"use client";

import React, { useState } from "react";
import { Flame, Radio, Info, Layers, Orbit } from "lucide-react";

interface LeftTelemetryPanelProps {
  telemetry: any;
  selectedSensor: string | null;
  setSelectedSensor: (sensor: string | null) => void;
}

export default function LeftTelemetryPanel({
  telemetry,
  selectedSensor,
  setSelectedSensor,
}: LeftTelemetryPanelProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const overview = telemetry?.overview || {
    total_detections: 7541,
    modis_detections: 918,
    viirs_detections: 6623,
    detection_ratio_viirs_modis: 7.2146,
    peak_frp_mw: 169.9,
    pre_monsoon_apr_may_pct: 38.23,
    pre_monsoon_season_mar_jun_pct: 46.05,
    winter_dec_pct: 22.25,
  };

  const latBands = telemetry?.lat_bands || [
    { band: "Central (29.48° - 30.25°N)", count: 3115, pct: 41.31 },
    { band: "South (28.71° - 29.48°N)", count: 2752, pct: 36.49 },
    { band: "North (30.25° - 31.46°N)", count: 1674, pct: 22.20 },
  ];

  return (
    <div className="absolute top-18 left-6 z-20 w-84 max-h-[calc(100vh-130px)] overflow-y-auto flex flex-col gap-3 font-mono-hud text-xs">
      {/* Primary Telemetry Card */}
      <div className="nasa-panel rounded-lg p-4 relative overflow-hidden">
        {/* Subtle decorative grid header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>OPERATIONAL SECTOR TELEMETRY</span>
          </div>
          <span className="text-[10px] text-slate-500">2025 ARCHIVE</span>
        </div>

        {/* Total Hotspot Detections */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="flex items-center gap-1">
              SATELLITE THERMAL DETECTIONS
              <button
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-slate-500 hover:text-cyan-400 transition-colors"
                title="Click for scientific disclaimer"
              >
                <Info className="w-3 h-3" />
              </button>
            </span>
            <span className="text-emerald-400 text-[10px]">VERIFIED</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white glow-cyan">
              {overview.total_detections.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400">hotspots</span>
          </div>

          {/* Scientific Disclaimer Accordion */}
          {showTooltip && (
            <div className="mt-2 p-2 bg-slate-900/95 border border-cyan-500/30 rounded text-[10px] text-slate-300 leading-relaxed">
              <strong className="text-cyan-400">Scientific Mandate:</strong> Satellite thermal detections represent instantaneous radiative anomalies recorded during overpasses. They do not denote individual wildfire perimeters or total burned acreage.
            </div>
          )}
        </div>

        {/* Dual-Sensor Synchronized Breakdown */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* VIIRS Button / Card */}
          <button
            onClick={() => setSelectedSensor(selectedSensor === "VIIRS" ? null : "VIIRS")}
            className={`p-2.5 rounded border text-left transition-all ${
              selectedSensor === "VIIRS"
                ? "bg-amber-500/20 border-amber-500/50 glow-amber"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>VIIRS 375m</span>
              <span className="text-amber-400 font-bold">87.8%</span>
            </div>
            <div className="text-base font-bold text-amber-300 mt-0.5">
              {overview.viirs_detections.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Suomi-NPP (SNPP)
            </div>
          </button>

          {/* MODIS Button / Card */}
          <button
            onClick={() => setSelectedSensor(selectedSensor === "MODIS" ? null : "MODIS")}
            className={`p-2.5 rounded border text-left transition-all ${
              selectedSensor === "MODIS"
                ? "bg-cyan-500/20 border-cyan-500/50 glow-cyan"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>MODIS 1km</span>
              <span className="text-cyan-400 font-bold">12.2%</span>
            </div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              {overview.modis_detections.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Aqua & Terra
            </div>
          </button>
        </div>

        {/* Detection Ratio & Physics Explanation */}
        <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 mb-3 text-[11px]">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-slate-400">Observed VIIRS/MODIS Ratio:</span>
            <span className="font-bold text-cyan-300">{overview.detection_ratio_viirs_modis}x</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Governed by <span className="text-slate-200">7.11x nadir pixel area difference</span> (0.14 vs 1.0 km²) and scan-edge bowtie trimming suppression.
          </p>
        </div>

        {/* Peak Radiative Power */}
        <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Peak Radiative Power (FRP):</span>
          </div>
          <span className="font-bold text-rose-400">{overview.peak_frp_mw} MW</span>
        </div>
      </div>

      {/* Seasonal Fire Regimes Card */}
      <div className="nasa-panel rounded-lg p-3.5">
        <div className="text-cyan-400 font-bold text-[11px] tracking-wider mb-2 flex items-center justify-between">
          <span>SEASONAL CONCENTRATION</span>
          <span className="text-[9px] text-slate-500">2025 DYNAMICS</span>
        </div>

        <div className="space-y-2 text-[11px]">
          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span>Pre-Monsoon Peak (Apr - May):</span>
              <span className="font-bold text-amber-400">{overview.pre_monsoon_apr_may_pct}%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${overview.pre_monsoon_apr_may_pct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span>Pre-Monsoon Season (Mar - Jun):</span>
              <span className="font-bold text-amber-300">{overview.pre_monsoon_season_mar_jun_pct}%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${overview.pre_monsoon_season_mar_jun_pct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-300 mb-0.5">
              <span>Winter Secondary Peak (Dec):</span>
              <span className="font-bold text-cyan-400">{overview.winter_dec_pct}%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${overview.winter_dec_pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Latitudinal Distribution Card */}
      <div className="nasa-panel rounded-lg p-3.5">
        <div className="text-cyan-400 font-bold text-[11px] tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            LATITUDE BAND DISTRIBUTION
          </span>
          <span className="text-[9px] text-slate-500">WGS 84</span>
        </div>

        <div className="space-y-1.5">
          {latBands.map((band: any, idx: number) => (
            <div key={idx} className="p-1.5 bg-slate-900/60 rounded border border-slate-800/80">
              <div className="flex justify-between text-slate-300 text-[10px]">
                <span className="text-slate-400">{band.band}</span>
                <span className="font-bold text-cyan-300">{band.count.toLocaleString()} ({band.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Satellite Constellation Status */}
      <div className="nasa-panel rounded-lg p-3 text-[10px]">
        <div className="text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
          <Orbit className="w-3 h-3 text-emerald-400" />
          ACTIVE SATELLITE PLATFORMS
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-1 bg-slate-900/70 border border-emerald-500/30 rounded text-emerald-300">
            <div>SNPP</div>
            <div className="text-[9px] text-slate-400">6,623 obs</div>
          </div>
          <div className="p-1 bg-slate-900/70 border border-emerald-500/30 rounded text-emerald-300">
            <div>Aqua</div>
            <div className="text-[9px] text-slate-400">684 obs</div>
          </div>
          <div className="p-1 bg-slate-900/70 border border-emerald-500/30 rounded text-emerald-300">
            <div>Terra</div>
            <div className="text-[9px] text-slate-400">234 obs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

