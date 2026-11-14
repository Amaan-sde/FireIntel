# FIREINTEL — Phase 4: Environmental Data Source Feasibility Audit

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Study Region:** Uttarakhand, India (`IN-UT`, `53,417.95 km²` in `EPSG:32644`)  
**Study Period Audited:** 1 January 2025 – 31 December 2025 (`UTC`)  
**Audit Status:** Feasibility & Architecture Design Only — **No datasets downloaded, no existing files modified, and no feature engineering or ML implemented.**

---

## Executive Summary

Satellite active-fire detections alone capture *where and when thermal anomalies were observed*, not the atmospheric drying, fuel accumulation, moisture stress, or topographic fire-spread potential driving those ignitions. In Phases 1–3, FIREINTEL established a clean, boundary-validated 2025 dataset ([uttarakhand_fires_boundary.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv)) containing **`7,541` observations** (`6,623` VIIRS, `87.83%`; `918` MODIS, `12.17%`) spanning **`239` active UTC days** (`2025-01-01 07:43 UTC` to `2025-12-31 21:28 UTC`) inside [uttarakhand_boundary.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/boundaries/uttarakhand_boundary.geojson), revealing a strong bimodal seasonal signal (**April peak: `2,255` obs**; **December peak: `1,678` obs**; `1,168` active `0.05°` grid cells).

This Phase 4 feasibility audit evaluates authoritative meteorological, vegetation, land-surface temperature, precipitation, and terrain datasets across availability, spatial/temporal compatibility over Uttarakhand's Himalayan relief, licensing, and temporal leakage risks.

### Key Audit Decisions

1. **Primary Meteorological Dataset:** **`ERA5-Land` (`reanalysis-era5-land`)** at `0.1° × 0.1°` hourly (`582` grid cells intersecting Uttarakhand vs. only `28` for NASA POWER), providing 2m temperature, 2m dewpoint (for RH & VPD), 10m wind vectors, de-accumulated precipitation, and 4 soil-water layers under **`CC BY 4.0`**.
2. **Secondary Meteorological Validation:** **`NASA POWER` (`MERRA-2` Meteorology)** (`0.5° × 0.625°`, `28` intersecting cells) for zero-auth independent cross-checks (`T2M`, `RH2M`, `PRECTOTCORR`, `WS10M`, `WD10M`, `GWETTOP`), optionally paired with **`GPM IMERG v07`** (`0.1°`) or **`CHIRPS v2.0`** (`0.05°`) for high-elevation monsoon/dry-spell rainfall verification.
3. **Primary Vegetation Indices:** **`MODIS MOD13Q1 v061` (Terra) + `MYD13Q1 v061` (Aqua)** (`250 m`, 16-day composites staggered to `~8-day` effective cadence via NASA AppEEARS), paired with **`VIIRS VNP13A1 v002`** (`500 m`, 16-day) to monitor Terra/Aqua orbital-drift bias and support post-2026 operational continuity.
4. **Primary Static Terrain:** **`Copernicus DEM GLO-30` (`COP30`)** (`30 m`, TanDEM-X 2011–2015, vertical datum `EGM2008`) projected to **`EPSG:32644` (UTM Zone 44N)** to derive elevation, slope, and circular aspect statistics, with **`NASA SRTMGL1 v003`** (`30 m`, Feb 2000, `EGM96`) as public-domain fallback.
5. **Recommended Common Spatial Framework:** **`0.05° × 0.05°` WGS 84 grid** (`~5.57 × 4.82 km` at `30°N`; **`2,174` boundary-intersecting cells / `2,000` centroid-inside cells**), matching FIREINTEL's existing Phase 2/3 EDA grid in [eda.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/eda.py), while preserving resolution-provenance flags so `0.1°` meteorological fields are never represented as independent `0.05°` measurements.

### Companion Phase 4 Deliverables

- Structured source comparison table: [environmental_dataset_comparison.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_feasibility/environmental_dataset_comparison.csv)
- Machine-readable recommended stack & variable mapping: [recommended_data_sources.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_feasibility/recommended_data_sources.json)
- Conceptual alignment & leakage-control blueprint: [environmental_integration_architecture.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_feasibility/environmental_integration_architecture.md)

> [!IMPORTANT]
> **Verified Facts vs. Engineering Recommendations:** Throughout this audit, dataset specifications (identifiers, spatial/temporal resolutions, variable names, historical coverage, latency, API URLs, and licences) reflect **verified official provider documentation and direct workspace measurements** on [uttarakhand_boundary.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/boundaries/uttarakhand_boundary.geojson) and [uttarakhand_fires_boundary.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv). Grid alignment strategies, causal lookback windows (`3/7/14 days`), and dataset rankings represent **engineering recommendations** for Phase 5–6 design.

---

## Step 1 — Relevance of Environmental Variables for Forest Fire Risk in Uttarakhand

Uttarakhand spans dramatic agro-climatic and topographic zones—from Terai/Bhabhar lowlands (`<300 m`) through fire-prone Chir pine (*Pinus roxburghii*) mid-elevation belts (`~1,000–2,200 m`) to oak/alpine treeline zones and perennial snow peaks (`>7,000 m`). A credible fire-risk model must capture **meteorological drying**, **short- and medium-term moisture memory**, **live/dead fuel state**, and **terrain fire-behavior controls**.

| # | Environmental Variable | Physical Mechanism for Forest Fire Risk | Recommended Modeling Formulations | Priority |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Air Temperature (`2 m`)** | Drives evaporative demand, fuel heating toward ignition thresholds, and dead fine-fuel equilibrium moisture content (EMC). Higher daytime maxima accelerate litter drying ahead of pre-monsoon (Apr–Jun) fire peaks. | Hourly temperature (`°C`), local IST `Tmax`, `Tmin`, diurnal temperature range, and `3/7-day` anomalies. | **Core** |
| 2 | **Relative Humidity (`2 m`) & VPD** | Directly governs dead fine-fuel moisture absorption/desorption; low RH (`<30%`) permits sustained combustion of pine needles and grass litter. **Vapor Pressure Deficit (VPD)** (derivable from `T2m` & `RH`/`Td2m`) often separates thermal fire danger better than RH alone across elevation zones. | IST `RHmin`, afternoon RH (`12:00–17:00 IST`), derived VPD (`kPa`), and rolling `3-day` drying minimum. | **Core** |
| 3 | **Precipitation / Rainfall** | Wets surface litter and suppresses ignition/spread; prolonged dry spells control cumulative drought buildup before April fires and during Uttarakhand's dry **December** peak (`1,678` obs in 2025). | Total daily rainfall (`mm/IST-day`), **`3-day`**, **`7-day`**, and **`14-day`** antecedent rainfall sums, plus consecutive dry days (`<1.0 mm/day`). | **Core** |
| 4 | **Wind Speed (`10 m` / `2 m`)** | Supplies oxygen to combustion zones, tilts flames into unburned fuels ahead of the fire front, accelerates rate of spread, and lofts embers for long-range spotting across steep ridges. | Hourly scalar wind speed $\sqrt{u_{10}^2 + v_{10}^2}$, local IST daily max gust/wind, and afternoon peak wind speed. | **Core** |
| 5 | **Wind Direction (`10 m`)** | Determines whether ambient winds blow **upslope** (compounding terrain preheating) or **downslope** (e.g., katabatic/foehn-like adiabatic warming and drying in Himalayan valleys). | Must use circular representation: zonal/meridional components `(u10, v10)` or `(sin(θ), cos(θ))`—never raw `0–360°` scalar integers! Also evaluate wind-aspect alignment. | **High** |
| 6 | **Soil Moisture** | Tracks sub-surface moisture memory slower than daily weather; depleted topsoil (`0–7 cm`) reflects dry surface litter, while root-zone moisture (`7–100 cm`) signals live vegetation water stress during multi-week dry spells. | ERA5-Land `volumetric_soil_water_layer_1` (`0–7 cm`), `layer_2` (`7–28 cm`), `layer_3` (`28–100 cm`) levels + `7-day` and `14-day` drying deltas. | **Core** |
| 7 | **NDVI** | Measures canopy greenness and photosynthetic vigor; captures seasonal phenological curing (leaf-fall / winter senescence vs. post-monsoon flush) and fuel continuity. *Limitation:* saturates in dense oak/sub-tropical canopies and is sensitive to soil background in sparse scrub. | Quality-filtered `0.05°` cell mean/median NDVI + departure from seasonal/1-year rolling baseline (`ΔNDVI`) strictly from completed pre-$T_0$ composites. | **Core** |
| 8 | **EVI** | Optimized vegetation index reducing atmospheric aerosol/smoke contamination and canopy background brightness while resisting saturation in high-biomass forests—particularly valuable across dense Uttarakhand hill forests. | Quality-filtered `0.05°` cell mean/median EVI + pre-$T_0$ temporal change (`EVI_latest - EVI_prev`). | **Core** |
| 9 | **Elevation** | Controls temperature lapse rate (`~ -6.5 °C/km`), moisture/orographic precipitation regimes, forest species belts (sal vs. chir pine vs. oak vs. alpine barren/snow), and snow-cover fire exclusion above ~3,500 m. | Static `0.05°` cell zonal statistics (`mean`, `std`, `min`, `max`) derived from `30 m` DEM. | **Core (Static)** |
| 10 | **Slope & Aspect** | **Slope** steeply accelerates upslope flame tilt and radiative/convective preheating of uphill fuels. **Aspect** governs solar insolation: at Uttarakhand's `~30°N` latitude, **south- and southwest-facing slopes** receive markedly higher solar radiation and cure faster than shaded north-facing slopes. | Derived in planar `EPSG:32644` (UTM 44N): `slope_mean_deg`, `slope_max_deg`, circular `sin(aspect)` / `cos(aspect)`, and south/southwest-facing slope fraction. | **Core (Static)** |

> [!NOTE]
> **Role of MODIS Land Surface Temperature (`LST`):** While evaluated in Step 2 (`MOD11A1` / `MYD11A1`), satellite skin LST is **not** equivalent to `2 m` air temperature, suffers severe missingness under clouds, exhibits post-2020/2021 Terra/Aqua overpass-time drift bias, and risks post-ignition contamination from active fires warming pixels. Air temperature (`ERA5-Land`) is superior for predictive fire-risk modeling.

---

## Step 2 — Authoritative Data Source Evaluation

Full side-by-side metadata is recorded in [environmental_dataset_comparison.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_feasibility/environmental_dataset_comparison.csv).

### A. NASA POWER (Prediction Of Worldwide Energy Resources — MERRA-2 Meteorology)
- **Official Dataset Name:** NASA POWER Agroclimatology / Meteorology Archive (backed by NASA GMAO **MERRA-2**).
- **Provider & URL:** NASA Langley Research Center (LaRC) — <https://power.larc.nasa.gov/> (`https://power.larc.nasa.gov/api/temporal/{hourly|daily|monthly}/{point|regional}`).
- **Historical Coverage & 2025 Status:** `1981-01-01` to near real-time (underlying MERRA-2 starts `1980-01-01`); typical latency `~3–5 days` (up to ~2 weeks for select streams). **Full 2025 archive accessible.**
- **Resolution:** Temporal: hourly, daily, monthly, climatology. Spatial: **`0.5° lat × 0.625° lon`** (`~55.7 km × 60.3 km` at `30°N`; solar parameters at `1.0° × 1.0°`). Over Uttarakhand, only **`28` cells intersect** the boundary and **`17` cell centers fall inside**.
- **Variables:** `T2M`, `T2M_MIN`, `T2M_MAX` (°C), `RH2M` (%), `PRECTOTCORR` (`mm/day` or `mm/hr`), `WS2M`, `WS10M` (`m/s`), `WD2M`, `WD10M` (°), `GWETTOP` (`0–5 cm`), `GWETROOT`, `GWETPROF` (unitless wetness `0–1`).
- **Formats, Auth & Licence:** `JSON`, `CSV`, `NetCDF`, `GeoJSON`, `ASCII`, `EPW`. **No API key required** for basic queries (rate/size limits apply). **NASA Open Data (public domain; LaRC attribution requested).**
- **Suitability for Uttarakhand:** **Not suitable as primary spatial dataset.** Averaging `~3,360 km²` per grid cell merges warm Terai plains (`<300 m`) with glaciated Himalayan ridges (`>5,000 m`), erasing fire-weather gradients. **Excellent as a zero-friction secondary sanity-check and rapid prototyping benchmark.**

### B. Copernicus ERA5 & ERA5-Land Reanalysis
- **Official Dataset Names:**
  - **`reanalysis-era5-land`** (*ERA5-Land hourly data from 1950 to present*)
  - **`reanalysis-era5-single-levels`** (*ERA5 hourly data on single levels from 1940 to present*)
- **Provider & URL:** ECMWF / Copernicus Climate Change Service (C3S) via Climate Data Store (CDS) — <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land> and <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels> (`https://cds.climate.copernicus.eu/api`, Python client `cdsapi`).
- **Historical Coverage & 2025 Status:** ERA5-Land: `1950-01-01` to present; ERA5: `1940-01-01` to present. Latency `~5 days` for preliminary near-real-time streams (`ERA5-Land-T` / `ERA5T`), finalized **`2–3 months`** later. **Full finalized 2025 data is accessible.**
- **Resolution:**
  - **ERA5-Land:** **`0.1° × 0.1°`** regular lat-lon on CDS (`~11.1 km × 9.6 km` at `30°N`; native internal grid `~9 km` TCo1279), hourly. Covers Uttarakhand with **`582` intersecting cells (`500` cell centers inside)**.
  - **ERA5 Single Levels:** **`0.25° × 0.25°`** (`~27.8 km × 24.1 km` at `30°N`), hourly (`109` intersecting / `78` interior cells).
- **Variables:** `2m_temperature` (`K`), `2m_dewpoint_temperature` (`K`), `10m_u_component_of_wind` (`m/s`), `10m_v_component_of_wind` (`m/s`), `total_precipitation` (`m`), plus four ERA5-Land volumetric soil moisture layers (`volumetric_soil_water_layer_1..4`: `0–7`, `7–28`, `28–100`, `100–289 cm` in `m³ m⁻³`). *Derived requirements:* `RH` and `VPD` must be calculated from `2m_temperature` and `2m_dewpoint_temperature`; wind speed & direction must be derived from `u10/v10`.
- **Formats, Auth & Licence:** `NetCDF4`, `GRIB`. Requires free CDS account, `~/.cdsapirc` API key, and web-UI licence acceptance; async request queue limits apply. **`CC BY 4.0`** (Creative Commons Attribution 4.0 International).
- **Suitability for Uttarakhand:** **`ERA5-Land` is strongly recommended as Primary Meteorological Dataset.** Its `~20×` finer cell count than NASA POWER resolves Uttarakhand valley-to-mountain temperature, wind, RH/VPD, and soil-moisture contrasts while remaining hourly. **Crucial caveat:** ERA5-Land `total_precipitation` is accumulated from `00:00 UTC` each day (unlike ERA5 single-levels 1-hour steps) and must be de-accumulated before IST aggregation.

### C. NASA MODIS & VIIRS Vegetation Indices
- **Official Dataset Names:**
  - **`MOD13Q1 v061`** (Terra) & **`MYD13Q1 v061`** (Aqua) — *MODIS Vegetation Indices 16-Day L3 Global 250m SIN Grid*
  - **Continuity Partner:** **`VNP13A1 v002`** — *Suomi NPP VIIRS Vegetation Indices 16-Day L3 Global 500m SIN Grid*
- **Provider & URL:** NASA LP DAAC / USGS — <https://lpdaac.usgs.gov/products/mod13q1v061/>, <https://www.earthdata.nasa.gov/data/catalog/lpcloud-vnp13a1-002>, subsetting via AppEEARS REST API (<https://appeears.earthdatacloud.nasa.gov/api>).
- **Historical Coverage & 2025 Status:** `MOD13Q1` (`Feb 2000–present`), `MYD13Q1` (`Jul 2002–present`), `VNP13A1` (`Jan 2012–present`). **Full 2025 coverage available.** *Critical Mission Context:* Terra (`10:30` MLT) and Aqua (`13:30` MLT) stopped maintaining nominal constellation orbits in `2020–2021` (orbital drift alters solar zenith / terrain shadowing in steep valleys) and are scheduled to wind down around **late 2026–early 2027 (Terra)** and **late 2027 (Aqua)**.
- **Resolution:** MODIS: **`250 m`** (`~400` pixels per `0.05°` cell); VIIRS: **`500 m`** (`~100` pixels per `0.05°` cell); native MODIS/VIIRS Sinusoidal projection (sphere `R = 6,371,007.181 m`), **`16-day`** composite (`MOD13Q1` + `MYD13Q1` staggered every **`8 days`**).
- **Variables:** `NDVI`, `EVI` (`EVI2` in `VNP13A1`), `VI Quality`, `pixel reliability`, `composite day of the year`.
- **Formats, Auth & Licence:** AppEEARS outputs analysis-ready **`GeoTIFF`** and **`NetCDF4`** (already reprojected to `EPSG:4326` for our Uttarakhand polygon!). Requires free NASA Earthdata Login account. **NASA ESDS Open Data Policy (public domain / unrestricted; citation requested).**
- **Suitability for Uttarakhand:** **`MOD13Q1 + MYD13Q1 v061` is recommended Primary Vegetation Dataset** because `250 m` resolves narrow Himalayan ridges better than `500 m`, and **`EVI`** mitigates dense forest NDVI saturation; **`VNP13A1 v002`** should be included as a drift cross-check and long-term continuity bridge.

### D. NASA MODIS Land Surface Temperature (LST)
- **Official Dataset Names:** **`MOD11A1 v061`** (Terra) & **`MYD11A1 v061`** (Aqua) — *Land Surface Temperature/Emissivity Daily L3 Global 1km SIN Grid*.
- **Provider & URL:** NASA LP DAAC via AppEEARS (<https://lpdaac.usgs.gov/products/mod11a1v061/>, <https://appeears.earthdatacloud.nasa.gov/api>).
- **Historical Coverage & Resolution:** `Feb 2000` / `Jul 2002` to present; **`1 km`** spatial, **daily** (clear-sky day/night overpass); `GeoTIFF`/`NetCDF4` via AppEEARS; Earthdata Login; NASA ESDS Open Data Policy.
- **Suitability for Uttarakhand:** **Exploratory / Optional Only (Excluded from Primary Stack).** Three structural drawbacks make daily MODIS LST risky in a baseline predictive model: (1) strict cloud screening leaves frequent multi-day/monsoon data voids; (2) Terra/Aqua orbital drift (`2020–2025`) shifts overpass solar time, directly biasing surface skin temperature; and (3) active fires can radiatively heat `1 km` LST pixels, creating subtle target leakage if not carefully lagged.

### E. Digital Elevation Models (Terrain): NASA SRTMGL1 v003 & Copernicus DEM GLO-30
- **Official Dataset Names:**
  - **Recommended Primary:** **Copernicus DEM `GLO-30` (`COP30`)** — *Global 30 m Digital Surface Model* (derived from DLR/Airbus **TanDEM-X** `2011–2015`, vertical datum **`EGM2008`**)
  - **Benchmark / Fallback:** **`NASA SRTMGL1 v003`** — *Shuttle Radar Topography Mission Global 1 Arc-Second Void-Filled* (Space Shuttle *Endeavour* **`Feb 11–22, 2000`**, vertical datum **`EGM96`**)
- **Providers & URLs:**
  - Copernicus DEM: ESA / DLR & Airbus — <https://spacedata.copernicus.eu/collections/copernicus-dem>, AWS Open Data COGs (<https://registry.opendata.aws/copernicus-dem>), OpenTopography API (<https://portal.opentopography.org/API/globaldem?demtype=COP30>).
  - SRTMGL1 v003: NASA LP DAAC / USGS — <https://lpdaac.usgs.gov/products/srtmgl1v003/>, OpenTopography API (`demtype=SRTMGL1`), AppEEARS.
- **Resolution, Auth & Licence:** Static `1 arc-sec` (`~30 m`, `~185 × 160` pixels per `0.05°` cell). AWS `copernicus-dem-30m` requires **no API key**; OpenTopography REST subsetting uses a **free API key** (area/daily limits apply). `SRTMGL1` is **public domain**; `COP30` uses the **Copernicus DEM open licence** (free, full, and open access; requires `© DLR e.V.` and `© Airbus Defence and Space GmbH` attribution).
- **Suitability for Uttarakhand:** **`Copernicus DEM GLO-30` is recommended Primary Terrain Source.** Compared with the 25-year-old Feb 2000 SRTM acquisition (which suffers C-band radar layover and ASTER/GMTED void-fill patching across steep Himalayan valleys), `COP30` delivers substantially cleaner steep-slope geometry across Uttarakhand. Slope and circular aspect must be derived after reprojecting to planar **`EPSG:32644`**.

### F. Authoritative Complementary Precipitation Datasets (Validation Options)
- **`GPM IMERG v07` (`GPM_3IMERGDF` Daily / `GPM_3IMERGHH` 30-min):** NASA GES DISC (<https://disc.gsfc.nasa.gov/>), `June 2000–present`, **`0.1° × 0.1°`** (`582` intersecting cells), `NetCDF4`/`HDF5`, Earthdata Login, **`CC BY 4.0`**. Primary merged field in v07 is **`precipitation`** (renamed from v06 `precipitationCal`). Early (`~4h`) & Late (`~14h`) runs exist; Final gauge-calibrated run lags `~3.5 months` (**full 2025 Final Run available**). Useful to audit ERA5-Land rainfall bias in foothills vs. high peaks.
- **`CHIRPS v2.0`:** UCSB Climate Hazards Center (<https://www.chc.ucsb.edu/data/chirps>), `1981–Dec 2026` (transitioning to CHIRPS v3 after Dec 2026), **`0.05° × 0.05°`** (`50°S–50°N` land; **`2,174` intersecting cells — exact `1:1` spacing match** with FIREINTEL's `0.05°` grid), `GeoTIFF`/`NetCDF`, no auth on `data.chc.ucsb.edu`, **`CC0 1.0` / Public Domain**. Strong `0.05°` spatial benchmark, though sparse high-Himalayan rain-gauge coverage and infrared cold-cloud assumptions can under-estimate warm orographic rainfall and snowfall.

---

## Step 3 — Temporal Compatibility Analysis

Our Phase 3 verified fire table ([uttarakhand_fires_boundary.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv)) stores **`acq_date`**, **`acq_time`** (zero-padded UTC `HHMM`), **`acq_datetime`** (`UTC`), and **`sensor`**, spanning `2025-01-01 07:43 UTC` to `2025-12-31 21:28 UTC` with **`65.12%` Daytime (`4,911` obs)** and **`34.88%` Nighttime (`2,630` obs)** detections.

1. **Hourly vs. Daily Meteorological Alignment:**
   - Instantaneous **hourly** ERA5-Land data aligns directly to satellite overpass timestamps (`acq_datetime` UTC) to characterize atmospheric fire weather near ignition/detection time, while **daily local aggregates** capture cumulative diurnal heating (`Tmax`, `RHmin`) driving drying cycles.
2. **UTC vs. IST (`UTC+05:30`) Timezone Trap:**
   - Uttarakhand (`IST = UTC+05:30`) sits 5.5 hours ahead of UTC. Peak local afternoon burning (`12:00–17:00 IST`) falls at `06:30–11:30 UTC`, whereas detections between **`18:30` and `23:59 UTC`** actually occur on the **following morning (`00:00–05:29 IST`)**.
   - **Rule:** Keep `UTC` as canonical storage clock, but compute daily fire-weather summaries (`Tmax_ist`, `RHmin_ist`, `daily_rain_ist`) over **`00:00–23:59 IST` (`18:30 UTC [D-1]` to `18:30 UTC [D]`)**.
3. **ERA5-Land `00:00 UTC` Precipitation Accumulation Trap:**
   - Unlike standard ERA5 single levels (1-hour step accumulations), `reanalysis-era5-land` stores `total_precipitation` cumulatively from `00:00 UTC` (`01:00 UTC` = 1h total, ..., `00:00 UTC` next day = 24h total, resetting to zero at `00:00 UTC`).
   - **Rule:** De-accumulate ERA5-Land into strict 1-hour UTC increments ($\Delta P_H = P_H - P_{H-1}$ within each forecast cycle, with $\Delta P_{01:00} = P_{01:00}$) **before** summing across IST calendar boundaries or rolling windows.
4. **Antecedent Moisture & Drying Windows:**
   - **Rainfall memory:** `3-day`, `7-day`, and `14-day` rolling antecedent sums plus `consecutive_dry_days` capture litter soaking vs. prolonged winter/pre-monsoon drought stress (vital for explaining both **April `2,255` obs** and dry-winter **December `1,678` obs**).
   - **Atmosphere & soil trends:** Daily/rolling `7-day` VPD, `Tmax`, wind intensity, and ERA5-Land soil moisture change (`SM_layer1(T_0) - SM_layer1(T_0 - 7d)`).
5. **Vegetation Composite Cadence (`16-day` / staggered `8-day`):**
   - `MOD13Q1` (`Terra`) + `MYD13Q1` (`Aqua`) provide `~8-day` composite greenness tracking phenology without needing daily optical cadence—**provided composites are indexed causally by composite end date $\le T_0$** (never midpoint interpolation across future composites).

---

## Step 4 — Spatial Compatibility Analysis

Grounded directly in [uttarakhand_boundary.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/boundaries/uttarakhand_boundary.geojson) (`EPSG:4326` bounds `77.5723°E` to `81.0453°E`, `28.7229°N` to `31.4561°N`, planar area **`53,417.95 km²`** in `EPSG:32644`):

### 4.1 Resolution Comparison Measured Over Uttarakhand

| Dataset / Grid Spacing | Nominal Size at `30°N` | Intersecting Cells Over Uttarakhand | Centroid-Inside Cells | Spatial Assessment |
| :--- | :--- | :---: | :---: | :--- |
| **NASA POWER / MERRA-2 (`0.5° × 0.625°`)** | `~55.7 × 60.3 km` | **`28`** | **`17`** | Far too coarse; averages foothills with high Himalayan peaks. |
| **ERA5 Single Levels (`0.25° × 0.25°`)** | `~27.8 × 24.1 km` | **`109`** | **`78`** | Regional only; smooths major river valleys and pine belts. |
| **ERA5-Land / GPM IMERG (`0.1° × 0.1°`)** | `~11.1 × 9.6 km` | **`582`** | **`500`** | Captures district/watershed climatic zones (`~20×` more cells than POWER). |
| **Master `0.05° × 0.05°` Grid / CHIRPS v2.0** | `~5.6 × 4.8 km` | **`2,174`** | **`2,000`** | **Matches existing FIREINTEL Phase 2/3 EDA grid** (`1,168` active fire cells in 2025). |
| **MODIS `250 m` / Copernicus DEM `30 m`** | `~0.25 km` / `~0.03 km` | `~400` / `~29,600` px per `0.05°` cell | Sub-grid rasters | Supports crisp zonal summaries (`mean`, `std`, `p10`, `p90`) per `0.05°` cell. |

### 4.2 CRS, Geometry & Resampling Rules

1. **CRS Harmonization:**
   - Core spatial catalog & alignment grid: **`EPSG:4326`** (matching FIRMS fire points, geoBoundaries GeoJSON, ERA5-Land, NASA POWER, CHIRPS, and DEM downloads).
   - MODIS/VIIRS Sinusoidal sphere (`R = 6,371,007.181 m`): request server-side reprojection to `EPSG:4326` inside AppEEARS GeoTIFF/NetCDF outputs.
   - Topographic & area derivatives: project DEM and grid polygons into **`EPSG:32644` (WGS 84 / UTM Zone 44N)** before computing terrain slope, aspect, and grid-cell state overlap fractions.
2. **Grid-Cell Alignment vs. Point Extraction:**
   - Extracting features strictly at detected fire `(lat, lon)` coordinates cannot train a spatial risk classifier because **background (non-fire) cells across the entire state also require environmental vectors**. Aligning all predictors onto the `2,174`-cell `0.05°` grid natively serves both historical diagnostics and state-wide prediction maps.
3. **Resampling Without Inventing False Precision:**
   - Because ERA5-Land `0.1°` netCDF coordinates represent **cell centers** (each cell spans `center ± 0.05°`), every `0.1°` ERA5-Land box maps **cleanly as a `2×2` block onto four `0.05°` grid cells** (`floor(coord / 0.05) * 0.05`). Assigning the parent `0.1°` value directly (nearest/parent mapping + explicit `era5_parent_cell_id`) preserves physical honesty; bilinear smoothing across cells should NOT be mistaken for real `5 km` meteorological detail. *(If elevation-aware temperature downscaling via environmental lapse rate is ever tested in Phase 6, it must be implemented and evaluated explicitly as a feature-engineering hypothesis rather than baked silently into raw weather ingestion.)*

---

## Step 5 — Final Recommended Dataset Stack (Minimal Redundancy)

| Functional Layer | Selected Dataset | Access Mechanism & Licence | Rationale (Zero Unnecessary Duplication) |
| :--- | :--- | :--- | :--- |
| **Primary Meteorology & Soil Moisture** | **`ERA5-Land`** (`reanalysis-era5-land`) | CDS API v2 (`cdsapi`), `NetCDF4`, **`CC BY 4.0`** | Best open-access combination of spatial granularity (`0.1°`, `582` Uttarakhand cells), hourly resolution, all meteorological parameters (or direct derivations for RH/VPD/wind), and 4 soil-water layers. |
| **Secondary Meteorology (Validation)** | **`NASA POWER`** (`MERRA-2` met) + optional `GPM_3IMERGDF v07` / `CHIRPS v2.0` | Open REST API (`JSON`/`CSV`/`NetCDF`), **Public Domain** | Zero-auth independent sanity validation of ERA5-Land temperature, RH, wind, and precipitation anomalies without relying on a second heavy daily pipeline. |
| **Vegetation & Fuel Greenness** | **`MOD13Q1 v061` + `MYD13Q1 v061`** (with `VNP13A1 v002` cross-check) | NASA AppEEARS REST API (`GeoTIFF`/`NetCDF4`), **NASA ESDS Public Domain** | `250 m` pixels capture rugged forest fragmentation across Uttarakhand (`~8-day` combined Terra+Aqua cadence); `VNP13A1` guards against Terra/Aqua orbital drift and future retirement. |
| **Static Terrain** | **`Copernicus DEM GLO-30` (`COP30`)** (fallback: `SRTMGL1 v003`) | AWS S3 COG (`copernicus-dem-30m`) or OpenTopography API, **Copernicus Open Licence** (DLR/Airbus attribution) | Superior modern (`2011–2015` TanDEM-X) `30 m` surface geometry with fewer Himalayan high-relief voids than year-2000 SRTM. |

---

## Step 6 — Conceptual Integration & Leakage-Control Strategy

The complete schematic and dataflow specification are documented in [environmental_integration_architecture.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_feasibility/environmental_integration_architecture.md). Core Phase 5–6 integration safeguards:

1. **Grid-Time Schema (`cell_id × T0`):** Anchor modeling rows to every valid Uttarakhand `0.05°` cell (`2,174` intersecting cells; border overlap computed in `EPSG:32644`) across daily local-morning or fixed UTC decision anchors $T_0$.
2. **Observation Cleanup Before Labeling:** Filter out non-vegetation thermal sources (`type != 0`, specifically removing the `14` MODIS `type=2` persistent static anomalies flagged in Phase 3 EDA) before aggregating cell fire targets or historical `7/14/30-day` fire lags.
3. **Target Design (`Observation != Fire Size`):** Predict **grid-cell fire occurrence probability** (whether $\ge 1$ vegetation detection occurs in cell $c$ during future window `(T0, T0 + 24h]` / `72h`) or binned activity tiers—avoiding row-level duplication across overlapping VIIRS (`NOAA-20` / `Suomi NPP`) and MODIS (`Terra` / `Aqua`) overpasses.
4. **Preventing Subtle Data Leakage:**
   - **16-Day Vegetation Composite Windowing:** Match each $T_0$ strictly to the latest MODIS/VIIRS composite whose **window end date + processing margin $\le T_0$**; never interpolate forward into composites covering post-$T_0$ days.
   - **IST Boundary Leakage:** Ensure same-day afternoon `Tmax` / evening rainfall never enters predictors for an earlier-day fire window.
   - **Spatial-Temporal Validation Splits:** Group evaluation folds by **spatial district/grid blocks** and **forward time periods** so neighboring `0.05°` cells sharing a `0.1°` ERA5-Land parent never leak across train/test boundaries.
5. **Cloud Occlusion & Bimodal Seasonality:** Track clear-sky MODIS QA pixel fractions and daily precipitation alongside thermal fire labels so monsoon/winter cloud masking is not misread as zero ignition hazard, and stratify performance metrics across Uttarakhand's distinct **pre-monsoon (Apr–Jun)** and **dry post-monsoon/winter (Nov–Dec)** fire regimes.

---

## Official References & Documentation Links

- **NASA POWER API & Docs:** <https://power.larc.nasa.gov/>
- **Copernicus CDS — ERA5-Land:** <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land>
- **Copernicus CDS — ERA5 Single Levels:** <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels>
- **NASA AppEEARS API:** <https://appeears.earthdatacloud.nasa.gov/api>
- **NASA LP DAAC — MOD13Q1 v061:** <https://lpdaac.usgs.gov/products/mod13q1v061/>
- **NASA LP DAAC — MOD11A1 v061:** <https://lpdaac.usgs.gov/products/mod11a1v061/>
- **NASA Earthdata — VIIRS VNP13A1 v002:** <https://www.earthdata.nasa.gov/data/catalog/lpcloud-vnp13a1-002>
- **ESA Copernicus DEM GLO-30:** <https://spacedata.copernicus.eu/collections/copernicus-dem> | AWS Open Data: <https://registry.opendata.aws/copernicus-dem> | OpenTopography Global DEM API: <https://portal.opentopography.org/API/globaldem>
- **NASA LP DAAC — SRTMGL1 v003:** <https://lpdaac.usgs.gov/products/srtmgl1v003/>
- **NASA GES DISC (GPM IMERG v07):** <https://disc.gsfc.nasa.gov/>
- **UCSB CHC — CHIRPS v2.0:** <https://www.chc.ucsb.edu/data/chirps> | Data archive: <https://data.chc.ucsb.edu/products/CHIRPS-2.0/>

