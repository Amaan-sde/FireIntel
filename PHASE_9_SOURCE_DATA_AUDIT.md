# FIREINTEL — PHASE 9 SOURCE DATA AUDIT
**Project**: NASA Space Apps Challenge 2026 // Wildland Fire Intelligence for Uttarakhand, India  
**Phase**: Phase 9 — Harmonised Data Migration & ML Foundation Integration  
**Date**: November 15, 2026  
**Auditor**: Antigravity Autonomous Agent  
**Branch**: `migration/phase9-harmonised-data`  

---

## 1. Executive Summary & Audit Scope

This document provides a strict, empirical audit of the existing data foundation across the FIREINTEL project, as well as the connectivity and access audit of the team's newly prepared Google Sheets harmonised dataset source.

In strict compliance with the **Phase 9 Core Scientific Directive**:
> *"If Google Sheets access is unavailable:*
> *- Do not fabricate its contents.*
> *- Do not continue using guessed column names.*
> *- Ask the developer to provide an accessible CSV/XLSX export or correct permissions.*
> *- Do not modify the existing production dataset until the source is accessible."*

We report that **Google Sheets access is currently restricted (HTTP 302 redirecting to Google Accounts Authentication)**. In accordance with project instructions, **zero dataset modifications or schema assumptions have been made**, and the existing production baseline remains untouched and fully backed up.

---

## 2. Existing Repository Data Architecture Audit

### 2.1 Complete Data File Inventory & Cryptographic Hashes

Every dataset currently within `fireIntel/data/` was audited for byte size, row count, schema, and SHA-256 cryptographic checksums:

| Dataset Path | Format | Rows | Size | SHA-256 Checksum | Scientific Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `data/raw/fire_archive_M-C61_843061.csv` | CSV | 1,540 | 121,042 B | `22fcc803bb5e95a6341cefa74e3a83fc8172291d56e165b355eaf2846af03485` | NASA FIRMS MODIS Collection 6.1 Raw Detections (2025) |
| `data/raw/fire_archive_SV-C2_843062.csv` | CSV | 10,986 | 881,700 B | `f48196b5a8c09971e20deacc574d9384e48e7a345120a478e0f15024fb114dc8` | NASA FIRMS VIIRS Suomi-NPP Collection 2 Raw Detections (2025) |
| `data/processed/uttarakhand_modis.csv` | CSV | 1,540 | 105,431 B | `cf4bc4d7e974f17ee37a54bfa353a15cfbdf285e683f234bf9917fa97bb0c98f` | Standardized MODIS with timestamp parsing |
| `data/processed/uttarakhand_viirs.csv` | CSV | 10,985 | 1,234,180 B | `1833c4f144c3717f005271f83f5d23cf545d2bdcbbccf1994bdc59770191e963` | Standardized VIIRS with timestamp parsing (1 duplicate removed) |
| `data/processed/uttarakhand_fires.csv` | CSV | 12,525 | 1,339,611 B | `6f36d69fdda645a9435b383d6adce4f3b46c0efc74363c7be90c52ffae8d0600` | Concatenated MODIS + VIIRS before spatial boundary clipping |
| `data/processed/boundary_validated/uttarakhand_modis_boundary.csv` | CSV | 918 | 103,485 B | `2370a1fe811fcfe42b279c0a8872df13a5da9b3b71d6227e1655440fa98f73ee` | Survey of India Polygon-Validated MODIS (53,483 km²) |
| `data/processed/boundary_validated/uttarakhand_viirs_boundary.csv` | CSV | 6,623 | 744,055 B | `1cbc7f2891829c9b73efd65ef5137e72caae62581d73ba6a3397717416a418f9` | Survey of India Polygon-Validated VIIRS (53,483 km²) |
| `data/processed/boundary_validated/uttarakhand_fires_boundary.csv` | CSV | 7,541 | 847,392 B | `d1be5f63f2dc6ff4dc9b92973b0f683f173b131b04c3f4bfe4dcd23d4ce64a08` | Survey of India Polygon-Validated Total Observations |
| `data/processed/boundary_validated/uttarakhand_fires_boundary.parquet` | Parquet | 7,541 | 243,897 B | `7d09b03922a79290b2d42174bead729edfcce4d4f7d84579f8f5f6d6aad2b5a4` | **Active Primary Table** queried by DuckDB & FastAPI |
| `data/processed/boundary_validated/mission_control_summary.json` | JSON | N/A | 21,994 B | `106e9566597f3a645c74e6c15451a86c29db5f67a85fafb73d1f7d3a11e11df3` | Mission control telemetry summary & sensor breakdown |
| `data/processed/boundary_validated/uttarakhand_fires_2025.geojson` | GeoJSON | 7,541 | 2,916,719 B | `a06d9688213c90279683be6667d4dc907874b139d6ce4d4f801395b387baea5d` | Pre-rendered vector features for MapLibre client map |
| `data/boundaries/uttarakhand_boundary.geojson` | GeoJSON | 1 | 823,293 B | `9e02337f7b24487742bbef062c8bf08ee0475dc3941a5e5879664a3d7548269e` | Official Survey of India administrative boundary polygon |
| `data/boundaries/uttarakhand_boundary_metadata.json` | JSON | N/A | 1,804 B | `365a66c9d1d37423886c5aa6482705e81e8e789a3a3a1af0398b83b70f6289c9` | Coordinate bounds, area ($53,483\text{ km}^2$), CRS EPSG:4326 |
| `data/environmental/metadata/master_grid_005deg.parquet` | Parquet | 2,174 | 92,795 B | `d9035bb650a6139276a22173c6be0e80c004b4d25b36cdc0c7c695f81a5afefa` | 0.05-degree master grid partition covering Uttarakhand |
| `data/environmental/processed/dem_terrain_features_005deg.parquet` | Parquet | 2,174 | 182,262 B | `5c1916ad8a78f6b87fd2013c3599a89f1fd77a48e96a30c7cf60d8caeb722f05` | Copernicus GLO-30 DEM derived elevation, slope, aspect, TRI |
| `data/environmental/metadata/era5_to_master_grid_map.csv` | CSV | 2,174 | 143,572 B | `108e364a7162b70c8f1b7fd4f60fea6806a147dafa4cb30422c3dd6bfec24bc5` | Spatial parent-child map: ERA5-Land (0.1°) to Master Grid (0.05°) |

---

## 3. Schema of Existing Production Parquet Baseline

The active primary dataset `fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.parquet` contains **7,541 rows** and **19 columns**:

```sql
CREATE TABLE fires (
    latitude DOUBLE,            -- Latitude in decimal degrees (WGS84, 28.70°N to 31.46°N)
    longitude DOUBLE,           -- Longitude in decimal degrees (WGS84, 77.57°E to 81.04°E)
    brightness DOUBLE,          -- Brightness temperature in Kelvin (Channel 21/22 or I-4)
    scan DOUBLE,                -- Pixel along-scan size (km)
    track DOUBLE,               -- Pixel along-track size (km)
    acq_date VARCHAR,           -- Date of overpass (YYYY-MM-DD, 2025-01-01 to 2025-12-31)
    acq_time VARCHAR,           -- Time of overpass (HHMM UTC)
    satellite VARCHAR,          -- Satellite platform ('Terra', 'Aqua', 'Suomi-NPP')
    instrument VARCHAR,         -- Instrument ('MODIS', 'VIIRS')
    confidence VARCHAR,         -- Decoupled confidence: numeric string '0'-'100' (MODIS) or 'l'/'n'/'h' (VIIRS)
    version VARCHAR,            -- Collection algorithm version ('6.1NRT', '2.0NRT')
    bright_t31 DOUBLE,          -- Channel 31 / I-5 brightness temperature (Kelvin)
    frp DOUBLE,                 -- Fire Radiative Power (Megawatts, MW)
    daynight VARCHAR,           -- Diurnal pass ('D' = Daytime, 'N' = Nighttime)
    type BIGINT,                -- Detection type (0 = presumed vegetation fire)
    sensor VARCHAR,             -- Harmonised sensor tag ('MODIS', 'VIIRS')
    acq_datetime VARCHAR,       -- ISO 8601 combined timestamp ('YYYY-MM-DDTHH:MM:00Z')
    month BIGINT,               -- Numeric calendar month (1 to 12)
    day_of_year BIGINT          -- Day of year (1 to 365)
);
```

### Empirical Distribution in Existing Active Baseline:
- **Total Validated Detections**: 7,541
- **VIIRS Suomi-NPP (375m)**: 6,623 detections (87.8%)
- **MODIS Terra & Aqua (1km)**: 918 detections (12.2%)
- **Diurnal Overpass**:
  - Daytime (`D`): 4,911 detections (65.1%)
  - Nighttime (`N`): 2,630 detections (34.9%)
- **Energetics (FRP)**:
  - Peak Observation: 169.90 MW
  - Mean FRP: 5.35 MW
  - Total Radiative Power: 40,341.81 MW
- **Temporal Span**: January 1, 2025 to December 31, 2025

---

## 4. Application Architecture & Data Consumers Audit

### 4.1 Backend Engine (`fireIntel/api/`)
- **`fireIntel/api/db.py`**: Manages the singleton DuckDB connection registering 3 in-memory views:
  - `fires`: points to `uttarakhand_fires_boundary.parquet`
  - `master_grid`: points to `master_grid_005deg.parquet`
  - `dem_terrain`: points to `dem_terrain_features_005deg.parquet`
- **FastAPI Endpoints**:
  - `GET /api/v1/data/summary` / `GET /api/data/summary`: Parameterized dynamic DuckDB query.
  - `GET /api/v1/data/observations` / `GET /api/data/observations`: Paginated records with server-side sort/filter.
  - `GET /api/v1/data/export` / `GET /api/data/export`: Sanitized CSV, JSON, and GeoJSON streaming exports.
  - `GET /api/fires`: Raw analytical query for the fires layer.
  - `GET /api/terrain`: Elevation, slope, aspect, and TRI join queries.
  - `GET /api/mission-control/summary`: Fast JSON KPI payload.
  - `GET /api/health` & `GET /`: Health and Swagger specs.

### 4.2 Web Frontend Consumers (`fireIntel/web/app/`)
- **Homepage (`/`)**: Consumes `/data/mission_control_summary.json` for live radar telemetry.
- **Fire Intelligence Lab (`/fires`)**: Consumes `/data/uttarakhand_fires_2025.geojson` and `/data/mission_control_summary.json`.
- **Himalayan 3D Observatory (`/terrain`)**: Consumes `/data/terrain_grid_web.json`, `/data/sample_fires_for_web.json`, and `/data/uttarakhand_boundary.geojson`.
- **Environmental Research Lab (`/analytics`)**: Consumes `/data/historical_analytics.json`.
- **Scientific Field Journal (`/methodology`)**: References empirical counts, sensor resolutions, and Survey of India boundary parameters.
- **Data Explorer Terminal (`/data`)**: Consumes live `/api/v1/data/*` backend endpoints.

---

## 5. Audit of Machine Learning Artifacts in Existing Repository

- **Trained Model Files (`.pkl`, `.joblib`, `.onnx`, `.xgb`)**: **None currently exist in the repository**.
- **Model Training Code**: None currently exists in `fireIntel/scripts/`. (Existing scripts: `eda.py`, `preprocess_fires.py`, `validate_boundary.py`, `prepare_frontend_data.py`, `verify_project_integrity.py`).
- **Conclusion**: All reported models (Random Forest, XGBoost) and evaluation metrics reside exclusively in the team's Google Sheets source or external notebooks.

---

## 6. Audit of the New Google Sheets Source

### 6.1 Target Resource
* **URL**: `https://docs.google.com/spreadsheets/d/1jxkKKjE1ObxSlw_1WSV5y0B9p8U6G-gdrFDTgMHBhes/edit?gid=1443840401#gid=1443840401`
* **Spreadsheet ID**: `1jxkKKjE1ObxSlw_1WSV5y0B9p8U6G-gdrFDTgMHBhes`
* **Target Sheet GID**: `1443840401`

### 6.2 Connection & Authentication Audit Results
Every protocol was tested against the target URL:

| Protocol / Method | Endpoint Tested | HTTP Response | Diagnostic Finding |
| :--- | :--- | :--- | :--- |
| **XLSX Full Export** | `/export?format=xlsx` | `302 Found` | Redirects to `https://accounts.google.com/ServiceLogin` |
| **CSV Tab Export** | `/export?format=csv&gid=1443840401` | `302 Found` | Redirects to `https://accounts.google.com/ServiceLogin` |
| **HTML View** | `/edit?gid=1443840401` | `302 Found` | Redirects to Google Accounts Sign-In |
| **API Account Auth** | `list_plugin_accounts` | `None` | No Google Workspace credentials installed |
| **Local Downloads Search** | `~/Downloads/` | `No Match` | No recent harmonised export file found |

### 6.3 Audit Finding
The Google Spreadsheet sharing setting is currently **Private/Restricted** and does not allow anonymous or link-based reading. 

In strict adherence to the project guidelines:
1. **No content has been fabricated.**
2. **No columns or schema types have been guessed.**
3. **The existing production dataset has NOT been touched or overwritten.**
4. **The safe migration branch `migration/phase9-harmonised-data` has been initialized.**

---

## 7. Actionable Steps to Unblock Phase 9

To proceed with Phase 9 (Model Validation, Migration, Canonical Schema, Backend DuckDB Update, and UI Migration), please perform **one of the following two actions**:

### Option A: Enable Link Sharing on the Google Spreadsheet (Easiest)
1. Open the Google Sheet: [https://docs.google.com/spreadsheets/d/1jxkKKjE1ObxSlw_1WSV5y0B9p8U6G-gdrFDTgMHBhes/](https://docs.google.com/spreadsheets/d/1jxkKKjE1ObxSlw_1WSV5y0B9p8U6G-gdrFDTgMHBhes/)
2. Click **Share** (top right).
3. Under **General access**, change from **Restricted** to **"Anyone with the link"** with role **Viewer**.
4. Reply in chat: *"Permissions updated, please proceed."*

### Option B: Export and Provide the File Directly
1. In Google Sheets, go to **File $\rightarrow$ Download $\rightarrow$ Microsoft Excel (.xlsx)** or **Comma Separated Values (.csv)**.
2. Place the downloaded file into the workspace directory:
   `fireIntel/data/incoming/harmonised/` (or your `Downloads` folder).
3. Reply in chat with the filename.
