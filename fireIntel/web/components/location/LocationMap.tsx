"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import {
  Compass,
  Layers,
  MapPin,
  Flame,
  Satellite,
  Info,
  X,
  Plus,
  Minus,
  Maximize2,
  Crosshair,
  Calendar,
  Radio,
} from "lucide-react";
import { SelectedLocation } from "./LocationSearchHeader";

interface LocationMapProps {
  location: SelectedLocation;
  radiusKm: number;
  pointsGeojson: any;
  circleGeojson: any;
  sampledCount: number;
  totalCount: number;
  isSampled: boolean;
}

export default function LocationMap({
  location,
  radiusKm,
  pointsGeojson,
  circleGeojson,
  sampledCount,
  totalCount,
  isSampled,
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const centerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
  const [colorMode, setColorMode] = useState<"sensor" | "frp">("sensor");
  const [showRadiusCircle, setShowRadiusCircle] = useState(true);
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
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
            maxzoom: 19,
          },
        ],
      },
      center: [location.lon, location.lat],
      zoom: radiusKm <= 10 ? 11 : radiusKm <= 25 ? 9.5 : 8.5,
      pitch: 20,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("mousemove", (e) => {
      setCursorCoords([Number(e.lngLat.lat.toFixed(5)), Number(e.lngLat.lng.toFixed(5))]);
    });

    map.on("load", () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
        centerMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Center Pin Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
    }

    // Create custom DOM element for location pin
    const el = document.createElement("div");
    el.className = "relative flex items-center justify-center cursor-pointer";
    el.innerHTML = `
      <div class="absolute w-8 h-8 rounded-full bg-cyan-400/20 animate-ping"></div>
      <div class="relative w-5 h-5 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-black text-black">
        ★
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([location.lon, location.lat])
      .addTo(map);

    centerMarkerRef.current = marker;
  }, [location.lat, location.lon, mapLoaded]);

  // Update Radius Circle Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = "radius-circle-source";
    const fillLayerId = "radius-circle-fill";
    const lineLayerId = "radius-circle-line";

    const circleData = circleGeojson || {
      type: "FeatureCollection",
      features: [],
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(circleData);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: circleData,
      });

      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: lineLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#38bdf8",
          "line-width": 2,
          "line-dasharray": [2, 2],
          "line-opacity": 0.8,
        },
      });
    }

    // Toggle visibility
    if (map.getLayer(fillLayerId)) {
      map.setLayoutProperty(fillLayerId, "visibility", showRadiusCircle ? "visible" : "none");
    }
    if (map.getLayer(lineLayerId)) {
      map.setLayoutProperty(lineLayerId, "visibility", showRadiusCircle ? "visible" : "none");
    }
  }, [circleGeojson, mapLoaded, showRadiusCircle]);

  // Update Observation Points & Clustering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = "points-source";
    const clusterLayerId = "clusters";
    const clusterCountLayerId = "cluster-count";
    const unclusteredLayerId = "unclustered-point";

    const pointsData = pointsGeojson || {
      type: "FeatureCollection",
      features: [],
    };

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(pointsData);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: pointsData,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 40,
      });

      // 1. Clustered Points
      map.addLayer({
        id: clusterLayerId,
        type: "circle",
        source: sourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "rgba(245, 158, 11, 0.8)",
            50,
            "rgba(239, 68, 68, 0.85)",
            200,
            "rgba(168, 85, 247, 0.9)",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            50,
            22,
            200,
            28,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count text
      map.addLayer({
        id: clusterCountLayerId,
        type: "symbol",
        source: sourceId,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // 2. Individual Unclustered Hotspots
      map.addLayer({
        id: unclusteredLayerId,
        type: "circle",
        source: sourceId,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "frp"], 1.0],
            1.0, 4,
            20.0, 7,
            100.0, 12,
            300.0, 18,
          ],
          "circle-color": [
            "match",
            ["get", "sensor"],
            "VIIRS", "#22d3ee",  // Cyan for VIIRS
            "MODIS", "#f59e0b",  // Amber for MODIS
            "#ef4444",           // Fallback Red
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255, 255, 255, 0.8)",
          "circle-opacity": 0.85,
        },
      });

      // Click on cluster to zoom in
      map.on("click", clusterLayerId, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId !== undefined) {
          (map.getSource(sourceId) as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom + 0.5,
            });
          });
        }
      });

      // Click on unclustered point to inspect
      map.on("click", unclusteredLayerId, (e) => {
        if (!e.features || !e.features[0]) return;
        const feature = e.features[0];
        const geom = feature.geometry as any;
        const props = feature.properties || {};

        setSelectedHotspot({
          lon: geom.coordinates[0],
          lat: geom.coordinates[1],
          frp: props.frp,
          brightness: props.brightness,
          sensor: props.sensor,
          daynight: props.daynight,
          confidence: props.confidence,
          acq_date: props.acq_date,
          distance_km: props.distance_km,
        });
      });

      // Mouse enter/leave pointer cursors
      map.on("mouseenter", clusterLayerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", clusterLayerId, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", unclusteredLayerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", unclusteredLayerId, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    // Dynamic Paint Update based on colorMode
    if (map.getLayer(unclusteredLayerId)) {
      if (colorMode === "frp") {
        map.setPaintProperty(unclusteredLayerId, "circle-color", [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "frp"], 1.0],
          1.0, "#fde047",    // Yellow
          10.0, "#f97316",   // Orange
          50.0, "#ef4444",   // Red
          150.0, "#a855f7",  // Purple
        ]);
      } else {
        map.setPaintProperty(unclusteredLayerId, "circle-color", [
          "match",
          ["get", "sensor"],
          "VIIRS", "#22d3ee",
          "MODIS", "#f59e0b",
          "#ef4444",
        ]);
      }
    }
  }, [pointsGeojson, mapLoaded, colorMode]);

  // Fit Bounds to Circle Polygon on Location or Radius Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !circleGeojson) return;

    try {
      const coords = circleGeojson.geometry?.coordinates?.[0];
      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (b: maplibregl.LngLatBounds, c: [number, number]) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 40, duration: 1200 });
      }
    } catch (err) {
      console.warn("Could not fit circle bounds:", err);
      map.flyTo({ center: [location.lon, location.lat], zoom: radiusKm <= 10 ? 11 : 9.5 });
    }
  }, [location.lat, location.lon, radiusKm, circleGeojson, mapLoaded]);

  // Zoom Controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleRecenter = () => {
    mapRef.current?.flyTo({
      center: [location.lon, location.lat],
      zoom: radiusKm <= 10 ? 11 : radiusKm <= 25 ? 9.5 : 8.5,
      essential: true,
    });
  };

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#010308] font-mono-telemetry">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left: Location Info Badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-white/15 backdrop-blur-md shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-white">{location.name}</span>
          <span className="text-[10px] text-cyan-300 font-semibold bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
            {radiusKm} km radius
          </span>
        </div>

        {isSampled && (
          <div className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-[10px] text-amber-200 backdrop-blur-md shadow-lg pointer-events-auto">
            Rendering {sampledCount.toLocaleString()} high-FRP points of {totalCount.toLocaleString()} total
          </div>
        )}
      </div>

      {/* Top Right: Color Mode & Layer Toggles */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        {/* Color Mode Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md text-[11px]">
          <button
            onClick={() => setColorMode("sensor")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              colorMode === "sensor"
                ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By Sensor
          </button>
          <button
            onClick={() => setColorMode("frp")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              colorMode === "frp"
                ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By FRP
          </button>
        </div>

        {/* Radius Circle Toggle */}
        <button
          onClick={() => setShowRadiusCircle(!showRadiusCircle)}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold backdrop-blur-md transition-all cursor-pointer ${
            showRadiusCircle
              ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
              : "bg-black/80 text-slate-400 border-white/15"
          }`}
          title="Toggle radius perimeter circle"
        >
          Radius Ring
        </button>
      </div>

      {/* Right Center: Map Navigation Buttons */}
      <div className="absolute right-4 top-24 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-xl bg-black/80 hover:bg-black text-slate-200 hover:text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-lg"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-black/80 hover:bg-black text-slate-200 hover:text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-lg"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecenter}
          className="p-2 rounded-xl bg-black/80 hover:bg-black text-cyan-300 hover:text-cyan-100 border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-lg"
          title="Recenter on Location"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left: Interactive Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 p-2.5 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md text-[11px] space-y-1.5 shadow-xl pointer-events-auto">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {colorMode === "sensor" ? "Sensor Channels" : "Fire Radiative Power (MW)"}
        </div>
        {colorMode === "sensor" ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-white/60 shadow" />
              <span className="text-white">VIIRS (375m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400 border border-white/60 shadow" />
              <span className="text-white">MODIS (1km)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-300" /> &lt;10</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 10-50</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 50-150</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> &gt;150 MW</span>
          </div>
        )}
      </div>

      {/* Bottom Center: Coordinates Readout */}
      {cursorCoords && (
        <div className="absolute bottom-4 right-20 z-10 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-[10px] text-slate-400 font-mono-telemetry backdrop-blur-md hidden sm:block">
          {cursorCoords[0]}°N, {cursorCoords[1]}°E
        </div>
      )}

      {/* Observation Inspector Popup Card */}
      {selectedHotspot && (
        <div className="absolute top-16 right-16 z-20 w-80 bg-[#070b17]/95 border border-amber-400/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Hotspot Observation</span>
            </div>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase">FRP (Power)</div>
              <div className="text-base font-black text-amber-300">{selectedHotspot.frp} MW</div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase">Brightness</div>
              <div className="text-base font-black text-white">{selectedHotspot.brightness} K</div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase">Sensor</div>
              <div className="text-sm font-bold text-cyan-300">{selectedHotspot.sensor}</div>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <div className="text-[10px] text-slate-400 uppercase">Day / Night</div>
              <div className="text-sm font-bold text-slate-200">
                {selectedHotspot.daynight === "D" ? "Day Pass" : "Night Pass"}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Coordinates:</span>
              <span className="font-semibold">{selectedHotspot.lat}°N, {selectedHotspot.lon}°E</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Distance from {location.name}:</span>
              <span className="font-semibold text-cyan-400">{selectedHotspot.distance_km} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence:</span>
              <span className="font-semibold">{selectedHotspot.confidence || "Standard"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Acquisition Date:</span>
              <span className="font-semibold text-emerald-400">
                {selectedHotspot.acq_date || "Cyclical Phenology (Undated)"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
