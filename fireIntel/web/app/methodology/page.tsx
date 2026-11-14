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
  BarChart3,
  AlertTriangle,
  Clock,
  Info
} from "lucide-react";

export default function MethodologyPage() {
  return (
    <main className="min-h-screen w-full bg-[#020408] text-white p-6 sm:p-10 md:p-14 overflow-y-auto">
      {/* Top Header Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-full glass-pill hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs"
            title="Return to Planetary Orbit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-mono-telemetry">Orbit</span>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-telemetry uppercase text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Scientific Documentation // Phase 7 Product Readiness</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Methodology, Provenance &amp; Scientific Validation
            </h1>
          </div>
        </div>

        {/* Global Navigation Links */}
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="glass-pill rounded-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium flex items-center gap-1.5"
          >
            <Orbit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Home</span>
          </Link>
          <Link
            href="/fires"
            className="glass-pill rounded-full px-3.5 py-2 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border-amber-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Lab</span>
          </Link>
          <Link
            href="/terrain"
            className="glass-pill rounded-full px-3.5 py-2 text-xs text-sky-300 hover:text-sky-200 hover:bg-sky-500/20 border-sky-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <span>Terrain Explorer</span>
          </Link>
          <Link
            href="/analytics"
            className="glass-pill rounded-full px-3.5 py-2 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 border-emerald-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analytics</span>
          </Link>
          <Link
            href="/data"
            className="glass-pill rounded-full px-3.5 py-2 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 border-cyan-500/30 transition-all font-medium flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data Explorer</span>
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
          Himalayan Radiometric Telemetry &amp; Topographic Integration
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-light">
          FIREINTEL integrates satellite radiometric thermal observations from NASA FIRMS (MODIS Terra/Aqua and VIIRS Suomi-NPP),
          high-resolution 30-meter elevation and relief models from the Copernicus GLO-30 DEM, and official geospatial boundaries
          to produce an empirical, peer-verifiable wildland fire observatory for the Western Himalayas (Uttarakhand, India).
        </p>
      </section>

      {/* Critical Scientific Definition Banner */}
      <section className="mb-12 p-5 rounded-2xl glass-surface border border-amber-500/30 bg-amber-500/[0.03]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
            <div className="font-bold text-white text-sm">
              Observational Unit Semantics: Radiometric Pixel Detections ≠ Confirmed Wildfire Incidents
            </div>
            <p>
              In satellite remote sensing, each recorded data point represents a <strong>radiometric pixel hotspot detection</strong> identified
              by automated thermal anomaly algorithms (MOD14/MYD14 or VNP14IMG). A single large, actively spreading wildfire incident can trigger
              multiple contiguous pixel detections across a single overpass and additional detections over consecutive satellite overpasses.
              Conversely, small sub-canopy smoldering fires beneath dense sal or oak canopies may remain radiometrically obscured until crown ignition occurs.
              All statistics in FIREINTEL explicitly reflect validated satellite observations, avoiding artificial incident aggregation assumptions.
            </p>
          </div>
        </div>
      </section>

      {/* Data Provenance & Lifecycle Matrix */}
      <section className="mb-14 p-6 sm:p-8 rounded-2xl glass-surface border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-sky-400" />
          <h3 className="text-xl font-bold text-white">Data Provenance &amp; Acquisition Lifecycle Matrix</h3>
        </div>
        <p className="text-xs text-slate-300 font-mono-telemetry mb-6 leading-relaxed">
          Full transparency regarding downloaded, processed, and pending external datasets.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-telemetry border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                <th className="py-3 px-3">Dataset / Instrument</th>
                <th className="py-3 px-3">Source &amp; Provider</th>
                <th className="py-3 px-3">Nominal Resolution</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Observation Count / Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold text-white">VIIRS (Suomi-NPP)</td>
                <td className="py-3 px-3 text-slate-400">NASA FIRMS (VNP14IMGTDL)</td>
                <td className="py-3 px-3 text-amber-300">375 m (nadir)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Downloaded &amp; Validated
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-white">6,623 Hotspots (87.8%)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">MODIS (Aqua &amp; Terra)</td>
                <td className="py-3 px-3 text-slate-400">NASA FIRMS (MCD14DL)</td>
                <td className="py-3 px-3 text-sky-300">1,000 m (nadir)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Downloaded &amp; Validated
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-white">918 Hotspots (12.2%)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-400">VIIRS (NOAA-20 / JPSS-1)</td>
                <td className="py-3 px-3 text-slate-400">NASA FIRMS (VJ114IMGTDL)</td>
                <td className="py-3 px-3 text-slate-500">375 m (nadir)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-slate-400 bg-white/5 px-2 py-0.5 rounded-full text-[10px]">
                    <Info className="w-3 h-3" /> Verified Absent
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-500">0 Hotspots (100% VIIRS is Suomi-NPP)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">Copernicus GLO-30 DEM</td>
                <td className="py-3 px-3 text-slate-400">European Space Agency (Copernicus)</td>
                <td className="py-3 px-3 text-emerald-300">30 m (1.0 arcsec)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Downloaded &amp; Extruded
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-300">Complete Uttarakhand DEM (129m–7,804m)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">State Boundary (Uttarakhand)</td>
                <td className="py-3 px-3 text-slate-400">Survey of India / Official Boundary</td>
                <td className="py-3 px-3 text-slate-300">Vector Polygon (EPSG:4326)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Boundary Validated
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-300">Strict point-in-polygon spatial filter</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">Master Analytical Grid</td>
                <td className="py-3 px-3 text-slate-400">FIREINTEL Geospatial Framework</td>
                <td className="py-3 px-3 text-indigo-300">0.05° (~5.5 km × 5.5 km)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Synthesized Grid
                  </span>
                </td>
                <td className="py-3 px-3 font-bold text-white">2,174 Discrete Analytical Cells</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-amber-300">ERA5-Land Reanalysis</td>
                <td className="py-3 px-3 text-slate-400">ECMWF Copernicus Climate Data Store</td>
                <td className="py-3 px-3 text-indigo-300">0.1° (~9 km native)</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <Clock className="w-3 h-3" /> Pending External CDS Queue
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-400">CDS API architecture ready; awaiting remote fetch</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sensor Characteristics & Optical Bow-Tie Effect */}
      <section className="mb-14 p-6 sm:p-8 rounded-2xl glass-surface border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Orbit className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-bold text-white">Optical Geometry &amp; The Bow-Tie Effect</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-6 font-light">
          Understanding the difference between nominal nadir spatial resolution and actual ground-projected pixel footprint
          is essential for interpreting fire detections in steep mountainous terrain.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-sky-400">
              <span>MODIS (Terra / Aqua)</span>
              <span className="text-xs font-mono-telemetry bg-sky-500/20 px-2 py-0.5 rounded text-sky-300">1,000m Nominal Nadir</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              MODIS utilizes a 40-sided rotating mirror scanning ±55° across a 2,330 km swath. As scan angle increases off-nadir,
              optical distortion causes pixel footprint growth:
            </p>
            <ul className="text-xs font-mono-telemetry space-y-1.5 text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>Nadir resolution: <strong>1.0 km × 1.0 km</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>Edge of scan footprint: <strong>~2.0 km (track) × 4.8 km (scan)</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span>Area expansion: <strong>~9.6× larger</strong> at scan edge</span>
              </li>
            </ul>
            <div className="text-[11px] text-slate-400 leading-normal pt-2 border-t border-white/5">
              This geometric expansion leads to consecutive scan line overlap (&ldquo;bow-tie effect&rdquo;), which can occasionally duplicate thermal detections of the same fire front near swath edges.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-amber-400">
              <span>VIIRS (Suomi-NPP)</span>
              <span className="text-xs font-mono-telemetry bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">375m Nominal Nadir</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              VIIRS incorporates specialized onboard sample aggregation (3:1 aggregation at nadir transitioning to 2:1 and 1:1 near scan edge)
              over a 3,060 km swath:
            </p>
            <ul className="text-xs font-mono-telemetry space-y-1.5 text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Nadir resolution: <strong>375 m × 375 m</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Edge of scan footprint: <strong>~800 m × 800 m</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Area expansion: Constrained to <strong>~4.5×</strong> (vs ~10× for MODIS)</span>
              </li>
            </ul>
            <div className="text-[11px] text-slate-400 leading-normal pt-2 border-t border-white/5">
              Onboard pixel deletion and 3:1 aggregation eliminate along-scan bow-tie overlap, providing superior spatial delineation of narrow Himalayan ridge ignitions.
            </div>
          </div>
        </div>
      </section>

      {/* FRP Formulation & Decoupled Confidence Semantics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
        {/* Fire Radiative Power (MW) */}
        <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono-telemetry uppercase text-amber-400/90 tracking-wider">
                Wooster MIR Formulation
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fire Radiative Power (FRP) in MW</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Fire Radiative Power quantifies the instantaneous rate of radiant thermal energy emitted by the flaming/smoldering combustion front,
              expressed in <strong>Megawatts (MW)</strong>:
            </p>
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono-telemetry text-amber-300 text-xs text-center mb-4">
              FRP = (A_pixel · σ / a) · (L_MIR,fire - L_MIR,bg) [MW]
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Because thermal emission in the MWIR band (~3.9 µm) scales approximately linearly with combustion temperature, FRP correlates directly
              with fuel consumption rate (~0.368 kg/MJ for forest biomass), providing a direct energetic metric far superior to burned-area estimates.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <span>2025 Peak Observed FRP: <strong className="text-amber-400">169.9 MW</strong></span>
            <span>Dataset Mean FRP: <strong className="text-white">5.35 MW</strong></span>
          </div>
        </div>

        {/* Decoupled Confidence Semantics */}
        <div className="p-6 sm:p-8 rounded-2xl glass-surface border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono-telemetry uppercase text-sky-400/90 tracking-wider">
                Sensor Semantics
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Decoupled Confidence Semantics</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              NASA FIRMS employs fundamentally different confidence metrics across instruments, which must not be conflated into a single naive filter:
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-xs font-bold text-sky-400 mb-1">MODIS: Quantitative Integer (0–100%)</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Based on statistical deviation from background brightness temperature, atmospheric transmissive attenuation, and view zenith angle.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <div className="text-xs font-bold text-amber-400 mb-1">VIIRS: Categorical Quality Flag (Low / Nominal / High)</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Derived from 375m I4 brightness temperature, day/night solar glint tests, and cloud adjacency flags. Nominal and High denote confirmed thermal emissions.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
            <span>Filter Independence: <strong className="text-emerald-400">Fully Decoupled</strong></span>
            <span>VIIRS Flags: <strong className="text-amber-400">low / nominal / high</strong></span>
          </div>
        </div>
      </div>

      {/* Topographic Processing & Resolution Integrity */}
      <section className="mb-14 p-6 sm:p-8 rounded-2xl glass-surface border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Mountain className="w-5 h-5 text-emerald-400" />
          <h3 className="text-xl font-bold text-white">Copernicus GLO-30 DEM &amp; Spatial Multi-Scale Integrity</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-6 font-light">
          FIREINTEL maintains strict spatial provenance across three distinct operational resolutions, ensuring that coarse-scale reanalysis
          is never misrepresented as fine-scale topographic data:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-telemetry text-xs">
          <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Topographic Resolution</div>
            <div className="text-lg font-bold text-emerald-400">30 Meters (1.0″)</div>
            <div className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Copernicus GLO-30 DEM. Resolves steep Himalayan ravines, ridges, Horn slope angles up to 44.7°, and aspect orientations across EGM2008 geoid.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-indigo-500/20 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Master Grid Resolution</div>
            <div className="text-lg font-bold text-indigo-400">0.05° (~5.5 km)</div>
            <div className="text-[11px] text-slate-400 font-sans leading-relaxed">
              2,174 analytical cells strictly bounded by Uttarakhand borders. Used for aggregating geomorphometry and spatio-temporal fire density.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Climate Reanalysis Resolution</div>
            <div className="text-lg font-bold text-amber-400">0.1° (~9.0 km)</div>
            <div className="text-[11px] text-slate-400 font-sans leading-relaxed">
              ECMWF ERA5-Land. Downscaled thermodynamically via elevation lapse rates, distinctly separated from the 30m DEM elevation surface.
            </div>
          </div>
        </div>
      </section>

      {/* Reproducibility & Codebase Access */}
      <section className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 max-w-4xl">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Reproducibility &amp; Audit Trail Standard</span>
        </h3>
        <div className="space-y-3 text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
          <p>
            <strong className="text-slate-200">Orbital Visualization:</strong> Orbital tracks rendered on the planetary globe
            represent nominal Keplerian orbital geometries (inclination ~98.2°, altitude ~705–824 km, Sun-synchronous). They are designed
            for Earth-observation mission education and do not constitute real-time NORAD/Two-Line Element (TLE) ephemeris tracking.
            <span className="block text-amber-400 font-mono-telemetry text-xs mt-1.5">
              Notice: Illustrative orbital geometry — not live spacecraft tracking.
            </span>
          </p>
          <p>
            <strong className="text-slate-200">Reproducibility Guarantee:</strong> All 7,541 fire records are stored in boundary-validated CSV
            (<code className="text-slate-300">fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv</code>) with full audit columns:
            latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, instrument, confidence, version, bright_t31, frp, daynight, month.
          </p>
        </div>
      </section>
    </main>
  );
}
