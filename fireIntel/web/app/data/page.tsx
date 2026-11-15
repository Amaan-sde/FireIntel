"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Terminal,
  Activity,
  Radio,
  Compass,
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

  // Live Terminal Session Timer & UTC Clock
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [utcTime, setUtcTime] = useState("");

  // Subtle Mouse Parallax state (desktop only)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  const formatSessionTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, "0");
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

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

  // Telemetry flash state when values update
  const [telemetryPulse, setTelemetryPulse] = useState(false);
  const prevMatchingRef = useRef<number | null>(null);

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

      if (prevMatchingRef.current !== null && prevMatchingRef.current !== data.total_matching) {
        setTelemetryPulse(true);
        setTimeout(() => setTelemetryPulse(false), 600);
      }
      prevMatchingRef.current = data.total_matching;
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
    <main className="relative min-h-screen w-full bg-[#080A0D] text-[#F2F0E9] selection:bg-[#C6A66B]/30 selection:text-[#F2F0E9] overflow-x-hidden">
      {/* =========================================================================
          PAGE-SPECIFIC SCOPED STYLES & SUBTLE ANIMATIONS
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
        @keyframes scientificScanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fireTelemetryGlow {
          0% { color: #E0783D; text-shadow: 0 0 0 transparent; }
          50% { color: #F2F0E9; text-shadow: 0 0 16px rgba(224, 120, 61, 0.6); }
          100% { color: #E0783D; text-shadow: 0 0 0 transparent; }
        }
        .anim-star-drift {
          animation: cosmicStarDrift 45s ease-in-out infinite;
        }
        .anim-nebula-pulse {
          animation: cosmicNebulaBreathe 18s ease-in-out infinite;
        }
        .anim-scanline {
          animation: scientificScanline 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .telemetry-update-active {
          animation: fireTelemetryGlow 0.6s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-star-drift, .anim-nebula-pulse, .anim-scanline, .telemetry-update-active {
            animation: none !important;
          }
        }
      `}</style>

      {/* =========================================================================
          CINEMATIC SPACE BACKGROUND — OBSIDIAN COSMIC
          Deep obsidian darkness, midnight navy atmosphere, subtle cosmic-blue gradients,
          champagne-gold ambient accents, and slowly drifting stellar field
          ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Layer 1: Obsidian Black & Deep Graphite Base */}
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
          {/* Subtle stellar points in Warm Ivory, Ice Blue, and Champagne Gold */}
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

        {/* Layer 5: Technical Sub-Grid Hairlines & Edge Vignette */}
        <div
          className="absolute inset-0 opacity-[0.03]"
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
        activeTab="data"
        onOpenTelemetryDrawer={() => setIsTelemetryDrawerOpen(true)}
      />

      <div className="relative z-10 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 md:px-10 max-w-7xl mx-auto space-y-9">
        {/* =========================================================================
            2. HEADER — REFINED OBSIDIAN COSMIC EDITORIAL INTRODUCTION
            Open aerospace research introduction, elegant typography, live session clock
            ========================================================================= */}
        <section aria-label="Terminal Identification" className="space-y-6">
          {/* Top Aerospace Metadata Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] border-b border-[#222B38] pb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-[#91BBD5] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C6A66B] animate-pulse" />
                <span>NASA SPACE APPS 2026 // SATELLITE DATA RESEARCH TERMINAL</span>
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
              <div className="bg-[#111418] border border-[#222B38] rounded px-2.5 py-1 text-[11px] font-mono-telemetry text-[#91BBD5] flex items-center gap-1.5 shadow-sm">
                <MapPin className="w-3 h-3 text-[#477DA5]" />
                <span>Survey of India Validated (53,483 km²)</span>
              </div>
              <div className="bg-[#111418] border border-[#222B38] rounded px-2.5 py-1 text-[11px] font-mono-telemetry text-[#C6A66B] flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-[#C6A66B]" />
                <span>7,541 Boundary Validated Records</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111418] border border-[#222B38] text-[11px] font-mono-telemetry text-[#F2F0E9]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#477DA5] animate-pulse" />
                <span>LIVE API</span>
              </div>
            </div>
          </div>

          {/* Title & Editorial Deck */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-1">
            <div className="space-y-2.5 max-w-4xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F2F0E9] flex items-center gap-3.5">
                <Database className="w-8 h-8 sm:w-9 sm:h-9 text-[#C6A66B] shrink-0" />
                <span>NASA FIRMS Observation Explorer</span>
              </h1>
              <p className="text-sm sm:text-base text-[#9299A1] leading-relaxed font-normal">
                Explore, analyze and interpret satellite-based fire observations through NASA FIRMS datasets. Empirical active fire radiometric observations for Uttarakhand, India (2025 baseline). Independently inspect, filter with decoupled sensor semantics, and export verified datasets in CSV, JSON, and GeoJSON.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded bg-[#111418] hover:bg-[#101B2B] text-xs font-mono-telemetry text-[#F2F0E9] border border-[#222B38] hover:border-[#C6A66B] transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(198,166,107,0.15)]"
                title="Reset all filters to full 2025 baseline"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              3. SCIENTIFIC SEMANTICS SECTION — FLAT EDITORIAL PANEL
              Graphite & Midnight-Navy flat panel with thin Champagne-Gold accent
              ========================================================================= */}
          <div className="rounded-lg p-5 border border-[#222B38] border-l-4 border-l-[#C6A66B] bg-[#111418] shadow-md space-y-2.5 transition-colors">
            <div className="flex items-center gap-2 text-[#C6A66B] font-semibold uppercase tracking-wider text-xs font-mono-telemetry">
              <AlertTriangle className="w-4 h-4 text-[#C6A66B] shrink-0" />
              <span>Scientific Remote Sensing Guardrails &amp; Semantics</span>
            </div>
            <div className="text-xs sm:text-[13px] text-[#9299A1] leading-relaxed space-y-1.5 font-normal">
              <p>
                <strong className="text-[#F2F0E9] font-medium">Observational Unit Semantics:</strong> Each record represents an automated satellite thermal pixel detection (MODIS 1 km, VIIRS 375 m), not a confirmed unique wildfire incident.
                <strong className="text-[#F2F0E9] font-medium ml-2">Radiative Energetics:</strong> FRP is instantaneous Fire Radiative Power in Megawatts (MW), not burned area.
                <strong className="text-[#F2F0E9] font-medium ml-2">Decoupled Confidence:</strong> MODIS confidence is continuous (0–100%), whereas VIIRS confidence is categorical (low/nominal/high) — they are mathematically distinct and never merged.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. HORIZONTAL TELEMETRY STRIP — SCIENTIFIC RESEARCH READOUT
            Replaces repetitive cards with an integrated, reactive telemetry instrument bar
            ========================================================================= */}
        <section
          aria-label="Filtered Data Summary"
          className="relative rounded-lg bg-[#111418] border border-[#222B38] shadow-xl overflow-hidden transition-all duration-300"
        >
          {/* Subtle Scanning Indicator when loading */}
          {isLoadingSummary && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C6A66B] to-transparent anim-scanline z-20" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#222B38]">
            {/* Metric 01: Matching Detections */}
            <div className="p-5 sm:p-6 space-y-2 bg-[#111418] hover:bg-[#101B2B]/70 transition-colors duration-250">
              <div className="flex items-center justify-between text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1]">
                <span>01 // MATCHING DETECTIONS</span>
                <Flame className="w-3.5 h-3.5 text-[#E0783D]" />
              </div>
              <div className={`text-3xl font-bold font-mono-telemetry tracking-tight text-[#F2F0E9] ${telemetryPulse ? "telemetry-update-active" : ""}`}>
                {isLoadingSummary ? (
                  <div className="h-9 w-24 bg-[#101B2B] rounded animate-pulse" />
                ) : (
                  summary?.total_matching.toLocaleString() ?? "0"
                )}
              </div>
              <div className="text-xs text-[#9299A1] flex items-center justify-between font-mono-telemetry">
                <span>of 7,541 total</span>
                <span className="text-[#C6A66B] font-medium">
                  {summary ? ((summary.total_matching / 7541) * 100).toFixed(1) : 0}% of baseline
                </span>
              </div>
            </div>

            {/* Metric 02: Sensors Breakdown & Ratio */}
            <div className="p-5 sm:p-6 space-y-2 bg-[#111418] hover:bg-[#101B2B]/70 transition-colors duration-250">
              <div className="flex items-center justify-between text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1]">
                <span>02 // SENSORS (VIIRS / MODIS)</span>
                <Orbit className="w-3.5 h-3.5 text-[#477DA5]" />
              </div>
              <div className="flex items-baseline gap-2 font-mono-telemetry pt-0.5">
                <span className="text-2xl font-bold text-[#F2F0E9]">
                  {isLoadingSummary ? "--" : summary?.viirs_count.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#9299A1]">VIIRS</span>
                <span className="text-[#222B38]">/</span>
                <span className="text-2xl font-bold text-[#C6A66B]">
                  {isLoadingSummary ? "--" : summary?.modis_count.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#9299A1]">MODIS</span>
              </div>
              <div className="text-xs text-[#9299A1] font-mono-telemetry">
                {summary && summary.modis_count > 0 ? (
                  <span>Ratio: {(summary.viirs_count / summary.modis_count).toFixed(2)}× VIIRS advantage</span>
                ) : (
                  <span>Single sensor observation</span>
                )}
              </div>
            </div>

            {/* Metric 03: Radiative Energetics (MW) */}
            <div className="p-5 sm:p-6 space-y-2 bg-[#111418] hover:bg-[#101B2B]/70 transition-colors duration-250">
              <div className="flex items-center justify-between text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1]">
                <span>03 // RADIATIVE POWER (MW)</span>
                <Sparkles className="w-3.5 h-3.5 text-[#E0783D]" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#E0783D] font-mono-telemetry tracking-tight">
                {isLoadingSummary ? (
                  <div className="h-9 w-28 bg-[#101B2B] rounded animate-pulse" />
                ) : (
                  `${summary?.total_frp_mw.toLocaleString() ?? "0"} MW`
                )}
              </div>
              <div className="text-xs text-[#9299A1] flex items-center justify-between font-mono-telemetry">
                <span>Avg: {summary?.avg_frp_mw ?? 0} MW</span>
                <span className="text-[#C6A66B]">Peak: {summary?.max_frp_mw ?? 0} MW</span>
              </div>
            </div>

            {/* Metric 04: Diurnal Split & Temporal Window */}
            <div className="p-5 sm:p-6 space-y-2 bg-[#111418] hover:bg-[#101B2B]/70 transition-colors duration-250">
              <div className="flex items-center justify-between text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1]">
                <span>04 // DIURNAL SPLIT &amp; WINDOW</span>
                <Sun className="w-3.5 h-3.5 text-[#C6A66B]" />
              </div>
              <div className="flex items-center gap-3 text-xs font-mono-telemetry pt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101B2B] border border-[#222B38] text-[#F2F0E9]">
                  <Sun className="w-3 h-3 text-[#C6A66B]" />
                  <span>Day: {summary?.day_count ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101B2B] border border-[#222B38] text-[#91BBD5]">
                  <Moon className="w-3 h-3 text-[#477DA5]" />
                  <span>Night: {summary?.night_count ?? 0}</span>
                </div>
              </div>
              <div className="text-[11px] text-[#9299A1] font-mono-telemetry truncate">
                {summary?.date_range.start} → {summary?.date_range.end}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. FILTER WORKSPACE — SATELLITE INSTRUMENT CONTROL CONSOLE
            Refined control panel with graphite and midnight-navy surfaces
            ========================================================================= */}
        <section
          aria-label="Data Filter Controls"
          className="rounded-lg bg-[#111418] border border-[#222B38] shadow-xl p-6 sm:p-7 space-y-6"
        >
          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222B38] pb-4">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#F2F0E9] uppercase tracking-wider font-mono-telemetry">
              <Filter className="w-4 h-4 text-[#C6A66B]" />
              <span>Multi-Dimensional Telemetry Filters</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded text-xs font-mono-telemetry text-[#9299A1] hover:text-[#F2F0E9] bg-[#080A0D] hover:bg-[#101B2B] border border-[#222B38] hover:border-[#C6A66B] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Reset all filters to full 2025 baseline"
              >
                <RefreshCw className="w-3 h-3 text-[#C6A66B]" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>

          {/* Primary Channel Selectors (Row 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Filter 1: Sensor Instrument */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-[#477DA5]" />
                <span>Sensor Instrument</span>
              </label>
              <select
                value={selectedSensor}
                onChange={(e) => {
                  setSelectedSensor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#080A0D] border border-[#222B38] hover:border-[#477DA5]/60 focus:border-[#C6A66B] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry cursor-pointer transition-colors duration-200"
              >
                <option value="ALL">All Sensors (MODIS + VIIRS)</option>
                <option value="VIIRS">VIIRS (Suomi-NPP) [375m]</option>
                <option value="MODIS">MODIS (Terra &amp; Aqua) [1km]</option>
              </select>
              <div className="text-[11px] text-[#9299A1] font-mono-telemetry">
                MODIS: 918 records • VIIRS: 6,623 records
              </div>
            </div>

            {/* Filter 2: Satellite Platform */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span>Satellite Platform</span>
              </label>
              <select
                value={selectedSatellite}
                onChange={(e) => {
                  setSelectedSatellite(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#080A0D] border border-[#222B38] hover:border-[#477DA5]/60 focus:border-[#C6A66B] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry cursor-pointer transition-colors duration-200"
              >
                <option value="ALL">All Satellite Platforms</option>
                <option value="SNPP">Suomi-NPP (VIIRS)</option>
                <option value="Aqua">Aqua (MODIS PM)</option>
                <option value="Terra">Terra (MODIS AM)</option>
              </select>
              <div className="text-[11px] text-[#9299A1] font-mono-telemetry">
                Aqua: 684 • Terra: 234 • SNPP: 6,623
              </div>
            </div>

            {/* Filter 3: Diurnal Overpass */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span>Diurnal Overpass</span>
              </label>
              <select
                value={selectedDaynight}
                onChange={(e) => {
                  setSelectedDaynight(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#080A0D] border border-[#222B38] hover:border-[#477DA5]/60 focus:border-[#C6A66B] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry cursor-pointer transition-colors duration-200"
              >
                <option value="ALL">All Passes (Day + Night)</option>
                <option value="D">Daytime Passes Only (Solar)</option>
                <option value="N">Nighttime Passes Only (Nocturnal)</option>
              </select>
              <div className="text-[11px] text-[#9299A1] font-mono-telemetry">
                Day: 4,911 • Night: 2,630
              </div>
            </div>

            {/* Filter 4: FRP Limits (MW) */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#E0783D]" />
                  <span>FRP Limits (MW)</span>
                </span>
                <span className="text-[10px] text-[#C6A66B]">Max 169.9 MW</span>
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
                  className="w-full bg-[#080A0D] border border-[#222B38] focus:border-[#E0783D] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry placeholder:text-[#9299A1]/40 transition-colors duration-200"
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
                  className="w-full bg-[#080A0D] border border-[#222B38] focus:border-[#E0783D] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry placeholder:text-[#9299A1]/40 transition-colors duration-200"
                />
              </div>
              <div className="text-[11px] text-[#9299A1] font-mono-telemetry">
                Leave blank for unconstrained range
              </div>
            </div>
          </div>

          {/* Temporal Window & Decoupled Confidence (Row 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5 border-t border-[#222B38]">
            {/* Left: Observation Window & Seasonal Presets */}
            <div className="space-y-3">
              <label className="text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span>Observation Window (2025 Study Period)</span>
                </span>
                <span className="text-[10px] text-[#9299A1]">Available: Jan 01 – Dec 31, 2025</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[#9299A1] uppercase font-mono-telemetry">Start Date</span>
                  <input
                    type="date"
                    min="2025-01-01"
                    max="2025-12-31"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#080A0D] border border-[#222B38] focus:border-[#C6A66B] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry mt-1 transition-colors duration-200"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#9299A1] uppercase font-mono-telemetry">End Date</span>
                  <input
                    type="date"
                    min="2025-01-01"
                    max="2025-12-31"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[#080A0D] border border-[#222B38] focus:border-[#C6A66B] rounded px-3 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry mt-1 transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#9299A1] uppercase font-mono-telemetry mr-1">Presets:</span>
                <button
                  onClick={() => handleDatePreset("full")}
                  className="px-2.5 py-1 rounded text-[11px] font-mono-telemetry bg-[#080A0D] hover:bg-[#101B2B] text-[#9299A1] hover:text-[#F2F0E9] border border-[#222B38] transition-colors duration-200 cursor-pointer"
                >
                  Full 2025
                </button>
                <button
                  onClick={() => handleDatePreset("pre-monsoon")}
                  className="px-2.5 py-1 rounded text-[11px] font-mono-telemetry bg-[#101B2B] hover:bg-[#193653]/60 text-[#E0783D] border border-[#E0783D]/40 transition-colors duration-200 cursor-pointer font-medium"
                >
                  Pre-Monsoon Peak (Apr–May)
                </button>
                <button
                  onClick={() => handleDatePreset("post-monsoon")}
                  className="px-2.5 py-1 rounded text-[11px] font-mono-telemetry bg-[#080A0D] hover:bg-[#101B2B] text-[#91BBD5] border border-[#477DA5]/40 transition-colors duration-200 cursor-pointer"
                >
                  Post-Monsoon (Oct–Nov)
                </button>
                <button
                  onClick={() => handleDatePreset("winter")}
                  className="px-2.5 py-1 rounded text-[11px] font-mono-telemetry bg-[#080A0D] hover:bg-[#101B2B] text-[#C6A66B] border border-[#C6A66B]/40 transition-colors duration-200 cursor-pointer"
                >
                  Winter (Jan–Feb)
                </button>
              </div>
            </div>

            {/* Right: Decoupled Sensor Confidence Filtering */}
            <div className="space-y-3">
              <label className="text-[11px] font-mono-telemetry uppercase tracking-wider text-[#9299A1] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C6A66B]" />
                <span>Decoupled Sensor Confidence Filtering</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded bg-[#080A0D] border border-[#222B38]">
                {/* VIIRS Categorical */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#477DA5] font-mono-telemetry">
                    <span>VIIRS Categories</span>
                    <span className="text-[10px] text-[#9299A1]">l / n / h</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-[#9299A1] hover:text-[#F2F0E9] cursor-pointer transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={viirsConfLow}
                        onChange={(e) => {
                          setViirsConfLow(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-[#222B38] bg-[#111418] text-[#C6A66B] focus:ring-0 cursor-pointer"
                      />
                      <span>Low (559 obs)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#9299A1] hover:text-[#F2F0E9] cursor-pointer transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={viirsConfNominal}
                        onChange={(e) => {
                          setViirsConfNominal(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-[#222B38] bg-[#111418] text-[#C6A66B] focus:ring-0 cursor-pointer"
                      />
                      <span>Nominal (5,974 obs)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#9299A1] hover:text-[#F2F0E9] cursor-pointer transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={viirsConfHigh}
                        onChange={(e) => {
                          setViirsConfHigh(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="rounded border-[#222B38] bg-[#111418] text-[#C6A66B] focus:ring-0 cursor-pointer"
                      />
                      <span>High (90 obs)</span>
                    </label>
                  </div>
                </div>

                {/* MODIS Numeric Continuous */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#C6A66B] font-mono-telemetry">
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
                    className="w-full accent-[#C6A66B] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#9299A1] font-mono-telemetry">
                    <span>0% (All 918)</span>
                    <span>50% (Standard)</span>
                    <span>80%+ (High)</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-[#9299A1] font-mono-telemetry">
                * Filters are applied independently to their respective sensors.
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. EXPORT WORKSPACE — VERIFIED SCIENTIFIC DATASET EXPORT
            Refined horizontal technical export options with champagne-gold & stellar-blue accents
            ========================================================================= */}
        <section
          aria-label="Dataset Export Hub"
          className="rounded-lg bg-[#111418] border border-[#222B38] shadow-xl p-6 sm:p-7 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222B38] pb-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono-telemetry uppercase tracking-wider text-[#91BBD5]">
                <Download className="w-3.5 h-3.5" />
                <span>Verified Scientific Export Hub</span>
              </div>
              <h2 className="text-xl font-bold text-[#F2F0E9] tracking-tight mt-1">
                Download Filtered Observations ({summary?.total_matching.toLocaleString() ?? "0"} Records)
              </h2>
            </div>
            <div className="text-xs text-[#9299A1] font-mono-telemetry">
              Format includes authentic metadata, provenance manifest, and CRS EPSG:4326.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Format 1: CSV */}
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#477DA5]/70 flex flex-col justify-between space-y-4 transition-all duration-250 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-telemetry font-bold text-[#91BBD5] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#477DA5]" />
                    <span>CSV / Tabular Format</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#101B2B] border border-[#222B38] text-[#91BBD5] font-mono-telemetry">
                    Formula-Protected
                  </span>
                </div>
                <p className="text-xs text-[#9299A1] leading-relaxed">
                  Standard tabular export with sanitized formula injection defense, metadata comment header, and timestamps.
                </p>
              </div>
              <button
                onClick={() => handleDownload("csv")}
                disabled={isExporting !== null || !summary?.total_matching}
                className="w-full py-2.5 rounded bg-[#101B2B] hover:bg-[#193653] text-[#91BBD5] hover:text-[#F2F0E9] border border-[#222B38] hover:border-[#477DA5]/60 font-mono-telemetry text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#C6A66B]/70 flex flex-col justify-between space-y-4 transition-all duration-250 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-telemetry font-bold text-[#C6A66B] flex items-center gap-1.5">
                    <FileJson className="w-4 h-4" />
                    <span>JSON Manifest + Records</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#101B2B] border border-[#222B38] text-[#C6A66B] font-mono-telemetry">
                    Structured Schema
                  </span>
                </div>
                <p className="text-xs text-[#9299A1] leading-relaxed">
                  Complete JSON package containing top-level scientific limitations manifest, CRS documentation, and records array.
                </p>
              </div>
              <button
                onClick={() => handleDownload("json")}
                disabled={isExporting !== null || !summary?.total_matching}
                className="w-full py-2.5 rounded bg-[#101B2B] hover:bg-[#193653] text-[#C6A66B] hover:text-[#F2F0E9] border border-[#222B38] hover:border-[#C6A66B]/60 font-mono-telemetry text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
            <div className="p-5 rounded bg-[#080A0D] border border-[#222B38] hover:border-[#E0783D]/70 flex flex-col justify-between space-y-4 transition-all duration-250 group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-telemetry font-bold text-[#E0783D] flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>GeoJSON Cartography</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#101B2B] border border-[#222B38] text-[#E0783D] font-mono-telemetry">
                    RFC 7946 (EPSG:4326)
                  </span>
                </div>
                <p className="text-xs text-[#9299A1] leading-relaxed">
                  FeatureCollection with Point geometry formatted in strict [longitude, latitude] coordinate order for GIS &amp; QGIS.
                </p>
              </div>
              <button
                onClick={() => handleDownload("geojson")}
                disabled={isExporting !== null || !summary?.total_matching}
                className="w-full py-2.5 rounded bg-[#101B2B] hover:bg-[#193653] text-[#E0783D] hover:text-[#F2F0E9] border border-[#222B38] hover:border-[#E0783D]/60 font-mono-telemetry text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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

        {/* =========================================================================
            7. OBSERVATION TABLE — PRECISION TELEMETRY DATA GRID
            High-contrast, scientific typography with sort headers and copyable coordinates
            ========================================================================= */}
        <section
          aria-label="Observation Data Table"
          className="relative rounded-lg bg-[#111418] border border-[#222B38] shadow-xl p-6 sm:p-7 space-y-5 overflow-hidden"
        >
          {/* Subtle Scanning Indicator when loading table */}
          {isLoadingObservations && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#477DA5] to-transparent anim-scanline z-20" />
          )}

          {/* Table Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative min-w-[260px] sm:min-w-[320px]">
                <Search className="w-4 h-4 text-[#9299A1] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search observation attributes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#080A0D] border border-[#222B38] focus:border-[#C6A66B] rounded pl-9 pr-3.5 py-2 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry placeholder:text-[#9299A1]/40 transition-colors duration-200"
                />
              </div>

              <span className="text-xs font-mono-telemetry text-[#9299A1] hidden sm:inline">
                Showing {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{" "}
                {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords.toLocaleString()} records
              </span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-xs font-mono-telemetry text-[#9299A1]">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#080A0D] border border-[#222B38] focus:border-[#C6A66B] rounded px-2.5 py-1 text-xs text-[#F2F0E9] focus:outline-none font-mono-telemetry cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 rounded bg-red-950/20 border border-red-500/30 text-xs text-red-300 font-mono-telemetry flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={fetchObservations} className="underline hover:text-white cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto rounded border border-[#222B38] bg-[#080A0D]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#222B38] bg-[#111418] font-mono-telemetry text-[11px] text-[#9299A1] uppercase tracking-wider select-none">
                  <th
                    onClick={() => handleSort("acq_datetime")}
                    className="p-3.5 hover:text-[#F2F0E9] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date &amp; Time (UTC)</span>
                      {sortBy === "acq_datetime" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#C6A66B]" /> : <ArrowDown className="w-3 h-3 text-[#C6A66B]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#222B38]" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("latitude")}
                    className="p-3.5 hover:text-[#F2F0E9] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Coordinates</span>
                      {sortBy === "latitude" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#C6A66B]" /> : <ArrowDown className="w-3 h-3 text-[#C6A66B]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#222B38]" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("sensor")}
                    className="p-3.5 hover:text-[#F2F0E9] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Sensor &amp; Satellite</span>
                      {sortBy === "sensor" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#C6A66B]" /> : <ArrowDown className="w-3 h-3 text-[#C6A66B]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#222B38]" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("frp")}
                    className="p-3.5 hover:text-[#F2F0E9] cursor-pointer transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>FRP (MW)</span>
                      {sortBy === "frp" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#E0783D]" /> : <ArrowDown className="w-3 h-3 text-[#E0783D]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#222B38]" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort("brightness")}
                    className="p-3.5 hover:text-[#F2F0E9] cursor-pointer transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Brightness (K)</span>
                      {sortBy === "brightness" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#C6A66B]" /> : <ArrowDown className="w-3 h-3 text-[#C6A66B]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-[#222B38]" />
                      )}
                    </div>
                  </th>

                  <th className="p-3.5 text-center">Overpass</th>
                  <th className="p-3.5">Confidence</th>
                  <th className="p-3.5">Detection Classification</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#222B38] font-mono-telemetry">
                {isLoadingObservations ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="p-3.5">
                        <div className="h-4 bg-[#101B2B] rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : observations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#9299A1] space-y-3">
                      <Database className="w-8 h-8 mx-auto text-[#222B38]" />
                      <div className="text-sm font-semibold text-[#F2F0E9]">No Matching Observations Found</div>
                      <p className="text-xs text-[#9299A1] max-w-md mx-auto">
                        No active fire thermal anomalies in the Uttarakhand 2025 dataset matched your current filter combinations. Try loosening the date range or FRP limits.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="px-4 py-1.5 rounded bg-[#101B2B] hover:bg-[#193653] text-xs text-[#F2F0E9] border border-[#222B38] transition-colors cursor-pointer"
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
                        className="hover:bg-[#101B2B]/40 transition-colors group observation-row"
                      >
                        {/* Date & Time */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-semibold text-[#F2F0E9]">{obs.acq_date}</div>
                          <div className="text-[11px] text-[#9299A1] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#C6A66B]" />
                            <span>{obs.acq_time} UTC</span>
                          </div>
                        </td>

                        {/* Coordinates */}
                        <td className="p-3.5 whitespace-nowrap">
                          <button
                            onClick={() => copyCoordinates(obs.latitude, obs.longitude)}
                            className="flex items-center gap-1.5 text-[#9299A1] hover:text-[#C6A66B] transition-colors cursor-pointer"
                            title="Click to copy coordinates"
                          >
                            <MapPin className="w-3 h-3 text-[#C6A66B]" />
                            <span>
                              {obs.latitude.toFixed(4)}°N, {obs.longitude.toFixed(4)}°E
                            </span>
                            {copiedCoord === `${obs.latitude.toFixed(5)}, ${obs.longitude.toFixed(5)}` ? (
                              <Check className="w-3 h-3 text-[#91BBD5]" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#9299A1] transition-opacity" />
                            )}
                          </button>
                        </td>

                        {/* Sensor & Satellite */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isModis
                                  ? "bg-[#101B2B] text-[#C6A66B] border border-[#C6A66B]/30"
                                  : "bg-[#101B2B] text-[#91BBD5] border border-[#477DA5]/40"
                              }`}
                            >
                              {obs.sensor}
                            </span>
                            <span className="text-[#9299A1] text-xs">
                              {obs.satellite} ({isModis ? "1km" : "375m"})
                            </span>
                          </div>
                        </td>

                        {/* FRP (MW) */}
                        <td className="p-3.5 whitespace-nowrap text-right">
                          <span
                            className={`font-bold ${
                              frpVal > 50
                                ? "text-[#E0783D]"
                                : frpVal > 20
                                ? "text-[#E89258]"
                                : "text-[#F2F0E9]"
                            }`}
                          >
                            {frpVal.toFixed(2)} MW
                          </span>
                        </td>

                        {/* Brightness (K) */}
                        <td className="p-3.5 whitespace-nowrap text-right text-[#9299A1]">
                          {obs.brightness.toFixed(1)} K
                        </td>

                        {/* Overpass (Day / Night) */}
                        <td className="p-3.5 whitespace-nowrap text-center">
                          {obs.daynight === "D" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#101B2B] text-[#C6A66B] border border-[#222B38]">
                              <Sun className="w-2.5 h-2.5 text-[#C6A66B]" />
                              <span>Day</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#101B2B] text-[#91BBD5] border border-[#222B38]">
                              <Moon className="w-2.5 h-2.5 text-[#477DA5]" />
                              <span>Night</span>
                            </span>
                          )}
                        </td>

                        {/* Confidence */}
                        <td className="p-3.5 whitespace-nowrap">
                          {isModis ? (
                            <span className="text-xs font-semibold text-[#C6A66B]">
                              {obs.confidence_category}
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
                                obs.confidence === "h"
                                  ? "bg-[#101B2B] text-[#91BBD5] border border-[#477DA5]/50"
                                  : obs.confidence === "l"
                                  ? "bg-[#101B2B] text-[#9299A1] border border-[#222B38]"
                                  : "bg-[#101B2B] text-[#C6A66B] border border-[#C6A66B]/40"
                              }`}
                            >
                              {obs.confidence_category}
                            </span>
                          )}
                        </td>

                        {/* Classification */}
                        <td className="p-3.5 whitespace-nowrap text-[#9299A1] text-[11px]">
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
              <div className="text-[#9299A1]">
                Page <span className="text-[#F2F0E9] font-bold current-page-num">{currentPage}</span> of{" "}
                <span className="text-[#F2F0E9] font-bold total-pages-num">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded bg-[#080A0D] hover:bg-[#101B2B] disabled:opacity-30 disabled:cursor-not-allowed text-[#9299A1] hover:text-[#F2F0E9] border border-[#222B38] transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded bg-[#080A0D] hover:bg-[#101B2B] disabled:opacity-30 disabled:cursor-not-allowed text-[#9299A1] hover:text-[#F2F0E9] border border-[#222B38] transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Numbered Jump Indicator */}
                <span className="px-3 py-1 rounded bg-[#101B2B] text-[#C6A66B] border border-[#C6A66B]/40 font-bold">
                  {currentPage}
                </span>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded bg-[#080A0D] hover:bg-[#101B2B] disabled:opacity-30 disabled:cursor-not-allowed text-[#9299A1] hover:text-[#F2F0E9] border border-[#222B38] transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded bg-[#080A0D] hover:bg-[#101B2B] disabled:opacity-30 disabled:cursor-not-allowed text-[#9299A1] hover:text-[#F2F0E9] border border-[#222B38] transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            8. METHODOLOGY & PROVENANCE FOOTER
            Minimal, architectural technical closure
            ========================================================================= */}
        <footer className="pt-8 border-t border-[#222B38] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono-telemetry text-[#9299A1]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#477DA5]" />
            <span>NASA Space Apps 2026 • Verified Scientific Telemetry Baseline</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/fires" className="text-[#E0783D] hover:text-[#E89258] transition-colors duration-200">
              Fire Intelligence Lab →
            </Link>
            <Link href="/methodology" className="text-[#C6A66B] hover:text-[#F2F0E9] transition-colors duration-200">
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
