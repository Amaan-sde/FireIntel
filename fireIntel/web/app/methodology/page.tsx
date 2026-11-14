"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Flame,
  Mountain,
  Orbit,
  ShieldCheck,
  CheckCircle2,
  FileText,
  ExternalLink,
  Cpu,
  Layers,
  Wind,
  Compass,
  BarChart3
} from "lucide-react";

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#020408] text-white p-6 sm:p-10 md:p-14 select-none">
      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-full glass-pill hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Return to Planetary Orbit"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-telemetry uppercase text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Scientific Documentation // Phase 5 &amp; 6 Standard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Methodology &amp; Data Architecture
            </h1>
          </div>
        </div>

        {/* Global Navigation Links */}
        <nav className="flex items-center gap-2">
          <Link
            href="/fires"
            className="glass-pill rounded-full px-4 py-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border-amber-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Lab</span>
          </Link>
          <Link
            href="/terrain"
            className="glass-pill rounded-full px-4 py-2 text-xs text-sky-300 hover:text-sky-200 hover:bg-sky-500/20 border-sky-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <span>Terrain Explorer</span>
          </Link>
          <Link
            href="/analytics"
            className="glass-pill rounded-full px-4 py-2 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 border-emerald-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analytics</span>
          </Link>
        </nav>
      </header>

      {/* Hero Overview */}
      <section className="max-w-4xl mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono-telemetry text-slate-300 mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Scientifically Verified Baseline • Zero Synthesized Data</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4 leading-tight">
          Precision Himalayan Fire Telemetry &amp; Topographic Integration
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-light">
          FIREINTEL integrates satellite radiometric thermal observations from NASA FIRMS (MODIS Terra/Aqua and VIIRS Suomi-NPP),
          high-resolution 30-meter elevation and relief models from the Copernicus GLO-30 DEM, and official geospatial boundaries
          to produce an empirical, peer-verifiable wildland fire observatory for the Western Himalayas (Uttarakhand, India).
        </p>
      </section>

      {/* Grid of Core Methodological Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
        {/* Pillar 1: Thermal Radiometry */}
        <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono-telemetry uppercase text-amber-400/90 tracking-wider">
                NASA FIRMS Pipeline
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Satellite Thermal Radiometry</h3>
            <p className="text-xs text-slate-300 font-mono-telemetry leading-relaxed mb-6">
              Thermal anomalies detected via mid-wave infrared (MWIR ~3.9–4.0 µm) and long-wave infrared (LWIR ~10.5–11.5 µm)
              differential radiometry.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center text-xs font-semibold text-white mb-1">
                  <span>VIIRS (Suomi-NPP) — 375m I-Bands</span>
                  <span className="font-mono-telemetry text-amber-400">6,623 hotspots</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Band I4 (3.74 µm) provides 375m nadir resolution, resolving lower-intensity smoldering and early ignition fronts
                  in complex mountain valleys.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center text-xs font-semibold text-white mb-1">
                  <span>MODIS (Terra &amp; Aqua) — 1,000m Bands</span>
                  <span className="font-mono-telemetry text-sky-400">918 hotspots</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Bands 21/22 (3.96 µm) and 31 (11.0 µm) provide long-term continuity with morning (Terra ~10:30 LT) and afternoon (Aqua ~13:30 LT) overpasses.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <span>Total 2025 Hotspots: <strong className="text-white">7,541</strong></span>
            <span>Ratio: <strong className="text-amber-400">7.21× VIIRS/MODIS</strong></span>
          </div>
        </div>

        {/* Pillar 2: Topographic Processing */}
        <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Mountain className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono-telemetry uppercase text-sky-400/90 tracking-wider">
                Copernicus GLO-30 DEM
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Copernicus 30m Topography</h3>
            <p className="text-xs text-slate-300 font-mono-telemetry leading-relaxed mb-6">
              Himalayan fire propagation is fundamentally governed by elevation gradients, solar aspect insolation, and slope chimney effects.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center text-xs font-semibold text-white mb-1">
                  <span>Elevation Extremes</span>
                  <span className="font-mono-telemetry text-sky-400">129 m – 7,804 m</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Spans the subtropical foothills of Udham Singh Nagar to the Nanda Devi glaciated summit (7,816m actual summit, 7,804m DEM cell peak).
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center text-xs font-semibold text-white mb-1">
                  <span>Derived Terrain Attributes</span>
                  <span className="font-mono-telemetry text-emerald-400">Slope · Aspect · TRI</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Horn&apos;s algorithm computes slope angles up to 76.4° and Terrain Ruggedness Index (TRI) measuring local relief variations.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <span>Spatial Resolution: <strong className="text-white">30 Meters (1.0 arcsec)</strong></span>
            <span>Vertical Datum: <strong className="text-sky-400">EGM2008 Geoid</strong></span>
          </div>
        </div>

        {/* Pillar 3: Master 0.05° Grid & Boundaries */}
        <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono-telemetry uppercase text-emerald-400/90 tracking-wider">
                Geospatial Synthesis
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">0.05° Master Reference Grid</h3>
            <p className="text-xs text-slate-300 font-mono-telemetry leading-relaxed mb-6">
              To harmonise multi-sensor satellite detections with meteorological and terrain datasets, Uttarakhand is partitioned into a standardized grid.
            </p>

            <ul className="space-y-2 text-xs text-slate-300 font-mono-telemetry">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>2,174 active spatial cells</strong> strictly bounded by official Survey of India administrative borders.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Cell footprint approximately <strong>5.5 km × 5.5 km</strong>, optimal for landscape-scale fire regime modeling.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Encompasses all 13 administrative districts across Garhwal and Kumaon divisions.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <span>Coordinate System: <strong className="text-white">EPSG:4326 (WGS 84)</strong></span>
            <span>Districts: <strong className="text-emerald-400">13 Validated</strong></span>
          </div>
        </div>

        {/* Pillar 4: Meteorological Architecture */}
        <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Wind className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono-telemetry uppercase text-indigo-400/90 tracking-wider">
                ECMWF Reanalysis
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ERA5-Land Climate Integration</h3>
            <p className="text-xs text-slate-300 font-mono-telemetry leading-relaxed mb-6">
              Hourly atmospheric and surface parameters reanalyzed at 0.1° resolution for thermodynamic fuel moisture calculations.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center text-xs font-semibold text-white mb-1">
                  <span>De-accumulation Algorithm</span>
                  <span className="font-mono-telemetry text-indigo-400">P_t - P_(t-1)</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  Precipitation and radiation fluxes are accumulated from forecast start; exact hourly instantaneous rates are derived via finite difference.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex justify-between items-center text-xs font-semibold text-white mb-1">
                  <span>Thermodynamic Variables</span>
                  <span className="font-mono-telemetry text-slate-300">T2m · D2m · Wind UV</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-normal">
                  2m Air Temperature, 2m Dewpoint Temperature (yielding relative humidity and VPD), and 10m wind speed vectors.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <span>Cadence: <strong className="text-white">Hourly Temporal</strong></span>
            <span>Status: <strong className="text-amber-400">CDS Auth Architecture Ready</strong></span>
          </div>
        </div>
      </div>

      {/* Technical Integrity & Disclaimers */}
      <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 max-w-4xl">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Scientific Disclaimers &amp; Transparency Standard</span>
        </h3>
        <div className="space-y-3 text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
          <p>
            <strong className="text-slate-200">Orbital Visualization:</strong> Orbital trajectories rendered on the planetary globe
            represent nominal Keplerian orbital geometries (inclination ~98.2°, altitude ~705–824 km, Sun-synchronous). They are calibrated
            for illustrative Earth-observation mission education and do not constitute real-time NORAD/Two-Line Element (TLE) ephemeris tracking.
            <span className="block text-amber-400 font-mono-telemetry text-xs mt-1.5">
              Notice: Illustrative orbital geometry — not live spacecraft tracking.
            </span>
          </p>
          <p>
            <strong className="text-slate-200">Sensor Detection Capabilities:</strong> While VIIRS 375m I-band detects significantly smaller flaming fronts
            than MODIS 1,000m bands (explaining the 7.21× observation ratio), satellite radiometers do not directly detect sub-canopy smoldering without thermal surface venting.
            All 7,541 records presented in FIREINTEL originate from official NASA FIRMS Level 2 / NRT data products.
          </p>
        </div>
      </section>
    </main>
  );
}