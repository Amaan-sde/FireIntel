"use client";

import React from "react";
import { Activity, ShieldCheck, Satellite, Compass } from "lucide-react";

interface HeaderHUDProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function HeaderHUD({ activeTab, setActiveTab }: HeaderHUDProps) {
  const tabs = [
    { id: "mission-control", label: "01 // MISSION CONTROL", status: "ACTIVE" },
    { id: "fires", label: "02 // SATELLITE FIRE INTEL", status: "MILESTONE 2" },
    { id: "terrain", label: "03 // 3D TERRAIN EXPLORER", status: "MILESTONE 2" },
    { id: "analytics", label: "04 // HISTORICAL ANALYTICS", status: "MILESTONE 3" },
    { id: "environment", label: "05 // ENVIRONMENTAL INTEL", status: "STANDBY" },
    { id: "methodology", label: "06 // METHODOLOGY & DATA", status: "MILESTONE 2" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-cyan-500/20 px-6 py-2.5 flex items-center justify-between shadow-2xl">
      {/* Brand & Mission Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/40">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-widest text-slate-100 font-mono-hud glow-cyan">
                FIREINTEL
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono-hud">
                NASA SPACE APPS 2026
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono-hud flex items-center gap-1.5">
              <span>SECTOR: UTTARAKHAND, INDIA</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" /> SYS.ONLINE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Modules */}
      <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-md border border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-mono-hud transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 glow-cyan"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <span>{tab.label}</span>
            {tab.status !== "ACTIVE" && (
              <span className={`text-[9px] px-1 py-0.2 rounded ${
                tab.status === "STANDBY"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}>
                {tab.status}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* System Telemetry & Test Suite Badge */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-emerald-500/30 px-2.5 py-1 rounded text-xs font-mono-hud text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>TEST SUITE: 43/43 PASSED (100%)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-cyan-500/30 px-2.5 py-1 rounded text-xs font-mono-hud text-cyan-300">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>WGS 84 // EPSG:4326</span>
        </div>
      </div>
    </header>
  );
}

