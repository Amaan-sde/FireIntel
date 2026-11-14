"use client";

import React from "react";
import { AlertTriangle, Zap, Mountain, Cpu, ExternalLink } from "lucide-react";

interface RightAlertPanelProps {
  alerts: any[];
  onSelectHotspot?: (hotspot: any) => void;
}

export default function RightAlertPanel({
  alerts,
  onSelectHotspot,
}: RightAlertPanelProps) {
  const alertList = alerts || [];

  return (
    <div className="absolute top-18 right-6 z-20 w-84 max-h-[calc(100vh-130px)] overflow-y-auto flex flex-col gap-3 font-mono-hud text-xs">
      {/* High-FRP Alert Feed Card */}
      <div className="nasa-panel-amber rounded-lg p-3.5">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>EXTREME THERMAL EVENTS FEED</span>
          </div>
          <span className="text-[10px] text-amber-500/80">TOP FRP</span>
        </div>

        {/* Scrollable Hotspot Cards */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {alertList.map((alert: any, idx: number) => (
            <button
              key={idx}
              onClick={() => onSelectHotspot && onSelectHotspot(alert)}
              className="w-full text-left p-2 rounded bg-slate-950/80 border border-amber-500/20 hover:border-amber-400/60 hover:bg-slate-900/90 transition-all group"
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {alert.frp} MW
                </span>
                <span className="text-[10px] bg-slate-900 px-1.5 py-0.2 rounded text-slate-400 group-hover:text-amber-300 flex items-center gap-1">
                  {alert.satellite} // {alert.sensor}
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{alert.acq_date}</span>
                <span>{String(alert.acq_time).padStart(4, "0")} UTC</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>LAT: {Number(alert.latitude).toFixed(3)}°N</span>
                <span>LON: {Number(alert.longitude).toFixed(3)}°E</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Geomorphometric Master Grid Architecture Card */}
      <div className="nasa-panel rounded-lg p-3.5">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] tracking-wider mb-2">
          <Mountain className="w-3.5 h-3.5 text-cyan-400" />
          <span>HIMALAYAN TERRAIN ARCHITECTURE</span>
        </div>

        <div className="space-y-2 text-[11px] text-slate-300">
          <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Master Analysis Grid:</span>
              <span className="text-cyan-300 font-bold">2,174 cells (0.05°)</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              ~5.57 km x 4.82 km resolution
            </div>
          </div>

          <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Copernicus DEM GLO-30:</span>
              <span className="text-cyan-300 font-bold">30m Zonal Mean</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>Min: 186.5 m</span>
              <span>Max: 7,128.0 m</span>
            </div>
          </div>

          <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>Parent Synoptic Nodes:</span>
              <span className="text-cyan-300 font-bold">581 nodes (0.10°)</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              ERA5-Land meteorological lattice
            </div>
          </div>
        </div>
      </div>

      {/* Backend Engine & Performance Telemetry Card */}
      <div className="nasa-panel rounded-lg p-3 text-[10px]">
        <div className="text-slate-400 font-bold mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-emerald-400" />
            QUERY ENGINE PERFORMANCE
          </span>
          <span className="text-emerald-400 text-[9px]">BENCHMARKED</span>
        </div>

        <div className="space-y-1.5 text-slate-300">
          <div className="flex justify-between p-1 bg-slate-900/50 rounded">
            <span className="text-slate-400">DuckDB Parquet Warm Join:</span>
            <span className="text-emerald-400 font-bold">1.88 ms mean</span>
          </div>
          <div className="flex justify-between p-1 bg-slate-900/50 rounded">
            <span className="text-slate-400">Cold IO Scan (2,174 rows):</span>
            <span className="text-slate-300">3.51 ms - 312 ms</span>
          </div>
          <div className="flex justify-between p-1 bg-slate-900/50 rounded">
            <span className="text-slate-400">FastAPI Async Telemetry:</span>
            <span className="text-emerald-400 font-bold">&lt; 15 ms E2E</span>
          </div>
        </div>
      </div>
    </div>
  );
}

