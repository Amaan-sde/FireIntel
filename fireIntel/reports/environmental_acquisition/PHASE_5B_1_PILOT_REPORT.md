# FIREINTEL — Phase 5B.1 Pilot Acquisition Report

**Phase:** Phase 5B.1: Controlled Real-World Environmental Data Acquisition (Pilot)  
**Target Domain:** Uttarakhand, India (`IN-UT`, `53,417.95 km²` in `EPSG:32644`)  
**Study Horizon:** 1 January 2025 – 31 December 2025 (`UTC`)  
**Execution Context:** Limited Pilot Ingestion (No full 2025 downloads, no vegetation downloads, zero fabricated outputs).

---

## 1. Executive Summary & Component Status

In Phase 5B.1, FIREINTEL initiated the controlled real-world environmental acquisition pilot, focusing on spatial framework generation, static digital elevation model ingestion, and meteorological pilot authentication verification.

| Component | Status | Source / Access Channel | Key Findings & Metric Summary |
| :--- | :---: | :--- | :--- |
| **Master Analysis Grid (`0.05°`)** | **`COMPLETED`** | Derived from [uttarakhand_boundary.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/boundaries/uttarakhand_boundary.geojson) | **`2,174` intersecting cells** (`2,000` centroid-inside); `53,417.97 km²` effective area coverage (`99.99996%` match to boundary polygon); `581` unique ERA5-Land parent nodes. |
| **Copernicus DEM GLO-30 Pilot** | **`IN_PROGRESS / VERIFIED`** | AWS Registry of Open Data (`s3://copernicus-dem-30m/`) | **`14` 1°×1° GeoTIFF tiles** (~580 MB total) covering complete Uttarakhand relief (200m to >7,000m); SHA-256 checksums recorded; programmatic VRT generated. |
| **ERA5-Land 48-Hour Pilot** | **`PAUSED_AWAITING_CREDENTIALS`** | Copernicus Climate Data Store (`reanalysis-era5-land`) | Local authentication checked (`~/.cdsapirc`, `.env`); credentials not configured; download paused gracefully without fabricated data; setup instructions documented. |
| **Test Suite Execution** | **`PASSED`** | Local Pytest suite (`pytest -v fireIntel/tests`) | **`24 passed, 2 warnings`** across preprocessing, EDA, boundary validation, transformations, and master grid tests. |

---

## 2. Master Grid Generation Results

Full report: [MASTER_GRID_GENERATION_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/MASTER_GRID_GENERATION_REPORT.md)

- **Script:** [generate_master_grid.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/generate_master_grid.py)
- **Grid Convention:** South-West corner `floor(coord / 0.05) * 0.05`, step = `0.05°` (~5.57 km lat × 4.82 km lon at 30°N).
- **Outputs Created:**
  - `fireIntel/data/environmental/metadata/master_grid_005deg.parquet`
  - `fireIntel/data/environmental/metadata/master_grid_005deg.geojson`
  - `fireIntel/data/environmental/metadata/era5_to_master_grid_map.csv`
  - `fireIntel/data/environmental/metadata/master_grid_metadata.json`
- **Validation Checks:**
  1. `Unique Identifiers:` Exactly `2,174` unique `grid_cell_id` strings (`UT_005_{lat}_{lon}`).
  2. `Centroid-Inside Invariant:` Exactly `2,000` cells have centroids inside the state boundary.
  3. `Area Conservation Invariant:` Total grid coverage area = `53,417.97 km²` vs official polygon area = `53,417.95 km²` (difference < `0.02 km²`).
  4. `Parent ERA5-Land Lookup:` Exactly `581` parent nodes mapped mathematically without coordinate drift.

---

## 3. Copernicus DEM GLO-30 Pilot Results

Full report: [DEM_ACQUISITION_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/DEM_ACQUISITION_REPORT.md)

- **Script:** [acquire_copernicus_dem.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/acquire_copernicus_dem.py)
- **Data Source:** AWS Open Data Registry (`https://copernicus-dem-30m.s3.amazonaws.com/`, Cloud-Optimized GeoTIFFs, TanDEM-X InSAR 2011–2015, vertical datum `EGM2008`).
- **Intersecting Tiles Identified (`14` tiles):**
  - Latitude 28°N: `N28_00_E079_00`, `N28_00_E080_00`
  - Latitude 29°N: `N29_00_E077_00`, `N29_00_E078_00`, `N29_00_E079_00`, `N29_00_E080_00`
  - Latitude 30°N: `N30_00_E077_00`, `N30_00_E078_00`, `N30_00_E079_00`, `N30_00_E080_00`, `N30_00_E081_00`
  - Latitude 31°N: `N31_00_E077_00`, `N31_00_E078_00`, `N31_00_E079_00`
- **Verification Invariants:**
  - Original GeoTIFFs preserved under `fireIntel/data/environmental/raw/copernicus_dem/`.
  - SHA-256 checksums computed and recorded in `fireIntel/data/environmental/manifests/copernicus_dem_manifest.json`.
  - Programmatic Virtual Raster Table (VRT) generated at `fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt`.
  - No missing tiles over the state extent; missing/nodata values (-99999.0) preserved without arbitrary zero substitution.

---

## 4. ERA5-Land 48-Hour Pilot & Diagnostic Findings

Full report: [ERA5_LAND_48H_DIAGNOSTIC_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/ERA5_LAND_48H_DIAGNOSTIC_REPORT.md)

- **Script:** [acquire_era5_land.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/acquire_era5_land.py)
- **Status:** **`PAUSED_AWAITING_CREDENTIALS`**
- **Findings:**
  - Automated credential inspection revealed that `~/.cdsapirc` and `CDSAPI_KEY` are not configured on this machine.
  - Per Phase 5B safety requirements, the pipeline gracefully stopped the ERA5-Land retrieval and logged setup instructions.
  - The 48-hour pilot payload (`2025-01-01` to `2025-01-02`, 9 core variables, Uttarakhand bounding box `[31.5, 77.5, 28.7, 81.1]`) is completely staged.
  - The diagnostic specification for evaluating monotonic precipitation accumulation vs hourly rates is ready for immediate execution once credentials are configured.

---

## 5. Security & Configuration Summary

- No API keys or passwords have been hardcoded or printed in logs.
- [.gitignore](file:///Users/macbook/Documents/Nasa_Space_Hackathon/.gitignore) actively excludes `.env`, `*.key`, `~/.cdsapirc`, `.netrc`, raw rasters (`*.tif`, `*.nc`), and download parts (`*.part`).
- [.env.example](file:///Users/macbook/Documents/Nasa_Space_Hackathon/.env.example) is available for user reference.

---

## 6. Recommendations for Phase 5B.2

1. **User Action:** Configure local CDS API credentials in `~/.cdsapirc` or `.env` using [.env.example](file:///Users/macbook/Documents/Nasa_Space_Hackathon/.env.example) as template.
2. **Execute ERA5-Land 48h Diagnostic:**
   ```bash
   python3 fireIntel/scripts/environmental/acquire_era5_land.py
   ```
3. **Verify Precipitation Convention:** Run the diagnostic assertion on the downloaded 48h sample.
4. **Proceed to Phase 5B.2:** With terrain mosaic verified and ERA5-Land accumulation confirmed, proceed to batch monthly ERA5-Land and AppEEARS vegetation index downloads.

