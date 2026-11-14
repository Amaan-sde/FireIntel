# FIREINTEL — Website Readiness Decision & Implementation Authorization

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Challenge:** NASA Space Apps Challenge 2026  
**Document:** Phase 5B.4 Website Readiness Decision & Milestone Roadmap  
**Date:** 2026-11-13  
**Status:** **CONDITIONALLY APPROVED FOR FRONTEND IMPLEMENTATION (MILESTONE 1)**

---

## 1. Overall Readiness Verdict

### **DECISION: CONDITIONALLY READY FOR PHASE 6 FRONTEND IMPLEMENTATION**

The FIREINTEL project has successfully established a scientifically rigorous, mathematically verified, and reproducible geospatial pipeline. All observational satellite fire datasets, administrative boundary geometries, high-resolution digital elevation models, and master indexing grids are physically present on disk, completely validated, and covered by a 100% passing test suite (**37/37 automated tests passing**).

The frontend implementation is **authorized to begin immediately** under a phased architecture:
- **Authorized Scope:** Milestone 1 (Foundation, Satellite Fire Intelligence, 3D Himalayan Terrain Explorer, and Scientific Methodology).
- **Conditional Restriction:** No fabricated or simulated meteorological data may be introduced. Environmental microclimate views (Page 5) must render in a transparent **"Data Acquisition Standby"** state with full provenance disclosure until legitimate Copernicus Climate Data Store (CDS) API access is authenticated.

```
+--------------------------------------------------------------------------------------------------+
|                                    WEBSITE READINESS VERDICT                                     |
+--------------------------------------------------------------------------------------------------+
|  [ READY ]  NASA FIRMS Preprocessing (7,541 boundary-validated detections)                       |
|  [ READY ]  Copernicus DEM GLO-30 (14 tiles, 30m VRT mosaic, 2,174 terrain cells, 25 metrics)     |
|  [ READY ]  Uttarakhand Master Analysis Grid (2,174 cells, 0.05 deg, 581 ERA5 parent nodes)       |
|  [ READY ]  Exploratory Data Analysis & Spatial Cross-Sensor Matching Diagnostics               |
|  [ READY ]  Unified MapLibre GL v4 3D Terrain & Extrusion Canvas Architecture                     |
|  [ READY ]  FastAPI + DuckDB Spatial In-Memory Parquet Engine Architecture                       |
|  [STANDBY]  ERA5-Land Hourly Atmospheric Reanalysis (Awaiting CDS Account Activation)            |
|                                                                                                  |
|  VERDICT: GO FOR MILESTONE 1 (PAGES 1, 2, 3, 4, 6 FULLY ACTIVE; PAGE 5 IN STANDBY/INFO MODE)     |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Page-by-Page Implementation Authorization

| Page Number | Page Name | Status | Verified Data Source | Scope & Capabilities |
| :-: | :--- | :---: | :--- | :--- |
| **Page 1** | **Mission Control / Operational Overview** | **READY TO BUILD** | `uttarakhand_fires_boundary.csv`, `uttarakhand_boundary.geojson`, `master_grid_005deg.parquet` | Real-time style operational summary, active detection counts (7,541), peak FRP (1,421 MW), dual-sensor status pills, interactive overview map, and pre-monsoon alert timeline. |
| **Page 2** | **Satellite Fire Intelligence** | **READY TO BUILD** | `uttarakhand_fires_boundary.csv`, `uttarakhand_modis_boundary.csv`, `uttarakhand_viirs_boundary.csv` | Full dual-sensor comparative view. Independent MODIS percentage slider ($0\text{--}100\%$) and VIIRS categorical checkboxes (`low`, `nominal`, `high`). 2025 temporal scrubber, day/night toggles, and FRP spectrum styling. |
| **Page 3** | **3D Himalayan Terrain & Geomorphology** | **READY TO BUILD** | `copernicus_dem_uttarakhand.vrt`, `dem_terrain_features_005deg.parquet` (2,174 rows) | MapLibre GL v4 3D terrain canvas with real Copernicus elevation extrusion and hillshading. Interactive switching across 25 geomorphometric layers (elevation, slope, aspect northness/eastness, Riley TRI, roughness). Cell inspector. |
| **Page 4** | **Historical Spatiotemporal Analytics** | **READY TO BUILD** | `eda_summary_boundary.json`, `eda/plots/*`, boundary-validated fire CSVs | Comprehensive charting (Recharts/Chart.js): 2025 pre-monsoon peak (93.4% of fires in April--May), diurnal overpass curves, cross-sensor candidate pairing diagnostics, district fire distributions, and elevation histograms. |
| **Page 5** | **Environmental & Microclimate Intelligence** | **STANDBY / PROVENANCE MODE** | `master_grid_metadata.json`, ERA5 node mappings | **Standby Mode Only.** Displays grid topology (581 parent nodes), mathematical transformation formulas (Tetens saturation vapor pressure, VPD, wind vectors), and a "CDS Connection / Trigger Pipeline" interface. **Zero fake weather data.** |
| **Page 6** | **Scientific Methodology & Open Data** | **READY TO BUILD** | All manifests (`copernicus_dem_manifest.json`, `dem_terrain_manifest.json`, `project_integrity_manifest.json`), Phase reports | Transparent open-science audit room: data lineage diagrams, sensor specifications, geodetic equations, boundary repair proofs, test suite telemetry (37/37 passing), and code repository links. |

---

## 3. Features Blocked Awaiting CDS Access

The following features are strictly deferred until authenticated ERA5-Land NetCDF downloads are completed:

1. **Live Hourly Weather Overlays:** 2m air temperature, 2m dewpoint, relative humidity, and vapor pressure deficit (VPD) heatmaps across the 2,174-cell grid.
2. **Surface Wind Vector Fields:** 10m meteorological wind speed and arrow particle animations ($u_{10}, v_{10}$).
3. **Four-Layer Soil Moisture Profiles:** Multi-depth vertical soil water content charts ($0\text{--}7\text{ cm}$, $7\text{--}28\text{ cm}$, $28\text{--}100\text{ cm}$, $100\text{--}289\text{ cm}$).
4. **Precipitation Accumulation Risk Indices:** De-accumulated rainfall, Antecedent Precipitation Index (API), and consecutive dry-day indices (firmly blocked until live NetCDF metadata confirms IFS forecast step conventions).
5. **Physical Lapse-Rate Temperature Corrections:** Microclimatic lapse-rate downscaling (firmly blocked until native ERA5 surface geopotential height $Z_{\text{ERA5}}$ is available).

> [!IMPORTANT]
> **Strict NASA Space Apps Quality Commitment:** Under no circumstances will synthetic or randomly generated weather values be served to users. Delivering a transparent, scientifically honest "Data Awaiting Upstream Pipeline" interface is infinitely superior to fabricating unverified climate data.

---

## 4. Key Scientific Caveats Enforced in Frontend UI

Every frontend component must comply with the scientific mandates codified in [FIREINTEL_FINAL_SCIENTIFIC_REVIEW.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/FIREINTEL_FINAL_SCIENTIFIC_REVIEW.md):

1. **"Thermal Detections" vs "Wildfires":**
   - The UI must never display "7,541 Wildfires" or "7,541 Fires Extinguished".
   - Approved labels: `"Satellite Thermal Detections"`, `"Active Hotspot Observations"`, `"Instantaneous Radiative Signatures"`.
   - Tooltips must explicitly state: *"Satellite observations reflect instantaneous thermal anomaly detections at overpass time, not individual wildfire perimeters or burned acreage."*
2. **Sensor Detection Ratio ($7.21\times$):**
   - The UI must not attribute the $7.21\times$ detection difference between VIIRS and MODIS solely to pixel footprint area ($7.11\times$).
   - The UI explanation must mention: 375m spatial resolution, scan-edge bowtie suppression, radiometric sensitivity to understory flaming fronts ($5\text{--}10\text{ m}^2$), and dual-satellite afternoon overpass timing.
3. **Sensor Confidence Decoupling:**
   - Never merge MODIS and VIIRS confidence into a single generic filter.
   - Provide an integer percentage slider ($0\text{--}100\%$) for MODIS.
   - Provide categorical checkboxes (`Low`, `Nominal`, `High`) for VIIRS.
4. **Resolution Provenance Disclosures:**
   - Every grid cell tooltip must state:
     - Terrain metrics: `"Resolution: 30m Zonal Mean (Copernicus DEM GLO-30)"`
     - Weather features (when active): `"Resolution: 0.10° Synoptic Reanalysis (ERA5-Land)"`
   - Explicitly note that the 0.05° master grid is a database indexing lattice and does not synthesize 5 km weather observations.
5. **Cross-Sensor Matching Terminology:**
   - Paired spatio-temporal observations ($\Delta d \le 1.0\text{ km}$, $\Delta t \le 60\text{ min}$) must be labeled `"Candidate Coincident Overpasses"`, never `"Confirmed Same Fire"`.

---

## 5. Technology Stack Decisions (Recap)

1. **Frontend Framework:** Next.js 15 (App Router, React 19, TypeScript).
2. **Styling & Components:** Tailwind CSS v4, Lucide Icons, Radix UI primitives.
3. **Mapping & 3D Visualization:** **MapLibre GL JS v4** (Single-canvas globe and 3D terrain extrusion; eliminated Three.js redundancy to prevent WebGL context loss).
4. **Charts & Analytics:** Recharts / Chart.js for responsive scientific plotting.
5. **Backend Data Layer:** FastAPI + **DuckDB Spatial** for sub-3ms direct querying of native Parquet datasets (`master_grid_005deg.parquet`, `dem_terrain_features_005deg.parquet`, `uttarakhand_fires_boundary.parquet`).
6. **Tile Streaming:** Pre-generated PMTiles for raster DEM elevation and master grid vector boundaries.

---

## 6. Implementation Milestones

```
+--------------------------------------------------------------------------------------------------+
|                                    FIREINTEL ROADMAP PHASING                                     |
+--------------------------------------------------------------------------------------------------+
|  MILESTONE 1 (IMMEDIATE): Core Architecture, Mission Control, Satellite & Terrain Explorers       |
|  - Setup Next.js 15, Tailwind v4, MapLibre GL v4, FastAPI + DuckDB Spatial engine                |
|  - Convert datasets to optimized Parquet and PMTiles                                             |
|  - Implement Page 1 (Mission Control), Page 2 (Satellite Fire Map), Page 3 (3D Terrain),         |
|    and Page 6 (Methodology & Provenance)                                                         |
|                                                                                                  |
|  MILESTONE 2: Historical Spatiotemporal Analytics                                                |
|  - Implement Page 4 (Interactive time series, seasonal distributions, district aggregations)     |
|                                                                                                  |
|  MILESTONE 3: Environmental Intelligence & CDS Onboarding                                         |
|  - Implement Page 5 in Standby/Educational Mode                                                  |
|  - Connect live CDS API upon receipt of legitimate credentials and run 48-hour pilot             |
|                                                                                                  |
|  MILESTONE 4: Final Polish, Performance Benchmarking & NASA Submission Package                   |
|  - Lighthouse score optimization (>90), mobile responsiveness, final scientific sign-off         |
+--------------------------------------------------------------------------------------------------+
```

---

## 7. Immediate Next Step for Execution

Upon user approval to begin frontend coding, the immediate execution tasks are:
1. Initialize the Next.js 15 TypeScript project structure in `fireIntel/web/`.
2. Set up the lightweight FastAPI + DuckDB backend in `fireIntel/api/` to query existing Parquet files.
3. Convert `copernicus_dem_uttarakhand.vrt` into MapLibre-compatible Terrain-RGB tiles / PMTiles.
4. Build the core navigation shell, Page 1 (Mission Control), and Page 2 (Satellite Fire Intelligence).

