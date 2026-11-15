"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Layers,
  Save,
  RotateCcw,
  Download,
  Flame,
  Globe2,
  Calendar,
  Sparkles,
  Edit2,
  Check,
  FolderOpen,
} from "lucide-react";

interface WorkspaceMissionHeaderProps {
  sessionTitle: string;
  onSessionTitleChange: (newTitle: string) => void;
  aoiName: string;
  aoiAreaSqkm: number;
  temporalMode: "chronological" | "seasonal";
  onTemporalModeChange: (mode: "chronological" | "seasonal") => void;
  onSaveSession: () => void;
  onResetSession: () => void;
  onOpenSavedSessions: () => void;
  onOpenExport: () => void;
  hasSavedSessions: boolean;
}

export default function WorkspaceMissionHeader({
  sessionTitle,
  onSessionTitleChange,
  aoiName,
  aoiAreaSqkm,
  temporalMode,
  onTemporalModeChange,
  onSaveSession,
  onResetSession,
  onOpenSavedSessions,
  onOpenExport,
  hasSavedSessions,
}: WorkspaceMissionHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(sessionTitle);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    onSaveSession();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleFinishEditing = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onSessionTitleChange(tempTitle.trim());
    } else {
      setTempTitle(sessionTitle);
    }
  };

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Top Meta Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-telemetry font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              TERRAIN INTELLIGENCE LAB
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-xs font-mono-telemetry text-slate-300 flex items-center gap-1">
              Active AOI: <strong className="text-white">{aoiName}</strong> ({aoiAreaSqkm.toLocaleString()} km²)
            </span>
          </div>

          {/* Editable Research Session Title */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFinishEditing()}
                  className="text-xl sm:text-2xl font-extrabold text-white bg-black/60 border border-cyan-500/50 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono-telemetry"
                  autoFocus
                />
                <button
                  onClick={handleFinishEditing}
                  className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {sessionTitle}
                </h1>
                <Edit2 className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono-telemetry text-xs">
          {/* Analysis Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/80 border border-white/10">
            <button
              data-testid="mode-chronological-btn"
              onClick={() => onTemporalModeChange("chronological")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                temporalMode === "chronological"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>2025 Chronological</span>
            </button>
            <button
              data-testid="mode-seasonal-btn"
              onClick={() => onTemporalModeChange("seasonal")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                temporalMode === "seasonal"
                  ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Multi-Year Seasonal</span>
            </button>
          </div>

          {/* Save Session */}
          <button
            data-testid="save-session-btn"
            onClick={handleSave}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            title="Save current workspace configuration to browser storage"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Saved Sessions Drawer / Modal */}
          {hasSavedSessions && (
            <button
              data-testid="saved-sessions-btn"
              onClick={onOpenSavedSessions}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open previously saved research sessions"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Saved</span>
            </button>
          )}

          {/* Reset */}
          <button
            onClick={onResetSession}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Reset research session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Export Report */}
          <button
            data-testid="export-report-btn"
            onClick={onOpenExport}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-bold shadow-lg"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}

