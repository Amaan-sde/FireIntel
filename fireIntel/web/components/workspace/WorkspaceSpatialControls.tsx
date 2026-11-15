"use client";

import React from "react";
import {
  MapPin,
  Sliders,
  Maximize2,
  Compass,
  Check,
  ShieldCheck,
  TreePine,
  Mountain,
} from "lucide-react";

interface SpatialAOI {
  mode: string;
  preset_id?: string;
  center_lat?: number;
  center_lon?: number;
  radius_km?: number;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
}

interface WorkspaceSpatialControlsProps {
  aoi: SpatialAOI;
  onAOIChange: (newAoi: SpatialAOI) => void;
  presets: any[];
}

export default function WorkspaceSpatialControls({
  aoi,
  onAOIChange,
  presets,
}: WorkspaceSpatialControlsProps) {
  const currentMode = aoi.mode || "preset";

  const handleSelectPreset = (presetId: string) => {
    const found = presets.find((p) => p.id === presetId);
    if (!found) return;

    onAOIChange({
      mode: "preset",
      preset_id: presetId,
      center_lat: found.center ? found.center[1] : 29.38,
      center_lon: found.center ? found.center[0] : 79.46,
      radius_km: found.radius_km || 25.0,
      min_lat: found.bbox ? found.bbox[1] : 29.15,
      max_lat: found.bbox ? found.bbox[3] : 29.60,
      min_lon: found.bbox ? found.bbox[0] : 79.20,
      max_lon: found.bbox ? found.bbox[2] : 79.70,
    });
  };

  const handleRadiusChange = (newRadius: number) => {
    onAOIChange({
      ...aoi,
      radius_km: newRadius,
    });
  };

  const handleCoordinateChange = (lat?: number, lon?: number) => {
    onAOIChange({
      ...aoi,
      center_lat: lat !== undefined ? lat : aoi.center_lat,
      center_lon: lon !== undefined ? lon : aoi.center_lon,
    });
  };

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry text-xs">
      {/* Header & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Geographical AOI Selector
            </h3>
            <span className="text-[10px] text-slate-400">
              Define the target geographical study area in Uttarakhand
            </span>
          </div>
        </div>

        {/* AOI Mode Buttons */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-[11px]">
          <button
            onClick={() => onAOIChange({ ...aoi, mode: "preset" })}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              currentMode === "preset"
                ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Curated Presets
          </button>
          <button
            onClick={() => onAOIChange({ ...aoi, mode: "circle" })}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              currentMode === "circle"
                ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Point & Radius
          </button>
          <button
            onClick={() => onAOIChange({ ...aoi, mode: "bbox" })}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              currentMode === "bbox"
                ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Bounding Box
          </button>
        </div>
      </div>

      {/* Mode A: Curated Presets Grid */}
      {currentMode === "preset" && (
        <div className="space-y-3">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
            Curated Research Divisions ({presets.length} Zones):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {presets.map((p) => {
              const isSelected = aoi.preset_id === p.id;
              return (
                <button
                  key={p.id}
                  data-preset-id={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{p.name.split("&")[0]}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {p.area_sqkm.toLocaleString()} km²
                    </span>
                  </div>
                  <span className="text-[9px] text-cyan-400/80 mt-2 block truncate">
                    {p.type.toUpperCase()} ZONE
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode B: Custom Point & Radius Controls */}
      {currentMode === "circle" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">CENTER LATITUDE (°N)</label>
              <input
                type="number"
                step="0.001"
                min="28.0"
                max="31.5"
                value={aoi.center_lat || 29.38}
                onChange={(e) => handleCoordinateChange(parseFloat(e.target.value) || 29.38, undefined)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-telemetry"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">CENTER LONGITUDE (°E)</label>
              <input
                type="number"
                step="0.001"
                min="77.0"
                max="81.5"
                value={aoi.center_lon || 79.46}
                onChange={(e) => handleCoordinateChange(undefined, parseFloat(e.target.value) || 79.46)}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-telemetry"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">RADIUS ({aoi.radius_km || 25} KM)</label>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={aoi.radius_km || 25}
                  onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <span className="text-xs font-bold text-cyan-300 min-w-12 text-right">
                  {aoi.radius_km || 25} km
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-slate-300 flex items-center justify-between">
            <span>
              Approximate Circle Area: <strong className="text-cyan-300">{(Math.PI * Math.pow(aoi.radius_km || 25, 2)).toFixed(0)} km²</strong>
            </span>
            <span className="text-[10px] text-slate-400">
              Click anywhere on the satellite map to reposition center pin
            </span>
          </div>
        </div>
      )}

      {/* Mode C: Custom Bounding Box Controls */}
      {currentMode === "bbox" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">NORTH LAT (MAX)</label>
              <input
                type="number"
                step="0.01"
                value={aoi.max_lat || 29.60}
                onChange={(e) => onAOIChange({ ...aoi, max_lat: parseFloat(e.target.value) || 29.60 })}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-telemetry"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">SOUTH LAT (MIN)</label>
              <input
                type="number"
                step="0.01"
                value={aoi.min_lat || 29.15}
                onChange={(e) => onAOIChange({ ...aoi, min_lat: parseFloat(e.target.value) || 29.15 })}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-telemetry"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">WEST LON (MIN)</label>
              <input
                type="number"
                step="0.01"
                value={aoi.min_lon || 79.20}
                onChange={(e) => onAOIChange({ ...aoi, min_lon: parseFloat(e.target.value) || 79.20 })}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-telemetry"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">EAST LON (MAX)</label>
              <input
                type="number"
                step="0.01"
                value={aoi.max_lon || 79.70}
                onChange={(e) => onAOIChange({ ...aoi, max_lon: parseFloat(e.target.value) || 79.70 })}
                className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white focus:outline-none focus:border-cyan-400 text-xs font-mono-telemetry"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

