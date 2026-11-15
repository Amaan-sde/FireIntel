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
  Sparkles,
  Cpu,
  Layers,
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
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"specimens" | "ml_features">("specimens");

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

  if (!day) return null;

  const viirsPct = day.total_obs > 0 ? ((day.viirs_count / day.total_obs) * 100).toFixed(0) : "0";
  const dayPct = day.total_obs > 0 ? ((day.day_count / day.total_obs) * 100).toFixed(0) : "0";
  const specimens = day.specimens && day.specimens.length > 0 ? day.specimens : [];
  const primarySpecimen = specimens[0] || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Observation Specimen Readout"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-[#02050f]/98 border-l border-white/15 shadow-[-20px_0_60px_rgba(0,0,0,0.95)] backdrop-blur-3xl flex flex-col justify-between overflow-hidden text-slate-200 transition-all duration-300"
    >
      {/* 1. Header Bar */}
      <div className="p-5 border-b border-white/10 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                {day.date_label || day.date}
              </h2>
              <span className="text-[10px] font-mono-telemetry px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Level {day.severity_level} Thermal
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-telemetry mt-0.5">
              {day.season || "Annual Himalayan Phenology"} • {scope === "uttarakhand" ? "Uttarakhand Boundary" : "Regional Box"}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Key Hotspot Metrics */}
        <div className="grid grid-cols-2 gap-3 font-mono-telemetry">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-1">TOTAL OBSERVATIONS</span>
            <span className="text-2xl font-extrabold text-white">
              {day.total_obs.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Model Hotspots</span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
            <span className="text-[10px] text-rose-300 block mb-1">TOTAL RADIATIVE POWER</span>
            <span className="text-2xl font-extrabold text-rose-400">
              {day.total_frp.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Mean: {day.mean_frp} MW</span>
          </div>
        </div>

        {/* Telemetry Breakdown Bars */}
        <div className="p-4 rounded-xl bg-black/50 border border-white/10 font-mono-telemetry text-xs space-y-3">
          {/* Sensor Split */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1.5 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                VIIRS (375m): <strong className="text-cyan-300">{day.viirs_count} ({viirsPct}%)</strong>
              </span>
              <span>
                MODIS (1km): <strong className="text-amber-300">{day.modis_count}</strong>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div style={{ width: `${viirsPct}%` }} className="bg-cyan-400 h-full" />
              <div style={{ width: `${100 - Number(viirsPct)}%` }} className="bg-amber-400 h-full" />
            </div>
          </div>

          {/* Day / Night Split */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1.5 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Day Passes: <strong className="text-amber-300">{day.day_count} ({dayPct}%)</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Night: <strong className="text-indigo-300">{day.night_count}</strong>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div style={{ width: `${dayPct}%` }} className="bg-amber-400 h-full" />
              <div style={{ width: `${100 - Number(dayPct)}%` }} className="bg-indigo-400 h-full" />
            </div>
          </div>
        </div>

        {/* View Switcher Tabs: Real Hotspot Specimens vs ML Feature Vector */}
        <div className="flex rounded-xl bg-black/60 p-1 border border-white/10 text-xs font-mono-telemetry">
          <button
            onClick={() => setActiveTab("specimens")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "specimens"
                ? "bg-white/15 text-white font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Hotspot Specimens</span>
          </button>
          <button
            onClick={() => setActiveTab("ml_features")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "ml_features"
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>ML Feature Vectors</span>
          </button>
        </div>

        {/* Tab 1: Real Observation Specimens from final_consolidated_master */}
        {activeTab === "specimens" && (
          <div className="space-y-3 font-mono-telemetry text-xs">
            <span className="text-[11px] text-slate-400 block font-semibold">
              Ground-Truth Observations from <code className="text-cyan-300">final_consolidated_master.xlsx</code>:
            </span>

            {specimens.length > 0 ? (
              specimens.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      {Number(item.latitude).toFixed(4)}°N, {Number(item.longitude).toFixed(4)}°E
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] bg-white/10 text-slate-200 border border-white/10">
                      {item.sensor} • {item.satellite}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-white/5">
                    <div>
                      <span className="text-slate-500 block">FRP</span>
                      <strong className="text-rose-400 text-xs">{item.frp} MW</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">BRIGHTNESS</span>
                      <strong className="text-amber-300 text-xs">{item.brightness} K</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">OVERPASS</span>
                      <strong className="text-slate-300 text-xs">{item.daynight === "D" ? "Day" : "Night"} (Hour {item.decoded_hour})</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-slate-400 text-xs">
                No individual specimens available for this date.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: The 16 ML Feature Dimensions Spotlight */}
        {activeTab === "ml_features" && primarySpecimen && (
          <div className="space-y-3 font-mono-telemetry text-xs">
            <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 text-[11px] leading-relaxed">
              <strong className="text-white block mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Why This is Called the "Model Data":
              </strong>
              Each observation row in <code className="text-cyan-300">final_consolidated_master.xlsx</code> was transformed into a 16-dimensional continuous feature tensor. Cyclical sine and cosine components eliminate boundary jumps between seasons.
            </div>

            <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2 text-[11px]">
              <span className="text-slate-400 font-bold block mb-1 text-white">
                Input Feature Tensor (Sample Row):
              </span>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 block">month_sin</span>
                  <strong className="text-cyan-300">{Number(primarySpecimen.month_sin).toFixed(4)}</strong>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 block">month_cos</span>
                  <strong className="text-cyan-300">{Number(primarySpecimen.month_cos).toFixed(4)}</strong>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 block">hour_sin</span>
                  <strong className="text-amber-300">{Number(primarySpecimen.hour_sin).toFixed(4)}</strong>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 block">hour_cos</span>
                  <strong className="text-amber-300">{Number(primarySpecimen.hour_cos).toFixed(4)}</strong>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 block">scan / track</span>
                  <strong className="text-slate-200">{primarySpecimen.scan} / {primarySpecimen.track}</strong>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-slate-500 block">bright_t31</span>
                  <strong className="text-slate-200">{primarySpecimen.bright_t31} K</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Action Buttons */}
      <div className="p-5 border-t border-white/10 bg-black/60 space-y-2.5 font-mono-telemetry text-xs">
        <Link
          href={`/fires?month=${day.month}`}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Flame className="w-4 h-4" />
          <span>Launch in 3D Wildfire Command Centre</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </Link>

        {onOpenExportDate && (
          <button
            onClick={() => onOpenExportDate(day.date)}
            className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export {day.date_label || day.date} Dataset (CSV / JSON / GeoJSON)</span>
          </button>
        )}
      </div>
    </div>
  );
}
