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
  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          {/* Eyebrow */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              GLOBAL FIRE INTELLIGENCE STUDIO
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
              {datasetName || "Autonomous Satellite Import & AutoML Laboratory"}
            </h1>
            {totalRows !== undefined && totalRows > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {totalRows.toLocaleString()} Observations Loaded
              </span>
            )}
          </div>
        </div>

        {/* Global Demo Datasets & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-[11px]">
            <span className="text-slate-500 px-2 font-bold uppercase text-[10px]">Demo Presets:</span>
            
            <button
              data-testid="demo-california-btn"
              onClick={() => onSelectSample("california_sierra")}
              disabled={loadingSample}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeSampleId === "california_sierra"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              🇺🇸 California 2024
            </button>

            <button
              data-testid="demo-greece-btn"
              onClick={() => onSelectSample("greece_mediterranean")}
              disabled={loadingSample}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeSampleId === "greece_mediterranean"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              🇬🇷 Greece Attica
            </button>

            <button
              data-testid="demo-uttarakhand-btn"
              onClick={() => onSelectSample("uttarakhand_specimen")}
              disabled={loadingSample}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeSampleId === "uttarakhand_specimen"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              🇮🇳 UK Ground Truth
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Reset studio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Export Report */}
          <button
            data-testid="export-dossier-btn"
            onClick={onOpenExport}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/40 text-purple-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>
    </div>
  );
}

