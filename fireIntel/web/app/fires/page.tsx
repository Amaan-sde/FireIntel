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

  // Fetch live summary stats from backend API whenever scope changes
  useEffect(() => {
    async function loadLiveSummary() {
      try {
        const res = await fetch(`/api/v1/data/summary?scope=${scope}`);
        if (res.ok) {
          const data = await res.json();
          setLiveSummary(data);
        }
      } catch (err) {
        console.warn("Could not fetch live API summary:", err);
      }
    }
    loadLiveSummary();
  }, [scope]);

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

  // Compute live filtered stats with microsecond speed via useMemo
  const filteredStats = useMemo(() => {
    const baselineTotal = scope === "regional" ? 510299 : 240365;
    const baselineViirs = scope === "regional" ? 427393 : 201993;
    const baselineModis = scope === "regional" ? 82906 : 38372;
    const baselinePeakFrp = 2238.2;

    if (!allFeatures.length) {
      return {
        total: liveSummary?.total_matching ?? baselineTotal,
        viirs: liveSummary?.viirs_count ?? baselineViirs,
        modis: liveSummary?.modis_count ?? baselineModis,
        peakFrp: liveSummary?.max_frp_mw ?? baselinePeakFrp,
      };
    }

    const allowedViirsCats: string[] = [];
    if (viirsConfLow) allowedViirsCats.push("l");
    if (viirsConfNominal) allowedViirsCats.push("n");
    if (viirsConfHigh) allowedViirsCats.push("h");

    let vCount = 0;
    let mCount = 0;
    let peakFrp = 0;

    for (const feat of allFeatures) {
      const p = feat.properties;
      // Sensor filter
      if (selectedSensor && selectedSensor !== "ALL" && p.sensor !== selectedSensor) continue;
      // Daynight filter
      if (selectedDaynight && selectedDaynight !== "ALL" && p.daynight !== selectedDaynight) continue;
      // Hotspot Type filter
      if (selectedType !== null && p.type !== parseInt(selectedType, 10)) continue;
      // Min FRP filter
      if (minFrp > 0 && p.frp < minFrp) continue;

      // Temporal mode filter
      if (temporalMode === "seasonal") {
        if (selectedMonth !== null && p.month !== selectedMonth) continue;
        if (selectedSeason === "pre_monsoon" && p.month !== 4 && p.month !== 5) continue;
        if (selectedSeason === "post_monsoon" && p.month !== 10 && p.month !== 11) continue;
        if (selectedSeason === "winter" && ![12, 1, 2, 3].includes(p.month)) continue;
        if (selectedSeason === "monsoon" && ![6, 7, 8, 9].includes(p.month)) continue;
      } else if (temporalMode === "verified_2025") {
        if (!p.date_verified_2025) continue;
        if (dayOfYearRange !== null && (p.day_of_year < dayOfYearRange[0] || p.day_of_year > dayOfYearRange[1])) continue;
      }

      // Decoupled Confidence filtering
      if (p.sensor === "MODIS") {
        if (p.confidence_num !== null && p.confidence_num !== undefined && p.confidence_num < minModisConf) continue;
        mCount++;
      } else if (p.sensor === "VIIRS") {
        const c = String(p.confidence).toLowerCase();
        if (!allowedViirsCats.includes(c)) continue;
        vCount++;
      }

      if (p.frp > peakFrp) {
        peakFrp = p.frp;
      }
    }

    // Scale representation to actual production counts if unfiltered, or proportional
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
        total: baselineTotal,
        viirs: baselineViirs,
        modis: baselineModis,
        peakFrp: baselinePeakFrp,
      };
    }

    // Compute proportional scale
    const sampleTotal = allFeatures.length;
    const ratio = sampleTotal > 0 ? (vCount + mCount) / sampleTotal : 1;
    const estimatedTotal = Math.round(baselineTotal * ratio);
    const estimatedViirs = Math.round(baselineViirs * (vCount / Math.max(1, vCount + mCount || 1)) * (estimatedTotal / Math.max(1, estimatedTotal || 1)));
    const estimatedModis = Math.max(0, estimatedTotal - estimatedViirs);

    return {
      total: estimatedTotal,
      viirs: estimatedViirs,
      modis: estimatedModis,
      peakFrp: peakFrp > 0 ? peakFrp : baselinePeakFrp,
    };
  }, [
    allFeatures,
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

  // Derive monthly counts map
  const monthlyCounts: Record<number, number> = useMemo(() => {
    const counts: Record<number, number> = {
      1: 6884,
      2: 9553,
      3: 20110,
      4: 75601,
      5: 71468,
      6: 28430,
      7: 382,
      8: 512,
      9: 2190,
      10: 7420,
      11: 8940,
      12: 8875,
    };
    if (telemetry?.monthly_series) {
      for (const item of telemetry.monthly_series) {
        counts[item.month_num] = item.count;
      }
    }
    return counts;
  }, [telemetry]);

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
