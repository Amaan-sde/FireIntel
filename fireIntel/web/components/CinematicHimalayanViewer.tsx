"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Orbit, Flame, ArrowRight, Layers, SlidersHorizontal } from "lucide-react";
import GlobeMap from "./GlobeMap";
import HotspotInspector from "./HotspotInspector";
import ScientificTelemetryDrawer from "./ScientificTelemetryDrawer";

interface CinematicHimalayanViewerProps {
  onAscendToOrbit: () => void;
  telemetry: any;
}

export default function CinematicHimalayanViewer({
  onAscendToOrbit,
  telemetry,
}: CinematicHimalayanViewerProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_HOTSPOT = (hotspot: any) => {
        setSelectedHotspot(hotspot);
      };
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden animate-in fade-in duration-1000">
      {/* 3D Map Canvas with Copernicus Elevation Extrusion & NASA FIRMS Thermal Embers */}
      <GlobeMap
        cameraMode="ridge"
        targetCoords={targetCoords}
        onHotspotSelect={(hotspot) => setSelectedHotspot(hotspot)}
      />

      {/* Floating Control Capsule (Top-Left) */}
      <header className="absolute top-6 left-8 z-30 flex items-center gap-3">
        <button
          onClick={onAscendToOrbit}
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
      </header>

      {/* Floating Action Pill (Top-Right) */}
      <div className="absolute top-6 right-8 z-30 flex items-center gap-2">
        <button
          onClick={() => setIsTelemetryDrawerOpen(true)}
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
          <span>Fire Intelligence Lab</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Narrative Sector Pill (Bottom-Left) */}
      <aside 
        aria-label="Active sector information"
        className="absolute bottom-8 left-8 z-20 glass-surface rounded-2xl p-5 max-w-sm border border-white/10 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] font-mono-telemetry font-semibold tracking-wider text-slate-400 uppercase">
            Sector Locked // Garhwal & Kumaon
          </span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1.5">
          Himalayan Topography & Fire Ignitions
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Copernicus GLO-30 elevation extrusion (129 m to 7,804 m)
          revealing how extreme topographic relief shapes fire radiative power across the Chir pine belt.
        </p>
        <div className="flex items-center justify-between text-[11px] font-mono-telemetry pt-2 border-t border-white/10 text-slate-400">
          <span>Active Detections:</span>
          <span className="text-amber-400 font-bold">240,365 Observations</span>
        </div>
      </aside>

      {/* Hotspot Inspector */}
      <HotspotInspector
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
        onFlyTo={(coords) => setTargetCoords(coords)}
      />

      {/* Scientific Telemetry Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        telemetry={telemetry}
      />
    </div>
  );
}
