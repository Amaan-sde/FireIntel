"use client";

import React, { useEffect } from "react";
import { X, Flame, Crosshair, Calendar, Clock, Satellite, Sun, Moon, Shield } from "lucide-react";

interface HotspotInspectorProps {
  hotspot: any;
  onClose: () => void;
  onFlyTo: (coords: [number, number]) => void;
}

export default function HotspotInspector({
  hotspot,
  onClose,
  onFlyTo,
}: HotspotInspectorProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!hotspot) return null;

  const lat = Number(hotspot.latitude || (hotspot.coordinates && hotspot.coordinates[1]) || 0);
  const lon = Number(hotspot.longitude || (hotspot.coordinates && hotspot.coordinates[0]) || 0);
  const frp = Number(hotspot.frp || 0);
  const brightness = Number(hotspot.brightness || 0);
  const timeStr = String(hotspot.acq_time || "0000").padStart(4, "0");
  const hours = parseInt(timeStr.slice(0, 2), 10);
  const mins = parseInt(timeStr.slice(2, 4), 10);

  // Convert UTC to IST (+05:30)
  let istHours = hours + 5;
  let istMins = mins + 30;
  if (istMins >= 60) {
    istMins -= 60;
    istHours += 1;
  }
  if (istHours >= 24) {
    istHours -= 24;
  }
  const istTimeStr = `${String(istHours).padStart(2, "0")}:${String(istMins).padStart(2, "0")} IST`;

  // FRP intensity styling
  const frpPct = Math.min(100, Math.max(10, Math.round((frp / 60) * 100)));

  return (
    <aside 
      aria-label="Thermal Anomaly Inspector"
      className="absolute top-20 right-8 z-30 w-80 glass-surface rounded-2xl p-5 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-xs font-semibold tracking-wider text-amber-400 uppercase font-mono-telemetry">
            Hotspot Inspector
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close inspector"
          className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Observation Banner */}
      <div className="mb-4">
        <div className="text-[11px] text-slate-400">Radiative Signature</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-3xl font-bold font-mono-telemetry text-white">
            {frp.toFixed(1)}
          </span>
          <span className="text-xs font-semibold text-amber-400">MW (FRP)</span>
        </div>

        {/* Intensity Meter */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            style={{ width: `${frpPct}%` }}
            className={`h-full rounded-full transition-all ${
              frp > 40
                ? "bg-purple-400"
                : frp > 15
                ? "bg-rose-500"
                : frp > 5
                ? "bg-amber-400"
                : "bg-yellow-400"
            }`}
          />
        </div>
      </div>

      {/* Detailed Observation Attributes */}
      <div className="space-y-2.5 text-xs text-slate-300">
        {/* Coordinates */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            Coordinates:
          </span>
          <span className="font-mono-telemetry text-slate-200">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
          </span>
        </div>

        {/* Platform & Sensor */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Satellite className="w-3.5 h-3.5 text-amber-400" />
            Sensor / Satellite:
          </span>
          <span className="font-mono-telemetry font-medium text-white">
            {hotspot.satellite} ({hotspot.sensor})
          </span>
        </div>

        {/* Date & Time */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Date:
          </span>
          <span className="font-mono-telemetry text-slate-200">{hotspot.acq_date}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Acquisition Time:
          </span>
          <span className="font-mono-telemetry text-slate-200">
            {timeStr.slice(0, 2)}:{timeStr.slice(2, 4)} UTC ({istTimeStr})
          </span>
        </div>

        {/* Brightness Temperature & Confidence */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="text-[10px] text-slate-400">Brightness Temp</div>
            <div className="text-sm font-bold font-mono-telemetry text-rose-300 mt-0.5">
              {brightness.toFixed(1)} K
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-400" /> Confidence
            </div>
            <div className="text-sm font-bold font-mono-telemetry text-sky-300 mt-0.5 capitalize">
              {hotspot.confidence}
            </div>
          </div>
        </div>

        {/* Solar Pass */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <span className="text-slate-400 flex items-center gap-1.5">
            {hotspot.daynight === "D" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            Overpass Pass:
          </span>
          <span className="text-slate-200 font-medium">
            {hotspot.daynight === "D" ? "Daytime Overpass" : "Nighttime Overpass"}
          </span>
        </div>
      </div>

      {/* Fly to Hotspot Action */}
      <button
        onClick={() => onFlyTo([lon, lat])}
        className="w-full mt-4 py-2 px-3 rounded-xl bg-white text-slate-950 font-medium text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
      >
        <Crosshair className="w-3.5 h-3.5" />
        <span>Center Camera on Hotspot</span>
      </button>
    </aside>
  );
}

