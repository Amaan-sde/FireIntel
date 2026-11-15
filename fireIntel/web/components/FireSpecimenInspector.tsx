"use client";

import React, { useEffect } from "react";
import { X, Flame, Navigation, Thermometer, Satellite, Clock, ShieldCheck, Maximize2 } from "lucide-react";
import { FireFeatureProperties } from "./FireLaboratoryMap";

interface FireSpecimenInspectorProps {
  hotspot: FireFeatureProperties | null;
  onClose: () => void;
  onFlyTo?: (coords: [number, number]) => void;
}

export default function FireSpecimenInspector({
  hotspot,
  onClose,
  onFlyTo,
}: FireSpecimenInspectorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (hotspot) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [hotspot, onClose]);

  if (!hotspot) return null;

  const frp = Number(hotspot.frp) || 0;
  const brightness = Number(hotspot.brightness) || 0;
  const brightT31 = hotspot.bright_t31 ? Number(hotspot.bright_t31) : null;
  const deltaT = brightT31 ? (brightness - brightT31).toFixed(1) : null;

  // Convert UTC time to IST (UTC + 05:30)
  const timeStr = String(hotspot.acq_time).padStart(4, "0");
  const hours = parseInt(timeStr.slice(0, 2), 10);
  const minutes = parseInt(timeStr.slice(2, 4), 10);
  let istMinutes = minutes + 30;
  let istHours = hours + 5;
  if (istMinutes >= 60) {
    istMinutes -= 60;
    istHours += 1;
  }
  const istTimeStr = `${String(istHours % 24).padStart(2, "0")}:${String(istMinutes).padStart(2, "0")} IST`;
  const utcTimeStr = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)} UTC`;

  // Thermal classification label based on radiometric radiative intensity
  let intensityClass = "Subtle / Ground Surface Anomaly";
  let intensityColor = "text-amber-400";
  if (frp >= 50) {
    intensityClass = "Extreme Crown / High-Intensity Flaming Front";
    intensityColor = "text-purple-300";
  } else if (frp >= 20) {
    intensityClass = "Severe Radiative Energy Release";
    intensityColor = "text-rose-400";
  } else if (frp >= 8) {
    intensityClass = "Moderate Active Combustion";
    intensityColor = "text-amber-300";
  }

  // Confidence description
  let confLabel = `${hotspot.confidence}%`;
  if (hotspot.sensor === "VIIRS") {
    const c = String(hotspot.confidence).toLowerCase();
    if (c === "h") confLabel = "High (h) — Intense flaming detection";
    else if (c === "n") confLabel = "Nominal (n) — Standard verified detection";
    else if (c === "l") confLabel = "Low (l) — Weak emission / smoldering";
  } else {
    confLabel = `${hotspot.confidence}% — Integer quantitative algorithm`;
  }

  return (
    <aside 
      aria-label="Fire observation specimen inspector"
      className="fixed bottom-24 left-4 sm:left-8 z-30 w-[94vw] sm:w-[420px] max-w-md bg-[#040810]/90 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-cyan-500/30 animate-in fade-in slide-in-from-bottom-4 duration-200 text-slate-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono-telemetry tracking-wider text-slate-400">
              Specimen ID #{hotspot.id}
            </div>
            <h3 className="text-base font-semibold text-white">
              {hotspot.sensor} Thermal Anomaly
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close specimen inspector"
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Radiometric FRP Metric Card */}
      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mb-4">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-slate-400">Fire Radiative Power (FRP):</span>
          <span className="text-2xl font-bold font-mono-telemetry text-amber-400">
            {frp.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-400">MW</span>
          </span>
        </div>

        {/* Visual FRP Intensity Scale */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (frp / 169.9) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-medium ${intensityColor}`}>
            {intensityClass}
          </span>
          <span className="text-slate-500 font-mono-telemetry">
            Max: 169.9 MW
          </span>
        </div>
      </div>

      {/* Scientific Measurement Matrix */}
      <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
        {/* Brightness Temperature */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>Brightness (T4/21)</span>
          </div>
          <div className="font-mono-telemetry font-bold text-white text-sm">
            {brightness.toFixed(1)} K
            <span className="text-slate-500 text-[10px] font-normal ml-1">
              ({(brightness - 273.15).toFixed(1)}°C)
            </span>
          </div>
          {deltaT && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              ΔT (T21 - T31): <span className="text-amber-300 font-mono-telemetry">+{deltaT} K</span>
            </div>
          )}
        </div>

        {/* Ground Footprint Resolution */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Nadir Ground Footprint</span>
          </div>
          <div className="font-mono-telemetry font-bold text-white text-sm">
            {hotspot.scan ? `${hotspot.scan} × ${hotspot.track} km` : hotspot.sensor === "MODIS" ? "1.00 × 1.00 km" : "0.39 × 0.36 km"}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {hotspot.sensor === "MODIS" ? "1.00 km² pixel area" : "0.14 km² pixel area (7.1x finer)"}
          </div>
        </div>

        {/* Platform & Constellation */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Satellite className="w-3.5 h-3.5 text-emerald-400" />
            <span>Platform</span>
          </div>
          <div className="font-mono-telemetry text-slate-200">
            {hotspot.satellite} ({hotspot.sensor})
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {hotspot.daynight === "D" ? "Daytime Solar Overpass" : "Nighttime Nadir Overpass"}
          </div>
        </div>

        {/* Temporal Acquisition */}
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Acquisition</span>
          </div>
          <div className="font-mono-telemetry text-slate-200 text-xs">
            {hotspot.acq_date}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono-telemetry">
            {istTimeStr} <span className="text-slate-600">({utcTimeStr})</span>
          </div>
        </div>
      </div>

      {/* Confidence & Coordinates */}
      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 mb-4 text-xs space-y-1.5">
        <div className="flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Detection Confidence:</span>
          </div>
          <span className="font-mono-telemetry font-semibold text-slate-200 text-[11px]">
            {confLabel}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
          <span className="text-slate-400 text-[11px]">Geodetic Coordinates:</span>
          <span className="font-mono-telemetry text-slate-200 text-[11px]">
            {hotspot.coordinates ? `${hotspot.coordinates[1].toFixed(4)}°N, ${hotspot.coordinates[0].toFixed(4)}°E` : "EPSG:4326"}
          </span>
        </div>
      </div>

      {/* Fly-to Camera Action */}
      {onFlyTo && hotspot.coordinates && (
        <button
          onClick={() => onFlyTo(hotspot.coordinates!)}
          className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-950 font-medium text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Center & Pitch 3D Camera on Hotspot</span>
        </button>
      )}
    </aside>
  );
}

