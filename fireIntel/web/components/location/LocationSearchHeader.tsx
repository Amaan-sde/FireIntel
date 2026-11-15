"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Download,
  RefreshCw,
  Compass,
  Sparkles,
  Mountain,
  Check,
  AlertCircle,
  X,
} from "lucide-react";

export interface SelectedLocation {
  name: string;
  district: string;
  lat: number;
  lon: number;
  elevation_m?: number;
  region?: string;
}

interface LocationSearchHeaderProps {
  currentLocation: SelectedLocation;
  radiusKm: number;
  onSelectLocation: (loc: SelectedLocation) => void;
  onSelectRadius: (radius: number) => void;
  onRefresh: () => void;
  onOpenExport: () => void;
  isLoading: boolean;
  totalObservations?: number;
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

const POPULAR_PRESETS: SelectedLocation[] = [
  { name: "Nainital", district: "Nainital", lat: 29.3800, lon: 79.4600, elevation_m: 2084, region: "Kumaon" },
  { name: "Dehradun", district: "Dehradun", lat: 30.3165, lon: 78.0322, elevation_m: 640, region: "Garhwal" },
  { name: "Mussoorie", district: "Dehradun", lat: 30.4598, lon: 78.0644, elevation_m: 2005, region: "Garhwal" },
  { name: "Almora", district: "Almora", lat: 29.5971, lon: 79.6591, elevation_m: 1604, region: "Kumaon" },
  { name: "Joshimath", district: "Chamoli", lat: 30.5564, lon: 79.5670, elevation_m: 1875, region: "Garhwal" },
  { name: "Kedarnath", district: "Rudraprayag", lat: 30.7352, lon: 79.0669, elevation_m: 3583, region: "Garhwal" },
  { name: "Ramnagar (Corbett)", district: "Nainital", lat: 29.3949, lon: 79.1256, elevation_m: 345, region: "Kumaon" },
  { name: "Rishikesh", district: "Dehradun", lat: 30.0869, lon: 78.2676, elevation_m: 372, region: "Garhwal" },
];

export default function LocationSearchHeader({
  currentLocation,
  radiusKm,
  onSelectLocation,
  onSelectRadius,
  onRefresh,
  onOpenExport,
  isLoading,
  totalObservations,
}: LocationSearchHeaderProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search against backend gazetteer
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/v1/location/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: any) => {
    onSelectLocation({
      name: item.name,
      district: item.district,
      lat: item.lat,
      lon: item.lon,
      elevation_m: item.elevation_m,
      region: item.region,
    });
    setQuery("");
    setIsDropdownOpen(false);
  };

  const areaSqKm = (Math.PI * Math.pow(radiusKm, 2)).toFixed(1);

  return (
    <div className="bg-[#030612]/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4 font-mono-telemetry mt-2">
      {/* Top Banner: Eyebrow + Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              UTTARAKHAND LOCATION-BASED FIRE INTELLIGENCE
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Canonical Haversine Radial Query</span>
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentLocation.name}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
              {currentLocation.district} District
            </span>
            {currentLocation.elevation_m && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentLocation.elevation_m}m ASL</span>
              </span>
            )}
            {totalObservations !== undefined && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {totalObservations.toLocaleString()} Satellite Observations
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh location telemetry"
            aria-label="Refresh location telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
          </button>

          <button
            onClick={onOpenExport}
            className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-amber-500/20"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Controls: Search Box + Radius Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 border-t border-white/10">
        {/* Search Bar with Autocomplete Dropdown (7 cols) */}
        <div className="lg:col-span-7 relative" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any place in Uttarakhand (e.g. Nainital, Dehradun, Joshimath, Almora)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40 transition-all font-mono-telemetry"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#080d1a] border border-white/20 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-white/5">
              {suggestions.length > 0 ? (
                suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-amber-500/10 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.district} District • {item.region} • {item.lat.toFixed(4)}°N, {item.lon.toFixed(4)}°E
                        </div>
                      </div>
                    </div>
                    {item.elevation_m && (
                      <span className="text-[10px] font-mono-telemetry text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                        {item.elevation_m}m
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No Uttarakhand locations matching &quot;{query}&quot;. Try a nearby district town or hill station.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Radius Selector Pills (5 cols) */}
        <div className="lg:col-span-5 flex flex-wrap items-center justify-between lg:justify-end gap-2">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Analysis Radius:</span>
          <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => onSelectRadius(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  radiusKm === r
                    ? "bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 font-mono-telemetry hidden sm:inline">
            (~{areaSqKm} km²)
          </span>
        </div>
      </div>

      {/* Quick Select Popular Uttarakhand Locations */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
        <span className="text-slate-500 font-semibold uppercase text-[10px] mr-1">Quick Select:</span>
        {POPULAR_PRESETS.map((preset) => {
          const isSelected = currentLocation.name === preset.name;
          return (
            <button
              key={preset.name}
              onClick={() => onSelectLocation(preset)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/50 font-bold"
                  : "bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <span>{preset.name}</span>
              {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

