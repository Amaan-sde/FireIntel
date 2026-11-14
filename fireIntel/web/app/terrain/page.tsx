"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, Layers, SlidersHorizontal, Mountain, Compass, BarChart3, FileText, ArrowRight } from "lucide-react";
import GlobeMap from "@/components/GlobeMap";
import HotspotInspector from "@/components/HotspotInspector";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";

export default function TerrainExplorerPage() {
  const router = useRouter();
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);

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

  // Expose hotspot selector for programmatic testing & automated inspection
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_HOTSPOT = (hotspot: any) => {
        setSelectedHotspot(hotspot);
      };
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020408] select-none">
      {/* 3D Himalayan MapLibre Canvas with Copernicus DEM 30m Extrusion */}
      <GlobeMap
        cameraMode="ridge"
        targetCoords={targetCoords}
        onHotspotSelect={(hotspot) => setSelectedHotspot(hotspot)}
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
            <span className="text-slate-400 font-mono-telemetry">30m Copernicus DEM Relief</span>
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

      {/* Sector Information Card (Bottom-Left) */}
      <aside
        aria-label="Terrain Sector Overview"
        className="absolute bottom-8 left-8 z-20 glass-surface rounded-2xl p-5 max-w-sm border border-white/10 shadow-2xl pointer-events-auto"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] font-mono-telemetry font-semibold tracking-wider text-slate-400 uppercase">
            Sector Locked // Garhwal & Kumaon
          </span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1.5">
          Himalayan Topography & Fire Ignitions
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Copernicus GLO-30 elevation extrusion (129 m to 7,804 m)
          revealing how extreme topographic relief shapes fire radiative power across the Chir pine belt.
        </p>
        <div className="flex items-center justify-between text-[11px] font-mono-telemetry pt-2 border-t border-white/10 text-slate-400">
          <span>Active Detections:</span>
          <span className="text-amber-400 font-bold">7,541 Observations</span>
        </div>
      </aside>

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
