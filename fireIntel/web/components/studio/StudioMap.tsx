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
  Info,
  X,
  Sparkles,
  Satellite,
  CheckCircle2,
} from "lucide-react";

interface StudioMapProps {
  geojson: any;
  bbox?: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  center?: [number, number]; // [lon, lat]
  datasetName: string;
  modelResult?: any;
}

export default function StudioMap({
  geojson,
  bbox,
  center,
  datasetName,
  modelResult,
}: StudioMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
  const [colorMode, setColorMode] = useState<"frp" | "sensor" | "category" | "model">("frp");
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
  
  // Layer visibility toggles
  const [showViirs, setShowViirs] = useState(true);
  const [showModis, setShowModis] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initialCenter: [number, number] = center || [0, 20]; // Worldwide default center

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
        },
        layers: [
          {
            id: "esri-satellite-layer",
            type: "raster",
            source: "esri-satellite",
            minzoom: 0,
            maxzoom: 18,
          },
        ],
      },
      center: initialCenter,
      zoom: 2.5,
      pitch: 25,
      bearing: 0,
    });

    map.on("load", () => {
      setMapLoaded(true);

      // Add Observations GeoJSON source
      map.addSource("studio-observations", {
        type: "geojson",
        data: geojson || { type: "FeatureCollection", features: [] },
      });

      // Add Glow halo layer
      map.addLayer({
        id: "hotspots-glow",
        type: "circle",
        source: "studio-observations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2, 3,
            6, 7,
            12, 14
          ],
          "circle-color": [
            "step",
            ["get", "frp"],
            "#facc15",
            15.0,
            "#fb923c",
            50.0,
            "#f43f5e",
            120.0,
            "#c084fc",
          ],
          "circle-opacity": 0.35,
          "circle-blur": 0.8,
        },
      });

      // Add Sharp Core point layer
      map.addLayer({
        id: "hotspots-core",
        type: "circle",
        source: "studio-observations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2, 2.5,
            6, 4.5,
            12, 8
          ],
          "circle-color": [
            "step",
            ["get", "frp"],
            "#facc15",
            15.0,
            "#fb923c",
            50.0,
            "#f43f5e",
            120.0,
            "#c084fc",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.7,
        },
      });

      // Click to inspect hotspot
      map.on("click", "hotspots-core", (e) => {
        if (e.features && e.features[0]) {
          const feat = e.features[0];
          setSelectedHotspot({
            coordinates: (feat.geometry as any).coordinates,
            properties: feat.properties,
          });
        }
      });

      map.on("mouseenter", "hotspots-core", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "hotspots-core", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mousemove", (e) => {
        setCursorCoords([
          Number(e.lngLat.lng.toFixed(4)),
          Number(e.lngLat.lat.toFixed(4)),
        ]);
      });

      // Auto-fit bounds if bbox available
      if (bbox && bbox.length === 4) {
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 60, duration: 2000 }
        );
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // Update GeoJSON data and Fit Bounds when dataset changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const source = mapRef.current.getSource("studio-observations") as maplibregl.GeoJSONSource;
    if (source && geojson) {
      source.setData(geojson);
    }

    if (bbox && bbox.length === 4) {
      mapRef.current.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 60, duration: 2200 }
      );
    }
  }, [geojson, bbox, mapLoaded]);

  // Update Point coloring when Color Mode or Model Results change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (colorMode === "sensor") {
      // VIIRS = Cyan, MODIS = Amber
      mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
        "case",
        ["==", ["get", "sensor"], "VIIRS"],
        "#06b6d4",
        "#f59e0b",
      ]);
    } else if (colorMode === "category") {
      // Archive = Emerald, NRT = Rose
      mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
        "case",
        ["==", ["get", "category"], "ARCHIVE"],
        "#10b981",
        "#f43f5e",
      ]);
    } else if (colorMode === "model" && modelResult) {
      if (modelResult.model_type === "SUPERVISED_DUAL_CLASSIFIER" || modelResult.models) {
        mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
          "case",
          ["==", ["get", "predicted_type"], 2],
          "#c084fc", // Static source (Purple)
          "#06b6d4", // Vegetation fire (Cyan)
        ]);
      } else {
        mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
          "case",
          ["==", ["get", "is_anomaly"], true],
          "#f43f5e", // Anomaly (Rose)
          "#10b981", // Normal Cluster Member (Emerald)
        ]);
      }
    } else {
      // FRP default ramp
      mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
        "step",
        ["get", "frp"],
        "#facc15",
        15.0,
        "#fb923c",
        50.0,
        "#f43f5e",
        120.0,
        "#c084fc",
      ]);
    }
  }, [colorMode, modelResult, mapLoaded]);

  // Sensor Filter
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    let filterExpr: any = null;
    if (showViirs && !showModis) {
      filterExpr = ["==", ["get", "sensor"], "VIIRS"];
    } else if (!showViirs && showModis) {
      filterExpr = ["==", ["get", "sensor"], "MODIS"];
    } else if (!showViirs && !showModis) {
      filterExpr = ["==", ["get", "sensor"], "__none__"];
    }

    mapRef.current.setFilter("hotspots-core", filterExpr);
    mapRef.current.setFilter("hotspots-glow", filterExpr);
  }, [showViirs, showModis, mapLoaded]);

  const handleFitBounds = () => {
    if (!mapRef.current || !bbox) return;
    mapRef.current.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 60, duration: 1500 }
    );
  };

  const featureCount = geojson?.features?.length || 0;

  return (
    <div className="relative w-full h-[540px] sm:h-[600px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#01040a]">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left: Dataset Callout & Layer Filter Capsules */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <div className="glass-pill rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-mono-telemetry text-slate-200 shadow-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white truncate max-w-[200px] sm:max-w-none">
            {datasetName}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-[10px] text-slate-400">
            {featureCount.toLocaleString()} nodes mapped
          </span>
        </div>

        {/* Color Mode Switcher */}
        <div className="glass-pill rounded-xl p-0.5 flex items-center gap-1 text-[11px] font-mono-telemetry shadow-xl">
          <button
            onClick={() => setColorMode("frp")}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              colorMode === "frp"
                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            FRP Intensity
          </button>
          <button
            onClick={() => setColorMode("sensor")}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              colorMode === "sensor"
                ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            VIIRS vs MODIS
          </button>
          <button
            onClick={() => setColorMode("category")}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              colorMode === "category"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Archive vs NRT
          </button>
          {modelResult && (
            <button
              onClick={() => setColorMode("model")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                colorMode === "model"
                  ? "bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold"
                : "text-purple-300 hover:text-white"
              }`}
            >
              ML Predictions
            </button>
          )}
        </div>

        {/* Sensor Visibility Toggles */}
        <div className="glass-pill rounded-xl px-2 py-1 flex items-center gap-2 text-[10px] font-mono-telemetry shadow-xl">
          <button
            onClick={() => setShowViirs(!showViirs)}
            className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
              showViirs ? "text-cyan-400 font-bold" : "text-slate-500 line-through"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            VIIRS
          </button>
          <button
            onClick={() => setShowModis(!showModis)}
            className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 ${
              showModis ? "text-amber-400 font-bold" : "text-slate-500 line-through"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            MODIS
          </button>
        </div>
      </div>

      {/* Top Right: Map Navigation & Zoom Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-center gap-1.5">
        <button
          onClick={handleFitBounds}
          className="glass-pill rounded-xl p-2 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow-lg"
          title="Auto-Fit Bounds to Global Extent"
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="glass-pill rounded-xl p-2 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow-lg"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="glass-pill rounded-xl p-2 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow-lg"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left: Legend Bar & Coordinates */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 font-mono-telemetry text-[10px]">
        {cursorCoords && (
          <div className="glass-pill rounded-lg px-2.5 py-1 text-slate-400">
            Coord: {cursorCoords[1]}°N, {cursorCoords[0]}°E
          </div>
        )}

        {/* Dynamic Legend */}
        <div className="glass-pill rounded-lg px-3 py-1 flex items-center gap-3 text-slate-300">
          {colorMode === "frp" && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#facc15]" />
                <span>&lt;15 MW</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
                <span>15-50 MW</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                <span>50-120 MW</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#c084fc]" />
                <span>&gt;120 MW</span>
              </div>
            </>
          )}

          {colorMode === "sensor" && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>VIIRS (375m)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>MODIS (1.0km)</span>
              </div>
            </>
          )}

          {colorMode === "category" && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>ARCHIVE (Validated)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>NRT (Near Real-Time)</span>
              </div>
            </>
          )}

          {colorMode === "model" && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Veg Fire (Class 0)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Static Heat Source (Class 2)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inspector Modal Popup */}
      {selectedHotspot && (
        <div className="absolute top-14 right-3 z-20 w-72 p-3.5 glass-surface rounded-2xl border border-white/20 shadow-2xl text-xs font-mono-telemetry animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              HOTSPOT INSPECTOR
            </span>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Position:</span>
              <span className="text-white font-bold">
                {selectedHotspot.coordinates[1].toFixed(4)}°N, {selectedHotspot.coordinates[0].toFixed(4)}°E
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sensor & Satellite:</span>
              <span className="text-cyan-300 font-bold">
                {selectedHotspot.properties.sensor} ({selectedHotspot.properties.satellite})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Source Stream:</span>
              <span className="text-emerald-300 font-bold">
                {selectedHotspot.properties.category}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Radiant Power (FRP):</span>
              <span className="text-amber-300 font-bold">
                {selectedHotspot.properties.frp} MW
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Brightness Temp:</span>
              <span className="text-white">
                {selectedHotspot.properties.brightness} K
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence Class:</span>
              <span className="text-white uppercase font-bold">
                {selectedHotspot.properties.confidence_class || "nominal"}
              </span>
            </div>
            {selectedHotspot.properties.acq_date && (
              <div className="flex justify-between">
                <span className="text-slate-400">Overpass UTC:</span>
                <span className="text-slate-200">
                  {selectedHotspot.properties.acq_date} {selectedHotspot.properties.acq_time || ""}
                </span>
              </div>
            )}
            {selectedHotspot.properties.type !== undefined && selectedHotspot.properties.type !== null && (
              <div className="flex justify-between pt-1 border-t border-white/10">
                <span className="text-slate-400">Ground Truth Type:</span>
                <span className="text-purple-300 font-bold">
                  Class {selectedHotspot.properties.type}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
