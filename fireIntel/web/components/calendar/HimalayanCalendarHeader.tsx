"use client";

import React from "react";
import Link from "next/link";
import {
  Flame,
  Globe2,
  ShieldCheck,
  SlidersHorizontal,
  Download,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  Radio,
  Zap,
} from "lucide-react";

interface HimalayanCalendarHeaderProps {
  scope: "uttarakhand" | "regional";
  onScopeChange: (scope: "uttarakhand" | "regional") => void;
  selectedSensor: string | null;
  onSelectSensor: (sensor: string | null) => void;
  selectedDaynight: string | null;
  onSelectDaynight: (daynight: string | null) => void;
  minFrp: number;
  onMinFrpChange: (frp: number) => void;
  onOpenExport: () => void;
  totalObs: number;
  viirsCount: number;
  modisCount: number;
  dayCount: number;
  nightCount: number;
  totalFrp: number;
  meanFrp: number;
  peakSeasonShare: string;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export default function HimalayanCalendarHeader({
  scope,
  onScopeChange,
  selectedSensor,
  onSelectSensor,
  selectedDaynight,
  onSelectDaynight,
  minFrp,
  onMinFrpChange,
  onOpenExport,
  totalObs,
  viirsCount,
  modisCount,
  dayCount,
  nightCount,
  totalFrp,
  meanFrp,
  peakSeasonShare,
  onResetFilters,
  isFiltered,
}: HimalayanCalendarHeaderProps) {
  const viirsPct = totalObs > 0 ? ((viirsCount / totalObs) * 100).toFixed(1) : "0";
  const modisPct = totalObs > 0 ? ((modisCount / totalObs) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-5">
      {/* 1. Main Title & Scope Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-telemetry font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              NASA MODEL FOUNDATION
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-xs font-mono-telemetry text-slate-300">
              Harmonised Master Dataset (<code className="text-cyan-300">final_consolidated_master.xlsx</code>)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Himalayan Burning Intelligence Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono-telemetry mt-1">
            Complete multi-sensor phenological observation matrix with continuous cyclical ML feature embeddings
          </p>
        </div>

        {/* Scope Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Scope Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-black/80 border border-white/10 text-xs font-mono-telemetry">
            <button
              onClick={() => onScopeChange("uttarakhand")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                scope === "uttarakhand"
                  ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Uttarakhand Study Area (240k)</span>
            </button>
            <button
              onClick={() => onScopeChange("regional")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                scope === "regional"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Regional Bounding Box (510k)</span>
            </button>
          </div>

          {/* Export Action */}
          <button
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-xs font-mono-telemetry text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export full model observation dataset"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Dataset</span>
          </button>

          {/* Launch 3D Wildfire Command Centre */}
          <Link
            href="/fires"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-xs font-mono-telemetry text-amber-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
            title="Explore observations on the 3D Himalayan terrain map"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>3D Fire Command</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* 2. Four Executive Key Performance Indicator (KPI) Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Model Observations */}
        <div className="rounded-2xl bg-[#030612]/80 border border-white/10 p-4 backdrop-blur-xl shadow-lg hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400 mb-1">
            <span>Model Observations</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {totalObs.toLocaleString()}
          </div>
          <p className="text-[11px] font-mono-telemetry text-slate-400 mt-1">
            {scope === "uttarakhand" ? "100% boundary-validated inside UK" : "Full regional satellite box (28°-31°N)"}
          </p>
        </div>

        {/* Metric 2: Pre-Monsoon Peak Crisis */}
        <div className="rounded-2xl bg-[#030612]/80 border border-rose-500/30 p-4 backdrop-blur-xl shadow-lg hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between text-xs font-mono-telemetry text-rose-300 mb-1">
            <span>Peak Crisis (Apr–May)</span>
            <Flame className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">
            {peakSeasonShare}
          </div>
          <p className="text-[11px] font-mono-telemetry text-slate-400 mt-1">
            {scope === "uttarakhand" ? "147,069 obs in 60-day window" : "267,059 regional peak observations"}
          </p>
        </div>

        {/* Metric 3: VIIRS 375m Radiometric Share */}
        <div className="rounded-2xl bg-[#030612]/80 border border-white/10 p-4 backdrop-blur-xl shadow-lg hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400 mb-1">
            <span>Sensor Radiometry</span>
            <Radio className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
            {viirsPct}% <span className="text-xs font-normal text-slate-400">VIIRS</span>
          </div>
          <p className="text-[11px] font-mono-telemetry text-slate-400 mt-1">
            {viirsCount.toLocaleString()} (375m) • {modisCount.toLocaleString()} MODIS (1km)
          </p>
        </div>

        {/* Metric 4: Total Cumulative Radiative Energy */}
        <div className="rounded-2xl bg-[#030612]/80 border border-white/10 p-4 backdrop-blur-xl shadow-lg hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400 mb-1">
            <span>Radiative Energy</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
            {(totalFrp / 1000).toFixed(0)}k <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <p className="text-[11px] font-mono-telemetry text-slate-400 mt-1">
            Mean FRP: {meanFrp} MW per observation pass
          </p>
        </div>
      </div>

      {/* 3. Interactive Filter Bar: Clean, Uncluttered, Judges-Friendly */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#030612]/60 border border-white/5 rounded-xl px-4 py-3 font-mono-telemetry text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 mr-1 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            Telemetry Filters:
          </span>

          {/* Sensor Filter */}
          <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/10 text-[11px]">
            <button
              onClick={() => onSelectSensor("ALL")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                !selectedSensor || selectedSensor === "ALL"
                  ? "bg-white/20 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Sensors
            </button>
            <button
              onClick={() => onSelectSensor("VIIRS")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                selectedSensor === "VIIRS"
                  ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              VIIRS 375m
            </button>
            <button
              onClick={() => onSelectSensor("MODIS")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                selectedSensor === "MODIS"
                  ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              MODIS 1km
            </button>
          </div>

          {/* Diurnal Pass Filter */}
          <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/10 text-[11px]">
            <button
              onClick={() => onSelectDaynight("ALL")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                !selectedDaynight || selectedDaynight === "ALL"
                  ? "bg-white/20 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Day & Night
            </button>
            <button
              onClick={() => onSelectDaynight("D")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                selectedDaynight === "D"
                  ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sun className="w-2.5 h-2.5 text-amber-400" /> Day Only
            </button>
            <button
              onClick={() => onSelectDaynight("N")}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                selectedDaynight === "N"
                  ? "bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Moon className="w-2.5 h-2.5 text-indigo-400" /> Night Only
            </button>
          </div>

          {/* FRP Threshold Preset */}
          <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/10 text-[11px]">
            <button
              onClick={() => onMinFrpChange(minFrp === 20 ? 0 : 20)}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                minFrp >= 20
                  ? "bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="w-2.5 h-2.5" /> High FRP &gt; 20 MW
            </button>
          </div>
        </div>

        {/* Reset Filter Action */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
