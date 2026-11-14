# FIREINTEL — ERA5-Land & Master Grid Spatial Alignment Report (Phase 5B.3)

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Phase:** Phase 5B.3: Live ERA5-Land Pilot Validation  
**Target Domain:** Uttarakhand, India (`IN-UT`, official boundary `53,417.95 km²` in `EPSG:32644`)  
**Grids Harmonized:**
- **Master Analysis Grid:** $0.05^\circ \times 0.05^\circ$ ($\approx 5.57\text{ km} \times 4.82\text{ km}$, 2,174 boundary-intersecting cells)
- **ERA5-Land Grid:** $0.10^\circ \times 0.10^\circ$ ($\approx 9.0\text{ km} \times 9.0\text{ km}$, 581 parent nodes)
- **Copernicus DEM GLO-30:** $30\text{ m} \times 30\text{ m}$ ($180 \times 180 = 32,400$ elevation pixels per master cell)
**Validation Test Suite:** [test_grid_alignment.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_grid_alignment.py) (All 2 unit tests passed)

---

## 1. Executive Summary

Wildfire behavior is driven by multi-scale environmental physical processes:
- Topography operates at fine micro-scales ($30\text{ m}$ slope, aspect, elevation).
- Active fires are detected by satellite thermal sensors at intermediate resolutions (VIIRS $375\text{ m}$, MODIS $1,000\text{ m}$).
- Atmospheric weather operates at meso-scales (ERA5-Land $0.10^\circ \approx 9\text{ km}$).

In Phase 5B.3, the spatial alignment and hierarchical nesting between the **581 parent ERA5-Land nodes** and the **2,174 Master $0.05^\circ$ Grid cells** was validated. The system enforces strict scientific provenance: meteorological data retains its native $0.10^\circ$ physical resolution, and unverified temperature lapse-rate corrections are strictly barred until live geopotential heights are retrieved.

---

## 2. Parent-Child Hierarchical Nesting Architecture

### 2.1 Coordinate Alignment & Binning
The Master Grid is indexed on a South-West corner binning convention:
- $\text{grid\_lat\_sw} = \lfloor \text{lat} / 0.05 \rfloor \times 0.05$
- $\text{grid\_lon\_sw} = \lfloor \text{lon} / 0.05 \rfloor \times 0.05$
- $\text{centroid\_lat} = \text{grid\_lat\_sw} + 0.025$
- $\text{centroid\_lon} = \text{grid\_lon\_sw} + 0.025$

### 2.2 Parent ERA5-Land Node Formulation
ERA5-Land grid nodes are defined on exact multiples of $0.10^\circ$. Each master cell centroid $(\phi_C, \lambda_C)$ is mapped to its containing parent ERA5-Land node via:
$$\text{era5\_parent\_lat} = \text{round}(\phi_C, 1)$$
$$\text{era5\_parent\_lon} = \text{round}(\lambda_C, 1)$$
$$\text{era5\_parent\_cell\_id} = \text{ERA5L\_}\{\text{era5\_parent\_lat}\}\_\{\text{era5\_parent\_lon}\}$$

```text
+-----------------------------------+-----------------------------------+
|  Master Cell: UT_050_29.85_79.15  |  Master Cell: UT_050_29.85_79.20  |
|  Centroid: (29.875°N, 79.175°E)   |  Centroid: (29.875°N, 79.225°E)   |
|                                   |                                   |
|                Parent ERA5-Land Node: ERA5L_29.9000_79.2000           |
|                Node Coordinates:      (29.9000°N, 79.2000°E)          |
+-----------------------------------+-----------------------------------+
|  Master Cell: UT_050_29.80_79.15  |  Master Cell: UT_050_29.80_79.20  |
|  Centroid: (29.825°N, 79.175°E)   |  Centroid: (29.825°N, 79.225°E)   |
+-----------------------------------+-----------------------------------+
```

### 2.3 Topological Statistics
- **Total Master Cells:** 2,174
- **Total Unique Parent ERA5-Land Nodes:** 581
- **Mean Master Cells per Parent Node:** 3.74
- **Distribution:** Exactly 4 master cells per parent node in the contiguous interior; 1 to 3 cells along the complex international and state boundary perimeter.

---

## 3. Scientific Provenance & Resolution Preservation

> [!IMPORTANT]
> **Native Resolution Principle:**  
> Assigning parent ERA5-Land variables to $0.05^\circ$ master grid cells is a tabular alignment convention. **It does NOT create new meteorological resolution.**
> 
> Bilinear or bicubic interpolation of a 9 km reanalysis model onto a 5.5 km grid creates visually smooth rasters, but the interpolated values contain zero independent information regarding local valley thermal belts, micro-climate inversions, or wind channeling.

To maintain complete scientific reproducibility:
1. **Mandatory Provenance Columns:** Every record in the feature store includes:
   - `spatial_resolution_prov`: `"copernicus_dem_glo30_zonal_005"` (certifying true 30m physical measurements aggregated over 32,400 pixels).
   - `met_spatial_resolution_prov`: `"era5_land_parent_010"` (certifying native $0.10^\circ$ synoptic meteorological forcing).
2. **Preservation of Parent Coordinates:** Both the child cell coordinates (`centroid_lat`, `centroid_lon`) and the parent node coordinates (`era5_parent_lat`, `era5_parent_lon`) are explicitly preserved in every table.

---

## 4. Policy on Atmospheric Lapse-Rate Corrections

Requirement 12 specifies: **"Do not apply unverified lapse-rate corrections."**

### Scientific Justification:
In mountainous terrain, air temperature decreases with altitude according to the environmental lapse rate:
$$T_{\text{local}} = T_{\text{ERA5}} + \Gamma \times \left(Z_{\text{DEM}} - Z_{\text{ERA5}}\right)$$
Where:
- $\Gamma \approx -6.5^\circ\text{C} / 1000\text{ m}$ (standard tropospheric environmental lapse rate).
- $Z_{\text{DEM}}$ is the true 30m terrain elevation from Copernicus DEM.
- $Z_{\text{ERA5}}$ is the ERA5-Land surface geopotential height ($z / g_0$) for that grid node.

**Why Lapse-Rate Corrections Are Held in Staging:**
1. Applying a lapse rate requires the **actual native surface geopotential height ($Z_{\text{ERA5}}$)** from the downloaded NetCDF model grid. Using an assumed or approximate elevation for the ERA5-Land node introduces severe, uncalibrated temperature biases across deep Himalayan valleys.
2. In Himalayan winter conditions (January), strong **surface temperature inversions** frequently occur in valley bottoms (such as Dehradun and Srinagar Garhwal), where cold air pools under calm conditions. A naive negative lapse rate would incorrectly predict warm valley bottoms and freezing ridges, the exact opposite of reality.
3. Therefore, until live NetCDF files containing actual geopotential height fields are retrieved and verified, **no synthetic or uncalibrated lapse-rate corrections are applied**. Meteorological variables remain at their native verified values.

---

## 5. Automated Verification Results

Spatial grid alignment was validated through automated tests in [test_grid_alignment.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_grid_alignment.py):

| Verification Check | Expected Target | Observed Result | Test Status |
| :--- | :---: | :---: | :---: |
| Master Grid Cell Count | 2,174 | 2,174 | **PASSED** |
| Unique Parent ERA5 Nodes | 581 | 581 | **PASSED** |
| 1:1 ID Alignment with DEM Features | 100.0% | 100.0% | **PASSED** |
| Parent Lat Multiples of $0.10^\circ$ | Modulo $0.1 = 0$ | Exact multiples of $0.10^\circ$ | **PASSED** |
| Parent Lon Multiples of $0.10^\circ$ | Modulo $0.1 = 0$ | Exact multiples of $0.10^\circ$ | **PASSED** |
| Dangling Parent References | 0 | 0 | **PASSED** |
| Spatial Provenance Columns Present | Yes | Yes | **PASSED** |

The grid alignment files [master_grid_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.parquet), [era5_to_master_grid_map.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/era5_to_master_grid_map.csv), and [dem_terrain_features_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet) are fully aligned and verified.

