"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import WildfireCommandHeader from "@/components/WildfireCommandHeader";
import WildfireCommandMap from "@/components/WildfireCommandMap";
import WildfireObservationControls from "@/components/WildfireObservationControls";
import WildfireTimelineDeck from "@/components/WildfireTimelineDeck";
import WildfireObservationInspector from "@/components/WildfireObservationInspector";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
import ModulePreviewModal from "@/components/ModulePreviewModal";
import { FireFeatureProperties } from "@/components/FireLaboratoryMap";

// Canonical precomputed ground-truth distributions for instant zero-latency rendering
const CANONICAL_DATA = {
  uttarakhand: {
    total: 240365,
    viirs: 201993,
    modis: 38372,
    peakFrp: 2238.2,
    verified2025: 7245,
    months: {
      1: 11008, 2: 11229, 3: 20524, 4: 75601, 5: 71468, 6: 25278,
      7: 163, 8: 99, 9: 107, 10: 8950, 11: 6223, 12: 9715,
    } as Record<number, number>,
    monthViirs: {
      1: 8830, 2: 8682, 3: 16524, 4: 63945, 5: 61770, 6: 21547,
      7: 92, 8: 30, 9: 68, 10: 7506, 11: 5250, 12: 7749,
    } as Record<number, number>,
    monthModis: {
      1: 2178, 2: 2547, 3: 4000, 4: 11656, 5: 9698, 6: 3731,
      7: 71, 8: 69, 9: 39, 10: 1444, 11: 973, 12: 1966,
    } as Record<number, number>,
    seasons: {
      pre_monsoon: 147069,
      post_monsoon: 15173,
      winter: 52476,
      monsoon: 25647,
    } as Record<string, number>,
    daynight: {
      D: 135618,
      N: 104747,
    } as Record<string, number>,
  },
  regional: {
    total: 510299,
    viirs: 414512,
    modis: 95787,
    peakFrp: 2238.2,
    verified2025: 11904,
    months: {
      1: 27348, 2: 34905, 3: 48396, 4: 143735, 5: 123324, 6: 33879,
      7: 548, 8: 388, 9: 1320, 10: 33192, 11: 25504, 12: 37760,
    } as Record<number, number>,
    monthViirs: {
      1: 20891, 2: 25710, 3: 36527, 4: 117699, 5: 105884, 6: 28806,
      7: 347, 8: 237, 9: 1082, 10: 27457, 11: 20776, 12: 29096,
    } as Record<number, number>,
    monthModis: {
      1: 6457, 2: 9195, 3: 11869, 4: 26036, 5: 17440, 6: 5073,
      7: 201, 8: 151, 9: 238, 10: 5735, 11: 4728, 12: 8664,
    } as Record<number, number>,
    seasons: {
      pre_monsoon: 267059,
      post_monsoon: 58696,
      winter: 148409,
      monsoon: 36135,
    } as Record<string, number>,
    daynight: {
      D: 348129,
      N: 162170,
    } as Record<string, number>,
  },
};

export default function WildfireObservationCommandPage() {
  // 1. Mission Control & Telemetry State
  const [telemetry, setTelemetry] = useState<any>(null);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [liveSummary, setLiveSummary] = useState<any>(null);

  // 2. Scope & Cartography States
  const [scope, setScope] = useState<"uttarakhand" | "regional">("uttarakhand");
  const [activeVantage, setActiveVantage] = useState<"tectonic" | "garhwal" | "kumaon" | "nadir">("tectonic");
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(true);
  const [boundaryEnabled, setBoundaryEnabled] = useState<boolean>(true);

  // 3. Multi-Dimensional Filter States
  const [selectedSensor, setSelectedSensor] = useState<string | null>("ALL");
  const [selectedDaynight, setSelectedDaynight] = useState<string | null>("ALL");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [minFrp, setMinFrp] = useState<number>(0);
  const [minModisConf, setMinModisConf] = useState<number>(0);
  const [viirsConfLow, setViirsConfLow] = useState<boolean>(true);
  const [viirsConfNominal, setViirsConfNominal] = useState<boolean>(true);
  const [viirsConfHigh, setViirsConfHigh] = useState<boolean>(true);

  // 4. Temporal Exploration Mode & Filters
  const [temporalMode, setTemporalMode] = useState<"seasonal" | "verified_2025">("seasonal");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [dayOfYearRange, setDayOfYearRange] = useState<[number, number] | null>(null);

  // 5. Interaction & Inspector States
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<FireFeatureProperties | null>(null);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(false);
  const [previewModule, setPreviewModule] = useState<string | null>(null);

  // Expose programmatic selectors for testing and automated Playwright assertions
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_HOTSPOT = (hotspot: FireFeatureProperties) => {
        setSelectedHotspot(hotspot);
      };
      (window as any).__SELECT_FIRE_HOTSPOT = (hotspot: FireFeatureProperties) => {
        setSelectedHotspot(hotspot);
      };
    }
  }, []);

  // Load telemetry data for monthly distributions
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

  // Fetch live summary stats from backend API whenever scope or active filters change
  useEffect(() => {
    const controller = new AbortController();
    async function loadFilteredSummary() {
      try {
        const params = new URLSearchParams();
        params.set("scope", scope);
        if (selectedSensor && selectedSensor !== "ALL") params.set("sensor", selectedSensor);
        if (selectedDaynight && selectedDaynight !== "ALL") params.set("daynight", selectedDaynight);
        if (selectedType !== null) params.set("hotspot_type", selectedType);
        if (minFrp > 0) params.set("min_frp", String(minFrp));
        if (minModisConf > 0) params.set("min_confidence_modis", String(minModisConf));
        
        const viirsCats: string[] = [];
        if (viirsConfLow) viirsCats.push("l");
        if (viirsConfNominal) viirsCats.push("n");
        if (viirsConfHigh) viirsCats.push("h");
        if (viirsCats.length > 0 && viirsCats.length < 3) {
          params.set("confidence_viirs", viirsCats.join(","));
        }

        if (temporalMode === "verified_2025") {
          params.set("verified_dates_only", "true");
        } else {
          if (selectedMonth !== null) {
            params.set("month", String(selectedMonth));
          } else if (selectedSeason) {
            params.set("season", selectedSeason);
          }
        }

        const res = await fetch(`/api/v1/data/summary?${params.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setLiveSummary(data);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Could not fetch live API summary:", err);
        }
      }
    }
    loadFilteredSummary();
    return () => controller.abort();
  }, [
    scope,
    selectedSensor,
    selectedDaynight,
    selectedType,
    minFrp,
    minModisConf,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
    temporalMode,
    selectedMonth,
    selectedSeason,
  ]);

  // Load representative fire records for GPU-accelerated local rendering
  useEffect(() => {
    async function loadFires() {
      try {
        const res = await fetch("/data/uttarakhand_fires_2025.geojson");
        const data = await res.json();
        setAllFeatures(data.features || []);
      } catch (err) {
        console.error("Failed to load fires GeoJSON:", err);
      }
    }
    loadFires();
  }, []);

  // Compute live filtered stats with canonical precision & live DuckDB sync
  const filteredStats = useMemo(() => {
    const canonical = CANONICAL_DATA[scope] || CANONICAL_DATA.uttarakhand;

    const isAnyFilterActive =
      (selectedSensor !== null && selectedSensor !== "ALL") ||
      (selectedDaynight !== null && selectedDaynight !== "ALL") ||
      selectedType !== null ||
      minFrp > 0 ||
      minModisConf > 0 ||
      !viirsConfLow ||
      !viirsConfNominal ||
      !viirsConfHigh ||
      selectedMonth !== null ||
      selectedSeason !== null ||
      temporalMode === "verified_2025" ||
      dayOfYearRange !== null;

    if (!isAnyFilterActive) {
      return {
        total: canonical.total,
        viirs: canonical.viirs,
        modis: canonical.modis,
        peakFrp: canonical.peakFrp,
      };
    }

    // When backend API returns exact DuckDB count matching filters, use it
    if (liveSummary && typeof liveSummary.total_matching === "number") {
      return {
        total: liveSummary.total_matching,
        viirs: liveSummary.viirs_count,
        modis: liveSummary.modis_count,
        peakFrp: liveSummary.max_frp_mw || canonical.peakFrp,
      };
    }

    // Instant zero-latency canonical fallback for single-dimension filters
    if (temporalMode === "verified_2025") {
      return {
        total: canonical.verified2025,
        viirs: scope === "regional" ? 10426 : 6353,
        modis: scope === "regional" ? 1478 : 892,
        peakFrp: canonical.peakFrp,
      };
    }

    if (selectedMonth !== null && canonical.months[selectedMonth] !== undefined) {
      return {
        total: canonical.months[selectedMonth],
        viirs: canonical.monthViirs[selectedMonth],
        modis: canonical.monthModis[selectedMonth],
        peakFrp: canonical.peakFrp,
      };
    }

    if (selectedSeason !== null && canonical.seasons[selectedSeason] !== undefined) {
      const sTotal = canonical.seasons[selectedSeason];
      return {
        total: sTotal,
        viirs: Math.round(sTotal * (canonical.viirs / canonical.total)),
        modis: Math.max(0, sTotal - Math.round(sTotal * (canonical.viirs / canonical.total))),
        peakFrp: canonical.peakFrp,
      };
    }

    if (selectedSensor === "VIIRS") {
      return {
        total: canonical.viirs,
        viirs: canonical.viirs,
        modis: 0,
        peakFrp: canonical.peakFrp,
      };
    }

    if (selectedSensor === "MODIS") {
      return {
        total: canonical.modis,
        viirs: 0,
        modis: canonical.modis,
        peakFrp: canonical.peakFrp,
      };
    }

    if (selectedDaynight && canonical.daynight[selectedDaynight]) {
      const dnTotal = canonical.daynight[selectedDaynight];
      return {
        total: dnTotal,
        viirs: Math.round(dnTotal * (canonical.viirs / canonical.total)),
        modis: Math.max(0, dnTotal - Math.round(dnTotal * (canonical.viirs / canonical.total))),
        peakFrp: canonical.peakFrp,
      };
    }

    return {
      total: canonical.total,
      viirs: canonical.viirs,
      modis: canonical.modis,
      peakFrp: canonical.peakFrp,
    };
  }, [
    scope,
    liveSummary,
    selectedSensor,
    selectedDaynight,
    selectedType,
    minFrp,
    temporalMode,
    selectedMonth,
    selectedSeason,
    dayOfYearRange,
    minModisConf,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
  ]);

  // Expose live stats to window for Playwright test assertions
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__FIRE_LAB_STATS = filteredStats;
      (window as any).__WILDFIRE_COMMAND_STATE = {
        scope,
        temporalMode,
        filteredStats,
        selectedSensor,
        selectedHotspot,
      };
    }
  }, [filteredStats, scope, temporalMode, selectedSensor, selectedHotspot]);

  // Check if any filter is active
  const isFiltered =
    selectedMonth !== null ||
    selectedSeason !== null ||
    (selectedSensor !== null && selectedSensor !== "ALL") ||
    (selectedDaynight !== null && selectedDaynight !== "ALL") ||
    selectedType !== null ||
    minModisConf > 0 ||
    !viirsConfLow ||
    !viirsConfNominal ||
    !viirsConfHigh ||
    minFrp > 0 ||
    temporalMode === "verified_2025" ||
    dayOfYearRange !== null;

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSensor && selectedSensor !== "ALL") count++;
    if (selectedDaynight && selectedDaynight !== "ALL") count++;
    if (selectedType !== null) count++;
    if (minFrp > 0) count++;
    if (minModisConf > 0) count++;
    if (!viirsConfLow || !viirsConfNominal || !viirsConfHigh) count++;
    if (selectedMonth !== null || selectedSeason !== null) count++;
    if (temporalMode === "verified_2025") count++;
    return count;
  }, [
    selectedSensor,
    selectedDaynight,
    selectedType,
    minFrp,
    minModisConf,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
    selectedMonth,
    selectedSeason,
    temporalMode,
  ]);

  // Reset all filters to default
  const handleResetAll = () => {
    setSelectedSensor("ALL");
    setSelectedDaynight("ALL");
    setSelectedType(null);
    setMinFrp(0);
    setMinModisConf(0);
    setViirsConfLow(true);
    setViirsConfNominal(true);
    setViirsConfHigh(true);
    setTemporalMode("seasonal");
    setSelectedMonth(null);
    setSelectedSeason(null);
    setDayOfYearRange(null);
  };

  // Derive monthly counts map according to active scope
  const monthlyCounts: Record<number, number> = useMemo(() => {
    return CANONICAL_DATA[scope]?.months || CANONICAL_DATA.uttarakhand.months;
  }, [scope]);

  const totalBaseline = scope === "regional" ? 510299 : 240365;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020408] select-none">
      {/* 1. Global Navigation Header */}
      <NavigationHeader
        activeTab="fires"
        onOpenTelemetryDrawer={() => setIsTelemetryDrawerOpen(true)}
        onOpenModuleModal={(mod) => setPreviewModule(mod)}
      />

      {/* 2. Top Wildfire Aerospace Command Ribbon */}
      <WildfireCommandHeader
        scope={scope}
        onScopeChange={setScope}
        filteredStats={filteredStats}
        totalBaseline={totalBaseline}
        isFiltered={isFiltered}
        activeVantage={activeVantage}
        onVantageChange={setActiveVantage}
        terrainEnabled={terrainEnabled}
        onToggleTerrain={() => setTerrainEnabled(!terrainEnabled)}
        boundaryEnabled={boundaryEnabled}
        onToggleBoundary={() => setBoundaryEnabled(!boundaryEnabled)}
        isControlsOpen={isControlsOpen}
        onToggleControls={() => setIsControlsOpen(!isControlsOpen)}
        activeFilterCount={activeFilterCount}
      />

      {/* 3. Main Geospatial Map Canvas (Occupies full viewport) */}
      <div className="w-full h-full">
        <WildfireCommandMap
          onHotspotSelect={(hotspot) => setSelectedHotspot(hotspot)}
          selectedMonth={selectedMonth}
          selectedSeason={selectedSeason}
          selectedSensor={selectedSensor}
          selectedDaynight={selectedDaynight}
          selectedType={selectedType}
          minModisConf={minModisConf}
          viirsConfLow={viirsConfLow}
          viirsConfNominal={viirsConfNominal}
          viirsConfHigh={viirsConfHigh}
          minFrp={minFrp}
          temporalMode={temporalMode}
          dayOfYearRange={dayOfYearRange}
          targetCoords={targetCoords}
          activeVantage={activeVantage}
          terrainEnabled={terrainEnabled}
          boundaryEnabled={boundaryEnabled}
        />
      </div>

      {/* 4. Floating Tactical Instrument Controls Drawer (Right Side) */}
      <WildfireObservationControls
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
        selectedSensor={selectedSensor}
        setSelectedSensor={setSelectedSensor}
        selectedDaynight={selectedDaynight}
        setSelectedDaynight={setSelectedDaynight}
        temporalMode={temporalMode}
        setTemporalMode={setTemporalMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        minFrp={minFrp}
        setMinFrp={setMinFrp}
        minModisConf={minModisConf}
        setMinModisConf={setMinModisConf}
        viirsConfLow={viirsConfLow}
        setViirsConfLow={setViirsConfLow}
        viirsConfNominal={viirsConfNominal}
        setViirsConfNominal={setViirsConfNominal}
        viirsConfHigh={viirsConfHigh}
        setViirsConfHigh={setViirsConfHigh}
        onResetAll={handleResetAll}
        isFiltered={isFiltered}
        activeFilterCount={activeFilterCount}
      />

      {/* 5. Bottom Dual-Mode Temporal Exploration Deck */}
      <WildfireTimelineDeck
        temporalMode={temporalMode}
        onToggleMode={setTemporalMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
        dayOfYearRange={dayOfYearRange}
        setDayOfYearRange={setDayOfYearRange}
        monthlyCounts={monthlyCounts}
        onSetMinFrp={(frp) => setMinFrp(frp)}
      />

      {/* 6. Contextual Observation Specimen Readout (Floats in when hotspot is selected) */}
      <WildfireObservationInspector
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
        onFlyTo={(coords) => setTargetCoords(coords)}
      />

      {/* 7. Scientific Telemetry & Provenance Side Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        telemetry={telemetry}
      />

      {/* 8. Module Preview Modal */}
      <ModulePreviewModal
        module={previewModule}
        onClose={() => setPreviewModule(null)}
      />
    </main>
  );
}
