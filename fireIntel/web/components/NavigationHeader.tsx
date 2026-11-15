"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity, SlidersHorizontal, Menu, X, Orbit, Flame, Mountain, BarChart3, FileText, Database, Calendar, Compass, Sparkles } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "overview", label: "Mission Overview", href: "/", icon: Orbit },
    { id: "fires", label: "Fire Intelligence", href: "/fires", badge: "Live Lab", icon: Flame },
    { id: "calendar", label: "Burning Calendar", href: "/calendar", badge: "2025 Orbit", icon: Calendar },
    { id: "workspace", label: "Terrain Lab", href: "/workspace", badge: "Research", icon: Compass },
    { id: "studio", label: "Global Studio", href: "/studio", badge: "AutoML", icon: Sparkles },
    { id: "terrain", label: "3D Topography", href: "/terrain", badge: "3D DEM", icon: Mountain },
    { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
    { id: "data", label: "Data Explorer", href: "/data", badge: "Export", icon: Database },
    { id: "methodology", label: "Methodology & Data", href: "/methodology", icon: FileText },
  ];

  const handleModalClick = (itemId: string) => {
    if (onOpenModuleModal) {
      onOpenModuleModal(itemId);
    }
  };

  return (
    <>
      <header className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-6xl flex items-center justify-between">
        {/* Brand Identity Capsule */}
        <Link 
          href="/"
          className="glass-pill rounded-full px-3.5 sm:px-4 py-2 flex items-center gap-2.5 sm:gap-3 cursor-pointer hover:bg-white/[0.08] transition-all"
          title="FIREINTEL Mission Control Home"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-white">
            FIREINTEL
          </span>
          <span className="hidden sm:inline-block text-slate-500 text-xs">/</span>
          <span className="hidden sm:inline-block text-xs text-slate-400 font-medium">
            Uttarakhand Earth Observatory
          </span>
        </Link>

        {/* Center Navigation Capsule (Desktop & Laptop) */}
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
              className="glass-pill rounded-full px-3 sm:px-3.5 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg"
              title="Open Scientific Telemetry & Provenance Drawer"
              aria-label="Open Scientific Telemetry"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Scientific Telemetry</span>
            </button>
          )}

          {/* Mobile & Tablet Menu Toggle Button (iOS / Android) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden glass-pill rounded-full p-2 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Dropdown (iOS & Small Screen friendly) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-3 right-3 z-40 glass-surface rounded-2xl p-4 border border-white/15 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-mono-telemetry text-slate-400 uppercase tracking-wider mb-2.5 px-2">
            Mission Navigation
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? "bg-white/15 text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono-telemetry border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {onOpenTelemetryDrawer && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenTelemetryDrawer();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span>Scientific Telemetry &amp; Provenance</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
