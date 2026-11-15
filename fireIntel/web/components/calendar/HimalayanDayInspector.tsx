"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Flame,
  Calendar,
  Radio,
  Sun,
  Moon,
  ExternalLink,
  Download,
  ShieldCheck,
  MapPin,
  TrendingUp,
  Maximize2,
  Copy,
  Check,
} from "lucide-react";
import { CalendarDayItem } from "./HimalayanActivityMatrix";

interface HimalayanDayInspectorProps {
  day: CalendarDayItem | null;
  scope: "uttarakhand" | "regional";
  onClose: () => void;
  onOpenExportDate?: (date: string) => void;
}

export default function HimalayanDayInspector({
  day,
  scope,
  onClose,
  onOpenExportDate,
}: HimalayanDayInspectorProps) {
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (day) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [day, onClose]);

  // Fetch top observation specimens for the selected day from API
  useEffect(() => {
    if (!day || !day.has_data || day.total_obs === 0) {
      setDayDetails(null);
      return;
    }

    const targetDate = day.date;
    const controller = new AbortController();
    async function loadDayDetails() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/v1/calendar/day-details?scope=${scope}&date=${targetDate}&limit=15`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setDayDetails(data);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Could not load day details:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDayDetails();
    return () => controller.abort();
  }, [day, scope]);

  if (!day) return null;

  const viirsPct = day.total_obs > 0 ? ((day.viirs_count / day.total_obs) * 100).toFixed(1) : "0";
  const modisPct = day.total_obs > 0 ? ((day.modis_count / day.total_obs) * 100).toFixed(1) : "0";
  const dayPct = day.total_obs > 0 ? ((day.day_count / day.total_obs) * 100).toFixed(1) : "0";
  const nightPct = day.total_obs > 0 ? ((day.night_count / day.total_obs) * 100).toFixed(1) : "0";

  const handleCopyDate = () => {
    navigator.clipboard.writeText(day.date);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside
      aria-label="Calendar Day Specimen Inspector"
      className="fixed top-28 sm:top-32 right-3 sm:right-6 z-30 w-[94vw] sm:w-[420px] max-w-md pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-right-4"
    >
      <div className="bg-[#03060f]/95 backdrop-blur-2xl rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-cyan-500/35 max-h-[calc(100vh-9.5rem)] flex flex-col text-slate-200 overflow-hidden font-mono-telemetry">
        {/* Header Bar */}
        <div className="p-3.5 px-4 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>OBSERVATION TIMELINE RECORD</span>
              </div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{day.date}</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (DOY {day.day_of_year})
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyDate}
              aria-label="Copy date"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy ISO date"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close observation readout"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1 scrollbar-none">
          {/* Status Badge */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>2025 VERIFIED FIRMS ACQUISITION</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-normal">
              {scope === "regional" ? "Regional Basin" : "Uttarakhand SOI"}
            </span>
          </div>

          {/* Activity Callout Card */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-slate-400 uppercase">Daily Active Detections:</span>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400">
                  {day.total_obs.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 ml-1">obs</span>
              </div>
            </div>

            {/* Severity classification indicator */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
              <span className="text-slate-400">Thermal Severity:</span>
              <span
                className={`font-bold ${
                  day.severity_level >= 4
                    ? "text-rose-400"
                    : day.severity_level >= 2
                    ? "text-amber-400"
                    : "text-cyan-400"
                }`}
              >
                {day.severity_level === 5
                  ? "Extreme Outbreak Paroxysm"
                  : day.severity_level === 4
                  ? "Severe Wildfire Front"
                  : day.severity_level === 3
                  ? "Radiative Surge"
                  : day.severity_level === 2
                  ? "Moderate Combustion"
                  : day.severity_level === 1
                  ? "Subtle Heating"
                  : "No Detections"}
              </span>
            </div>
          </div>

          {/* Sensor Spectrum (VIIRS vs MODIS) */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Sensor Constellation Spectrum</span>
              <span className="text-amber-400 font-bold">{day.total_obs} Detections</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                <div className="flex items-center justify-between text-[10px] text-amber-400 mb-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-amber-400 rotate-45" />
                    <span>VIIRS 375m</span>
                  </span>
                  <span className="font-bold">{viirsPct}%</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {day.viirs_count.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500">Suomi-NPP (SNPP)</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                <div className="flex items-center justify-between text-[10px] text-sky-400 mb-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full border border-sky-400" />
                    <span>MODIS 1km</span>
                  </span>
                  <span className="font-bold">{modisPct}%</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {day.modis_count.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-500">Aqua & Terra</div>
              </div>
            </div>
          </div>

          {/* Diurnal Pass Breakdown (Day vs Night) */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Diurnal Solar Overpass Cycle</span>
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Day Pass</div>
                    <div className="font-bold text-white">{day.day_count}</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">{dayPct}%</span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-slate-400">Night Nocturnal</div>
                    <div className="font-bold text-white">{day.night_count}</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">{nightPct}%</span>
              </div>
            </div>
          </div>

          {/* Radiative Energetics (FRP MW) Matrix */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Fire Radiative Power (MW)</span>
            </label>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[9px] text-slate-500 uppercase">Total FRP</div>
                <div className="text-xs font-bold text-amber-400 truncate">
                  {day.total_frp.toFixed(1)} <span className="text-[9px] text-slate-500">MW</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[9px] text-slate-500 uppercase">Mean FRP</div>
                <div className="text-xs font-bold text-white truncate">
                  {day.mean_frp.toFixed(2)} <span className="text-[9px] text-slate-500">MW</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[9px] text-slate-500 uppercase">Peak FRP</div>
                <div className="text-xs font-bold text-rose-400 truncate">
                  {day.max_frp.toFixed(1)} <span className="text-[9px] text-slate-500">MW</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Radiative Observation Specimens */}
          {dayDetails && dayDetails.observations && dayDetails.observations.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Highest Intensity Specimens ({dayDetails.observations.length})</span>
                <span className="text-slate-500 text-[9px]">Sorted by FRP</span>
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-none pr-0.5">
                {dayDetails.observations.map((obs: any, idx: number) => {
                  const bT31 = obs.bright_t31 ? Number(obs.bright_t31) : null;
                  const deltaT = bT31 ? (obs.brightness - bT31).toFixed(1) : null;

                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-black/60 border border-white/5 hover:border-white/20 transition-all text-[10px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              obs.sensor === "VIIRS" ? "bg-amber-400" : "bg-sky-400"
                            }`}
                          />
                          <span>{obs.sensor}</span>
                          <span className="text-slate-500 font-normal">({obs.satellite})</span>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {obs.frp?.toFixed(1)} MW
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 text-[9px]">
                        <span>
                          {obs.latitude?.toFixed(4)}°N, {obs.longitude?.toFixed(4)}°E
                        </span>
                        <span>
                          {obs.brightness?.toFixed(1)} K
                          {deltaT && <span className="text-amber-300 ml-1">ΔT:+{deltaT}K</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scientific Disclaimer Card */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[9px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Scientific Method:</strong> Satellite observations represent distinct thermal pixels detected during polar satellite overpasses, not individual ground wildfire events.
          </div>
        </div>

        {/* Footer Actions: Launch in 3D /fires & Export Day */}
        <div className="p-3 bg-black/70 border-t border-white/[0.08] flex items-center justify-between gap-2">
          {onOpenExportDate && (
            <button
              onClick={() => onOpenExportDate(day.date)}
              className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Export this date in CSV, JSON, or GeoJSON"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Day</span>
            </button>
          )}

          <Link
            href={`/fires`}
            className="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
            title="Inspect these observations on the 3D Himalayan Terrain & Hotspot Lab (/fires)"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Launch in /fires</span>
            <ExternalLink className="w-3 h-3 text-cyan-400" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
