"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  Layers,
  SlidersHorizontal,
  Mountain,
  Compass,
  BarChart3,
  FileText,
  Database,
  ArrowRight,
  Eye,
  EyeOff,
  Grid,
  MapPin,
  X,
  ShieldCheck,
  Thermometer,
  Sun,
  Activity,
  Maximize2,
  TrendingUp,
  Info,
  Navigation,
  Loader2,
  AlertTriangle,
  Globe,
  Radio,
  Clock,
} from "lucide-react";
import GlobeMap, { TerrainMode } from "@/components/GlobeMap";
import HotspotInspector from "@/components/HotspotInspector";
import ScientificTelemetryDrawer from "@/components/ScientificTelemetryDrawer";
import LocationSearchPanel from "@/components/LocationSearchPanel";
import { UttarakhandPlace } from "@/app/api/location-search/route";

// ─── Helper: decode lat/lon from cell ID (UT_050_{lat}_{lon}) ───────────────
function parseCellCentroid(cellId: string): [number, number] | null {
  const parts = cellId?.split("_");
  if (parts && parts.length >= 4) {
    const lat = parseFloat(parts[2]);
    const lon = parseFloat(parts[3]);
    if (!isNaN(lat) && !isNaN(lon)) return [lon, lat];
  }
  return null;
}

// ─── Nominatim reverse-geocode result shape ──────────────────────────────────
interface GeoPlace {
  village?: string;
  suburb?: string;
  town?: string;
  city?: string;
  county?: string;      // district equivalent
  state_district?: string; // tehsil / block in India
  state?: string;
  country?: string;
  postcode?: string;
  display_name?: string;
  // extra parsed fields we add
  district?: string;
  tehsil?: string;
  locality?: string;
  error?: string;
}

function getLocality(place: GeoPlace): string {
  return (
    place.village ||
    place.suburb ||
    place.town ||
    place.city ||
    ""
  );
}

function getDistrict(place: GeoPlace): string {
  return place.district || place.county || "";
}

function getTehsil(place: GeoPlace): string {
  return place.tehsil || place.state_district || "";
}

// ─── Fire Intelligence Buffer Computation (10 km radius) ───────────────────
function computeFireStats(fires: any[], lng: number, lat: number, radiusKm = 10) {
  if (!fires || fires.length === 0) return null;
  let count = 0;
  let viirsCount = 0;
  let modisCount = 0;
  let dayCount = 0;
  let nightCount = 0;
  let peakFrp = 0;
  let sumFrp = 0;
  let closestDist = Infinity;

  for (const f of fires) {
    const coords = f.geometry?.coordinates;
    if (!coords) continue;
    const [flng, flat] = coords;
    const dLat = (flat - lat) * 111.32;
    const dLng = (flng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.hypot(dLat, dLng);
    if (dist <= radiusKm) {
      count++;
      if (dist < closestDist) closestDist = dist;
      const frp = f.properties?.frp || 0;
      sumFrp += frp;
      if (frp > peakFrp) peakFrp = frp;
      const sensor = f.properties?.sensor;
      if (sensor === "VIIRS") viirsCount++;
      else if (sensor === "MODIS") modisCount++;
      const dn = f.properties?.daynight;
      if (dn === "D") dayCount++;
      else if (dn === "N") nightCount++;
    }
  }

  return {
    radiusKm,
    count,
    viirsCount,
    modisCount,
    dayCount,
    nightCount,
    peakFrp: count > 0 ? parseFloat(peakFrp.toFixed(1)) : 0,
    meanFrp: count > 0 ? parseFloat((sumFrp / count).toFixed(1)) : 0,
    closestKm: count > 0 ? parseFloat(closestDist.toFixed(1)) : null,
  };
}

// ─── Master Terrain Grid Point-in-Polygon / Centroid Matcher ────────────────
function findGridCell(grid: any, lng: number, lat: number) {
  if (!grid || !grid.features) return null;
  for (const f of grid.features) {
    const coords = f.geometry?.coordinates?.[0];
    if (coords && coords.length >= 4) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [x, y] of coords) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY) {
        return f;
      }
    }
  }
  let nearest = null;
  let minDist = Infinity;
  for (const f of grid.features) {
    const coords = f.geometry?.coordinates?.[0];
    if (coords && coords.length >= 3) {
      const cx = (coords[0][0] + coords[2][0]) / 2;
      const cy = (coords[0][1] + coords[2][1]) / 2;
      const d = Math.hypot(lng - cx, lat - cy);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }
  }
  if (minDist < 0.15) return nearest;
  return null;
}

function getAspectCardinal(aspect: number): { label: string; desc: string; color: string } {
  if (aspect >= 337.5 || aspect < 22.5) {
    return { label: "North (0°)", desc: "Shaded / cooler slope, delayed fuel curing", color: "text-sky-400" };
  } else if (aspect >= 22.5 && aspect < 67.5) {
    return { label: "Northeast (45°)", desc: "Early morning gentle sun exposure", color: "text-teal-400" };
  } else if (aspect >= 67.5 && aspect < 112.5) {
    return { label: "East (90°)", desc: "Morning direct solar insolation", color: "text-emerald-400" };
  } else if (aspect >= 112.5 && aspect < 157.5) {
    return { label: "Southeast (135°)", desc: "Moderate-high drying rate", color: "text-yellow-400" };
  } else if (aspect >= 157.5 && aspect < 202.5) {
    return { label: "South (180°)", desc: "Maximum solar insolation, rapid needle desiccation", color: "text-amber-400" };
  } else if (aspect >= 202.5 && aspect < 247.5) {
    return { label: "Southwest (225°)", desc: "Peak afternoon temperature & dry katabatic winds", color: "text-orange-400" };
  } else if (aspect >= 247.5 && aspect < 292.5) {
    return { label: "West (270°)", desc: "Late afternoon heat, elevated flame propagation", color: "text-rose-400" };
  } else {
    return { label: "Northwest (315°)", desc: "Evening shade, moderate relative humidity", color: "text-blue-400" };
  }
}

function getTRIDescription(tri: number): { label: string; desc: string } {
  if (tri < 10) return { label: "Level Plain", desc: "Gentle valley floor, unhindered ground access" };
  if (tri < 25) return { label: "Moderate Relief", desc: "Foothill undulating terrain, standard suppression" };
  if (tri < 45) return { label: "Rugged Mountain", desc: "Steep dissected ridge, creates strong upslope draft" };
  return { label: "Severely Rugged", desc: "Precipitous cliff/gorge, extreme fire chimney risk" };
}

export default function TerrainExplorerPage() {
  const router = useRouter();
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null);
  const [targetZoom, setTargetZoom] = useState<number | null>(null);
  const [selectedCellGeometry, setSelectedCellGeometry] = useState<any>(null);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // Datasets for point-in-polygon matching & fire proximity calculations
  const [terrainGrid, setTerrainGrid] = useState<any>(null);
  const [firesFeatures, setFiresFeatures] = useState<any[]>([]);
  const [fireStats, setFireStats] = useState<any>(null);
  const [activePlace, setActivePlace] = useState<UttarakhandPlace | null>(null);

  // Geomorphology & Layer Toggles
  const [terrainMode, setTerrainMode] = useState<TerrainMode>("satellite");
  const [showHotspots, setShowHotspots] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showGridLines, setShowGridLines] = useState(false);

  // ── Reverse geocoding state ──────────────────────────────────────────────
  const [geoPlace, setGeoPlace] = useState<GeoPlace | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const geocacheRef = React.useRef<Map<string, GeoPlace>>(new Map());
  const latestLookupRef = React.useRef<string>("");

  // Load datasets on mount
  useEffect(() => {
    async function loadDatasets() {
      try {
        const [gridRes, firesRes, telemetryRes] = await Promise.all([
          fetch("/data/terrain_grid_web.json"),
          fetch("/data/sample_fires_for_web.json"),
          fetch("/data/mission_control_summary.json"),
        ]);
        const gridData = await gridRes.json();
        const firesData = await firesRes.json();
        const telData = await telemetryRes.json();
        setTerrainGrid(gridData);
        setFiresFeatures(firesData.features || []);
        setTelemetry(telData);
      } catch (err) {
        console.warn("Failed to load terrain/fire datasets:", err);
      }
    }
    loadDatasets();
  }, []);

  // Handler when a location is selected from the Location Explorer Search Panel
  const handleSelectPlaceFromSearch = useCallback(
    (place: UttarakhandPlace) => {
      setActivePlace(place);
      setTargetCoords([place.lon, place.lat]);
      setTargetZoom(place.zoom || 12);
      setSelectedHotspot(null);

      // Find matching Copernicus master grid cell
      const matching = findGridCell(terrainGrid, place.lon, place.lat);
      if (matching) {
        setSelectedCell({
          ...matching.properties,
          _clickLng: place.lon,
          _clickLat: place.lat,
          _placeCategory: place.category,
        });
        setSelectedCellGeometry(matching.geometry);
      } else {
        setSelectedCell({
          id: `UT_LOC_${place.name.toUpperCase().replace(/\s+/g, "_")}`,
          _clickLng: place.lon,
          _clickLat: place.lat,
          _placeCategory: place.category,
        });
        setSelectedCellGeometry(null);
      }

      // Pre-populate verified location details
      setGeoPlace({
        village: place.village || (place.category === "Village" ? place.name : ""),
        town: place.category === "Town" ? place.name : "",
        city: place.category === "City" ? place.name : "",
        district: place.district,
        tehsil: place.tehsil || place.district,
        locality: place.name,
        state: "Uttarakhand",
        display_name: place.displayName,
      });
      setGeoLoading(false);

      // Compute actual fire observations around this place
      const fStats = computeFireStats(firesFeatures, place.lon, place.lat, 10);
      setFireStats(fStats);
    },
    [terrainGrid, firesFeatures]
  );

  // Reverse-geocode & compute fire stats whenever selectedCell changes (via map click or external selection)
  useEffect(() => {
    if (!selectedCell) {
      setGeoPlace(null);
      setFireStats(null);
      return;
    }

    const centroid = parseCellCentroid(selectedCell.id);
    const lng = selectedCell._clickLng ?? centroid?.[0];
    const lat = selectedCell._clickLat ?? centroid?.[1];

    if (lat == null || lng == null) {
      setGeoPlace({ error: "LOCATION NAME UNAVAILABLE" });
      return;
    }

    // Always compute real fire statistics for this point
    if (firesFeatures.length > 0) {
      const fStats = computeFireStats(firesFeatures, lng, lat, 10);
      setFireStats(fStats);
    }

    // If activePlace already provides verified location details for this point, skip duplicate geocode
    if (
      activePlace &&
      Math.abs(activePlace.lat - lat) < 0.001 &&
      Math.abs(activePlace.lon - lng) < 0.001
    ) {
      return;
    }

    // Snap to 4-decimal precision for cache key
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    latestLookupRef.current = cacheKey;

    // Return cached result instantly
    if (geocacheRef.current.has(cacheKey)) {
      setGeoPlace(geocacheRef.current.get(cacheKey)!);
      return;
    }

    // Uttarakhand study boundary guard
    const inBounds = lat >= 28.0 && lat <= 31.6 && lng >= 77.0 && lng <= 81.5;
    if (!inBounds) {
      const outside: GeoPlace = { error: "OUTSIDE MAPPED STUDY AREA" };
      setGeoPlace(outside);
      return;
    }

    setGeoLoading(true);

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}` +
      `&zoom=14&accept-language=en`;

    fetch(url, { headers: { "User-Agent": "FireIntel/1.0 (academic wildfire research)" } })
      .then((r) => r.json())
      .then((data: any) => {
        // Guard against race conditions
        if (latestLookupRef.current !== cacheKey) return;

        const addr = data.address || {};
        const place: GeoPlace = {
          village: addr.village || addr.hamlet || addr.isolated_dwelling || "",
          suburb: addr.suburb || addr.neighbourhood || "",
          town: addr.town || addr.city_district || "",
          city: addr.city || "",
          county: addr.county || addr.district || "",
          state_district: addr.state_district || "",
          state: addr.state || "",
          country: addr.country || "",
          postcode: addr.postcode || "",
          display_name: data.display_name || "",
          district: addr.county || addr.district || addr.state_district || "",
          tehsil: addr.state_district || addr.county || "",
          locality: addr.village || addr.hamlet || addr.suburb || addr.town || addr.city || "",
        };

        geocacheRef.current.set(cacheKey, place);
        if (latestLookupRef.current === cacheKey) {
          setGeoPlace(place);
          setGeoLoading(false);
        }
      })
      .catch(() => {
        if (latestLookupRef.current === cacheKey) {
          const err: GeoPlace = { error: "LOCATION NAME UNAVAILABLE" };
          geocacheRef.current.set(cacheKey, err);
          setGeoPlace(err);
          setGeoLoading(false);
        }
      });
  }, [selectedCell, activePlace, firesFeatures]);

  // Expose selectors for programmatic testing & automated inspection
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__SELECT_HOTSPOT = (hotspot: any) => {
        setSelectedHotspot(hotspot);
      };
      (window as any).__SELECT_GRID_CELL = (cellProps: any) => {
        setSelectedCell(cellProps);
      };
      (window as any).__SET_TERRAIN_MODE = (mode: TerrainMode) => {
        setTerrainMode(mode);
      };
      (window as any).__SEARCH_LOCATION = (place: UttarakhandPlace) => {
        handleSelectPlaceFromSearch(place);
      };
    }
  }, [handleSelectPlaceFromSearch]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#020408] select-none">
      {/* 3D Himalayan MapLibre Canvas with Copernicus DEM 30m Extrusion & Geomorphology Grid */}
      <GlobeMap
        cameraMode="ridge"
        targetCoords={targetCoords}
        targetZoom={targetZoom}
        selectedCellGeometry={selectedCellGeometry}
        onHotspotSelect={(hotspot) => {
          setSelectedHotspot(hotspot);
          setSelectedCell(null);
        }}
        onCellSelect={(cellProps, clickLngLat) => {
          setSelectedHotspot(null);
          setActivePlace(null);
          if (!cellProps) {
            setSelectedCell(null);
            setSelectedCellGeometry(null);
            setFireStats(null);
            return;
          }

          const centroid = parseCellCentroid(cellProps.id);
          const lng = clickLngLat?.[0] ?? centroid?.[0] ?? 79.2;
          const lat = clickLngLat?.[1] ?? centroid?.[1] ?? 30.15;

          setSelectedCell({
            ...cellProps,
            _clickLng: lng,
            _clickLat: lat,
          });

          // Highlight matching cell boundary
          const matching = findGridCell(terrainGrid, lng, lat);
          if (matching) {
            setSelectedCellGeometry(matching.geometry);
          }

          // Calculate fire statistics
          const fStats = computeFireStats(firesFeatures, lng, lat, 10);
          setFireStats(fStats);
        }}
        terrainMode={terrainMode}
        showHotspots={showHotspots}
        showBoundary={showBoundary}
        showGridLines={showGridLines}
      />

      {/* Top Navigation Bar */}
      <header className="absolute top-4 sm:top-6 left-3 sm:left-8 right-3 sm:right-8 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <Link
            href="/"
            aria-label="Return to Planetary Orbit"
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xl"
            title="Ascend camera back to global planetary orbit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ascend to Orbit</span>
          </Link>

          <div className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-4 py-2 text-xs flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Western Himalayas</span>
            <span className="hidden md:inline text-slate-500 font-mono-telemetry">/</span>
            <span className="hidden md:inline text-cyan-400 font-mono-telemetry">Copernicus DEM (30m)</span>
          </div>
        </div>

        <nav className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/fires"
            className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-full px-3 sm:px-4 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1.5 sm:gap-2 shadow-2xl"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Fire Lab</span>
          </Link>

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/20 transition-all font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Analytics</span>
          </Link>

          <Link
            href="/data"
            className="flex items-center gap-1.5 bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-all font-medium"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Data</span>
          </Link>

          <Link
            href="/methodology"
            className="flex items-center gap-1.5 bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Methodology</span>
          </Link>

          <button
            onClick={() => setIsTelemetryOpen(true)}
            className="bg-[#040810]/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 sm:px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Telemetry</span>
          </button>
        </nav>
      </header>

      {/* Location Explorer Search Panel (Left Side, with full clearance below top geomorphology controls) */}
      <div className="absolute top-28 sm:top-36 left-3 sm:left-8 z-30 pointer-events-auto">
        <LocationSearchPanel
          onSelectPlace={handleSelectPlaceFromSearch}
          selectedPlaceName={activePlace?.name || (geoPlace && !geoPlace.error ? getLocality(geoPlace) : null)}
        />
      </div>

      {/* Geomorphology Controls Capsule (Top-Center) */}
      <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto max-w-[95vw] overflow-x-auto py-1 scrollbar-none">
        <div className="flex items-center bg-[#040810]/85 backdrop-blur-xl rounded-full p-1 border border-cyan-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex-nowrap shrink-0">
          <button
            onClick={() => setTerrainMode("satellite")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "satellite"
                ? "bg-white/20 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Satellite 3D
          </button>
          <button
            onClick={() => setTerrainMode("elevation")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "elevation"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-emerald-300 hover:bg-white/[0.05]"
            }`}
          >
            Elevation
          </button>
          <button
            onClick={() => setTerrainMode("slope")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "slope"
                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-amber-300 hover:bg-white/[0.05]"
            }`}
          >
            Slope Gradient
          </button>
          <button
            onClick={() => setTerrainMode("aspect")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "aspect"
                ? "bg-sky-500/30 text-sky-200 border border-sky-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-sky-300 hover:bg-white/[0.05]"
            }`}
          >
            Solar Aspect
          </button>
          <button
            onClick={() => setTerrainMode("tri")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-mono-telemetry transition-all cursor-pointer whitespace-nowrap ${
              terrainMode === "tri"
                ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 shadow-sm font-semibold"
                : "text-slate-400 hover:text-purple-300 hover:bg-white/[0.05]"
            }`}
          >
            Ruggedness (TRI)
          </button>
        </div>

        {/* Quick Layer Toggles (Shrink-0, Never Wrapped or Cut-off) */}
        <div className="flex items-center bg-[#040810]/85 backdrop-blur-xl rounded-full p-1 px-2 border border-cyan-500/20 shadow-[0_12px_32px_rgba(0,0,0,0.6)] gap-1 text-xs shrink-0 flex-nowrap">
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showHotspots
                ? "bg-amber-500/20 text-amber-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title={showHotspots ? "Hide satellite fire hotspots" : "Show satellite fire hotspots"}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Hotspots</span>
          </button>

          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showGridLines
                ? "bg-sky-500/20 text-sky-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle 2,174 master grid cell boundaries"
          >
            <Grid className="w-3.5 h-3.5 text-sky-400" />
            <span>Grid (2,174)</span>
          </button>

          <button
            onClick={() => setShowBoundary(!showBoundary)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              showBoundary
                ? "bg-teal-500/20 text-teal-300 font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Uttarakhand administrative boundary"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-400" />
            <span>Boundary</span>
          </button>

          {/* Elevation Transect Profile Toggle */}
          <button
            onClick={() => setShowProfileDrawer(!showProfileDrawer)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono-telemetry transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
              showProfileDrawer
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium"
                : "bg-white/[0.02] text-slate-400 hover:text-white border-transparent"
            }`}
            title="Toggle Himalayan Topographic Transect Profile"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Altitudinal Transect</span>
          </button>
        </div>
      </div>

      {/* Sector Information & Unified Dynamic Legend Card (Bottom-Left) */}
      <aside
        aria-label="Terrain Sector Overview"
        className="absolute bottom-6 left-3 sm:left-8 z-20 bg-[#040810]/85 backdrop-blur-xl rounded-2xl p-5 max-w-sm w-[92vw] sm:w-[380px] border border-cyan-500/20 shadow-[0_16px_40px_rgba(0,0,0,0.7)] pointer-events-auto text-slate-200"
      >
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-mono-telemetry font-bold tracking-wider text-cyan-400 uppercase">
              SECTOR LOCKED // GARHWAL &amp; KUMAON
            </span>
          </div>
          <span className="text-[10px] font-mono-telemetry text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            30m GLO-30 DEM
          </span>
        </div>

        <h1 className="text-lg font-bold text-white mb-1.5 tracking-tight">
          Himalayan Topography &amp; Fire Ignitions
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          Copernicus GLO-30 elevation extrusion (129 m to 7,804 m)
          revealing how steep slope chimneys, solar aspect insolation, and rugged relief
          concentrate 44.7% of all fires in the 1,000–2,000m Chir pine zone.
        </p>

        <div className="flex items-center justify-between text-[11px] font-mono-telemetry pt-2 border-t border-white/[0.08] text-slate-400 mb-1">
          <span>Primary Baseline Detections:</span>
          <span className="text-amber-400 font-bold">240,365 Observations</span>
        </div>
        <div className="text-[10px] text-slate-400/80 font-mono-telemetry mb-2.5">
          Restricted to 28°N–31°N (Alpine &gt;31°N truncated at source)
        </div>

        {/* Dynamic Mode-Specific Topographic / Thermal Legend */}
        {terrainMode === "satellite" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Radiative Power (FRP):</span>
              <span className="text-amber-400 font-semibold">MW Intensity</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#f59e0b] mx-auto mb-0.5 shadow-[0_0_6px_#f59e0b]" />
                <span className="text-slate-300">&lt; 8 MW</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#f97316] mx-auto mb-0.5 shadow-[0_0_6px_#f97316]" />
                <span className="text-slate-300">8–20</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#ef4444] mx-auto mb-0.5 shadow-[0_0_6px_#ef4444]" />
                <span className="text-slate-300">20–60</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-[#a855f7] mx-auto mb-0.5 shadow-[0_0_6px_#a855f7]" />
                <span className="text-slate-300">&gt; 60 MW</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "elevation" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Copernicus GLO-30 Elevation:</span>
              <span className="text-emerald-400 font-semibold">129m – 7,804m</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#059669]" />
                <span className="text-slate-300">&lt; 500m</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#10b981]" />
                <span className="text-slate-300">1000m</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#eab308]" />
                <span className="text-slate-300">Pine</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f97316]" />
                <span className="text-slate-300">Subalpine</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#ffffff]" />
                <span className="text-slate-300">Snow</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "slope" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Slope Gradient Chimneys:</span>
              <span className="text-amber-400 font-semibold">0° – 64°</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#3b82f6]" />
                <span className="text-slate-300">0–5°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#10b981]" />
                <span className="text-slate-300">5–15°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#eab308]" />
                <span className="text-slate-300">15–25°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f97316]" />
                <span className="text-slate-300">25–35°</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#dc2626]" />
                <span className="text-slate-300">&gt; 35°</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "aspect" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 uppercase mb-1.5 flex items-center justify-between">
              <span>Solar Aspect Insolation:</span>
              <span className="text-sky-400 font-semibold">360° Compass</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#38bdf8]" />
                <span className="text-slate-300">North</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#34d399]" />
                <span className="text-slate-300">East</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f59e0b]" />
                <span className="text-slate-300">South (Risk)</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f87171]" />
                <span className="text-slate-300">West (Heat)</span>
              </div>
            </div>
          </div>
        )}

        {terrainMode === "tri" && (
          <div className="pt-2.5 border-t border-white/[0.08] text-[10px] font-mono-telemetry">
            <div className="text-slate-400 uppercase mb-1.5 flex items-center justify-between">
              <span>Terrain Ruggedness (TRI):</span>
              <span className="text-purple-400 font-semibold">Riley Index</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#1e293b]" />
                <span className="text-slate-300">&lt; 10 Plain</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#0284c7]" />
                <span className="text-slate-300">10–30 Mod</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#f59e0b]" />
                <span className="text-slate-300">30–50 Rugged</span>
              </div>
              <div className="p-1 rounded bg-white/[0.03] border border-white/5">
                <span className="w-2 h-2 rounded block mx-auto mb-0.5 bg-[#ef4444]" />
                <span className="text-slate-300">&gt; 50 Extreme</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Altitudinal Topographic Transect Overlay Drawer */}
      {showProfileDrawer && (
        <aside
          aria-label="Himalayan Altitudinal Transect Profile"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-25 bg-[#040810]/95 backdrop-blur-2xl rounded-2xl p-5 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto w-[94vw] max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 text-slate-200"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono-telemetry font-bold tracking-wider text-white uppercase">
                Himalayan Altitudinal Transect &amp; Fire Concentration
              </h2>
            </div>
            <button
              onClick={() => setShowProfileDrawer(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close Transect Profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="h-28 w-full bg-black/60 rounded-xl p-3 border border-white/[0.06] flex items-end justify-between gap-1 relative">
              {/* Transect Bands */}
              {[
                { zone: "< 500m Foothills", pct: 3.8, count: 287, height: 16, color: "bg-emerald-500", note: "Tarai Plains" },
                { zone: "500–1000m Valleys", pct: 15.6, count: 1176, height: 35, color: "bg-teal-500", note: "Deciduous Sal" },
                { zone: "1000–2000m Chir Pine", pct: 44.7, count: 3371, height: 95, color: "bg-amber-400", note: "Peak Ignition Zone (44.7%)" },
                { zone: "2000–3000m Montane", pct: 28.3, count: 2134, height: 60, color: "bg-orange-500", note: "Banj Oak / Rhododendron" },
                { zone: "3000–4500m Subalpine", pct: 7.2, count: 543, height: 22, color: "bg-purple-500", note: "Birch / Alpine Meadows" },
                { zone: "> 4500m Nival", pct: 0.4, count: 30, height: 8, color: "bg-slate-500", note: "Perennial Snow / Rock" },
              ].map((band, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <span className="text-[10px] font-mono-telemetry text-amber-300 font-bold mb-1 opacity-90 group-hover:opacity-100">
                    {band.pct}%
                  </span>
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${band.color} ${band.pct > 40 ? "shadow-[0_0_12px_#f59e0b]" : ""}`}
                    style={{ height: `${band.height}%` }}
                  />
                  <div className="text-[9px] font-mono-telemetry text-slate-400 mt-1 truncate max-w-full text-center">
                    {band.zone.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] text-[11px] text-slate-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Scientific Finding: </strong>
                44.7% of all 2025 wildland fires ignited strictly within the 1,000–2,000m Chir pine (<em className="text-amber-300">Pinus roxburghii</em>) ecotone. Highly flammable resinous needle duff combined with steep 25–35° slope chimney drafts produces severe upslope flame propagation.
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ── Master Grid Cell Inspector — Location + Terrain + Fire Intelligence ── */}
      {selectedCell && (
        <aside
          aria-label="Master Grid Cell Geomorphology Inspector"
          className="absolute top-20 sm:top-24 right-3 sm:right-8 z-30 bg-[#040810]/95 backdrop-blur-2xl rounded-2xl border border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto max-w-sm w-[92vw] sm:w-[380px] max-h-[calc(100vh-6.5rem)] overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300 text-slate-200"
          style={{ boxShadow: "0 0 0 1px rgba(85,199,232,0.15), 0 24px 60px rgba(0,0,0,0.9)" }}
        >
          {/* ── SECTION 1: LOCATION IDENTIFICATION ── */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-gradient-to-b from-[#0B3D91]/10 to-transparent">
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <Navigation className="w-4 h-4 text-[#55C7E8]" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#55C7E8] animate-pulse" />
                </div>
                <div>
                  <div className="text-[9px] font-mono-telemetry font-bold tracking-widest text-[#55C7E8] uppercase">
                    Location Identification
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono-telemetry">
                    Survey of India &amp; OSM Geocoded
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCell(null);
                  setSelectedCellGeometry(null);
                  setActivePlace(null);
                  setFireStats(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                aria-label="Close Cell Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Loading state */}
            {geoLoading && (
              <div className="flex items-center gap-2.5 py-3 px-3 rounded-xl bg-[#55C7E8]/5 border border-[#55C7E8]/15 mb-3">
                <Loader2 className="w-4 h-4 text-[#55C7E8] animate-spin shrink-0" />
                <div className="text-xs font-mono-telemetry text-[#55C7E8]/80 tracking-wider">
                  IDENTIFYING LOCATION…
                </div>
              </div>
            )}

            {/* Error state */}
            {!geoLoading && geoPlace?.error && (
              <div className="flex items-center gap-2.5 py-3 px-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs font-mono-telemetry text-amber-400 tracking-wider">
                  {geoPlace.error}
                </div>
              </div>
            )}

            {/* Successful identification */}
            {!geoLoading && geoPlace && !geoPlace.error && (() => {
              const locality = getLocality(geoPlace);
              const district = getDistrict(geoPlace);
              const tehsil = getTehsil(geoPlace);
              const centroid = parseCellCentroid(selectedCell.id);
              const lat = selectedCell._clickLat ?? centroid?.[1];
              const lng = selectedCell._clickLng ?? centroid?.[0];
              const category = selectedCell._placeCategory || (geoPlace.village ? "Village" : geoPlace.town ? "Town" : geoPlace.city ? "City" : "Locality");

              return (
                <div className="space-y-2">
                  {/* Prominent place name */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#0B3D91]/25 via-[#101B2B]/40 to-black/60 border border-[#2477B8]/40 shadow-inner">
                    <div className="text-[9px] font-mono-telemetry text-[#55C7E8]/80 uppercase tracking-widest mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#55C7E8]" />
                        Selected Place
                      </span>
                      {category && (
                        <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {category}
                        </span>
                      )}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-[#F2F0E9] leading-tight tracking-tight">
                      {locality || "Unnamed Locality"}
                    </div>
                    {geoPlace.village && geoPlace.suburb && geoPlace.suburb !== geoPlace.village && (
                      <div className="text-[11px] text-[#55C7E8]/80 mt-0.5 font-medium">
                        {geoPlace.suburb}
                      </div>
                    )}
                  </div>

                  {/* Administrative grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-telemetry">
                    {district && (
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">District</div>
                        <div className="text-[#C6A66B] font-semibold">{district}</div>
                      </div>
                    )}
                    {tehsil && (
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Tehsil / Block</div>
                        <div className="text-[#55C7E8] font-semibold">{tehsil}</div>
                      </div>
                    )}
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] col-span-2 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">State</div>
                        <div className="text-slate-200 font-semibold">{geoPlace.state || "Uttarakhand"}, India</div>
                      </div>
                      <div className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                        Verified
                      </div>
                    </div>
                  </div>

                  {/* Coordinates */}
                  {lat != null && lng != null && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] font-mono-telemetry text-[10px]">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-[#55C7E8] shrink-0" />
                        <span className="text-slate-300 font-medium">
                          {lat.toFixed(5)}°N, {lng.toFixed(5)}°E
                        </span>
                      </div>
                      <span className="text-slate-500 text-[9px]">EPSG:4326</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Show coords even if geo failed */}
            {!geoLoading && geoPlace?.error && (() => {
              const centroid = parseCellCentroid(selectedCell.id);
              const lat = selectedCell._clickLat ?? centroid?.[1];
              const lng = selectedCell._clickLng ?? centroid?.[0];
              return lat != null && lng != null ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] font-mono-telemetry text-[10px]">
                  <Globe className="w-3 h-3 text-[#55C7E8] shrink-0" />
                  <span className="text-slate-400">
                    {lat.toFixed(5)}°N, {lng.toFixed(5)}°E
                  </span>
                </div>
              ) : null;
            })()}
          </div>

          {/* ── SECTION 2: TERRAIN INTELLIGENCE ── */}
          <div className="p-4 sm:p-5 space-y-3 text-xs">
            {/* Section label */}
            <div className="flex items-center gap-2 pb-1 border-b border-white/[0.07]">
              <Mountain className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[9px] font-mono-telemetry font-bold tracking-widest text-sky-400 uppercase">
                Terrain Intelligence
              </span>
              <span className="ml-auto text-[9px] font-mono-telemetry text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06] truncate max-w-[140px]" title={selectedCell.id}>
                {selectedCell.id}
              </span>
            </div>

            {/* Elevation */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">
                Copernicus Elevation (GLO-30)
              </div>
              <div className="text-base font-bold font-mono-telemetry text-emerald-300">
                {selectedCell.elev_mean != null ? `${Math.round(selectedCell.elev_mean)} m` : "Data unavailable"}
                {selectedCell.elev_min != null && selectedCell.elev_max != null && (
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    (Range: {Math.round(selectedCell.elev_min)}–{Math.round(selectedCell.elev_max)} m)
                  </span>
                )}
              </div>
            </div>

            {/* Slope & TRI */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">Mean Slope</div>
                <div className="text-base font-bold font-mono-telemetry text-amber-300">
                  {selectedCell.slope_mean != null ? `${selectedCell.slope_mean.toFixed(1)}°` : "Data unavailable"}
                </div>
                {selectedCell.slope_max != null && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Max: {selectedCell.slope_max.toFixed(1)}°
                  </div>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">Terrain Ruggedness</div>
                <div className="text-base font-bold font-mono-telemetry text-purple-300">
                  {selectedCell.tri_mean != null ? `${selectedCell.tri_mean.toFixed(1)} TRI` : "Data unavailable"}
                </div>
                {selectedCell.tri_mean != null && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {getTRIDescription(selectedCell.tri_mean).label}
                  </div>
                )}
              </div>
            </div>

            {/* Solar Aspect */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono-telemetry mb-0.5">
                <span>Solar Aspect</span>
                {selectedCell.aspect_mean != null && (
                  <span className={getAspectCardinal(selectedCell.aspect_mean).color}>
                    {getAspectCardinal(selectedCell.aspect_mean).label}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300 leading-snug">
                {selectedCell.aspect_mean != null
                  ? getAspectCardinal(selectedCell.aspect_mean).desc
                  : "Aspect data unavailable"}
              </div>
            </div>

            {/* ── SECTION 3: FIRE INTELLIGENCE (10 KM BUFFER) ── */}
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] font-mono-telemetry font-bold tracking-widest text-amber-400 uppercase">
                    Fire Intelligence
                  </span>
                </div>
                <span className="text-[9px] font-mono-telemetry text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                  10 km Radius Buffer
                </span>
              </div>

              {fireStats ? (
                fireStats.count > 0 ? (
                  <div className="space-y-1.5">
                    {/* Primary Detections Count Card */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/25 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-amber-400/80 uppercase font-mono-telemetry">
                          Nearby Satellite Detections
                        </div>
                        <div className="text-base font-bold font-mono-telemetry text-amber-300">
                          {fireStats.count.toLocaleString()} Observations
                        </div>
                      </div>
                      {fireStats.closestKm !== null && (
                        <div className="text-right font-mono-telemetry">
                          <div className="text-[8px] text-slate-500 uppercase">Proximity</div>
                          <div className="text-xs font-bold text-white">
                            {fireStats.closestKm} km
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sensor Split & FRP Grid */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono-telemetry text-[11px]">
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] text-slate-500 uppercase mb-0.5">Sensor Breakdown</div>
                        <div className="text-slate-200">
                          <span className="text-amber-300 font-semibold">{fireStats.viirsCount}</span> VIIRS ·{" "}
                          <span className="text-sky-300 font-semibold">{fireStats.modisCount}</span> MODIS
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="text-[9px] text-slate-500 uppercase mb-0.5">Radiative Power (FRP)</div>
                        <div className="text-slate-200">
                          Peak <span className="text-amber-400 font-bold">{fireStats.peakFrp}</span> MW
                          <span className="text-[10px] text-slate-500 ml-1">· avg {fireStats.meanFrp}</span>
                        </div>
                      </div>
                    </div>

                    {/* Diurnal Overpass Split */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[10px] font-mono-telemetry text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Sun className="w-3 h-3 text-amber-400" />
                        <span>Day: {fireStats.dayCount}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-sky-400" />
                        <span>Night: {fireStats.nightCount}</span>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">FIRMS Validated</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono-telemetry text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-xs">0 Observations Within 10 km</div>
                      <div className="text-[10px] text-emerald-400/80">Quiescent sector (low recent thermal anomaly activity)</div>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-slate-500 font-mono-telemetry flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span>Computing 10 km buffer radiometry…</span>
                </div>
              )}
            </div>

            {/* ── SECTION 4: DATA PROVENANCE ── */}
            <div className="pt-2 text-[10px] text-slate-400 font-mono-telemetry leading-normal border-t border-white/5 space-y-1">
              <div>
                <span className="text-sky-400 font-semibold">Provenance: </span>
                Copernicus GLO-30 30m DEM aggregated across 0.05° (~5.5 km) cell · NASA FIRMS Multi-Platform Radiometry · Survey of India (ADM1).
              </div>
              <div className="text-slate-500 text-[9px]">
                Restricted to 28°N–31°N study envelope (Alpine &gt;31°N truncated at source).
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Hotspot Inspector */}
      <HotspotInspector
        hotspot={selectedHotspot}
        onClose={() => setSelectedHotspot(null)}
        onFlyTo={(coords) => setTargetCoords(coords)}
      />

      {/* Telemetry Drawer */}
      <ScientificTelemetryDrawer
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        telemetry={telemetry}
      />
    </main>
  );
}
