"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import NavigationHeader from "@/components/NavigationHeader";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
import {
  Database,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Orbit,
  Mountain,
  BarChart3,
  FileSpreadsheet,
  FileJson,
  MapPin,
  Copy,
  Check,
  Clock,
  Calendar,
  Sun,
  Moon,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

interface SummaryData {
  total_matching: number;
  modis_count: number;
  viirs_count: number;
  day_count: number;
  night_count: number;
  total_frp_mw: number;
  avg_frp_mw: number;
  max_frp_mw: number;
  date_range: { start: string; end: string };
  dataset_bounds: {
    min_date: string;
    max_date: string;
    total_dataset_records: number;
    region: string;
    spatial_envelope: string;
    crs: string;
  };
  query_execution_ms: number;
}

interface ObservationRecord {
  obs_id: number;
  latitude: number;
  longitude: number;
  brightness: number;
  bright_t31: number | null;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  acq_datetime: string;
  satellite: string;
  instrument: string;
  sensor: string;
  confidence: string;
  confidence_category: string;
  frp: number;
  daynight: string;
  detection_type: number;
  detection_description: string;
  version: string;
}

export default function DataExplorerPage() {
  // Navigation & Drawer states
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Filter States
  const [selectedSensor, setSelectedSensor] = useState<string>("ALL");
  const [selectedSatellite, setSelectedSatellite] = useState<string>("ALL");
  const [selectedDaynight, setSelectedDaynight] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("2025-01-01");
  const [endDate, setEndDate] = useState<string>("2025-12-31");
  const [minFrp, setMinFrp] = useState<string>("");
  const [maxFrp, setMaxFrp] = useState<string>("");
  const [viirsConfLow, setViirsConfLow] = useState<boolean>(true);
  const [viirsConfNominal, setViirsConfNominal] = useState<boolean>(true);
  const [viirsConfHigh, setViirsConfHigh] = useState<boolean>(true);
  const [minModisConf, setMinModisConf] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortBy, setSortBy] = useState<string>("acq_datetime");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Data & Loading States
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [isLoadingObservations, setIsLoadingObservations] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [copiedCoord, setCopiedCoord] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Build query parameter string from active filters
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedSensor !== "ALL") params.append("sensor", selectedSensor);
    if (selectedSatellite !== "ALL") params.append("satellite", selectedSatellite);
    if (selectedDaynight !== "ALL") params.append("daynight", selectedDaynight);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (minFrp !== "") params.append("min_frp", minFrp);
    if (maxFrp !== "") params.append("max_frp", maxFrp);

    // Decoupled Confidence parameters
    const viirsCats: string[] = [];
    if (viirsConfLow) viirsCats.push("l");
    if (viirsConfNominal) viirsCats.push("n");
    if (viirsConfHigh) viirsCats.push("h");
    if (viirsCats.length > 0 && viirsCats.length < 3) {
      params.append("confidence_viirs", viirsCats.join(","));
    }

    if (minModisConf > 0) {
      params.append("min_confidence_modis", minModisConf.toString());
    }

    if (searchQuery.trim()) {
      params.append("search", searchQuery.trim());
    }

    return params;
  }, [
    selectedSensor,
    selectedSatellite,
    selectedDaynight,
    startDate,
    endDate,
    minFrp,
    maxFrp,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
    minModisConf,
    searchQuery,
  ]);

  // Fetch summary stats when filters change
  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    setErrorMessage(null);
    try {
      const params = buildQueryParams();
      const res = await fetch(`/api/v1/data/summary?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to load summary");
      }
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error("Summary fetch error:", err);
      setErrorMessage(err.message || "Failed to query summary statistics");
    } finally {
      setIsLoadingSummary(false);
    }
  }, [buildQueryParams]);

  // Fetch observations table page
  const fetchObservations = useCallback(async () => {
    setIsLoadingObservations(true);
    setErrorMessage(null);
    try {
      const params = buildQueryParams();
      params.append("page", currentPage.toString());
      params.append("page_size", pageSize.toString());
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

      const res = await fetch(`/api/v1/data/observations?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to load observations");
      }
      const data = await res.json();
      setObservations(data.data || []);
      setTotalRecords(data.total_records || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      console.error("Observations fetch error:", err);
      setErrorMessage(err.message || "Failed to load observation records");
    } finally {
      setIsLoadingObservations(false);
    }
  }, [buildQueryParams, currentPage, pageSize, sortBy, sortOrder]);

  // Trigger data updates when filters, sorting, or pagination change
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  // Handle Sort column click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Quick Preset Date Ranges
  const handleDatePreset = (preset: "full" | "pre-monsoon" | "post-monsoon" | "winter") => {
    setCurrentPage(1);
    switch (preset) {
      case "full":
        setStartDate("2025-01-01");
        setEndDate("2025-12-31");
        break;
      case "pre-monsoon":
        setStartDate("2025-04-01");
        setEndDate("2025-05-31");
        break;
      case "post-monsoon":
        setStartDate("2025-10-01");
        setEndDate("2025-11-30");
        break;
      case "winter":
        setStartDate("2025-01-01");
        setEndDate("2025-02-28");
        break;
    }
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedSensor("ALL");
    setSelectedSatellite("ALL");
    setSelectedDaynight("ALL");
    setStartDate("2025-01-01");
    setEndDate("2025-12-31");
    setMinFrp("");
    setMaxFrp("");
    setViirsConfLow(true);
    setViirsConfNominal(true);
    setViirsConfHigh(true);
    setMinModisConf(0);
    setSearchQuery("");
    setCurrentPage(1);
    setSortBy("acq_datetime");
    setSortOrder("desc");
  };

  // Download Trigger calling backend export endpoint
  const handleDownload = async (format: "csv" | "json" | "geojson") => {
    setIsExporting(format);
    try {
      const params = buildQueryParams();
      params.append("format", format);
      params.append("limit", "10000");

      const exportUrl = `/api/v1/data/export?${params.toString()}`;
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }

      // Read blob and trigger browser download
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `fireintel_uttarakhand_${format}.` + (format === "geojson" ? "geojson" : format);
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Copy coordinate pair to clipboard
  const copyCoordinates = (lat: number, lon: number) => {
    const text = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoord(text);
    setTimeout(() => setCopiedCoord(null), 2000);
  };

  return (
    <main className="min-h-screen w-full bg-[#020408] text-white selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Global Navigation Header */}
      <NavigationHeader
        activeTab="data"
        onOpenTelemetryDrawer={() => setIsTelemetryDrawerOpen(true)}
      />

      <div className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto space-y-8">
        {/* 2. Hero Header & Mission Breadcrumb */}
        <section className="bg-[#040810]/85 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-cyan-500/20 shadow-[0_16px_40px_rgba(0,0,0,0.6)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 text-xs font-mono-telemetry uppercase text-cyan-400 font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>NASA SPACE APPS 2026 // SATELLITE DATA RESEARCH TERMINAL</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <Database className="w-8 h-8 text-cyan-400" />
                <span>NASA FIRMS Observation Explorer</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed font-light">
                Empirical active fire radiometric observations for Uttarakhand, India (2025 baseline).
                Independently inspect, filter with decoupled sensor semantics, and export verified datasets in CSV, JSON, and GeoJSON.
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white/[0.03] border border-white/10 rounded-full px-3.5 py-1.5 text-xs font-mono-telemetry text-slate-300 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Survey of India Validated (53,483 km²)</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-3.5 py-1.5 text-xs font-mono-telemetry text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>7,541 Boundary Validated Records</span>
              </div>
            </div>
          </div>

          {/* Scientific Notice Banner */}
          <div className="rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-amber-950/20 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold uppercase tracking-wider text-xs font-mono-telemetry">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Scientific Remote Sensing Guardrails &amp; Semantics</span>
            </div>
            <p className="font-light">
              <strong className="text-white font-medium">Observational Unit Semantics:</strong> Each record represents an automated satellite thermal pixel detection (MODIS 1 km, VIIRS 375 m), not a confirmed unique wildfire incident.
              <strong className="text-white font-medium ml-2">Radiative Energetics:</strong> FRP is instantaneous Fire Radiative Power in Megawatts (MW), not burned area.
              <strong className="text-white font-medium ml-2">Decoupled Confidence:</strong> MODIS confidence is continuous (0–100%), whereas VIIRS confidence is categorical (low/nominal/high) — they are mathematically distinct and never merged.
            </p>
          </div>
        </section>

        {/* 3. Live Filter Summary HUD Cards */}
        <section aria-label="Filtered Data Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Observations */}
          <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400">
              <span className="uppercase">Matching Detections</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono-telemetry">
              {isLoadingSummary ? (
                <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
              ) : (
                summary?.total_matching.toLocaleString() ?? "0"
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>of 7,541 total</span>
              <span className="text-cyan-400 font-mono-telemetry">
                {summary ? ((summary.total_matching / 7541) * 100).toFixed(1) : 0}% of baseline
              </span>
            </div>
          </div>

          {/* Card 2: Sensor Breakdown */}
          <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400">
              <span className="uppercase">Sensors (VIIRS / MODIS)</span>
              <Orbit className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 font-mono-telemetry">
              <span className="text-2xl font-bold text-amber-400">
                {isLoadingSummary ? "--" : summary?.viirs_count.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">VIIRS</span>
              <span className="text-slate-600">/</span>
              <span className="text-xl font-bold text-sky-400">
                {isLoadingSummary ? "--" : summary?.modis_count.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">MODIS</span>
            </div>
            <div className="text-xs text-slate-400">
              {summary && summary.modis_count > 0 ? (
                <span>Ratio: {(summary.viirs_count / summary.modis_count).toFixed(2)}x VIIRS resolution advantage</span>
              ) : (
                <span>Single sensor view</span>
              )}
            </div>
          </div>

          {/* Card 3: Radiative Energetics */}
          <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400">
              <span className="uppercase">Radiative Power (MW)</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono-telemetry">
              {isLoadingSummary ? (
                <div className="h-7 w-28 bg-white/10 rounded animate-pulse" />
              ) : (
                `${summary?.total_frp_mw.toLocaleString() ?? "0"} MW`
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between font-mono-telemetry">
              <span>Avg: {summary?.avg_frp_mw ?? 0} MW</span>
              <span className="text-amber-400">Peak: {summary?.max_frp_mw ?? 0} MW</span>
            </div>
          </div>

          {/* Card 4: Diurnal & Window */}
          <div className="bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.08] shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-telemetry text-slate-400">
              <span className="uppercase">Diurnal Split &amp; Time</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-3 text-xs font-mono-telemetry pt-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Day: {summary?.day_count ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Night: {summary?.night_count ?? 0}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-telemetry truncate">
              {summary?.date_range.start} → {summary?.date_range.end}
            </div>
          </div>
        </section>

        {/* 4. Interactive Filter Panel */}
        <section aria-label="Data Filter Controls" className="bg-[#040810]/85 backdrop-blur-xl rounded-3xl p-6 border border-cyan-500/20 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white uppercase tracking-wider font-mono-telemetry">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span>Multi-Dimensional Telemetry Filters</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono-telemetry text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Reset all filters to full 2025 baseline"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>

          {/* Filter Rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Filter 1: Sensor & Platform */}
            <div className="space-y-2">
              <label className="text-xs font-mono-telemetry uppercase text-slate-400 flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sensor Instrument</span>
              </label>
              <select
                value={selectedSensor}
                onChange={(e) => {
                  setSelectedSensor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry cursor-pointer"
              >
                <option value="ALL">All Sensors (MODIS + VIIRS)</option>
                <option value="VIIRS">VIIRS (Suomi-NPP) [375m]</option>
                <option value="MODIS">MODIS (Terra &amp; Aqua) [1km]</option>
              </select>

              <div className="text-[11px] text-slate-500 font-mono-telemetry">
                MODIS: 918 records • VIIRS: 6,623 records
              </div>
            </div>

            {/* Filter 2: Satellite Platform */}
            <div className="space-y-2">
              <label className="text-xs font-mono-telemetry uppercase text-slate-400 flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-cyan-400" />
                <span>Satellite Platform</span>
              </label>
              <select
                value={selectedSatellite}
                onChange={(e) => {
                  setSelectedSatellite(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry cursor-pointer"
              >
                <option value="ALL">All Satellite Platforms</option>
                <option value="SNPP">Suomi-NPP (VIIRS)</option>
                <option value="Aqua">Aqua (MODIS PM)</option>
                <option value="Terra">Terra (MODIS AM)</option>
              </select>

              <div className="text-[11px] text-slate-500 font-mono-telemetry">
                Aqua: 684 • Terra: 234 • SNPP: 6,623
              </div>
            </div>

            {/* Filter 3: Overpass (Day / Night) */}
            <div className="space-y-2">
              <label className="text-xs font-mono-telemetry uppercase text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Diurnal Overpass</span>
              </label>
              <select
                value={selectedDaynight}
                onChange={(e) => {
                  setSelectedDaynight(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry cursor-pointer"
              >
                <option value="ALL">All Passes (Day + Night)</option>
                <option value="D">Daytime Passes Only (Solar)</option>
                <option value="N">Nighttime Passes Only (Nocturnal)</option>
              </select>

              <div className="text-[11px] text-slate-500 font-mono-telemetry">
                Day: 4,911 • Night: 2,630
              </div>
            </div>

            {/* Filter 4: FRP Thresholds (MW) */}
            <div className="space-y-2">
              <label className="text-xs font-mono-telemetry uppercase text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>FRP Limits (MW)</span>
                </span>
                <span className="text-[11px] text-slate-500">Max 169.9 MW</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  max="170"
                  step="0.5"
                  placeholder="Min FRP"
                  value={minFrp}
                  onChange={(e) => {
                    setMinFrp(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry"
                />
                <input
                  type="number"
                  min="0"
                  max="170"
                  step="0.5"
                  placeholder="Max FRP"
                  value={maxFrp}
                  onChange={(e) => {
                    setMaxFrp(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry"
                />
              </div>
              <div className="text-[11px] text-slate-500 font-mono-telemetry">
                Leave blank for unconstrained range
              </div>
            </div>
          </div>

          {/* Row 2: Date Range & Decoupled Confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-white/5">
            {/* Date Range Selection & Presets */}
            <div className="space-y-3">
              <label className="text-xs font-mono-telemetry uppercase text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Observation Window (2025 Study Period)</span>
                </span>
                <span className="text-[11px] text-slate-500">Available: Jan 01 – Dec 31, 2025</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono-telemetry">Start Date</span>
                  <input
                    type="date"
                    min="2025-01-01"
                    max="2025-12-31"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono-telemetry">End Date</span>
                  <input
                    type="date"
                    min="2025-01-01"
                    max="2025-12-31"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#03060c] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry mt-1"
                  />
                </div>
              </div>

              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono-telemetry mr-1">Presets:</span>
                <button
                  onClick={() => handleDatePreset("full")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono-telemetry bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  Full 2025
                </button>
                <button
                  onClick={() => handleDatePreset("pre-monsoon")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono-telemetry bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors"
                >
                  Pre-Monsoon Peak (Apr–May)
                </button>
                <button
                  onClick={() => handleDatePreset("post-monsoon")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono-telemetry bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-colors"
                >
                  Post-Monsoon (Oct–Nov)
                </button>
                <button
                  onClick={() => handleDatePreset("winter")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono-telemetry bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 transition-colors"
                >
                  Winter (Jan–Feb)
                </button>
              </div>
            </div>

            {/* Decoupled Sensor Confidence Controls */}
            <div className="space-y-3">
              <label className="text-xs font-mono-telemetry uppercase text-slate-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Decoupled Sensor Confidence Filtering</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-2xl bg-black/40 border border-white/10">
                {/* VIIRS Categorical */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 font-mono-telemetry">
                    <span>VIIRS Categories</span>
                    <span className="text-[10px] text-slate-500">l / n / h</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viirsConfLow}
                        onChange={(e) => {
                          setViirsConfLow(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span>Low (559 obs)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viirsConfNominal}
                        onChange={(e) => {
                          setViirsConfNominal(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span>Nominal (5,974 obs)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={viirsConfHigh}
                        onChange={(e) => {
                          setViirsConfHigh(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span>High (90 obs)</span>
                    </label>
                  </div>
                </div>

                {/* MODIS Numeric */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-400 font-mono-telemetry">
                    <span>MODIS Continuous</span>
                    <span>{minModisConf}%+</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minModisConf}
                    onChange={(e) => {
                      setMinModisConf(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono-telemetry">
                    <span>0% (All 918)</span>
                    <span>50% (Standard)</span>
                    <span>80%+ (High)</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono-telemetry">
                * Filters are applied independently to their respective sensors.
              </div>
            </div>
          </div>
        </section>

        {/* 5. Export Action Hub */}
        <section aria-label="Dataset Export Hub" className="bg-[#040810]/85 backdrop-blur-xl rounded-3xl p-6 border border-cyan-500/20 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-telemetry uppercase text-emerald-400">
                <Download className="w-3.5 h-3.5" />
                <span>Verified Scientific Export Hub</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Download Filtered Observations ({summary?.total_matching.toLocaleString() ?? "0"} Records)
              </h2>
            </div>
            <div className="text-xs text-slate-400 font-mono-telemetry">
              Format includes authentic metadata, provenance manifest, and CRS EPSG:4326.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Format 1: CSV */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-telemetry font-bold text-emerald-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>CSV / Tabular Format</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-mono-telemetry">
                    Formula-Protected
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Standard tabular export with sanitized formula injection defense, metadata comment header, and timestamps.
                </p>
              </div>
              <button
                onClick={() => handleDownload("csv")}
                disabled={isExporting !== null || !summary?.total_matching}
                className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono-telemetry text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isExporting === "csv" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export CSV Dataset</span>
              </button>
            </div>

            {/* Format 2: JSON */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3 hover:border-cyan-500/40 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-telemetry font-bold text-cyan-400 flex items-center gap-1.5">
                    <FileJson className="w-4 h-4" />
                    <span>JSON Manifest + Records</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono-telemetry">
                    Structured Schema
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Complete JSON package containing top-level scientific limitations manifest, CRS documentation, and records array.
                </p>
              </div>
              <button
                onClick={() => handleDownload("json")}
                disabled={isExporting !== null || !summary?.total_matching}
                className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono-telemetry text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isExporting === "json" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export JSON Package</span>
              </button>
            </div>

            {/* Format 3: GeoJSON */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3 hover:border-sky-500/40 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-telemetry font-bold text-sky-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>GeoJSON Cartography</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-mono-telemetry">
                    RFC 7946 (EPSG:4326)
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  FeatureCollection with Point geometry formatted in strict [longitude, latitude] coordinate order for GIS &amp; QGIS.
                </p>
              </div>
              <button
                onClick={() => handleDownload("geojson")}
                disabled={isExporting !== null || !summary?.total_matching}
                className="w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-mono-telemetry text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isExporting === "geojson" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export GeoJSON Layer</span>
              </button>
            </div>
          </div>
        </section>

        {/* 6. Polished Paginated Observation Table */}
        <section aria-label="Observation Data Table" className="bg-[#040810]/85 backdrop-blur-xl rounded-3xl p-6 border border-cyan-500/20 shadow-xl space-y-5">
          {/* Table Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search observation attributes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#03060c] border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry"
                />
              </div>

              <span className="text-xs font-mono-telemetry text-slate-400 hidden sm:inline">
                Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{" "}
                {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords.toLocaleString()} records
              </span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs font-mono-telemetry text-slate-400">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#03060c] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono-telemetry cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-mono-telemetry flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={fetchObservations} className="underline hover:text-white cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] font-mono-telemetry text-[11px] text-slate-400 uppercase tracking-wider select-none">
                  <th
                    onClick={() => handleSort("acq_datetime")}
                    className="p-3.5 hover:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date &amp; Time (UTC)</span>
                      {sortBy === "acq_datetime" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("latitude")}
                    className="p-3.5 hover:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Coordinates</span>
                      {sortBy === "latitude" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("sensor")}
                    className="p-3.5 hover:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Sensor &amp; Satellite</span>
                      {sortBy === "sensor" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("frp")}
                    className="p-3.5 hover:text-white cursor-pointer transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>FRP (MW)</span>
                      {sortBy === "frp" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("brightness")}
                    className="p-3.5 hover:text-white cursor-pointer transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Brightness (K)</span>
                      {sortBy === "brightness" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>

                  <th className="p-3.5 text-center">Overpass</th>
                  <th className="p-3.5">Confidence</th>
                  <th className="p-3.5">Detection Classification</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 font-mono-telemetry">
                {isLoadingObservations ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="p-3.5">
                        <div className="h-4 bg-white/5 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : observations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 space-y-3">
                      <Database className="w-8 h-8 mx-auto text-slate-600" />
                      <div className="text-sm font-semibold text-white">No Matching Observations Found</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        No active fire thermal anomalies in the Uttarakhand 2025 dataset matched your current filter combinations. Try loosening the date range or FRP limits.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  observations.map((obs) => {
                    const isModis = obs.sensor === "MODIS";
                    const frpVal = obs.frp;

                    return (
                      <tr
                        key={obs.obs_id}
                        data-sensor={obs.sensor}
                        className="hover:bg-white/[0.04] transition-colors group observation-row"
                      >
                        {/* Date & Time */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-semibold text-white">{obs.acq_date}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{obs.acq_time} UTC</span>
                          </div>
                        </td>

                        {/* Coordinates */}
                        <td className="p-3.5 whitespace-nowrap">
                          <button
                            onClick={() => copyCoordinates(obs.latitude, obs.longitude)}
                            className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Click to copy coordinates"
                          >
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            <span>
                              {obs.latitude.toFixed(4)}°N, {obs.longitude.toFixed(4)}°E
                            </span>
                            {copiedCoord === `${obs.latitude.toFixed(5)}, ${obs.longitude.toFixed(5)}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity" />
                            )}
                          </button>
                        </td>

                        {/* Sensor & Satellite */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isModis
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {obs.sensor}
                            </span>
                            <span className="text-slate-300 text-xs">
                              {obs.satellite} ({isModis ? "1km" : "375m"})
                            </span>
                          </div>
                        </td>

                        {/* FRP (MW) */}
                        <td className="p-3.5 whitespace-nowrap text-right">
                          <span
                            className={`font-bold ${
                              frpVal > 50
                                ? "text-purple-300"
                                : frpVal > 20
                                ? "text-amber-400"
                                : "text-white"
                            }`}
                          >
                            {frpVal.toFixed(2)} MW
                          </span>
                        </td>

                        {/* Brightness (K) */}
                        <td className="p-3.5 whitespace-nowrap text-right text-slate-300">
                          {obs.brightness.toFixed(1)} K
                        </td>

                        {/* Overpass (Day / Night) */}
                        <td className="p-3.5 whitespace-nowrap text-center">
                          {obs.daynight === "D" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Sun className="w-2.5 h-2.5 text-amber-400" />
                              <span>Day</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              <Moon className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Night</span>
                            </span>
                          )}
                        </td>

                        {/* Confidence */}
                        <td className="p-3.5 whitespace-nowrap">
                          {isModis ? (
                            <span className="text-xs font-semibold text-amber-300">
                              {obs.confidence_category}
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                                obs.confidence === "h"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : obs.confidence === "l"
                                  ? "bg-slate-700/50 text-slate-400 border border-slate-600"
                                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}
                            >
                              {obs.confidence_category}
                            </span>
                          )}
                        </td>

                        {/* Classification */}
                        <td className="p-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {obs.detection_description}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 font-mono-telemetry text-xs">
              <div className="text-slate-400">
                Page <span className="text-white font-bold current-page-num">{currentPage}</span> of{" "}
                <span className="text-white font-bold total-pages-num">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Numbered Jump Buttons */}
                <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  {currentPage}
                </span>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 7. Methodology & Provenance Quick Footer */}
        <footer className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono-telemetry text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>NASA Space Apps 2026 • Verified Scientific Telemetry Baseline</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/fires" className="text-amber-400 hover:text-amber-300 transition-colors">
              Fire Intelligence Lab →
            </Link>
            <Link href="/methodology" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Read Scientific Methodology →
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
