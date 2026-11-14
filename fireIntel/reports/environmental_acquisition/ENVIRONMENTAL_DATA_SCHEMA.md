# FIREINTEL — Environmental Data Schema Specification

**Phase:** Phase 5A: Environmental Data Acquisition Architecture & Pipeline Preparation  
**Target Domain:** Uttarakhand, India (`IN-UT`, `53,417.95 km²` in `EPSG:32644`)  
**Study Period:** 1 January 2025 – 31 December 2025  
**Version:** 1.0.0 (Pre-Acquisition Architecture Scaffolding)

---

## 1. Overview & Data Layer Hierarchy

The FIREINTEL environmental data system is organized into three distinct tiers:

1. **Tier 1: Raw Layer (`fireIntel/data/environmental/raw/`)**  
   Direct downloads from official providers (Copernicus CDS, NASA AppEEARS, OpenTopography/AWS) preserving exact upstream byte representations, metadata attributes, coordinate conventions, and file formats (`NetCDF4`, `Cloud-Optimized GeoTIFF`).
2. **Tier 2: Intermediate Layer (`fireIntel/data/environmental/intermediate/`)**  
   Cleaned, unit-converted, QA-masked, and de-accumulated datasets prior to spatial aggregation (e.g., hourly ERA5-Land with de-accumulated precipitation in mm/hr, quality-filtered MODIS vegetation rasters, DEM reprojected to `EPSG:32644` with slope and circular aspect).
3. **Tier 3: Processed Spatio-Temporal Feature Layer (`fireIntel/data/environmental/processed/`)**  
   Standardized tabular and Parquet datasets indexed on the **Master `0.05°` Analysis Grid** (`2,174` boundary-intersecting cells) across daily or sub-daily timestamps, containing explicit resolution provenance flags and parent-child cell IDs.

---

## 2. Spatial Identifiers & Coordinate Reference Conventions

All gridded features must include standardized spatial metadata columns:

| Column Name | Data Type | Nullable | Coordinate System / Range | Description |
| :--- | :--- | :---: | :--- | :--- |
| `grid_cell_id` | `string` | No | Format: `UT_005_{LAT}_{LON}` (e.g., `UT_005_29.8500_79.1500`) | Unique canonical string identifier for each `0.05°` grid cell. |
| `grid_lat_sw` | `float64` | No | `[28.70, 31.45]` (step: `0.05`) | South-West corner latitude (degrees North) in `EPSG:4326`, matching `eda.py` `floor(lat/0.05)*0.05`. |
| `grid_lon_sw` | `float64` | No | `[77.55, 81.00]` (step: `0.05`) | South-West corner longitude (degrees East) in `EPSG:4326`, matching `eda.py` `floor(lon/0.05)*0.05`. |
| `centroid_lat` | `float64` | No | `grid_lat_sw + 0.025` | Geometric center latitude of the `0.05°` cell. |
| `centroid_lon` | `float64` | No | `grid_lon_sw + 0.025` | Geometric center longitude of the `0.05°` cell. |
| `era5_parent_cell_id` | `string` | No | Format: `ERA5L_{LAT}_{LON}` (e.g., `ERA5L_29.9000_79.2000`) | Identifier of the containing/parent `0.1°` ERA5-Land cell. |
| `era5_parent_lat` | `float64` | No | Multiple of `0.1` (`round(centroid_lat, 1)`) | Latitude coordinate of parent ERA5-Land grid node (cell center). |
| `era5_parent_lon` | `float64` | No | Multiple of `0.1` (`round(centroid_lon, 1)`) | Longitude coordinate of parent ERA5-Land grid node (cell center). |
| `uttarakhand_area_fraction`| `float32` | No | `(0.0, 1.0]` | Fraction of the `0.05°` cell polygon falling inside `uttarakhand_boundary.geojson` (calculated in `EPSG:32644`). |
| `centroid_inside_boundary` | `boolean` | No | `True` / `False` | Whether cell centroid falls strictly inside the state boundary (`2,000` True / `174` False out of `2,174`). |

---

## 3. Tier 1: Raw Ingestion Schemas

### 3.1 ERA5-Land Raw NetCDF4 (`fireIntel/data/environmental/raw/era5_land/`)

Raw NetCDF4 files retrieved from CDS API endpoint `https://cds.climate.copernicus.eu/api` using dataset identifier `reanalysis-era5-land`:

- **Coordinate Dimensions:** `time` (unlimited or 24/monthly steps), `latitude` (descending 31.5 to 28.7, step 0.1), `longitude` (ascending 77.5 to 81.1, step 0.1).
- **Coordinate Convention:** Coordinates denote grid nodes (cell centers).
- **Variables:**

| Variable Code | NetCDF Variable Name | Raw Type | Upstream Units | Missing / Fill Value | Description |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `t2m` | `2m_temperature` | `int16` (scaled) | `K` (Kelvin) | `-32767` | Air temperature at 2 metres above displacement height. |
| `d2m` | `2m_dewpoint_temperature` | `int16` (scaled) | `K` (Kelvin) | `-32767` | Dewpoint temperature at 2 metres above displacement height. |
| `u10` | `10m_u_component_of_wind` | `int16` (scaled) | `m s**-1` | `-32767` | Zonal (eastward) wind component at 10 metres. |
| `v10` | `10m_v_component_of_wind` | `int16` (scaled) | `m s**-1` | `-32767` | Meridional (northward) wind component at 10 metres. |
| `tp` | `total_precipitation` | `int16` (scaled) | `m` (metres) | `-32767` | Precipitation accumulated from 00:00 UTC cycle start. |
| `swvl1` | `volumetric_soil_water_layer_1` | `int16` (scaled) | `m**3 m**-3` | `-32767` | Volumetric soil moisture in Layer 1 (0 – 7 cm depth). |
| `swvl2` | `volumetric_soil_water_layer_2` | `int16` (scaled) | `m**3 m**-3` | `-32767` | Volumetric soil moisture in Layer 2 (7 – 28 cm depth). |
| `swvl3` | `volumetric_soil_water_layer_3` | `int16` (scaled) | `m**3 m**-3` | `-32767` | Volumetric soil moisture in Layer 3 (28 – 100 cm depth). |
| `swvl4` | `volumetric_soil_water_layer_4` | `int16` (scaled) | `m**3 m**-3` | `-32767` | Volumetric soil moisture in Layer 4 (100 – 289 cm depth). |

### 3.2 MODIS / VIIRS Vegetation Raw GeoTIFF (`fireIntel/data/environmental/raw/modis_vi/`)

Raw extracted GeoTIFF files retrieved via NASA AppEEARS REST API:

- **Spatial Extent:** Bounded by `uttarakhand_boundary.geojson` polygon; reprojected server-side to `EPSG:4326`.
- **Pixel Spacing:** `0.002245788°` (~250 m) for MODIS; `0.004491576°` (~500 m) for VIIRS.
- **Layers:**

| Layer File Name | Data Type | Raw Valid Range | Scale Factor | Physical Units | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `*NDVI.tif` | `int16` | `-2000` to `10000` | `0.0001` | Unitless `[-0.2, 1.0]` | Normalized Difference Vegetation Index. Fill value: `-3000`. |
| `*EVI.tif` | `int16` | `-2000` to `10000` | `0.0001` | Unitless `[-0.2, 1.0]` | Enhanced Vegetation Index. Fill value: `-3000`. |
| `*VI_Quality.tif` | `uint16` | `0` to `65535` | None | Bitmask | Bit flags for cloud, aerosol, shadow, and snow detection. |
| `*pixel_reliability.tif` | `int8` | `0` to `3` | None | Categorical | Summary QA: 0 = Good, 1 = Marginal, 2 = Snow/Ice, 3 = Cloudy. |
| `*composite_day_of_the_year.tif` | `int16` | `1` to `366` | None | Days | Julian Day of Year of actual pixel acquisition. |

### 3.3 Copernicus DEM GLO-30 Raw COG (`fireIntel/data/environmental/raw/copernicus_dem/`)

Cloud-Optimized GeoTIFF retrieved from AWS Registry of Open Data (`s3://copernicus-dem-30m/`) or OpenTopography Global Datasets API:

- **Horizontal CRS:** `EPSG:4326` (WGS 84 geographic 2D).
- **Vertical Datum:** `EGM2008` orthometric height (metres above mean sea level).
- **Pixel Spacing:** `1 arc-second` (~0.0002777778° / ~30 m).
- **Data Type:** `float32`.
- **NoData Value:** `-99999.0` or `-32767.0`.

---

## 4. Tier 2: Intermediate Processed Schemas

### 4.1 De-Accumulated Hourly ERA5-Land Table (`fireIntel/data/environmental/intermediate/era5_land_hourly/`)

Parquet dataset partitioned by `year` and `month`:

| Column Name | Data Type | Units | Physical Bounds | Transformation / Formula |
| :--- | :---: | :---: | :---: | :--- |
| `era5_cell_id` | `string` | — | `ERA5L_{LAT}_{LON}` | Unique parent grid identifier. |
| `time_utc` | `timestamp[ns, UTC]` | UTC | `2025-01-01 00:00` to `2025-12-31 23:00` | Exact hourly UTC timestep. |
| `time_ist` | `timestamp[ns, +05:30]`| IST | `time_utc + 5h30m` | Local Indian Standard Time. |
| `date_ist` | `date32` | IST | `2025-01-01` to `2026-01-01` | Local IST date partition. |
| `temperature_2m_c` | `float32` | °C | `[-25.0, 50.0]` | $T_{°C} = T_K - 273.15$ |
| `dewpoint_2m_c` | `float32` | °C | `[-35.0, 35.0]` | $T_{d,°C} = T_{d,K} - 273.15$ |
| `relative_humidity_2m_pct`| `float32` | % | `[0.0, 100.0]` | $100 \times \exp\left(\frac{17.27 T_d}{T_d + 237.3} - \frac{17.27 T}{T + 237.3}\right)$ |
| `vapor_pressure_deficit_kpa`| `float32` | kPa | `[0.0, 8.0]` | $e_s(T) \times (1 - RH/100)$ |
| `wind_speed_10m_ms` | `float32` | m/s | `[0.0, 45.0]` | $\sqrt{u_{10}^2 + v_{10}^2}$ |
| `wind_direction_10m_deg` | `float32` | degrees | `[0.0, 360.0)` | $(270° - \text{atan2}(v, u) \times \frac{180°}{\pi}) \pmod{360°}$ |
| `wind_u_normalized` | `float32` | unitless | `[-1.0, 1.0]` | $u_{10} / \max(WS, 10^{-5})$ |
| `wind_v_normalized` | `float32` | unitless | `[-1.0, 1.0]` | $v_{10} / \max(WS, 10^{-5})$ |
| `precipitation_hourly_mm`| `float32` | mm | `[0.0, 150.0]` | De-accumulated from 00:00 UTC cycle reset ($\times 1000$). |
| `soil_water_l1_fraction` | `float32` | $m^3/m^3$ | `[0.0, 0.65]` | Layer 1 (0–7 cm depth). |
| `soil_water_l2_fraction` | `float32` | $m^3/m^3$ | `[0.0, 0.65]` | Layer 2 (7–28 cm depth). |
| `soil_water_l3_fraction` | `float32` | $m^3/m^3$ | `[0.0, 0.65]` | Layer 3 (28–100 cm depth). |
| `soil_water_l4_fraction` | `float32` | $m^3/m^3$ | `[0.0, 0.65]` | Layer 4 (100–289 cm depth). |

---

## 5. Tier 3: Master Feature Store Schema (`fireIntel/data/environmental/processed/`)

Each record in the master feature store represents one **`(grid_cell_id, date_ist)`** tuple. This structure guarantees that every cell in Uttarakhand has complete, causal environmental history regardless of whether a fire detection occurred.

### 5.1 Primary Key & Spatiotemporal Keys

```sql
PRIMARY KEY (grid_cell_id, date_ist)
```

- `grid_cell_id`: `string`
- `date_ist`: `date32` (`YYYY-MM-DD`, partitioned)
- `cutoff_time_utc`: `timestamp[ns, UTC]` (e.g. `18:30 UTC` of preceding day, corresponding to `00:00 IST` of `date_ist`, guaranteeing strict temporal causality)

### 5.2 Meteorological Feature Fields (Derived from ERA5-Land)

| Field Name | Type | Units | Aggregation / Lookback Window | Rationale |
| :--- | :---: | :---: | :--- | :--- |
| `temp_max_ist_d1` | `float32` | °C | Maximum 2m temperature over IST day $D-1$ | Peak diurnal heating prior to decision time $T_0$. |
| `temp_min_ist_d1` | `float32` | °C | Minimum 2m temperature over IST day $D-1$ | Nighttime radiative cooling / inversions. |
| `temp_mean_ist_d1` | `float32` | °C | 24-hour mean temperature over IST day $D-1$ | Daily baseline energy state. |
| `rh_min_ist_d1` | `float32` | % | Minimum relative humidity over IST day $D-1$ | Core indicator of dead fine-fuel flammability. |
| `rh_mean_ist_d1` | `float32` | % | 24-hour mean relative humidity over IST day $D-1$ | General ambient moisture regime. |
| `vpd_max_ist_d1` | `float32` | kPa | Maximum vapor pressure deficit over IST day $D-1$ | Maximum drying pull on live and dead fuels. |
| `wind_speed_max_ist_d1`| `float32` | m/s | Maximum 10m wind speed over IST day $D-1$ | Fire spread potential and ember spotting hazard. |
| `precip_total_ist_d1` | `float32` | mm | Total 24-hour de-accumulated rainfall over IST day $D-1$ | Immediate litter wetting or suppression. |
| `precip_antecedent_3d` | `float32` | mm | Rolling sum over 3 IST days ($D-3$ to $D-1$) | Short-term fine fuel moisture balance. |
| `precip_antecedent_7d` | `float32` | mm | Rolling sum over 7 IST days ($D-7$ to $D-1$) | Medium-term drought buildup. |
| `precip_antecedent_14d`| `float32` | mm | Rolling sum over 14 IST days ($D-14$ to $D-1$) | Extended drought / monsoon retreat memory. |
| `consecutive_dry_days` | `int16` | days | Consecutive preceding IST days with `precip < 1.0 mm` | Cumulative desiccation duration. |
| `soil_moisture_l1_latest`| `float32`| $m^3/m^3$| Layer 1 moisture at $T_0$ (18:30 UTC / 00:00 IST) | Topsoil (0–7 cm) wetness. |
| `soil_moisture_l2_latest`| `float32`| $m^3/m^3$| Layer 2 moisture at $T_0$ | Shallow root zone (7–28 cm) wetness. |
| `soil_moisture_l3_latest`| `float32`| $m^3/m^3$| Layer 3 moisture at $T_0$ | Deep root zone (28–100 cm) drought stress. |
| `soil_moisture_l1_delta_7d`|`float32`| $m^3/m^3$| `soil_moisture_l1(T_0) - soil_moisture_l1(T_0 - 7d)` | 7-day soil drying / wetting trajectory. |

### 5.3 Vegetation Feature Fields (Derived from MODIS / VIIRS)

| Field Name | Type | Units | Definition & Causality Enforcement |
| :--- | :---: | :---: | :--- |
| `ndvi_mean` | `float32` | unitless | Mean NDVI of clear-sky pixels within the `0.05°` cell from the latest valid composite where $\text{composite\_end\_date} + 3\text{d} \le T_0$. |
| `ndvi_p25` | `float32` | unitless | 25th percentile of NDVI (captures drier understory / edge forest pixels). |
| `evi_mean` | `float32` | unitless | Mean EVI of clear-sky pixels (resists canopy saturation in dense pine/oak). |
| `ndvi_anomaly_30d` | `float32` | unitless | Departure from rolling 30-day regional baseline: $\text{NDVI}_{\text{curr}} - \text{NDVI}_{\text{baseline}}$. |
| `veg_composite_age_days`| `int16` | days | Days elapsed between pixel acquisition and $T_0$: $T_0 - \text{acquisition\_date}$. |
| `veg_clear_sky_fraction`| `float32` | `[0, 1]` | Fraction of cell pixels passing QA clear-sky filter (flags cloud-occluded cells). |

### 5.4 Static Topographic Feature Fields (Derived from Copernicus DEM GLO-30)

| Field Name | Type | Units | Derivation Method (CRS `EPSG:32644`) |
| :--- | :---: | :---: | :--- |
| `elevation_mean_m` | `float32` | metres | Mean elevation above sea level (EGM2008) of all 30m DEM pixels inside the `0.05°` cell. |
| `elevation_std_m` | `float32` | metres | Standard deviation of elevation (roughness / local relief metric). |
| `elevation_min_m` | `float32` | metres | Minimum elevation in cell (valley floor proxy). |
| `elevation_max_m` | `float32` | metres | Maximum elevation in cell (ridge crest proxy). |
| `slope_mean_deg` | `float32` | degrees | Mean terrain slope derived in planar UTM Zone 44N coordinates. |
| `slope_max_deg` | `float32` | degrees | Maximum terrain slope (identifies cliff faces and rapid chimney canyons). |
| `aspect_sin_mean` | `float32` | unitless | Circular mean sine component: $\frac{1}{N} \sum \sin(\theta_i)$ (East-West exposure). |
| `aspect_cos_mean` | `float32` | unitless | Circular mean cosine component: $\frac{1}{N} \sum \cos(\theta_i)$ (North-South exposure). |
| `south_facing_fraction` | `float32` | `[0, 1]` | Fraction of cell area with slope aspect between $135°$ and $225°$ (high solar desiccation). |

---

## 6. Manifest & Lineage Schema (`fireIntel/data/environmental/manifests/`)

To guarantee exact auditability and reproducible downloads, each raw acquisition batch outputs a standardized manifest JSON:

```json
{
  "manifest_id": "MANIFEST_ERA5L_2025_04",
  "generated_at_utc": "2026-11-13T12:00:00Z",
  "dataset_id": "reanalysis-era5-land",
  "provider": "ECMWF / Copernicus CDS",
  "provider_api_version": "CDS API v2",
  "request_parameters": {
    "year": "2025",
    "month": "04",
    "area": [31.5, 77.5, 28.7, 81.1],
    "variables": [
      "2m_temperature",
      "2m_dewpoint_temperature",
      "10m_u_component_of_wind",
      "10m_v_component_of_wind",
      "total_precipitation",
      "volumetric_soil_water_layer_1",
      "volumetric_soil_water_layer_2",
      "volumetric_soil_water_layer_3",
      "volumetric_soil_water_layer_4"
    ]
  },
  "output_file": "fireIntel/data/environmental/raw/era5_land/era5_land_2025_04.nc",
  "file_size_bytes": 14582912,
  "sha256_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "verification_status": "VERIFIED_OK",
  "verification_details": {
    "dimensions_valid": true,
    "timesteps_expected": 720,
    "timesteps_found": 720,
    "missing_values_count": 0,
    "coordinate_bounds_verified": true
  }
}
```

