"use client";

import React, { useState, useEffect, useCallback } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import StudioHeader from "@/components/studio/StudioHeader";
import StudioDropzone from "@/components/studio/StudioDropzone";
import StudioMap from "@/components/studio/StudioMap";
import StudioProfileDeck from "@/components/studio/StudioProfileDeck";
import StudioModelLab from "@/components/studio/StudioModelLab";
import StudioExportModal from "@/components/studio/StudioExportModal";

interface ColumnMappings {
  lat_col: string;
  lon_col: string;
  date_col?: string;
  frp_col?: string;
  brightness_col?: string;
  sensor_col?: string;
  confidence_col?: string;
  target_col?: string;
}

export default function GlobalStudioPage() {
  // 1. Dataset State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string>("California Sierra 2024");
  const [columns, setColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMappings>({
    lat_col: "latitude",
    lon_col: "longitude",
    date_col: "acq_date",
    frp_col: "frp",
    brightness_col: "brightness",
    sensor_col: "sensor",
    confidence_col: "confidence",
  });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [activeSampleId, setActiveSampleId] = useState<string | undefined>("california_sierra");

  // 2. Telemetry & Profiling State
  const [profileData, setProfileData] = useState<any | null>(null);
  const [modelResult, setModelResult] = useState<any | null>(null);

  // 3. Statuses
  const [isUploading, setIsUploading] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"auto" | "supervised" | "unsupervised">("auto");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load Curated Sample (California by default on mount)
  const handleSelectSample = useCallback(async (sampleId: string) => {
    setIsUploading(true);
    setActiveSampleId(sampleId);
    try {
      const res = await fetch("/api/v1/studio/load-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_id: sampleId }),
      });
      if (!res.ok) throw new Error("Failed to load sample dataset");
      const data = await res.json();

      setSessionId(data.session_id);
      setDatasetName(data.dataset_name);
      setColumns(data.columns);
      setMappings(data.column_mappings);
      setTotalRows(data.total_rows);
      setModelResult(null);

      // Auto-profile on sample load
      await runProfile(data.session_id, data.column_mappings);
    } catch (err) {
      console.error("Error loading sample dataset:", err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Initial Load of California Demo on Mount
  useEffect(() => {
    handleSelectSample("california_sierra");
  }, [handleSelectSample]);

  // Handle Local CSV Upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setActiveSampleId(undefined);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataset_name", file.name.replace(".csv", ""));

      const res = await fetch("/api/v1/studio/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to upload CSV");
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setDatasetName(data.dataset_name);
      setColumns(data.columns);
      setMappings(data.column_mappings);
      setTotalRows(data.total_rows);
      setModelResult(null);

      // Auto-profile once columns are mapped
      if (data.column_mappings.lat_col && data.column_mappings.lon_col) {
        await runProfile(data.session_id, data.column_mappings);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Run Dataset Profile
  const runProfile = async (currentSessionId?: string, currentMappings?: ColumnMappings) => {
    const sId = currentSessionId || sessionId;
    const m = currentMappings || mappings;
    if (!sId || !m.lat_col || !m.lon_col) return;

    setIsProfiling(true);
    try {
      const res = await fetch("/api/v1/studio/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sId,
          mappings: m,
          max_geojson_samples: 400,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Profiling failed");
      }

      const data = await res.json();
      setProfileData(data);
    } catch (err: any) {
      alert(`Profiling error: ${err.message}`);
    } finally {
      setIsProfiling(false);
    }
  };

  // Execute Machine Learning Pipeline
  const handleTrainModel = async (mode: "auto" | "supervised" | "unsupervised") => {
    if (!sessionId) return;
    setIsTraining(true);
    try {
      const res = await fetch("/api/v1/studio/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          mode: mode,
          target_col: mappings.target_col,
          test_size: 0.2,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Training failed");
      }

      const data = await res.json();
      setModelResult(data);
    } catch (err: any) {
      alert(`ML execution error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleReset = () => {
    handleSelectSample("california_sierra");
  };

  // Programmatic Testing Hooks for Automated Playwright Verification
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__STUDIO_STATE = {
        sessionId,
        datasetName,
        totalRows,
        columns,
        mappings,
        profileData,
        modelResult,
        isUploading,
        isProfiling,
        isTraining,
      };

      (window as any).__LOAD_SAMPLE = (sampleId: string) => {
        handleSelectSample(sampleId);
      };

      (window as any).__RUN_PROFILE = () => {
        runProfile();
      };

      (window as any).__EXECUTE_TRAIN = (mode: "auto" | "supervised" | "unsupervised") => {
        handleTrainModel(mode);
      };

      (window as any).__OPEN_EXPORT = () => {
        setIsExportOpen(true);
      };
    }
  }, [
    sessionId,
    datasetName,
    totalRows,
    columns,
    mappings,
    profileData,
    modelResult,
    isUploading,
    isProfiling,
    isTraining,
    handleSelectSample,
  ]);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* 1. Global Navigation */}
      <NavigationHeader activeTab="studio" />

      {/* 2. Main Studio Canvas */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 space-y-6">
        {/* Studio Header Bar */}
        <StudioHeader
          datasetName={datasetName}
          totalRows={profileData?.quality?.valid_rows || totalRows}
          onSelectSample={handleSelectSample}
          onReset={handleReset}
          onOpenExport={() => setIsExportOpen(true)}
          loadingSample={isUploading}
          activeSampleId={activeSampleId}
        />

        {/* Global Satellite Map Visualizer (Centerpiece) */}
        <StudioMap
          geojson={modelResult?.geojson || profileData?.geojson}
          bbox={profileData?.spatial?.bbox}
          center={profileData?.spatial?.center}
          datasetName={datasetName}
          modelResult={modelResult}
        />

        {/* 2-Column Responsive Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: CSV Upload & Schema Mapping Deck */}
          <StudioDropzone
            onFileUpload={handleFileUpload}
            isUploading={isUploading}
            columns={columns}
            mappings={mappings}
            onMappingsChange={setMappings}
            onRunProfile={() => runProfile()}
            isProfiling={isProfiling}
            hasUploadedFile={Boolean(sessionId)}
            fileName={datasetName}
            totalRows={totalRows}
          />

          {/* Right: Automated Profiling & Spatial Quality Deck */}
          {profileData ? (
            <StudioProfileDeck
              datasetName={datasetName}
              quality={profileData.quality}
              spatial={profileData.spatial}
              radiometrics={profileData.radiometrics}
              sensors={profileData.sensors}
              temporal={profileData.temporal}
              target={profileData.target}
              onProceedToTrain={() => handleTrainModel(selectedMode)}
            />
          ) : (
            <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center space-y-3 font-mono-telemetry text-xs text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
              <span>Awaiting CSV Schema Mapping to generate geometric profile...</span>
            </div>
          )}
        </div>

        {/* Automated Machine Learning Cockpit */}
        <StudioModelLab
          modelResult={modelResult}
          isTraining={isTraining}
          onTrain={handleTrainModel}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          hasTargetLabel={Boolean(mappings.target_col)}
          targetColName={mappings.target_col}
        />
      </main>

      {/* 3. Export Dossier Studio Modal */}
      <StudioExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        datasetName={datasetName}
        profileData={profileData}
        modelResult={modelResult}
      />
    </div>
  );
}

