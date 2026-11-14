# FIREINTEL — Pre-Implementation Corrections & Data Truth Verification

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Challenge:** NASA Space Apps Challenge 2026  
**Document:** Pre-Implementation Discrepancy Reconciliation & Ground Truth Audit  
**Date:** 2026-11-13  
**Status:** **OFFICIALLY VERIFIED & AUDITED (ALL 7 DISCREPANCIES RECONCILED)**

---

## 1. Executive Reconciliation Summary

Prior to initiating frontend implementation for Phase 6, seven specific scientific, methodological, and architectural discrepancies were identified and systematically resolved against physical disk assets, empirical benchmarks, and regression tests.

```
+---------------------------------------------------------------------------------------------------------+
|                                    DISCREPANCY RESOLUTION SCORECARD                                     |
+---------------------------------------------------------------------------------------------------------+
|  1. 7.21x Ratio & Flaming Fronts : VERIFIED (6,623 / 918 = 7.2146x); unsupported sub-canopy claims removed|
|  2. NOAA-20 VIIRS Coverage       : VERIFIED (100% Suomi-NPP; NOAA-20 absent; dual-satellite claim removed)|
|  3. Pre-Monsoon Concentration    : RECONCILED (38.23% Apr-May, 46.05% Mar-Jun; 93.4% was MODIS day_pct)|
|  4. Cross-Sensor Match Count     : RECONCILED (256 pairs in boundary EDA; 208 was North lat MODIS count)|
|  5. District Vulnerability       : REMOVED (No ADM2 district data in project; replaced by geodetic bins) |
|  6. DuckDB Query Performance     : BENCHMARKED (Cold: 3.51-312 ms; Warm mean: 1.88 ms; removed <3ms claim)|
|  7. Dataset Column Schema        : VERIFIED (Exactly 17 columns in all 3 boundary fire CSVs)             |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. In-Depth Reconciliation of All 7 Items

### Item 1: Verification of the 7.21x VIIRS/MODIS Ratio & Removal of Speculative Flaming Front Claims
- **Empirical Ground Truth:**
  - MODIS boundary-validated active fire detections (2025): **918**
  - VIIRS boundary-validated active fire detections (2025): **6,623**
  - Mathematical Ratio:
    $$\frac{6,623}{918} = 7.214597 \approx 7.21\times$$
- **Unsupported Speculation Removed:**
  - Previous draft text asserted that *"VIIRS can detect small, low-intensity flaming fronts (5–10 m²) under dense pine canopies"*. Because no in-situ ground validation or canopy-penetration radiative transfer modeling was conducted for the Uttarakhand study area, this claim is unverified.
- **Approved Physical Justification:**
  - *Nadir Pixel Footprint:* VIIRS 375m I-band pixel area ($0.1406\text{ km}^2$) vs MODIS 1 km ($1.0\text{ km}^2$), an area factor of $7.11\times$.
  - *Scan-Edge Bowtie Trimming:* VIIRS dynamically suppresses pixel expansion at high scan angles ($\le 0.56\text{ km}^2$), whereas MODIS pixels grow up to $\sim 9.6\text{ km}^2$, increasing off-nadir spatial resolution by up to $17\times$.
  - *Instrument Sensitivity:* VIIRS I4 channel ($3.74\text{--}4.14\text{ µm}$) features lower saturation radiance and higher signal-to-noise ratio than MODIS Channel 21/22.

---

### Item 2: Verification of Satellite Platforms in VIIRS Dataset (Removal of NOAA-20 Claim)
- **Empirical Ground Truth:**
  - Direct scan of raw VIIRS archive `fireIntel/data/raw/fire_archive_SV-C2_843062.csv` (10,986 rows) and processed dataset `fireIntel/data/processed/boundary_validated/uttarakhand_viirs_boundary.csv` (6,623 rows):
    ```python
    viirs['satellite'].value_counts()
    # Output: {'SNPP': 6623}
    ```
  - **Result:** The downloaded dataset contains **100% Suomi-NPP (SNPP)** observations. There are **zero** NOAA-20 (JPSS-1) observations in the dataset.
  - MODIS platform breakdown:
    ```python
    modis['satellite'].value_counts()
    # Output: {'Aqua': 684, 'Terra': 234} (Total: 918)
    ```
- **Correction:**
  - All claims of "dual-satellite VIIRS coverage" or "NOAA-20 + Suomi-NPP afternoon constellation" are strictly revoked.
  - The project accurately reports three operational satellites: **Aqua (MODIS)**, **Terra (MODIS)**, and **Suomi-NPP (VIIRS)**.

---

### Item 3: Reconciliation of Pre-Monsoon Fire Concentration (Reconciling the 93.4% Claim)
- **Empirical Ground Truth from `uttarakhand_fires_boundary.csv`:**
  - Monthly active fire detection distribution for Uttarakhand in 2025:
    - January: 666 (8.83%)
    - February: 848 (11.25%)
    - March: 467 (6.19%)
    - **April: 2,255 (29.90%)**
    - **May: 628 (8.33%)**
    - June: 123 (1.63%)
    - July: 5 (0.07%)
    - August: 1 (0.01%)
    - September: 3 (0.04%)
    - October: 443 (5.87%)
    - November: 424 (5.62%)
    - **December: 1,678 (22.25%)**
    - **Total: 7,541 (100.0%)**
  - **Actual Pre-Monsoon Peak:**
    - April + May: $2,255 + 628 = 2,883$ detections = **38.23%** of total fires.
    - Pre-monsoon fire season (March--June): $467 + 2,255 + 628 + 123 = 3,473$ detections = **46.05%** of total fires.
    - Secondary Winter Peak (December): **1,678 detections (22.25%)**.
- **Source of the "93.4%" Figure:**
  - Investigation revealed that in [EDA_REPORT.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/eda_boundary_validated/EDA_REPORT.md#L104) and `sensor_comparison.csv` (line 3), the MODIS daytime observation percentage is **93.03%** (`daytime_pct = 93.03%`).
  - Narrative text inadvertently conflated MODIS daytime acquisition percentage ($93.03\% \approx 93.4\%$) with pre-monsoon fire concentration.
- **Enforced Correction:**
  - The website and reports must display the accurate pre-monsoon figures: **38.23% in peak months (April--May)** and **46.05% across the pre-monsoon season (March--June)**, alongside the prominent winter secondary peak in December (22.25%).

---

### Item 4: Reconciliation of Cross-Sensor Candidate Matches (208 vs 256)
- **Empirical Ground Truth from `eda_boundary_validated/eda_summary.json`:**
  - Overlap analysis for boundary-validated observations at primary threshold ($\Delta d \le 1.0\text{ km}$, $\Delta t \le 60\text{ minutes}$):
    - **Candidate Cross-Sensor Pairs:** **256**
    - **MODIS Detections Matched:** **131** (out of 918; 14.27%)
    - **VIIRS Detections Matched:** **227** (out of 6,623; 3.43%)
    - **Aqua Matches:** 131 (100% of MODIS matches; Aqua orbits in the afternoon close to Suomi-NPP)
    - **Terra Matches:** 0 (Terra overpasses at ~10:30 local time, ~3 hours apart from Suomi-NPP)
    - **Median Pair Distance:** 0.592 km
    - **Median Pair Time Delta:** 43.0 minutes
- **Source of the "208" Figure:**
  - In [sensor_comparison.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/eda_boundary_validated/sensor_comparison.csv#L16) and `eda_summary.json` (line 741), the count of MODIS detections in the North latitude band ($30.25^\circ\text{--}31.46^\circ\text{N}$) is exactly **208**:
    ```text
    lat_band_North (30.25-31.46 N),208.0,1674.0,observations
    ```
  - An earlier synthesis draft misread this row as the cross-sensor match count.
- **Enforced Correction:**
  - The confirmed number of cross-sensor candidate pairs is **256** (representing 131 MODIS and 227 VIIRS detections).

---

### Item 5: District-Level Statistics & Vulnerability Rankings
- **Verification Audit:**
  - Inspected `uttarakhand_fires_boundary.csv`, `uttarakhand_modis_boundary.csv`, `uttarakhand_viirs_boundary.csv`, and all directory trees in `fireIntel/`.
  - **Finding:** There is **NO** district attribute in any fire dataset, and **no official ADM2 district boundary polygon dataset** is installed in the project.
  - Previous mentions of district rankings (e.g. "Pauri Garhwal, Nainital, Almora") were qualitative external references, not computed from project data.
- **Enforced Correction:**
  - All unverified district vulnerability rankings are removed from the UI and documentation.
  - Geospatial aggregations will be presented by scientifically verified spatial dimensions:
    1. **Latitude Bands:** South ($28.71^\circ\text{--}29.48^\circ\text{N}$), Central ($29.48^\circ\text{--}30.25^\circ\text{N}$), and North ($30.25^\circ\text{--}31.46^\circ\text{N}$).
    2. **Elevation Bands (Copernicus DEM):** Lowland ($<1,000\text{ m}$), Mid-Hills ($1,000\text{--}2,500\text{ m}$), High-Himalaya ($>2,500\text{ m}$).
    3. **Master 0.05° Grid Cells:** 2,174 discrete analytical units.

---

### Item 6: Removal of Guaranteed <3 ms DuckDB Performance Claim & Empirical Benchmarking
- **Verification Audit:**
  - `duckdb` was not previously installed in the system environment (now installed: `duckdb 2.0.0`).
  - Benchmarked actual DuckDB queries on Apple Silicon against the project's Parquet files:
    - `fireIntel/data/environmental/metadata/master_grid_005deg.parquet` (2,174 rows)
    - `fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet` (2,174 rows, 25 columns)
- **Empirical Benchmark Results:**
  - **Cold Scan (Master Grid):** 312.84 ms (includes initial file IO, schema metadata parsing, thread pool initialization).
  - **Cold Scan (DEM Terrain Features):** 3.14 ms.
  - **Cold Join + Filter (`slope_mean_deg > 20°`):** 3.51 ms.
  - **Warm Join (20-run benchmark):**
    - **Mean:** **1.88 ms**
    - **Min:** 1.74 ms
    - **Max:** 2.16 ms
    - **p95:** 2.16 ms
- **Enforced Correction:**
  - Removed all unconditional claims of "guaranteed $< 3\text{ ms}$".
  - The documentation and API report empirical metrics: Cold initialization: 3.51 ms to 312 ms; Warm in-memory execution: 1.88 ms average.

---

### Item 7: Dataset Schema & Column Count Verification (16 vs 17 Columns)
- **Empirical Column Count:**
  - Every boundary-validated fire dataset contains exactly **17 columns**:

| Column Index | Column Name | Data Type (Fires Combined) | MODIS Data Type | VIIRS Data Type | Description |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `latitude` | `float64` | `float64` | `float64` | Center latitude in WGS 84 (EPSG:4326) |
| **2** | `longitude` | `float64` | `float64` | `float64` | Center longitude in WGS 84 (EPSG:4326) |
| **3** | `brightness` | `float64` | `float64` | `float64` | Brightness temperature (Channel 21/22 for MODIS, I4 for VIIRS) in Kelvin |
| **4** | `scan` | `float64` | `float64` | `float64` | Pixel scan dimension (km) |
| **5** | `track` | `float64` | `float64` | `float64` | Pixel track dimension (km) |
| **6** | `acq_date` | `string` (`YYYY-MM-DD`) | `string` | `string` | UTC acquisition date |
| **7** | `acq_time` | `int64` (`HHMM`) | `int64` | `int64` | UTC acquisition time |
| **8** | `satellite` | `string` | `string` (`Aqua`/`Terra`) | `string` (`SNPP`) | Operational satellite platform |
| **9** | `instrument` | `string` | `string` (`MODIS`) | `string` (`SNPP`) | Sensor instrument |
| **10** | `confidence` | `string` | `int64` ($0\text{--}100$) | `string` (`l`/`n`/`h`) | Detection confidence |
| **11** | `version` | `float64` / `int64` | `float64` (`61.03`) | `int64` (`2`) | FIRMS data processing collection version |
| **12** | `bright_t31` | `float64` | `float64` | `float64` | Channel 31 / I5 thermal infrared brightness temperature in Kelvin |
| **13** | `frp` | `float64` | `float64` | `float64` | Fire Radiative Power (MW) |
| **14** | `daynight` | `string` | `string` (`D`/`N`) | `string` (`D`/`N`) | Solar overpass flag (Day vs Night) |
| **15** | `type` | `int64` | `int64` | `int64` | FIRMS detection type flag |
| **16** | `sensor` | `string` | `string` (`MODIS`) | `string` (`VIIRS`) | Added during preprocessing for rapid indexing |
| **17** | `acq_datetime`| `string` (`ISO 8601`) | `string` | `string` | Added during preprocessing: `YYYY-MM-DDTHH:MM:00Z` |

- **Conclusion:** All datasets contain **17 columns**. Statements of "16 columns" originated before `acq_datetime` was appended in `preprocess_fires.py`.

