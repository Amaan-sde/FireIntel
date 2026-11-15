"use client";

import React from "react";
import { Calendar, Filter, RotateCcw } from "lucide-react";

interface BottomScrubberProps {
  monthlySeries: Array<{ month_num: number; month_name: string; count: number }>;
  selectedMonth: number | null;
  setSelectedMonth: (month: number | null) => void;
  selectedSensor: string | null;
  setSelectedSensor: (sensor: string | null) => void;
}

export default function BottomScrubber({
  monthlySeries,
  selectedMonth,
  setSelectedMonth,
  selectedSensor,
  setSelectedSensor,
}: BottomScrubberProps) {
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
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-4xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-3 shadow-2xl font-mono-hud text-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] tracking-wider">
          <Calendar className="w-3.5 h-3.5" />
          <span>2025 TEMPORAL TIMELINE // MONTHLY OBSERVATION SCRUBBER</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sensor Filter Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
            <button
              onClick={() => setSelectedSensor(null)}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === null
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ALL (240,365)
            </button>
            <button
              onClick={() => setSelectedSensor("VIIRS")}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === "VIIRS"
                  ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              VIIRS (201,993)
            </button>
            <button
              onClick={() => setSelectedSensor("MODIS")}
              className={`px-2 py-0.5 rounded transition-all ${
                selectedSensor === "MODIS"
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              MODIS (38,372)
            </button>
          </div>

          {/* Reset Filter Button */}
          {(selectedMonth !== null || selectedSensor !== null) && (
            <button
              onClick={() => {
                setSelectedMonth(null);
                setSelectedSensor(null);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-[10px]"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>RESET</span>
            </button>
          )}
        </div>
      </div>

      {/* Monthly Bar Chart Scrubber */}
      <div className="grid grid-cols-12 gap-1.5 items-end h-16 pt-2">
        {months.map((m) => {
          const heightPct = Math.max(8, Math.round((m.count / maxCount) * 100));
          const isSelected = selectedMonth === m.month_num;
          const isApril = m.month_num === 4;
          const isDecember = m.month_num === 12;

          return (
            <button
              key={m.month_num}
              onClick={() => setSelectedMonth(isSelected ? null : m.month_num)}
              className={`flex flex-col items-center justify-end h-full group p-0.5 rounded transition-all ${
                isSelected
                  ? "bg-cyan-500/20 ring-1 ring-cyan-400"
                  : "hover:bg-slate-900/60"
              }`}
            >
              {/* Bar */}
              <div className="w-full flex items-end justify-center h-10">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[20px] rounded-t transition-all ${
                    isSelected
                      ? "bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                      : isApril
                      ? "bg-amber-400 group-hover:bg-amber-300"
                      : isDecember
                      ? "bg-cyan-500 group-hover:bg-cyan-400"
                      : "bg-slate-700 group-hover:bg-slate-500"
                  }`}
                />
              </div>

              {/* Count tooltip on hover */}
              <div className="text-[9px] text-slate-400 group-hover:text-cyan-300 mt-1">
                {m.month_name}
              </div>
              <div className="text-[8px] text-slate-500 group-hover:text-slate-300">
                {m.count}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

