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
  Layers,
  Database,
} from "lucide-react";

interface StudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  sessionId?: string | null;
  profileData: any;
  modelResult: any;
}

export default function StudioExportModal({
  isOpen,
  onClose,
  datasetName,
  sessionId,
  profileData,
  modelResult,
}: StudioExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const spatial = profileData?.spatial || {};
  const radiometrics = profileData?.radiometrics || {};
  const harmonisation = profileData?.harmonisation_summary || {};
  const breakdowns = profileData?.breakdowns || {};

  // Build Markdown Research Dossier
  const summaryMarkdown = `# FIREINTEL GLOBAL RESEARCH DOSSIER
Dataset: ${datasetName}
Generated: NASA Space Apps Challenge 2026 // Global Fire Intelligence Studio

## 1. MULTI-SATELLITE HARMONISATION AUDIT
- Total Harmonised Observations: ${harmonisation.net_harmonised_observations ? harmonisation.net_harmonised_observations.toLocaleString() : "N/A"}
- VIIRS Observations: ${breakdowns.sensors?.VIIRS ? breakdowns.sensors.VIIRS.toLocaleString() : "N/A"}
- MODIS Observations: ${breakdowns.sensors?.MODIS ? breakdowns.sensors.MODIS.toLocaleString() : "N/A"}
- Archive Historical: ${breakdowns.categories?.ARCHIVE ? breakdowns.categories.ARCHIVE.toLocaleString() : "N/A"}
- Near Real-Time (NRT): ${breakdowns.categories?.NRT ? breakdowns.categories.NRT.toLocaleString() : "N/A"}
- Duplicates Removed: ${harmonisation.nrt_duplicates_removed || 0}
- Coincident Cross-Sensor Detections: ${harmonisation.cross_sensor_co_observations || 0}

## 2. GEOGRAPHICAL BOUNDS & SPATIAL EXTENT
- Geographic Bounding Box: ${spatial.bbox ? `[${spatial.bbox[0]}°E, ${spatial.bbox[1]}°N to ${spatial.bbox[2]}°E, ${spatial.bbox[3]}°N]` : "N/A"}
- Center Coordinate: ${spatial.center ? `[${spatial.center[1]}°N, ${spatial.center[0]}°E]` : "N/A"}
- Ground Surface Footprint: ${spatial.area_sqkm ? `${spatial.area_sqkm.toLocaleString()} km²` : "N/A"}

## 3. RADIOMETRIC FIRE RADIATIVE POWER (FRP)
- Mean Radiative Power: ${radiometrics.frp ? `${radiometrics.frp.mean_mw} MW` : "N/A"}
- Peak Instantaneous Power: ${radiometrics.frp ? `${radiometrics.frp.max_mw} MW` : "N/A"}
- Total Accumulated FRP: ${radiometrics.frp ? `${radiometrics.frp.total_mw} MW` : "N/A"}

## 4. MACHINE LEARNING & ANALYTICAL METRICS
- Executed Pipeline: ${modelResult?.model_type || "Profiling Only"}
- Target Feature: ${modelResult?.target_variable || "None (Unsupervised Mode)"}
${
  modelResult?.models
    ? `- Random Forest Accuracy: ${modelResult.models.random_forest.accuracy}% (Bal. Acc: ${modelResult.models.random_forest.balanced_accuracy}%)\n- XGBoost Accuracy: ${modelResult.models.xgboost.accuracy}% (Bal. Acc: ${modelResult.models.xgboost.balanced_accuracy}%)\n- Majority Baseline: ${modelResult.models.baseline.accuracy}%`
    : ""
}
${
  modelResult?.spatial_clusters
    ? `- DBSCAN Spatial Clusters: ${modelResult.spatial_clusters.cluster_count}\n- Isolated Outliers: ${modelResult.spatial_clusters.isolated_hotspots}\n- Isolation Forest Anomalies: ${modelResult.anomaly_detection?.anomalous_observations} (${modelResult.anomaly_detection?.anomaly_percentage}%)`
    : ""
}

## 5. SCIENTIFIC DATA GOVERNANCE & LIMITATIONS
- Active fire detections reflect satellite thermal radiation at sensor overpass, NOT verified wildfire perimeter or burn area.
- Coordinates were withheld from model features to ensure the classifier does not memorize regional geometry.
- Supervised models distinguish observation spectral profile (e.g. vegetation vs industrial flaring), not future wildfire ignition.
`;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDirect = async (format: string, defaultFilename: string) => {
    if (!sessionId) {
      alert("No active session ID available to export.");
      return;
    }

    setDownloadingFormat(format);
    try {
      const res = await fetch("/api/v1/studio/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          format: format,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Export failed");
      }

      const data = await res.json();
      const content = typeof data.content === "object" ? JSON.stringify(data.content, null, 2) : data.content;
      const mime = format.includes("json") ? "application/json" : "text/csv";
      
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || defaultFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#030612] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono-telemetry text-xs">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Download Global Research Package
              </h3>
              <span className="text-[10px] text-slate-400">
                NASA FIRMS Harmonised Telemetry & Machine Learning Artifacts
              </span>
            </div>
          </div>

          <button
            data-testid="close-export-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Artifacts Download Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              1. Downloadable Data Products
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Harmonised CSV */}
              <button
                onClick={() => handleDownloadDirect("harmonised_csv", "harmonised_global_fire_observations.csv")}
                disabled={Boolean(downloadingFormat)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-emerald-500/40 text-left transition-all flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">harmonised_global_fire_observations.csv</div>
                  <div className="text-[10px] text-slate-400">Unified 20-column schema with provenance</div>
                </div>
              </button>

              {/* Report CSV */}
              <button
                onClick={() => handleDownloadDirect("report_csv", "global_fire_analysis_report.csv")}
                disabled={Boolean(downloadingFormat)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/40 text-left transition-all flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">global_fire_analysis_report.csv</div>
                  <div className="text-[10px] text-slate-400">Spatial bbox, radiometrics, sensor breakdowns</div>
                </div>
              </button>

              {/* Predictions CSV (if supervised) */}
              {modelResult?.models && (
                <button
                  onClick={() => handleDownloadDirect("predictions_csv", "model_predictions.csv")}
                  disabled={Boolean(downloadingFormat)}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-purple-500/40 text-left transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">model_predictions.csv</div>
                    <div className="text-[10px] text-slate-400">Actual vs Predicted classification labels</div>
                  </div>
                </button>
              )}

              {/* GeoJSON */}
              <button
                onClick={() => handleDownloadDirect("geojson", "spatial_clusters.geojson")}
                disabled={Boolean(downloadingFormat)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-amber-500/40 text-left transition-all flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">spatial_clusters.geojson</div>
                  <div className="text-[10px] text-slate-400">GIS point layers for QGIS / ArcGIS / MapLibre</div>
                </div>
              </button>
            </div>
          </div>

          {/* Markdown Dossier Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                2. Scientific Research Dossier (Markdown)
              </span>
              <button
                onClick={handleCopySummary}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied!" : "Copy Markdown"}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-black/80 border border-white/10 text-slate-300 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
              {summaryMarkdown}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400">
          <span>Format: Open Standard WGS-84 (EPSG:4326)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
