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

## 2. Workbook Architecture & Container Inspection

The OpenXML package structure of `final_consolidated_master.xlsx` was unpacked and inspected:
```
final_consolidated_master.xlsx (ZIP Container)
├── [Content_Types].xml
├── _rels/.rels
├── xl/
│   ├── workbook.xml                     <-- 1 worksheet defined: "final_consolidated_master"
│   ├── _rels/workbook.xml.rels
│   ├── styles.xml
│   ├── sharedStrings.xml
│   ├── theme/theme1.xml
│   ├── drawings/drawing1.xml            <-- Empty drawing canvas (<xdr:wsDr/>)
│   ├── persons/person.xml               <-- Empty threaded comment user list
│   └── worksheets/
│       ├── sheet1.xml                   <-- 510,299 data rows + 1 header row
│       └── _rels/sheet1.xml.rels
```

- **Sheet State**: The single worksheet `final_consolidated_master` is visible (`state="visible"`). There are no veryHidden or hidden worksheets.
- **Formula Cells**: 0 formula cells. All cells are static literal floats, integers, or shared strings.
- **Charts / Shapes**: None. The drawing canvas contains 0 shapes, 0 embedded images, and 0 charts.

---

## 3. Tabular Schema & Data Types

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

## 4. Geospatial Audit & Boundary Validation

### 4.1 Bounding Box Discrepancy & Geographic Extent

The incoming dataset was pre-filtered by the source team using an integer bounding box:
$$\text{Latitude} \in [28.0000^\circ\text{N}, 31.0000^\circ\text{N}], \quad \text{Longitude} \in [77.0000^\circ\text{E}, 81.0000^\circ\text{E}]$$

However, Uttarakhand's official administrative boundary (Survey of India polygon, EPSG:4326) spans:
$$\text{Latitude} \in [28.7229^\circ\text{N}, 31.4561^\circ\text{N}], \quad \text{Longitude} \in [77.5723^\circ\text{E}, 81.0453^\circ\text{E}]$$

This integer bounding box introduces two critical scientific discrepancies:

1. **Inclusion of Non-Uttarakhand Records (52.90% of dataset)**:
   - Only **240,365 records (47.10%)** fall strictly within the official Uttarakhand state boundary.
   - **269,934 records (52.90%)** are located in neighboring states:
     - Western Uttar Pradesh (Saharanpur, Muzaffarnagar, Bijnor, Moradabad, Rampur, Bareilly, Pilibhit agricultural residue burns).
     - Eastern Haryana (Yamunanagar, Karnal).
     - Himachal Pradesh (Sirmaur, Solan, Shimla foothills).
     - Delhi NCR periphery.

2. **Truncation of Northern Uttarakhand Alpine & Himalayan Fire Observations**:
   - The northernmost point of Uttarakhand (in Uttarkashi and Chamoli districts) reaches **31.4561°N**.
   - Because the incoming file was clipped at **latitude $\le$ 31.0000°N**, all fire detections in northern Uttarkashi and Chamoli above 31.0°N were omitted during source generation.

```
       31.46°N +------------------------+  <-- Actual Uttarakhand Northern Apex
               |  Chamoli / Uttarkashi  |      (TRUNCATED by incoming dataset)
       31.00°N +========================+  <-- Incoming Dataset Upper Latitude Cutoff
               |                        |
               |      UTTARAKHAND       |
               |    (240,365 points)    |
               |                        |
       28.72°N +------------------------+  <-- Actual Uttarakhand Southern Boundary
               |   Western UP / NCR     |
               |    (269,934 points)    |      (INCLUDED in incoming dataset)
       28.00°N +========================+  <-- Incoming Dataset Lower Latitude Cutoff
              77.00°E                81.00°E
```

---

## 5. Temporal Audit: Cyclical Decoding & Date Absence

The dataset contains **no standard date strings** (`acq_date`), timestamps (`acq_time`, `acq_datetime`), or calendar year identifiers. Instead, time is encoded as cyclical trigonometric pairs.

Using inverse trigonometric decoding:
$$\text{Month} = \text{round}\left(\frac{\text{atan2}(\sin, \cos) \pmod{2\pi}}{2\pi / 12}\right), \quad \text{Hour} = \text{round}\left(\frac{\text{atan2}(\sin, \cos) \pmod{2\pi}}{2\pi / 24}\right)$$

### 5.1 Decoded Monthly Distribution

| Month | Name | Entire Dataset (510,299) | Uttarakhand Validated (240,365) | Seasonal Phenomenon |
| :---: | :--- | :---: | :---: | :--- |
| **1** | January | 27,348 (5.36%) | 11,008 (4.58%) | Winter agricultural clearing / biomass burning |
| **2** | February | 34,905 (6.84%) | 11,229 (4.67%) | Late winter clearing |
| **3** | March | 48,396 (9.48%) | 20,524 (8.54%) | Fire season onset; warming temperatures |
| **4** | April | **143,735 (28.17%)** | **75,601 (31.45%)** | **Peak Himalayan wildfire & rabi stubble season** |
| **5** | May | **123,324 (24.17%)** | **71,468 (29.73%)** | **Peak pre-monsoon wildfire season** |
| **6** | June | 33,879 (6.64%) | 25,278 (10.52%) | Late pre-monsoon fires; monsoon onset |
| **7** | July | 548 (0.11%) | 163 (0.07%) | Active Southwest Monsoon (fires extinguished) |
| **8** | August | 388 (0.08%) | 99 (0.04%) | Heavy monsoon precipitation minimum |
| **9** | September | 1,320 (0.26%) | 107 (0.04%) | Late monsoon minimum |
| **10** | October | 33,192 (6.50%) | 8,950 (3.72%) | Post-monsoon kharif residue burning onset |
| **11** | November | 25,504 (5.00%) | 6,223 (2.59%) | Indo-Gangetic Plain residue burn period |
| **12** | December | 37,760 (7.40%) | 9,715 (4.04%) | Winter biomass burning |

**Observation**: The decoded monthly distribution shows strong physical validity:
- **April and May account for 61.18% of all Uttarakhand fire observations**, exactly matching the documented Himalayan wildfire regime.
- **Monsoon months (July–September) drop to 0.15%**, matching cloud cover and heavy rainfall extinguishment.

### 5.2 Decoded Diurnal (Hourly) Distribution

Cross-tabulation of decoded hours against the `daynight` flag:
- **Daytime Passes (`daynight == 'D'`)**: Concentrated between **03:00 UTC and 10:00 UTC** (08:30 to 15:30 IST), corresponding to Terra (~10:30 local) and Aqua/SNPP (~13:30 local) daytime orbits. Peak occurs at 07:00 UTC (12:30 IST) and 08:00 UTC (13:30 IST).
- **Nighttime Passes (`daynight == 'N'`)**: Concentrated between **16:00 UTC and 22:00 UTC** (21:30 to 03:30 IST), corresponding to nighttime ascending/descending passes. Peak occurs at 20:00 UTC (01:30 IST).

---

## 6. Sensor, Satellite & Radiometric Physics Audit

### 6.1 Satellite & Sensor Matrix

| Sensor | Satellite | Total Observations | Uttarakhand Validated | Spatial Resolution |
| :--- | :--- | :---: | :---: | :--- |
| **VIIRS** | Suomi-NPP (`SNPP`) | 414,512 (81.23%) | 201,993 (84.04%) | 375 m (I-bands) |
| **MODIS** | Aqua | 57,843 (11.33%) | 22,578 (9.39%) | 1,000 m (Channels 21/22/31) |
| **MODIS** | Terra | 37,944 (7.44%) | 15,794 (6.57%) | 1,000 m (Channels 21/22/31) |
| **Total** | — | **510,299** | **240,365** | — |

### 6.2 Confidence Harmonisation

The team unified MODIS and VIIRS confidence into three categories: `'l'` (low), `'n'` (nominal), `'h'` (high):

| Sensor | Low (`'l'`) | Nominal (`'n'`) | High (`'h'`) | Total |
| :--- | :---: | :---: | :---: | :---: |
| **MODIS** | 4,359 (4.55%) | 80,934 (84.49%) | 10,494 (10.96%) | 95,787 |
| **VIIRS** | 45,287 (10.93%) | 362,197 (87.38%) | 7,028 (1.70%) | 414,512 |
| **Combined** | **49,646 (9.73%)** | **443,131 (86.84%)** | **17,522 (3.43%)** | **510,299** |

### 6.3 Fire Radiative Power (FRP) Radiometric Characteristics

| FRP Metric (MW) | Combined (510,299) | MODIS (95,787) | VIIRS (414,512) | Scientific Rationale |
| :--- | :---: | :---: | :---: | :--- |
| **Minimum** | 0.00 MW | 0.00 MW | 0.07 MW | VIIRS detection limit is lower due to 375m pixels |
| **25th Percentile** | 1.81 MW | 6.80 MW | 1.54 MW | MODIS integrates over 1 km² pixels |
| **Median (50%)** | 3.73 MW | 10.70 MW | 2.92 MW | MODIS median is 3.7x higher than VIIRS |
| **Mean** | 6.57 MW | 16.57 MW | 4.26 MW | MODIS mean is 3.9x higher than VIIRS |
| **75th Percentile** | 7.18 MW | 17.60 MW | 5.37 MW | VIIRS captures lower-intensity smoldering fires |
| **95th Percentile** | 20.72 MW | 46.70 MW | 11.67 MW | Extreme fires detected by both sensors |
| **99th Percentile** | 49.68 MW | 97.90 MW | 25.28 MW | Severe wildfire events |
| **Maximum** | 957.50 MW | 957.50 MW | 381.08 MW | Highest intensity crown fire event |

---

## 7. Comparison: Incoming Dataset vs Legacy 2025 Baseline

| Feature / Dimension | Legacy Baseline (`uttarakhand_fires_boundary.parquet`) | Incoming Harmonised Dataset (`final_consolidated_master.xlsx`) |
| :--- | :--- | :--- |
| **Total Rows** | 7,541 | 510,299 (240,365 in Uttarakhand) |
| **Temporal Coverage** | Single Year (2025: Jan 1 to Dec 31) | Multi-year historical (reconstructed months 1–12) |
| **Explicit Dates** | Yes (`acq_date` ISO-8601 strings) | **No** (encoded as `month_sin`, `month_cos`) |
| **Explicit Times** | Yes (`acq_time` HHMM format) | **No** (encoded as `hour_sin`, `hour_cos`) |
| **Geographic Scope** | Strictly inside Uttarakhand polygon (100%) | Regional bounding box (47.1% inside Uttarakhand) |
| **Confidence Scale** | Split: numeric (MODIS) + categorical (VIIRS) | Harmonised into 3 classes (`l`, `n`, `h`) |
| **Static Land Sources** | Filtered to vegetation fires | Explicitly labelled (`type` 0 vs 2) |
| **Storage Size** | 243 KB (Parquet) | 40.8 MB (XLSX) / ~18 MB (estimated Parquet) |

---

## 8. Audit Summary & Next Step Directives

1. **The dataset is structurally sound and clean**: 0 nulls, 0 duplicates, highly realistic radiometric and seasonal distributions.
2. **Boundary clipping is mandatory for Uttarakhand views**: If imported directly without polygon clipping, 52.9% of displayed points will be in Uttar Pradesh, Haryana, and Delhi.
3. **Canonical schema must preserve decoded temporal fields**: To support existing frontend filters and time charts, `decoded_month`, `decoded_hour`, and estimated season must be generated during ingestion.
4. **No model artifacts are present**: The ML validation report (Section 9) addresses the reported 99.17% accuracy claim.
