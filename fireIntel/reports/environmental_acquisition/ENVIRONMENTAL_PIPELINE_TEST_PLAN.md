# FIREINTEL — Environmental Data Pipeline Test Plan

**Phase:** Phase 5A: Environmental Data Acquisition Architecture & Pipeline Preparation  
**Target Domain:** Uttarakhand, India (`IN-UT`, `53,417.95 km²` in `EPSG:32644`)  
**Scope:** Test Specification, Unit Test Scenarios, Edge Cases, and Synthetic Fixtures for Future Implementation  
**Status:** Test Design Specification (Accompanied by Scaffolding Unit Tests in `fireIntel/tests/test_environmental_transformations.py`)

---

## 1. Testing Strategy Overview

The environmental data processing pipeline ingests external multidimensional arrays (NetCDF4, GeoTIFF, COG) and harmonizes them across space and time with our verified active-fire observations in [uttarakhand_fires_boundary.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv).

To guarantee absolute numerical precision and prevent silent failures or data leakage, the testing strategy is structured into four levels:

```
+-----------------------------------------------------------------------------------+
| Level 4: End-to-End Pipeline Integration & Leakage Assertion Tests                |
| (Verifies multi-source join, causal timestamps, no forward data leakage)          |
+-----------------------------------------------------------------------------------+
                                         ^
+-----------------------------------------------------------------------------------+
| Level 3: Spatial Alignment & Grid Hierarchy Validation Tests                       |
| (Verifies point-in-polygon, 0.05° SW-corner origin, 0.1° ERA5-Land parent lookup) |
+-----------------------------------------------------------------------------------+
                                         ^
+-----------------------------------------------------------------------------------+
| Level 2: Manifest Verification & Data Integrity Tests                             |
| (Verifies SHA-256 checksums, missing timestep detection, duplicate prevention)   |
+-----------------------------------------------------------------------------------+
                                         ^
+-----------------------------------------------------------------------------------+
| Level 1: Pure Mathematical & Thermodynamic Transformation Unit Tests              |
| (Verifies Kelvin->°C, RH, VPD, Wind Speed/Dir, Precipitation de-accumulation)     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Unit Test Scenarios & Mathematical Specifications

### 2.1 Test Module 1: Temperature Conversion (`test_temperature_conversion`)
- **Physical Formula:** $T_{°C} = T_K - 273.15$
- **Test Cases:**
  1. `Standard Freezing Point:` $273.15\text{ K} \implies 0.00\text{ °C}$ (exact float match within $\pm 10^{-5}$).
  2. `Standard Boiling Point:` $373.15\text{ K} \implies 100.00\text{ °C}$.
  3. `Sub-Zero Himalayan Winter:` $253.15\text{ K} \implies -20.00\text{ °C}$ (high-altitude ridge temperature).
  4. `Terai Pre-Monsoon Heatwave:` $318.15\text{ K} \implies 45.00\text{ °C}$ (foothill extreme fire weather).
- **Edge Cases:** Array containing negative Kelvin or temperatures exceeding physical Earth atmospheric bounds ($T_K < 150\text{ K}$ or $T_K > 350\text{ K}$) must trigger a `ValueError`.

---

### 2.2 Test Module 2: Relative Humidity and VPD Calculations (`test_rh_vpd_derivation`)
- **Thermodynamic Formula:**  
  Saturation vapor pressure via Alduchov-Eskridge / Magnus-Tetens:
  $$e_s(T) = 0.61078 \times \exp\left(\frac{17.27 \times T}{T + 237.3}\right) \quad [\text{kPa}]$$
  Actual vapor pressure:
  $$e_a(T_d) = 0.61078 \times \exp\left(\frac{17.27 \times T_d}{T_d + 237.3}\right) \quad [\text{kPa}]$$
  Relative Humidity:
  $$RH = 100.0 \times \frac{e_a}{e_s(T)} \quad [\%]$$
  Vapor Pressure Deficit:
  $$VPD = e_s(T) - e_a = e_s(T) \times \left(1.0 - \frac{RH}{100.0}\right) \quad [\text{kPa}]$$
- **Test Cases:**
  1. `Saturated Air (Dewpoint equals Temperature):`  
     $T = 20.0\text{ °C}, T_d = 20.0\text{ °C} \implies RH = 100.0\%, VPD = 0.000\text{ kPa}$.
  2. `Severe Fire Weather (High Temperature, Low Dewpoint):`  
     $T = 35.0\text{ °C}, T_d = 5.0\text{ °C} \implies e_s(35) \approx 5.628\text{ kPa}, e_a(5) \approx 0.872\text{ kPa} \implies RH \approx 15.50\%, VPD \approx 4.756\text{ kPa}$.
  3. `Moderate Spring Conditions:`  
     $T = 25.0\text{ °C}, T_d = 15.0\text{ °C} \implies RH \approx 53.84\%, VPD \approx 1.462\text{ kPa}$.
- **Edge Cases & Guardrails:**
  - *Supersaturation / Numerical Noise ($T_d > T$):* In real reanalysis arrays, numerical interpolation may occasionally produce $T_d = T + 0.01\text{ K}$. The calculation function must clamp $RH \le 100.0\%$ and $VPD \ge 0.0\text{ kPa}$ without throwing an unhandled exception.
  - *Extremely dry air ($RH < 0\%$):* Clamp $RH \ge 0.0\%$.

---

### 2.3 Test Module 3: Wind Speed and Direction (`test_wind_transformations`)
- **Formulas:**
  - Speed: $WS = \sqrt{u_{10}^2 + v_{10}^2}$
  - Meteorological Wind Direction (direction *from* which the wind blows, clockwise from North):
    $$\text{Dir} = (270° - \text{atan2}(v_{10}, u_{10}) \times \frac{180°}{\pi}) \pmod{360°} = (\text{atan2}(-u_{10}, -v_{10}) \times \frac{180°}{\pi}) \pmod{360°}$$
- **Test Cases:**
  1. `Pure Southerly Wind` ($u=0, v=10\text{ m/s}$, blowing from South toward North):  
     $WS = 10.0\text{ m/s}, \text{Dir} = 180.0°$.
  2. `Pure Northerly Wind` ($u=0, v=-10\text{ m/s}$, blowing from North toward South):  
     $WS = 10.0\text{ m/s}, \text{Dir} = 0.0°$ (or $360.0°$).
  3. `Pure Westerly Wind` ($u=10\text{ m/s}, v=0$, blowing from West toward East):  
     $WS = 10.0\text{ m/s}, \text{Dir} = 270.0°$.
  4. `Pure Easterly Wind` ($u=-10\text{ m/s}, v=0$, blowing from East toward West):  
     $WS = 10.0\text{ m/s}, \text{Dir} = 90.0°$.
  5. `South-Westerly Upslope Flow` ($u=10, v=10$):  
     $WS = 10\sqrt{2} \approx 14.142\text{ m/s}, \text{Dir} = 225.0°$.
  6. `Calm Air` ($u=0, v=0$):  
     $WS = 0.0\text{ m/s}, \text{Dir} = 0.0°$ (direction undefined, normalized vector components must safely evaluate to `0.0` without dividing by zero).

---

### 2.4 Test Module 4: ERA5-Land Precipitation De-Accumulation (`test_precipitation_deaccumulation`)
- **Accumulation Invariant:** In `reanalysis-era5-land`, forecast accumulation begins at `00:00 UTC` and resets to zero at `00:00 UTC` the following day.
- **De-accumulation Rule:**
  $$\Delta P_H = \begin{cases} P_{01:00} \times 1000.0 & \text{if } H = 01:00\text{ UTC} \\ \max(0.0, P_H - P_{H-1}) \times 1000.0 & \text{if } H \in \{02:00, \dots, 23:00\}\text{ UTC or } 00:00\text{ UTC (cycle end)} \end{cases}$$
- **Test Cases:**
  1. `Synthetic 48-Hour Accumulating Series:`
     - Day 1: $P$ increases from $0.001\text{ m}$ at 01:00 to $0.024\text{ m}$ at 24:00 (uniform $1\text{ mm/hr}$).
     - Midnight reset: Step 00:00 UTC Day 2 reads $0.024\text{ m}$ (total for Day 1), then step 01:00 UTC Day 2 resets to $0.002\text{ m}$ ($2\text{ mm}$ for that hour).
     - Expected output: Every hour of Day 1 produces exactly $1.0\text{ mm/hr}$; hour 01:00 of Day 2 produces exactly $2.0\text{ mm/hr}$.
  2. `Precipitation Inspection Diagnostic Guard:`  
     If a test feed already contains de-accumulated hourly rates (e.g. mean value $0.5\text{ mm/hr}$ without monotonic daily progression), the diagnostic function must flag `IS_ALREADY_DEACCUMULATED` and prevent secondary subtraction.
  3. `Numerical Underflow Protection:`  
     If small floating-point noise causes $P_H < P_{H-1}$ by $< 10^{-7}$, output is clipped to $0.0\text{ mm}$ rather than returning negative precipitation.

---

### 2.5 Test Module 5: UTC to IST Timezone Conversion (`test_utc_to_ist_conversion`)
- **Offset Invariant:** $\text{IST} = \text{UTC} + \text{05:30}$ strictly (India has no Daylight Saving Time adjustments).
- **Test Cases:**
  1. `Standard Afternoon Peak:`  
     `2025-04-15 08:30:00+00:00 UTC` $\implies$ `2025-04-15 14:00:00+05:30 IST`.
  2. `Midnight Date-Rollover:`  
     `2025-04-15 20:00:00+00:00 UTC` $\implies$ `2025-04-16 01:30:00+05:30 IST` (correctly shifts date from April 15 to April 16).
  3. `Local Fire Day Assignment:`  
     All observations between `2025-04-15 18:30:00 UTC` and `2025-04-16 18:29:59 UTC` must map to `date_ist = 2025-04-16`.

---

### 2.6 Test Module 6: Missing Timesteps and Temporal Completeness (`test_missing_timestamp_detection`)
- **Specification:** For study year 2025 (non-leap year, 365 days), hourly meteorological series must contain exactly:
  $$365 \times 24 = 8,760 \text{ hours}$$
- **Test Cases:**
  1. `Complete Series:` Feed complete 8,760-hour index $\implies$ returns `is_complete = True, missing_hours = 0`.
  2. `Injected Gap:` Remove 3 hours (`2025-06-15 03:00` to `05:00 UTC`) $\implies$ returns `is_complete = False, missing_hours = 3`, identifying the exact missing timestamps.
  3. `Duplicate Timestep Injection:` Inject repeated timestamp $\implies$ triggers `DuplicateTimestampError`.

---

### 2.7 Test Module 7: Grid Origin and Parent-Child Alignment (`test_grid_origin_alignment`)
- **Mathematical Specification:**
  - Master grid cell has South-West corner:
    $$\text{grid\_lat\_sw} = \text{floor}(\text{lat} / 0.05) \times 0.05, \quad \text{grid\_lon\_sw} = \text{floor}(\text{lon} / 0.05) \times 0.05$$
  - Centroid:
    $$\text{centroid\_lat} = \text{grid\_lat\_sw} + 0.025, \quad \text{centroid\_lon} = \text{grid\_lon\_sw} + 0.025$$
  - Parent ERA5-Land cell (grid node on multiple of 0.1):
    $$\text{parent\_lat} = \text{round}(\text{centroid\_lat}, 1), \quad \text{parent\_lon} = \text{round}(\text{centroid\_lon}, 1)$$
- **Test Cases:**
  1. `Exact 2x2 Sub-Cell Nesting:`
     For ERA5-Land parent node `(30.0, 78.0)`:
     - Sub-cell 1: SW `(29.95, 77.95)` $\implies$ centroid `(29.975, 77.975)` $\implies$ parent `(30.0, 78.0)`.
     - Sub-cell 2: SW `(29.95, 78.00)` $\implies$ centroid `(29.975, 78.025)` $\implies$ parent `(30.0, 78.0)`.
     - Sub-cell 3: SW `(30.00, 77.95)` $\implies$ centroid `(30.025, 77.975)` $\implies$ parent `(30.0, 78.0)`.
     - Sub-cell 4: SW `(30.00, 78.00)` $\implies$ centroid `(30.025, 78.025)` $\implies$ parent `(30.0, 78.0)`.
     All 4 sub-cells MUST map to parent `(30.0, 78.0)` with zero overlap across neighboring ERA5-Land nodes!
  2. `Misalignment Trap Validation:`  
     Verify that naively calculating `floor(lat / 0.1) * 0.1` produces an erroneous half-cell shift of `0.05°` (~5.5 km) away from the true ERA5-Land grid node, demonstrating why the round-to-nearest centroid algorithm is mandatory.

---

### 2.8 Test Module 8: Future Data Leakage Prevention (`test_causality_leakage_guard`)
- **Invariant:** At prediction issue time $T_0$ on date $D$, NO feature may incorporate observations from $t > T_0$.
- **Test Cases:**
  1. `Same-Day Weather Leakage Trap:`  
     If $T_0 = \text{2025-05-10 06:00 IST}$, a feature vector containing `temp_max` computed over `2025-05-10 00:00–23:59 IST` MUST FAIL the causality assertion (because maximum temperature occurs around 14:00–16:00 IST, which is $> T_0$).
  2. `16-Day Vegetation Composite End-Date Guard:`  
     A MODIS composite with date window `[2025-05-01, 2025-05-16]` and 3-day delivery latency cannot be included in any feature store record where $T_0 < \text{2025-05-19}$. The validator must reject it for $T_0 = \text{2025-05-10}$.
  3. `Antecedent Rainfall Lookback Integrity:`  
     Verify that 3-day antecedent rainfall for $T_0 = \text{2025-05-10 00:00 IST}$ spans strictly `[2025-05-07 00:00, 2025-05-09 23:59 IST]`.

---

## 3. Summary of Synthetic Fixture Suite

All unit tests are executed under `pytest` with zero external dependencies and zero network access using lightweight synthetic NumPy and Pandas fixtures.

| Fixture Name | Description | Output Structure |
| :--- | :--- | :--- |
| `synthetic_kelvin_series` | Boundary temperatures from 250K to 325K | `np.ndarray` float64 |
| `synthetic_rh_vpd_inputs` | Coordinated temperature and dewpoint grids | `tuple[np.ndarray, np.ndarray]` |
| `synthetic_wind_vectors` | Cardinal and diagonal $(u, v)$ velocity vectors | `tuple[np.ndarray, np.ndarray]` |
| `synthetic_era5l_precip_cycle` | 48-hour accumulating series with 00:00 UTC resets | `pd.DataFrame` with `time_utc`, `tp_m` |
| `synthetic_grid_coords` | Sample latitude/longitude points over Uttarakhand | `pd.DataFrame` with `lat`, `lon` |
| `synthetic_causal_records` | Mock feature store rows with simulated $T_0$ and feature dates | `pd.DataFrame` with feature timestamps |

