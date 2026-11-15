"use client";

import React, { useState } from "react";
import {
  Download,
  X,
  FileSpreadsheet,
  FileCode,
  MapPin,
  Check,
  Copy,
  Printer,
  Sparkles,
  FileText,
} from "lucide-react";

interface StudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  profileData: any;
  modelResult: any;
}

export default function StudioExportModal({
  isOpen,
  onClose,
  datasetName,
  profileData,
  modelResult,
}: StudioExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quality = profileData?.quality || {};
  const spatial = profileData?.spatial || {};
  const radiometrics = profileData?.radiometrics || {};

  // Build Markdown Research Dossier
  const summaryMarkdown = `# FIREINTEL GLOBAL RESEARCH DOSSIER
Dataset: ${datasetName}
Generated: NASA Space Apps Challenge 2026 // Global Fire Intelligence Studio

## 1. DATASET PROFILE & QUALITY AUDIT
- Total Processed Observations: ${quality.total_rows ? quality.total_rows.toLocaleString() : "N/A"}
- Valid Geocoded Observations: ${quality.valid_rows ? quality.valid_rows.toLocaleString() : "N/A"}
- Invalid Coordinates: ${quality.invalid_coords || 0}
- Duplicate Rows: ${quality.duplicate_rows || 0}

## 2. GEOGRAPHICAL EXTENT & SPATIAL COVERAGE
- Geographic Bounding Box: ${spatial.bbox ? `[${spatial.bbox[0]}°E, ${spatial.bbox[1]}°N to ${spatial.bbox[2]}°E, ${spatial.bbox[3]}°N]` : "N/A"}
- Geographic Center: ${spatial.center ? `[${spatial.center[1]}°N, ${spatial.center[0]}°E]` : "N/A"}
- Approximate Ground Footprint: ${spatial.area_sqkm ? `${spatial.area_sqkm.toLocaleString()} km²` : "N/A"}

## 3. RADIOMETRIC FIRE RADIATIVE POWER (FRP)
- Mean FRP: ${radiometrics.frp ? `${radiometrics.frp.mean} MW` : "N/A"}
- Peak Instantaneous FRP: ${radiometrics.frp ? `${radiometrics.frp.max} MW` : "N/A"}
- 95th Percentile FRP: ${radiometrics.frp ? `${radiometrics.frp.p95} MW` : "N/A"}

## 4. MACHINE LEARNING RESULTS
- Model Type: ${modelResult?.model_type || "Unprocessed / Profiling Mode"}
- Model Architecture: ${modelResult?.model_name || "N/A"}
${
  modelResult?.metrics
    ? `- Overall Accuracy: ${modelResult.metrics.accuracy}% (vs ${modelResult.metrics.baseline_majority_accuracy}% naive baseline)\n- Balanced Accuracy: ${modelResult.metrics.balanced_accuracy}%\n- Macro F1-Score: ${modelResult.metrics.macro_f1}%`
    : ""
}
${
  modelResult?.spatial_clusters
    ? `- DBSCAN Spatial Clusters: ${modelResult.spatial_clusters.cluster_count}\n- Isolated Outliers: ${modelResult.spatial_clusters.isolated_hotspots}\n- Radiometric Anomalies: ${modelResult.anomaly_detection?.anomalous_observations} (${modelResult.anomaly_detection?.anomaly_percentage}%)`
    : ""
}

## 5. SCIENTIFIC DATA GOVERNANCE & LIMITATIONS
- Detections represent satellite thermal anomalies at overpass moment, not confirmed wildfire perimeters.
- Fire Radiative Power (FRP) reflects instantaneous radiant combustion rate, not crown fire depth.
- Coordinates were withheld from model training features to prevent trivial spatial memorization.
`;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const combinedData = {
      dataset_name: datasetName,
      profile: profileData,
      model_result: modelResult,
      exported_at: new Date().toISOString(),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(combinedData, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `fireintel_studio_${datasetName.toLowerCase().replace(/\s+/g, "_")}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadGeoJSON = () => {
    const geojsonData = modelResult?.geojson || profileData?.geojson || { type: "FeatureCollection", features: [] };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojsonData, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `fireintel_studio_${datasetName.toLowerCase().replace(/\s+/g, "_")}.geojson`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadCSV = () => {
    const geojsonData = modelResult?.geojson || profileData?.geojson || { features: [] };
    let csv = "longitude,latitude,frp,sensor,confidence,predicted,cluster_id,is_anomaly\n";
    geojsonData.features.forEach((f: any) => {
      const c = f.geometry.coordinates;
      const p = f.properties;
      csv += `${c[0]},${c[1]},${p.frp || ""},${p.sensor || ""},${p.confidence || ""},${p.predicted || ""},${p.cluster_id || ""},${p.is_anomaly || ""}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fireintel_studio_${datasetName.toLowerCase().replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono-telemetry text-xs">
      <div className="relative w-full max-w-2xl bg-[#030612] border border-purple-500/40 rounded-2xl p-6 shadow-2xl text-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                GLOBAL RESEARCH DOSSIER STUDIO
              </div>
              <h2 className="text-base font-bold text-white">
                Export Dossier ({datasetName})
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Download Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleDownloadCSV}
            className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-left transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                CSV
              </span>
            </div>
            <strong className="text-xs text-white block">Cleaned Points</strong>
            <span className="text-[10px] text-slate-400 block">
              Coordinates, FRP, and model predictions
            </span>
          </button>

          <button
            onClick={handleDownloadGeoJSON}
            className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-left transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                GeoJSON
              </span>
            </div>
            <strong className="text-xs text-white block">Spatial Geometry</strong>
            <span className="text-[10px] text-slate-400 block">
              FeatureCollection with GIS attributes
            </span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-left transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <FileCode className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                JSON
              </span>
            </div>
            <strong className="text-xs text-white block">Metadata Config</strong>
            <span className="text-[10px] text-slate-400 block">
              Full profile and evaluation matrices
            </span>
          </button>
        </div>

        {/* Copyable Markdown Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              Scientific Research Dossier
            </span>
            <button
              onClick={handleCopySummary}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-[10px] flex items-center gap-1 cursor-pointer font-bold"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Markdown Dossier</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-black/60 border border-white/10 text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed font-mono">
            {summaryMarkdown}
          </pre>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

