"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import HimalayanCalendarHeader from "@/components/calendar/HimalayanCalendarHeader";
import HimalayanActivityMatrix, { CalendarDayItem } from "@/components/calendar/HimalayanActivityMatrix";
import HimalayanPhenologyComparison from "@/components/calendar/HimalayanPhenologyComparison";
import HimalayanDayInspector from "@/components/calendar/HimalayanDayInspector";
import HimalayanCalendarControls from "@/components/calendar/HimalayanCalendarControls";
import HimalayanCalendarExportModal from "@/components/calendar/HimalayanCalendarExportModal";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
import ModulePreviewModal from "@/components/ModulePreviewModal";

export default function HimalayanBurningCalendarPage() {
  // 1. Core Data State
  const [masterData, setMasterData] = useState<any>(null);
  const [liveDailyData, setLiveDailyData] = useState<CalendarDayItem[] | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);

  // 2. Scope & Temporal Modes
  const [scope, setScope] = useState<"uttarakhand" | "regional">("uttarakhand");
  const [yearMode, setYearMode] = useState<"2025" | "multi_year">("2025");
  const [viewMode, setViewMode] = useState<"matrix" | "comparison">("matrix");

  // 3. Filter States
  const [selectedSensor, setSelectedSensor] = useState<string | null>("ALL");
  const [selectedDaynight, setSelectedDaynight] = useState<string | null>("ALL");
  const [minFrp, setMinFrp] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  // 4. Interaction & Inspector States
  const [selectedDay, setSelectedDay] = useState<CalendarDayItem | null>(null);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(false);
  const [previewModule, setPreviewModule] = useState<string | null>(null);

  // Load precomputed master calendar data for instant zero-latency initialization
  useEffect(() => {
    async function loadMasterCalendar() {
      try {
        const res = await fetch("/data/calendar_activity_master.json");
        if (res.ok) {
          const json = await res.json();
          setMasterData(json);
        }
      } catch (err) {
        console.warn("Failed to load precomputed calendar master:", err);
      }
    }
    loadMasterCalendar();
  }, []);

  // Load telemetry summary
  useEffect(() => {
    async function loadTelemetry() {
      try {
        const res = await fetch("/data/mission_control_summary.json");
        if (res.ok) {
          const json = await res.json();
          setTelemetry(json);
        }
      } catch (err) {
        console.warn("Failed to load telemetry:", err);
      }
    }
    loadTelemetry();
  }, []);

  // Programmatic testing hooks for automated Playwright verification
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_CALENDAR_DATE = (dateStr: string) => {
        if (!masterData) return;
        const currentCal: CalendarDayItem[] = masterData[scope]?.calendar || [];
        const found = currentCal.find((d) => d.date === dateStr);
        if (found) {
          setSelectedDay(found);
        }
      };
    }
  }, [masterData, scope]);

  // Derive active baseline calendar according to current scope
  const activeScopeData = useMemo(() => {
    if (!masterData) return null;
    return masterData[scope] || masterData.uttarakhand;
  }, [masterData, scope]);

  // Compute live filtered calendar days
  const filteredDays: CalendarDayItem[] = useMemo(() => {
    if (!activeScopeData || !activeScopeData.calendar) return [];
    const baseCalendar: CalendarDayItem[] = activeScopeData.calendar;

    return baseCalendar.map((d) => {
      // If day has 0 obs, return as-is
      if (!d.has_data || d.total_obs === 0) return d;

      let obs = d.total_obs;
      let viirs = d.viirs_count;
      let modis = d.modis_count;
      let dayC = d.day_count;
      let nightC = d.night_count;

      // Sensor Filter
      if (selectedSensor === "VIIRS") {
        obs = viirs;
        modis = 0;
      } else if (selectedSensor === "MODIS") {
        obs = modis;
        viirs = 0;
      }

      // Diurnal Filter
      if (selectedDaynight === "D") {
        obs = Math.min(obs, dayC);
        nightC = 0;
      } else if (selectedDaynight === "N") {
        obs = Math.min(obs, nightC);
        dayC = 0;
      }

      // FRP Threshold Filter
      if (minFrp > 0 && d.max_frp < minFrp) {
        obs = 0;
      }

      // Month Filter
      if (selectedMonth !== null && d.month !== selectedMonth) {
        obs = 0;
      }

      // Season Filter
      if (selectedSeason === "pre_monsoon" && d.month !== 4 && d.month !== 5) {
        obs = 0;
      } else if (selectedSeason === "post_monsoon" && d.month !== 10 && d.month !== 11) {
        obs = 0;
      } else if (selectedSeason === "winter" && ![12, 1, 2, 3].includes(d.month)) {
        obs = 0;
      } else if (selectedSeason === "monsoon" && ![6, 7, 8, 9].includes(d.month)) {
        obs = 0;
      }

      const sev =
        obs === 0
          ? 0
          : obs <= 10
          ? 1
          : obs <= 40
          ? 2
          : obs <= 100
          ? 3
          : obs <= 250
          ? 4
          : 5;

      return {
        ...d,
        total_obs: obs,
        viirs_count: viirs,
        modis_count: modis,
        day_count: dayC,
        night_count: nightC,
        severity_level: sev,
        has_data: obs > 0,
      };
    });
  }, [
    activeScopeData,
    selectedSensor,
    selectedDaynight,
    minFrp,
    selectedMonth,
    selectedSeason,
  ]);

  // Aggregate stats across active filtered calendar
  const activeMetrics = useMemo(() => {
    let totalMatching = 0;
    let viirsTot = 0;
    let modisTot = 0;
    let activeDaysCount = 0;
    let peakDay: CalendarDayItem | null = null;
    let peakCount = 0;

    for (const d of filteredDays) {
      if (d.total_obs > 0) {
        totalMatching += d.total_obs;
        viirsTot += d.viirs_count;
        modisTot += d.modis_count;
        activeDaysCount++;
        if (d.total_obs > peakCount) {
          peakCount = d.total_obs;
          peakDay = d;
        }
      }
    }

    const baselineTotal = scope === "regional" ? 510299 : 240365;

    return {
      totalMatching,
      viirsTot,
      modisTot,
      activeDaysCount,
      peakDayDate: peakDay ? peakDay.date : "2025-04-26",
      peakDayCount: peakDay ? peakDay.total_obs : 383,
      peakDayFrp: peakDay ? peakDay.total_frp : 2236.48,
      baselineTotal,
    };
  }, [filteredDays, scope]);

  // Check if any filter is active
  const isFiltered =
    (selectedSensor !== null && selectedSensor !== "ALL") ||
    (selectedDaynight !== null && selectedDaynight !== "ALL") ||
    minFrp > 0 ||
    selectedMonth !== null ||
    selectedSeason !== null;

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSensor && selectedSensor !== "ALL") count++;
    if (selectedDaynight && selectedDaynight !== "ALL") count++;
    if (minFrp > 0) count++;
    if (selectedMonth !== null) count++;
    if (selectedSeason !== null) count++;
    return count;
  }, [selectedSensor, selectedDaynight, minFrp, selectedMonth, selectedSeason]);

  // Reset all filters
  const handleResetAll = useCallback(() => {
    setSelectedSensor("ALL");
    setSelectedDaynight("ALL");
    setMinFrp(0);
    setSelectedMonth(null);
    setSelectedSeason(null);
  }, []);

  // Expose calendar state to window for Playwright test assertions
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__CALENDAR_STATE = {
        scope,
        yearMode,
        viewMode,
        activeMetrics,
        selectedDay,
        selectedSensor,
        activeFilterCount,
      };
    }
  }, [
    scope,
    yearMode,
    viewMode,
    activeMetrics,
    selectedDay,
    selectedSensor,
    activeFilterCount,
  ]);

  return (
    <main className="relative min-h-screen w-full bg-[#020409] text-slate-100 select-none pb-20 overflow-x-hidden">
      {/* 1. Global Navigation Header */}
      <NavigationHeader
        activeTab="calendar"
        onOpenTelemetryDrawer={() => setIsTelemetryDrawerOpen(true)}
        onOpenModuleModal={(mod) => setPreviewModule(mod)}
      />

      {/* 2. Top Burning Activity Calendar Command Ribbon */}
      <HimalayanCalendarHeader
        scope={scope}
        onScopeChange={(newScope) => {
          setScope(newScope);
          setSelectedDay(null);
        }}
        yearMode={yearMode}
        onYearModeChange={(mode) => {
          setYearMode(mode);
          if (mode === "multi_year") {
            setViewMode("comparison");
          } else {
            setViewMode("matrix");
          }
        }}
        viewMode={viewMode}
        onViewModeChange={(vMode) => setViewMode(vMode)}
        activeFilterCount={activeFilterCount}
        isControlsOpen={isControlsOpen}
        onToggleControls={() => setIsControlsOpen(!isControlsOpen)}
        onOpenExport={() => setIsExportOpen(true)}
        totalVerifiedObs={activeMetrics.totalMatching}
        totalMultiYearObs={activeMetrics.baselineTotal}
        activeDays={activeMetrics.activeDaysCount}
        viirsCount={activeMetrics.viirsTot}
        modisCount={activeMetrics.modisTot}
        peakDayDate={activeMetrics.peakDayDate}
        peakDayCount={activeMetrics.peakDayCount}
        peakDayFrp={activeMetrics.peakDayFrp}
        onResetFilters={handleResetAll}
        isFiltered={isFiltered}
      />

      {/* 3. Main Scientific Canvas Area */}
      <section className="pt-40 sm:pt-44 px-3 sm:px-6 max-w-7xl mx-auto space-y-6">
        {viewMode === "matrix" ? (
          /* View Mode A: 12-Month Orbital Calendar Matrix */
          <HimalayanActivityMatrix
            days={filteredDays}
            selectedDate={selectedDay ? selectedDay.date : null}
            onSelectDate={(d) => setSelectedDay(d)}
            selectedMonth={selectedMonth}
            onSelectMonth={(m) => setSelectedMonth(m)}
            selectedSeason={selectedSeason}
          />
        ) : (
          /* View Mode B: Historical Phenological Comparison */
          <HimalayanPhenologyComparison
            scope={scope}
            phenologyData={
              activeScopeData?.phenology || {
                multi_year_monthly: [],
                verified_2025_monthly: [],
              }
            }
          />
        )}
      </section>

      {/* 4. Slide-over Day Specimen Inspector */}
      <HimalayanDayInspector
        day={selectedDay}
        scope={scope}
        onClose={() => setSelectedDay(null)}
        onOpenExportDate={(dStr) => setIsExportOpen(true)}
      />

      {/* 5. Slide-over Instrument Controls Drawer */}
      <HimalayanCalendarControls
        isOpen={isControlsOpen}
        onClose={() => setIsControlsOpen(false)}
        selectedSensor={selectedSensor}
        setSelectedSensor={setSelectedSensor}
        selectedDaynight={selectedDaynight}
        setSelectedDaynight={setSelectedDaynight}
        minFrp={minFrp}
        setMinFrp={setMinFrp}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedSeason={selectedSeason}
        setSelectedSeason={setSelectedSeason}
        onResetAll={handleResetAll}
        isFiltered={isFiltered}
        activeFilterCount={activeFilterCount}
      />

      {/* 6. Scientific Data Export Modal */}
      <HimalayanCalendarExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        scope={scope}
        selectedDate={selectedDay ? selectedDay.date : null}
        selectedMonth={selectedMonth}
        selectedSeason={selectedSeason}
        selectedSensor={selectedSensor}
        totalMatching={
          selectedDay
            ? selectedDay.total_obs
            : activeMetrics.totalMatching
        }
      />

      {/* 7. Shared Scientific Telemetry & Provenance Drawer */}
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

