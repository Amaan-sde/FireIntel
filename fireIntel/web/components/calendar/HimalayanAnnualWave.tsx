"use client";

import React, { useState } from "react";
import { Flame, Sparkles, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

interface MonthData {
  month: number;
  month_name: string;
  month_abbr: string;
  season: string;
  total_obs: number;
  percentage_of_annual: number;
  viirs_count: number;
  modis_count: number;
  mean_frp: number;
  max_frp: number;
  total_frp: number;
}

interface HimalayanAnnualWaveProps {
  months: MonthData[];
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  scope: "uttarakhand" | "regional";
}

export default function HimalayanAnnualWave({
  months,
  selectedMonth,
  onSelectMonth,
  scope,
}: HimalayanAnnualWaveProps) {
  const [hoveredMonth, setHoveredMonth] = useState<MonthData | null>(null);

  if (!months || months.length === 0) return null;

  const maxObs = Math.max(...months.map((m) => m.total_obs), 1);
  const width = 1000;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  // Calculate points for the smooth curve
  const points = months.map((m, idx) => {
    const x = paddingX + (idx / (months.length - 1)) * plotWidth;
    const y = height - paddingY - (m.total_obs / maxObs) * plotHeight;
    return { x, y, month: m };
  });

  // Construct smooth SVG path using cubic bezier segments
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Construct area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="relative rounded-2xl bg-[#030612]/90 border border-white/10 p-5 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Background Subtle Grid & Atmospheric Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-rose-500/10 to-cyan-500/5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              Annual Fire Radiance Wave
              <span className="text-[10px] font-mono-telemetry px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {scope === "uttarakhand" ? "61.2% in Apr–May" : "52.3% in Apr–May"}
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono-telemetry">
              Continuous 12-Month Wildfire Phenological Energy Profile • {scope === "uttarakhand" ? "240,365" : "510,299"} Harmonised Hotspots
            </p>
          </div>
        </div>

        {/* Legend Pills */}
        <div className="flex items-center gap-3 text-[11px] font-mono-telemetry text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            Pre-Monsoon Peak (Apr–May)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            Winter Biomass (Dec–Feb)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Monsoon Quenching (Jul–Sep)
          </span>
        </div>
      </div>

      {/* SVG Kinetic Wave Canvas */}
      <div className="relative w-full h-48 sm:h-56">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="42%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="65%" stopColor="#34d399" />
              <stop offset="85%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Reference Baseline Grid */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4 4"
          />

          {/* Glowing Area Fill */}
          <path d={areaD} fill="url(#waveGradient)" />

          {/* Glowing Primary Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#strokeGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="filter drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]"
          />

          {/* Interactive Month Nodes */}
          {points.map((pt, idx) => {
            const isHovered = hoveredMonth?.month === pt.month.month;
            const isSelected = selectedMonth === pt.month.month;
            const isPeak = pt.month.month === 4 || pt.month.month === 5;

            return (
              <g
                key={pt.month.month}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredMonth(pt.month)}
                onMouseLeave={() => setHoveredMonth(null)}
                onClick={() => onSelectMonth(selectedMonth === pt.month.month ? null : pt.month.month)}
              >
                {/* Vertical Guide Line */}
                <line
                  x1={pt.x}
                  y1={pt.y}
                  x2={pt.x}
                  y2={height - paddingY}
                  stroke={isHovered || isSelected ? "rgba(244,63,94,0.6)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={isHovered || isSelected ? "1.5" : "1"}
                  strokeDasharray={isHovered || isSelected ? "none" : "2 2"}
                />

                {/* Pulse Ring on Peak Months */}
                {isPeak && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 14 : 10}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    className="animate-ping opacity-40"
                  />
                )}

                {/* Main Node Point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 7 : isHovered ? 6 : 4.5}
                  fill={isSelected ? "#ffffff" : isPeak ? "#f43f5e" : "#f59e0b"}
                  stroke="#030612"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />

                {/* Month Name Below Axis */}
                <text
                  x={pt.x}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-mono-telemetry transition-colors ${
                    isSelected
                      ? "fill-white font-bold"
                      : isHovered
                      ? "fill-amber-300 font-semibold"
                      : isPeak
                      ? "fill-rose-400 font-medium"
                      : "fill-slate-500"
                  }`}
                >
                  {pt.month.month_abbr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Hover/Selection Tooltip */}
        {(hoveredMonth || (selectedMonth && months.find((m) => m.month === selectedMonth))) && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/90 border border-amber-500/40 backdrop-blur-xl shadow-2xl flex items-center gap-4 text-xs font-mono-telemetry pointer-events-none transition-all"
          >
            {(() => {
              const active = hoveredMonth || months.find((m) => m.month === selectedMonth)!;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-bold text-white uppercase">{active.month_name}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-rose-400 font-bold">{active.total_obs.toLocaleString()} Hotspots</span>
                    <span className="text-slate-400">({active.percentage_of_annual}% of annual)</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-slate-400">
                    <span>VIIRS: <strong className="text-cyan-300">{active.viirs_count.toLocaleString()}</strong></span>
                    <span>MODIS: <strong className="text-amber-300">{active.modis_count.toLocaleString()}</strong></span>
                    <span>Mean FRP: <strong className="text-emerald-300">{active.mean_frp} MW</strong></span>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

