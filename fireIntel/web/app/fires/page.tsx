"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import FireLaboratoryMap, { FireFeatureProperties } from "@/components/FireLaboratoryMap";
import FireLaboratoryHeaderBar from "@/components/FireLaboratoryHeaderBar";
import FireLaboratoryControls from "@/components/FireLaboratoryControls";
import FireTemporalDeck from "@/components/FireTemporalDeck";
import FireSpecimenInspector from "@/components/FireSpecimenInspector";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
import ModulePreviewModal from "@/components/ModulePreviewModal";

export default function FireLaboratoryPage() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>("ALL");
  const [selectedDaynight, setSelectedDaynight] = useState<string | null>("ALL");
  const [minModisConf, setMinModisConf] = useState<number>(0);
  const [viirsConfLow, setViirsConfLow] = useState<boolean>(true);
  const [viirsConfNominal, setViirsConfNominal] = useState<boolean>(true);
  const [viirsConfHigh, setViirsConfHigh] = useState<boolean>(true);
  const [minFrp, setMinFrp] = useState<number>(0);
  const [dayOfYearRange, setDayOfYearRange] = useState<[number, number] | null>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<FireFeatureProperties | null>(null);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(false);
  const [previewModule, setPreviewModule] = useState<string | null>(null);

  // Load telemetry data for monthly distributions and metadata
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

  // Load all 7,541 fire records once for immediate, deterministic reactive filtering
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
    if (!allFeatures.length) {
      return { total: 7541, viirs: 6623, modis: 918, peakFrp: 169.9 };
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
      // Min FRP filter
      if (minFrp > 0 && p.frp < minFrp) continue;
      // Month filter
      if (selectedMonth !== null && p.month !== selectedMonth) continue;
      // Day of year range filter
      if (dayOfYearRange !== null && (p.day_of_year < dayOfYearRange[0] || p.day_of_year > dayOfYearRange[1])) continue;

      // Confidence filtering
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

    return {
      total: vCount + mCount,
      viirs: vCount,
      modis: mCount,
      peakFrp: peakFrp,
    };
  }, [
    allFeatures,
    selectedSensor,
    selectedDaynight,
    minFrp,
    selectedMonth,
    dayOfYearRange,
    minModisConf,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
  ]);

  // Expose state and testing hooks for Playwright browser automation
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_FIRE_HOTSPOT = (hotspot: FireFeatureProperties) => {
        setSelectedHotspot(hotspot);
      };
      (window as any).__FIRE_LAB_STATS = filteredStats;
    }
  }, [filteredStats]);

  // Check if any filter is active
  const isFiltered =
    selectedMonth !== null ||
    (selectedSensor !== null && selectedSensor !== "ALL") ||
    (selectedDaynight !== null && selectedDaynight !== "ALL") ||
    minModisConf > 0 ||
    !viirsConfLow ||
    !viirsConfNominal ||
    !viirsConfHigh ||
    minFrp > 0 ||
    dayOfYearRange !== null;

  // Reset all filters
  const handleResetAll = () => {
    setSelectedMonth(null);
    setSelectedSensor("ALL");
    setSelectedDaynight("ALL");
    setMinModisConf(0);
    setViirsConfLow(true);
    setViirsConfNominal(true);
    setViirsConfHigh(true);
    setMinFrp(0);
    setDayOfYearRange(null);
  };

  // Derive monthly counts map
  const monthlyCounts: Record<number, number> = {};
  if (telemetry?.monthly_series) {
    for (const item of telemetry.monthly_series) {
      monthlyCounts[item.month_num] = item.count;
    }
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#030508] select-none">
      {/* 1. Global Navigation Header Capsule */}
      <NavigationHeader
        activeTab="fires"
        onOpenTelemetryDrawer={() => setIsTelemetryDrawerOpen(true)}
        onOpenModuleModal={(mod) => setPreviewModule(mod)}
      />

      {/* 2. Top-Left Floating Observation Telemetry Bar */}
      <FireLaboratoryHeaderBar filteredStats={filteredStats} />

      {/* 3. Top-Right Cartography & Decoupled Confidence Controls */}
      <FireLaboratoryControls
        selectedSensor={selectedSensor}
        setSelectedSensor={setSelectedSensor}
        selectedDaynight={selectedDaynight}
        setSelectedDaynight={setSelectedDaynight}
        minModisConf={minModisConf}
        setMinModisConf={setMinModisConf}
        viirsConfLow={viirsConfLow}
        setViirsConfLow={setViirsConfLow}
        viirsConfNominal={viirsConfNominal}
        setViirsConfNominal={setViirsConfNominal}
        viirsConfHigh={viirsConfHigh}
        setViirsConfHigh={setViirsConfHigh}
        minFrp={minFrp}
        setMinFrp={setMinFrp}
        onResetAll={handleResetAll}
        isFiltered={isFiltered}
      />

      {/* 4. Full-Screen 3D Satellite & Thermal Anomaly Map Canvas */}
      <div className="w-full h-full">
        <FireLaboratoryMap
          onHotspotSelect={(hotspot) => setSelectedHotspot(hotspot)}
          selectedMonth={selectedMonth}
          selectedSensor={selectedSensor}
          selectedDaynight={selectedDaynight}
          minModisConf={minModisConf}
          viirsConfLow={viirsConfLow}
          viirsConfNominal={viirsConfNominal}
          viirsConfHigh={viirsConfHigh}
          minFrp={minFrp}
          dayOfYearRange={dayOfYearRange}
          targetCoords={targetCoords}
        />
      </div>

      {/* 5. Bottom Temporal Exploration Deck */}
      <FireTemporalDeck
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        dayOfYearRange={dayOfYearRange}
        setDayOfYearRange={setDayOfYearRange}
        onSetMinFrp={(frp) => setMinFrp(frp)}
        monthlyCounts={monthlyCounts}
      />

      {/* 6. Contextual Hotspot Specimen Inspector (Floats in when hotspot is clicked) */}
      <FireSpecimenInspector
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
        onFlyTo={(coords) => setTargetCoords(coords)}
      />

      {/* 7. Scientific Telemetry & Provenance Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        telemetry={telemetry}
      />

      {/* 8. Module Preview Modal (For Milestone 2.2 / 2.3 roadmap items) */}
      <ModulePreviewModal
        module={previewModule}
        onClose={() => setPreviewModule(null)}
      />
    </main>
  );
}
