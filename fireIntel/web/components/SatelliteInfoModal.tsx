"use client";

import React, { useEffect } from "react";
import { X, Satellite, Orbit, Clock, Eye, Layers, Activity } from "lucide-react";
import { SatelliteInfo } from "./CinematicEarthCanvas";

interface SatelliteInfoModalProps {
  satellite: SatelliteInfo | null;
  onClose: () => void;
}

export default function SatelliteInfoModal({
  satellite,
  onClose,
}: SatelliteInfoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!satellite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        aria-label="Satellite Information Specification"
        className="relative w-full max-w-lg glass-surface rounded-2xl p-6 sm:p-7 border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${satellite.colorHex}20`, border: `1px solid ${satellite.colorHex}50` }}
            >
              <Satellite className="w-5 h-5" style={{ color: satellite.colorHex }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-telemetry font-semibold uppercase tracking-wider text-slate-400">
                  {satellite.platform}
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: satellite.colorHex }} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {satellite.name} — <span style={{ color: satellite.colorHex }}>{satellite.instrument}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close satellite specifications"
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instrument & Platform Description */}
        <div className="mb-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 leading-relaxed">
          <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" style={{ color: satellite.colorHex }} />
            <span>{satellite.instrumentFull}</span>
          </div>
          <p>{satellite.spectralBands}</p>
        </div>

        {/* Specification Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 font-mono-telemetry text-xs">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Orbit className="w-3 h-3 text-slate-400" />
              <span>Orbital Regime</span>
            </div>
            <div className="text-white font-semibold">{satellite.altitudeKm} km Altitude</div>
            <div className="text-slate-400 text-[11px]">{satellite.inclinationDeg}° Inclination (Polar)</div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Diurnal Overpass</span>
            </div>
            <div className="text-white font-semibold">{satellite.overpassWindow.split("~")[1] || "Sun-Synchronous"}</div>
            <div className="text-slate-400 text-[11px]">{satellite.overpassWindow.split("~")[0] || "Local Solar Time"}</div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Nadir Footprint & Swath</span>
            </div>
            <div className="text-white font-semibold">{satellite.spatialResolution.split("(")[0]}</div>
            <div className="text-slate-400 text-[11px]">Swath: {satellite.swathWidthKm?.toLocaleString()} km across-track</div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-slate-400" />
              <span>FIRMS Dataset</span>
            </div>
            <div className="text-amber-400 font-semibold">{satellite.id === "snpp" ? "6,623 Observations" : "918 Observations"}</div>
            <div className="text-slate-400 text-[11px]">2025 Uttarakhand Baseline</div>
          </div>
        </div>

        {/* Scientific Role Context */}
        <div className="text-xs text-slate-300 border-l-2 border-white/20 pl-3 mb-5 leading-relaxed">
          {satellite.firmsContribution}
        </div>

        {/* Mandatory Ephemeris Disclaimer */}
        <footer className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono-telemetry">
          <span>Illustrative orbital geometry — not live spacecraft tracking.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </footer>
      </div>
    </div>
  );
}

