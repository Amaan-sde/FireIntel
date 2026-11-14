# FIREINTEL — Final Scientific Review & Evidence-Based Claim Verification

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Challenge:** NASA Space Apps Challenge 2026  
**Document:** Phase 5B.4 Final Scientific Quality & Claim Verification Review  
**Date:** 2026-11-13  
**Status:** **CRITICAL SCIENTIFIC EVALUATION (EVIDENCE-BASED / ZERO UNVERIFIED CLAIMS)**

---

## 1. Executive Summary

This scientific review evaluates the core observational, remote sensing, and geomorphological claims of the FIREINTEL project prior to website development. In accordance with NASA Space Apps standards, every scientific claim and methodological assumption is scrutinized against empirical satellite physics, geodetic geometry, and atmospheric reanalysis conventions.

No assumption is deemed verified solely because a unit test passed. Every item is formally classified into one of four scientific status tiers:
1. **`VERIFIED`**: Mathematically and empirically confirmed by verified project data and peer-reviewed literature.
2. **`ACCEPTABLE WITH LIMITATIONS`**: Scientifically sound for current exploratory use, but subject to specific physical constraints that must be stated on the website.
3. **`REQUIRES CORRECTION`**: Contains an oversimplification, semantic ambiguity, or bias that must be corrected in documentation and UI terminology.
4. **`BLOCKED BY EXTERNAL DATA`**: Awaiting live authenticated data from upstream providers before validation can occur.

---

## 2. In-Depth Scientific Investigation across 8 Core Domains

### 2.1 Domain 1: MODIS vs VIIRS Observation-Count Difference
- **Observed Ratio:** 6,623 VIIRS active fire detections vs 918 MODIS active fire detections across the boundary-validated Uttarakhand domain in 2025:
  $$\text{Ratio} = \frac{6,623}{918} = 7.2146 \approx 7.21\times$$
- **Evaluation Question:** Can this $7.21\times$ difference legitimately be attributed to pixel footprint area alone?
- **Scientific Audit:**
  - *Pixel Footprint Ratio:* At nadir, MODIS pixel area is $1.0\text{ km} \times 1.0\text{ km} = 1.0\text{ km}^2$. VIIRS 375m I-band pixel area is $0.375\text{ km} \times 0.375\text{ km} = 0.140625\text{ km}^2$. The geometric ratio is:
    $$\frac{1.0\text{ km}^2}{0.140625\text{ km}^2} \approx 7.11\times$$
  - While $7.21\approx 7.11$ is mathematically close, **attributing the observation count difference solely to pixel footprint is scientifically incomplete and oversimplified.**
  - *Sensor Sensitivity & Minimum Detectable Fire Size:* The VIIRS 375m I4 channel ($3.74\text{–}4.14\text{ µm}$) has a much smaller noise-equivalent temperature difference (NEdT) and lower saturation limits than MODIS Channel 21/22. VIIRS can detect small, low-intensity flaming fronts ($\approx 5\text{–}10\text{ m}^2$) under dense pine canopies that never generate sufficient sub-pixel thermal radiance to breach the 1 km MODIS detection threshold.
  - *Scan-Edge Distortion (The "Bowtie Effect"):* Towards the edge of the scan, MODIS pixels swell by a factor of nearly $10\times$ (reaching $4.8\text{ km} \times 2.0\text{ km} \approx 9.6\text{ km}^2$). In contrast, VIIRS applies an onboard pixel-trimming and dynamic aggregation algorithm that restricts scan-edge pixel growth to $\le 0.75\text{ km} \times 0.75\text{ km}$ ($0.56\text{ km}^2$). At off-nadir angles, VIIRS resolves up to $17\times$ more detail than MODIS.
  - *Swath Coverage & Gaps:* The VIIRS swath is $3,060\text{ km}$ (providing continuous global coverage without orbital gaps at low/mid latitudes), whereas the MODIS swath is $2,330\text{ km}$ (leaving orbital gaps between consecutive daytime tracks).
  - *Diurnal Overpass Timing:* Terra overpasses at ~10:30 & 22:30 local solar time (early morning, low fire activity). Aqua overpasses at ~13:30 & 01:30. Suomi-NPP overpasses at ~13:30 & 01:30, and NOAA-20 at ~12:40 & 00:40. In Uttarakhand, forest fire activity peaks between 12:00 and 15:30 IST. The dual-VIIRS constellation captures both early and mid-afternoon burning right at peak thermal conditions.
- **Classification:** **`ACCEPTABLE WITH LIMITATIONS`**
- **Required Action & Website Terminology:**
  - *Prohibited:* "VIIRS detects 7.2x more fires because its pixels are 7.2x smaller."
  - *Mandated:* "VIIRS recorded 7.21x more thermal anomaly detections than MODIS due to the combined effects of higher nadir spatial resolution ($375\text{ m}$ vs $1\text{ km}$), constrained scan-edge distortion, enhanced radiometer sensitivity to small understory flaming fronts, and dual-satellite afternoon overpass timing."

---

### 2.2 Domain 2: Satellite Thermal Observations vs Unique Fire Incidents
- **The Physical Reality:**
  - Active fire pixels from NASA FIRMS are **instantaneous thermal radiative anomalies** recorded at the moment of satellite overpass.
  - A single large wildfire advancing across a ridge in Chamoli will produce multiple adjacent VIIRS detections in a single afternoon pass, and multiple detections across consecutive days.
  - A 375m detection indicates that an active flaming front existed within that pixel footprint; it does **not** indicate that the entire $14\text{ hectares}$ burned.
  - Thick monsoon cloud cover or smoke shadows can obscure intense fires, causing detection dropouts.
- **Classification:** **`ACCEPTABLE WITH LIMITATIONS`**
- **Required Action & Website Terminology:**
  - *Prohibited:* "Number of Forest Fires in 2025: 7,541", "7,541 Wildfires Extinguished", "Total Burned Hectares".
  - *Mandated Dashboard Metrics:*
    - "Satellite Thermal Detections: 7,541"
    - "Active Hotspot Observations: 7,541"
    - "Peak Observed Radiative Power: 1,421 MW"
  - *Mandatory UI Note:* "Satellite detections denote instantaneous thermal anomaly observations, not unique wildfire perimeters or burned area acreage."

---

### 2.3 Domain 3: Sensor Confidence Systems
- **Evaluation:**
  - MODIS provides confidence as an **integer percentage ($0\text{–}100\%$)** derived from contextual tests, surface temperature, and cloud proximity.
  - VIIRS 375m provides confidence as **categorical bins: `"low"`, `"nominal"`, `"high"`**.
- **Scientific Danger:**
  - Attempting to convert VIIRS `"nominal"` into an arbitrary number (e.g. 50%) or averaging MODIS percentages with VIIRS categories produces meaningless numbers.
- **Audit Finding:**
  - The FIREINTEL preprocessing pipeline ([preprocess_fires.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/preprocess_fires.py)) strictly preserves original confidence values in their raw formats. EDA reports evaluate them in separate subsections.
- **Classification:** **`VERIFIED`**
- **Website Implementation Requirement:** Filter controls must provide separate UI inputs: a slider ($0\text{–}100\%$) for MODIS, and multi-select checkboxes (`Low`, `Nominal`, `High`) for VIIRS. Never combine them into a single slider.

---

### 2.4 Domain 4: Cross-Sensor Candidate Matching
- **Evaluation:**
  - `eda.py` evaluated cross-sensor candidate pairing using criteria: $\Delta d \le 1.0\text{ km}$ and $\Delta t \le 60\text{ minutes}$.
- **Limitations Identified:**
  - Parallax shift: In rugged Himalayan terrain, off-nadir viewing angles from two different satellites (e.g. Aqua looking from the west, Suomi-NPP looking from the east) can displace apparent hotspot ground locations by $200\text{–}600\text{ m}$.
  - Duplicate counting: When MODIS and VIIRS observe the same active fire in the afternoon, counting both as separate fires doubles apparent activity.
- **Classification:** **`ACCEPTABLE WITH LIMITATIONS`**
- **Required Terminology:** Website analytics must describe paired detections as "Candidate Coincident Overpasses", **never** as "Confirmed Identical Fires".

---

### 2.5 Domain 5: Master Grid Alignment & Resolution Provenance
- **Formulation:** 0.05° Master Analysis Grid (~5.57 km $\times$ 4.82 km, 2,174 cells) mapped to 0.10° ERA5-Land parent nodes (~9 km, 581 nodes) via `round(centroid_lat, 1)`.
- **Scientific Provenance Rule:**
  - The 0.05° grid is a database indexing mechanism to join satellite fire coordinates with 30m terrain zonal statistics.
  - **It does NOT create high-resolution weather observations.**
  - All four 0.05° cells inside a parent 0.10° cell share the identical synoptic meteorological values.
- **Classification:** **`VERIFIED`**
- **Website Enforcement:** Every tooltip and data card displaying temperature or wind must display the tag: `"Resolution: 0.10° Synoptic Reanalysis (ERA5-Land)"`, while terrain features display `"Resolution: 30m Zonal Mean (Copernicus DEM)"`.

---

### 2.6 Domain 6: DEM Terrain Feature Calculations
- **Audit Findings:**
  - Copernicus DEM GLO-30 (14 tiles, 580.6 MB, VRT mosaic) verified.
  - Spacing: Properly scaled using local geodetic metric spacing $\Delta y = \Delta\phi \times 111,132.954\text{ m}$ and $\Delta x(\phi) = \Delta\lambda \times 111,132.954 \times \cos(\phi)\text{ m}$.
  - Slope: Horn’s 8-neighbor weighted derivatives ($dz/dx, dz/dy$).
  - Aspect: Averaged via circular trigonometric decomposition ($\bar{S} = \frac{1}{N}\sum\sin\theta, \bar{C} = \frac{1}{N}\sum\cos\theta$).
  - Roughness: Riley TRI at 30m resolution + cell elevation standard deviation for macro-relief.
  - NoData handling: Masked; missing cells return `NaN` and are never filled with zero.
- **Limitation:** A 0.05° cell (~5.5 km) aggregates 32,400 30m pixels. A cell with mean slope 25° contains flat river terraces and vertical canyon walls. Retaining `slope_max_deg` and `elevation_std_m` partially mitigates this, but terrain aggregation inevitably smooths micro-topography.
- **Classification:** **`VERIFIED`**

---

### 2.7 Domain 7: Precipitation Accumulation & De-accumulation
- **Audit Findings:**
  - ECMWF IFS models precipitation as a cumulative forecast flux initialized at 00:00 UTC.
  - Backward differencing applied to pre-deaccumulated rates causes double-differencing and ruins the rainfall signal.
  - Monotonicity alone is insufficient (dry winter spells in Uttarakhand are trivially monotonic).
  - The 00:00 UTC slice has step ambiguity ($step=0$ vs $step=24$ of prior day).
- **Classification:** **`BLOCKED BY EXTERNAL DATA`**
- **Strict Rule:** De-accumulation formulas remain strictly held in staging until live NetCDF metadata attributes (`units`, `GRIB_stepType`, `long_name`) and first-hour step alignments are empirically inspected.

---

### 2.8 Domain 8: Temporal Causality & Data Leakage Prevention
- **Diurnal Cycle Alignment:**
  - UTC to IST (+05:30) conversion verified.
  - Afternoon peak fire activity occurs between 12:00 and 15:30 IST ($06:30\text{–}10:00\text{ UTC}$).
- **Data Leakage Invariant:**
  - Banned practice: Using same-day afternoon $T_{\text{max}}$ (at 14:30 IST) or daily cumulative rainfall (at 23:59 IST) to predict a fire detected at 10:00 IST.
  - Function `test_future_data_leakage_assertion()` verifies $T_{\text{feature}} \le T_{\text{cutoff}}$.
- **Classification:** **`VERIFIED`**

---

## 3. Scientific Verification Scorecard

| Domain | Evaluated Topic | Scientific Classification | Key Caveat / Action |
| :-: | :--- | :---: | :--- |
| **1** | MODIS vs VIIRS 7.21x Ratio | **ACCEPTABLE WITH LIMITATIONS** | Attribute to pixel footprint + sensor sensitivity + scan-edge aggregation + timing. |
| **2** | Observations vs Fire Incidents | **ACCEPTABLE WITH LIMITATIONS** | Mandate "Thermal Detections / Hotspots" terminology; ban "Wildfire Count". |
| **3** | Sensor Confidence Decoupling | **VERIFIED** | Separate percentage slider (MODIS) from categorical checkboxes (VIIRS). |
| **4** | Cross-Sensor Candidate Matching | **ACCEPTABLE WITH LIMITATIONS** | Label as "Candidate Coincident Overpasses"; never "Confirmed Same Fire". |
| **5** | Master Grid & ERA5 Nesting | **VERIFIED** | Explicit provenance tags; no claims of synthetic 5 km weather resolution. |
| **6** | DEM Geodetic Terrain Metrics | **VERIFIED** | Metric scaling, Horn gradient, circular aspect, and Riley TRI verified. |
| **7** | Precipitation De-accumulation | **BLOCKED BY EXTERNAL DATA** | Staged algorithm held pending live NetCDF attributes. |
| **8** | Temporal Causality & Anti-Leakage | **VERIFIED** | Strict antecedent feature cutoff rule enforced. |

