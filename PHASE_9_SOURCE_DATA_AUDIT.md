# FIREINTEL — PHASE 9 SOURCE DATA AUDIT
**Project**: NASA Space Apps Challenge 2026 // Wildland Fire Intelligence for Uttarakhand, India  
**Phase**: Phase 9 — Harmonised Data Migration & ML Foundation Integration  
**Date**: November 15, 2026  
**Auditor**: Antigravity Autonomous Agent  
**Branch**: `migration/phase9-harmonised-data`  
**Status**: COMPLETE (Audit & Inspection Complete; Awaiting Approval to Migrate)

---

## 1. Executive Summary

This audit report documents the empirical inspection of the new incoming harmonised dataset provided in:
`fireIntel/data/incoming/harmonised/final_consolidated_master.xlsx`

The inspection followed the strict zero-fabrication protocol. The workbook was audited at both the file container level (OpenXML package inspection) and the tabular data level (vectorized spatial, temporal, physical, and statistical validation).

### Key Audit Findings at a Glance

| Metric / Dimension | Value | Scientific Significance |
| :--- | :--- | :--- |
| **Incoming File** | `final_consolidated_master.xlsx` | 42,776,029 bytes (~40.8 MB) |
| **SHA-256 Checksum** | `dfeb76a26322ad48483bda4f51bc72422be220f83fc44f808fe376174bb0df54` | Cryptographic signature of incoming source |
| **Worksheets Present** | Exactly 1 (`final_consolidated_master`) | No hidden sheets, no separate model sheets, no formula cells |
| **Total Record Count** | **510,299 rows** | 67.7x larger than legacy 2025 baseline (7,541 rows) |
| **Total Columns** | **16 columns** | Engineered feature matrix for machine learning |
| **Duplicate Rows** | **0 duplicates (0.00%)** | Clean deduplication across all 16 columns |
| **Missing Values (Nulls)**| **0 nulls (0.00%)** | Fully imputed / complete feature matrix |
| **Latitude Range** | `[28.0000°N, 31.0000°N]` | Rectangular integer bounding box |
| **Longitude Range** | `[77.0000°E, 81.0000°E]` | Rectangular integer bounding box |
| **Uttarakhand Polygon Validated** | **240,365 records (47.10%)** | Strictly inside official Survey of India boundary |
| **Outside Uttarakhand Boundary** | **269,934 records (52.90%)** | Outside boundary (UP, Haryana, Delhi, HP) |
| **Sensors** | VIIRS: 414,512 (81.23%)<br>MODIS: 95,787 (18.77%) | Dual-sensor harmonised satellite records |
| **Satellites** | Suomi-NPP: 414,512 (81.23%)<br>Aqua: 57,843 (11.33%)<br>Terra: 37,944 (7.44%) | Polar-orbiting NASA/NOAA constellation |
| **Confidence Harmonisation** | Categorical: `n` (86.84%), `l` (9.73%), `h` (3.43%) | MODIS numeric confidence mapped to VIIRS categorical scale |
| **Temporal Features** | `month_sin`, `month_cos`, `hour_sin`, `hour_cos` | Cyclical features only; no date strings or years present |
| **Model Artifacts in File** | **None** | No `.pkl`, `.joblib`, `.onnx`, `.xgb`, or evaluation tables |

---

## 2. Tabular Schema & Data Types

The 16 columns of `final_consolidated_master` represent a machine learning training/feature matrix:

| Column Name | Storage Type | Pandas Dtype | Missing Count | Unique Values | Description & Physical Units |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `latitude` | Float | `float64` | 0 (0.0%) | 217,954 | Hotspot center latitude in WGS84 decimal degrees |
| `longitude` | Float | `float64` | 0 (0.0%) | 253,544 | Hotspot center longitude in WGS84 decimal degrees |
| `brightness` | Float | `float64` | 0 (0.0%) | 6,539 | Brightness temperature in Kelvin (MODIS Ch21/22 or VIIRS I-4) |
| `scan` | Float | `float64` | 0 (0.0%) | 111 | Spatial scan pixel size along scan direction (km) |
| `track` | Float | `float64` | 0 (0.0%) | 71 | Spatial track pixel size along track direction (km) |
| `confidence_class` | String | `object` | 0 (0.0%) | 3 | Harmonised confidence level: `'n'` (nominal), `'l'` (low), `'h'` (high) |
| `bright_t31` | Float | `float64` | 0 (0.0%) | 6,241 | Channel 31 / I-5 brightness temperature in Kelvin |
| `frp` | Float | `float64` | 0 (0.0%) | 5,667 | Fire Radiative Power in Megawatts (MW) |
| `daynight` | String | `object` | 0 (0.0%) | 2 | Solar illumination flag: `'D'` (Day), `'N'` (Night) |
| `month_sin` | Float | `float64` | 0 (0.0%) | 9 | Cyclical month sine component: $\sin(2\pi \cdot \text{month} / 12)$ |
| `month_cos` | Float | `float64` | 0 (0.0%) | 9 | Cyclical month cosine component: $\cos(2\pi \cdot \text{month} / 12)$ |
| `hour_sin` | Float | `float64` | 0 (0.0%) | 11 | Cyclical hour sine component: $\sin(2\pi \cdot \text{hour} / 24)$ |
| `hour_cos` | Float | `float64` | 0 (0.0%) | 11 | Cyclical hour cosine component: $\cos(2\pi \cdot \text{hour} / 24)$ |
| `satellite` | String | `object` | 0 (0.0%) | 3 | Spacecraft identifier: `'SNPP'`, `'Aqua'`, `'Terra'` |
| `sensor` | String | `object` | 0 (0.0%) | 2 | Radiometer instrument: `'VIIRS'`, `'MODIS'` |
| `type` | Integer | `int64` | 0 (0.0%) | 2 | FIRMS hotspot category: `0` (vegetation fire), `2` (static land source) |

---

## 3. Geospatial Audit & Boundary Validation

The incoming dataset was pre-filtered by the source team using an integer bounding box:
$$\text{Latitude} \in [28.0000^\circ\text{N}, 31.0000^\circ\text{N}], \quad \text{Longitude} \in [77.0000^\circ\text{E}, 81.0000^\circ\text{E}]$$

However, Uttarakhand's official administrative boundary (Survey of India polygon, EPSG:4326) spans:
$$\text{Latitude} \in [28.7229^\circ\text{N}, 31.4561^\circ\text{N}], \quad \text{Longitude} \in [77.5723^\circ\text{E}, 81.0453^\circ\text{E}]$$

1. **Inclusion of Non-Uttarakhand Records (52.90% of dataset)**:
   - Only **240,365 records (47.10%)** fall strictly within the official Uttarakhand state boundary.
   - **269,934 records (52.90%)** are located in neighboring states (Western UP, Haryana, Himachal Pradesh, Delhi NCR).
2. **Truncation of Northern Uttarakhand Alpine & Himalayan Fire Observations**:
   - The northernmost point of Uttarakhand reaches **31.4561°N**.
   - Because the incoming file was clipped at **latitude $\le$ 31.0000°N**, all fire detections in northern Uttarkashi and Chamoli above 31.0°N were omitted during source generation.

---

## 4. Temporal Audit: Cyclical Decoding & Date Absence

The dataset contains no standard date strings (`acq_date`), timestamps (`acq_time`), or calendar year identifiers. Instead, time is encoded as cyclical trigonometric pairs.

Decoded Monthly Distribution:
- **Peak fire season**: April (**28.17%**, 143,735) and May (**24.17%**, 123,324).
- **March fire onset**: 9.48% (48,396).
- **Monsoon minimum**: July (0.11%), August (0.08%), September (0.26%).
- **Pre-monsoon fire concentration in Uttarakhand**: April + May account for **61.18%** of all observations inside Uttarakhand.

Decoded Diurnal Distribution:
- **Daytime Passes (`daynight == 'D'`)**: Concentrated between **03:00 UTC and 10:00 UTC** (08:30 to 15:30 IST), peaking at 07:00 UTC and 08:00 UTC.
- **Nighttime Passes (`daynight == 'N'`)**: Concentrated between **16:00 UTC and 22:00 UTC** (21:30 to 03:30 IST), peaking at 20:00 UTC.

---

## 5. Sensor & Physical Radiometry

- **Sensors**: VIIRS (414,512 / 81.23%) and MODIS (95,787 / 18.77%).
- **Confidence**: Categorical: `'n'` (86.84%), `'l'` (9.73%), `'h'` (3.43%).
- **FRP Characteristics**:
  - MODIS: Mean 16.57 MW, Median 10.70 MW, Max 957.50 MW.
  - VIIRS: Mean 4.26 MW, Median 2.92 MW, Max 381.08 MW.
  - Aligns with spatial resolution physics (VIIRS 375m vs MODIS 1km).
