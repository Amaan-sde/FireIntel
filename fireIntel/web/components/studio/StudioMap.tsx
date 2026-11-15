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
  const [colorMode, setColorMode] = useState<"frp" | "model">("frp");
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initialCenter: [number, number] = center || [-121.65, 39.85]; // Default California or dataset center

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
      zoom: 6.5,
      pitch: 35,
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
            4, 4,
            8, 8,
            12, 14,
          ],
          "circle-color": "#f43f5e",
          "circle-opacity": 0.25,
          "circle-blur": 0.8,
        },
      });

      // Add Core point layer with FRP color ramp
      map.addLayer({
        id: "hotspots-core",
        type: "circle",
        source: "studio-observations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4, 2.5,
            8, 4.5,
            12, 7.5,
          ],
          "circle-color": [
            "step",
            ["get", "frp"],
            "#facc15", // < 10 MW (Yellow)
            10.0,
            "#fb923c", // 10-30 MW (Orange)
            30.0,
            "#f43f5e", // 30-100 MW (Rose)
            100.0,
            "#c084fc", // > 100 MW (Violet)
          ],
          "circle-opacity": 0.95,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.7,
        },
      });

      // Hotspot click interaction
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
          { padding: 50, duration: 2000 }
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

  // Update Point coloring when Model Results are available
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (colorMode === "model" && modelResult) {
      if (modelResult.model_type === "SUPERVISED_CLASSIFIER") {
        mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
          "case",
          ["==", ["get", "predicted"], "2"],
          "#c084fc", // Static source (Purple)
          "#06b6d4", // Vegetation fire (Cyan)
        ]);
      } else if (modelResult.model_type === "UNSUPERVISED_SPATIAL_ANOMALY") {
        mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
          "case",
          ["==", ["get", "is_anomaly"], true],
          "#f43f5e", // Anomaly (Vivid Rose)
          "#10b981", // Normal Cluster Member (Emerald)
        ]);
      }
    } else {
      // Restore FRP color ramp
      mapRef.current.setPaintProperty("hotspots-core", "circle-color", [
        "step",
        ["get", "frp"],
        "#facc15",
        10.0,
        "#fb923c",
        30.0,
        "#f43f5e",
        100.0,
        "#c084fc",
      ]);
    }
  }, [colorMode, modelResult, mapLoaded]);

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

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#030612]">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left: Canvas Header HUD */}
      <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap items-center gap-2 font-mono-telemetry text-xs">
        <div className="glass-pill px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10 text-white backdrop-blur-md bg-black/60 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <strong className="text-white text-xs">{datasetName || "Global Domain"}</strong>
          {geojson?.features && (
            <span className="text-[10px] text-slate-400">
              ({geojson.features.length} specimen nodes plotted)
            </span>
          )}
        </div>

        {/* Color Mode Switcher */}
        {modelResult && (
          <div className="flex items-center p-0.5 rounded-xl bg-black/70 border border-white/10 text-[11px]">
            <button
              onClick={() => setColorMode("frp")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                colorMode === "frp"
                  ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              FRP Radiance
            </button>
            <button
              onClick={() => setColorMode("model")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                colorMode === "model"
                  ? "bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Model Inference</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Right: Zoom & Reset Camera Controls */}
      <div className="absolute top-3.5 right-3.5 z-10 flex flex-col gap-1.5 font-mono-telemetry">
        <button
          onClick={handleFitBounds}
          className="p-2 rounded-xl bg-black/70 border border-white/15 text-slate-300 hover:text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg"
          title="Zoom to Dataset Bounding Box"
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2 rounded-xl bg-black/70 border border-white/15 text-slate-300 hover:text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2 rounded-xl bg-black/70 border border-white/15 text-slate-300 hover:text-white hover:bg-black/90 transition-all cursor-pointer shadow-lg"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left: Coordinates HUD & Legend */}
      <div className="absolute bottom-3.5 left-3.5 z-10 flex flex-wrap items-center gap-2 font-mono-telemetry text-[10px]">
        {cursorCoords && (
          <div className="px-2.5 py-1 rounded-lg bg-black/70 border border-white/10 text-slate-300 backdrop-blur-md">
            Coord: {cursorCoords[1]}°N, {cursorCoords[0]}°E
          </div>
        )}

        {/* Legend */}
        <div className="px-3 py-1 rounded-lg bg-black/70 border border-white/10 text-slate-300 backdrop-blur-md flex items-center gap-3">
          {colorMode === "frp" ? (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" /> &lt;10 MW
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" /> 10–30 MW
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> 30–100 MW
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> &gt;100 MW
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Class 0 / Core
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Class 2 / Anomaly
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Right: Selected Hotspot Details Modal / Drawer */}
      {selectedHotspot && (
        <div className="absolute bottom-3.5 right-3.5 z-20 w-80 max-w-[90%] bg-[#030612]/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl font-mono-telemetry text-xs space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>Thermal Observation Node</span>
            </div>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Coordinates:</span>
              <span className="text-white font-bold">
                {selectedHotspot.coordinates[1].toFixed(4)}°N, {selectedHotspot.coordinates[0].toFixed(4)}°E
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fire Radiative Power:</span>
              <span className="text-amber-300 font-bold">
                {selectedHotspot.properties.frp || "N/A"} MW
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sensor / Satellite:</span>
              <span className="text-cyan-300 font-bold">
                {selectedHotspot.properties.sensor || "Satellite"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence:</span>
              <span className="text-emerald-300 uppercase">
                {selectedHotspot.properties.confidence || "nominal"}
              </span>
            </div>
            {selectedHotspot.properties.predicted !== undefined && (
              <div className="flex justify-between pt-1 border-t border-white/10 text-purple-300 font-bold">
                <span>Model Prediction:</span>
                <span>Class {selectedHotspot.properties.predicted}</span>
              </div>
            )}
            {selectedHotspot.properties.cluster_id !== undefined && (
              <div className="flex justify-between pt-1 border-t border-white/10 text-purple-300 font-bold">
                <span>DBSCAN Cluster:</span>
                <span>
                  {selectedHotspot.properties.cluster_id === -1
                    ? "Isolated Outlier"
                    : `Cluster #${selectedHotspot.properties.cluster_id}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

