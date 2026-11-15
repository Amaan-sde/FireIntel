"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  Sparkles,
  Flame,
  Mountain,
  BarChart3,
  FileText,
  Database,
  Calendar,
  Crosshair,
  Orbit,
  Globe2,
  Compass,
  ArrowRight,
} from "lucide-react";
import { SATELLITE_CATALOG, SatelliteInfo } from "./CinematicEarthCanvas";

interface CinematicHeroOverlayProps {
  onExploreHimalayas: () => void;
  onExploreScience: () => void;
  onSatelliteSelect?: (sat: SatelliteInfo) => void;
  onCameraPreset?: (preset: "orbit" | "india" | "uttarakhand" | "night") => void;
  onSkipDescent?: () => void;
  isDescending: boolean;
  descentStage?: number; // 1 to 7
}

export default function CinematicHeroOverlay({
  onExploreHimalayas,
  onExploreScience,
  onSatelliteSelect,
  onCameraPreset,
  onSkipDescent,
  isDescending,
  descentStage = 1,
}: CinematicHeroOverlayProps) {
  // Refined Aerospace Flight Data for all 7 Stages
  const actNarratives: Record<
    number,
    {
      act: string;
      title: string;
      subtitle: string;
      altitude: string;
      velocity: string;
      target: string;
      sensor: string;
      phase: string;
    }
  > = {
    1: {
      act: "ACT 1 // ORBITAL ESTABLISHING SHOT",
      title: "Earth Observation Vantage",
      subtitle: "Aligning global perspective & Sun-synchronous satellite tracks",
      altitude: "35,786 KM",
      velocity: "7.66 KM/S",
      target: "EQUATORIAL NADIR",
      sensor: "MODIS & VIIRS TRACKING",
      phase: "TRAJECTORY CALIBRATION",
    },
    2: {
      act: "ACT 2 // INDIA REVEAL",
      title: "Subcontinent Orientation",
      subtitle: "Vectoring axial tilt toward South Asia & the Himalayan mountain arc",
      altitude: "12,400 KM",
      velocity: "6.12 KM/S",
      target: "28.7°N, 78.5°E",
      sensor: "TERRA / AQUA DAYLIGHT PASS",
      phase: "REGIONAL ALIGNMENT",
    },
    3: {
      act: "ACT 3 // UTTARAKHAND TARGET ACQUISITION",
      title: "Geographic Target Locked",
      subtitle: "3D Boundary Filament Active // Elevation range: 129 m to 7,804 m",
      altitude: "4,850 KM",
      velocity: "4.80 KM/S",
      target: "30.0668°N, 79.0193°E",
      sensor: "53,483 KM² ENVELOPE",
      phase: "TARGET ACQUIRED",
    },
    4: {
      act: "ACT 4 // ATMOSPHERIC DESCENT",
      title: "Upper Stratosphere Envelope",
      subtitle: "Gliding through Rayleigh limb atmosphere & dynamic cloud boundaries",
      altitude: "450 KM",
      velocity: "2.45 KM/S",
      target: "GARHWAL-KUMAON BASIN",
      sensor: "RAYLEIGH SCATTERING",
      phase: "ATMOSPHERIC PENETRATION",
    },
    5: {
      act: "ACT 5 // HIMALAYAN REVEAL",
      title: "Copernicus 30m Topography",
      subtitle: "Resolving mountain relief across Garhwal & Kumaon drainage basins",
      altitude: "28,000 M",
      velocity: "840 M/S",
      target: "ALAKNANDA & BHAGIRATHI VALLEYS",
      sensor: "COPERNICUS GLO-30 DEM",
      phase: "3D RELIEF EXTRUSION",
    },
    6: {
      act: "ACT 6 // THERMAL OBSERVATION REVEAL",
      title: "NASA FIRMS Telemetry",
      subtitle: "Activating 240,365 verified radiometric hotspots with empirical FRP intensity",
      altitude: "6,500 M",
      velocity: "320 M/S",
      target: "CHIR PINE FIRE REGIME",
      sensor: "201,993 VIIRS + 38,372 MODIS",
      phase: "THERMAL EMISSION DETECTED",
    },
    7: {
      act: "ACT 7 // FINAL TERRAIN COMPOSITION",
      title: "Himalayan Observatory Active",
      subtitle: "Engaging tactical oblique inspection of Western Himalayan fire regime",
      altitude: "1,850 M",
      velocity: "TERMINAL APPROACH",
      target: "TACTICAL OBSERVATORY DECK",
      sensor: "INTELLIGENCE ENGINE READY",
      phase: "MISSION CONTROL HANDOFF",
    },
  };

  const currentAct = actNarratives[descentStage] || actNarratives[1];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-8 md:p-12 select-none overflow-hidden">
      {/* 1. TOP HEADER: MINIMALIST, HIGH-END EDITORIAL NAVIGATION */}
      <header
        className={`flex items-center justify-between w-full transition-opacity duration-300 ${
          isDescending ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Brand Identity */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
            <div className="absolute w-5 h-5 rounded-full border border-cyan-400/40 animate-ping" />
          </div>
          <span className="text-sm font-semibold tracking-widest text-white uppercase font-mono-telemetry">
            FIREINTEL
          </span>
          <span className="hidden sm:inline-block text-slate-700 font-mono-telemetry">/</span>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-medium tracking-wider uppercase font-mono-telemetry">
            Living Planet
          </span>
        </div>

        {/* Clean Navigation Links & NASA Reel */}
        <nav className="pointer-events-auto flex items-center gap-2">
          {/* Quick Satellite Constellation Triggers */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            {(["terra", "aqua", "snpp"] as const).map((key) => {
              const sat = SATELLITE_CATALOG[key];
              return (
                <button
                  key={key}
                  onClick={() => onSatelliteSelect && onSatelliteSelect(sat)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono-telemetry text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={`Inspect ${sat.name} (${sat.platform}) [${sat.instrument}]`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sat.colorHex }} />
                  <span>{sat.name}</span>
                  <span className="text-slate-500">[{sat.instrument}]</span>
                </button>
              );
            })}
          </div>

          <Link
            href="/terrain"
            className="flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium cursor-pointer"
          >
            <Mountain className="w-3.5 h-3.5 text-sky-400" />
            <span>Terrain</span>
          </Link>

          <Link
            href="/fires"
            className="glass-pill rounded-full px-3.5 py-1.5 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 border-amber-500/30 transition-all font-medium flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Lab</span>
          </Link>

          <Link
            href="/calendar"
            className="flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Calendar</span>
          </Link>

          <Link
            href="/workspace"
            className="flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1.5 text-xs text-cyan-300 hover:text-white hover:bg-cyan-500/20 border-cyan-500/30 transition-all font-medium cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Workspace</span>
          </Link>

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analytics</span>
          </Link>

          <Link
            href="/data"
            className="flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data</span>
          </Link>

          <Link
            href="/methodology"
            className="flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Methodology</span>
          </Link>
        </nav>
      </header>

      {/* 2. CENTER-LEFT HERO: SPACIOUS, CONFIDENT, UNCLUTTERED */}
      <div
        className={`max-w-2xl pointer-events-none transition-all duration-700 ease-out ${
          isDescending
            ? "opacity-0 -translate-y-12 pointer-events-none"
            : "opacity-100 translate-y-0"
        }`}
      >
        {/* Mission Classification Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono-telemetry font-medium tracking-widest text-slate-300 uppercase">
            Earth Observation Intelligence
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-none mb-6 drop-shadow-2xl">
          FIREINTEL
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-2xl text-slate-200 font-light tracking-tight mb-8 leading-relaxed max-w-xl">
          Understanding satellite thermal observations across the Himalayan landscape.
        </p>

        {/* Streamlined Monospace Scientific Telemetry Strip */}
        <div className="space-y-1 text-xs text-slate-400 font-mono-telemetry mb-9 pl-4 border-l-2 border-cyan-500/50">
          <div className="text-slate-200">240,365 satellite thermal observations.</div>
          <div className="text-slate-400">38,372 MODIS (1 km) · 201,993 VIIRS (375 m).</div>
          <div className="text-amber-400/90 font-medium">Uttarakhand, Western Himalayas · Harmonised foundation.</div>
        </div>

        {/* Primary Call-to-Action Group */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-4">
          <button
            onClick={onExploreHimalayas}
            className="group py-4 px-8 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.35)] hover:shadow-[0_0_55px_rgba(56,189,248,0.5)] cursor-pointer hover:scale-[1.02]"
          >
            <span>EXPLORE THE HIMALAYAS</span>
            <ArrowDownRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:translate-y-1 text-cyan-600" />
          </button>

          <button
            onClick={onExploreScience}
            className="py-4 px-6 rounded-full glass-pill hover:bg-white/10 text-slate-300 hover:text-white font-medium text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Orbit className="w-4 h-4 text-sky-400" />
            <span>SCIENCE TELEMETRY</span>
          </button>
        </div>
      </div>

      {/* 3. CINEMATIC IN-FLIGHT DESCENT HUD (ZERO CLUNKY BOXES · 100% UNOBSTRUCTED PLANETARY VIEW) */}
      {isDescending && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-300">
          {/* Subtle Viewport Corner Reticles */}
          <div className="absolute top-6 left-6 w-5 h-5 border-t border-l border-cyan-400/60" />
          <div className="absolute top-6 right-6 w-5 h-5 border-t border-r border-cyan-400/60" />
          <div className="absolute bottom-6 left-6 w-5 h-5 border-b border-l border-cyan-400/60" />
          <div className="absolute bottom-6 right-6 w-5 h-5 border-b border-r border-cyan-400/60" />

          {/* Top Aerospace Telemetry Tape (Razor-thin, Non-intrusive) */}
          <div className="w-full flex items-center justify-between text-xs font-mono-telemetry pt-2 px-2 border-b border-cyan-500/20 backdrop-blur-sm bg-black/20 pb-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-cyan-300 font-bold tracking-widest">{currentAct.act}</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-semibold">{currentAct.phase}</span>
            </div>

            {/* In-Flight Metrics Tape (Required for test assertions & scientific realism) */}
            <div className="hidden sm:flex items-center gap-6 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Altitude:</span>
                <span className="text-cyan-300 font-bold">{currentAct.altitude}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Velocity:</span>
                <span className="text-white font-bold">{currentAct.velocity}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Target:</span>
                <span className="text-amber-300 font-medium">{currentAct.target}</span>
              </div>
            </div>
          </div>

          {/* Bottom Center Cinematic Caption (IMAX 70mm Documentary Subtitle Style) */}
          <div className="w-full flex flex-col items-center justify-end pb-8">
            <div className="text-center max-w-xl mx-auto px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-wide mb-1">
                {currentAct.title}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-mono-telemetry leading-relaxed">
                {currentAct.subtitle}
              </p>

              {/* Progress Line */}
              <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${(descentStage / 7) * 100}%` }}
                />
              </div>

              {/* Skip Link */}
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono-telemetry text-slate-400 pointer-events-auto">
                <span className="text-slate-500">Descent trajectory in progress</span>
                <button
                  onClick={() => {
                    if (onSkipDescent) {
                      onSkipDescent();
                    } else if (typeof window !== "undefined" && (window as any).__LIVING_EARTH_STATE?.skipDescent) {
                      (window as any).__LIVING_EARTH_STATE.skipDescent();
                    }
                  }}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer font-semibold"
                >
                  Skip to Himalayas →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. BOTTOM FLOATING BAR: DE-CONGESTED FLOATING DOCK & DISCLAIMERS */}
      {!isDescending && (
        <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          {/* Subtle Rotating Interaction Hint */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-telemetry">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "16s" }} />
            <span>Interactive 3D Earth: Drag to rotate · Scroll to zoom</span>
          </div>

          {/* Floating Camera Vantage Dock (Clean, Elegant, Dedicated Capsule) */}
          <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl">
            <button
              data-vantage="orbit"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).__LIVING_EARTH_STATE?.resetView) {
                  (window as any).__LIVING_EARTH_STATE.resetView();
                }
              }}
              className="px-3 py-1 rounded-full text-[10px] font-mono-telemetry text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Global Planetary Orbit View"
            >
              Orbit
            </button>
            <button
              data-vantage="india"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).__LIVING_EARTH_STATE?.focusIndia) {
                  (window as any).__LIVING_EARTH_STATE.focusIndia();
                }
              }}
              className="px-3 py-1 rounded-full text-[10px] font-mono-telemetry text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Orient toward Indian Subcontinent"
            >
              India Subcontinent
            </button>
            <button
              data-vantage="uttarakhand"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).__LIVING_EARTH_STATE?.focusBeacon) {
                  (window as any).__LIVING_EARTH_STATE.focusBeacon();
                }
              }}
              className="px-3 py-1 rounded-full text-[10px] font-mono-telemetry text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
              title="Lock onto Uttarakhand Study Area"
            >
              Uttarakhand Beacon
            </button>
            <button
              data-vantage="night"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).__LIVING_EARTH_STATE?.focusNight) {
                  (window as any).__LIVING_EARTH_STATE.focusNight();
                }
              }}
              className="px-3 py-1 rounded-full text-[10px] font-mono-telemetry text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Night-side Urban Illumination"
            >
              Night City Lights
            </button>
          </div>

          {/* Scientific Baseline & Ephemeris Notice */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono-telemetry">
            <span>Copernicus 30m DEM</span>
            <span>·</span>
            <span>NASA FIRMS 2025</span>
            <span>·</span>
            <span>Notice: Illustrative orbital geometry — not live spacecraft tracking.</span>
          </div>
        </footer>
      )}
    </div>
  );
}
