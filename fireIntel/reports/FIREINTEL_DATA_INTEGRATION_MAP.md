# FIREINTEL — Actual Data Integration Inventory & Asset Map

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Challenge:** NASA Space Apps Challenge 2026  
**Document:** Phase 5B.4 Actual Data Integration Inventory & Readiness Map  
**Date:** 2026-11-13  
**Status:** **PHYSICAL FILESYSTEM VERIFIED (ZERO ASSUMED ASSETS)**

---

## 1. Executive Summary

This inventory maps every physical dataset on disk within the `fireIntel/` workspace. Every file size, row count, dimension, coordinate reference system (CRS), and spatial provenance tag was directly measured from the filesystem.

Data assets are categorized into four operational tiers:
- **Tier A:** Available, verified, and immediately ready for frontend integration.
- **Tier B:** Available and verified, but requires web-ready format transformation (e.g., GeoTIFF to Terrain-RGB tiles, GeoJSON to PMTiles).
- **Tier C:** Blocked by upstream CDS authentication (ERA5-Land reanalysis).
- **Tier D:** Optional future datasets (AppEEARS vegetation indices, Sentinel-2 dNBR).

---

## 2. Complete Physical Asset Inventory

### Tier A: Available & Verified (Ready for Frontend Integration)

| Dataset Description | Exact Relative File Path | File Size | Record Count / Dimensions | CRS | Spatial Resolution / Provenance | Frontend Readiness Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Boundary-Validated MODIS Detections** | `fireIntel/data/processed/boundary_validated/uttarakhand_modis_boundary.csv` | 103,485 B (101 KB) | 918 rows, 17 cols | `EPSG:4326` | 1 km nominal (Terra/Aqua MODIS C6.1) | **READY IMMEDIATELY** (Direct ingestion / GeoJSON) |
| **Boundary-Validated VIIRS Detections** | `fireIntel/data/processed/boundary_validated/uttarakhand_viirs_boundary.csv` | 744,055 B (727 KB) | 6,623 rows, 17 cols | `EPSG:4326` | 375 m (Suomi-NPP VIIRS C2) | **READY IMMEDIATELY** (Direct ingestion / GeoJSON) |
| **Combined Fire Observations** | `fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv` | 847,392 B (828 KB) | 7,541 rows, 17 cols | `EPSG:4326` | Multi-sensor unified (MODIS + VIIRS) | **READY IMMEDIATELY** (Primary tactical layer) |
| **Uttarakhand Boundary GeoJSON** | `fireIntel/data/boundaries/uttarakhand_boundary.geojson` | 823,293 B (804 KB) | 1 MultiPolygon feature | `EPSG:4326` | Official administrative perimeter (Survey of India / geoBoundaries) | **READY IMMEDIATELY** (State border overlay) |
| **Master Analysis Grid (Parquet)** | `fireIntel/data/environmental/metadata/master_grid_005deg.parquet` | 92,795 B (91 KB) | 2,174 rows, 12 cols | `EPSG:4326` | 0.05° (~5.57 km x 4.82 km cells) | **READY IMMEDIATELY** (FastAPI / DuckDB backend) |
| **DEM Terrain Features (Parquet)** | `fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet` | 182,262 B (178 KB) | 2,174 rows, 25 cols | `EPSG:4326` | 30m Zonal Aggregation (`copernicus_dem_glo30_zonal_005`) | **READY IMMEDIATELY** (Terrain HUD panels) |
| **DEM Terrain Features (CSV)** | `fireIntel/data/environmental/processed/dem_terrain_features_005deg.csv` | 492,016 B (480 KB) | 2,174 rows, 25 cols | `EPSG:4326` | 30m Zonal Aggregation (`copernicus_dem_glo30_zonal_005`) | **READY IMMEDIATELY** (Tabular inspection fallback) |
| **ERA5 Parent Mapping Lookup** | `fireIntel/data/environmental/metadata/era5_to_master_grid_map.csv` | 143,572 B (140 KB) | 2,174 rows, 6 cols | `EPSG:4326` | Hierarchical mapping (2,174 cells $\to$ 581 parent nodes) | **READY IMMEDIATELY** (Spatial join lookup) |

---

### Tier B: Available & Verified (Requiring Web-Format Transformation)

| Dataset Description | Exact Relative File Path | File Size | Dimensions | CRS | Native Provenance | Required Web Transformation |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Copernicus DEM Virtual Mosaic (VRT)** | `fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt` | 7,012 B | $18,000 \times 14,400$ pixels | `EPSG:4326` | Seamless mosaic referencing 14 AWS Open Data COG tiles | Convert to Mapbox **Terrain-RGB PNG tiles** or a single `.pmtiles` archive (zoom 6–12) for 3D terrain mesh extrusion in browser. |
| **Copernicus DEM Raw COG Tiles (14 tiles)** | `fireIntel/data/environmental/raw/copernicus_dem/*.tif` | 580,592,797 B (580.6 MB) | 14 tiles of $3,600 \times 3,600$ pixels | `EPSG:4326` | 30m Copernicus GLO-30 Digital Elevation Model | Source data for Terrain-RGB tile generator. Retain as immutable raw storage. |
| **Master Grid GeoJSON** | `fireIntel/data/environmental/metadata/master_grid_005deg.geojson` | 1,140,892 B (1.14 MB) | 2,174 Polygon features | `EPSG:4326` | 0.05° South-West corner binning grid | Compress into **Mapbox Vector Tiles (MVT / PMTiles)** (~180 KB) to eliminate mobile browser rendering lag. |

---

### Tier C: Blocked by Upstream CDS Registration

| Planned Dataset | Target Relative Path | Scope & Resolution | Expected Format | Status & Blocker |
| :--- | :--- | :--- | :---: | :--- |
| **ERA5-Land 48-Hour Pilot NetCDF** | `fireIntel/data/environmental/raw/era5_land/era5_land_2025_01_48h_pilot.nc` | 2025-01-01 to 2025-01-02 (48 UTC hours, 9 variables) | `NetCDF4` ($\approx 4.2\text{ MB}$) | **BLOCKED:** CDS API returned HTTP 401 Unauthorized (key length 27 vs required 36-char UUID PAT). |
| **ERA5-Land Full-Year 2025** | `fireIntel/data/environmental/raw/era5_land/era5_land_2025_{month:02d}.nc` | 12 monthly chunked files, 9 variables hourly | `NetCDF4` ($\approx 65\text{ MB}$) | **BLOCKED:** Sequentially dependent on successful 48-hour pilot verification. |
| **De-accumulated Hourly Precipitation** | `fireIntel/data/environmental/intermediate/era5_land_precipitation_hourly.parquet` | 48 hourly steps $\to$ 8,760 annual steps | Parquet | **BLOCKED:** Formula held in staging pending empirical inspection of live NetCDF headers. |

---

### Tier D: Optional Future Datasets (Deferred)

| Planned Dataset | Target Source | Purpose in Future Phases | Deferred Rationale |
| :--- | :--- | :--- | :--- |
| **MODIS/VIIRS 16-Day NDVI/EVI** | NASA AppEEARS REST API | Live fuel moisture and vegetation curing indices | High value for predictive modeling, but non-essential for initial 3D interactive launch. |
| **Sentinel-2 Burned Area (dNBR)** | Copernicus Sentinel Hub / ESA SciHub | Post-fire severity validation | Requires 10m optical tile processing; separate from active fire thermal detection. |
| **GPM IMERG Daily Precipitation** | NASA GES DISC | Secondary rainfall cross-check | Validation dataset; secondary to primary ERA5-Land reanalysis. |

---

## 3. Metadata & Integrity Manifest Map

All manifests are stored in `fireIntel/data/environmental/manifests/` and metadata in `fireIntel/data/environmental/metadata/`:

| Manifest / Metadata File | File Size | Content Summary | SHA-256 Validated? |
| :--- | :---: | :--- | :---: |
| [copernicus_dem_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/copernicus_dem_manifest.json) | 11,892 B | SHA-256 hashes, file sizes, and elevation profiles for all 14 Copernicus DEM tiles | Yes |
| [dem_terrain_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/dem_terrain_manifest.json) | 1,111 B | SHA-256 hashes and summary statistics for Parquet and CSV terrain features | Yes |
| [project_integrity_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/project_integrity_manifest.json) | 1,994 B | End-to-end audit manifest generated by `verify_project_integrity.py` | Yes |
| [master_grid_metadata.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_metadata.json) | 490 B | Bounding box coordinates, total cells (2,174), interior centroids (2,000) | Yes |
| [era5_land_finalized_variables.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/era5_land_finalized_variables.json) | 5,898 B | Canonical 9 variables specification, CF standard names, transformation formulas | Yes |
| [uttarakhand_boundary_metadata.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/boundaries/uttarakhand_boundary_metadata.json) | 682 B | Source attribution, licence (CC BY 4.0), UTM Zone 44N planar area (`53,417.95 km²`) | Yes |

