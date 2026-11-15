"use client";

import React, { useState } from "react";
import {
  Download,
  FileText,
  Printer,
  X,
  CheckCircle2,
  Shield,
  Layers,
  MapPin,
  Flame,
  Satellite,
  Mountain,
} from "lucide-react";
import { SelectedLocation } from "./LocationSearchHeader";

interface LocationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: SelectedLocation;
  radiusKm: number;
  summary: any;
  terrain: any;
  monthlyPhenology: any[];
}

export default function LocationExportModal({
  isOpen,
  onClose,
  location,
  radiusKm,
  summary,
  terrain,
  monthlyPhenology,
}: LocationExportModalProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (format: "csv" | "json") => {
    setDownloadingFormat(format);
    try {
      const res = await fetch(`/api/v1/location/export?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lon,
          radius_km: radiusKm,
          location_name: location.name,
        }),
      });

      if (!res.ok) throw new Error("Failed to export data");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fireintel_${location.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${radiusKm}km.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const areaSqKm = (Math.PI * Math.pow(radiusKm, 2)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#050914] border border-white/20 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 font-mono-telemetry max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Export Location Intelligence Dossier
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Download certified canonical data or print research dossier for {location.name}, Uttarakhand.
            </p>
          </div>
          <button
            onClick={onClose}
            data-testid="close-location-export-modal-btn"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Summary Card */}
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs border-b border-white/10 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              {location.name} ({location.district} District)
            </span>
            <span className="text-slate-400">
              {location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E • Radius {radiusKm} km ({areaSqKm} km²)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-slate-400 uppercase">Total Obs</div>
              <div className="font-bold text-white">{summary?.total_observations?.toLocaleString() || 0}</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-slate-400 uppercase">VIIRS / MODIS</div>
              <div className="font-bold text-cyan-300">
                {summary?.viirs_count?.toLocaleString() || 0} / {summary?.modis_count?.toLocaleString() || 0}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-slate-400 uppercase">Peak FRP</div>
              <div className="font-bold text-rose-400">{summary?.max_frp || 0} MW</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-slate-400 uppercase">Mean Elevation</div>
              <div className="font-bold text-emerald-300">{terrain?.avg_elevation_m || 0}m ASL</div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Option 1: CSV Export */}
          <button
            onClick={() => handleDownload("csv")}
            disabled={downloadingFormat !== null}
            className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-500/40 text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-2">
              <Download className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                CSV
              </span>
            </div>
            <div className="text-xs font-bold text-white mb-1">Raw Observations CSV</div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Every satellite detection inside the {radiusKm}km buffer with exact coordinates, FRP, brightness, sensor, and timestamps.
            </div>
          </button>

          {/* Option 2: Full JSON Dossier */}
          <button
            onClick={() => handleDownload("json")}
            disabled={downloadingFormat !== null}
            className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-2">
              <Download className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                JSON
              </span>
            </div>
            <div className="text-xs font-bold text-white mb-1">Structured JSON Dossier</div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Complete analytics bundle including GeoJSON features, circle geometry, terrain relief, and phenological tables.
            </div>
          </button>

          {/* Option 3: Printable Research Report */}
          <button
            onClick={handlePrint}
            className="p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <Printer className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                PDF
              </span>
            </div>
            <div className="text-xs font-bold text-white mb-1">Print / Save as PDF</div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Instant print stylesheet formatted for A4 scientific research dossiers and hackathon presentations.
            </div>
          </button>
        </div>

        {/* Scientific Governance Declarations */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Scientific Data Governance &amp; Ethics</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 leading-relaxed text-slate-400">
            <li>Thermal anomalies represent 375m/1km radiometric heat detections, not verified discrete wildfire perimeters.</li>
            <li>Zero artificial date distribution: records without calendar dates remain purely seasonal phenology.</li>
            <li>No future ignition or fire spread predictive simulation is claimed.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
