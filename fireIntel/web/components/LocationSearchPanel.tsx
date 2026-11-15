"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  MapPin,
  X,
  Compass,
  ChevronDown,
  ChevronUp,
  History,
  Navigation,
  Loader2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { UttarakhandPlace } from "@/app/api/location-search/route";

interface LocationSearchPanelProps {
  onSelectPlace: (place: UttarakhandPlace) => void;
  selectedPlaceName?: string | null;
  className?: string;
}

const DEFAULT_RECENTS: UttarakhandPlace[] = [
  { id: "dist_dehradun", name: "Dehradun", category: "District", district: "Dehradun", displayName: "Dehradun District, Uttarakhand", lat: 30.3165, lon: 78.0322, zoom: 10, source: "local" },
  { id: "city_mussoorie", name: "Mussoorie", category: "Town", district: "Dehradun", tehsil: "Mussoorie", displayName: "Mussoorie, Dehradun, Uttarakhand", lat: 30.4598, lon: 78.0644, zoom: 12.5, source: "local" },
  { id: "town_joshimath", name: "Joshimath", category: "Town", district: "Chamoli", tehsil: "Joshimath Tehsil", displayName: "Joshimath, Chamoli, Uttarakhand", lat: 30.5556, lon: 79.5613, zoom: 12.5, source: "local" },
  { id: "dist_nainital", name: "Nainital", category: "District", district: "Nainital", displayName: "Nainital District, Uttarakhand", lat: 29.3803, lon: 79.4636, zoom: 10, source: "local" },
  { id: "town_ranikhet", name: "Ranikhet", category: "Town", district: "Almora", tehsil: "Ranikhet Tehsil", displayName: "Ranikhet, Almora, Uttarakhand", lat: 29.6434, lon: 79.4297, zoom: 12.5, source: "local" },
];

export default function LocationSearchPanel({
  onSelectPlace,
  selectedPlaceName,
  className = "",
}: LocationSearchPanelProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<UttarakhandPlace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<UttarakhandPlace[]>(DEFAULT_RECENTS);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Load recents from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("FIREINTEL_RECENT_SEARCHES_V1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentSearches(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToRecents = (place: UttarakhandPlace) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((p) => p.name.toLowerCase() !== place.name.toLowerCase());
      const updated = [place, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("FIREINTEL_RECENT_SEARCHES_V1", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Debounced search query
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setHighlightedIndex(-1);

    try {
      const res = await fetch(`/api/location-search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.results || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.warn("Location search error:", err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length >= 2) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        performSearch(val);
      }, 250);
    } else {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setHasSearched(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSelect = (place: UttarakhandPlace) => {
    setQuery(place.name);
    setSuggestions([]);
    setIsInputFocused(false);
    saveToRecents(place);
    onSelectPlace(place);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setIsInputFocused(false);
    }
  };

  const getCategoryBadge = (cat: UttarakhandPlace["category"]) => {
    switch (cat) {
      case "District":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "City":
      case "Town":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Village":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Tehsil":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Collapsed Pill Button */}
      {!isExpanded && (
        <button
          onClick={() => {
            setIsExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          className="flex items-center gap-2 bg-[#040810]/90 backdrop-blur-xl border border-cyan-500/30 rounded-full px-4 py-2 text-xs font-mono-telemetry text-slate-200 hover:text-white hover:border-cyan-400 shadow-[0_12px_32px_rgba(0,0,0,0.7)] transition-all cursor-pointer group"
          title="Open Location Explorer Search Console"
          aria-label="Expand Location Explorer"
        >
          <div className="relative">
            <Compass className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <span className="font-bold tracking-wider text-white">LOCATION EXPLORER</span>
          {selectedPlaceName && (
            <span className="text-amber-400 font-semibold truncate max-w-[120px]">
              · {selectedPlaceName}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </button>
      )}

      {/* Expanded Search Console Card */}
      {isExpanded && (
        <aside
          aria-label="Location Explorer Panel"
          className="bg-[#040810]/95 backdrop-blur-2xl rounded-2xl border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-slate-200 w-[88vw] max-w-[340px] sm:w-[340px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(85,199,232,0.15), 0 24px 60px rgba(0,0,0,0.9)" }}
        >
          {/* Header Row */}
          <div className="p-3 sm:p-3.5 pb-2.5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-black/80 via-[#0B3D91]/15 to-black/80">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-[11px] font-mono-telemetry font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
                  <span>LOCATION EXPLORER</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-normal">
                    UTTARAKHAND
                  </span>
                </h2>
                <div className="text-[9px] text-slate-400 font-mono-telemetry">
                  Geographic Place &amp; Terrain Search
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Collapse Location Explorer"
              title="Collapse Location Explorer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="p-3 sm:p-3.5 pb-2">
            <div className="relative flex items-center">
              <MapPin className="absolute left-3 w-4 h-4 text-cyan-400 shrink-0 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsInputFocused(true)}
                placeholder="Search village, city, district..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 font-mono-telemetry transition-all"
                aria-label="Search village, city, district in Uttarakhand"
                autoComplete="off"
              />

              {/* Clear button or loading indicator */}
              <div className="absolute right-2.5 flex items-center">
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : query.length > 0 ? (
                  <button
                    onClick={handleClear}
                    className="p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Clear search text"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Search Suggestions Dropdown */}
          {hasSearched && query.trim().length >= 2 && (
            <div
              ref={dropdownRef}
              className="px-3 pb-2 max-h-56 overflow-y-auto space-y-1 font-mono-telemetry border-b border-white/[0.08]"
            >
              <div className="text-[9px] uppercase tracking-wider text-slate-500 px-1 py-0.5 flex items-center justify-between">
                <span>Matching Places ({suggestions.length})</span>
                <span className="text-[8px] text-slate-600">Use ↑↓ &amp; Enter</span>
              </div>

              {suggestions.length === 0 && !isLoading && (
                <div className="py-4 text-center text-xs text-amber-400/90 bg-amber-500/5 rounded-xl border border-amber-500/15 flex flex-col items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-bold tracking-wider text-[11px]">NO MATCHING LOCATION FOUND</span>
                  <span className="text-[10px] text-slate-400 max-w-[240px]">
                    Ensure the place is within Uttarakhand study envelope [28°N–31.5°N, 77°E–81.5°E].
                  </span>
                </div>
              )}

              {suggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={item.id || idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 border ${
                      isHighlighted
                        ? "bg-cyan-500/20 border-cyan-500/40 text-white shadow-sm"
                        : "bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[#F2F0E9] truncate">
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full border font-normal ${getCategoryBadge(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.tehsil ? `${item.tehsil}, ` : ""}
                        <span className="text-[#C6A66B]">{item.district}</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-500 shrink-0 text-right pt-0.5">
                      {item.lat.toFixed(2)}°N
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent Searches Section */}
          <div className="p-3 sm:p-3.5 pt-2">
            <div className="flex items-center justify-between text-[9px] font-mono-telemetry uppercase tracking-wider text-slate-500 mb-2">
              <span className="flex items-center gap-1.5">
                <History className="w-3 h-3 text-cyan-400" />
                <span>Recent &amp; Notable Locations</span>
              </span>
              <span className="text-[8px] text-slate-600">Quick Jump</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 font-mono-telemetry text-xs">
              {recentSearches.slice(0, 4).map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSelect(place)}
                  className="p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/15 border border-white/[0.06] hover:border-cyan-500/30 text-left transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-200 group-hover:text-white truncate text-[11px]">
                      {place.name}
                    </span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-black/60 text-slate-400 border border-white/5 shrink-0">
                      {place.category === "District" ? "Dist" : place.category.slice(0, 4)}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 group-hover:text-cyan-300 truncate mt-1">
                    {place.district}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="px-3.5 py-2 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-[9px] font-mono-telemetry text-slate-500">
            <span>Coverage: 13 Districts // 28°N–31.5°N</span>
            <span className="text-cyan-400/80">GLO-30 Synchronized</span>
          </div>
        </aside>
      )}
    </div>
  );
}
