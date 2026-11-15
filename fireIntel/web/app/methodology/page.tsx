"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import NavigationHeader from "@/components/NavigationHeader";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
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
  Radio,
  SlidersHorizontal,
  Sparkles,
  Zap,
  Crosshair,
  Check,
} from "lucide-react";

export default function MethodologyPage() {
  const [activeChapter, setActiveChapter] = useState<number>(1);
  const [activatingChapter, setActivatingChapter] = useState<number | null>(null);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Live Terminal Session Timer & Clock
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [utcTime, setUtcTime] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Navigation tab button refs & container ref for isolated horizontal scroll
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateUtc = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + " UTC");
    };
    updateUtc();
    const interval = setInterval(updateUtc, 1000);
    return () => clearInterval(interval);
  }, []);

  // Desktop-only subtle parallax listener
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 20;
      const normY = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x: normX, y: normY });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Synchronize active tab on manual vertical scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      // If user has scrolled within 150px of page bottom, highlight Chapter 8
      if (window.scrollY + windowHeight >= documentHeight - 150) {
        setActiveChapter(8);
        return;
      }

      const chapterIds = ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8"];
      const scrollPos = window.scrollY + 240;
      for (let i = chapterIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(chapterIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          setActiveChapter(i + 1);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Automatically scroll active navigation tab horizontally within its container
  // Isolated to tabsContainerRef.current to prevent window-level scroll yank
  useEffect(() => {
    const activeBtn = tabButtonRefs.current[activeChapter - 1];
    const container = tabsContainerRef.current;
    if (activeBtn && container) {
      const btnLeft = activeBtn.offsetLeft;
      const btnWidth = activeBtn.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetScroll = btnLeft - (containerWidth / 2) + (btnWidth / 2);
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
    }
  }, [activeChapter]);

  // Load Mission Control telemetry for telemetry drawer
  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/data/mission_control_summary.json");
        const data = await res.json();
        setTelemetry(data);
      } catch (err) {
        console.error("Telemetry load error:", err);
      }
    }
    loadTelemetry();
  }, []);

  const formatSessionTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, "0");
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

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
    setActivatingChapter(num);
    setTimeout(() => setActivatingChapter(null), 1400);

    isProgrammaticScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 1000);

    const el = document.getElementById(id);
    if (el) {
      const yOffset = -150;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#080A0D] text-[#F2F0E9] selection:bg-[#C6A66B]/30 selection:text-[#F2F0E9] overflow-x-hidden overflow-y-auto">
      {/* =========================================================================
          PAGE-SPECIFIC ANIMATIONS & NASA MISSION CONTROL STYLES
          ========================================================================= */}
      <style jsx global>{`
        @keyframes cosmicStarDrift {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes cosmicNebulaBreathe {
          0%, 100% { opacity: 0.28; transform: scale(1); }
          50% { opacity: 0.38; transform: scale(1.03); }
        }
        @keyframes signalScanningBeam {
          0% { transform: translateX(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes chapterModuleActivation {
          0% { box-shadow: 0 0 0 rgba(85, 199, 232, 0); border-color: #222B38; }
          30% { box-shadow: 0 0 35px rgba(85, 199, 232, 0.35), inset 0 0 15px rgba(11, 61, 145, 0.25); border-color: #55C7E8; }
          100% { box-shadow: 0 0 0 rgba(85, 199, 232, 0); border-color: #222B38; }
        }
        @keyframes radarSweepPulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 8px #55C7E8); }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes opticalScanGrid {
          0% { background-position: 0 0; }
          100% { background-position: 30px 30px; }
        }
        .anim-star-drift {
          animation: cosmicStarDrift 45s ease-in-out infinite;
        }
        .anim-nebula-pulse {
          animation: cosmicNebulaBreathe 18s ease-in-out infinite;
        }
        .anim-scan-beam {
          animation: signalScanningBeam 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .anim-module-active {
          animation: chapterModuleActivation 1.4s ease-out;
        }
        .anim-radar-pulse {
          animation: radarSweepPulse 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-star-drift, .anim-nebula-pulse, .anim-scan-beam, .anim-module-active, .anim-radar-pulse {
            animation: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          EXACT CINEMATIC SPACE BACKGROUND — OBSIDIAN COSMIC
          Exact replica of the Data Explorer background: Deep black foundation (#080A0D),
          subtle technical square grid (60px), scattered ambient particles,
          midnight-blue/cosmic-blue atmosphere, and delicate champagne-gold horizon rim
          ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Layer 1: Obsidian Black Base */}
        <div className="absolute inset-0 bg-[#080A0D]" />

        {/* Layer 2: Midnight Navy & Cosmic Blue Ambient Nebulae with Parallax */}
        <div
          className="absolute inset-0 anim-nebula-pulse"
          style={{
            transform: `translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px, 0)`,
            transition: "transform 0.4s ease-out",
            background:
              "radial-gradient(ellipse 75% 40% at 50% 0%, rgba(25, 54, 83, 0.32) 0%, rgba(16, 27, 43, 0.45) 45%, transparent 75%), radial-gradient(circle at 15% 35%, rgba(198, 166, 107, 0.035) 0%, transparent 45%), radial-gradient(circle at 85% 65%, rgba(71, 125, 165, 0.04) 0%, transparent 50%)",
          }}
        />

        {/* Layer 3: Faint Planetary Horizon Curve with Champagne-Gold Rim */}
        <div
          className="absolute -top-[540px] left-1/2 -translate-x-1/2 w-[1680px] h-[660px] rounded-[100%] opacity-35"
          style={{
            transform: `translate3d(-50%, ${mousePos.y * 0.2}px, 0)`,
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(198, 166, 107, 0.16) 0%, rgba(25, 54, 83, 0.22) 30%, rgba(16, 27, 43, 0.1) 60%, transparent 80%)",
            borderBottom: "1px solid rgba(198, 166, 107, 0.28)",
            boxShadow: "0 24px 90px rgba(198, 166, 107, 0.07), inset 0 -2px 10px rgba(145, 187, 213, 0.1)",
          }}
        />

        {/* Layer 4: Distant Drifting Starfield */}
        <svg
          className="absolute inset-0 w-full h-full opacity-40 anim-star-drift"
          aria-hidden="true"
          style={{
            transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0)`,
            transition: "transform 0.6s ease-out",
          }}
        >
          <circle cx="11%" cy="14%" r="0.8" fill="#F2F0E9" opacity="0.65" />
          <circle cx="24%" cy="8%" r="1.1" fill="#C6A66B" opacity="0.7" />
          <circle cx="39%" cy="22%" r="0.7" fill="#91BBD5" opacity="0.55" />
          <circle cx="58%" cy="12%" r="0.9" fill="#F2F0E9" opacity="0.6" />
          <circle cx="77%" cy="26%" r="1.2" fill="#C6A66B" opacity="0.75" />
          <circle cx="92%" cy="9%" r="0.8" fill="#91BBD5" opacity="0.5" />
          <circle cx="7%" cy="62%" r="0.9" fill="#F2F0E9" opacity="0.45" />
          <circle cx="21%" cy="84%" r="0.7" fill="#C6A66B" opacity="0.5" />
          <circle cx="74%" cy="70%" r="0.85" fill="#91BBD5" opacity="0.45" />
          <circle cx="89%" cy="86%" r="1.1" fill="#F2F0E9" opacity="0.6" />
          <circle cx="51%" cy="78%" r="0.75" fill="#C6A66B" opacity="0.4" />
          <circle cx="33%" cy="48%" r="0.8" fill="#F2F0E9" opacity="0.35" />
          <circle cx="66%" cy="42%" r="0.95" fill="#91BBD5" opacity="0.45" />
          <circle cx="96%" cy="52%" r="0.7" fill="#C6A66B" opacity="0.5" />
          <circle cx="48%" cy="32%" r="0.6" fill="#F2F0E9" opacity="0.3" />
          <circle cx="84%" cy="46%" r="0.8" fill="#C6A66B" opacity="0.4" />
        </svg>

        {/* Layer 5: Technical Sub-Grid Hairlines (Stationary 60px Squares) & Edge Vignette */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#91BBD5 1px, transparent 1px), linear-gradient(90deg, #91BBD5 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 60%, rgba(8, 10, 13, 0.85) 100%)",
          }}
        />
      </div>

      {/* 1. Global Navigation Header */}
      <NavigationHeader
        activeTab="methodology"
        onOpenTelemetryDrawer={() => setIsTelemetryDrawerOpen(true)}
      />

      <div className="relative z-10 pt-24 sm:pt-28 pb-24 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto space-y-10">
        {/* =========================================================================
            2. TOP HEADER & RESEARCH JOURNAL INTRODUCTION
            ========================================================================= */}
        <section aria-label="Methodology Introduction" className="space-y-6">
          {/* Top Aerospace Metadata Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] border-b border-[#222B38] pb-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 rounded bg-[#111418] hover:bg-[#101B2B] border border-[#222B38] hover:border-[#C6A66B] text-[#91BBD5] hover:text-[#F2F0E9] transition-all flex items-center gap-1.5 text-[11px]"
                title="Return to Planetary Orbit"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span className="font-mono-telemetry">Orbit</span>
              </Link>
              <span className="text-[#222B38]">|</span>
              <span className="flex items-center gap-2 text-[#55C7E8] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#55C7E8] animate-pulse" />
                <span>NASA SPACE APPS 2026 // SCIENTIFIC FIELD JOURNAL</span>
              </span>
              <span className="text-[#222B38] hidden sm:inline">|</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[#9299A1]">
                <Clock className="w-3 h-3 text-[#C6A66B]" />
                <span>SESSION {formatSessionTime(sessionSeconds)}</span>
              </span>
              <span className="text-[#222B38] hidden md:inline">|</span>
              <span className="hidden md:inline text-[#C6A66B] font-mono-telemetry">{utcTime}</span>
            </div>

            {/* Scientific Validation Badges */}
            <div className="flex items-center gap-2">
              <div className="bg-[#111418] border border-[#222B38] rounded px-2.5 py-1 text-[11px] font-mono-telemetry text-[#65B891] flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#65B891]" />
                <span>100% Scientifically Verified Baseline • Zero Synthesized Data</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111418] border border-[#222B38] text-[11px] font-mono-telemetry text-[#C6A66B]">
                <MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span>Survey of India Validated</span>
              </div>
            </div>
          </div>

          {/* Title & Editorial Deck */}
          <div className="space-y-3 max-w-4xl pt-1">
            <div className="flex items-center gap-2 text-xs font-mono-telemetry uppercase text-[#C6A66B] tracking-widest font-semibold">
              <BookOpen className="w-4 h-4 text-[#C6A66B]" />
              <span>SATELLITE OBSERVATION AND SCIENTIFIC DATA FRAMEWORK</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F2F0E9] leading-tight">
              Himalayan Radiometric Telemetry &amp; Scientific Validation
            </h1>
            <p className="text-sm sm:text-base text-[#9299A1] leading-relaxed font-normal">
              FIREINTEL integrates satellite radiometric thermal observations from NASA FIRMS (MODIS Terra/Aqua and VIIRS Suomi-NPP),
              high-resolution 30-meter elevation and relief models from the Copernicus GLO-30 DEM, and official geospatial boundaries
              to produce an empirical, peer-verifiable wildland fire observatory for the Western Himalayas (Uttarakhand, India).
            </p>
          </div>

          {/* Executive Scientific Telemetry Readout Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-lg bg-[#111418] border border-[#222B38] shadow-lg font-mono-telemetry">
            <div className="space-y-1">
              <span className="text-[10px] text-[#9299A1] uppercase tracking-wider block">Empirical Baseline</span>
              <strong className="text-xl sm:text-2xl font-bold text-[#F2F0E9] block">7,541 Observations</strong>
              <span className="text-[11px] text-[#C6A66B]">100% Boundary Validated</span>
            </div>
            <div className="space-y-1 border-l border-[#222B38] pl-4">
              <span className="text-[10px] text-[#9299A1] uppercase tracking-wider block">Constellation Optics</span>
              <strong className="text-xl sm:text-2xl font-bold text-[#55C7E8] block">375m &amp; 1,000m</strong>
              <span className="text-[11px] text-[#2477B8]">VIIRS I-Band + MODIS</span>
            </div>
            <div className="space-y-1 border-l border-[#222B38] pl-4">
              <span className="text-[10px] text-[#9299A1] uppercase tracking-wider block">Topographic Relief</span>
              <strong className="text-xl sm:text-2xl font-bold text-[#C6A66B] block">30 Meters</strong>
              <span className="text-[11px] text-[#9299A1]">Copernicus GLO-30 DEM</span>
            </div>
            <div className="space-y-1 border-l border-[#222B38] pl-4">
              <span className="text-[10px] text-[#9299A1] uppercase tracking-wider block">Analytical Grid</span>
              <strong className="text-xl sm:text-2xl font-bold text-[#F2B544] block">2,174 Cells</strong>
              <span className="text-[11px] text-[#9299A1]">0.05° (~5.5 km) Master Mesh</span>
            </div>
          </div>

          {/* =========================================================================
              3. EMPIRICAL PIPELINE FLOW — SCIENTIFIC STORYTELLING WORKFLOW
              ========================================================================= */}
          <div className="p-6 rounded-lg bg-[#111418] border border-[#222B38] shadow-lg space-y-4">
            <div className="text-[11px] font-mono-telemetry text-[#C6A66B] uppercase tracking-widest font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-[#C6A66B]" />
                <span>Empirical Pipeline Flow // Raw Ingestion to Geospatial Telemetry</span>
              </span>
              <span className="text-[10px] text-[#9299A1] hidden sm:inline">DuckDB + EPSG:4326 + WGS84 Datum</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono-telemetry">
              {/* Step 1 */}
              <div className="p-3.5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/70 hover:bg-[#101B2B]/40 transition-all duration-250 space-y-1.5">
                <span className="text-[10px] text-[#9299A1] block font-semibold">STAGE 01</span>
                <strong className="text-[#F2F0E9] block text-sm">NASA FIRMS</strong>
                <span className="text-[10px] text-[#C6A66B] block">Raw CSV Records</span>
                <p className="text-[11px] text-[#9299A1] font-sans leading-tight">Polar-orbiting sensor swath streams</p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/70 hover:bg-[#101B2B]/40 transition-all duration-250 space-y-1.5">
                <span className="text-[10px] text-[#9299A1] block font-semibold">STAGE 02</span>
                <strong className="text-[#F2F0E9] block text-sm">Spatial Clip</strong>
                <span className="text-[10px] text-[#55C7E8] block">28.5°–31.5°N BBox</span>
                <p className="text-[11px] text-[#9299A1] font-sans leading-tight">Coarse geographic window filtration</p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/70 hover:bg-[#101B2B]/40 transition-all duration-250 space-y-1.5">
                <span className="text-[10px] text-[#9299A1] block font-semibold">STAGE 03</span>
                <strong className="text-[#F2F0E9] block text-sm">SOI Boundary</strong>
                <span className="text-[10px] text-[#65B891] block">Ray-Casting Poly</span>
                <p className="text-[11px] text-[#9299A1] font-sans leading-tight">Survey of India sovereign boundary</p>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/70 hover:bg-[#101B2B]/40 transition-all duration-250 space-y-1.5">
                <span className="text-[10px] text-[#9299A1] block font-semibold">STAGE 04</span>
                <strong className="text-[#F2F0E9] block text-sm">DuckDB Engine</strong>
                <span className="text-[10px] text-[#2477B8] block">Parquet Views</span>
                <p className="text-[11px] text-[#9299A1] font-sans leading-tight">Zero-copy analytical query caching</p>
              </div>

              {/* Step 5 */}
              <div className="p-3.5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/70 hover:bg-[#101B2B]/40 transition-all duration-250 space-y-1.5">
                <span className="text-[10px] text-[#9299A1] block font-semibold">STAGE 05</span>
                <strong className="text-[#F2F0E9] block text-sm">Copernicus DEM</strong>
                <span className="text-[10px] text-[#91BBD5] block">30m Relief Extrusion</span>
                <p className="text-[11px] text-[#9299A1] font-sans leading-tight">129m–7,804m elevation terrain mesh</p>
              </div>

              {/* Step 6 */}
              <div className="p-3.5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#E03C31]/70 hover:bg-[#101B2B]/40 transition-all duration-250 space-y-1.5">
                <span className="text-[10px] text-[#9299A1] block font-semibold">STAGE 06</span>
                <strong className="text-[#E03C31] block text-sm">7,541 WebGL</strong>
                <span className="text-[10px] text-[#C6A66B] block">Verified Telemetry</span>
                <p className="text-[11px] text-[#9299A1] font-sans leading-tight">Peer-verifiable empirical observatory</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. REDESIGNED EIGHT NAVIGATION TABS — NASA MIDNIGHT MISSION CONTROL
            Active NASA Mission Blue (#0B3D91) with moving Champagne-Gold progress bar
            ========================================================================= */}
        <section aria-label="Chapter Directory" className="sticky top-20 z-20 bg-[#111418]/95 backdrop-blur-2xl p-2.5 rounded-lg border border-[#222B38] shadow-2xl overflow-hidden">
          {/* Navigation Progress Bar tracking currently selected chapter */}
          <div className="w-full h-[2px] bg-[#222B38] mb-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2477B8] via-[#55C7E8] to-[#C6A66B] transition-all duration-350 ease-out"
              style={{ width: `${(activeChapter / 8) * 100}%` }}
            />
          </div>

          <div ref={tabsContainerRef} className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {chapters.map((ch, idx) => {
              const isActive = activeChapter === ch.num;
              return (
                <button
                  key={ch.num}
                  ref={(el) => { tabButtonRefs.current[idx] = el; }}
                  onClick={() => scrollToSection(ch.id, ch.num)}
                  className={`group relative px-3.5 py-2 rounded text-left text-xs font-mono-telemetry transition-all duration-250 cursor-pointer whitespace-nowrap flex items-center gap-2.5 border ${
                    isActive
                      ? "bg-[#0B3D91] text-[#F2F0E9] border-[#55C7E8] shadow-[0_0_16px_rgba(11,61,145,0.7)] font-bold scale-[1.02]"
                      : "bg-[#080A0D] text-[#9299A1] hover:text-[#F2F0E9] border-[#222B38] hover:border-[#2477B8] hover:bg-[#101B2B]"
                  }`}
                >
                  {/* Number Badge with gold / cyan illumination */}
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors duration-200 ${
                      isActive
                        ? "bg-[#080A0D] text-[#C6A66B] border border-[#C6A66B]"
                        : "bg-[#111418] text-[#9299A1] border border-[#222B38] group-hover:text-[#C6A66B] group-hover:border-[#C6A66B]/50"
                    }`}
                  >
                    0{ch.num}
                  </span>
                  <span>{ch.title}</span>

                  {/* Active Champagne-Gold dot indicator */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B] animate-pulse shadow-[0_0_6px_#C6A66B]" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            5. CRITICAL REMOTE SENSING SEMANTICS GUARDRAIL (OBSERVATIONAL UNIT)
            ========================================================================= */}
        <section className="p-6 rounded-lg bg-[#111418] border border-[#222B38] border-l-4 border-l-[#C6A66B] shadow-lg">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-[#C6A66B] shrink-0 mt-0.5" />
            <div className="space-y-2 text-xs sm:text-[13px] text-[#9299A1] leading-relaxed font-light">
              <div className="font-bold text-[#F2F0E9] text-sm sm:text-base font-mono-telemetry">
                Observational Unit Semantics: Radiometric Pixel Detections ≠ Confirmed Wildfire Incidents
              </div>
              <p>
                In satellite remote sensing, each recorded data point represents a <strong className="text-[#F2F0E9] font-medium">radiometric pixel hotspot detection</strong> identified
                by automated thermal anomaly algorithms (MOD14/MYD14 or VNP14IMG). A single large, actively spreading wildfire incident can trigger
                multiple contiguous pixel detections across a single overpass and additional detections over consecutive satellite overpasses.
                Conversely, small sub-canopy smoldering fires beneath dense sal or oak canopies may remain radiometrically obscured until crown ignition occurs.
                All statistics in FIREINTEL explicitly reflect validated satellite observations, avoiding artificial incident aggregation assumptions.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 01: SATELLITE DATA ACQUISITION
            Visual Personality: Satellite Signal Reception Module
            ========================================================================= */}
        <section
          id="ch1"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 1 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 1 ? "anim-module-active" : ""}`}
        >
          {/* Signal Scanline effect on chapter activation */}
          {activatingChapter === 1 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] bg-[#0B3D91]/60 px-2.5 py-0.5 rounded border border-[#55C7E8]/40">
                MODULE 01
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-[#55C7E8] anim-radar-pulse" />
                <span>Satellite Remote Sensing Data Acquisition</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#55C7E8] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55C7E8] animate-pulse" />
              <span>POLAR ORBIT SIGNAL RECEPTION</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#9299A1] leading-relaxed font-normal">
            Thermal anomaly observations are sourced directly from NASA&apos;s Fire Information for Resource Management System (FIRMS),
            spanning January 1, 2025 to December 31, 2025. Data acquisition is partitioned across two operational polar-orbiting satellite constellations:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono-telemetry text-xs">
            {/* VIIRS Suomi-NPP */}
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#55C7E8]/70 hover:bg-[#101B2B]/60 transition-all duration-250 space-y-2.5 group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#C6A66B] group-hover:text-[#F2F0E9] transition-colors">VIIRS (Suomi-NPP)</span>
                <span className="text-[10px] text-[#55C7E8] bg-[#0B3D91]/50 px-2 py-0.5 rounded border border-[#55C7E8]/30">375m I-Band</span>
              </div>
              <p className="text-[#9299A1] text-xs leading-relaxed font-sans">
                Operates the 375m I-Band (I4: 3.55–3.93 µm). 6,623 confirmed boundary-validated observations (87.83% of total).
              </p>
              <div className="pt-2 border-t border-[#222B38] flex items-center justify-between text-[11px]">
                <span className="text-[#91BBD5]">Primary High-Res Contributor</span>
                <span className="text-[#F2F0E9] font-bold">6,623 Obs</span>
              </div>
            </div>

            {/* MODIS Terra & Aqua */}
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/70 hover:bg-[#101B2B]/60 transition-all duration-250 space-y-2.5 group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#91BBD5] group-hover:text-[#F2F0E9] transition-colors">MODIS (Terra &amp; Aqua)</span>
                <span className="text-[10px] text-[#91BBD5] bg-[#101B2B] px-2 py-0.5 rounded border border-[#222B38]">1,000m Nadir</span>
              </div>
              <p className="text-[#9299A1] text-xs leading-relaxed font-sans">
                Operates 1km Channels 21/22 (3.9 µm) and Channel 31 (11.0 µm). 918 validated detections (12.17% of total).
              </p>
              <div className="pt-2 border-t border-[#222B38] flex items-center justify-between text-[11px]">
                <span className="text-[#C6A66B]">Long-Term Radiometric Baseline</span>
                <span className="text-[#F2F0E9] font-bold">918 Obs</span>
              </div>
            </div>

            {/* VIIRS NOAA-20 Exclusion Verification */}
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#9299A1]">VIIRS (NOAA-20 / JPSS-1)</span>
                <span className="text-[10px] text-[#9299A1] bg-[#111418] px-2 py-0.5 rounded border border-[#222B38]">Excluded</span>
              </div>
              <p className="text-[#9299A1] text-xs leading-relaxed font-sans">
                Rigorous inspection confirms NOAA-20 archives are absent from the active 2025 dataset.
              </p>
              <div className="pt-2 border-t border-[#222B38] flex items-center justify-between text-[11px]">
                <span className="text-[#9299A1]">Verified Absent from Baseline</span>
                <span className="text-[#9299A1] font-bold">0 Obs (100% Suomi-NPP)</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 02: PREPROCESSING & THE BOW-TIE EFFECT
            Visual Personality: Optical Analysis Laboratory
            ========================================================================= */}
        <section
          id="ch2"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 2 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 2 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 2 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] bg-[#0B3D91]/60 px-2.5 py-0.5 rounded border border-[#55C7E8]/40">
                MODULE 02
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <Crosshair className="w-5 h-5 text-[#55C7E8]" />
                <span>Swath Geometry &amp; The Optical Bow-Tie Effect</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#91BBD5] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <span>SCAN DISTORTION RECONCILIATION</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#9299A1] leading-relaxed font-normal">
            Understanding the difference between nominal nadir spatial resolution and actual ground-projected pixel footprint
            is essential for interpreting fire detections in steep mountainous terrain.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MODIS Bow-Tie */}
            <div className="p-6 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/60 transition-colors space-y-3.5">
              <div className="flex justify-between items-center text-sm font-bold text-[#91BBD5] font-mono-telemetry">
                <span>MODIS (Terra / Aqua)</span>
                <span className="text-xs bg-[#101B2B] border border-[#222B38] px-2.5 py-0.5 rounded text-[#91BBD5]">1,000m Nominal Nadir</span>
              </div>
              <p className="text-xs text-[#9299A1] leading-relaxed font-normal">
                MODIS utilizes a 40-sided rotating mirror scanning ±55° across a 2,330 km swath. As scan angle increases off-nadir,
                optical distortion causes substantial pixel footprint growth:
              </p>
              <ul className="text-xs font-mono-telemetry space-y-2 text-[#9299A1]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2477B8]" />
                  <span>Nadir resolution: <strong className="text-[#F2F0E9]">1.0 km × 1.0 km</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2477B8]" />
                  <span>Edge of scan footprint: <strong className="text-[#F2F0E9]">~2.0 km (track) × 4.8 km (scan)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2477B8]" />
                  <span>Area expansion: <strong className="text-[#F2B544]">~9.6× larger</strong> at scan edge</span>
                </li>
              </ul>
              <div className="text-[11px] text-[#9299A1] leading-normal pt-3 border-t border-[#222B38] font-normal">
                This geometric expansion leads to consecutive scan line overlap (&ldquo;Bow-Tie Effect&rdquo;), which can occasionally duplicate thermal detections of the same fire front near swath edges.
              </div>
            </div>

            {/* VIIRS Constrained Bow-Tie */}
            <div className="p-6 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#55C7E8]/60 transition-colors space-y-3.5">
              <div className="flex justify-between items-center text-sm font-bold text-[#C6A66B] font-mono-telemetry">
                <span>VIIRS (Suomi-NPP)</span>
                <span className="text-xs bg-[#0B3D91]/40 border border-[#55C7E8]/30 px-2.5 py-0.5 rounded text-[#55C7E8]">375m Nominal Nadir</span>
              </div>
              <p className="text-xs text-[#9299A1] leading-relaxed font-normal">
                VIIRS incorporates specialized onboard sample aggregation (3:1 aggregation at nadir transitioning to 2:1 and 1:1 near scan edge)
                over a 3,060 km swath:
              </p>
              <ul className="text-xs font-mono-telemetry space-y-2 text-[#9299A1]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B]" />
                  <span>Nadir resolution: <strong className="text-[#F2F0E9]">375 m × 375 m</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B]" />
                  <span>Edge of scan footprint: <strong className="text-[#F2F0E9]">~800 m × 800 m</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B]" />
                  <span>Area expansion: Constrained to <strong className="text-[#C6A66B]">~4.5×</strong> (vs ~10× for MODIS)</span>
                </li>
              </ul>
              <div className="text-[11px] text-[#9299A1] leading-normal pt-3 border-t border-[#222B38] font-normal">
                Onboard pixel deletion and 3:1 aggregation eliminate along-scan bow-tie overlap, providing superior spatial delineation of narrow Himalayan ridge ignitions.
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 03: BOUNDARY VALIDATION
            Visual Personality: Geospatial Verification System
            ========================================================================= */}
        <section
          id="ch3"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 3 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 3 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 3 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] bg-[#0B3D91]/60 px-2.5 py-0.5 rounded border border-[#55C7E8]/40">
                MODULE 03
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#65B891]" />
                <span>Uttarakhand Boundary Validation &amp; Spatial Filtering</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#65B891] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <Check className="w-3 h-3 text-[#65B891]" />
              <span>53,483 KM² TERRITORIAL AUDIT</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#9299A1] leading-relaxed font-normal">
            Raw NASA FIRMS CSVs encompass wide regional swaths that overlap neighbouring territories (Himachal Pradesh, Uttar Pradesh, Nepal, and Tibet).
            To achieve uncompromising territorial precision, FIREINTEL executes a two-stage geospatial verification:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono-telemetry">
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#2477B8]/60 transition-colors space-y-2">
              <span className="text-[#55C7E8] font-bold block text-sm">Stage 1: Geographic Bounding Box Clip</span>
              <p className="text-[#9299A1] font-sans leading-relaxed text-xs">
                Filters raw FIRMS downloads to coordinates within latitude 28.5°N–31.5°N and longitude 77.5°E–81.2°E.
              </p>
              <div className="text-[11px] text-[#2477B8]">Coarse spatial reduction step</div>
            </div>
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#65B891]/60 transition-colors space-y-2">
              <span className="text-[#65B891] font-bold block text-sm">Stage 2: Survey of India Ray-Casting Polygon</span>
              <p className="text-[#9299A1] font-sans leading-relaxed text-xs">
                Point-in-polygon ray-casting test against official Survey of India boundary vectors in EPSG:4326, validating exactly 7,541 internal observations.
              </p>
              <div className="text-[11px] text-[#C6A66B]">53,483 km² Sovereign territory match</div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 04: RADIATIVE ENERGETICS & FRP FORMULATION
            Visual Personality: Fire Intelligence & Energy Analysis
            ========================================================================= */}
        <section
          id="ch4"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 4 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 4 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 4 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#E03C31] bg-[#101B2B] px-2.5 py-0.5 rounded border border-[#E03C31]/30">
                MODULE 04
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-[#E03C31]" />
                <span>Fire Radiative Power (FRP) &amp; Confidence Semantics</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#E03C31] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <Zap className="w-3 h-3 text-[#E03C31]" />
              <span>WOOSTER MIR RADIATIVE FORMULATION</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wooster Formulation */}
            <div className="p-6 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#E03C31]/50 transition-colors flex flex-col justify-between space-y-4">
              <div>
                <div className="text-[10px] font-mono-telemetry uppercase text-[#E03C31] font-bold tracking-wider mb-1">
                  Wooster MIR Formulation
                </div>
                <h3 className="text-base font-bold text-[#F2F0E9] mb-2 font-mono-telemetry">Fire Radiative Power (FRP) in Megawatts (MW)</h3>
                <p className="text-xs text-[#9299A1] leading-relaxed font-normal mb-3">
                  Fire Radiative Power quantifies the instantaneous rate of radiant thermal energy emitted by the flaming/smoldering combustion front,
                  expressed in <strong className="text-[#F2F0E9]">Megawatts (MW)</strong>:
                </p>
                <div className="p-3.5 rounded bg-[#111418] border border-[#E03C31]/40 font-mono-telemetry text-[#E03C31] text-xs text-center mb-3 shadow-[0_0_15px_rgba(224,60,49,0.1)]">
                  FRP = (A_sample · σ / a) · (L_MIR,fire - L_MIR,bg) [MW]
                </div>
                <p className="text-xs text-[#9299A1] leading-relaxed font-normal">
                  Because thermal emission in the MWIR band (~3.9 µm) scales approximately linearly with combustion temperature, FRP correlates directly
                  with fuel consumption rate (~0.368 kg/MJ for forest biomass), providing a direct energetic metric far superior to burned-area estimates.
                </p>
              </div>
              <div className="pt-3 border-t border-[#222B38] flex items-center justify-between text-xs text-[#9299A1] font-mono-telemetry">
                <span>Peak Observed FRP: <strong className="text-[#E03C31]">169.9 MW</strong></span>
                <span>Dataset Mean FRP: <strong className="text-[#F2F0E9]">5.35 MW</strong></span>
              </div>
            </div>

            {/* Decoupled Sensor Confidence */}
            <div className="p-6 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#55C7E8]/50 transition-colors flex flex-col justify-between space-y-4">
              <div>
                <div className="text-[10px] font-mono-telemetry uppercase text-[#55C7E8] font-bold tracking-wider mb-1">
                  Decoupled Sensor Confidence
                </div>
                <h3 className="text-base font-bold text-[#F2F0E9] mb-2 font-mono-telemetry">Decoupled Confidence Semantics</h3>
                <p className="text-xs text-[#9299A1] leading-relaxed font-normal mb-3">
                  NASA FIRMS employs fundamentally different confidence metrics across instruments, which must not be conflated into a single naive filter:
                </p>
                <div className="space-y-3">
                  <div className="p-3 rounded bg-[#111418] border border-[#222B38]">
                    <strong className="text-[#55C7E8] text-xs font-mono-telemetry block mb-1">MODIS: Quantitative Integer (0–100%)</strong>
                    <p className="text-[11px] text-[#9299A1] font-normal leading-relaxed">
                      Continuous statistical deviation test against background brightness temperature and viewing angle.
                    </p>
                  </div>
                  <div className="p-3 rounded bg-[#111418] border border-[#222B38]">
                    <strong className="text-[#C6A66B] text-xs font-mono-telemetry block mb-1">VIIRS: Categorical Quality Flag (Low / Nominal / High)</strong>
                    <p className="text-[11px] text-[#9299A1] font-normal leading-relaxed">
                      Discrete qualitative flags derived from 375m I4 brightness temperature, glint tests, and cloud adjacency flags.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-[#222B38] flex items-center justify-between text-xs text-[#9299A1] font-mono-telemetry">
                <span>Filter Independence: <strong className="text-[#65B891]">Fully Decoupled</strong></span>
                <span>VIIRS Flags: <strong className="text-[#C6A66B]">low / nominal / high</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 05: DEM & GEOMORPHOLOGICAL PROCESSING
            Visual Personality: Topographic Research Module
            ========================================================================= */}
        <section
          id="ch5"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 5 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 5 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 5 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] bg-[#0B3D91]/60 px-2.5 py-0.5 rounded border border-[#55C7E8]/40">
                MODULE 05
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <Mountain className="w-5 h-5 text-[#2477B8]" />
                <span>Digital Elevation Model &amp; Topographic Derivatives</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#91BBD5] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <span>COPERNICUS GLO-30 RELIEF EXTRUSION</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#9299A1] leading-relaxed font-normal">
            FIREINTEL integrates the European Space Agency&apos;s Copernicus GLO-30 DEM at <strong className="text-[#F2F0E9]">30 Meters</strong> horizontal spatial resolution
            across the EGM2008 vertical geoid datum (129 m to 7,804 m in Uttarakhand).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 font-mono-telemetry text-xs">
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#C6A66B]/60 transition-colors space-y-2.5">
              <div className="text-[10px] text-[#9299A1] uppercase tracking-wider">Topographic Resolution</div>
              <div className="text-lg font-bold text-[#C6A66B]">30 Meters (1.0″)</div>
              <div className="text-xs text-[#9299A1] font-sans leading-relaxed font-normal">
                Copernicus GLO-30 DEM. Resolves steep Himalayan ravines, ridges, Horn slope angles up to 44.7°, and aspect orientations across EGM2008 geoid.
              </div>
            </div>

            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#55C7E8]/60 transition-colors space-y-2.5">
              <div className="text-[10px] text-[#9299A1] uppercase tracking-wider">Master Grid Resolution</div>
              <div className="text-lg font-bold text-[#55C7E8]">0.05° (~5.5 km)</div>
              <div className="text-xs text-[#9299A1] font-sans leading-relaxed font-normal">
                2,174 analytical cells strictly bounded by Uttarakhand borders. Used for aggregating geomorphometry and spatio-temporal fire density.
              </div>
            </div>

            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#F2B544]/60 transition-colors space-y-2.5">
              <div className="text-[10px] text-[#9299A1] uppercase tracking-wider">Climate Reanalysis Resolution</div>
              <div className="text-lg font-bold text-[#F2B544]">0.1° (~9.0 km)</div>
              <div className="text-xs text-[#9299A1] font-sans leading-relaxed font-normal">
                ECMWF ERA5-Land. Downscaled thermodynamically via elevation lapse rates, distinctly separated from the 30m DEM elevation surface.
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 06: ENVIRONMENTAL DATA INTEGRATION STATUS
            Visual Personality: Environmental Data Sync
            ========================================================================= */}
        <section
          id="ch6"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-4 overflow-hidden transition-all duration-300 ${
            activeChapter === 6 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 6 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 6 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] bg-[#0B3D91]/60 px-2.5 py-0.5 rounded border border-[#55C7E8]/40">
                MODULE 06
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <Wind className="w-5 h-5 text-[#55C7E8]" />
                <span>Environmental Data Integration Status</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#F2B544] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2B544] animate-pulse" />
              <span>CDS REMOTE QUEUE MONITOR</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#9299A1] leading-relaxed font-normal">
            While Copernicus DEM 30m terrain is fully ingested, ECMWF ERA5-Land meteorological reanalysis remains pending in remote CDS queues:
          </p>
          <div className="p-5 rounded bg-[#101B2B] border border-[#F2B544]/40 text-xs font-mono-telemetry flex items-start gap-3.5 shadow-sm">
            <Clock className="w-5 h-5 text-[#F2B544] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-[#F2F0E9] block text-sm">Status: Pending External CDS Queue</strong>
              <p className="text-[#9299A1] font-normal font-sans leading-relaxed">
                ECMWF Climate Data Store API client architecture is deployed, pending download completion. FIREINTEL does not synthesize or extrapolate unverified atmospheric grids.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            CHAPTER 07: SCIENTIFIC LIMITATIONS
            Visual Personality: Research Warnings & Scientific Transparency
            ========================================================================= */}
        <section
          id="ch7"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 7 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 7 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 7 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#F2B544] bg-[#101B2B] px-2.5 py-0.5 rounded border border-[#F2B544]/30">
                MODULE 07
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-[#F2B544]" />
                <span>Scientific Limitations &amp; Remote Sensing Caveats</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#F2B544] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <span>REMOTE SENSING CONSTRAINTS</span>
            </div>
          </div>

          <ul className="space-y-3.5 text-xs text-[#9299A1] font-normal leading-relaxed">
            <li className="p-4 rounded bg-[#080A0D] border border-[#222B38] border-l-3 border-l-[#F2B544] flex items-start gap-3 hover:bg-[#101B2B]/40 transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#F2B544] shrink-0 mt-1.5" />
              <div>
                <strong className="text-[#F2F0E9]">Dense Canopy Attenuation:</strong> Sub-canopy smoldering surface fires under dense Himalayan broadleaf canopies (e.g. moist Sal, dense Oak) may emit insufficient MWIR radiant flux to trigger spaceborne detection algorithms until crown ignition occurs.
              </div>
            </li>
            <li className="p-4 rounded bg-[#080A0D] border border-[#222B38] border-l-3 border-l-[#F2B544] flex items-start gap-3 hover:bg-[#101B2B]/40 transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#F2B544] shrink-0 mt-1.5" />
              <div>
                <strong className="text-[#F2F0E9]">Cloud &amp; Monsoon Masking:</strong> Persistent monsoonal cloud decks during July–August completely obscure ground thermal emissions, explaining the 0.07% minimum detection rate during peak monsoon.
              </div>
            </li>
            <li className="p-4 rounded bg-[#080A0D] border border-[#222B38] border-l-3 border-l-[#F2B544] flex items-start gap-3 hover:bg-[#101B2B]/40 transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#F2B544] shrink-0 mt-1.5" />
              <div>
                <strong className="text-[#F2F0E9]">Topographic Occlusion &amp; Radar Shadows:</strong> In precipitous mountain gorges, steep opposing ridges can partially shield off-nadir line-of-sight sensor paths.
              </div>
            </li>
          </ul>
        </section>

        {/* =========================================================================
            CHAPTER 08: DATA PROVENANCE & LIFECYCLE MATRIX
            Visual Personality: Data Verification & Traceability Matrix
            ========================================================================= */}
        <section
          id="ch8"
          className={`relative scroll-mt-32 p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-6 overflow-hidden transition-all duration-300 ${
            activeChapter === 8 ? "border-[#2477B8]/70 shadow-[0_0_24px_rgba(11,61,145,0.25)]" : ""
          } ${activatingChapter === 8 ? "anim-module-active" : ""}`}
        >
          {activatingChapter === 8 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55C7E8] to-transparent anim-scan-beam z-20" />
          )}

          <div className="flex items-center justify-between border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] bg-[#0B3D91]/60 px-2.5 py-0.5 rounded border border-[#55C7E8]/40">
                MODULE 08
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F2F0E9] flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#55C7E8]" />
                <span>Data Provenance &amp; Acquisition Lifecycle Matrix</span>
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono-telemetry text-[#65B891] bg-[#080A0D] px-2.5 py-1 rounded border border-[#222B38]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#65B891]" />
              <span>FULL LIFECYCLE AUDIT</span>
            </div>
          </div>

          <p className="text-xs text-[#9299A1] font-mono-telemetry leading-relaxed font-normal">
            Full transparency regarding downloaded, processed, and pending external datasets.
          </p>

          <div className="overflow-x-auto rounded border border-[#222B38] bg-[#080A0D]">
            <table className="w-full text-left text-xs font-mono-telemetry border-collapse">
              <thead>
                <tr className="border-b border-[#222B38] bg-[#111418] text-[#9299A1] text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Dataset / Instrument</th>
                  <th className="py-3.5 px-4">Source &amp; Provider</th>
                  <th className="py-3.5 px-4">Nominal Resolution</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Observation Count / Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222B38] text-[#9299A1]">
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F2F0E9]">VIIRS (Suomi-NPP)</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">NASA FIRMS (VNP14IMGTDL)</td>
                  <td className="py-3.5 px-4 text-[#C6A66B]">375 m (nadir)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#55C7E8] bg-[#0B3D91]/40 border border-[#55C7E8]/40 px-2.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-[#55C7E8]" /> Downloaded &amp; Validated
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#F2F0E9]">6,623 Hotspots (87.8%)</td>
                </tr>
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F2F0E9]">MODIS (Aqua &amp; Terra)</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">NASA FIRMS (MCD14DL)</td>
                  <td className="py-3.5 px-4 text-[#91BBD5]">1,000 m (nadir)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#55C7E8] bg-[#0B3D91]/40 border border-[#55C7E8]/40 px-2.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-[#55C7E8]" /> Downloaded &amp; Validated
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#F2F0E9]">918 Hotspots (12.2%)</td>
                </tr>
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#9299A1]">VIIRS (NOAA-20 / JPSS-1)</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">NASA FIRMS (VJ114IMGTDL)</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">375 m (nadir)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#9299A1] bg-[#111418] border border-[#222B38] px-2.5 py-0.5 rounded text-[10px]">
                      <Info className="w-3 h-3" /> Verified Absent
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#9299A1]">0 Hotspots (100% VIIRS is Suomi-NPP)</td>
                </tr>
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F2F0E9]">Copernicus GLO-30 DEM</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">European Space Agency (Copernicus)</td>
                  <td className="py-3.5 px-4 text-[#C6A66B]">30 m (1.0 arcsec)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#C6A66B] bg-[#101B2B] border border-[#C6A66B]/40 px-2.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-[#C6A66B]" /> Downloaded &amp; Extruded
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#F2F0E9]">Complete Uttarakhand DEM (129m–7,804m)</td>
                </tr>
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F2F0E9]">State Boundary (Uttarakhand)</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">Survey of India / Official Boundary</td>
                  <td className="py-3.5 px-4 text-[#65B891]">Vector Polygon (EPSG:4326)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#65B891] bg-[#101B2B] border border-[#65B891]/40 px-2.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-[#65B891]" /> Boundary Validated
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#F2F0E9]">Strict point-in-polygon spatial filter</td>
                </tr>
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F2F0E9]">Master Analytical Grid</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">FIREINTEL Geospatial Framework</td>
                  <td className="py-3.5 px-4 text-[#2477B8]">0.05° (~5.5 km × 5.5 km)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#55C7E8] bg-[#0B3D91]/40 border border-[#55C7E8]/40 px-2.5 py-0.5 rounded text-[10px]">
                      <CheckCircle2 className="w-3 h-3 text-[#55C7E8]" /> Synthesized Grid
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#F2F0E9]">2,174 Discrete Analytical Cells</td>
                </tr>
                <tr className="hover:bg-[#101B2B]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#F2B544]">ERA5-Land Reanalysis</td>
                  <td className="py-3.5 px-4 text-[#9299A1]">ECMWF Copernicus Climate Data Store</td>
                  <td className="py-3.5 px-4 text-[#2477B8]">0.1° (~9 km native)</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-[#F2B544] bg-[#101B2B] border border-[#F2B544]/40 px-2.5 py-0.5 rounded text-[10px]">
                      <Clock className="w-3 h-3 text-[#F2B544]" /> Pending External CDS Queue
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#9299A1]">CDS API architecture ready; awaiting remote fetch</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* =========================================================================
            9. REPRODUCIBILITY & AUDIT TRAIL STANDARD
            ========================================================================= */}
        <section className="p-6 sm:p-8 rounded-lg bg-[#111418] border border-[#222B38] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#222B38] pb-3">
            <h3 className="text-base sm:text-lg font-bold text-[#F2F0E9] flex items-center gap-2.5 font-mono-telemetry">
              <Cpu className="w-4 h-4 text-[#65B891]" />
              <span>Reproducibility &amp; Audit Trail Standard</span>
            </h3>
            <span className="text-[10px] font-mono-telemetry text-[#65B891] bg-[#080A0D] px-2.5 py-0.5 rounded border border-[#222B38]">
              PEER-VERIFIABLE REPRODUCIBILITY
            </span>
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm text-[#9299A1] leading-relaxed font-normal">
            <p>
              <strong className="text-[#F2F0E9] font-medium">Orbital Visualization:</strong> Orbital tracks rendered on the planetary globe
              represent nominal Keplerian orbital geometries (inclination ~98.2°, altitude ~705–824 km, Sun-synchronous). They are designed
              for Earth-observation mission education and do not constitute real-time NORAD/Two-Line Element (TLE) ephemeris tracking.
              <span className="block text-[#C6A66B] font-mono-telemetry text-xs mt-1.5">
                Notice: Illustrative orbital geometry — not live spacecraft tracking.
              </span>
            </p>
            <p>
              <strong className="text-[#F2F0E9] font-medium">Reproducibility Guarantee:</strong> All 7,541 fire records are stored in boundary-validated CSV
              (<code className="text-[#C6A66B] bg-[#080A0D] px-1.5 py-0.5 rounded border border-[#222B38]">fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv</code>) with full audit columns:
              latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, instrument, confidence, version, bright_t31, frp, daynight, month.
            </p>
          </div>
        </section>

        {/* =========================================================================
            10. METHODOLOGY & PROVENANCE FOOTER
            ========================================================================= */}
        <footer className="pt-8 border-t border-[#222B38] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono-telemetry text-[#9299A1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#65B891]" />
            <span>NASA Space Apps 2026 • Verified Scientific Telemetry Baseline</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/fires" className="text-[#E03C31] hover:text-[#E03C31]/80 transition-colors duration-200">
              Fire Intelligence Lab →
            </Link>
            <Link href="/terrain" className="text-[#55C7E8] hover:text-[#F2F0E9] transition-colors duration-200">
              3D Topography →
            </Link>
            <Link href="/data" className="text-[#C6A66B] hover:text-[#F2F0E9] transition-colors duration-200">
              Data Explorer →
            </Link>
          </div>
        </footer>
      </div>

      {/* Scientific Telemetry Side Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        telemetry={telemetry}
      />
    </main>
  );
}
