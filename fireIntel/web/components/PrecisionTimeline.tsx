"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

interface PrecisionTimelineProps {
  monthlySeries: Array<{ month_num: number; month_name: string; count: number }>;
  selectedMonth: number | null;
  setSelectedMonth: (month: number | null) => void;
  selectedSensor: string | null;
  setSelectedSensor: (sensor: string | null) => void;
}

export default function PrecisionTimeline({
  monthlySeries,
  selectedMonth,
  setSelectedMonth,
  selectedSensor,
  setSelectedSensor,
}: PrecisionTimelineProps) {
  const months = monthlySeries || [
    { month_num: 1, month_name: "Jan", count: 666 },
    { month_num: 2, month_name: "Feb", count: 848 },
    { month_num: 3, month_name: "Mar", count: 467 },
    { month_num: 4, month_name: "Apr", count: 2255 },
    { month_num: 5, month_name: "May", count: 628 },
    { month_num: 6, month_name: "Jun", count: 123 },
    { month_num: 7, month_name: "Jul", count: 5 },
    { month_num: 8, month_name: "Aug", count: 1 },
    { month_num: 9, month_name: "Sep", count: 3 },
    { month_num: 10, month_name: "Oct", count: 443 },
    { month_num: 11, month_name: "Nov", count: 424 },
    { month_num: 12, month_name: "Dec", count: 1678 },
  ];

  const maxCount = Math.max(...months.map((m) => m.count));

  return (
    <div className="absolute bottom-6 right-8 z-20 hidden md:flex items-center gap-4 glass-surface rounded-2xl px-5 py-3 text-xs shadow-2xl">
      {/* Sensor Segmented Control */}
      <div className="flex items-center glass-pill rounded-full p-0.5 text-[11px]">
        <button
          onClick={() => setSelectedSensor(null)}
          data-sensor="ALL"
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            selectedSensor === null
              ? "bg-white/20 text-white font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All Sensors
        </button>
        <button
          onClick={() => setSelectedSensor(selectedSensor === "VIIRS" ? null : "VIIRS")}
          data-sensor="VIIRS"
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            selectedSensor === "VIIRS"
              ? "bg-amber-500/25 text-amber-300 font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          VIIRS
        </button>
        <button
          onClick={() => setSelectedSensor(selectedSensor === "MODIS" ? null : "MODIS")}
          data-sensor="MODIS"
          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
            selectedSensor === "MODIS"
              ? "bg-sky-500/25 text-sky-300 font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          MODIS
        </button>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-8 bg-white/10" />

      {/* 12-Month Temporal Spark-Bars */}
      <div className="flex items-end gap-1.5 h-10">
        {months.map((m) => {
          const heightPct = Math.max(14, Math.round((m.count / maxCount) * 100));
          const isSelected = selectedMonth === m.month_num;
          const isApril = m.month_num === 4;

          return (
            <button
              key={m.month_num}
              onClick={() => setSelectedMonth(isSelected ? null : m.month_num)}
              data-month={m.month_num}
              className="flex flex-col items-center justify-end h-full group transition-all cursor-pointer"
              title={`${m.month_name} 2025: ${m.count} observations (Click to filter)`}
              aria-label={`Filter by ${m.month_name} (${m.count} observations)`}
            >
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-2 md:w-2.5 rounded-sm transition-all ${
                  isSelected
                    ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] ring-1 ring-white"
                    : isApril
                    ? "bg-amber-400/80 group-hover:bg-amber-300"
                    : "bg-white/20 group-hover:bg-white/40"
                }`}
              />
              <span className={`text-[9px] mt-1 transition-colors ${
                isSelected ? "text-amber-300 font-bold" : "text-slate-500 group-hover:text-slate-300"
              }`}>
                {m.month_name.charAt(0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reset Button */}
      {(selectedMonth !== null || selectedSensor !== null) && (
        <button
          onClick={() => {
            setSelectedMonth(null);
            setSelectedSensor(null);
          }}
          data-action="reset-filters"
          className="p-1.5 rounded-full hover:bg-white/10 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
          title="Reset All Filters"
          aria-label="Reset All Filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
