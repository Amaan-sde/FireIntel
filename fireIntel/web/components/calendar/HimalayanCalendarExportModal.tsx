"use client";

import React, { useState } from "react";
import {
  Download,
  X,
  FileSpreadsheet,
  FileCode,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Check,
} from "lucide-react";

interface HimalayanCalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: "uttarakhand" | "regional";
  selectedDate: string | null;
  selectedMonth: number | null;
  selectedSeason: string | null;
  selectedSensor: string | null;
  totalMatching: number;
}

export default function HimalayanCalendarExportModal({
  isOpen,
  onClose,
  scope,
  selectedDate,
  selectedMonth,
  selectedSeason,
  selectedSensor,
  totalMatching,
}: HimalayanCalendarExportModalProps) {
  const [format, setFormat] = useState<"csv" | "json" | "geojson">("csv");
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTriggerExport = async () => {
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const params = new URLSearchParams();
      params.set("scope", scope);
      params.set("format", format);

      if (selectedDate) {
        params.set("start_date", selectedDate);
        params.set("end_date", selectedDate);
      } else if (selectedMonth) {
        params.set("month", String(selectedMonth));
      } else if (selectedSeason) {
        params.set("season", selectedSeason);
      }

      if (selectedSensor && selectedSensor !== "ALL") {
        params.set("sensor", selectedSensor);
      }

      // Verified dates only if querying calendar
      params.set("verified_dates_only", "true");

      // Trigger download
      const exportUrl = `/api/v1/data/export?${params.toString()}`;
      const link = document.createElement("a");
      link.href = exportUrl;
      link.setAttribute(
        "download",
        `fireintel_calendar_${scope}_${selectedDate || "2025"}.${format === "geojson" ? "geojson" : format}`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 font-mono-telemetry">
      <div className="relative w-full max-w-lg bg-[#030612] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl text-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                SCIENTIFIC DATA EXTRACTION
              </div>
              <h2 className="text-base font-bold text-white">
                Export Burning Activity Records
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close export dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Scope & Selection Summary */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Target Scope:</span>
            <span className="font-bold text-white capitalize">{scope}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Temporal Filter:</span>
            <span className="text-amber-400 font-bold">
              {selectedDate
                ? `Specific Date: ${selectedDate}`
                : selectedMonth
                ? `Month ${selectedMonth} (2025)`
                : selectedSeason
                ? `Season: ${selectedSeason}`
                : "Full Year 2025 Verified Series"}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500">Matching Observations:</span>
            <span className="text-emerald-400 font-bold">
              {totalMatching.toLocaleString()} records
            </span>
          </div>
        </div>

        {/* Format Selection Cards */}
        <div className="space-y-2">
          <label className="text-[11px] text-slate-400 uppercase tracking-wider">
            Select Output Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* CSV */}
            <button
              onClick={() => setFormat("csv")}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                format === "csv"
                  ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div className="text-xs font-bold">CSV</div>
              <div className="text-[9px] text-slate-500">Tabular (Excel)</div>
            </button>

            {/* JSON */}
            <button
              onClick={() => setFormat("json")}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                format === "json"
                  ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <FileCode className="w-5 h-5 text-amber-400" />
              <div className="text-xs font-bold">JSON</div>
              <div className="text-[9px] text-slate-500">Structured Data</div>
            </button>

            {/* GeoJSON */}
            <button
              onClick={() => setFormat("geojson")}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                format === "geojson"
                  ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-black/40 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <MapPin className="w-5 h-5 text-sky-400" />
              <div className="text-xs font-bold">GeoJSON</div>
              <div className="text-[9px] text-slate-500">GIS Features</div>
            </button>
          </div>
        </div>

        {/* Scientific Limitations & Provenance Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] space-y-1">
          <div className="font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>SCIENTIFIC DISCLOSURE & DATA PROVENANCE</span>
          </div>
          <p className="font-sans leading-relaxed text-slate-300 text-[10px]">
            Export preserves original sensor values, nadir scan footprints, and geodetic coordinates. Records without verified dates are preserved with NULL timestamps. Truncation north of 31.0°N applies to the source dataset.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleTriggerExport}
            disabled={downloading}
            className="px-5 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Downloaded Successfully</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{downloading ? "Preparing Export..." : `Download ${format.toUpperCase()}`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

