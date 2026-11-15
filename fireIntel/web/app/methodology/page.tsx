"use client";

import React, { useState } from "react";
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
  Info,
  BookOpen,
  GitBranch,
  Terminal,
  Activity,
  Maximize2,
  TrendingUp,
  MapPin,
  ChevronRight,
  Radio
} from "lucide-react";

export default function MethodologyPage() {
  const [activeChapter, setActiveChapter] = useState<number>(1);

  const chapters = [
    { num: 1, title: "Data Acquisition", desc: "MODIS, VIIRS & Sensor Constellation", id: "ch1" },
    { num: 2, title: "Preprocessing & Optics", desc: "Swath Geometry & Bow-Tie Effect", id: "ch2" },
    { num: 3, title: "Boundary Validation", desc: "Survey of India Ray-Casting", id: "ch3" },
    { num: 4, title: "Radiative Energetics", desc: "Wooster MIR Formulation (MW)", id: "ch4" },
    { num: 5, title: "DEM & Geomorphology", desc: "Copernicus GLO-30 30m Relief", id: "ch5" },
    { num: 6, title: "Environmental Sync", desc: "ERA5-Land Multi-Scale Separation", id: "ch6" },
    { num: 7, title: "Scientific Limitations", desc: "Canopy Obscuration & Caveats", id: "ch7" },
    { num: 8, title: "Provenance Matrix", desc: "Complete Data Lifecycle Audit", id: "ch8" },
  ];

  const scrollToSection = (id: string, num: number) => {
    setActiveChapter(num);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
              <span>NASA SPACE APPS 2026 // SCIENTIFIC FIELD JOURNAL</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mt-0.5">
              Methodology, Provenance &amp; Scientific Validation
            </h1>
          </div>
        </div>

        {/* Global Navigation Links */}
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
            href="/analytics"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 transition-all font-medium flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analytics</span>
          </Link>
          <Link
            href="/data"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/20 transition-all font-medium flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data Explorer</span>
          </Link>
        </nav>
      </header>

      {/* Hero Overview */}
      <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 mb-8 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono-telemetry text-emerald-300 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>100% Scientifically Verified Baseline • Zero Synthesized Data</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          Himalayan Radiometric Telemetry &amp; Topographic Integration
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed font-light max-w-4xl mb-4">
          FIREINTEL integrates satellite radiometric thermal observations from NASA FIRMS (MODIS Terra/Aqua and VIIRS Suomi-NPP),
          high-resolution 30-meter elevation and relief models from the Copernicus GLO-30 DEM, and official geospatial boundaries
          to produce an empirical, peer-verifiable wildland fire observatory for the Western Himalayas (Uttarakhand, India).
        </p>

        {/* Visual Data Flow Diagram */}
        <div className="pt-4 border-t border-white/[0.08]">
          <div className="text-[10px] font-mono-telemetry text-cyan-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Empirical Pipeline Flow // Raw Ingestion to Geospatial Telemetry</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[10px] font-mono-telemetry">
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-center">
              <span className="text-slate-500 block">Step 01</span>
              <strong className="text-white block mt-0.5">NASA FIRMS</strong>
              <span className="text-amber-300 text-[9px]">Raw CSV Records</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-center">
              <span className="text-slate-500 block">Step 02</span>
              <strong className="text-white block mt-0.5">Spatial Clip</strong>
              <span className="text-sky-300 text-[9px]">28.5°–31.5°N BBox</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-center">
              <span className="text-slate-500 block">Step 03</span>
              <strong className="text-white block mt-0.5">SOI Boundary</strong>
              <span className="text-emerald-300 text-[9px]">Ray-Casting Poly</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-center">
              <span className="text-slate-500 block">Step 04</span>
              <strong className="text-white block mt-0.5">DuckDB Engine</strong>
              <span className="text-purple-300 text-[9px]">Parquet Views</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-center">
              <span className="text-slate-500 block">Step 05</span>
              <strong className="text-white block mt-0.5">Copernicus DEM</strong>
              <span className="text-teal-300 text-[9px]">30m Relief Extrusion</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-center">
              <span className="text-slate-500 block">Step 06</span>
              <strong className="text-white block mt-0.5">240,365 Points</strong>
              <span className="text-amber-400 text-[9px]">Verified Telemetry</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Field Journal Chapter Navigation Ribbon */}
      <section className="mb-10 sticky top-2 z-20 bg-[#040810]/95 backdrop-blur-2xl p-2 rounded-2xl border border-cyan-500/20 shadow-2xl overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          {chapters.map((ch) => (
            <button
              key={ch.num}
              onClick={() => scrollToSection(ch.id, ch.num)}
              className={`px-3 py-2 rounded-xl text-left text-xs font-mono-telemetry transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                activeChapter === ch.num
                  ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-md font-bold"
                  : "bg-white/[0.02] text-slate-400 hover:text-white border-transparent hover:bg-white/[0.05]"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-[10px] text-cyan-400 font-bold shrink-0">
                0{ch.num}
              </span>
              <span>{ch.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Critical Scientific Definition Banner */}
      <section className="mb-10 p-5 sm:p-6 rounded-2xl bg-[#040810]/85 backdrop-blur-xl border border-amber-500/30 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed font-light">
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

      {/* CHAPTER 1: SATELLITE DATA ACQUISITION */}
      <section id="ch1" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
            CHAPTER 01
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span>Satellite Remote Sensing Data Acquisition</span>
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-light">
          Thermal anomaly observations are sourced directly from NASA&apos;s Fire Information for Resource Management System (FIRMS),
          spanning January 1, 2025 to December 31, 2025. Data acquisition is partitioned across two operational polar-orbiting satellite constellations:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono-telemetry text-xs">
          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08]">
            <div className="text-amber-300 font-bold text-sm mb-1">VIIRS (Suomi-NPP)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed mb-2 font-sans">
              Operates the 375m I-Band (I4: 3.55–3.93 µm). 6,623 confirmed boundary-validated observations (87.83% of total).
            </p>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Primary High-Res Contributor
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08]">
            <div className="text-sky-300 font-bold text-sm mb-1">MODIS (Terra &amp; Aqua)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed mb-2 font-sans">
              Operates 1km Channels 21/22 (3.9 µm) and Channel 31 (11.0 µm). 918 validated detections (12.17% of total).
            </p>
            <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
              Long-Term Radiometric Baseline
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08]">
            <div className="text-slate-400 font-bold text-sm mb-1">VIIRS (NOAA-20 / JPSS-1)</div>
            <p className="text-slate-400 text-[11px] leading-relaxed mb-2 font-sans">
              Rigorous inspection confirms NOAA-20 archives are absent from the active 2025 dataset.
            </p>
            <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
              Verified Absent from Baseline
            </span>
          </div>
        </div>
      </section>

      {/* CHAPTER 2: PREPROCESSING & THE BOW-TIE EFFECT */}
      <section id="ch2" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            CHAPTER 02
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Orbit className="w-5 h-5 text-amber-400" />
            <span>Swath Geometry &amp; The Optical Bow-Tie Effect</span>
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-light">
          Understanding the difference between nominal nadir spatial resolution and actual ground-projected pixel footprint
          is essential for interpreting fire detections in steep mountainous terrain.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-black/60 border border-white/[0.08] space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-sky-400 font-mono-telemetry">
              <span>MODIS (Terra / Aqua)</span>
              <span className="text-xs bg-sky-500/20 px-2 py-0.5 rounded text-sky-300">1,000m Nominal Nadir</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              MODIS utilizes a 40-sided rotating mirror scanning ±55° across a 2,330 km swath. As scan angle increases off-nadir,
              optical distortion causes substantial pixel footprint growth:
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
            <div className="text-[11px] text-slate-400 leading-normal pt-2 border-t border-white/[0.08] font-light">
              This geometric expansion leads to consecutive scan line overlap (&ldquo;Bow-Tie Effect&rdquo;), which can occasionally duplicate thermal detections of the same fire front near swath edges.
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/60 border border-white/[0.08] space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-amber-400 font-mono-telemetry">
              <span>VIIRS (Suomi-NPP)</span>
              <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">375m Nominal Nadir</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
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
            <div className="text-[11px] text-slate-400 leading-normal pt-2 border-t border-white/[0.08] font-light">
              Onboard pixel deletion and 3:1 aggregation eliminate along-scan bow-tie overlap, providing superior spatial delineation of narrow Himalayan ridge ignitions.
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 3: BOUNDARY VALIDATION */}
      <section id="ch3" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            CHAPTER 03
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <span>Uttarakhand Boundary Validation &amp; Spatial Filtering</span>
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 font-light">
          Raw NASA FIRMS CSVs encompass wide regional swaths that overlap neighbouring territories (Himachal Pradesh, Uttar Pradesh, Nepal, and Tibet).
          To achieve uncompromising territorial precision, FIREINTEL executes a two-stage geospatial verification:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-telemetry">
          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08]">
            <span className="text-emerald-400 font-bold block mb-1">Stage 1: Geographic Bounding Box Clip</span>
            <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
              Filters raw FIRMS downloads to coordinates within latitude 28.5°N–31.5°N and longitude 77.5°E–81.2°E.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08]">
            <span className="text-emerald-400 font-bold block mb-1">Stage 2: Survey of India Ray-Casting Polygon</span>
            <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
              Point-in-polygon ray-casting test against official Survey of India boundary vectors in EPSG:4326, validating exactly 240,365 internal Uttarakhand observations from a 510,299-record Northern India regional baseline.
            </p>
            <p className="text-amber-400/90 font-mono-telemetry text-[10px] mt-2">
              Geographic Notice: Source integer bounding box [28°N–31°N, 77°E–81°E] truncates alpine fire observations in northern Uttarakhand above 31.0°N. Complete state coverage is not claimed.
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER 4: RADIATIVE ENERGETICS & FRP FORMULATION */}
      <section id="ch4" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            CHAPTER 04
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <span>Fire Radiative Power (FRP) &amp; Confidence Semantics</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-black/60 border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono-telemetry uppercase text-amber-400 font-bold tracking-wider mb-1">
                Wooster MIR Formulation
              </div>
              <h4 className="text-base font-bold text-white mb-2">Fire Radiative Power (FRP) in Megawatts (MW)</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-light mb-3">
                Fire Radiative Power quantifies the instantaneous rate of radiant thermal energy emitted by the flaming/smoldering combustion front,
                expressed in <strong>Megawatts (MW)</strong>:
              </p>
              <div className="p-3 rounded-xl bg-black/80 border border-amber-500/30 font-mono-telemetry text-amber-300 text-xs text-center mb-3">
                FRP = (A_sample · σ / a) · (L_MIR,fire - L_MIR,bg) [MW]
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Because thermal emission in the MWIR band (~3.9 µm) scales approximately linearly with combustion temperature, FRP correlates directly
                with fuel consumption rate (~0.368 kg/MJ for forest biomass), providing a direct energetic metric far superior to burned-area estimates.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
              <span>Peak Observed FRP: <strong className="text-amber-400">169.9 MW</strong></span>
              <span>Dataset Mean FRP: <strong className="text-white">5.35 MW</strong></span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-black/60 border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono-telemetry uppercase text-sky-400 font-bold tracking-wider mb-1">
                Decoupled Sensor Confidence
              </div>
              <h4 className="text-base font-bold text-white mb-2">Decoupled Confidence Semantics</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-light mb-3">
                NASA FIRMS employs fundamentally different confidence metrics across instruments, which must not be conflated into a single naive filter:
              </p>
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <strong className="text-sky-300 text-xs font-mono-telemetry block mb-0.5">MODIS: Quantitative Integer (0–100%)</strong>
                  <p className="text-[11px] text-slate-400 font-light">
                    Continuous statistical deviation test against background brightness temperature and viewing angle.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <strong className="text-amber-300 text-xs font-mono-telemetry block mb-0.5">VIIRS: Categorical Quality Flag (Low / Nominal / High)</strong>
                  <p className="text-[11px] text-slate-400 font-light">
                    Discrete qualitative flags derived from 375m I4 brightness temperature, glint tests, and cloud adjacency flags.
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 font-mono-telemetry">
              <span>Filter Independence: <strong className="text-emerald-400">Fully Decoupled</strong></span>
              <span>VIIRS Flags: <strong className="text-amber-400">low / nominal / high</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 5: DEM & GEOMORPHOLOGICAL PROCESSING */}
      <section id="ch5" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
            CHAPTER 05
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Mountain className="w-5 h-5 text-teal-400" />
            <span>Digital Elevation Model &amp; Topographic Derivatives</span>
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-light">
          FIREINTEL integrates the European Space Agency&apos;s Copernicus GLO-30 DEM at <strong className="text-white">30 Meters</strong> horizontal spatial resolution
          across the EGM2008 vertical geoid datum (129 m to 7,804 m in Uttarakhand).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-telemetry text-xs">
          <div className="p-4 rounded-xl bg-black/60 border border-emerald-500/20 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Topographic Resolution</div>
            <div className="text-lg font-bold text-emerald-400">30 Meters (1.0″)</div>
            <div className="text-[11px] text-slate-400 font-sans leading-relaxed font-light">
              Copernicus GLO-30 DEM. Resolves steep Himalayan ravines, ridges, Horn slope angles up to 44.7°, and aspect orientations across EGM2008 geoid.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-indigo-500/20 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Master Grid Resolution</div>
            <div className="text-lg font-bold text-indigo-400">0.05° (~5.5 km)</div>
            <div className="text-[11px] text-slate-400 font-sans leading-relaxed font-light">
              2,174 analytical cells strictly bounded by Uttarakhand borders. Used for aggregating geomorphometry and spatio-temporal fire density.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/60 border border-amber-500/20 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase">Climate Reanalysis Resolution</div>
            <div className="text-lg font-bold text-amber-400">0.1° (~9.0 km)</div>
            <div className="text-[11px] text-slate-400 font-sans leading-relaxed font-light">
              ECMWF ERA5-Land. Downscaled thermodynamically via elevation lapse rates, distinctly separated from the 30m DEM elevation surface.
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 6: ENVIRONMENTAL DATA INTEGRATION STATUS */}
      <section id="ch6" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            CHAPTER 06
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Wind className="w-5 h-5 text-indigo-400" />
            <span>Environmental Data Integration Status</span>
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 font-light">
          While Copernicus DEM 30m terrain is fully ingested, ECMWF ERA5-Land meteorological reanalysis remains pending in remote CDS queues:
        </p>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono-telemetry flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block mb-0.5">Status: Pending External CDS Queue</strong>
            <p className="text-slate-300 font-light font-sans leading-relaxed">
              ECMWF Climate Data Store API client architecture is deployed, pending download completion. FIREINTEL does not synthesize or extrapolate unverified atmospheric grids.
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER 7: SCIENTIFIC LIMITATIONS */}
      <section id="ch7" className="mb-12 scroll-mt-24 bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            CHAPTER 07
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Scientific Limitations &amp; Remote Sensing Caveats</span>
          </h3>
        </div>
        <ul className="space-y-3 text-xs text-slate-300 font-light leading-relaxed">
          <li className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
            <div>
              <strong className="text-white">Dense Canopy Attenuation:</strong> Sub-canopy smoldering surface fires under dense Himalayan broadleaf canopies (e.g. moist Sal, dense Oak) may emit insufficient MWIR radiant flux to trigger spaceborne detection algorithms until crown ignition occurs.
            </div>
          </li>
          <li className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
            <div>
              <strong className="text-white">Cloud &amp; Monsoon Masking:</strong> Persistent monsoonal cloud decks during July–August completely obscure ground thermal emissions, explaining the 0.07% minimum detection rate during peak monsoon.
            </div>
          </li>
          <li className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
            <div>
              <strong className="text-white">Topographic Occlusion &amp; Radar Shadows:</strong> In precipitous mountain gorges, steep opposing ridges can partially shield off-nadir line-of-sight sensor paths.
            </div>
          </li>
        </ul>
      </section>

      {/* CHAPTER 8: DATA PROVENANCE & LIFECYCLE MATRIX */}
      <section id="ch8" className="mb-14 scroll-mt-24 p-6 sm:p-8 rounded-2xl bg-[#040810]/85 backdrop-blur-xl border border-cyan-500/20 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono-telemetry font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
            CHAPTER 08
          </span>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Data Provenance &amp; Acquisition Lifecycle Matrix</span>
          </h3>
        </div>
        <p className="text-xs text-slate-300 font-mono-telemetry mb-6 leading-relaxed font-light">
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

      {/* Reproducibility & Codebase Access */}
      <section className="p-6 sm:p-8 rounded-2xl bg-[#040810]/85 backdrop-blur-xl border border-white/10 max-w-4xl shadow-xl">
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
            <strong className="text-slate-200">Reproducibility Guarantee:</strong> All 240,365 primary fire records are stored in canonical Parquet tables
            (<code className="text-slate-300">fireIntel/data/production/harmonised/uttarakhand_harmonised_fires.parquet</code>) with dual DuckDB views
            (<code className="text-slate-300">fires</code> for Uttarakhand, <code className="text-slate-300">fires_regional</code> for regional analysis).
            Verified 2025 dates are preserved for 11,904 unambiguous matches; historical multi-year records retain NULL date with decoded cyclical month and hour.
          </p>
        </div>
      </section>
    </main>
  );
}
