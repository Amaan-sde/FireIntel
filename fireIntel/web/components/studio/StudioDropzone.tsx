"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Sparkles,
  Info,
} from "lucide-react";

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

interface StudioDropzoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  columns: string[];
  mappings: ColumnMappings;
  onMappingsChange: (newMappings: ColumnMappings) => void;
  onRunProfile: () => void;
  isProfiling: boolean;
  hasUploadedFile: boolean;
  fileName?: string;
  totalRows?: number;
}

export default function StudioDropzone({
  onFileUpload,
  isUploading,
  columns,
  mappings,
  onMappingsChange,
  onRunProfile,
  isProfiling,
  hasUploadedFile,
  fileName,
  totalRows,
}: StudioDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".csv")) {
        onFileUpload(file);
      } else {
        alert("Please upload a standard CSV file.");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleMappingField = (key: keyof ColumnMappings, val: string) => {
    onMappingsChange({
      ...mappings,
      [key]: val === "__none__" ? undefined : val,
    });
  };

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-5 font-mono-telemetry text-xs">
      {/* Upload Zone / Dropzone */}
      <div
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
          isDragOver
            ? "border-purple-400 bg-purple-950/30 scale-[1.01]"
            : hasUploadedFile
            ? "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-500/60"
            : "border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
          data-testid="studio-file-input"
        />

        <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
          <UploadCloud className="w-8 h-8 animate-pulse" />
        </div>

        <div>
          <strong className="text-sm font-bold text-white block">
            {hasUploadedFile
              ? `Loaded: ${fileName || "User Dataset.csv"}`
              : "Drag & Drop Satellite Observation CSV here"}
          </strong>
          <span className="text-[11px] text-slate-400 block mt-1">
            {hasUploadedFile
              ? `${totalRows?.toLocaleString()} rows ready for schema mapping & profiling`
              : "Supports NASA FIRMS VIIRS, MODIS, Copernicus, or custom geospatial sensor tables (Max 20MB)"}
          </span>
        </div>

        {isUploading ? (
          <span className="text-purple-300 font-bold flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            Uploading & Parsing CSV Structure...
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold">
            {hasUploadedFile ? "Click to Replace CSV File" : "Browse Local Files"}
          </span>
        )}
      </div>

      {/* Schema & Column Mapping Inspector (Shown when columns available) */}
      {columns.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Column Mapping
                </h3>
                <span className="text-[10px] text-slate-400">
                  Verify detected geospatial, radiometric, and target attributes
                </span>
              </div>
            </div>

            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
              <Check className="w-3.5 h-3.5" />
              Auto-Matched
            </span>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Latitude (Required) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                Latitude (°N) <span className="text-rose-400">*</span>
              </label>
              <select
                data-testid="map-lat-select"
                value={mappings.lat_col || ""}
                onChange={(e) => handleMappingField("lat_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-cyan-500/40 text-cyan-300 focus:outline-none focus:border-cyan-400 text-xs"
              >
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Longitude (Required) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block flex items-center gap-1">
                Longitude (°E) <span className="text-rose-400">*</span>
              </label>
              <select
                data-testid="map-lon-select"
                value={mappings.lon_col || ""}
                onChange={(e) => handleMappingField("lon_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-cyan-500/40 text-cyan-300 focus:outline-none focus:border-cyan-400 text-xs"
              >
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* FRP (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                FRP / Radiance (MW)
              </label>
              <select
                value={mappings.frp_col || "__none__"}
                onChange={(e) => handleMappingField("frp_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/15 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="__none__" className="bg-slate-900 text-slate-500">
                  (None / Not Present)
                </option>
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Brightness (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Brightness / Temp (K)
              </label>
              <select
                value={mappings.brightness_col || "__none__"}
                onChange={(e) => handleMappingField("brightness_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/15 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="__none__" className="bg-slate-900 text-slate-500">
                  (None / Not Present)
                </option>
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Acquisition Date (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Acquisition Date
              </label>
              <select
                value={mappings.date_col || "__none__"}
                onChange={(e) => handleMappingField("date_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/15 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="__none__" className="bg-slate-900 text-slate-500">
                  (None / Not Present)
                </option>
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sensor / Instrument (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Satellite Sensor
              </label>
              <select
                value={mappings.sensor_col || "__none__"}
                onChange={(e) => handleMappingField("sensor_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/15 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="__none__" className="bg-slate-900 text-slate-500">
                  (None / Not Present)
                </option>
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Confidence (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Confidence Class
              </label>
              <select
                value={mappings.confidence_col || "__none__"}
                onChange={(e) => handleMappingField("confidence_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/15 text-slate-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="__none__" className="bg-slate-900 text-slate-500">
                  (None / Not Present)
                </option>
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Label (For Supervised ML) */}
            <div className="space-y-1">
              <label className="text-[10px] text-amber-300 font-bold block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Target Label (Supervised ML)
              </label>
              <select
                data-testid="map-target-select"
                value={mappings.target_col || "__none__"}
                onChange={(e) => handleMappingField("target_col", e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-amber-500/40 text-amber-300 focus:outline-none focus:border-amber-400 text-xs font-bold"
              >
                <option value="__none__" className="bg-slate-900 text-slate-500">
                  (None / Unsupervised Auto-Mode)
                </option>
                {columns.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2 flex justify-end">
            <button
              data-testid="run-profile-btn"
              onClick={onRunProfile}
              disabled={isProfiling || !mappings.lat_col || !mappings.lon_col}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all disabled:opacity-50"
            >
              {isProfiling ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Profiling Dataset & Generating Geometry...
                </>
              ) : (
                <>
                  <span>Profile Dataset & Render Map</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

