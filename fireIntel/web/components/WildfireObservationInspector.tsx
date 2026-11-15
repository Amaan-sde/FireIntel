"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Flame,
  Thermometer,
  Radio,
  Maximize2,
  Clock,
  ShieldCheck,
  MapPin,
  Copy,
  Check,
  AlertTriangle,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import { FireFeatureProperties } from "./FireLaboratoryMap";

interface WildfireObservationInspectorProps {
  hotspot: FireFeatureProperties | null;
  onClose: () => void;
  onFlyTo?: (coords: [number, number]) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function WildfireObservationInspector({
  hotspot,
  onClose,
  onFlyTo,
}: WildfireObservationInspectorProps) {
  const [copied, setCopied] = useState(false);

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
  const coords = hotspot.coordinates || [0, 0];
  const hasVerifiedDate = Boolean(hotspot.acq_date && hotspot.acq_date !== "null");

  // Format UTC & IST times if available
  let utcTimeStr = "--:-- UTC";
  let istTimeStr = "--:-- IST";
  if (hotspot.acq_time !== null && hotspot.acq_time !== undefined) {
    const timeStr = String(hotspot.acq_time).padStart(4, "0");
    const h = parseInt(timeStr.slice(0, 2), 10);
    const m = parseInt(timeStr.slice(2, 4), 10);
    utcTimeStr = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)} UTC`;
    let istM = m + 30;
    let istH = h + 5;
    if (istM >= 60) {
      istM -= 60;
      istH += 1;
    }
    istTimeStr = `${String(istH % 24).padStart(2, "0")}:${String(istM).padStart(2, "0")} IST`;
  }

  // Radiometric Thermodynamic Intensity
  let intensityClass = "Subtle / Ground Surface Thermal Anomaly";
  let intensityColor = "text-amber-400";
  if (frp >= 50) {
    intensityClass = "High Radiative Power (>50 MW) // Severe Thermal Anomaly (FRP indicates radiative intensity, not ground fuel combustion type or crown fire severity without canopy confirmation)";
    intensityColor = "text-purple-300";
  } else if (frp >= 20) {
    intensityClass = "Severe Radiative Energy Release";
    intensityColor = "text-rose-400";
  } else if (frp >= 8) {
    intensityClass = "Moderate Active Combustion";
    intensityColor = "text-amber-300";
  }

  // Confidence semantics
  let confLabel = `${hotspot.confidence}`;
  if (hotspot.sensor === "VIIRS") {
    const c = String(hotspot.confidence).toLowerCase();
    if (c === "h") confLabel = "High (h) — Saturated flaming detection";
    else if (c === "n") confLabel = "Nominal (n) — Standard verified detection";
    else if (c === "l") confLabel = "Low (l) — Weak smoldering / marginal emission";
  } else {
    confLabel = `${hotspot.confidence}% (MODIS quantitative algorithm)`;
  }

  const handleCopyCoords = () => {
    const text = `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      aria-label="Scientific Observation Specimen Inspector"
      className="fixed bottom-24 sm:bottom-28 left-4 sm:left-8 z-30 w-[94vw] sm:w-[420px] max-w-md bg-[#03060e]/95 backdrop-blur-2xl rounded-2xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.9)] border border-cyan-500/35 animate-in fade-in slide-in-from-bottom-4 duration-200 text-slate-200 font-mono-telemetry"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>SATELLITE THERMAL OBSERVATION #{hotspot.id}</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{hotspot.sensor}</span>
              <span className="text-xs font-normal text-slate-400">
                on {hotspot.satellite}
              </span>
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close observation readout"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Date & Provenance Status Banner */}
      <div className="mb-3.5">
        {hasVerifiedDate ? (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>2025 VERIFIED FIRMS ACQUISITION</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-normal">Exact Match</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px] pt-0.5">
              <span>{hotspot.acq_date}</span>
              <span>{utcTimeStr} ({istTimeStr})</span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>HISTORICAL OBSERVATION (DATE NULL)</span>
              </span>
              <span className="text-[10px] text-amber-400 font-normal">Multi-Year</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px] pt-0.5">
              <span>
                Month: {MONTH_NAMES[(hotspot.month || 1) - 1] || `Month ${hotspot.month}`}
              </span>
              <span>Diurnal Overpass: ~{hotspot.acq_time ? String(hotspot.acq_time).padStart(2, "0") : "10"}:00 UTC</span>
            </div>
            <p className="text-[9px] text-slate-400 font-sans leading-tight pt-1">
              Acquisition year was omitted during feature engineering; timestamp kept NULL to prevent scientific fabrication.
            </p>
          </div>
        )}
      </div>

      {/* Radiative Energetics (FRP MW) Card */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-3.5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] text-slate-400 uppercase">Fire Radiative Power:</span>
          <div className="text-right">
            <span className="text-2xl font-black text-amber-400">
              {frp.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 ml-1">MW</span>
          </div>
        </div>

        {/* Dynamic FRP Meter Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (frp / 150) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className={`font-semibold ${intensityColor}`}>{intensityClass}</span>
          <span className="text-slate-500">Peak Ref: 2,200+ MW</span>
        </div>
      </div>

      {/* Radiometric Sensor Metrics Matrix */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3.5">
        {/* Brightness Temperature */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-0.5">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>Brightness (T4/21)</span>
          </div>
          <div className="font-bold text-white text-sm">
            {brightness.toFixed(1)} K
            <span className="text-slate-500 text-[10px] font-normal ml-1">
              ({(brightness - 273.15).toFixed(1)}°C)
            </span>
          </div>
          {deltaT && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              ΔT: <span className="text-amber-300 font-bold">+{deltaT} K</span>
            </div>
          )}
        </div>

        {/* Ground Nadir Footprint */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-0.5">
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Ground Footprint</span>
          </div>
          <div className="font-bold text-white text-sm">
            {hotspot.scan ? `${hotspot.scan} × ${hotspot.track} km` : hotspot.sensor === "MODIS" ? "1.00 × 1.00 km (Nadir)" : "0.375 × 0.375 km (Nadir)"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Scan: {hotspot.scan || (hotspot.sensor === "MODIS" ? "1.00" : "0.375")} km
          </div>
        </div>

        {/* Confidence Category */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-slate-400 text-[10px] mb-0.5">Confidence Metric</div>
          <div className="font-semibold text-white text-xs truncate" title={confLabel}>
            {confLabel}
          </div>
        </div>

        {/* Diurnal Pass */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-slate-400 text-[10px] mb-0.5">Diurnal Mode</div>
          <div className="font-semibold text-white text-xs">
            {hotspot.daynight === "D" ? "Day Solar Pass" : "Night Nocturnal"}
          </div>
        </div>
      </div>

      {/* Geodetic Coordinates & Tactical Actions */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={handleCopyCoords}
          className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10"
          title="Click to copy geodetic coordinates"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {coords[1].toFixed(4)}°N, {coords[0].toFixed(4)}°E
          </span>
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
        </button>

        {onFlyTo && (
          <button
            onClick={() => onFlyTo(coords)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-[11px] font-semibold transition-all cursor-pointer"
            title="Orient camera toward this observation"
          >
            <Compass className="w-3 h-3 text-cyan-400" />
            <span>Fly Camera</span>
          </button>
        )}
      </div>
    </aside>
  );
}

