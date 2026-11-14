"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Plus, Minus, Compass, Layers, Globe } from "lucide-react";

interface GlobeMapProps {
  onHotspotSelect?: (hotspot: any) => void;
  selectedMonth?: number | null;
  selectedSensor?: string | null;
  cameraMode?: "orbital" | "sector" | "ridge";
  onCameraModeChange?: (mode: "orbital" | "sector" | "ridge") => void;
  targetCoords?: [number, number] | null;
}

export default function GlobeMap({
  onHotspotSelect,
  selectedMonth,
  selectedSensor,
  cameraMode = "sector",
  onCameraModeChange,
  targetCoords,
}: GlobeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const activeCameraModeRef = useRef<string>("sector");

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
      center: [79.2, 30.15],
      zoom: 7.0,
      pitch: 48,
      bearing: -14,
      maxPitch: 85,
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", async () => {
      setMapLoaded(true);

      // Enable 3D Terrain Extrusion for the Himalayas
      try {
        map.setTerrain({
          source: "terrain-dem",
          exaggeration: 1.45,
        });
      } catch (err) {
        console.warn("Could not set 3D terrain:", err);
      }

      // Add Uttarakhand Administrative Boundary
      try {
        const boundaryRes = await fetch("/data/uttarakhand_boundary.geojson");
        const boundaryData = await boundaryRes.json();

        map.addSource("uttarakhand-boundary", {
          type: "geojson",
          data: boundaryData,
        });

        // Ethereal boundary line
        map.addLayer({
          id: "uttarakhand-line-glow",
          type: "line",
          source: "uttarakhand-boundary",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 3.0,
            "line-opacity": 0.4,
            "line-blur": 2,
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

      // Add Verified Satellite Thermal Anomaly Observations
      try {
        const firesRes = await fetch("/data/sample_fires_for_web.json");
        const firesData = await firesRes.json();

        map.addSource("fire-hotspots", {
          type: "geojson",
          data: firesData,
        });

        // Outer ambient glow (subtle heat diffusion)
        map.addLayer({
          id: "fire-glow",
          type: "circle",
          source: "fire-hotspots",
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 3.5,
              15, 6.5,
              50, 12,
              150, 18
            ],
            "circle-color": [
              "step", ["get", "frp"],
              "#f59e0b",
              8, "#f97316",
              20, "#ef4444",
              60, "#a855f7"
            ],
            "circle-opacity": 0.35,
            "circle-blur": 1.0,
          },
        });

        // High-precision core thermal ember
        map.addLayer({
          id: "fire-nodes",
          type: "circle",
          source: "fire-hotspots",
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["get", "frp"],
              1, 2.0,
              15, 3.8,
              50, 6.0,
              150, 9.0
            ],
            "circle-color": [
              "step", ["get", "frp"],
              "#fef08a",
              8, "#fed7aa",
              20, "#fca5a5",
              60, "#f5d0fe"
            ],
            "circle-stroke-width": 0.8,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.85,
          },
        });

        // Highlight ring layer for selected hotspot
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
            "circle-radius": 14,
            "circle-color": "transparent",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#38bdf8",
            "circle-stroke-opacity": 0.9,
          },
        });

        // Hotspot selection handler
        map.on("click", "fire-nodes", (e) => {
          if (!e.features || !e.features[0]) return;
          const feat = e.features[0];
          const coords = (feat.geometry as any).coordinates.slice();
          const props = feat.properties as any;

          // Update highlight ring
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

          if (onHotspotSelect) {
            onHotspotSelect({
              ...props,
              coordinates: coords,
            });
          }
        });

        // Hover cursor
        map.on("mouseenter", "fire-nodes", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "fire-nodes", () => {
          map.getCanvas().style.cursor = "";
        });
      } catch (err) {
        console.warn("Could not load fires geojson:", err);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Filter map layers by month and sensor (with integer month attribute)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer("fire-nodes")) return;

    const filters: any[] = ["all"];

    if (selectedSensor) {
      filters.push(["==", ["get", "sensor"], selectedSensor]);
    }

    if (selectedMonth) {
      filters.push(["==", ["get", "month"], selectedMonth]);
    }

    const appliedFilter = (filters.length > 1 ? filters : null) as any;
    map.setFilter("fire-nodes", appliedFilter);
    map.setFilter("fire-glow", appliedFilter);
  }, [selectedMonth, selectedSensor, mapLoaded]);

  // Handle camera transitions
  const transitionCamera = useCallback(
    (mode: "orbital" | "sector" | "ridge") => {
      const map = mapRef.current;
      if (!map) return;

      activeCameraModeRef.current = mode;
      if (onCameraModeChange) {
        onCameraModeChange(mode);
      }

      if (mode === "orbital") {
        map.flyTo({
          center: [79.0, 24.0],
          zoom: 2.2,
          pitch: 24,
          bearing: 0,
          duration: 2500,
          essential: true,
        });
      } else if (mode === "sector") {
        map.flyTo({
          center: [79.2, 30.15],
          zoom: 7.2,
          pitch: 48,
          bearing: -14,
          duration: 2200,
          essential: true,
        });
      } else if (mode === "ridge") {
        map.flyTo({
          center: [79.45, 30.38],
          zoom: 9.8,
          pitch: 68,
          bearing: 36,
          duration: 2600,
          essential: true,
        });
      }
    },
    [onCameraModeChange]
  );

  // Sync external cameraMode prop
  useEffect(() => {
    if (cameraMode && mapLoaded) {
      transitionCamera(cameraMode);
    }
  }, [cameraMode, mapLoaded, transitionCamera]);

  // Fly to target coordinates when requested
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !targetCoords) return;

    map.flyTo({
      center: targetCoords,
      zoom: 11.2,
      pitch: 60,
      bearing: 25,
      duration: 2000,
      essential: true,
    });

    // Update highlight ring
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

  // Interactive Map Controls Handlers
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030508]">
      {/* 3D MapLibre Canvas */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Atmospheric Horizon Gradient Overlay (Vignette) */}
      <div className="pointer-events-none absolute inset-0 bg-radial-[at_50%_40%] from-transparent via-transparent to-black/60" />

      {/* Floating Map Action Controls (Vertical Pill, Center-Right) */}
      <div className="absolute top-1/2 -translate-y-1/2 right-6 z-20 flex flex-col items-center glass-pill rounded-full p-1.5 gap-2 shadow-2xl">
        <button
          onClick={handleZoomIn}
          data-control="zoom-in"
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          data-control="zoom-out"
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-4 h-[1px] bg-white/10" />

        <button
          onClick={handleResetNorth}
          data-control="reset-north"
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Reset North Orientation"
          aria-label="Reset North"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={handleToggleTerrain}
          data-control="toggle-terrain"
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            terrainEnabled
              ? "bg-amber-500/20 text-amber-300 shadow-sm"
              : "hover:bg-white/10 text-slate-400 hover:text-white"
          }`}
          title={terrainEnabled ? "3D Terrain: Active (Click to disable)" : "3D Terrain: Disabled (Click to enable)"}
          aria-label="Toggle 3D Terrain"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => transitionCamera("sector")}
          data-control="reset-sector"
          className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Reset to Uttarakhand Sector"
          aria-label="Reset to Uttarakhand Sector"
        >
          <Globe className="w-4 h-4" />
        </button>
      </div>

      {/* Cinematic Perspective Controls (Floating Minimal Capsule, Top Right) */}
      <div className="absolute top-20 right-8 z-20 flex items-center glass-pill rounded-full p-1 text-xs shadow-2xl">
        <button
          onClick={() => transitionCamera("orbital")}
          data-camera="orbital"
          aria-label="Orbit View"
          className={`px-3.5 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer ${
            cameraMode === "orbital"
              ? "bg-white/20 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
          }`}
        >
          Orbit
        </button>
        <button
          onClick={() => transitionCamera("sector")}
          data-camera="sector"
          className={`px-3.5 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer ${
            cameraMode === "sector"
              ? "bg-white/20 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
          }`}
        >
          Uttarakhand Sector
        </button>
        <button
          onClick={() => transitionCamera("ridge")}
          data-camera="ridge"
          className={`px-3.5 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer ${
            cameraMode === "ridge"
              ? "bg-white/20 text-white shadow-sm font-semibold"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
          }`}
        >
          3D Himalayan Relief
        </button>
      </div>

      {/* Minimal FRP Legend (Bottom Left corner) */}
      <div className="absolute bottom-6 left-8 z-20 hidden sm:flex items-center gap-3.5 glass-pill rounded-full px-4 py-2 text-[11px] text-slate-300 shadow-xl">
        <span className="text-slate-400 font-medium">Radiative Power (FRP)</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]" />
          <span className="text-slate-400">&lt; 8 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#f97316] shadow-[0_0_6px_#f97316]" />
          <span className="text-slate-400">8–20 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_6px_#ef4444]" />
          <span className="text-slate-400">20–60 MW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_6px_#a855f7]" />
          <span className="text-slate-400">&gt; 60 MW</span>
        </div>
      </div>
    </div>
  );
}
