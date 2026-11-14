# FIREINTEL — Actual Spatial Grid Alignment & Provenance Report (Phase 5B.3)

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Phase:** Phase 5B.3: Live ERA5-Land Pilot Validation  
**Target Domain:** Uttarakhand, India (`IN-UT`, official boundary `53,417.95 km²` in `EPSG:32644`)  
**Grids Evaluated:**
- **Master Analysis Grid:** $0.05^\circ \times 0.05^\circ$ ($\approx 5.57\text{ km} \times 4.82\text{ km}$, 2,174 boundary-intersecting cells)
- **ERA5-Land Grid Bounding Box:** $[31.5^\circ\text{N}, 77.5^\circ\text{E}, 28.7^\circ\text{N}, 81.1^\circ\text{E}]$ (29 latitudes $\times 37$ longitudes = 1,073 nodes)
- **Uttarakhand Parent ERA5 Nodes:** Exactly 581 unique parent nodes  
**Validation Suite:** [test_grid_alignment.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_grid_alignment.py) (All 2 unit tests passed)

---

## 1. Executive Summary

Spatial alignment between heterogeneous remote sensing and numerical reanalysis grids is a foundational requirement of FIREINTEL:
- Satellite active fire observations: $375\text{ m}$ (VIIRS) and $1,000\text{ m}$ (MODIS).
- Topographic digital elevation: $30\text{ m}$ (Copernicus DEM GLO-30).
- Atmospheric weather & hydrology: $0.10^\circ \approx 9\text{ km}$ (ERA5-Land).

To unify these data streams without introducing spatial distortion or false precision, FIREINTEL established the **Master $0.05^\circ$ Analysis Grid** (2,174 cells) as the standardized analytical index.

This report documents the coordinate geometry, parent-child mapping, bounding box coverage, and strict provenance enforcement governing ERA5-Land spatial harmonization.

---

## 2. ERA5-Land Bounding Box & Coordinate Geometry

The spatial subset requested from Copernicus CDS is bounded by:
$$\text{North: } 31.5^\circ\text{N}, \quad \text{West: } 77.5^\circ\text{E}, \quad \text{South: } 28.7^\circ\text{N}, \quad \text{East: } 81.1^\circ\text{E}$$

### Coordinate Node Grid:
- **Latitudes:** Descending from $31.5^\circ\text{N}$ down to $28.7^\circ\text{N}$ at $0.10^\circ$ increments:
  $$N_{\text{lat}} = \frac{31.5 - 28.7}{0.10} + 1 = 29 \text{ nodes}$$
- **Longitudes:** Ascending from $77.5^\circ\text{E}$ up to $81.1^\circ\text{E}$ at $0.10^\circ$ increments:
  $$N_{\text{lon}} = \frac{81.1 - 77.5}{0.10} + 1 = 37 \text{ nodes}$$
- **Total Subset Grid Nodes:** $29 \times 37 = 1,073 \text{ nodes}$.

```text
       77.5°E                         81.1°E
31.5°N +-----------------------------------+
       |                                   |
       |       [ UTTARAKHAND IN-UT ]       |
       |       581 Intersecting Nodes      |
       |       Subsuming 2,174 Cells       |
       |                                   |
28.7°N +-----------------------------------+
```

Of these 1,073 spatial nodes in the regional bounding box:
- **581 nodes** intersect or directly overlay the Uttarakhand state administrative boundary polygon.
- **492 nodes** form the necessary peripheral buffer across Himachal Pradesh, Haryana, Uttar Pradesh, Nepal, and Tibet, preventing edge clipping artifacts during spatial lookups.

---

## 3. Parent-Child Hierarchical Nesting Formulation

### 3.1 Mapping Formulation
Every $0.05^\circ$ master cell centroid $(\phi_C, \lambda_C)$ is mapped to its parent ERA5-Land node using mathematical rounding to the nearest $0.10^\circ$:
$$\text{era5\_parent\_lat} = \text{round}(\phi_C, 1)$$
$$\text{era5\_parent\_lon} = \text{round}(\lambda_C, 1)$$
$$\text{era5\_parent\_cell\_id} = \text{ERA5L\_}\{\text{era5\_parent\_lat}\}\_\{\text{era5\_parent\_lon}\}$$

### 3.2 Topological Nesting
Because a $0.10^\circ \times 0.10^\circ$ cell has 4 times the area of a $0.05^\circ \times 0.05^\circ$ cell, an interior ERA5-Land parent node cleanly subsumes a $2 \times 2$ cluster of 4 master grid cells:
- Child NW: $(\phi_C + 0.025, \lambda_C - 0.025)$
- Child NE: $(\phi_C + 0.025, \lambda_C + 0.025)$
- Child SW: $(\phi_C - 0.025, \lambda_C - 0.025)$
- Child SE: $(\phi_C - 0.025, \lambda_C + 0.025)$

Across the 2,174 cells in [master_grid_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.parquet):
- Exactly **581 unique parent ERA5 nodes** are mapped.
- Average ratio: **3.74 child cells per parent node** (reflecting boundary truncation at state borders).
- **Zero dangling or unmapped child cells.**

---

## 4. Scientific Provenance & Resolution Integrity

Requirement 5 explicitly commands:
> *"Preserve the native ERA5-Land meteorological resolution. Do not claim that interpolation creates higher-resolution weather observations."*

### Scientific Enforcement Principles:
1. **No Artificial Meteorological Resolution:**  
   Assigning parent ERA5-Land variables to $0.05^\circ$ master grid cells is a tabular alignment index. It provides a common geospatial join key to correlate satellite fire observations and DEM terrain features with atmospheric forcing. **It does NOT create new $0.05^\circ$ weather data.**
2. **Mandatory Provenance Columns:**  
   Every row in the unified feature store carries explicit resolution provenance:
   - `spatial_resolution_prov = "copernicus_dem_glo30_zonal_005"` (30m elevation aggregated over 32,400 pixels).
   - `met_spatial_resolution_prov = "era5_land_parent_010"` (native $0.10^\circ \approx 9\text{ km}$ synoptic weather).
3. **No Unverified Lapse-Rate Smoothing:**  
   As established in Requirement 6, no empirical lapse-rate temperature adjustments are applied without the actual NetCDF model surface geopotential height ($Z_{\text{ERA5}}$).

---

## 5. Verification Checklist

- [x] **Coordinate Boundary Verification:** All 581 parent nodes fall strictly within $[28.7, 31.5]^\circ\text{N}$ and $[77.5, 81.1]^\circ\text{E}$.
- [x] **Grid Alignment Integrity:** 100% 1:1 mapping verified between `master_grid_005deg.parquet` and `era5_to_master_grid_map.csv`.
- [x] **Zero Coordinate Drift:** All parent coordinates are exact multiples of $0.10^\circ$.
- [x] **Automated Regression Suite:** Tested and verified in [test_grid_alignment.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_grid_alignment.py) (all tests passed).

