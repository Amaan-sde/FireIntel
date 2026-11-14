"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  Layers,
  SlidersHorizontal,
  Mountain,
  Compass,
  BarChart3,
  FileText,
  ArrowRight,
  Eye,
  EyeOff,
  Grid,
  MapPin,
  X,
  ShieldCheck,
  Thermometer,
  Sun
} from "lucide-react";
import GlobeMap, { TerrainMode } from "@/components/GlobeMap";
import HotspotInspector from "@/components/HotspotInspector";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";

function getAspectCardinal(aspect: number): { label: string; desc: string; color: string } {
  if (aspect >= 337.5 || aspect < 22.5) {
    return { label: "North (0°)", desc: "Shaded / cooler slope, delayed fuel curing", color: "text-sky-400" };
  } else if (aspect >= 22.5 && aspect < 67.5) {
    return { label: "Northeast (45°)", desc: "Early morning gentle sun exposure", color: "text-teal-400" };
  } else if (aspect >= 67.5 && aspect < 112.5) {
    return { label: "East (90°)", desc: "Morning direct solar insolation", color: "text-emerald-400" };
  } else if (aspect >= 112.5 && aspect < 157.5) {
    return { label: "Southeast (135°)", desc: "Moderate-high drying rate", color: "text-yellow-400" };
  } else if (aspect >= 157.5 && aspect < 202.5) {
    return { label: "South (180°)", desc: "Maximum solar insolation, rapid needle desiccation", color: "text-amber-400" };
  } else if (aspect >= 202.5 && aspect < 247.5) {
    return { label: "Southwest (225°)", desc: "Peak afternoon temperature & dry katabatic winds", color: "text-orange-400" };
  } else if (aspect >= 247.5 && aspect < 292.5) {
    return { label: "West (270°)", desc: "Late afternoon heat, elevated flame propagation", color: "text-rose-400" };
  } else {
    return { label: "Northwest (315°)", desc: "Evening shade, moderate relative humidity", color: "text-blue-400" };
  }
}

function getTRIDescription(tri: number): { label: string; desc: string } {
  if (tri < 10) return { label: "Level Plain", desc: "Gentle valley floor, unhindered ground access" };
  if (tri < 25) return { label: "Moderate Relief", desc: "Foothill undulating terrain, standard suppression" };
  if (tri < 45) return { label: "Rugged Mountain", desc: "Steep dissected ridge, creates strong upslope draft" };
  return { label: "Severely Rugged", desc: "Precipitous cliff/gorge, extreme fire chimney risk" };
}

export default function TerrainExplorerPage() {
  const router = useRouter();
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Geomorphology & Layer Toggles
  const [terrainMode, setTerrainMode] = useState<TerrainMode>("satellite");
  const [showHotspots, setShowHotspots] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showGridLines, setShowGridLines] = useState(false);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/data/mission_control_summary.json");
        const data = await res.json();
        setTelemetry(data);
      } catch (err) {
        console.error("Failed to load telemetry:", err);
      }
    }
    loadTelemetry();
  }, []);

  // Expose selectors for programmatic testing & automated inspection
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_HOTSPOT = (hotspot: any) => {
        setSelectedHotspot(hotspot);
      };
      (window as any).__SELECT_GRID_CELL = (cellProps: any) => {
        setSelectedCell(cellProps);
      };
      (window as any).__SET_TERRAIN_MODE = (mode: TerrainMode) => {
        setTerrainMode(mode);
      };
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020408] select-none">
      {/* 3D Himalayan MapLibre Canvas with Copernicus DEM 30m Extrusion & Geomorphology Grid */}
      <GlobeMap
        cameraMode="ridge"
        targetCoords={targetCoords}
        onHotspotSelect={(hotspot) => {
          setSelectedHotspot(hotspot);
          setSelectedCell(null);
        }}
        onCellSelect={(cellProps) => {
          setSelectedCell(cellProps);
          setSelectedHotspot(null);
        }}
        terrainMode={terrainMode}
        showHotspots={showHotspots}
        showBoundary={showBoundary}
        showGridLines={showGridLines}
      />

      {/* Top Navigation Bar */}
      <header className="absolute top-6 left-8 right-8 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => router.push("/")}
            aria-label="Return to Planetary Orbit"
            className="glass-pill rounded-full px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-2xl"
            title="Ascend camera back to global planetary orbit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ascend to Orbit</span>
          </button>

          <div className="glass-pill rounded-full px-4 py-2 text-xs flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Western Himalayas</span>
            <span className="text-slate-500 font-mono-telemetry">/</span>
            <span className="text-slate-400 font-mono-telemetry">Copernicus GLO-30 DEM (30m)</span>
          </div>
        </div>

        <nav className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/analytics"
            className="hidden sm:flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-2 text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/20 border-emerald-500/20 transition-all font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analytics</span>
          </Link>

          <Link
            href="/methodology"
            className="hidden sm:flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Methodology</span>
          </Link>

          <button
            onClick={() => setIsTelemetryOpen(true)}
            className="glass-pill rounded-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Telemetry</span>
          </button>

          <Link
            href="/fires"
            className="glass-pill rounded-full px-4 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border-amber-500/30 transition-all flex items-center gap-2 shadow-2xl"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Intelligence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Geomorphology Controls Capsule (Top-Center) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center glass-surface rounded-full p-1 border border-white/10 shadow-2xl">
          <button
            onClick={() => setTerrainMode("satellite")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              terrainMode === "satellite"
                ? "bg-white/20 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Satellite 3D
          </button>
          <button
            onClick={() => setTerrainMode("elevation")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              terrainMode === "elevation"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-emerald-300 hover:bg-white/[0.05]"
            }`}
          >
            Elevation
          </button>
          <button
            onClick={() => setTerrainMode("slope")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              terrainMode === "slope"
                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-amber-300 hover:bg-white/[0.05]"
            }`}
          >
            Slope Gradient
          </button>
          <button
            onClick={() => setTerrainMode("aspect")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              terrainMode === "aspect"
                ? "bg-sky-500/30 text-sky-200 border border-sky-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-sky-300 hover:bg-white/[0.05]"
            }`}
          >
            Solar Aspect
          </button>
          <button
            onClick={() => setTerrainMode("tri")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              terrainMode === "tri"
                ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-purple-300 hover:bg-white/[0.05]"
            }`}
          >
            Ruggedness (TRI)
          </button>
        </div>

        {/* Quick Layer Toggles */}
        <div className="flex items-center glass-surface rounded-full p-1 px-2 border border-white/10 shadow-2xl gap-1 text-xs">
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              showHotspots
                ? "bg-amber-500/20 text-amber-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title={showHotspots ? "Hide 7,541 fire hotspots" : "Show 7,541 fire hotspots"}
          >
            <Flame className="w-3 h-3" />
            <span className="hidden md:inline">Hotspots</span>
          </button>

          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              showGridLines
                ? "bg-sky-500/20 text-sky-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle 2,174 master grid cell boundaries"
          >
            <Grid className="w-3 h-3" />
            <span className="hidden md:inline">Grid (2,174)</span>
          </button>

          <button
            onClick={() => setShowBoundary(!showBoundary)}
            className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              showBoundary
                ? "bg-teal-500/20 text-teal-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Uttarakhand administrative boundary"
          >
            <MapPin className="w-3 h-3" />
            <span className="hidden md:inline">Boundary</span>
          </button>
        </div>
      </div>

      {/* Sector Information Card (Bottom-Left) */}
      <aside
        aria-label="Terrain Sector Overview"
        className="absolute bottom-8 left-8 z-20 glass-surface rounded-2xl p-5 max-w-sm border border-white/10 shadow-2xl pointer-events-auto"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] font-mono-telemetry font-semibold tracking-wider text-slate-400 uppercase">
            Sector Locked // Garhwal &amp; Kumaon
          </span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1.5">
          Himalayan Topography &amp; Fire Ignitions
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Copernicus GLO-30 elevation extrusion (129 m to 7,804 m)
          revealing how steep slope chimneys, solar aspect insolation, and rugged relief
          concentrate 44.7% of all fires in the 1,000–2,000m Chir pine zone.
        </p>
        <div className="flex items-center justify-between text-[11px] font-mono-telemetry pt-2 border-t border-white/10 text-slate-400">
          <span>Active Detections:</span>
          <span className="text-amber-400 font-bold">7,541 Observations</span>
        </div>
      </aside>

      {/* Master Grid Cell Geomorphology Inspector */}
      {selectedCell && (
        <aside
          aria-label="Master Grid Cell Geomorphology Inspector"
          className="absolute top-24 right-8 z-30 glass-surface rounded-2xl p-5 border border-sky-500/30 shadow-2xl pointer-events-auto max-w-sm w-full animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <div className="flex items-start justify-between mb-3 border-b border-white/10 pb-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono-telemetry text-sky-400 uppercase tracking-wider">
                <Mountain className="w-3 h-3 text-sky-400" />
                <span>Master Analytical Cell</span>
              </div>
              <div className="text-sm font-bold font-mono-telemetry text-white">
                {selectedCell.id}
              </div>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close Cell Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Elevation metrics */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">
                Copernicus Elevation (GLO-30)
              </div>
              <div className="text-base font-bold font-mono-telemetry text-emerald-300">
                {Math.round(selectedCell.elev_mean)} m
                <span className="text-xs font-normal text-slate-400 ml-2">
                  (Range: {Math.round(selectedCell.elev_min)}–{Math.round(selectedCell.elev_max)} m)
                </span>
              </div>
            </div>

            {/* Slope & Aspect Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">
                  Mean Slope
                </div>
                <div className="text-base font-bold font-mono-telemetry text-amber-300">
                  {selectedCell.slope_mean?.toFixed(1)}°
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Max: {selectedCell.slope_max?.toFixed(1)}°
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">
                  Terrain Ruggedness
                </div>
                <div className="text-base font-bold font-mono-telemetry text-purple-300">
                  {selectedCell.tri_mean?.toFixed(1)} TRI
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {getTRIDescription(selectedCell.tri_mean).label}
                </div>
              </div>
            </div>

            {/* Solar Aspect Orientation */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">
                <span>Solar Aspect</span>
                <span className={getAspectCardinal(selectedCell.aspect_mean).color}>
                  {getAspectCardinal(selectedCell.aspect_mean).label}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 leading-snug">
                {getAspectCardinal(selectedCell.aspect_mean).desc}
              </div>
            </div>

            {/* Scientific Provenance Note */}
            <div className="pt-2 text-[10px] text-slate-400 font-mono-telemetry leading-normal border-t border-white/5">
              <span className="text-sky-400 font-semibold">Provenance: </span>
              Copernicus GLO-30 30m DEM aggregated across 0.05° (~5.5 km) cell. Note: ERA5-Land reanalysis operates at ~9 km native resolution, distinct from 30m DEM.
            </div>
          </div>
        </aside>
      )}

      {/* Hotspot Inspector */}
      <HotspotInspector
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
        onFlyTo={(coords) => setTargetCoords(coords)}
      />

      {/* Telemetry Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        telemetry={telemetry}
      />
    </main>
  );
}
