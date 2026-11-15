"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, Layers, Mountain, LineChart, FileText, CheckCircle2 } from "lucide-react";

interface ModulePreviewModalProps {
  module: string | null;
  onClose: () => void;
}

export default function ModulePreviewModal({
  module,
  onClose,
}: ModulePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!module) return null;

  const moduleData: Record<string, any> = {
    fires: {
      title: "Satellite Fire Intelligence",
      badge: "Milestone 2 Architecture",
      icon: Layers,
      color: "text-amber-400",
      description: "Dedicated high-density geospatial analysis module featuring independent sensor confidence decoupling, temporal playback controls, and brightness temperature spectra.",
      features: [
        "Independent MODIS percentage slider (0–100%) and VIIRS categorical checkboxes (Low/Nominal/High)",
        "Temporal scrubber across all 365 days of 2025 with play/pause playback",
        "Diurnal overpass filters (Terra ~10:30, Aqua/SNPP ~13:30 local)",
        "Pre-monsoon peak vs winter fire comparative modes"
      ],
      dataset: "uttarakhand_harmonised_fires.parquet (240,365 observations, 16 attributes)"
    },
    terrain: {
      title: "3D Himalayan Topography & Geomorphology",
      badge: "Milestone 2 Architecture",
      icon: Mountain,
      color: "text-emerald-400",
      description: "Copernicus DEM GLO-30 3D terrain canvas enabling interactive choropleth exploration of 25 geomorphometric layers across the 2,174 master grid cells.",
      features: [
        "Dynamic 3D terrain relief extrusion with adjustable camera pitch and sun-angle hillshading",
        "Interactive layer switching: Mean Elevation, Horn Slope, Northness, Eastness, Riley TRI",
        "Discrete 0.05° cell inspector with radial aspect distributions",
        "Elevation fire distribution histograms"
      ],
      dataset: "copernicus_dem_uttarakhand.vrt (18,000 x 14,400 px, 14 tiles) & dem_terrain_features_005deg.parquet"
    },
    analytics: {
      title: "Historical Spatiotemporal Analytics",
      badge: "Milestone 3 Architecture",
      icon: LineChart,
      color: "text-sky-400",
      description: "Deep statistical storytelling exploring the 2025 pre-monsoon peak (38.23% in Apr–May, 46.05% in Mar–Jun), cross-sensor candidate pairings, and diurnal distributions.",
      features: [
        "Daily fire occurrence time series highlighting the April 25–May 25 extreme concentration",
        "Diurnal overpass curves comparing morning Terra with afternoon Aqua/SNPP detections",
        "Scatter plot of 256 candidate coincident overpass pairs (Δd ≤ 1.0 km, Δt ≤ 60 min)",
        "Geodetic latitude band distributions (South, Central, North)"
      ],
      dataset: "eda_summary.json & boundary-validated fire time series"
    },
    methodology: {
      title: "Scientific Methodology & Open Data Provenance",
      badge: "Milestone 2 Architecture",
      icon: FileText,
      color: "text-purple-400",
      description: "Transparent, reproducible open-science audit room detailing satellite physics, geodetic math, boundary repair algorithms, and automated test suite health.",
      features: [
        "Full data lineage from raw FIRMS archives to validated Parquet matrices",
        "Sensor specifications matrix comparing Terra/Aqua MODIS vs Suomi-NPP VIIRS",
        "Live 43/43 automated regression test suite telemetry and benchmark metrics",
        "Direct reproducible Python pipeline scripts and mathematical formulas"
      ],
      dataset: "All manifest files (copernicus_dem, dem_terrain, project_integrity)"
    }
  };

  const current = moduleData[module] || moduleData["fires"];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-lg glass-surface rounded-2xl p-6 md:p-7 shadow-2xl border border-white/10 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10">
              <IconComponent className={`w-6 h-6 ${current.color}`} />
            </div>
            <div>
              <span className="text-[10px] font-mono-telemetry uppercase tracking-wider text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/5">
                {current.badge}
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                {current.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Narrative Description */}
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4">
          {current.description}
        </p>

        {/* Core Capabilities */}
        <div className="space-y-2 mb-5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono-telemetry">
            Key Architecture & Features:
          </div>
          {current.features.map((feat: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Verified Data Lineage Badge */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-6 text-xs text-slate-400 flex items-center justify-between">
          <span>Active Data Binding:</span>
          <span className="font-mono-telemetry text-slate-200 text-[11px] truncate max-w-[240px]">
            {current.dataset}
          </span>
        </div>

        {/* Action Button */}
        {module === "fires" ? (
          <Link
            href="/fires"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 text-slate-950 font-medium text-xs hover:bg-amber-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Open Fire Intelligence Laboratory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-slate-950 font-medium text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Continue Exploring Mission Control</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

