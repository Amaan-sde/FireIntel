"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  X,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Radio,
  Satellite,
  Database,
  FileCheck2,
} from "lucide-react";

export type SlotKey = "modis_archive" | "modis_nrt" | "viirs_archive" | "viirs_nrt";

export interface SlotFileItem {
  file: File | null;
  filename: string;
  sizeMb: number;
  status: "empty" | "ready" | "harmonised" | "error";
  rows?: number;
  error?: string;
}

interface StudioFourSlotUploadProps {
  slots: Record<SlotKey, SlotFileItem>;
  onSlotFileSelect: (slot: SlotKey, file: File) => void;
  onSlotFileRemove: (slot: SlotKey) => void;
  onHarmoniseAndLaunch: () => void;
  onLoadFourSlotDemo: () => void;
  isHarmonising: boolean;
  harmonisationAudit?: any;
}

interface SlotDefinition {
  key: SlotKey;
  title: string;
  sensor: string;
  resolution: string;
  productType: string;
  badge: string;
  badgeColor: string;
  accentBorder: string;
  accentBg: string;
  textColor: string;
  description: string;
}

const SLOT_DEFINITIONS: SlotDefinition[] = [
  {
    key: "modis_archive",
    title: "MODIS ARCHIVE",
    sensor: "Terra & Aqua",
    resolution: "1.0 km nadir",
    productType: "Validated Science Archive",
    badge: "MODIS C6.1",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    accentBorder: "border-amber-500/40 hover:border-amber-400",
    accentBg: "bg-amber-950/20",
    textColor: "text-amber-400",
    description: "Historical validated thermal anomalies with ground truth classification (type 0..3).",
  },
  {
    key: "modis_nrt",
    title: "MODIS NRT",
    sensor: "Terra & Aqua",
    resolution: "1.0 km nadir",
    productType: "Near Real-Time Stream",
    badge: "MODIS NRT",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    accentBorder: "border-yellow-500/40 hover:border-yellow-400",
    accentBg: "bg-yellow-950/20",
    textColor: "text-yellow-400",
    description: "Low-latency operational detections (lag <3h) with continuous radiometric calibration.",
  },
  {
    key: "viirs_archive",
    title: "VIIRS ARCHIVE",
    sensor: "SNPP / NOAA-20 / NOAA-21",
    resolution: "375 m I-band",
    productType: "High-Resolution Archive",
    badge: "VIIRS VNP14",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    accentBorder: "border-cyan-500/40 hover:border-cyan-400",
    accentBg: "bg-cyan-950/20",
    textColor: "text-cyan-400",
    description: "High-fidelity active fire perimeter tracking with I-4 (375m) and I-5 infrared channels.",
  },
  {
    key: "viirs_nrt",
    title: "VIIRS NRT",
    sensor: "SNPP / NOAA-20 / NOAA-21",
    resolution: "375 m I-band",
    productType: "Operational NRT Stream",
    badge: "VIIRS 2.0NRT",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    accentBorder: "border-purple-500/40 hover:border-purple-400",
    accentBg: "bg-purple-950/20",
    textColor: "text-purple-400",
    description: "Rapid active flame detection with sub-pixel radiant power and categorical confidence.",
  },
];

export default function StudioFourSlotUpload({
  slots,
  onSlotFileSelect,
  onSlotFileRemove,
  onHarmoniseAndLaunch,
  onLoadFourSlotDemo,
  isHarmonising,
  harmonisationAudit,
}: StudioFourSlotUploadProps) {
  const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);
  const fileInputRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    modis_archive: null,
    modis_nrt: null,
    viirs_archive: null,
    viirs_nrt: null,
  });

  const activeSlotCount = Object.values(slots).filter((s) => s.file !== null || s.filename !== "").length;

  const handleDragOver = (e: React.DragEvent, key: SlotKey) => {
    e.preventDefault();
    setDragOverSlot(key);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, key: SlotKey) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".csv")) {
        onSlotFileSelect(key, file);
      } else {
        alert("Please upload a standard CSV file.");
      }
    }
  };

  return (
    <section className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6 font-mono-telemetry text-xs">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Database className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
              4-Slot Concurrent NASA FIRMS Multi-Satellite Harmonisation
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
              {activeSlotCount} of 4 Streams Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-3xl">
            Simultaneously ingest MODIS (1km) and VIIRS (375m) across Archive and Near Real-Time (NRT) pipelines.
            The engine automatically standardises timestamps into UTC, eliminates Archive/NRT duplicates, maps
            radiometric power, and identifies cross-sensor coincident detections without data loss.
          </p>
        </div>

        {/* 1-Click Multi-Stream Demo Button */}
        <button
          onClick={onLoadFourSlotDemo}
          disabled={isHarmonising}
          className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-lg hover:shadow-purple-500/20"
          title="Load 4 real NASA FIRMS datasets simultaneously (Terra/Aqua + SNPP Archive & NRT)"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Load 4-Slot Demo Bundle</span>
        </button>
      </div>

      {/* 4-Slot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SLOT_DEFINITIONS.map((def) => {
          const item = slots[def.key];
          const hasFile = item.file !== null || Boolean(item.filename);
          const isOver = dragOverSlot === def.key;

          return (
            <div
              key={def.key}
              onDragOver={(e) => handleDragOver(e, def.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, def.key)}
              className={`rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                isOver
                  ? "border-purple-400 bg-purple-950/40 scale-[1.02]"
                  : hasFile
                  ? `${def.accentBorder} ${def.accentBg} shadow-lg`
                  : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              {/* Slot Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${def.badgeColor}`}>
                    {def.badge}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {def.resolution}
                  </span>
                </div>
                <h3 className={`text-sm font-extrabold tracking-tight ${def.textColor}`}>
                  {def.title}
                </h3>
                <div className="text-[10px] text-slate-400 mb-1">
                  {def.sensor} • {def.productType}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {def.description}
                </p>
              </div>

              {/* Slot Target / File Info */}
              <div className="pt-2 border-t border-white/10">
                {hasFile ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-black/60 border border-emerald-500/30 flex items-start justify-between gap-2">
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] truncate">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate" title={item.filename}>
                            {item.filename}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{item.sizeMb > 0 ? `${item.sizeMb} MB` : "Ready"}</span>
                          {item.rows !== undefined && (
                            <>
                              <span>•</span>
                              <span>{item.rows.toLocaleString()} obs</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotFileRemove(def.key);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                        title="Remove dataset"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => fileInputRefs.current[def.key]?.click()}
                      className="w-full text-center py-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      Replace File
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRefs.current[def.key]?.click()}
                    className="p-4 rounded-xl border border-dashed border-white/20 hover:border-white/40 transition-all text-center cursor-pointer space-y-1.5 bg-white/[0.01] hover:bg-white/[0.04]"
                  >
                    <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                    <span className="block text-[11px] text-slate-300 font-semibold">
                      Drop CSV or Click
                    </span>
                    <span className="block text-[9px] text-slate-500">
                      Standard NASA FIRMS Export
                    </span>
                  </div>
                )}

                <input
                  ref={(el) => {
                    fileInputRefs.current[def.key] = el;
                  }}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onSlotFileSelect(def.key, e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Harmonisation Action Ribbon */}
      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-400">
            {activeSlotCount === 0 ? (
              <span className="text-amber-400">⚠️ Upload at least 1 dataset (or click "Load 4-Slot Demo Bundle") to launch harmonisation.</span>
            ) : (
              <span className="text-emerald-400">
                ✓ {activeSlotCount} dataset{activeSlotCount > 1 ? "s" : ""} loaded and ready for multi-satellite canonical harmonisation.
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onHarmoniseAndLaunch}
          disabled={activeSlotCount === 0 || isHarmonising}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
            activeSlotCount > 0 && !isHarmonising
              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-emerald-500/25 hover:scale-[1.01]"
              : "bg-white/10 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isHarmonising ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>Harmonising Multi-Satellite Telemetry...</span>
            </>
          ) : (
            <>
              <FileCheck2 className="w-4 h-4" />
              <span>Harmonise & Profile All Uploaded Datasets</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </div>

      {/* Harmonisation Audit Readout (if available) */}
      {harmonisationAudit && (
        <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-white uppercase text-[10px]">Harmonisation Provenance:</span>
            <span>{harmonisationAudit.initial_raw_rows?.toLocaleString()} Ingested</span>
            <span>→</span>
            <span className="text-emerald-300 font-bold">{harmonisationAudit.net_harmonised_observations?.toLocaleString()} Harmonised Observations</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            {harmonisationAudit.nrt_duplicates_removed > 0 && (
              <span className="text-amber-300">
                - {harmonisationAudit.nrt_duplicates_removed.toLocaleString()} NRT Duplicates Removed
              </span>
            )}
            {harmonisationAudit.cross_sensor_co_observations > 0 && (
              <span className="text-cyan-300">
                {harmonisationAudit.cross_sensor_co_observations.toLocaleString()} Coincident Cross-Sensor Detections Calibrated
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
