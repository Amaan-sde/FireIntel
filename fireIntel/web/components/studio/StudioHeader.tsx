"use client";

import React from "react";
import {
  Sparkles,
  UploadCloud,
  Globe2,
  Cpu,
  Download,
  RotateCcw,
  Layers,
  MapPin,
  CheckCircle2,
  Satellite,
  Compass,
} from "lucide-react";

interface StudioHeaderProps {
  datasetName: string;
  onDatasetNameChange?: (name: string) => void;
  regionLabel?: string;
  totalRows?: number;
  onSelectSample: (sampleId: string) => void;
  onReset: () => void;
  onOpenExport: () => void;
  loadingSample: boolean;
  activeSampleId?: string;
}

export default function StudioHeader({
  datasetName,
  regionLabel = "Global Satellite Observation Domain",
  totalRows,
  onSelectSample,
  onReset,
  onOpenExport,
  loadingSample,
  activeSampleId,
}: StudioHeaderProps) {
  const samplePresets = [
    { id: "four_slot_bundle", label: "🛰️ 4-Slot NASA Bundle" },
    { id: "amazon_basin", label: "🇧🇷 Amazon Basin" },
    { id: "australia_bushfire", label: "🇦🇺 Australia" },
    { id: "greece_mediterranean", label: "🇬🇷 Greece Attica" },
    { id: "uttarakhand_specimen", label: "🇮🇳 Uttarakhand GT" },
  ];

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          {/* Eyebrow */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              GLOBAL MULTI-SATELLITE HARMONISATION & AUTOML STUDIO
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{regionLabel}</span>
            </span>
          </div>

          {/* Dataset Title & Row Readout */}
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {datasetName || "Autonomous Satellite Harmonisation & Machine Learning"}
            </h1>
            {totalRows !== undefined && totalRows > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {totalRows.toLocaleString()} Harmonised Observations
              </span>
            )}
          </div>
        </div>

        {/* Global Demo Datasets & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-[11px]">
            <span className="text-slate-500 px-2 font-bold uppercase text-[10px]">Global Presets:</span>
            
            {samplePresets.map((preset) => (
              <button
                key={preset.id}
                data-testid={`demo-${preset.id}-btn`}
                onClick={() => onSelectSample(preset.id)}
                disabled={loadingSample}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeSampleId === preset.id
                    ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            title="Reset active studio workspace"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            data-testid="export-dossier-btn"
            onClick={onOpenExport}
            className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-purple-500/20"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export Package</span>
          </button>
        </div>
      </div>
    </div>
  );
}
