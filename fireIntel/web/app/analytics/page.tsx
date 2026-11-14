"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Flame, Mountain, FileText, Calendar, Activity, ShieldCheck, Orbit } from "lucide-react";

export default function HistoricalAnalyticsPage() {
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

  const monthlyCounts = [
    { month: "Jan", count: 85, pct: 1.1 },
    { month: "Feb", count: 210, pct: 2.8 },
    { month: "Mar", count: 742, pct: 9.8 },
    { month: "Apr", count: 2255, pct: 29.9, peak: true },
    { month: "May", count: 628, pct: 8.3 },
    { month: "Jun", count: 184, pct: 2.4 },
    { month: "Jul", count: 12, pct: 0.2 },
    { month: "Aug", count: 8, pct: 0.1 },
    { month: "Sep", count: 19, pct: 0.3 },
    { month: "Oct", count: 345, pct: 4.6 },
    { month: "Nov", count: 1375, pct: 18.2 },
    { month: "Dec", count: 1678, pct: 22.3 },
  ];

  return (
    <main className="min-h-screen bg-[#020408] text-white p-6 sm:p-10 md:p-14 select-none">
      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-full glass-pill hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Return to Living Earth"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-telemetry uppercase text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Historical Analytics // 2025 Baseline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Uttarakhand Fire Radiative Regime
            </h1>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/fires"
            className="glass-pill px-3.5 py-1.5 rounded-full text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Intelligence</span>
          </Link>

          <Link
            href="/terrain"
            className="glass-pill px-3.5 py-1.5 rounded-full text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <span>Terrain Explorer</span>
          </Link>

          <Link
            href="/methodology"
            className="glass-pill px-3.5 py-1.5 rounded-full text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Methodology</span>
          </Link>
        </nav>
      </header>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-surface p-5 rounded-2xl border border-white/10">
          <div className="text-[11px] font-mono-telemetry text-slate-400 mb-1">Total Verified Observations</div>
          <div className="text-3xl font-bold font-mono-telemetry text-white">7,541</div>
          <div className="text-xs text-slate-400 mt-1">100% Boundary Validated</div>
        </div>

        <div className="glass-surface p-5 rounded-2xl border border-white/10">
          <div className="text-[11px] font-mono-telemetry text-slate-400 mb-1">VIIRS 375m Detections</div>
          <div className="text-3xl font-bold font-mono-telemetry text-sky-400">6,623</div>
          <div className="text-xs text-slate-400 mt-1">7.21× observation density</div>
        </div>

        <div className="glass-surface p-5 rounded-2xl border border-white/10">
          <div className="text-[11px] font-mono-telemetry text-slate-400 mb-1">MODIS 1km Detections</div>
          <div className="text-3xl font-bold font-mono-telemetry text-amber-400">918</div>
          <div className="text-xs text-slate-400 mt-1">Dual-sensor Terra/Aqua cross-check</div>
        </div>

        <div className="glass-surface p-5 rounded-2xl border border-white/10">
          <div className="text-[11px] font-mono-telemetry text-slate-400 mb-1">Peak Radiative Power</div>
          <div className="text-3xl font-bold font-mono-telemetry text-rose-400">169.9 <span className="text-sm font-normal text-slate-300">MW</span></div>
          <div className="text-xs text-slate-400 mt-1">Terra MODIS (Feb 11, 2025)</div>
        </div>
      </div>

      {/* Temporal Distribution Graph */}
      <section className="glass-surface p-6 sm:p-8 rounded-2xl border border-white/10 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Monthly Observation Frequency (2025)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Highlighting the acute pre-monsoon burning spike (April: 2,255 detections) and post-monsoon winter agricultural clearing.
            </p>
          </div>
          <div className="text-xs font-mono-telemetry text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            April Peak: 29.9% of Total
          </div>
        </div>

        {/* 12-Month Bar Visualization */}
        <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-56 pt-6 border-b border-white/10 pb-2">
          {monthlyCounts.map((m) => {
            const heightPct = Math.max(8, Math.round((m.count / 2255) * 100));
            return (
              <div key={m.month} className="flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono-telemetry text-slate-400 group-hover:text-white transition-colors">
                  {m.count}
                </div>
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-t-md transition-all ${
                    m.peak
                      ? "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                      : m.count > 1000
                      ? "bg-sky-500/80 group-hover:bg-sky-400"
                      : "bg-white/20 group-hover:bg-white/40"
                  }`}
                />
                <div className="text-xs font-mono-telemetry text-slate-300 font-semibold">{m.month}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sensor Breakdown & Diurnal Characteristics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-surface p-6 rounded-2xl border border-white/10">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Orbit className="w-4 h-4 text-sky-400" />
            <span>Diurnal Pass Breakdown</span>
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Satellite thermal anomalies captured during daytime overpasses vs nighttime cool-background passes.
          </p>
          <div className="space-y-4 font-mono-telemetry text-xs">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300">Daytime Passes (AM & PM Ascending)</span>
                <span className="font-bold text-white">4,911 (65.1%)</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: "65.1%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300">Nighttime Passes (Cool Ground Contrast)</span>
                <span className="font-bold text-white">2,630 (34.9%)</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: "34.9%" }} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-surface p-6 rounded-2xl border border-white/10">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Scientific Quality & Confidence</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Strict boundary validation using official Survey of India administrative boundary polygons.
          </p>
          <ul className="space-y-2.5 text-xs text-slate-300 font-mono-telemetry">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>0% data fabrication: raw FIRMS archives preserved unmodified</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>2,174 master grid cells aligned at 0.05° resolution</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Copernicus GLO-30 DEM 30m elevation terrain mosaic integration</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

