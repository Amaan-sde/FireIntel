"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  Compass,
  Layers,
  Mountain,
  Maximize2,
  Crosshair,
  MapPin,
  Flame,
  Radio,
  Eye,
  Plus,
  Minus,
} from "lucide-react";

interface WorkspaceMapProps {
  aoiMode: string;
  center: [number, number]; // [lon, lat]
  radiusKm?: number;
  bbox?: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  baselineGeojson: any;
  comparisonGeojson: any;
  onMapClick?: (coords: [number, number]) => void;
  baselineLabel: string;
  comparisonLabel: string;
}

export default function WorkspaceMap({
  aoiMode,
  center,
  radiusKm = 25.0,
  bbox,
  baselineGeojson,
  comparisonGeojson,
  onMapClick,
  baselineLabel,
  comparisonLabel,
}: WorkspaceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [terrain3D, setTerrain3D] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"both" | "baseline" | "comparison">("both");
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);

  // Initialize MapLibre Map with Satellite & 3D Terrain
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
            bounds: [76.0, 27.5, 83.0, 32.8],
          },
        },
        layers: [
          {
            id: "base-terrain-bedrock",
            type: "background",
            paint: {
              "background-color": "#0d1424",
            },
          },
          {
            id: "satellite-layer",
            type: "raster",
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: center,
      zoom: 8.5,
      pitch: 35,
      bearing: -5,
      minPitch: 0,
      maxPitch: 70,
      minZoom: 5.5,
      maxZoom: 14.5,
      maxBounds: [
        [75.5, 27.2],
        [83.2, 33.0],
      ],
      antialias: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      // 1. Enable 3D Himalayan Terrain Relief
      try {
        map.setTerrain({
          source: "terrain-dem",
          exaggeration: 1.4,
        });
      } catch (err) {
        console.warn("Could not set 3D terrain:", err);
      }

      // 2. Add AOI Boundary Source & Layer
      map.addSource("aoi-boundary", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "aoi-fill",
        type: "fill",
        source: "aoi-boundary",
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: "aoi-stroke",
        type: "line",
        source: "aoi-boundary",
        paint: {
          "line-color": "#22d3ee",
          "line-width": 2.5,
          "line-dasharray": [3, 2],
        },
      });

      // 3. Add Center Pin Source & Layer
      map.addSource("aoi-center", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "aoi-center-glow",
        type: "circle",
        source: "aoi-center",
        paint: {
          "circle-radius": 14,
          "circle-color": "#06b6d4",
          "circle-opacity": 0.35,
          "circle-blur": 0.8,
        },
      });

      map.addLayer({
        id: "aoi-center-point",
        type: "circle",
        source: "aoi-center",
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#06b6d4",
        },
      });

      // 4. Add Baseline Observations Source & Layers (Cyan)
      map.addSource("baseline-points", {
        type: "geojson",
        data: baselineGeojson || { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "baseline-heat-glow",
        type: "circle",
        source: "baseline-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "frp"],
            0, 6,
            20, 14,
            100, 24,
          ],
          "circle-color": "#06b6d4",
          "circle-opacity": 0.3,
          "circle-blur": 0.6,
        },
      });

      map.addLayer({
        id: "baseline-core-dots",
        type: "circle",
        source: "baseline-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "frp"],
            0, 2.5,
            20, 5.0,
            100, 8.5,
          ],
          "circle-color": "#67e8f9",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#083344",
        },
      });

      // 5. Add Comparison Observations Source & Layers (Rose / Crimson)
      map.addSource("comparison-points", {
        type: "geojson",
        data: comparisonGeojson || { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "comparison-heat-glow",
        type: "circle",
        source: "comparison-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "frp"],
            0, 6,
            20, 14,
            100, 24,
          ],
          "circle-color": "#f43f5e",
          "circle-opacity": 0.35,
          "circle-blur": 0.6,
        },
      });

      map.addLayer({
        id: "comparison-core-dots",
        type: "circle",
        source: "comparison-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "frp"],
            0, 2.5,
            20, 5.0,
            100, 8.5,
          ],
          "circle-color": "#fb7185",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#4c0519",
        },
      });

      setMapLoaded(true);
    });

    // Track cursor coordinates
    map.on("mousemove", (e) => {
      setCursorCoords([Number(e.lngLat.lng.toFixed(4)), Number(e.lngLat.lat.toFixed(4))]);
    });

    // Map Click to relocate custom AOI
    map.on("click", (e) => {
      if (onMapClick) {
        onMapClick([Number(e.lngLat.lng.toFixed(4)), Number(e.lngLat.lat.toFixed(4))]);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Update AOI boundary geometry & center marker whenever center, radius, or bbox changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Generate Polygon geometry for AOI
    let aoiPolygonFeature: any = null;

    if (aoiMode === "bbox" && bbox) {
      aoiPolygonFeature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[1]],
              [bbox[2], bbox[3]],
              [bbox[0], bbox[3]],
              [bbox[0], bbox[1]],
            ],
          ],
        },
        properties: {},
      };
    } else {
      // Default / Circle mode: generate 64-vertex geodesic circle polygon
      const points = 64;
      const coords: [number, number][] = [];
      const km = radiusKm || 25.0;
      const distanceX = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
      const distanceY = km / 110.574;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        coords.push([center[0] + x, center[1] + y]);
      }
      aoiPolygonFeature = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
        properties: {},
      };
    }

    const aoiSource = map.getSource("aoi-boundary") as maplibregl.GeoJSONSource;
    if (aoiSource) {
      aoiSource.setData({
        type: "FeatureCollection",
        features: aoiPolygonFeature ? [aoiPolygonFeature] : [],
      });
    }

    const centerSource = map.getSource("aoi-center") as maplibregl.GeoJSONSource;
    if (centerSource) {
      centerSource.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: center,
            },
            properties: {},
          },
        ],
      });
    }

    // Smooth camera fly-to active AOI
    map.flyTo({
      center: center,
      zoom: radiusKm > 40 ? 7.8 : 8.8,
      duration: 1200,
    });
  }, [center, radiusKm, bbox, aoiMode, mapLoaded]);

  // Update Observation Points when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const bSource = map.getSource("baseline-points") as maplibregl.GeoJSONSource;
    if (bSource && baselineGeojson) {
      bSource.setData(baselineGeojson);
    }

    const cSource = map.getSource("comparison-points") as maplibregl.GeoJSONSource;
    if (cSource && comparisonGeojson) {
      cSource.setData(comparisonGeojson);
    }
  }, [baselineGeojson, comparisonGeojson, mapLoaded]);

  // Toggle Layer Visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const showBaseline = activeLayer === "both" || activeLayer === "baseline";
    const showComparison = activeLayer === "both" || activeLayer === "comparison";

    if (map.getLayer("baseline-heat-glow")) {
      map.setLayoutProperty("baseline-heat-glow", "visibility", showBaseline ? "visible" : "none");
      map.setLayoutProperty("baseline-core-dots", "visibility", showBaseline ? "visible" : "none");
    }

    if (map.getLayer("comparison-heat-glow")) {
      map.setLayoutProperty("comparison-heat-glow", "visibility", showComparison ? "visible" : "none");
      map.setLayoutProperty("comparison-core-dots", "visibility", showComparison ? "visible" : "none");
    }
  }, [activeLayer, mapLoaded]);

  // Toggle 3D Terrain Relief
  const handleToggleTerrain = () => {
    if (!mapRef.current) return;
    const next = !terrain3D;
    setTerrain3D(next);
    if (next) {
      mapRef.current.setTerrain({ source: "terrain-dem", exaggeration: 1.4 });
    } else {
      mapRef.current.setTerrain(null);
    }
  };

  return (
    <div className="relative w-full h-[540px] sm:h-[620px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
      {/* MapLibre DOM Target */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Coordinate Readout HUD */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-black/85 border border-white/15 text-[11px] font-mono-telemetry text-slate-300 backdrop-blur-md shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>AOI Center: <strong>{center[1].toFixed(4)}°N, {center[0].toFixed(4)}°E</strong></span>
        </div>
        {cursorCoords && (
          <span className="text-slate-500 border-l border-white/10 pl-3 hidden sm:inline">
            Cursor: {cursorCoords[1]}°N, {cursorCoords[0]}°E
          </span>
        )}
      </div>

      {/* Observation Layer Switcher Pill */}
      <div className="absolute top-4 right-4 z-10 flex items-center p-0.5 rounded-xl bg-black/85 border border-white/15 text-xs font-mono-telemetry backdrop-blur-md shadow-lg">
        <button
          onClick={() => setActiveLayer("both")}
          className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            activeLayer === "both"
              ? "bg-white/20 text-white font-bold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Both Overlays</span>
        </button>
        <button
          onClick={() => setActiveLayer("baseline")}
          className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            activeLayer === "baseline"
              ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Baseline</span>
        </button>
        <button
          onClick={() => setActiveLayer("comparison")}
          className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
            activeLayer === "comparison"
              ? "bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Comparison</span>
        </button>
      </div>

      {/* Map Control Tools (Bottom Right) */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col gap-2">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2 rounded-xl bg-black/80 hover:bg-black text-slate-300 hover:text-white border border-white/15 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2 rounded-xl bg-black/80 hover:bg-black text-slate-300 hover:text-white border border-white/15 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleToggleTerrain}
          className={`p-2 rounded-xl border backdrop-blur-md shadow-lg transition-colors cursor-pointer ${
            terrain3D
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              : "bg-black/80 text-slate-400 border-white/15 hover:text-white"
          }`}
          title="Toggle 3D Himalayan Relief"
        >
          <Mountain className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            mapRef.current?.flyTo({ center, zoom: 8.5, pitch: 35, bearing: -5 });
          }}
          className="p-2 rounded-xl bg-black/80 hover:bg-black text-slate-300 hover:text-white border border-white/15 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Reset Camera Center"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left Legend Badge */}
      <div className="absolute bottom-5 left-5 z-10 p-3 rounded-2xl bg-black/90 border border-white/15 text-xs font-mono-telemetry backdrop-blur-xl shadow-2xl space-y-2 max-w-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/10 pb-1.5">
          <span className="font-bold text-white uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            Observation Legend
          </span>
          <span className="text-[10px] text-slate-500">Esri / Terrarium 3D</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-cyan-300">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              {baselineLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-rose-300">
              <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              {comparisonLabel}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
          Tip: Click anywhere on the map to set a new custom research coordinate.
        </p>
      </div>
    </div>
  );
}

