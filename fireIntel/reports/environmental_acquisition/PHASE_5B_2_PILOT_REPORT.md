# FIREINTEL — Phase 5B.2 Controlled Environmental Data Processing Report

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Phase:** Phase 5B.2: Controlled Environmental Data Processing  
**Target Domain:** Uttarakhand, India (`IN-UT`, official boundary `53,417.95 km²` in `EPSG:32644`)  
**Execution Timestamp:** 2026-11-13T22:25:00+05:30  
**Test Suite Status:** **32 PASSED, 0 FAILED** (5.72s total execution time)  
**Deliverables Directory:** [fireIntel/reports/environmental_acquisition/](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/)

---

## 1. Executive Summary

Phase 5B.2 of **FIREINTEL** successfully executed controlled real-world environmental data processing and spatial harmonization for the state of Uttarakhand, India. All operations strictly adhered to the pilot safety constraints: no unauthenticated network attempts were made, no simulated data was fabricated, existing fire observations and boundary-validated datasets remained untouched, and machine learning was kept strictly out of scope.

### Key Milestones Completed in Phase 5B.2:
1. **Finalized ERA5-Land Variable Configuration:** Resolved previous documentation inconsistencies and finalized the canonical 9-variable meteorological and hydrological stack, preserving all four soil moisture layers ($0\text{–}289\text{ cm}$) and formally excluding redundant or scale-mismatched variables.
2. **Controlled ERA5-Land Pilot & Authentication Verification:** Confirmed that local CDS credentials are not installed and paused the download gracefully with `PAUSED_AWAITING_CREDENTIALS`, preventing unhandled crashes or simulated data fabrication.
3. **Precipitation Diagnostic Protocol:** Formalized the intraday monotonicity and midnight reset invariant protocol to inspect ECMWF precipitation accumulation before full-year de-accumulation.
4. **DEM Terrain Processing on Master Grid:** Processed all 14 Copernicus DEM GLO-30 tiles across all **2,174 cells** of the Master $0.05^\circ$ Grid in **8.94 seconds**, generating high-precision elevation statistics, slopes, circular aspects, and Riley Terrain Ruggedness Index (TRI) with **100.0% data completeness**.
5. **Rigorous Grid Alignment & Provenance Enforcement:** Harmonized the 30m DEM, $0.05^\circ$ Master Grid, and $0.10^\circ$ parent ERA5-Land nodes (581 nodes), explicitly tagging spatial provenance and banning unfounded interpolation claims.
6. **Full Test Suite Expansion:** Added 6 new unit tests for terrain feature calculations and grid alignment, bringing the automated test suite to **32 passed tests** with 100% pass rate.

---

## 2. Task 1: Finalization of ERA5-Land Variables

### 2.1 Inconsistency Resolution
In previous Phase 5B conversational summaries, references were briefly made to `surface_pressure`, `surface_net_solar_radiation`, and only the top two soil moisture layers. In contrast, the Phase 4 audit and Phase 5A architecture documents specified that:
- Deep soil moisture is vital for forest drought memory.
- Mountainous surface pressure is overwhelmingly dominated by static topographic elevation.
- Solar radiation at $0.10^\circ$ fails to resolve fine-scale Himalayan valley shading.

In Phase 5B.2, this inconsistency was permanently resolved by publishing the canonical configuration file: [era5_land_finalized_variables.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/era5_land_finalized_variables.json).

### 2.2 The Finalized 9-Variable Stack
| # | CDS Parameter Name | Short Code | Standard CF Name | Native Units | Target Units | Physical Role in Wildfire Intelligence |
| :-: | :--- | :---: | :--- | :---: | :---: | :--- |
| **1** | `2m_temperature` | `t2m` | `air_temperature` | `K` | `°C` | Thermodynamic driver of dead fuel drying and ambient heat stress. |
| **2** | `2m_dewpoint_temperature` | `d2m` | `dew_point_temperature` | `K` | `°C` | Coupled with `t2m` to compute Relative Humidity ($RH$) and Vapor Pressure Deficit ($VPD$). |
| **3** | `10m_u_component_of_wind` | `u10` | `eastward_wind` | `m s**-1` | `m s**-1` | Zonal vector component for calculating wind speed and spread directions. |
| **4** | `10m_v_component_of_wind` | `v10` | `northward_wind` | `m s**-1` | `m s**-1` | Meridional vector component for wind velocity and smoke advection. |
| **5** | `total_precipitation` | `tp` | `precipitation_amount` | `m` | `mm` | Ground moisture replenishment; antecedent rainfall memory (1, 3, 7, 14 days). |
| **6** | `volumetric_soil_water_layer_1` | `swvl1` | `volumetric_soil_water_layer_1` | `m**3 m**-3` | `m**3 m**-3` | Surface litter ($0\text{–}7\text{ cm}$) moisture memory; pine needle ignitability. |
| **7** | `volumetric_soil_water_layer_2` | `swvl2` | `volumetric_soil_water_layer_2` | `m**3 m**-3` | `m**3 m**-3` | Shallow root zone ($7\text{–}28\text{ cm}$); understory shrub and grass hydration. |
| **8** | `volumetric_soil_water_layer_3` | `swvl3` | `volumetric_soil_water_layer_3` | `m**3 m**-3` | `m**3 m**-3` | Deep root zone ($28\text{–}100\text{ cm}$); mature Sal and Pine canopy drought stress. |
| **9** | `volumetric_soil_water_layer_4` | `swvl4` | `volumetric_soil_water_layer_4` | `m**3 m**-3` | `m**3 m**-3` | Subsoil reservoir ($100\text{–}289\text{ cm}$); regional multi-month hydrological memory. |

### 2.3 Explicit Exclusion Rationale:
- **`surface_pressure`:** In Uttarakhand (elevation $129\text{ m}$ to $7,804\text{ m}$), barometric pressure is $>98\%$ determined by static elevation. Static 30m DEM elevation provides $300\times$ higher spatial resolution than $0.1^\circ$ ERA5-Land without wasting CDS quota.
- **`surface_net_solar_radiation`:** A $9\text{ km}$ solar radiation grid fails to resolve steep ridge shadows and aspect-dependent insolation in mountain ravines. Local solar exposure is directly modeled from 30m DEM slope and circular aspect.

---

## 3. Tasks 2 & 3: ERA5-Land Pilot Status & Precipitation Diagnostic

### 3.1 Execution and Authentication Check
The pipeline script [acquire_era5_land.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/acquire_era5_land.py) was executed:
- Checked `~/.cdsapirc`, environment variables `CDSAPI_KEY`/`CDSAPI_URL`, and local `.env`.
- Confirmed that CDS credentials are not installed on the host.
- Following Phase 5B rules, the script halted gracefully with status `PAUSED_AWAITING_CREDENTIALS`.
- **Zero data fabrication occurred.** No synthetic NetCDF files were created.

### 3.2 Precipitation Diagnostic Protocol
The complete diagnostic methodology was published in [ERA5_LAND_PRECIPITATION_DIAGNOSTIC.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/ERA5_LAND_PRECIPITATION_DIAGNOSTIC.md):
- Established the mathematical reset-aware backward difference equation:
  $$\Delta P(H) = \begin{cases} P(01) \times 1000.0 & H = 01\text{ UTC} \\ \max\left(0, (P(H) - P(H-1)) \times 1000.0\right) & H \in \{02 \dots 24\}\text{ UTC} \end{cases}$$
- Defined automated tests for intraday monotonic growth and cycle reset at Day 2 00:00 UTC.
- De-accumulation logic in [transformations.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/transformations.py) stands fully verified by unit tests and will be applied to the 48-hour pilot file as soon as live data is retrieved.

---

## 4. Task 4: DEM Terrain Processing Results

Using the 14 downloaded Copernicus DEM GLO-30 tiles via the virtual mosaic [copernicus_dem_uttarakhand.vrt](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt), the terrain processor [process_dem_terrain.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/process_dem_terrain.py) extracted comprehensive geomorphological features for all 2,174 cells in **8.94 seconds**:

### State-wide Summary:
- **Total Master Grid Cells:** **2,174**
- **Cells with Valid DEM Data:** **2,174 (100.0%)**
- **Cells Missing DEM Data:** **0 (0.0%)**
- **Elevation Range:** **$181.50\text{ m}$ to $7,804.02\text{ m}$** (Mean: $2,254.50\text{ m}$)
- **Slope Range:** **$0.82^\circ$ to $81.17^\circ$** (Mean: $24.42^\circ$)
- **Terrain Ruggedness Index (TRI):** **$1.82\text{ m}$ to $417.31\text{ m}$** (Mean: $36.97\text{ m}$)
- **Missing Value Handling:** Strict NoData masking; void pixels excluded; missing cells return NaN and are **never filled with zero**.

### Output Datasets:
- [dem_terrain_features_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet) (2,174 rows, 25 columns, SHA-256: `5c1916ad8a78...`)
- [dem_terrain_features_005deg.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.csv) (2,174 rows, 25 columns, SHA-256: `04949f170c98...`)
- [dem_terrain_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/dem_terrain_manifest.json) (complete provenance manifest)

Detailed documentation is available in [DEM_TERRAIN_FEATURES_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/DEM_TERRAIN_FEATURES_REPORT.md).

---

## 5. Task 5: Grid Alignment & Provenance Integrity

The spatial harmonization between the $30\text{ m}$ DEM, the $0.05^\circ$ Master Grid, and the $0.10^\circ$ ERA5-Land nodes was finalized and validated in [GRID_ALIGNMENT_VALIDATION.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/GRID_ALIGNMENT_VALIDATION.md):
- Exactly **581 parent ERA5-Land nodes** subsume the 2,174 master grid cells (average 3.74 cells per node; $2\times 2$ nesting in the interior).
- Every master grid record preserves its parent identifiers: `era5_parent_cell_id`, `era5_parent_lat`, `era5_parent_lon`.
- Two explicit provenance columns were embedded into every record:
  - `spatial_resolution_prov`: `"copernicus_dem_glo30_zonal_005"`
  - `met_spatial_resolution_prov`: `"era5_land_parent_010"`
- **Strict Scientific Integrity Rule:** Prohibited claiming that mathematical interpolation creates new atmospheric resolution. Meteorological variables reflect parent $0.10^\circ$ synoptic forcing; local thermodynamic downscaling will follow physical lapse rates ($\Gamma = -6.5^\circ\text{C} / 1000\text{ m}$) based on 30m DEM elevation differences.

---

## 6. Task 6: Test Suite Verification

The complete regression and unit test suite was executed:
```bash
pytest -v fireIntel/tests
```
**Results:** **32 PASSED, 2 warnings in 5.72s**

| Test Module | Coverage Scope | Tests Passed | Status |
| :--- | :--- | :---: | :---: |
| `test_preprocess_fires.py` | FIRMS raw CSV ingestion, schema preservation, bounding box | 6 | **PASSED** |
| `test_eda.py` | Exploratory data analysis, temporal & spatial statistics, sensor comparison | 3 | **PASSED** |
| `test_validate_boundary.py` | Administrative boundary validation, polygon geometry repair, CRS | 3 | **PASSED** |
| `test_environmental_transformations.py` | Temperature, RH, VPD, wind vectors, de-accumulation, coordinate nesting | 9 | **PASSED** |
| `test_master_grid.py` | 0.05° grid schema, cell counts, parent ERA5 mapping, area conservation | 3 | **PASSED** |
| `test_dem_acquisition.py` | Copernicus DEM manifest integrity, 14-tile completeness, VRT mosaic | 2 | **PASSED** |
| `test_dem_terrain.py` | **NEW:** DEM terrain processing, flat/sloping kernels, NoData masking, output ranges | 4 | **PASSED** |
| `test_grid_alignment.py` | **NEW:** Master grid to ERA5 parent alignment, 1:1 ID matching, provenance tags | 2 | **PASSED** |
| **Total** | **Full System Regression Suite** | **32** | **100% PASS** |

---

## 7. Deliverables Index

All Phase 5B.2 deliverables have been created and persisted on disk:

### Reports:
1. [PHASE_5B_2_PILOT_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/PHASE_5B_2_PILOT_REPORT.md) (This Master Report)
2. [ERA5_LAND_PRECIPITATION_DIAGNOSTIC.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/ERA5_LAND_PRECIPITATION_DIAGNOSTIC.md) (Precipitation Diagnostic Protocol)
3. [DEM_TERRAIN_FEATURES_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/DEM_TERRAIN_FEATURES_REPORT.md) (DEM Terrain Extraction & Geomorphology)
4. [GRID_ALIGNMENT_VALIDATION.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/GRID_ALIGNMENT_VALIDATION.md) (Grid Harmonization & Provenance Report)

### Data Artifacts & Manifests:
1. [era5_land_finalized_variables.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/era5_land_finalized_variables.json) (Finalized 9-Variable Config)
2. [dem_terrain_features_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet) (Processed Terrain Features Parquet)
3. [dem_terrain_features_005deg.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.csv) (Processed Terrain Features CSV)
4. [dem_terrain_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/dem_terrain_manifest.json) (Terrain Processing Manifest)

### Scripts & Unit Tests:
1. [process_dem_terrain.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/process_dem_terrain.py) (DEM Terrain Processing Pipeline)
2. [test_dem_terrain.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_dem_terrain.py) (4 Terrain Processing Unit Tests)
3. [test_grid_alignment.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_grid_alignment.py) (2 Grid Alignment Unit Tests)

---

## 8. Safety & Compliance Confirmation

- [x] **No Full-Year ERA5-Land Download:** Bounded strictly to pilot checks; zero full-year queries issued.
- [x] **No Vegetation Datasets Downloaded:** MODIS/VIIRS vegetation queries remain unexecuted.
- [x] **No Machine Learning Started:** Zero model training or premature feature fitting.
- [x] **No Frontend/Backend Built:** Focused exclusively on environmental engineering.
- [x] **No Existing Data Overwritten:** Raw FIRMS CSVs, processed fire datasets, boundary polygons, and Phase 1–5A reports remain 100% intact.
- [x] **No Credentials Exposed:** Local setup instructions provided; zero secrets logged or requested.
- [x] **No Fabricated Data:** Missing downloads transparently recorded as `PAUSED_AWAITING_CREDENTIALS`.

