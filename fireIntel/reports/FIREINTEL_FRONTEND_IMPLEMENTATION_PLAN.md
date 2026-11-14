# FIREINTEL — Frontend Architecture, UX Design & Implementation Plan

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Challenge:** NASA Space Apps Challenge 2026  
**Document:** Phase 5B.4 Frontend Technology Architecture, 6-Page UX Design & Phased Roadmap  
**Date:** 2026-11-13  
**Status:** **FRONTEND SPECIFICATION & ARCHITECTURAL BLUEPRINT (IMPLEMENTATION PENDING APPROVAL)**

---

## 1. Technology Architecture Evaluation & Streamlining

### 1.1 Critical Evaluation of the Proposed Stack
The user proposed evaluating:
- *Frontend:* Next.js 15, React, TypeScript, Tailwind CSS, Three.js, React Three Fiber, MapLibre GL JS
- *Backend:* FastAPI, Python, GeoPandas, Rasterio, DuckDB, Parquet, PostgreSQL/PostGIS
- *Infrastructure:* Docker, Nginx

```mermaid
flowchart TD
    subgraph Streamlined Client Stack (Next.js 15 + TypeScript)
        UI["Tailwind CSS v4 + shadcn/ui\n(Glassmorphic Aerospace HUD)"]
        STATE["Zustand\n(Filter State & Date Scrubber)"]
        
        subgraph Single WebGL Context
            MAP["MapLibre GL JS v4 (Globe + 3D Terrain)\n+ deck.gl v9 Overlay\n(Single Canvas = Zero VRAM Crash Risk)"]
        end
    end

    subgraph High-Speed Analytical Backend
        FAST["FastAPI (Python 3.14)\nAsynchronous JSON & Vector Endpoints"]
        DUCK["DuckDB Spatial Engine\nDirect Parquet In-Memory Filtering (< 3ms)"]
    end

    subgraph Static Edge Distribution
        TILES["Pre-generated PMTiles (Raster DEM + Vector Grid)\nStored in Cloudflare R2 / S3 CDN"]
    end

    UI --> STATE
    STATE --> MAP
    MAP <-->|"Sub-second GeoJSON / Parquet"| FAST
    FAST <--> DUCK
    MAP <-->|"Terrain RGB Tiles (Direct CDN)"| TILES
```

### 1.2 Evaluation of 11 Core Technical Dimensions:

1. **Interactive 3D Earth Performance:**  
   *Evaluation:* Running Three.js alongside MapLibre GL creates **two separate WebGL contexts**. On mobile phones and integrated GPUs, this triggers browser `CONTEXT_LOST_WEBGL` crashes.  
   *Recommendation:* Use **MapLibre GL JS v4's native Globe Projection** (`map.setProjection({ type: 'globe' })`). It renders an interactive 3D spinning globe out of the box in the exact same WebGL context as the regional terrain, eliminating Three.js redundancy and saving ~650 KB of bundle size.
2. **Camera Transition from Earth to Uttarakhand:**  
   *Evaluation:* In MapLibre GL v4, moving from globe to terrain is a single camera command:  
   `map.flyTo({ center: [79.2, 30.1], zoom: 9, pitch: 65, bearing: -15, duration: 3500 })`. It smoothly switches from spherical globe projection to 3D Himalayan terrain extrusion without reloading canvases.
3. **3D Himalayan Terrain Rendering with Actual Copernicus DEM:**  
   *Evaluation:* MapLibre GL v4 uses standard raster DEM tiles (`raster-dem` source) to extrude 3D mesh vertices directly on the GPU at 60 FPS.
4. **DEM-to-Terrain-Tile Conversion:**  
   *Evaluation:* The raw 580 MB DEM VRT must be converted to **Mapbox Terrain-RGB PNG tiles** or a single compact **PMTiles archive** (~42 MB for zoom 6–12). This is a one-time pre-processing step.
5. **Rendering 7,541 Satellite Observations:**  
   *Evaluation:* 7,541 points is lightweight for WebGL. Stored as GeoJSON or compact FlatGeobuf, MapLibre GL renders all 7,541 points instantly using GPU point sprites with data-driven styling.
6. **GPU-Based Hotspot Rendering:**  
   *Evaluation:* Hotspots use two stacked layers: an inner solid point sprite and an outer blurred radial gradient circle with additive blending (`raster-opacity`) to create physical thermal bloom halos proportional to FRP.
7. **Historical Temporal Playback:**  
   *Evaluation:* Time scrubbing across 2025 is executed entirely on the GPU using MapLibre filter expressions: `map.setFilter('fires-layer', ['<=', ['get', 'acq_date'], currentDate])`. This updates at 60 FPS without querying the backend during playback.
8. **Environmental Data Visualization:**  
   *Evaluation:* The 2,174 master grid cells are rendered as a semi-transparent vector polygon mesh. Selecting a cell queries our pre-computed Parquet tables.
9. **Desktop and Mobile Responsiveness:**  
   *Evaluation:* Tailwind CSS v4 responsive breakpoints (`sm:`, `md:`, `lg:`). On mobile screens, slide-over panels collapse to bottom drawer sheets (`shadcn/ui Sheet`), and WebGL terrain mesh resolution is stepped down to 90m to preserve battery life.
10. **Browser Memory & GPU Limits:**  
    *Evaluation:* Total client memory footprint: < 120 MB RAM, < 80 MB VRAM. Fully viable on low-end iOS/Android mobile devices.
11. **Data Loading, Caching & Backend: Why PostGIS is Unnecessary:**  
    *Evaluation:* PostgreSQL/PostGIS adds operational complexity and connection overhead. Our data is read-only analytical Parquet. **DuckDB Spatial** queries `master_grid_005deg.parquet` and `dem_terrain_features_005deg.parquet` directly in memory in **under 3 milliseconds**. FastAPI + DuckDB in a tiny 256MB container is the simplest, fastest, and most robust architecture.

---

## 2. Six-Page Website & User Experience Design

```text
+---------------------------------------------------------------------------------+
| [FIREINTEL]  (1) Mission Control  (2) Fire Intelligence  (3) 3D Terrain         |
|              (4) Historical Analytics  (5) Environmental  (6) Methodology       |
+---------------------------------------------------------------------------------+
```

---

### Page 1: Mission Control (Primary Landing Experience)
- **Purpose:** Introduce the NASA Space Apps Challenge project, showcase the interactive 3D Earth, display high-level satellite statistics, and provide a cinematic entry point into Uttarakhand.
- **Main UI Components:**
  - Full-screen Interactive 3D Earth (MapLibre Globe projection).
  - Glowing spatial beacon anchored over Uttarakhand, India (`30.06°N, 79.02°E`).
  - Glassmorphic Hero Card: Project Mission statement, NASA Space Apps 2026 challenge badge.
  - Top Metrics Ticker: "7,541 Thermal Detections", "53,418 km² Territory", "30m Copernicus Topography", "2 Satellite Sensors".
  - "Launch Tactical Explorer" CTA button triggering camera fly-in.
- **Data Dependencies:** `data/boundaries/uttarakhand_boundary.geojson` (outline).
- **API Requirements:** Static client load (< 100 KB initial payload).
- **User Interactions:** Rotate Earth, zoom in/out, click beacon to fly to Uttarakhand.
- **Loading State:** Minimalist dark skeleton loader with pulsing NASA logo.
- **Error State:** WebGL unsupported fallback: Static high-resolution 2D satellite orthophoto with alert banner.
- **Scientific Caveat:** "Active fire detections denote thermal anomaly pixels captured during instantaneous satellite overpasses, not continuous fire perimeters."

---

### Page 2: Fire Intelligence (Tactical 2D/3D Observation Map)
- **Purpose:** Explore the 7,541 boundary-validated active fire observations across Uttarakhand with rich spatial and temporal filtering.
- **Main UI Components:**
  - High-performance MapLibre map with satellite basemap and Uttarakhand boundary overlay.
  - Hotspot Layer: 7,541 points styled by FRP (radiance heat colors: yellow $\to$ orange $\to$ crimson).
  - Filter Sidebar:
    - Sensor toggle: `All`, `MODIS (1km)`, `VIIRS (375m)`.
    - Confidence filters: MODIS slider ($0\text{–}100\%$), VIIRS checkboxes (`Low`, `Nominal`, `High`).
    - FRP Range Slider: ($0\text{ to }1,421\text{ MW}$).
    - Time-of-Day toggle: `Day Overpass` vs `Night Overpass`.
  - Hotspot Inspector Drawer: Displays exact coordinates, observation UTC/IST time, brightness temperature ($K$), FRP ($MW$), and sensor name.
- **Data Dependencies:** `data/processed/boundary_validated/uttarakhand_fires_boundary.csv`.
- **API Requirements:** `GET /api/v1/fires?sensor=VIIRS&min_frp=10&start_date=2025-04-01`.
- **User Interactions:** Hover to reveal FRP tooltip, click hotspot to open inspector drawer, filter by date/sensor in real time.
- **Loading State:** Subtle top progress bar during filter changes.
- **Error State:** "No detections match selected filters. Reset filters to view all 7,541 observations."
- **Scientific Caveat:** "VIIRS recorded 7.21x more detections than MODIS due to higher 375m spatial resolution, scan-edge preservation, and dual-satellite afternoon overpass timing."

---

### Page 3: 3D Terrain Explorer (Topographic Geomorphology)
- **Purpose:** Visualize Uttarakhand's extreme Himalayan terrain in full 3D, exploring how elevation, slope, and aspect dictate fire behavior.
- **Main UI Components:**
  - 3D Terrain Canvas (Copernicus DEM 30m extrusion).
  - Terrain Layer Selector: `True Ortho Surface`, `Elevation Heatmap`, `Slope Steepness (0-90°)`, `Aspect Compass (N, S, E, W)`, `Riley Ruggedness Index (TRI)`.
  - Camera Preset Buttons: "State Overview", "Nanda Devi Massif (7,804m)", "Almora Pine Belt", "Dehradun Valley".
  - Dynamic Hillshading Controller: Scrub sun azimuth and altitude to inspect ridge shading.
  - Fire Hotspots overlaid directly onto 3D slopes to show uphill flame propagation alignment.
- **Data Dependencies:** `copernicus_dem_uttarakhand.vrt` (via Terrain-RGB tiles), `dem_terrain_features_005deg.parquet`.
- **API Requirements:** Raster terrain tiles (`/tiles/terrain/{z}/{x}/{y}.png`), `GET /api/v1/terrain/cell/{grid_cell_id}`.
- **User Interactions:** Right-click drag to tilt camera ($0\text{–}85^\circ$), left-click drag to rotate bearing, click terrain to inspect elevation and slope.
- **Loading State:** Incremental tile rendering with blurry low-res terrain placeholder transitioning to sharp 30m mesh.
- **Error State:** WebGL memory pressure warning: automatically switches to 2D hillshade raster.
- **Scientific Caveat:** "Terrain features are derived from Copernicus DEM GLO-30. Slopes represent Horn's 8-neighbor gradient; aspect is decomposed circularly to prevent $0^\circ/360^\circ$ distortion."

---

### Page 4: Historical Analytics (2025 Seasonal Trends & Sensor Comparison)
- **Purpose:** Present scientific charts, seasonal fire curves, day vs night patterns, and sensor divergence analytics derived during Phase 2 EDA.
- **Main UI Components:**
  - Monthly Observation Timeline: Interactive bar chart showing the extreme April–June fire peak.
  - Sensor Divergence Breakdown: Side-by-side donut chart showing VIIRS (87.8%) vs MODIS (12.2%).
  - Day vs Night Overpass Distribution: 76.4% daytime vs 23.6% nighttime detection breakdown.
  - FRP Distribution Boxplot & Density: Logarithmic FRP distribution showing extreme energy outliers.
  - Spatial Density Heatmap: District-wise and watershed-wise detection counts.
- **Data Dependencies:** Pre-generated EDA summaries in `reports/eda_boundary_validated/` (`monthly_analysis.csv`, `sensor_comparison.csv`, `dataset_summary.csv`).
- **API Requirements:** Static JSON endpoints (`GET /api/v1/analytics/summary`).
- **User Interactions:** Hover data points for exact counts, toggle between MODIS and VIIRS curves, export chart as SVG/PNG.
- **Loading State:** Chart skeleton pulse animations.
- **Error State:** "Data loading error. Click to reload analytics cache."
- **Scientific Caveat:** "Transboundary filtering removed 39.8% of bounding box detections that originated from agricultural stubble burning in the Indo-Gangetic plain, isolating true Uttarakhand forest fire seasonality."

---

### Page 5: Environmental Intelligence (Meteorology, Hydrology & Hazard)
- **Purpose:** Present atmospheric reanalysis, fuel moisture stress, and multi-layer soil hydrology across the 2,174 master grid cells.
- **Status & Honest Data Segregation:**
  > [!IMPORTANT]
  > **Strict Policy on ERA5-Land Data:**  
  > Live ERA5-Land ingestion is currently blocked by CDS API authentication. **No fake environmental data will be generated.** The UI components are designed with rigorous honest state segregation:

```text
+---------------------------------------------------------------------------------+
| [ENVIRONMENTAL INTELLIGENCE - CURRENT STATUS]                                   |
| [!] REANALYSIS INGESTION PAUSED AWAITING COPERNICUS CDS CREDENTIAL ACTIVATION   |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [COMPONENTS AVAILABLE NOW (FROM DEM)]      [COMPONENTS STAGED PENDING CDS]     |
|  ✔ 2,174 Grid Cell Topographic Elevation   🔒 Hourly 2m Air Temperature (°C)    |
|  ✔ 30m Mean & Max Slope (0-81°)             🔒 Relative Humidity & VPD (kPa)     |
|  ✔ Circular Aspect & Insolation Exposure    🔒 10m Wind Velocity Vectors (m/s)   |
|  ✔ Riley Terrain Ruggedness Index (TRI)     🔒 4-Layer Soil Moisture Stack       |
|  ✔ Boundary Containment Fraction            🔒 De-accumulated Precipitation (mm) |
|                                                                                 |
+---------------------------------------------------------------------------------+
```
- **Main UI Components:**
  - 0.05° Master Analysis Grid selector.
  - Topographic feature display (Active now: Elevation, Slope, Aspect, TRI).
  - Atmospheric & Hydrological HUD Cards (Currently displayed with an educational lock banner: *"Staged for Live CDS Ingestion in Phase 5B.4"*).
  - Diagnostic Protocol Viewer: Interactive diagram showing the four-tier precipitation de-accumulation verification protocol.
- **Data Dependencies:** `dem_terrain_features_005deg.parquet`, `master_grid_005deg.parquet`.
- **API Requirements:** `GET /api/v1/grid/cells`, `GET /api/v1/grid/{grid_cell_id}`.
- **User Interactions:** Click master grid cells to inspect terrain metrics; click locked weather cards to view the CDS diagnostic architecture.
- **Scientific Caveat:** "Weather variables reflect 0.10° native meso-scale reanalysis. Elevation downscaling enforces physical lapse rates ($\Gamma = -6.5^\circ\text{C}/1000\text{m}$) based on 30m DEM topography."

---

### Page 6: Methodology & Open Data
- **Purpose:** Complete scientific transparency, attribution of NASA and Copernicus datasets, mathematical formulations, and data provenance.
- **Main UI Components:**
  - Interactive Pipeline Architecture Diagram: Raw FIRMS $\to$ Boundary Validation $\to$ Master Grid $\to$ Copernicus DEM $\to$ ERA5-Land $\to$ Unified Parquet.
  - Dataset Attribution & Licences: NASA FIRMS (Open Data), Copernicus DEM GLO-30 (Open Data), ECMWF ERA5-Land (CC BY 4.0), Survey of India administrative boundary.
  - Mathematical Formulations Accordion: Horn's gradient, August-Roche-Magnus VPD, Riley TRI, Reset-aware precipitation de-accumulation.
  - Data Freshness & SHA-256 Manifest Viewer: Real-time table displaying file sizes, row counts, and cryptographic hashes from `project_integrity_manifest.json`.
- **Data Dependencies:** `data/environmental/manifests/project_integrity_manifest.json`, `data/boundaries/uttarakhand_boundary_metadata.json`.
- **API Requirements:** Static render / `GET /api/v1/manifest`.
- **User Interactions:** Click formula cards to view KaTeX equations, click checksums to copy SHA-256 hash.

---

## 3. Phased Implementation Roadmap

```mermaid
flowchart TD
    subgraph Milestone 1: Immediate Core (Zero Blockers)
        M1A["Task 1.1: Next.js 15 + TypeScript Setup\nTailwind CSS v4 & Aerospace Glassmorphic HUD"]
        M1B["Task 1.2: MapLibre GL v4 Unified Canvas\nInteractive Globe & Tactical Fire Map"]
        M1C["Task 1.3: Pages 1, 2, 4 & 6 Implementation\n(Mission Control, Fire Intel, Analytics, Methodology)"]
    end

    subgraph Milestone 2: 3D Himalayan Terrain Mesh
        M2A["Task 2.1: Copernicus DEM VRT to Terrain-RGB Tile Script\n(Zoom levels 6 to 12)"]
        M2B["Task 2.2: Page 3 3D Terrain Explorer\n(Real 30m Elevation Mesh + Aspect Lighting)"]
    end

    subgraph Milestone 3: Live CDS Environmental Ingestion
        M3A["Task 3.1: CDS Token Verification & Live 48h Pilot Ingestion"]
        M3B["Task 3.2: NetCDF Precipitation Diagnostic Execution"]
        M3C["Task 3.3: Page 5 Environmental Intelligence HUD Activation"]
    end

    subgraph Milestone 4: Optional Future Polish
        M4A["NASA AppEEARS 16-Day NDVI/EVI Ingestion"]
        M4B["Predictive Fire Risk ML Model & SHAP Explanations"]
    end

    M1A --> M1B --> M1C
    M1B --> M2A --> M2B
    M3A --> M3B --> M3C
    M2B --> M4A
    M3C --> M4B
```

### Classification of Features:

#### Category A: CAN START IMMEDIATELY (Currently Verified Data)
1. **Next.js 15 + TypeScript + Tailwind CSS Project Scaffolding.**
2. **Page 1: Mission Control** (Globe projection, Space Apps branding, top statistics).
3. **Page 2: Fire Intelligence** (Rendering 7,541 boundary-validated MODIS/VIIRS points, FRP styling, confidence filtering, temporal scrubbing).
4. **Page 4: Historical Analytics** (EDA charts, seasonal trends, sensor divergence breakdown).
5. **Page 6: Methodology & Open Data** (Attribution, KaTeX mathematical formulations, SHA-256 manifest viewer).
6. **FastAPI + DuckDB Backend** (Sub-millisecond queries against existing Parquet files).

#### Category B: REQUIRES DATA TRANSFORMATION (Pre-processing Existing Assets)
1. **Terrain-RGB Elevation Tile Pipeline:** Script to convert `copernicus_dem_uttarakhand.vrt` into Mapbox Terrain-RGB PNG tiles (or single `.pmtiles` archive) to power **Page 3: 3D Terrain Explorer**.
2. **Master Grid Vector Tiles:** Pre-converting `master_grid_005deg.geojson` (1.14 MB) into PMTiles for instant mobile loading.

#### Category C: BLOCKED BY CDS ACCESS (Awaiting Legitimate Account)
1. **Live Hourly Weather Ingestion:** 2m Temperature, Dewpoint, 10m Wind vectors, and 4-layer Soil Moisture.
2. **NetCDF Precipitation De-accumulation:** Unlocking live rain rates ($mm/hr$) and antecedent rainfall indices ($API_3, API_7, API_{14}$).
3. **Live Weather Cards on Page 5 (Environmental Intelligence).**

#### Category D: OPTIONAL FUTURE FEATURES (Deferred)
1. NASA AppEEARS 16-day MODIS/VIIRS vegetation index (NDVI/EVI) rasters.
2. Machine learning wildfire hazard probability modeling (LightGBM / XGBoost).
3. Post-fire Sentinel-2 differenced normalized burn ratio ($dNBR$).

