"use client";

import React, { useState, useEffect, useCallback } from "react";
import NavigationHeader from "@/components/NavigationHeader";
import LocationSearchHeader, { SelectedLocation } from "@/components/location/LocationSearchHeader";
import LocationTelemetryDeck from "@/components/location/LocationTelemetryDeck";
import LocationMap from "@/components/location/LocationMap";
import LocationTemporalCharts from "@/components/location/LocationTemporalCharts";
import LocationTerrainCard from "@/components/location/LocationTerrainCard";
import LocationExportModal from "@/components/location/LocationExportModal";

const INITIAL_LOCATION: SelectedLocation = {
  name: "Nainital",
  district: "Nainital",
  lat: 29.3800,
  lon: 79.4600,
  elevation_m: 2084,
  region: "Kumaon",
};

export default function LocationIntelligencePage() {
  const [currentLocation, setCurrentLocation] = useState<SelectedLocation>(INITIAL_LOCATION);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Core Analysis Fetch
  const executeAnalysis = useCallback(async (loc: SelectedLocation, rad: number) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/location/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: loc.lat,
          longitude: loc.lon,
          radius_km: rad,
          location_name: loc.name,
          max_geojson_points: 1500,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Analysis query failed");
      }

      const data = await res.json();
      setAnalysisData(data);
    } catch (err: any) {
      console.error("Location analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial mount: Analyze default location
  useEffect(() => {
    executeAnalysis(currentLocation, radiusKm);
  }, []);

  // Location switch
  const handleSelectLocation = (loc: SelectedLocation) => {
    setCurrentLocation(loc);
    executeAnalysis(loc, radiusKm);
  };

  // Radius switch
  const handleSelectRadius = (r: number) => {
    setRadiusKm(r);
    executeAnalysis(currentLocation, r);
  };

  // Manual refresh
  const handleRefresh = () => {
    executeAnalysis(currentLocation, radiusKm);
  };

  return (
    <div className="min-h-screen bg-[#020409] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Global Navigation Header */}
      <NavigationHeader activeTab="location" />

      {/* 2. Main Location Intelligence Canvas */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 space-y-6">
        {/* Location Search & Buffer Command Header */}
        <LocationSearchHeader
          currentLocation={currentLocation}
          radiusKm={radiusKm}
          onSelectLocation={handleSelectLocation}
          onSelectRadius={handleSelectRadius}
          onRefresh={handleRefresh}
          onOpenExport={() => setIsExportOpen(true)}
          isLoading={isLoading}
          totalObservations={analysisData?.summary?.total_observations}
        />

        {/* Real-time KPI Summary Deck */}
        {analysisData?.summary && (
          <LocationTelemetryDeck
            summary={analysisData.summary}
            locationName={currentLocation.name}
            radiusKm={radiusKm}
            areaSqKm={analysisData.location.area_sq_km}
            northernBoundaryNote={analysisData.scientific_disclosures?.northern_boundary_note}
          />
        )}

        {/* Interactive MapLibre GL Spatial Buffer Map */}
        <LocationMap
          location={currentLocation}
          radiusKm={radiusKm}
          pointsGeojson={analysisData?.map_overlays?.points_geojson}
          circleGeojson={analysisData?.map_overlays?.circle_geojson}
          sampledCount={analysisData?.map_overlays?.sampled_points_count || 0}
          totalCount={analysisData?.map_overlays?.total_points_count || 0}
          isSampled={Boolean(analysisData?.map_overlays?.is_sampled)}
        />

        {/* Temporal Analysis: Monthly Phenology + Verified Timeline */}
        {analysisData?.monthly_phenology && (
          <LocationTemporalCharts
            monthlyData={analysisData.monthly_phenology}
            timelineData={analysisData.verified_timeline || []}
            locationName={currentLocation.name}
          />
        )}

        {/* Topographic & DEM Terrain Intelligence */}
        {analysisData?.terrain && (
          <LocationTerrainCard
            terrain={analysisData.terrain}
            locationName={currentLocation.name}
            radiusKm={radiusKm}
          />
        )}
      </main>

      {/* Export & Dossier Modal */}
      <LocationExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        location={currentLocation}
        radiusKm={radiusKm}
        summary={analysisData?.summary}
        terrain={analysisData?.terrain}
        monthlyPhenology={analysisData?.monthly_phenology || []}
      />
    </div>
  );
}
