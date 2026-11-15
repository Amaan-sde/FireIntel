"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Plus, Minus, Compass, Layers, Globe, Mountain, Maximize2, Crosshair } from "lucide-react";
import { FireFeatureProperties } from "./FireLaboratoryMap";

interface WildfireCommandMapProps {
  onHotspotSelect: (hotspot: FireFeatureProperties | null) => void;
  selectedMonth: number | null;
  selectedSeason: string | null;
  selectedSensor: string | null; // "ALL" | "VIIRS" | "MODIS"
  selectedDaynight: string | null; // "ALL" | "D" | "N"
  selectedType: string | null; // null | "0" | "2"
  minModisConf: number; // 0-100
  viirsConfLow: boolean;
  viirsConfNominal: boolean;
  viirsConfHigh: boolean;
  minFrp: number;
  temporalMode: "seasonal" | "verified_2025";
  dayOfYearRange: [number, number] | null;
  targetCoords?: [number, number] | null;
  activeVantage: "tectonic" | "garhwal" | "kumaon" | "nadir";
  terrainEnabled: boolean;
  boundaryEnabled: boolean;
  onFilteredStatsChange?: (stats: {
    total: number;
    viirs: number;
    modis: number;
    peakFrp: number;
  }) => void;
}

export default function WildfireCommandMap({
  onHotspotSelect,
  selectedMonth,
  selectedSeason,
  selectedSensor,
  selectedDaynight,
  selectedType,
  minModisConf,
  viirsConfLow,
  viirsConfNominal,
  viirsConfHigh,
  minFrp,
  temporalMode,
  dayOfYearRange,
  targetCoords,
  activeVantage,
  terrainEnabled,
  boundaryEnabled,
  onFilteredStatsChange,
}: WildfireCommandMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const allFeaturesRef = useRef<any[]>([]);

  // Initialize MapLibre with photorealistic satellite imagery & 3D Copernicus terrain
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "esri-satellite": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 18,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
          "terrain-dem": {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            encoding: "terrarium",
            tileSize: 256,
            maxzoom: 14,
          },
        },
        layers: [
          {
            id: "satellite-layer",
            type: "raster",
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [79.25, 30.15],
      zoom: 7.2,
      pitch: 42,
      bearing: -10,
      maxPitch: 85,
      antialias: true,
    });

    // Guard MapLibre's internal TaskQueue against re-entrant run() exceptions
    const tq = (map as any)._renderTaskQueue;
    if (tq && typeof tq.run === "function") {
      const originalRun = tq.run;
      tq.run = function (timeStamp: number = 0) {
        if (this._currentlyRunning) {
          return;
        }
        return originalRun.call(this, timeStamp);
      };
    }

    mapRef.current = map;

    map.on("load", async () => {
      // 1. Enable 3D Himalayan Terrain Relief
      try {
        if (terrainEnabled && !map.getTerrain()) {
          map.setTerrain({
            source: "terrain-dem",
            exaggeration: 1.45,
          });
        }
      } catch (err) {
        console.warn("Could not set 3D terrain:", err);
      }

      // 2. Add Northern Truncation Boundary Filament (Latitude 31.0°N line)
      try {
        map.addSource("northern-truncation-line", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [76.8, 31.0],
                    [81.2, 31.0],
                  ],
                },
                properties: {
                  label: "LATITUDE 31.0000°N // SOURCE TRUNCATION LIMIT",
                },
              },
            ],
          },
        });

        map.addLayer({
          id: "northern-truncation-halo",
          type: "line",
          source: "northern-truncation-line",
          paint: {
            "line-color": "#f59e0b",
            "line-width": 3.0,
            "line-opacity": 0.4,
            "line-blur": 3,
          },
        });

        map.addLayer({
          id: "northern-truncation-stroke",
          type: "line",
          source: "northern-truncation-line",
          paint: {
            "line-color": "#fbbf24",
            "line-width": 1.5,
            "line-dasharray": [4, 4],
            "line-opacity": 0.9,
          },
        });
      } catch (err) {
        console.warn("Could not add truncation boundary line:", err);
      }

      // 3. Add Uttarakhand Administrative Boundary (Survey of India 53,483 km²)
      try {
        const boundaryRes = await fetch("/data/uttarakhand_boundary.geojson");
        const boundaryData = await boundaryRes.json();

        map.addSource("uttarakhand-boundary", {
          type: "geojson",
          data: boundaryData,
        });

        // Atmospheric glowing border line
        map.addLayer({
          id: "uttarakhand-line-glow",
          type: "line",
          source: "uttarakhand-boundary",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 3.0,
            "line-opacity": 0.4,
            "line-blur": 2.5,
          },
        });

        map.addLayer({
          id: "uttarakhand-line",
          type: "line",
          source: "uttarakhand-boundary",
          paint: {
            "line-color": "#7dd3fc",
            "line-width": 1.4,
            "line-opacity": 0.9,
          },
        });
      } catch (err) {
        console.warn("Could not load boundary geojson:", err);
      }

      // 4. Add Verified Uttarakhand Fire Observations (Harmonised Baseline Vector Layer)
      try {
        const firesRes = await fetch("/data/uttarakhand_fires_2025.geojson");
        const firesData = await firesRes.json();
        allFeaturesRef.current = firesData.features || [];

        map.addSource("fire-hotspots", {
          type: "geojson",
          data: firesData,
        });

        // Layer A: Thermal Heat Dissipation Glow (Spatial Density Corridors)
        map.addLayer({
          id: "fire-heat-halo",
          type: "circle",
          source: "fire-hotspots",
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 4.0,
              10, 7.5,
              40, 13.0,
              100, 20.0,
              170, 26.0,
            ],
            "circle-color": [
              "step", ["get", "frp"],
              "#f59e0b",
              6, "#f97316",
              18, "#ef4444",
              50, "#c084fc",
              100, "#f43f5e",
            ],
            "circle-opacity": 0.42,
            "circle-blur": 1.2,
          },
        });

        // Layer B: MODIS 1km Nadir Footprint Indicator Halo
        map.addLayer({
          id: "modis-footprint-ring",
          type: "circle",
          source: "fire-hotspots",
          filter: ["==", ["get", "sensor"], "MODIS"],
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 8.0,
              40, 14.0,
              170, 22.0,
            ],
            "circle-color": "transparent",
            "circle-stroke-width": 1.2,
            "circle-stroke-color": "#38bdf8",
            "circle-stroke-opacity": 0.65,
          },
        });

        // Layer C: Core Radiometric Hotspot Ember (VIIRS & MODIS)
        map.addLayer({
          id: "fire-core-ember",
          type: "circle",
          source: "fire-hotspots",
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 2.2,
              10, 3.8,
              40, 6.0,
              100, 8.5,
              170, 11.5,
            ],
            "circle-color": [
              "step", ["get", "frp"],
              "#fef08a",
              6, "#fed7aa",
              18, "#fca5a5",
              50, "#f5d0fe",
              100, "#ffffff",
            ],
            "circle-stroke-width": 0.9,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.95,
          },
        });

        // Layer D: Dynamic Hotspot Focus Highlight Reticle
        map.addSource("selected-hotspot-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "selected-hotspot-ring",
          type: "circle",
          source: "selected-hotspot-source",
          paint: {
            "circle-radius": 16,
            "circle-color": "transparent",
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#38bdf8",
            "circle-stroke-opacity": 1.0,
          },
        });

        // Selection click event
        map.on("click", "fire-core-ember", (e) => {
          if (!e.features || !e.features[0]) return;
          const feat = e.features[0];
          const coords = (feat.geometry as any).coordinates.slice();
          const props = feat.properties as any;

          // Update selection reticle
          const ringSource = map.getSource("selected-hotspot-source") as maplibregl.GeoJSONSource;
          if (ringSource) {
            ringSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: coords,
                  },
                  properties: {},
                },
              ],
            });
          }

          onHotspotSelect({
            ...props,
            coordinates: coords,
          });
        });

        // Cursor state on hover
        map.on("mouseenter", "fire-core-ember", () => {
          map.getCanvas().style.cursor = "crosshair";
        });
        map.on("mouseleave", "fire-core-ember", () => {
          map.getCanvas().style.cursor = "";
        });

        setMapLoaded(true);
      } catch (err) {
        console.warn("Could not load fires GeoJSON:", err);
      }
    });

    return () => {
      map.remove();
    };
  }, [onHotspotSelect]);

  // Handle Terrain Relief Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    try {
      if (terrainEnabled) {
        map.setTerrain({
          source: "terrain-dem",
          exaggeration: 1.45,
        });
      } else {
        map.setTerrain(null);
      }
    } catch (err) {
      console.warn("Could not update terrain state:", err);
    }
  }, [terrainEnabled, mapLoaded]);

  // Handle Boundary Filament Toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const visibility = boundaryEnabled ? "visible" : "none";
    if (map.getLayer("uttarakhand-line")) {
      map.setLayoutProperty("uttarakhand-line", "visibility", visibility);
    }
    if (map.getLayer("uttarakhand-line-glow")) {
      map.setLayoutProperty("uttarakhand-line-glow", "visibility", visibility);
    }
  }, [boundaryEnabled, mapLoaded]);

  // Handle Camera Fly-To Target Coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetCoords) return;
    map.flyTo({
      center: targetCoords,
      zoom: 10.5,
      pitch: 58,
      duration: 1800,
      essential: true,
    });
  }, [targetCoords]);

  // Handle Camera Vantage Presets
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (activeVantage === "tectonic") {
      map.flyTo({
        center: [79.25, 30.15],
        zoom: 7.2,
        pitch: 42,
        bearing: -10,
        duration: 1600,
        essential: true,
      });
    } else if (activeVantage === "garhwal") {
      map.flyTo({
        center: [78.85, 30.35],
        zoom: 8.5,
        pitch: 55,
        bearing: -15,
        duration: 1600,
        essential: true,
      });
    } else if (activeVantage === "kumaon") {
      map.flyTo({
        center: [79.65, 29.60],
        zoom: 8.6,
        pitch: 52,
        bearing: 10,
        duration: 1600,
        essential: true,
      });
    } else if (activeVantage === "nadir") {
      map.flyTo({
        center: [79.25, 30.15],
        zoom: 7.5,
        pitch: 0,
        bearing: 0,
        duration: 1600,
        essential: true,
      });
    }
  }, [activeVantage, mapLoaded]);

  // Synchronous GPU-Accelerated WebGL Layer Filtering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer("fire-core-ember")) return;

    const filterConditions: any[] = ["all"];

    // 1. Sensor Filter
    if (selectedSensor && selectedSensor !== "ALL") {
      filterConditions.push(["==", ["get", "sensor"], selectedSensor]);
    }

    // 2. Day / Night Overpass Filter
    if (selectedDaynight && selectedDaynight !== "ALL") {
      filterConditions.push(["==", ["get", "daynight"], selectedDaynight]);
    }

    // 3. Hotspot Type Filter
    if (selectedType !== null && selectedType !== undefined) {
      filterConditions.push(["==", ["get", "type"], parseInt(selectedType, 10)]);
    }

    // 4. Minimum FRP Threshold
    if (minFrp > 0) {
      filterConditions.push([">=", ["get", "frp"], minFrp]);
    }

    // 5. Temporal Filtering Mode
    if (temporalMode === "seasonal") {
      if (selectedMonth !== null) {
        filterConditions.push(["==", ["get", "month"], selectedMonth]);
      }
      if (selectedSeason !== null) {
        if (selectedSeason === "pre_monsoon") {
          filterConditions.push(["any", ["==", ["get", "month"], 4], ["==", ["get", "month"], 5]]);
        } else if (selectedSeason === "post_monsoon") {
          filterConditions.push(["any", ["==", ["get", "month"], 10], ["==", ["get", "month"], 11]]);
        } else if (selectedSeason === "winter") {
          filterConditions.push([
            "any",
            ["==", ["get", "month"], 12],
            ["==", ["get", "month"], 1],
            ["==", ["get", "month"], 2],
            ["==", ["get", "month"], 3],
          ]);
        } else if (selectedSeason === "monsoon") {
          filterConditions.push([
            "any",
            ["==", ["get", "month"], 6],
            ["==", ["get", "month"], 7],
            ["==", ["get", "month"], 8],
            ["==", ["get", "month"], 9],
          ]);
        }
      }
    } else if (temporalMode === "verified_2025") {
      // Must have verified 2025 match
      filterConditions.push(["==", ["get", "date_verified_2025"], true]);
      if (dayOfYearRange !== null) {
        filterConditions.push([">=", ["get", "day_of_year"], dayOfYearRange[0]]);
        filterConditions.push(["<=", ["get", "day_of_year"], dayOfYearRange[1]]);
      }
    }

    // 6. Decoupled Confidence Filters
    const confConditions: any[] = ["any"];

    // MODIS: numeric
    confConditions.push([
      "all",
      ["==", ["get", "sensor"], "MODIS"],
      [">=", ["get", "confidence_num"], minModisConf],
    ]);

    // VIIRS: categorical
    const allowedViirsCats: string[] = [];
    if (viirsConfLow) allowedViirsCats.push("l");
    if (viirsConfNominal) allowedViirsCats.push("n");
    if (viirsConfHigh) allowedViirsCats.push("h");

    if (allowedViirsCats.length > 0) {
      const viirsCategoryConditions = allowedViirsCats.map((cat) => [
        "==",
        ["downcase", ["get", "confidence"]],
        cat,
      ]);
      confConditions.push([
        "all",
        ["==", ["get", "sensor"], "VIIRS"],
        viirsCategoryConditions.length === 1
          ? viirsCategoryConditions[0]
          : ["any", ...viirsCategoryConditions],
      ]);
    }

    filterConditions.push(confConditions);

    const compiledFilter = filterConditions.length > 1 ? filterConditions : null;

    map.setFilter("fire-core-ember", compiledFilter as any);
    map.setFilter("fire-heat-halo", compiledFilter as any);
    map.setFilter("modis-footprint-ring", [
      "all",
      compiledFilter || ["all"],
      ["==", ["get", "sensor"], "MODIS"],
    ] as any);

    // Compute live stats for UI indicators
    if (onFilteredStatsChange && allFeaturesRef.current.length > 0) {
      let vCount = 0;
      let mCount = 0;
      let peakFrp = 0;

      for (const feat of allFeaturesRef.current) {
        const p = feat.properties;
        if (selectedSensor && selectedSensor !== "ALL" && p.sensor !== selectedSensor) continue;
        if (selectedDaynight && selectedDaynight !== "ALL" && p.daynight !== selectedDaynight) continue;
        if (selectedType !== null && selectedType !== undefined && p.type !== parseInt(selectedType, 10)) continue;
        if (minFrp > 0 && p.frp < minFrp) continue;

        if (temporalMode === "seasonal") {
          if (selectedMonth !== null && p.month !== selectedMonth) continue;
          if (selectedSeason === "pre_monsoon" && p.month !== 4 && p.month !== 5) continue;
          if (selectedSeason === "post_monsoon" && p.month !== 10 && p.month !== 11) continue;
          if (selectedSeason === "winter" && ![12, 1, 2, 3].includes(p.month)) continue;
          if (selectedSeason === "monsoon" && ![6, 7, 8, 9].includes(p.month)) continue;
        } else if (temporalMode === "verified_2025") {
          if (!p.date_verified_2025) continue;
          if (dayOfYearRange !== null && (p.day_of_year < dayOfYearRange[0] || p.day_of_year > dayOfYearRange[1])) continue;
        }

        // Confidence
        if (p.sensor === "MODIS") {
          if (p.confidence_num !== null && p.confidence_num !== undefined && p.confidence_num < minModisConf) continue;
          mCount++;
        } else if (p.sensor === "VIIRS") {
          const c = String(p.confidence).toLowerCase();
          if (!allowedViirsCats.includes(c)) continue;
          vCount++;
        }

        if (p.frp > peakFrp) {
          peakFrp = p.frp;
        }
      }

      onFilteredStatsChange({
        total: vCount + mCount,
        viirs: vCount,
        modis: mCount,
        peakFrp: peakFrp,
      });
    }
  }, [
    mapLoaded,
    selectedMonth,
    selectedSeason,
    selectedSensor,
    selectedDaynight,
    selectedType,
    minModisConf,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
    minFrp,
    temporalMode,
    dayOfYearRange,
    onFilteredStatsChange,
  ]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* MapLibre WebGL Canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Cartographic Edge Graticule Indicators & Framing Reticles */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Corner Reticles */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400/50" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400/50" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400/50" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400/50" />

        {/* Edge Latitude Ticks */}
        <div className="absolute left-3 top-1/4 text-[9px] font-mono-telemetry text-slate-500/70">
          31°00&apos;N
        </div>
        <div className="absolute left-3 top-1/2 text-[9px] font-mono-telemetry text-slate-500/70">
          30°00&apos;N
        </div>
        <div className="absolute left-3 top-3/4 text-[9px] font-mono-telemetry text-slate-500/70">
          29°00&apos;N
        </div>

        {/* Edge Longitude Ticks */}
        <div className="absolute bottom-3 left-1/4 text-[9px] font-mono-telemetry text-slate-500/70">
          78°00&apos;E
        </div>
        <div className="absolute bottom-3 left-1/2 text-[9px] font-mono-telemetry text-slate-500/70">
          79°00&apos;E
        </div>
        <div className="absolute bottom-3 left-3/4 text-[9px] font-mono-telemetry text-slate-500/70">
          80°00&apos;E
        </div>

        {/* Subtle Map Legend (Bottom-Right, above timeline) */}
        <div className="hidden md:flex flex-col gap-1.5 absolute bottom-28 right-8 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono-telemetry text-slate-300">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10 pb-1">
            Observation Legend
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 rotate-45 inline-block" />
            <span>VIIRS 375m Pinpoint (High Res)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-sky-400 inline-block" />
            <span>MODIS 1km Footprint Ring</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-0.5 bg-amber-400 border-t border-dashed border-amber-300 inline-block" />
            <span>31°N Source Truncation Limit</span>
          </div>
        </div>
      </div>

      {/* Floating Tactical Zoom / Orientation Controls (Right-Center) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Zoom in"
          className="p-2.5 rounded-xl bg-black/70 hover:bg-black/90 text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all shadow-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Zoom out"
          className="p-2.5 rounded-xl bg-black/70 hover:bg-black/90 text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all shadow-xl cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.resetNorthPitch()}
          aria-label="Reset orientation north"
          className="p-2.5 rounded-xl bg-black/70 hover:bg-black/90 text-slate-300 hover:text-white border border-white/15 backdrop-blur-md transition-all shadow-xl cursor-pointer"
          title="Reset Camera North"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </div>
  );
}

