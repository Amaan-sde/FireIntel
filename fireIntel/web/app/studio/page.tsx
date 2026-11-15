"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import StudioHeader from "@/components/studio/StudioHeader";
import StudioFourSlotUpload, { SlotKey, SlotFileItem } from "@/components/studio/StudioFourSlotUpload";
import StudioMap from "@/components/studio/StudioMap";
import StudioProfileDeck from "@/components/studio/StudioProfileDeck";
import StudioModelLab from "@/components/studio/StudioModelLab";
import StudioExportModal from "@/components/studio/StudioExportModal";

const INITIAL_SLOTS: Record<SlotKey, SlotFileItem> = {
  modis_archive: { file: null, filename: "", sizeMb: 0, status: "empty" },
  modis_nrt: { file: null, filename: "", sizeMb: 0, status: "empty" },
  viirs_archive: { file: null, filename: "", sizeMb: 0, status: "empty" },
  viirs_nrt: { file: null, filename: "", sizeMb: 0, status: "empty" },
};

export default function GlobalStudioPage() {
  // 1. Core Dataset & Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string>("Global Multi-Satellite Harmonisation Laboratory");
  const [activeSampleId, setActiveSampleId] = useState<string | undefined>("four_slot_bundle");
  const [slots, setSlots] = useState<Record<SlotKey, SlotFileItem>>(INITIAL_SLOTS);

  // 2. Telemetry, Profiling & ML State
  const [profileData, setProfileData] = useState<any | null>(null);
  const [modelResult, setModelResult] = useState<any | null>(null);
  const [harmonisationAudit, setHarmonisationAudit] = useState<any | null>(null);

  // 3. UI Statuses
  const [isHarmonising, setIsHarmonising] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"auto" | "supervised" | "unsupervised">("auto");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Profile Execution Helper
  const runProfile = async (sId: string) => {
    try {
      const res = await fetch("/api/v1/studio/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sId,
          max_geojson_samples: 1200,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Profiling failed");
      }

      const data = await res.json();
      setProfileData(data);
    } catch (err: any) {
      console.error("Profiling error:", err);
    }
  };

  // Load Curated Sample (Global Continents or 4-Slot Bundle)
  const handleSelectSample = useCallback(async (sampleId: string) => {
    setIsHarmonising(true);
    setActiveSampleId(sampleId);
    setModelResult(null);

    try {
      const res = await fetch("/api/v1/studio/load-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_id: sampleId }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to load sample dataset");
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setDatasetName(data.dataset_name);

      // Reflect in slot cards if 4-slot bundle
      if (data.slots) {
        const updatedSlots = { ...INITIAL_SLOTS };
        for (const [k, v] of Object.entries(data.slots)) {
          if (k in updatedSlots) {
            const slotVal = v as any;
            updatedSlots[k as SlotKey] = {
              file: null,
              filename: slotVal.filename,
              sizeMb: 1.2,
              status: "harmonised",
              rows: slotVal.rows,
            };
          }
        }
        setSlots(updatedSlots);
      }

      // Automatically profile dataset
      await runProfile(data.session_id);
    } catch (err: any) {
      alert(`Error loading sample: ${err.message}`);
    } finally {
      setIsHarmonising(false);
    }
  }, []);

  // Initial Load: Mount 4-Slot Multi-Satellite Bundle on first visit
  useEffect(() => {
    handleSelectSample("four_slot_bundle");
  }, [handleSelectSample]);

  // Slot File Selection
  const handleSlotFileSelect = (slotKey: SlotKey, file: File) => {
    const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
    setSlots((prev) => ({
      ...prev,
      [slotKey]: {
        file,
        filename: file.name,
        sizeMb,
        status: "ready",
      },
    }));
    setActiveSampleId(undefined);
  };

  // Slot File Removal
  const handleSlotFileRemove = (slotKey: SlotKey) => {
    setSlots((prev) => ({
      ...prev,
      [slotKey]: { file: null, filename: "", sizeMb: 0, status: "empty" },
    }));
  };

  // Harmonise and Launch Ingestion
  const handleHarmoniseAndLaunch = async () => {
    const activeSlots = Object.entries(slots).filter(([_, s]) => s.file !== null);
    if (activeSlots.length === 0) {
      alert("Please upload at least one NASA FIRMS CSV dataset.");
      return;
    }

    setIsHarmonising(true);
    setModelResult(null);

    try {
      const formData = new FormData();
      for (const [slotKey, item] of activeSlots) {
        if (item.file) {
          formData.append(slotKey, item.file);
        }
      }
      formData.append("dataset_name", datasetName);

      const res = await fetch("/api/v1/studio/upload-slots", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Harmonisation upload failed");
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setDatasetName(data.dataset_name);
      setHarmonisationAudit(data.harmonisation_audit);

      // Update slot rows
      if (data.slot_reports) {
        setSlots((prev) => {
          const next = { ...prev };
          for (const [k, rep] of Object.entries(data.slot_reports)) {
            if (k in next) {
              const r = rep as any;
              next[k as SlotKey] = {
                ...next[k as SlotKey],
                status: "harmonised",
                rows: r.valid_rows,
              };
            }
          }
          return next;
        });
      }

      // Auto-profile the newly harmonised dataset
      await runProfile(data.session_id);
    } catch (err: any) {
      alert(`Harmonisation error: ${err.message}`);
    } finally {
      setIsHarmonising(false);
    }
  };

  // Execute Real Machine Learning Pipeline
  const handleExecuteML = async (mode: "auto" | "supervised" | "unsupervised") => {
    if (!sessionId) {
      alert("Please load or harmonise a dataset first.");
      return;
    }

    setIsTraining(true);
    try {
      const res = await fetch("/api/v1/studio/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          mode: mode,
          test_size: 0.20,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Training failed");
      }

      const data = await res.json();
      setModelResult(data);

      // If training returns updated GeoJSON with predictions or clusters, merge with profile map
      if (data.geojson && profileData) {
        setProfileData((prev: any) => ({
          ...prev,
          geojson: data.geojson,
        }));
      }
    } catch (err: any) {
      alert(`ML Training error: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  // Reset Session
  const handleReset = () => {
    setSlots(INITIAL_SLOTS);
    setSessionId(null);
    setProfileData(null);
    setModelResult(null);
    setHarmonisationAudit(null);
    setActiveSampleId(undefined);
  };

  const modelSectionRef = useRef<HTMLDivElement>(null);

  const scrollToModelSection = () => {
    if (modelSectionRef.current) {
      modelSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#020409] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* 1. Global Navigation Header */}
      <NavigationHeader activeTab="studio" />

      {/* 2. Main Studio Canvas */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 space-y-6">
        {/* Studio Command Header */}
        <StudioHeader
          datasetName={datasetName}
          totalRows={profileData?.harmonisation_summary?.net_harmonised_observations}
          onSelectSample={handleSelectSample}
          onReset={handleReset}
          onOpenExport={() => setIsExportOpen(true)}
          loadingSample={isHarmonising}
          activeSampleId={activeSampleId}
        />

        {/* Global Interactive Map */}
        <StudioMap
          geojson={profileData?.geojson}
          bbox={profileData?.spatial?.bbox}
          center={profileData?.spatial?.center}
          datasetName={datasetName}
          modelResult={modelResult}
        />

        {/* 4-Slot Multi-Satellite FIRMS Upload System */}
        <StudioFourSlotUpload
          slots={slots}
          onSlotFileSelect={handleSlotFileSelect}
          onSlotFileRemove={handleSlotFileRemove}
          onHarmoniseAndLaunch={handleHarmoniseAndLaunch}
          onLoadFourSlotDemo={() => handleSelectSample("four_slot_bundle")}
          isHarmonising={isHarmonising}
          harmonisationAudit={harmonisationAudit || profileData?.harmonisation_summary}
        />

        {/* Automated Profiling & Spatial Geometry Deck */}
        {profileData && (
          <StudioProfileDeck
            datasetName={datasetName}
            harmonisationSummary={profileData.harmonisation_summary}
            spatial={profileData.spatial}
            radiometrics={profileData.radiometrics}
            breakdowns={profileData.breakdowns}
            target={profileData.target}
            onProceedToTrain={scrollToModelSection}
          />
        )}

        {/* Machine Learning & Spatial Intelligence Laboratory */}
        <div ref={modelSectionRef}>
          <StudioModelLab
            modelResult={modelResult}
            isTraining={isTraining}
            onTrain={handleExecuteML}
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            hasTargetLabel={Boolean(profileData?.target?.has_target_label)}
            targetColName="type"
          />
        </div>
      </main>

      {/* Export & Download Dossier Modal */}
      <StudioExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        datasetName={datasetName}
        sessionId={sessionId}
        profileData={profileData}
        modelResult={modelResult}
      />
    </div>
  );
}
