"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Plus, Minus, Compass, Layers, Globe, Mountain } from "lucide-react";

export interface FireFeatureProperties {
  id: number;
  sensor: string;
  satellite: string;
  frp: number;
  brightness: number;
  bright_t31?: number | null;
  scan?: number | null;
  track?: number | null;
  acq_date: string;
  acq_time: number;
  month: number;
  day_of_year: number;
  confidence: string;
  confidence_num?: number | null;
  daynight: string;
  coordinates?: [number, number];
}

interface FireLaboratoryMapProps {
  onHotspotSelect: (hotspot: FireFeatureProperties | null) => void;
  selectedMonth: number | null;
  selectedSensor: string | null; // "ALL" | "VIIRS" | "MODIS"
  selectedDaynight: string | null; // "ALL" | "D" | "N"
  minModisConf: number; // 0-100
  viirsConfLow: boolean;
  viirsConfNominal: boolean;
  viirsConfHigh: boolean;
  minFrp: number;
  dayOfYearRange: [number, number] | null; // [startDay, endDay] or null
  targetCoords?: [number, number] | null;
  onFilteredStatsChange?: (stats: {
    total: number;
    viirs: number;
    modis: number;
    peakFrp: number;
  }) => void;
}

export default function FireLaboratoryMap({
  onHotspotSelect,
  selectedMonth,
  selectedSensor,
  selectedDaynight,
  minModisConf,
  viirsConfLow,
  viirsConfNominal,
  viirsConfHigh,
  minFrp,
  dayOfYearRange,
  targetCoords,
  onFilteredStatsChange,
}: FireLaboratoryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const allFeaturesRef = useRef<any[]>([]);

  // Initialize MapLibre with photorealistic satellite imagery & 3D terrain
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

    mapRef.current = map;

    map.on("load", async () => {
      // 1. Enable 3D Himalayan Terrain Relief
      try {
        map.setTerrain({
          source: "terrain-dem",
          exaggeration: 1.45,
        });
      } catch (err) {
        console.warn("Could not set 3D terrain:", err);
      }

      // 2. Add Uttarakhand Administrative Boundary
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
            "line-width": 2.8,
            "line-opacity": 0.35,
            "line-blur": 2,
          },
        });

        map.addLayer({
          id: "uttarakhand-line",
          type: "line",
          source: "uttarakhand-boundary",
          paint: {
            "line-color": "#7dd3fc",
            "line-width": 1.2,
            "line-opacity": 0.85,
          },
        });
      } catch (err) {
        console.warn("Could not load boundary geojson:", err);
      }

      // 3. Add Verified Complete 2025 Fire Observations (7,541 Records)
      try {
        const firesRes = await fetch("/data/uttarakhand_fires_2025.geojson");
        const firesData = await firesRes.json();
        allFeaturesRef.current = firesData.features || [];

        map.addSource("fire-hotspots", {
          type: "geojson",
          data: firesData,
        });

        // Layer A: Thermal Heat Dissipation Glow
        map.addLayer({
          id: "fire-heat-halo",
          type: "circle",
          source: "fire-hotspots",
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 3.5,
              10, 6.0,
              40, 11.0,
              100, 18.0,
              170, 24.0,
            ],
            "circle-color": [
              "step", ["get", "frp"],
              "#f59e0b",
              6, "#f97316",
              18, "#ef4444",
              50, "#c084fc",
              100, "#f43f5e",
            ],
            "circle-opacity": 0.38,
            "circle-blur": 1.1,
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
              1, 7.0,
              40, 13.0,
              170, 20.0,
            ],
            "circle-color": "transparent",
            "circle-stroke-width": 1.0,
            "circle-stroke-color": "#38bdf8",
            "circle-stroke-opacity": 0.5,
          },
        });

        // Layer C: Core Radiometric Hotspot Ember
        map.addLayer({
          id: "fire-core-ember",
          type: "circle",
          source: "fire-hotspots",
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 2.0,
              10, 3.4,
              40, 5.5,
              100, 8.0,
              170, 10.5,
            ],
            "circle-color": [
              "step", ["get", "frp"],
              "#fef08a",
              6, "#fed7aa",
              18, "#fca5a5",
              50, "#f5d0fe",
              100, "#ffffff",
            ],
            "circle-stroke-width": 0.8,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.9,
          },
        });

        // Layer D: Dynamic Hotspot Focus Highlight Ring
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
            "circle-radius": 15,
            "circle-color": "transparent",
            "circle-stroke-width": 2.2,
            "circle-stroke-color": "#38bdf8",
            "circle-stroke-opacity": 0.95,
          },
        });

        // Hotspot selection click event
        map.on("click", "fire-core-ember", (e) => {
          if (!e.features || !e.features[0]) return;
          const feat = e.features[0];
          const coords = (feat.geometry as any).coordinates.slice();
          const props = feat.properties as any;

          // Update selection ring
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
          map.getCanvas().style.cursor = "pointer";
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

    // 3. Minimum FRP Threshold
    if (minFrp > 0) {
      filterConditions.push([">=", ["get", "frp"], minFrp]);
    }

    // 4. Temporal Filters
    if (selectedMonth !== null) {
      filterConditions.push(["==", ["get", "month"], selectedMonth]);
    }

    if (dayOfYearRange !== null) {
      filterConditions.push([">=", ["get", "day_of_year"], dayOfYearRange[0]]);
      filterConditions.push(["<=", ["get", "day_of_year"], dayOfYearRange[1]]);
    }

    // 5. Decoupled Confidence Filters
    // MODIS: continuous percentage (0-100%)
    // VIIRS: categorical ("l", "n", "h")
    const confConditions: any[] = ["any"];

    // Condition for MODIS: must be sensor=MODIS and confidence_num >= minModisConf
    confConditions.push([
      "all",
      ["==", ["get", "sensor"], "MODIS"],
      [">=", ["get", "confidence_num"], minModisConf],
    ]);

    // Condition for VIIRS: check selected categories
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

    // Compute live stats for UI indicator
    if (onFilteredStatsChange && allFeaturesRef.current.length > 0) {
      let vCount = 0;
      let mCount = 0;
      let peakFrp = 0;

      for (const feat of allFeaturesRef.current) {
        const p = feat.properties;
        // Check sensor
        if (selectedSensor && selectedSensor !== "ALL" && p.sensor !== selectedSensor) continue;
        // Check daynight
        if (selectedDaynight && selectedDaynight !== "ALL" && p.daynight !== selectedDaynight) continue;
        // Check frp
        if (minFrp > 0 && p.frp < minFrp) continue;
        // Check month
        if (selectedMonth !== null && p.month !== selectedMonth) continue;
        // Check day of year
        if (dayOfYearRange !== null && (p.day_of_year < dayOfYearRange[0] || p.day_of_year > dayOfYearRange[1])) continue;

        // Check confidence
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
    selectedSensor,
    selectedDaynight,
    minModisConf,
    viirsConfLow,
    viirsConfNominal,
    viirsConfHigh,
    minFrp,
    dayOfYearRange,
    onFilteredStatsChange,
  ]);

  // Fly to target hotspot when commanded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !targetCoords) return;

    map.flyTo({
      center: targetCoords,
      zoom: 11.5,
      pitch: 62,
      bearing: 25,
      duration: 2200,
      essential: true,
    });

    const ringSource = map.getSource("selected-hotspot-source") as maplibregl.GeoJSONSource;
    if (ringSource) {
      ringSource.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: targetCoords,
            },
            properties: {},
          },
        ],
      });
    }
  }, [targetCoords, mapLoaded]);

  // Camera Actions
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 400 });
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 400 });
  };

  const handleResetNorth = () => {
    if (mapRef.current) mapRef.current.resetNorthPitch({ duration: 800 });
  };

  const handleToggleTerrain = () => {
    const map = mapRef.current;
    if (!map) return;

    if (terrainEnabled) {
      map.setTerrain(null);
      setTerrainEnabled(false);
    } else {
      map.setTerrain({
        source: "terrain-dem",
        exaggeration: 1.45,
      });
      setTerrainEnabled(true);
    }
  };

  const handleResetSector = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [79.25, 30.15],
        zoom: 7.2,
        pitch: 42,
        bearing: -10,
        duration: 2000,
      });
    }
  };

  const handleHimalayanRidge = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [79.45, 30.38],
        zoom: 9.8,
        pitch: 68,
        bearing: 36,
        duration: 2400,
      });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030508]">
      {/* MapLibre WebGL Canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Subtle Vignette for Cinematic Earth Observation Contrast */}
      <div className="pointer-events-none absolute inset-0 bg-radial-[at_50%_40%] from-transparent via-transparent to-black/60" />

      {/* Floating Map Action Controls (Vertical Pill, Center-Right) */}
      <aside 
        aria-label="Map navigation controls"
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 p-1.5 glass-pill rounded-full shadow-2xl"
      >
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-4 h-[1px] bg-white/10 my-0.5" />

        <button
          onClick={handleResetNorth}
          className="p-2.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Reset Bearing to True North"
          aria-label="Reset North"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={handleToggleTerrain}
          className={`p-2.5 rounded-full transition-colors cursor-pointer ${
            terrainEnabled
              ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "text-slate-500 hover:bg-white/10"
          }`}
          title={terrainEnabled ? "3D Terrain: Enabled (Click to flatten)" : "3D Terrain: Disabled (Click to extrude)"}
          aria-label="Toggle 3D Terrain"
        >
          <Layers className="w-4 h-4" />
        </button>

        <div className="w-4 h-[1px] bg-white/10 my-0.5" />

        <button
          onClick={handleResetSector}
          className="p-2.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Reset to Uttarakhand Sector Framing"
          aria-label="Reset to Sector"
        >
          <Globe className="w-4 h-4" />
        </button>
        <button
          onClick={handleHimalayanRidge}
          className="p-2.5 rounded-full hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          title="Oblique 3D Himalayan Ridge View"
          aria-label="Himalayan Ridge View"
        >
          <Mountain className="w-4 h-4" />
        </button>
      </aside>
    </div>
  );
}
