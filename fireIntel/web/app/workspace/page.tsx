"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import WorkspaceMissionHeader from "@/components/workspace/WorkspaceMissionHeader";
import WorkspaceMap from "@/components/workspace/WorkspaceMap";
import WorkspaceSpatialControls from "@/components/workspace/WorkspaceSpatialControls";
import WorkspaceTemporalDeck from "@/components/workspace/WorkspaceTemporalDeck";
import WorkspaceComparisonMatrix from "@/components/workspace/WorkspaceComparisonMatrix";
import WorkspaceFindingsPanel from "@/components/workspace/WorkspaceFindingsPanel";
import WorkspaceExportModal from "@/components/workspace/WorkspaceExportModal";
import { FolderOpen, X, Trash2, ArrowRight, Clock, MapPin, Calendar, Sparkles } from "lucide-react";

// Default Presets as static fallback
const DEFAULT_PRESETS = [
  {
    id: "uttarakhand_state",
    name: "Uttarakhand Study Area (Whole State)",
    type: "state",
    center: [79.25, 30.15],
    bbox: [77.58, 28.71, 81.04, 31.46],
    area_sqkm: 53483,
    description: "Entire Survey of India boundary-validated Uttarakhand study area.",
  },
  {
    id: "nainital_division",
    name: "Nainital Forest Division & Kumaon Lakes",
    type: "district",
    center: [79.46, 29.38],
    radius_km: 25.0,
    bbox: [79.20, 29.15, 79.70, 29.60],
    area_sqkm: 1963,
    description: "Dense moist-deciduous and oak-pine ecological transition zone.",
  },
  {
    id: "corbett_tiger_reserve",
    name: "Jim Corbett Reserve & Ramnagar Foothills",
    type: "reserve",
    center: [78.77, 29.53],
    radius_km: 28.0,
    bbox: [78.50, 29.30, 79.05, 29.75],
    area_sqkm: 2463,
    description: "Shivalik Sal forest belt with significant wildlife conservation value.",
  },
  {
    id: "pauri_garhwal",
    name: "Pauri Garhwal Pine Ridge",
    type: "district",
    center: [78.84, 29.87],
    radius_km: 30.0,
    bbox: [78.60, 29.65, 79.15, 30.10],
    area_sqkm: 2827,
    description: "Steep elevation gradients with continuous chir pine canopy.",
  },
  {
    id: "dehradun_valley",
    name: "Dehradun Valley & Rajaji Corridor",
    type: "district",
    center: [78.03, 30.32],
    radius_km: 25.0,
    bbox: [77.70, 30.00, 78.35, 30.55],
    area_sqkm: 1963,
    description: "Inter-montane Doon Valley interface with protected elephant corridors.",
  },
  {
    id: "chamoli_high_altitude",
    name: "Chamoli High Altitude & Nanda Devi Buffer",
    type: "alpine",
    center: [79.33, 30.40],
    radius_km: 40.0,
    bbox: [79.00, 30.10, 80.00, 30.90],
    area_sqkm: 5026,
    description: "Subalpine birch-fir and timberline transition zone.",
  },
  {
    id: "almora_ridge",
    name: "Almora - Bageshwar Kumaon Mid-Hills",
    type: "district",
    center: [79.66, 29.60],
    radius_km: 30.0,
    bbox: [79.40, 29.40, 79.95, 29.85],
    area_sqkm: 2827,
    description: "Chir pine community forests intermixed with terraced valleys.",
  },
];

interface SpatialAOI {
  mode: string;
  preset_id?: string;
  center_lat?: number;
  center_lon?: number;
  radius_km?: number;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
}

interface TemporalFilter {
  mode: "chronological" | "seasonal";
  label?: string;
  start_date?: string;
  end_date?: string;
  start_month?: number;
  end_month?: number;
  season_id?: string;
}

interface SavedSession {
  id: string;
  title: string;
  createdAt: string;
  aoi: SpatialAOI;
  temporalMode: "chronological" | "seasonal";
  baseline: TemporalFilter;
  comparison: TemporalFilter;
}

export default function TerrainIntelligenceLabPage() {
  // 1. Mission / Research State
  const [sessionTitle, setSessionTitle] = useState<string>(
    "Himalayan Fire Radiative & Phenology Lab"
  );
  const [presets, setPresets] = useState<any[]>(DEFAULT_PRESETS);

  // 2. Spatial AOI State (Default: Nainital Division)
  const [aoi, setAOI] = useState<SpatialAOI>({
    mode: "preset",
    preset_id: "nainital_division",
    center_lat: 29.38,
    center_lon: 79.46,
    radius_km: 25.0,
    min_lat: 29.15,
    max_lat: 29.60,
    min_lon: 79.20,
    max_lon: 79.70,
  });

  // 3. Temporal State (Default: April 2025 vs May 2025)
  const [temporalMode, setTemporalMode] = useState<"chronological" | "seasonal">("chronological");

  const [baseline, setBaseline] = useState<TemporalFilter>({
    mode: "chronological",
    label: "April 2025",
    start_date: "2025-04-01",
    end_date: "2025-04-30",
    start_month: 4,
    end_month: 5,
  });

  const [comparison, setComparison] = useState<TemporalFilter>({
    mode: "chronological",
    label: "May 2025",
    start_date: "2025-05-01",
    end_date: "2025-05-31",
    start_month: 12,
    end_month: 2,
  });

  // 4. Comparison Results & Telemetry
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 5. Modals & Persistence
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSavedSessionsOpen, setIsSavedSessionsOpen] = useState<boolean>(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  // Fetch Presets from Backend on Mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetch("/api/v1/workspace/presets");
        if (res.ok) {
          const json = await res.json();
          if (json.presets && json.presets.length > 0) {
            setPresets(json.presets);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote presets, using static defaults:", err);
      }
    }
    loadPresets();
  }, []);

  // Load Saved Sessions from localStorage on Mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fireintel_workspace_sessions");
      if (stored) {
        setSavedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Error reading localStorage sessions:", e);
    }
  }, []);

  // Execute Comparison Query whenever AOI or Temporal periods change
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchComparison = useCallback(
    async (
      currentAoi: SpatialAOI,
      currentBaseline: TemporalFilter,
      currentComparison: TemporalFilter
    ) => {
      setLoading(true);
      setError(null);

      try {
        const payload = {
          scope: "uttarakhand",
          spatial_aoi: currentAoi,
          baseline_temporal: currentBaseline,
          comparison_temporal: currentComparison,
          sample_limit: 400,
        };

        const res = await fetch("/api/v1/workspace/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Comparison API returned status ${res.status}`);
        }

        const data = await res.json();
        setComparisonResult(data);
      } catch (err: any) {
        console.error("Comparison query failed:", err);
        setError(err.message || "Failed to execute comparison query");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchComparison(aoi, baseline, comparison);
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [aoi, baseline, comparison, fetchComparison]);

  // Handle Mode Change (Sync labels if switching between Chronological and Seasonal)
  const handleTemporalModeChange = (mode: "chronological" | "seasonal") => {
    setTemporalMode(mode);
    if (mode === "chronological") {
      setBaseline({
        mode: "chronological",
        label: "April 2025",
        start_date: "2025-04-01",
        end_date: "2025-04-30",
        start_month: 4,
        end_month: 5,
      });
      setComparison({
        mode: "chronological",
        label: "May 2025",
        start_date: "2025-05-01",
        end_date: "2025-05-31",
        start_month: 12,
        end_month: 2,
      });
    } else {
      setBaseline({
        mode: "seasonal",
        label: "Pre-Monsoon Peak (Apr-May)",
        start_month: 4,
        end_month: 5,
      });
      setComparison({
        mode: "seasonal",
        label: "Winter Biomass (Dec-Feb)",
        start_month: 12,
        end_month: 2,
      });
    }
  };

  // Handle Quick Presets
  const handleApplyTemporalPreset = (newBaseline: TemporalFilter, newComparison: TemporalFilter) => {
    setBaseline(newBaseline);
    setComparison(newComparison);
  };

  // Handle Map Click to Pinpoint Custom Coordinate
  const handleMapClick = (coords: [number, number]) => {
    setAOI((prev) => ({
      ...prev,
      mode: "circle",
      center_lon: Number(coords[0].toFixed(4)),
      center_lat: Number(coords[1].toFixed(4)),
      radius_km: prev.radius_km || 25.0,
    }));
  };

  // Session Persistence Handlers
  const handleSaveSession = () => {
    const newSession: SavedSession = {
      id: "session_" + Date.now(),
      title: sessionTitle,
      createdAt: new Date().toLocaleString(),
      aoi,
      temporalMode,
      baseline,
      comparison,
    };

    const updated = [newSession, ...savedSessions.slice(0, 9)];
    setSavedSessions(updated);
    try {
      localStorage.setItem("fireintel_workspace_sessions", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  };

  const handleLoadSession = (sess: SavedSession) => {
    setSessionTitle(sess.title);
    setAOI(sess.aoi);
    setTemporalMode(sess.temporalMode);
    setBaseline(sess.baseline);
    setComparison(sess.comparison);
    setIsSavedSessionsOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    setSavedSessions(updated);
    try {
      localStorage.setItem("fireintel_workspace_sessions", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  };

  const handleResetSession = () => {
    setSessionTitle("Himalayan Fire Radiative & Phenology Lab");
    setAOI({
      mode: "preset",
      preset_id: "nainital_division",
      center_lat: 29.38,
      center_lon: 79.46,
      radius_km: 25.0,
      min_lat: 29.15,
      max_lat: 29.60,
      min_lon: 79.20,
      max_lon: 79.70,
    });
    handleTemporalModeChange("chronological");
  };

  // Resolve Human-Readable AOI Name & Area
  const activePreset = presets.find((p) => p.id === aoi.preset_id);
  const aoiName =
    aoi.mode === "preset" && activePreset
      ? activePreset.name
      : aoi.mode === "circle"
      ? `Point [${aoi.center_lat?.toFixed(2)}°N, ${aoi.center_lon?.toFixed(2)}°E] (${aoi.radius_km} km)`
      : aoi.mode === "bbox"
      ? `Custom BBox [${aoi.min_lat?.toFixed(2)}–${aoi.max_lat?.toFixed(2)}°N]`
      : "Uttarakhand Study Area";

  const aoiAreaSqkm = comparisonResult?.aoi?.area_sqkm || 1963;

  // Programmatic testing hooks for Playwright automated verification
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__WORKSPACE_STATE = {
        sessionTitle,
        aoi,
        temporalMode,
        baseline,
        comparison,
        comparisonResult,
        loading,
      };

      (window as any).__SET_WORKSPACE_PRESET = (presetId: string) => {
        const found = presets.find((p) => p.id === presetId);
        if (found) {
          setAOI({
            mode: "preset",
            preset_id: presetId,
            center_lat: found.center ? found.center[1] : 29.38,
            center_lon: found.center ? found.center[0] : 79.46,
            radius_km: found.radius_km || 25.0,
            min_lat: found.bbox ? found.bbox[1] : 29.15,
            max_lat: found.bbox ? found.bbox[3] : 29.60,
            min_lon: found.bbox ? found.bbox[0] : 79.20,
            max_lon: found.bbox ? found.bbox[2] : 79.70,
          });
        }
      };

      (window as any).__SET_TEMPORAL_MODE = (mode: "chronological" | "seasonal") => {
        handleTemporalModeChange(mode);
      };

      (window as any).__OPEN_EXPORT_MODAL = () => {
        setIsExportOpen(true);
      };
    }
  }, [
    sessionTitle,
    aoi,
    temporalMode,
    baseline,
    comparison,
    comparisonResult,
    loading,
    presets,
  ]);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Global Navigation */}
      <NavigationHeader activeTab="workspace" />

      {/* 2. Main Workspace Container */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 space-y-6">
        {/* Mission / Session Header */}
        <WorkspaceMissionHeader
          sessionTitle={sessionTitle}
          onSessionTitleChange={setSessionTitle}
          aoiName={aoiName}
          aoiAreaSqkm={aoiAreaSqkm}
          temporalMode={temporalMode}
          onTemporalModeChange={handleTemporalModeChange}
          onSaveSession={handleSaveSession}
          onResetSession={handleResetSession}
          onOpenSavedSessions={() => setIsSavedSessionsOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          hasSavedSessions={savedSessions.length > 0}
        />

        {/* Visual Centerpiece: Interactive 3D Terrain & Observation Canvas */}
        <WorkspaceMap
          aoiMode={aoi.mode}
          center={
            aoi.center_lon && aoi.center_lat
              ? [aoi.center_lon, aoi.center_lat]
              : [79.46, 29.38]
          }
          radiusKm={aoi.radius_km || 25.0}
          bbox={
            aoi.min_lon && aoi.min_lat && aoi.max_lon && aoi.max_lat
              ? [aoi.min_lon, aoi.min_lat, aoi.max_lon, aoi.max_lat]
              : undefined
          }
          baselineGeojson={comparisonResult?.baseline?.data?.geojson}
          comparisonGeojson={comparisonResult?.comparison?.data?.geojson}
          onMapClick={handleMapClick}
          baselineLabel={baseline.label || "Baseline"}
          comparisonLabel={comparison.label || "Comparison"}
        />

        {/* 2-Column Responsive Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Geographical AOI Controls */}
          <WorkspaceSpatialControls
            aoi={aoi}
            onAOIChange={setAOI}
            presets={presets}
          />

          {/* Right Column: Temporal Comparison Deck */}
          <WorkspaceTemporalDeck
            temporalMode={temporalMode}
            baseline={baseline}
            comparison={comparison}
            onBaselineChange={setBaseline}
            onComparisonChange={setComparison}
            onApplyPreset={handleApplyTemporalPreset}
          />
        </div>

        {/* Comparative Mathematical Matrix & Telemetry Table */}
        <WorkspaceComparisonMatrix
          comparisonResult={comparisonResult}
          loading={loading}
        />

        {/* Deterministic Research Findings & Scientific Disclosures */}
        <WorkspaceFindingsPanel
          findings={comparisonResult?.findings || []}
          scientificDisclosures={comparisonResult?.scientific_disclosures || []}
          aoiName={aoiName}
        />
      </main>

      {/* 3. Export Studio Modal */}
      <WorkspaceExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sessionTitle={sessionTitle}
        comparisonResult={comparisonResult}
        aoiName={aoiName}
      />

      {/* 4. Saved Sessions Drawer / Modal */}
      {isSavedSessionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#030612] border border-white/15 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl font-mono-telemetry text-xs">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Saved Research Sessions
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Locally persisted telemetry investigation snapshots
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSavedSessionsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {savedSessions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>No research sessions saved yet in local storage.</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Click &apos;Save Session&apos; in the header bar to snapshot your current investigation.
                  </p>
                </div>
              ) : (
                savedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-xs truncate">{s.title}</strong>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {s.temporalMode.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          {s.aoi.preset_id || s.aoi.mode}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          {s.baseline.label} vs {s.comparison.label}
                        </span>
                        <span className="text-slate-500">{s.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                      <button
                        onClick={() => handleLoadSession(s)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Restore
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Delete saved session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsSavedSessionsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
