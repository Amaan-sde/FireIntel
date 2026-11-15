"use client";

import React from "react";
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Flame,
  Radio,
  Zap,
  Info,
} from "lucide-react";

interface FindingItem {
  type: string;
  title: string;
  description: string;
}

interface WorkspaceFindingsPanelProps {
  findings: FindingItem[];
  scientificDisclosures: string[];
  aoiName: string;
}

export default function WorkspaceFindingsPanel({
  findings,
  scientificDisclosures,
  aoiName,
}: WorkspaceFindingsPanelProps) {
  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-5 font-mono-telemetry text-xs">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Evidence-Based Research Findings
          </h3>
          <span className="text-[10px] text-slate-400">
            Deterministic conclusions synthesized from empirical DuckDB satellite telemetry for {aoiName}
          </span>
        </div>
      </div>

      {/* Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {findings.map((f, idx) => {
          let icon = <Flame className="w-4 h-4 text-rose-400" />;
          let borderStyle = "border-rose-500/30 bg-rose-950/10";
          let titleColor = "text-rose-300";

          if (f.type === "quench" || f.type === "energetic_drop") {
            icon = <Zap className="w-4 h-4 text-emerald-400" />;
            borderStyle = "border-emerald-500/30 bg-emerald-950/10";
            titleColor = "text-emerald-300";
          } else if (f.type === "sensor_footprint") {
            icon = <Radio className="w-4 h-4 text-cyan-400" />;
            borderStyle = "border-cyan-500/30 bg-cyan-950/10";
            titleColor = "text-cyan-300";
          }

          return (
            <div key={idx} className={`p-4 rounded-xl border ${borderStyle} space-y-2`}>
              <div className="flex items-center gap-2">
                {icon}
                <strong className={`text-xs font-bold ${titleColor}`}>{f.title}</strong>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{f.description}</p>
            </div>
          );
        })}
      </div>

      {/* Scientific Disclosures & Limitations Banner */}
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Scientific Governance & Limitations</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-slate-400 list-disc list-inside">
          {scientificDisclosures.map((disc, idx) => (
            <li key={idx} className="leading-relaxed">
              {disc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

