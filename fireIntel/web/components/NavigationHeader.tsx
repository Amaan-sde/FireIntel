"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity, SlidersHorizontal, Menu, X, Orbit, Flame, Mountain, BarChart3, FileText, Database, Calendar, Compass, Sparkles, MapPin } from "lucide-react";

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
    { id: "overview", label: "Overview", href: "/", icon: Orbit },
    { id: "fires", label: "Fires", href: "/fires", badge: "Live", icon: Flame },
    { id: "calendar", label: "Calendar", href: "/calendar", badge: "Orbit", icon: Calendar },
    { id: "location", label: "Location", href: "/location-intelligence", badge: "Radius", icon: MapPin },
    { id: "workspace", label: "Terrain Lab", href: "/workspace", badge: "Research", icon: Compass },
    { id: "studio", label: "Global Studio", href: "/studio", badge: "AutoML", icon: Sparkles },
    { id: "terrain", label: "3D Topo", href: "/terrain", badge: "DEM", icon: Mountain },
    { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
    { id: "data", label: "Data", href: "/data", badge: "Export", icon: Database },
    { id: "methodology", label: "Methodology", href: "/methodology", icon: FileText },
  ];

  const handleModalClick = (itemId: string) => {
    if (onOpenModuleModal) {
      onOpenModuleModal(itemId);
    }
  };

  return (
    <>
      <header className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-[1480px] flex items-center justify-between pointer-events-auto">
        {/* Brand Identity Capsule */}
        <Link 
          href="/"
          className="glass-pill rounded-full px-3 sm:px-3.5 py-1.5 flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-white/[0.08] transition-all shrink-0"
          title="FIREINTEL Mission Control Home"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-white">
            FIREINTEL
          </span>
          <span className="hidden 2xl:inline-block text-slate-500 text-xs">/</span>
          <span className="hidden 2xl:inline-block text-xs text-slate-400 font-medium truncate max-w-[140px]">
            Observatory
          </span>
        </Link>

        {/* Center Navigation Capsule (Desktop & Laptop >= 1200px) */}
        <nav className="hidden xl:flex items-center glass-pill rounded-full p-1 text-xs shadow-2xl overflow-x-auto no-scrollbar whitespace-nowrap gap-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const buttonClass = `px-2 sm:px-2.5 py-1 rounded-full transition-all flex items-center gap-1 text-[11px] font-medium cursor-pointer shrink-0 ${
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
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-2 glass-pill rounded-full px-3 py-1.5 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono-telemetry text-[11px]">43/43 Verified</span>
          </div>

          {onOpenTelemetryDrawer && (
            <button
              onClick={onOpenTelemetryDrawer}
              className="glass-pill rounded-full px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
              title="Open Scientific Telemetry & Provenance Drawer"
              aria-label="Open Scientific Telemetry"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline text-xs">Telemetry</span>
            </button>
          )}

          {/* Mobile & Tablet Menu Toggle Button (iOS / Android / Tablets < 1280px) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="xl:hidden glass-pill rounded-full p-2 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Navigation Dropdown (< 1280px) */}
      {isMobileMenuOpen && (
        <div className="xl:hidden fixed top-16 left-3 right-3 sm:left-auto sm:right-6 sm:w-80 z-50 glass-surface rounded-2xl p-4 border border-white/15 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
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
