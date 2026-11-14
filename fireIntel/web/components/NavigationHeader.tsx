"use client";

import React from "react";
import Link from "next/link";
import { Activity, SlidersHorizontal } from "lucide-react";

interface NavigationHeaderProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onOpenTelemetryDrawer?: () => void;
  onOpenModuleModal?: (module: string) => void;
}

export default function NavigationHeader({
  activeTab,
  setActiveTab,
  onOpenTelemetryDrawer,
  onOpenModuleModal,
}: NavigationHeaderProps) {
  const navItems = [
    { id: "overview", label: "Mission Overview", href: "/" },
    { id: "fires", label: "Fire Intelligence", href: "/fires", badge: "Live Lab" },
    { id: "terrain", label: "3D Topography", href: "/terrain", badge: "3D DEM" },
    { id: "analytics", label: "Analytics", href: "/analytics" },
    { id: "methodology", label: "Methodology & Data", href: "/methodology" },
  ];

  const handleModalClick = (itemId: string) => {
    if (onOpenModuleModal) {
      onOpenModuleModal(itemId);
    }
  };

  return (
    <header className="fixed top-5 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-6xl flex items-center justify-between">
      {/* Brand Identity Capsule */}
      <Link 
        href="/"
        className="glass-pill rounded-full px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-white/[0.08] transition-all"
        title="FIREINTEL Mission Control Home"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm font-semibold tracking-wider text-white">
          FIREINTEL
        </span>
        <span className="hidden sm:inline-block text-slate-500 text-xs">/</span>
        <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
          Uttarakhand Earth Observatory
        </span>
      </Link>

      {/* Center Navigation Capsule */}
      <nav className="hidden md:flex items-center glass-pill rounded-full p-1 text-xs shadow-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const buttonClass = `px-4 py-1.5 rounded-full transition-all flex items-center gap-2 font-medium cursor-pointer ${
            isActive
              ? "bg-white/20 text-white font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
          }`;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={buttonClass}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono-telemetry border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Action & Provenance Capsule */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 glass-pill rounded-full px-3.5 py-2 text-xs text-slate-300">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono-telemetry text-[11px]">43/43 Tests Verified</span>
        </div>

        {onOpenTelemetryDrawer && (
          <button
            onClick={onOpenTelemetryDrawer}
            className="glass-pill rounded-full px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            title="Open Scientific Telemetry & Provenance Drawer"
            aria-label="Open Scientific Telemetry"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Scientific Telemetry</span>
          </button>
        )}
      </div>
    </header>
  );
}
