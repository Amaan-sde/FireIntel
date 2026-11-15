"use client";

import React, { useState, useEffect } from "react";
import CinematicEarthCanvas, { SatelliteInfo, SATELLITE_CATALOG } from "@/components/CinematicEarthCanvas";
import CinematicHeroOverlay from "@/components/CinematicHeroOverlay";
import CinematicHimalayanViewer from "@/components/CinematicHimalayanViewer";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
import SatelliteInfoModal from "@/components/SatelliteInfoModal";
import SpaceEnvironmentBackground from "@/components/SpaceEnvironmentBackground";

export default function LivingEarthHomePage() {
  const [viewState, setViewState] = useState<"orbit" | "himalayas">("orbit");
  const [isDescending, setIsDescending] = useState<boolean>(false);
  const [descentStage, setDescentStage] = useState<number>(1);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteInfo | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);

  // Load telemetry data for scientific drawer and statistics
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

  // Expose hooks for Playwright automated browser verification
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__LIVING_EARTH_STATE = {
        ...((window as any).__LIVING_EARTH_STATE || {}),
        viewState,
        isDescending,
        descentStage,
        selectedSatellite,
        skipDescent: handleDescendComplete,
      };
      (window as any).__TRIGGER_DESCENT = () => {
        setIsDescending(true);
        setDescentStage(1);
      };
      (window as any).__ASCEND_TO_ORBIT = () => {
        setIsDescending(false);
        setViewState("orbit");
        setDescentStage(1);
      };
      (window as any).__SELECT_SATELLITE = (satKey: string) => {
        if (SATELLITE_CATALOG[satKey]) {
          setSelectedSatellite(SATELLITE_CATALOG[satKey]);
        }
      };
    }
  }, [viewState, isDescending, descentStage, selectedSatellite]);

  // Handle CTA: Explore the Himalayas
  const handleExploreHimalayas = () => {
    setIsDescending(true);
    setDescentStage(1);
  };

  // Called when Three.js camera finishes its descent glide
  const handleDescendComplete = () => {
    setIsDescending(false);
    setViewState("himalayas");
    setDescentStage(7);
  };

  // Return from Himalayas back to global planetary orbit
  const handleAscendToOrbit = () => {
    setViewState("orbit");
    setIsDescending(false);
    setDescentStage(1);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020306] select-none">
      {/* Layer 0: Animated 3D Space Environment (renders BEHIND Earth canvas) */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <SpaceEnvironmentBackground />
      </div>

      {/* Layer 1: Living Earth Canvas (Three.js) - PERSISTENT, NEVER UNMOUNTED */}
      <div className="absolute inset-0 z-10">
        <CinematicEarthCanvas
          isDescending={isDescending}
          onDescendComplete={handleDescendComplete}
          onSkipDescent={handleDescendComplete}
          onSatelliteSelect={(sat) => setSelectedSatellite(sat)}
          descentStage={descentStage}
          onStageChange={(stage) => setDescentStage(stage)}
          isTerrainActive={viewState === "himalayas"}
        />
      </div>

      {/* Layer 2: 3D Himalayan Terrain (MapLibre + Copernicus DEM) - PRE-WARMED & PERSISTENT */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-700 ease-in-out ${
          viewState === "himalayas"
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={viewState !== "himalayas"}
      >
        <CinematicHimalayanViewer
          onAscendToOrbit={handleAscendToOrbit}
          telemetry={telemetry}
        />
      </div>

      {/* Layer 3: Minimalist Editorial Hero Overlay & In-Flight HUD */}
      <div
        className={`transition-opacity duration-500 ${
          viewState === "himalayas" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden={viewState === "himalayas"}
      >
        <CinematicHeroOverlay
          onExploreHimalayas={handleExploreHimalayas}
          onExploreScience={() => setIsTelemetryOpen(true)}
          onSatelliteSelect={(sat) => setSelectedSatellite(sat)}
          onSkipDescent={handleDescendComplete}
          isDescending={isDescending}
          descentStage={descentStage}
        />
      </div>

      {/* Satellite Specification Modal */}
      <SatelliteInfoModal
        satellite={selectedSatellite}
        onClose={() => setSelectedSatellite(null)}
      />

      {/* Scientific Telemetry Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        telemetry={telemetry}
      />
    </main>
  );
}
