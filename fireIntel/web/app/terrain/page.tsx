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
  Database,
  ArrowRight,
  Eye,
  EyeOff,
  Grid,
  MapPin,
  X,
  ShieldCheck,
  Thermometer,
  Sun,
  Activity,
  Maximize2,
  TrendingUp,
  Info
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
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

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
      <header className="absolute top-4 sm:top-6 left-3 sm:left-8 right-3 sm:right-8 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <Link
            href="/"
            aria-label="Return to Planetary Orbit"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xl"
            title="Ascend camera back to global planetary orbit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ascend to Orbit</span>
          </Link>

          <div className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-4 py-2 text-xs flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Western Himalayas</span>
            <span className="hidden md:inline text-slate-500 font-mono-telemetry">/</span>
            <span className="hidden md:inline text-cyan-400 font-mono-telemetry">Copernicus DEM (30m)</span>
          </div>
        </div>

        <nav className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/fires"
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-full px-3 sm:px-4 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1.5 sm:gap-2 shadow-2xl"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Lab</span>
          </Link>

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/20 transition-all font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Analytics</span>
          </Link>

          <Link
            href="/data"
            className="flex items-center gap-1.5 bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-all font-medium"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Data</span>
          </Link>

          <Link
            href="/methodology"
            className="flex items-center gap-1.5 bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Methodology</span>
          </Link>

          <button
            onClick={() => setIsTelemetryOpen(true)}
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Telemetry</span>
          </button>
        </nav>
      </header>

      {/* Geomorphology Controls Capsule (Top-Center) */}
      <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto max-w-[95vw] overflow-x-auto py-1 scrollbar-none">
        <div className="flex items-center bg-[#040810]/85 backdrop-blur-xl rounded-full p-1 border border-cyan-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex-nowrap shrink-0">
          <button
            onClick={() => setTerrainMode("satellite")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "satellite"
                ? "bg-white/20 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Satellite 3D
          </button>
          <button
            onClick={() => setTerrainMode("elevation")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "elevation"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-emerald-300 hover:bg-white/[0.05]"
            }`}
          >
            Elevation
          </button>
          <button
            onClick={() => setTerrainMode("slope")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "slope"
                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-amber-300 hover:bg-white/[0.05]"
            }`}
          >
            Slope Gradient
          </button>
          <button
            onClick={() => setTerrainMode("aspect")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "aspect"
                ? "bg-sky-500/30 text-sky-200 border border-sky-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-sky-300 hover:bg-white/[0.05]"
            }`}
          >
            Solar Aspect
          </button>
          <button
            onClick={() => setTerrainMode("tri")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "tri"
                ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-purple-300 hover:bg-white/[0.05]"
            }`}
          >
            Ruggedness (TRI)
          </button>
        </div>

        {/* Quick Layer Toggles (Shrink-0, Never Wrapped or Cut-off) */}
        <div className="flex items-center bg-[#040810]/85 backdrop-blur-xl rounded-full p-1 px-2 border border-cyan-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.6)] gap-1 text-xs shrink-0 flex-nowrap">
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showHotspots
                ? "bg-amber-500/20 text-amber-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title={showHotspots ? "Hide 7,541 fire hotspots" : "Show 7,541 fire hotspots"}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Hotspots</span>
          </button>

          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showGridLines
                ? "bg-sky-500/20 text-sky-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle 2,174 master grid cell boundaries"
          >
            <Grid className="w-3.5 h-3.5 text-sky-400" />
            <span>Grid (2,174)</span>
          </button>

          <button
            onClick={() => setShowBoundary(!showBoundary)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showBoundary
                ? "bg-teal-500/20 text-teal-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Uttarakhand administrative boundary"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Boundary</span>
          </button>

          {/* Elevation Transect Profile Toggle */}
          <button
            onClick={() => setShowProfileDrawer(!showProfileDrawer)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
              showProfileDrawer
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium"
                : "bg-white/[0.02] text-slate-400 hover:text-white border-transparent"
            }`}
            title="Toggle Himalayan Topographic Transect Profile"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Altitudinal Transect</span>
          </button>
        </div>
      </div>

      {/* Sector Information & Unified Dynamic Legend Card (Bottom-Left) */}
      <aside
        aria-label="Terrain Sector Overview"
        className="absolute bottom-6 left-3 sm:left-8 z-20 bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-5 max-w-sm w-[92vw] sm:w-[380px] border border-cyan-500/20 shadow-[0_16px_40px_rgba(0,0,0,0.7)] pointer-events-auto text-slate-200"
      >
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono-telemetry font-bold tracking-wider text-cyan-400 uppercase">
              SECTOR LOCKED // GARHWAL &amp; KUMAON
            </span>
          </div>
          <span className="text-[10px] font-mono-telemetry text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            30m GLO-30 DEM
          </span>
        </div>

        <h1 className="text-lg font-bold text-white mb-1.5 tracking-tight">
          Himalayan Topography &amp; Fire Ignitions
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Copernicus GLO-30 elevation extrusion (129 m to 7,804 m)
          revealing how steep slope chimneys, solar aspect insolation, and rugged relief
          concentrate 44.7% of all fires in the 1,000–2,000m Chir pine zone.
        </p>

        <div className="flex items-center justify-between text-[11px] font-mono-telemetry pt-2 border-t border-white/[0.08] text-slate-400 mb-2.5">
          <span>Active Detections:</span>
          <span className="text-amber-400 font-bold">7,541 Observations</span>
        </div>

        {/* Dynamic Mode-Specific Topographic / Thermal Legend */}
        {terrainMode === "satellite" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Radiative Power (FRP):</span>
              <span className="text-amber-400 font-semibold">MW Intensity</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#f59e0b] mx-auto mb-0.5 shadow-[0_0_6px_#f59e0b]" />
                <span className="text-slate-300">&lt; 8 MW</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#f97316] mx-auto mb-0.5 shadow-[0_0_6px_#f97316]" />
                <span className="text-slate-300">8–20</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#ef4444] mx-auto mb-0.5 shadow-[0_0_6px_#ef4444]" />
                <span className="text-slate-300">20–60</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#a855f7] mx-auto mb-0.5 shadow-[0_0_6px_#a855f7]" />
                <span className="text-slate-300">&gt; 60 MW</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "elevation" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Copernicus GLO-30 Elevation:</span>
              <span className="text-emerald-400 font-semibold">129m – 7,804m</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#059669]" />
                <span className="text-slate-300">&lt; 500m</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#10b981]" />
                <span className="text-slate-300">1000m</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#eab308]" />
                <span className="text-slate-300">Pine</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f97316]" />
                <span className="text-slate-300">Subalpine</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#ffffff]" />
                <span className="text-slate-300">Snow</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "slope" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Slope Gradient Chimneys:</span>
              <span className="text-amber-400 font-semibold">0° – 64°</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#3b82f6]" />
                <span className="text-slate-300">0–5°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#10b981]" />
                <span className="text-slate-300">5–15°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#eab308]" />
                <span className="text-slate-300">15–25°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f97316]" />
                <span className="text-slate-300">25–35°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#dc2626]" />
                <span className="text-slate-300">&gt; 35°</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "aspect" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 uppercase mb-1.5 flex items-center justify-between">
              <span>Solar Aspect Insolation:</span>
              <span className="text-sky-400 font-semibold">360° Compass</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#38bdf8]" />
                <span className="text-slate-300">North</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#34d399]" />
                <span className="text-slate-300">East</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f59e0b]" />
                <span className="text-slate-300">South (Risk)</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f87171]" />
                <span className="text-slate-300">West (Heat)</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "tri" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 uppercase mb-1.5 flex items-center justify-between">
              <span>Terrain Ruggedness (TRI):</span>
              <span className="text-purple-400 font-semibold">Riley Index</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#1e293b]" />
                <span className="text-slate-300">&lt; 10 Plain</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#0284c7]" />
                <span className="text-slate-300">10–30 Mod</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f59e0b]" />
                <span className="text-slate-300">30–50 Rugged</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#ef4444]" />
                <span className="text-slate-300">&gt; 50 Extreme</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Altitudinal Topographic Transect Overlay Drawer */}
      {showProfileDrawer && (
        <aside
          aria-label="Himalayan Altitudinal Transect Profile"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-25 bg-[#040810]/95 backdrop-blur-2xl rounded-2xl p-5 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto w-[94vw] max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 text-slate-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono-telemetry font-bold tracking-wider text-white uppercase">
                Himalayan Altitudinal Transect &amp; Fire Concentration
              </h2>
            </div>
            <button
              onClick={() => setShowProfileDrawer(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close Transect Profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="h-28 w-full bg-black/60 rounded-xl p-3 border border-white/[0.06] flex items-end justify-between gap-1 relative">
              {/* Transect Bands */}
              {[
                { zone: "< 500m Foothills", pct: 3.8, count: 287, height: 16, color: "bg-emerald-500", note: "Tarai Plains" },
                { zone: "500–1000m Valleys", pct: 15.6, count: 1176, height: 35, color: "bg-teal-500", note: "Deciduous Sal" },
                { zone: "1000–2000m Chir Pine", pct: 44.7, count: 3371, height: 95, color: "bg-amber-400", note: "Peak Ignition Zone (44.7%)" },
                { zone: "2000–3000m Montane", pct: 28.3, count: 2134, height: 60, color: "bg-orange-500", note: "Banj Oak / Rhododendron" },
                { zone: "3000–4500m Subalpine", pct: 7.2, count: 543, height: 22, color: "bg-purple-500", note: "Birch / Alpine Meadows" },
                { zone: "> 4500m Nival", pct: 0.4, count: 30, height: 8, color: "bg-slate-500", note: "Perennial Snow / Rock" },
              ].map((band, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <span className="text-[10px] font-mono-telemetry text-amber-300 font-bold mb-1 opacity-90 group-hover:opacity-100">
                    {band.pct}%
                  </span>
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${band.color} ${band.pct > 40 ? "shadow-[0_0_12px_#f59e0b]" : ""}`}
                    style={{ height: `${band.height}%` }}
                  />
                  <div className="text-[9px] font-mono-telemetry text-slate-400 mt-1 truncate max-w-full text-center">
                    {band.zone.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] text-[11px] text-slate-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Scientific Finding: </strong>
                44.7% of all 2025 wildland fires ignited strictly within the 1,000–2,000m Chir pine (<em className="text-amber-300">Pinus roxburghii</em>) ecotone. Highly flammable resinous needle duff combined with steep 25–35° slope chimney drafts produces severe upslope flame propagation.
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Master Grid Cell Geomorphology Inspector */}
      {selectedCell && (
        <aside
          aria-label="Master Grid Cell Geomorphology Inspector"
          className="absolute top-20 sm:top-24 right-3 sm:right-8 z-30 bg-[#040810]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-sky-500/30 shadow-2xl pointer-events-auto max-w-sm w-[92vw] sm:w-full max-h-[calc(100vh-6.5rem)] overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300 text-slate-200"
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
