"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Flame,
  Mountain,
  FileText,
  Calendar,
  Activity,
  ShieldCheck,
  Orbit,
  Sun,
  Moon,
  TrendingUp,
  Layers,
  Thermometer,
  Info,
  Database,
  Radio,
  BookOpen,
  Compass,
  Cpu
} from "lucide-react";

export default function HistoricalAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"monthly" | "elevation" | "slope" | "frp" | "seasonal">("monthly");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch("/data/historical_analytics.json");
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load historical analytics:", err);
      }
    }
    loadAnalytics();
  }, []);

  const monthlySeries = analytics?.monthly_series || [
    { month: "Jan", count: 666, pct: 8.83, modis: 92, viirs: 574, peak_frp: 74.3 },
    { month: "Feb", count: 848, pct: 11.25, modis: 118, viirs: 730, peak_frp: 169.9 },
    { month: "Mar", count: 467, pct: 6.19, modis: 58, viirs: 409, peak_frp: 70.1 },
    { month: "Apr", count: 2255, pct: 29.9, modis: 254, viirs: 2001, peak_frp: 136.6, is_peak: true },
    { month: "May", count: 628, pct: 8.33, modis: 72, viirs: 556, peak_frp: 55.4 },
    { month: "Jun", count: 123, pct: 1.63, modis: 14, viirs: 109, peak_frp: 35.2 },
    { month: "Jul", count: 5, pct: 0.07, modis: 0, viirs: 5, peak_frp: 4.8 },
    { month: "Aug", count: 1, pct: 0.01, modis: 0, viirs: 1, peak_frp: 2.1 },
    { month: "Sep", count: 3, pct: 0.04, modis: 0, viirs: 3, peak_frp: 3.5 },
    { month: "Oct", count: 443, pct: 5.87, modis: 46, viirs: 397, peak_frp: 48.7 },
    { month: "Nov", count: 424, pct: 5.62, modis: 42, viirs: 382, peak_frp: 41.0 },
    { month: "Dec", count: 1678, pct: 22.25, modis: 222, viirs: 1456, peak_frp: 88.5 },
  ];

  const elevationSeries = analytics?.elevation_distribution || [
    { band: "<500m (Foothills / Terai)", count: 2156, pct: 28.57, mean_frp: 4.8 },
    { band: "500–1000m (Sub-montane Sal)", count: 677, pct: 8.97, mean_frp: 5.1 },
    { band: "1000–1500m (Lower Pine)", count: 1639, pct: 21.72, mean_frp: 5.7 },
    { band: "1500–2000m (Upper Chir Pine)", count: 1737, pct: 23.02, mean_frp: 6.2 },
    { band: "2000–2500m (Oak-Rhododendron)", count: 764, pct: 10.12, mean_frp: 4.9 },
    { band: "2500–3000m (Subalpine Conifer)", count: 362, pct: 4.8, mean_frp: 4.1 },
    { band: "3000–4000m (Timberline/Meadow)", count: 195, pct: 2.58, mean_frp: 3.8 },
    { band: ">4000m (Nival/Glacial)", count: 16, pct: 0.21, mean_frp: 2.9 },
  ];

  const slopeSeries = analytics?.slope_distribution || [
    { band: "0–5° (Level / Valley floor)", count: 2022, pct: 26.8 },
    { band: "5–15° (Gentle hillside)", count: 231, pct: 3.06 },
    { band: "15–25° (Moderate slope)", count: 956, pct: 12.67 },
    { band: "25–35° (Steep chimney slope)", count: 3942, pct: 52.24 },
    { band: ">35° (Precipitous cliff)", count: 395, pct: 5.23 },
  ];

  const frpSeries = analytics?.frp_distribution || [
    { band: "< 5 MW (Low / Smoldering)", count: 4971, pct: 65.92 },
    { band: "5–15 MW (Moderate Surface)", count: 2132, pct: 28.27 },
    { band: "15–40 MW (High / Intense Flaming)", count: 389, pct: 5.16 },
    { band: "40–100 MW (Severe Crown Fire)", count: 45, pct: 0.6 },
    { band: "> 100 MW (Extreme Blowup)", count: 4, pct: 0.05 },
  ];

  const seasons = analytics?.seasonal_distribution || [
    {
      season: "Pre-Monsoon Peak Burning",
      period: "February – May",
      count: 4198,
      pct: 55.67,
      characteristics: "High vapor pressure deficit (VPD), desiccated Chir pine needle litter, maximum solar heating, intense flaming behavior."
    },
    {
      season: "Southwest Monsoon Suppression",
      period: "June – September",
      count: 132,
      pct: 1.75,
      characteristics: "Torrential monsoon precipitation, live fuel moisture saturation (>100%), extensive persistent cloud attenuation."
    },
    {
      season: "Post-Monsoon & Winter Residual",
      period: "October – January",
      count: 3211,
      pct: 42.58,
      characteristics: "Terai-Bhabar agricultural residue burning and ground litter management, lower radiative intensity."
    }
  ];

  return (
    <main className="min-h-screen w-full bg-[#020408] text-white p-5 sm:p-8 md:p-12 overflow-y-auto selection:bg-cyan-500/30">
      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-full bg-[#040810]/80 backdrop-blur-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs"
            title="Return to Planetary Orbit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-mono-telemetry">Orbit</span>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono-telemetry uppercase text-cyan-400 font-bold tracking-widest">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>NASA SPACE APPS 2026 // ENVIRONMENTAL RESEARCH LAB</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-0.5">
              Himalayan Wildfire Regimes &amp; Radiative Telemetry
            </h1>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <Orbit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Home</span>
          </Link>

          <Link
            href="/fires"
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs text-amber-300 hover:text-amber-200 transition-all font-medium flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Lab</span>
          </Link>

          <Link
            href="/terrain"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-sky-300 hover:text-sky-200 hover:bg-sky-500/20 transition-all font-medium flex items-center gap-1.5"
          >
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <span>Terrain Explorer</span>
          </Link>

          <Link
            href="/data"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 transition-all font-medium flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data Explorer</span>
          </Link>

          <Link
            href="/methodology"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-emerald-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Methodology</span>
          </Link>
        </nav>
      </header>

      {/* Editorial Research Publication Abstract Banner */}
      <section className="bg-[#040810]/85 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-cyan-500/20 mb-8 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 text-[10px] font-mono-telemetry uppercase text-cyan-400 font-bold tracking-wider mb-2">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Scientific Monograph // Western Himalayan Thermal Telemetry</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light mb-3">
          This empirical study quantifies the spatial, temporal, and topographic drivers of wildfire activity across Uttarakhand, India for the complete 2025 observation cycle. Synthesizing 7,541 boundary-validated radiometric observations from NASA FIRMS (MODIS Terra/Aqua &amp; VIIRS Suomi-NPP) with the Copernicus GLO-30 Digital Elevation Model, the findings demonstrate pronounced altitudinal confinement, steep slope convective chimney acceleration, and acute bimodal burning seasonality.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono-telemetry text-slate-400 pt-3 border-t border-white/[0.06]">
          <span>Data Ingestion: <strong className="text-slate-200">NASA FIRMS 2025 Archive</strong></span>
          <span>Topography: <strong className="text-slate-200">Copernicus GLO-30 DEM (30m)</strong></span>
          <span>Boundary: <strong className="text-slate-200">Survey of India (SOI) Verified</strong></span>
          <span>Detections: <strong className="text-amber-400">7,541 Observations</strong></span>
        </div>
      </section>

      {/* Scientific Definition Notice */}
      <div className="bg-[#040810]/60 p-4 rounded-xl border border-white/[0.08] mb-8 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed font-light">
          <strong className="text-white font-medium">Observational Unit Definition:</strong> All 7,541 records represent radiometric satellite pixel hotspot detections (thermal anomalies) captured by NASA MODIS (Terra &amp; Aqua) and VIIRS (Suomi-NPP) instruments. They do not constitute discrete wildfire incident perimeters, as a single severe fire can produce multiple contiguous pixel detections across consecutive overpasses.
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#040810]/85 backdrop-blur-xl p-5 rounded-2xl border border-white/[0.08] shadow-lg">
          <div className="text-[10px] font-mono-telemetry text-slate-400 uppercase tracking-wider mb-1">Total Verified Observations</div>
          <div className="text-3xl font-extrabold font-mono-telemetry text-white">7,541</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-mono-telemetry">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>100% Boundary Validated (SOI)</span>
          </div>
        </div>

        <div className="bg-[#040810]/85 backdrop-blur-xl p-5 rounded-2xl border border-white/[0.08] shadow-lg">
          <div className="text-[10px] font-mono-telemetry text-slate-400 uppercase tracking-wider mb-1">VIIRS Suomi-NPP (375m nadir)</div>
          <div className="text-3xl font-extrabold font-mono-telemetry text-amber-400">6,623</div>
          <div className="text-xs text-slate-400 mt-1 font-mono-telemetry">
            87.83% of total · 7.21× observation density
          </div>
        </div>

        <div className="bg-[#040810]/85 backdrop-blur-xl p-5 rounded-2xl border border-white/[0.08] shadow-lg">
          <div className="text-[10px] font-mono-telemetry text-slate-400 uppercase tracking-wider mb-1">MODIS Terra &amp; Aqua (1km nadir)</div>
          <div className="text-3xl font-extrabold font-mono-telemetry text-sky-400">918</div>
          <div className="text-xs text-slate-400 mt-1 font-mono-telemetry">
            12.17% of total · Mean FRP 15.27 MW
          </div>
        </div>

        <div className="bg-[#040810]/85 backdrop-blur-xl p-5 rounded-2xl border border-white/[0.08] shadow-lg">
          <div className="text-[10px] font-mono-telemetry text-slate-400 uppercase tracking-wider mb-1">Peak Radiative Power (FRP)</div>
          <div className="text-3xl font-extrabold font-mono-telemetry text-rose-400">
            169.9 <span className="text-sm font-normal text-slate-300">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono-telemetry">
            Terra MODIS (Feb 11, 2025 · 30.38°N, 79.43°E)
          </div>
        </div>
      </div>

      {/* Analytics Dimension Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/[0.08] pb-4">
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono-telemetry transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "monthly"
              ? "bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
              : "bg-[#040810]/80 border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Monthly Trends</span>
        </button>

        <button
          onClick={() => setActiveTab("elevation")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono-telemetry transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "elevation"
              ? "bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
              : "bg-[#040810]/80 border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>Elevation Distribution (DEM)</span>
        </button>

        <button
          onClick={() => setActiveTab("slope")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono-telemetry transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "slope"
              ? "bg-sky-400 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]"
              : "bg-[#040810]/80 border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Slope &amp; Relief Chimneys</span>
        </button>

        <button
          onClick={() => setActiveTab("frp")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono-telemetry transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "frp"
              ? "bg-rose-400 text-slate-950 shadow-[0_0_15px_rgba(251,113,133,0.4)]"
              : "bg-[#040810]/80 border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>FRP Intensity Bands (MW)</span>
        </button>

        <button
          onClick={() => setActiveTab("seasonal")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono-telemetry transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "seasonal"
              ? "bg-purple-400 text-slate-950 shadow-[0_0_15px_rgba(192,132,252,0.4)]"
              : "bg-[#040810]/80 border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Seasonal Regimes</span>
        </button>
      </div>

      {/* Tab 1: Monthly Trends */}
      {activeTab === "monthly" && (
        <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 mb-8 shadow-xl animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="text-[10px] font-mono-telemetry uppercase text-amber-400 font-bold tracking-wider mb-1">
                Figure 1.0 // Chronological Frequency Distribution
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Monthly Thermal Observation Frequency (Complete 2025 Empirical Series)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-light">
                Showing acute pre-monsoon burning peak in April (2,255 observations) and secondary winter post-monsoon clearing in December (1,678 observations).
              </p>
            </div>
            <div className="text-xs font-mono-telemetry text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/30 self-start sm:self-auto font-semibold">
              April Peak: 2,255 (29.90%)
            </div>
          </div>

          {/* 12-Month Bar Chart */}
          <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-64 pt-8 border-b border-white/10 pb-2">
            {monthlySeries.map((m: any) => {
              const heightPct = Math.max(6, Math.round((m.count / 2255) * 100));
              return (
                <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-black/95 border border-cyan-500/30 p-2.5 rounded-xl text-[10px] font-mono-telemetry pointer-events-none z-20 whitespace-nowrap shadow-2xl">
                    <div className="font-bold text-white">{m.month}: {m.count.toLocaleString()} ({m.pct}%)</div>
                    <div className="text-amber-300">VIIRS: {m.viirs} · MODIS: {m.modis}</div>
                    <div className="text-slate-400">Peak FRP: {m.peak_frp} MW</div>
                  </div>

                  <div className="text-[10px] font-mono-telemetry text-slate-400 group-hover:text-white transition-colors">
                    {m.count}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      m.is_peak
                        ? "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                        : m.count > 1000
                        ? "bg-sky-500/80 group-hover:bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                        : "bg-white/20 group-hover:bg-white/40"
                    }`}
                  />
                  <div className="text-xs font-mono-telemetry text-slate-300 font-semibold">{m.month}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Primary Annual Peak (April: 2,255)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-sky-500/80" />
                <span>Major Monthly Volume (&gt; 1,000)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white/20" />
                <span>Baseline Months</span>
              </span>
            </div>
            <span>Annual Total: <strong className="text-white">7,541 Observations</strong></span>
          </div>
        </section>
      )}

      {/* Tab 2: Elevation Distribution */}
      {activeTab === "elevation" && (
        <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 mb-8 shadow-xl animate-in fade-in duration-200">
          <div className="mb-6">
            <div className="text-[10px] font-mono-telemetry uppercase text-emerald-400 font-bold tracking-wider mb-1">
              Figure 2.0 // Hypsometric Stratification
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Mountain className="w-4 h-4 text-emerald-400" />
              <span>Elevation Stratification of Hotspot Detections (Copernicus GLO-30 DEM)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-light">
              Topographic analysis reveals that <strong className="text-amber-400">44.74% of all fire detections</strong> concentrate in the Chir pine belt (1,000 m to 2,000 m), where flammable needle litter and resin-rich biomass maximize flammability.
            </p>
          </div>

          <div className="space-y-3.5">
            {elevationSeries.map((item: any) => (
              <div key={item.band} className="group">
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                    {item.band}
                  </span>
                  <div className="font-mono-telemetry text-right">
                    <span className="font-bold text-white mr-2">{item.count.toLocaleString()}</span>
                    <span className="text-slate-400">({item.pct}%)</span>
                    <span className="text-amber-400 text-[11px] ml-3">Mean FRP: {item.mean_frp} MW</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.band.includes("Chir Pine")
                        ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                        : item.band.includes("Foothills")
                        ? "bg-emerald-400"
                        : "bg-sky-400"
                    }`}
                    style={{ width: `${item.pct * 3.2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-400 leading-relaxed font-light">
            <strong className="text-white">Scientific Insight:</strong> Above 3,000 meters, observations drop to 2.79% due to timberline alpine meadows and nival glaciers. Below 500 meters, 28.57% of observations are associated with Terai agricultural post-harvest residue clearance and forest-edge burning.
          </div>
        </section>
      )}

      {/* Tab 3: Slope Distribution */}
      {activeTab === "slope" && (
        <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 mb-8 shadow-xl animate-in fade-in duration-200">
          <div className="mb-6">
            <div className="text-[10px] font-mono-telemetry uppercase text-sky-400 font-bold tracking-wider mb-1">
              Figure 3.0 // Orographic Combustion Accelerators
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Slope Incline &amp; Topographic Chimney Effect</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-light">
              Slope calculated via Horn&apos;s algorithm on Copernicus GLO-30 DEM. More than half of all detections occur on steep slopes (25°–35°).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              {slopeSeries.map((item: any) => (
                <div key={item.band}>
                  <div className="flex justify-between items-baseline text-xs mb-1.5 font-mono-telemetry">
                    <span className="text-slate-300">{item.band}</span>
                    <span className="font-bold text-white">{item.count.toLocaleString()} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.band.includes("Steep")
                          ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                          : "bg-sky-400"
                      }`}
                      style={{ width: `${item.pct * 1.8}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 leading-relaxed space-y-3 font-light">
              <div className="font-bold text-white flex items-center gap-2">
                <Mountain className="w-4 h-4 text-amber-400" />
                <span>Orographic Combustion Mechanics</span>
              </div>
              <p>
                In steep Himalayan terrain (25°–35°), convective heat transfer and flame tilt pre-heat uphill unburned fuels dramatically faster than on flat terrain.
              </p>
              <p>
                Valley winds drawn up mountain corridors during midday solar heating accelerate spread rates, driving the April fire escalation across Garhwal and Kumaon ridges.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: FRP Intensity Bands */}
      {activeTab === "frp" && (
        <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 mb-8 shadow-xl animate-in fade-in duration-200">
          <div className="mb-6">
            <div className="text-[10px] font-mono-telemetry uppercase text-rose-400 font-bold tracking-wider mb-1">
              Figure 4.0 // Radiative Combustion Energy Spectrum
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Fire Radiative Power (FRP) Energy Distribution</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-light">
              FRP is measured in Megawatts (MW) and quantifies the rate of radiant combustion energy release.
            </p>
          </div>

          <div className="space-y-4">
            {frpSeries.map((item: any) => (
              <div key={item.band} className="group">
                <div className="flex justify-between items-baseline text-xs mb-1.5">
                  <span className="font-medium text-slate-300">{item.band}</span>
                  <div className="font-mono-telemetry">
                    <span className="font-bold text-white mr-2">{item.count.toLocaleString()}</span>
                    <span className="text-slate-400">({item.pct}%)</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.band.includes("> 100")
                        ? "bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.8)]"
                        : item.band.includes("40–100")
                        ? "bg-rose-500"
                        : item.band.includes("15–40")
                        ? "bg-amber-400"
                        : "bg-yellow-400"
                    }`}
                    style={{ width: `${item.pct * 1.4}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono-telemetry">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-400 block mb-1">Minimum FRP Detected:</span>
              <span className="text-base font-bold text-white">0.15 MW</span>
              <span className="text-slate-500 text-[10px] block">VIIRS 375m I-band</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-400 block mb-1">Mean FRP (VIIRS):</span>
              <span className="text-base font-bold text-amber-300">3.97 MW</span>
              <span className="text-slate-500 text-[10px] block">Resolves small smoldering</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-400 block mb-1">Mean FRP (MODIS):</span>
              <span className="text-base font-bold text-sky-300">15.27 MW</span>
              <span className="text-slate-500 text-[10px] block">Requires larger flaming core</span>
            </div>
          </div>
        </section>
      )}

      {/* Tab 5: Seasonal Regimes */}
      {activeTab === "seasonal" && (
        <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 mb-8 shadow-xl animate-in fade-in duration-200">
          <div className="mb-6">
            <div className="text-[10px] font-mono-telemetry uppercase text-purple-400 font-bold tracking-wider mb-1">
              Figure 5.0 // Bimodal Combustion Cycles
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Macro-Seasonal Combustion Cycles of the Western Himalayas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-light">
              Comparison across the three distinct biophysical wildfire seasons in Uttarakhand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {seasons.map((s: any) => (
              <div key={s.season} className="p-5 rounded-2xl bg-black/60 border border-white/[0.08] flex flex-col justify-between shadow-lg">
                <div>
                  <div className="text-[11px] font-mono-telemetry text-amber-400 font-semibold uppercase mb-1">
                    {s.period}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{s.season}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light mb-4">
                    {s.characteristics}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 font-mono-telemetry">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-slate-300">Total Detections:</span>
                    <span className="text-lg font-bold text-white">{s.count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-400">Share of Annual Total:</span>
                    <span className="text-xs font-semibold text-amber-400">{s.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sensor Breakdown & Diurnal Characteristics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#040810]/85 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-xl">
          <div className="text-[10px] font-mono-telemetry uppercase text-sky-400 font-bold tracking-wider mb-1">
            Orbital Radiometry Telemetry
          </div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Orbit className="w-4 h-4 text-sky-400" />
            <span>Diurnal Pass Breakdown (Day vs Night)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed font-light">
            Satellite thermal anomalies captured during daytime overpasses vs nighttime cool-background passes.
          </p>
          <div className="space-y-4 font-mono-telemetry text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Daytime Passes (Terra AM &amp; Aqua/VIIRS PM Ascending)</span>
                </span>
                <span className="font-bold text-white">4,911 (65.12%)</span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]" style={{ width: "65.12%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Nighttime Passes (Cool Ground High-Contrast Detection)</span>
                </span>
                <span className="font-bold text-white">2,630 (34.88%)</span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full shadow-[0_0_8px_#38bdf8]" style={{ width: "34.88%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#040810]/85 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-xl">
          <div className="text-[10px] font-mono-telemetry uppercase text-emerald-400 font-bold tracking-wider mb-1">
            Data Quality &amp; Peer Verification
          </div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Scientific Provenance &amp; Data Pipeline Standards</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed font-light">
            Every statistic shown is deterministically calculated from official NASA FIRMS archives and Copernicus DEM mosaics.
          </p>
          <ul className="space-y-2.5 text-xs text-slate-300 font-mono-telemetry">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>0% data fabrication: raw FIRMS CSV records preserved unmodified</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>2,174 master grid cells aligned at 0.05° horizontal resolution</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Copernicus GLO-30 DEM 30m vertical relief mosaic (EGM2008 geoid)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Sensors: Suomi-NPP VIIRS (6,623) · Terra MODIS (234) · Aqua MODIS (684)</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
