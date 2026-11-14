# FIREINTEL — DEM Terrain Feature Processing Report (Phase 5B.2)

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Phase:** Phase 5B.2: Controlled Environmental Data Processing  
**Input Dataset:** Copernicus DEM GLO-30 (14 Cloud-Optimized GeoTIFF tiles, 30m resolution, EPSG:4326)  
**Virtual Mosaic:** [copernicus_dem_uttarakhand.vrt](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt)  
**Master Analysis Grid:** [master_grid_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.parquet) (2,174 cells, 0.05° resolution)  
**Execution Script:** [process_dem_terrain.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/process_dem_terrain.py)  
**Generated Outputs:**
- [dem_terrain_features_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet) (SHA-256: `5c1916ad8a78...`)
- [dem_terrain_features_005deg.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/dem_terrain_features_005deg.csv) (SHA-256: `04949f170c98...`)
- [dem_terrain_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/dem_terrain_manifest.json)

---

## 1. Executive Summary

Topography exerts first-order physical control on mountain wildfire ignition, behavior, and spread:
1. **Elevation** governs thermal lapse rates (cooling with altitude), atmospheric moisture deficits (VPD), fuel type transitions (from subtropical Sal forests to temperate Pine, Oak, and Alpine meadows), and snow cover duration.
2. **Slope** accelerates flame preheating of uphill fuels via convective and radiative flame tilting, multiplying forward rate of spread (Rothermel slope factor).
3. **Aspect** controls diurnal solar insolation: south- and south-west-facing slopes receive maximum solar radiation in the Northern Hemisphere, drying fine dead fuels much faster than shaded north-facing slopes.
4. **Terrain Roughness (Ruggedness)** creates complex valley wind channeling, turbulence, and fire-spread barriers.

In Phase 5B.2, the entire Copernicus DEM GLO-30 elevation dataset was processed and aggregated onto the **2,174 cells** of the Master `0.05°` Analysis Grid. **100.0% of cells** achieved complete, valid terrain feature extraction with zero missing data and strict NoData exclusion.

---

## 2. Processing Methodology & Metric Formulations

### 2.1 Spatial Windowing & Boundary Guarding
Each master grid cell spans $0.05^\circ \times 0.05^\circ$. At $30\text{ m}$ pixel resolution ($1/3600^\circ$ step), an interior cell encompasses exactly:
$$180 \times 180 = 32,400 \text{ pixels}$$
To compute horizontal gradients at edge pixels without boundary degradation, each window was extracted with a **1-pixel external buffer** ($182 \times 182 = 33,124 \text{ pixels}$).

### 2.2 Local Geodetic Metric Spacing
Because geographic coordinates (`EPSG:4326`) are measured in angular degrees, computing horizontal gradients requires converting degree increments into physical meters at the local latitude $\phi$:
$$\Delta y = \Delta \phi \times 111,132.954\text{ m} \approx 30.87\text{ m}$$
$$\Delta x(\phi) = \Delta \lambda \times 111,132.954 \times \cos\left(\frac{\pi}{180}\phi\right)\text{ m}$$
Across Uttarakhand ($28.7^\circ\text{N}$ to $31.5^\circ\text{N}$), $\Delta x$ varies smoothly from $27.08\text{ m}$ in the south to $26.32\text{ m}$ in the north, ensuring exact metric accuracy for all gradient derivatives.

### 2.3 Horn's Gradient Method for Slope & Downslope Aspect
Slope and aspect were derived using Horn's 8-neighbor weighted finite-difference algorithm (Horn, 1981):
$$\frac{\partial z}{\partial x} = \frac{(z_{NE} + 2z_E + z_{SE}) - (z_{NW} + 2z_W + z_{SW})}{8 \Delta x}$$
$$\frac{\partial z}{\partial y} = \frac{(z_{NW} + 2z_N + z_{NE}) - (z_{SW} + 2z_S + z_{SE})}{8 \Delta y}$$
- **Slope:**
  $$\text{slope} = \arctan\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right) \times \frac{180}{\pi} \quad [^\circ]$$
- **Downslope Aspect Azimuth (Clockwise from North):**
  $$\text{aspect} = \left(\arctan2\left(-\frac{\partial z}{\partial x}, -\frac{\partial z}{\partial y}\right) \times \frac{180}{\pi} + 360^\circ\right) \pmod{360^\circ}$$

### 2.4 Circular Mean Aspect Decomposition
Because aspect is angular and circular ($0^\circ \equiv 360^\circ$), taking an arithmetic mean of aspects across a cell leads to severe errors (e.g., averaging $355^\circ$ and $5^\circ$ gives $180^\circ$ / South rather than $0^\circ$ / North). 
Aspect was decomposed into its unit vector components:
$$\bar{S} = \frac{1}{N}\sum_{i=1}^N \sin(\theta_i), \quad \bar{C} = \frac{1}{N}\sum_{i=1}^N \cos(\theta_i)$$
$$\text{aspect\_mean\_deg} = \left(\arctan2(\bar{S}, \bar{C}) \times \frac{180}{\pi} + 360^\circ\right) \pmod{360^\circ}$$
Both the circular mean angle (`aspect_mean_deg`) and the continuous trigonometric components (`aspect_sin_mean`, `aspect_cos_mean`) were retained to support linear and tree-based machine learning models.

### 2.5 Riley's Terrain Ruggedness Index (TRI)
Micro-scale terrain roughness was computed at 30-meter resolution following Riley et al. (1999):
$$\text{TRI}_C = \sqrt{\sum_{k=1}^8 (z_k - z_C)^2}$$
where $z_C$ is the center pixel elevation and $z_k$ represents each of the 8 adjacent neighboring pixels. Both the mean TRI (`terrain_roughness_tri_mean`) and peak TRI (`terrain_roughness_tri_max`) were aggregated for each cell. In addition, the standard deviation of elevation (`elevation_std_m`) was computed to capture macro-relief variability across the entire ~5.5 km cell.

### 2.6 NoData & High-Altitude Safeguards
- Any pixel with value equal to the raster NoData value (`-99999.0`), NaN, or unphysical negative elevation ($< -500\text{ m}$) was masked out.
- For 3x3 kernel calculations, all 9 pixels were required to be valid; edge or partial cells properly excluded missing neighbors.
- If a cell had missing pixels, values were aggregated strictly over the valid pixels. Missing cells were left as `NaN` and **never filled with zero**, preventing false sea-level anomalies in mountain valleys.

---

## 3. Empirical Terrain Statistics across Uttarakhand

The feature processing pipeline processed all 2,174 cells in **8.94 seconds** (averaging 4.1 milliseconds per cell):

| Terrain Feature Metric | Minimum | Mean | Maximum | State-wide Standard Deviation | Physical Interpretation |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Cell Mean Elevation (`m`)** | 181.50 | 2,254.50 | 6,024.17 | 1,482.35 | Elevation across the 2,174 cells |
| **Lowest Pixel Elevation (`m`)** | 129.29 | — | — | — | Southern border / Terai plains (Udham Singh Nagar) |
| **Highest Pixel Elevation (`m`)** | — | — | 7,804.02 | — | Nanda Devi peak massif (Chamoli district) |
| **Cell Elevation Relief / Std (`m`)** | 1.85 | 321.40 | 895.12 | 196.20 | Macro relief within single 5.5 km cells |
| **Mean Slope (`deg`)** | 0.82 | 24.42 | 47.85 | 11.20 | Predominant steepness |
| **Maximum Local Slope (`deg`)** | 7.45 | 58.12 | 81.17 | 14.30 | Vertical precipices and canyon walls |
| **Mean Roughness TRI (`m`)** | 1.82 | 36.97 | 94.60 | 21.40 | High ruggedness index throughout Middle Himalayas |
| **Peak Roughness TRI (`m`)** | 14.50 | 184.20 | 417.31 | 78.50 | Glacial cirques and sharp ridge crests |

### Geographic Contrasts:
1. **Southern Foothills & Terai (e.g. `UT_050_28.7000_79.9000`):**  
   - Mean Elevation: `194.5 m`  
   - Mean Slope: `1.41°`  
   - Mean TRI: `2.74 m`  
   - Characteristics: Flat agricultural and low-relief Sal forest belt; fire spread dominated by wind and fuel loading rather than slope acceleration.
2. **Himalayan Crest / Nanda Devi Massif (e.g. `UT_050_30.3500_79.9500`):**  
   - Mean Elevation: `6,024.2 m` (Peak: `7,804.0 m`, Min: `4,692.8 m`)  
   - Elevation Relief (Std): `697.1 m`  
   - Mean Slope: `44.70°` (Peak Slope: `81.17°`)  
   - Mean TRI: `81.20 m` (Peak TRI: `417.31 m`)  
   - Characteristics: Extreme alpine terrain, permanent snow/ice, steep rocky precipices; natural barrier to wildfire spread.
3. **Mid-Himalayan Pine Belt (e.g. Almora, Pauri, Tehri Garhwal):**  
   - Mean Elevation: `1,200 m – 2,200 m`  
   - Mean Slope: `22° – 35°`  
   - Characteristics: Primary zone of high forest fire frequency; resin-rich Chir Pine stands on steep, dry south-facing slopes.

---

## 4. Verification & Validation Checklist

- [x] **Completeness:** Exactly 2,174 rows corresponding 1:1 with `master_grid_005deg.parquet`.
- [x] **Zero Nulls:** Zero missing values across all primary elevation, slope, aspect, and roughness fields.
- [x] **Physical Boundaries:** Elevation bounded within $[129.29\text{ m}, 7,804.02\text{ m}]$; slopes bounded within $[0^\circ, 90^\circ]$; aspect bounded within $[0^\circ, 360^\circ)$.
- [x] **Provenance Preservation:** Retained explicit spatial resolution tags (`copernicus_dem_glo30_zonal_005` and `era5_land_parent_010`).
- [x] **Checksum Integrity:** Both Parquet and CSV files verified with SHA-256 and recorded in `dem_terrain_manifest.json`.
- [x] **Automated Tests:** Covered by 4 new pytest unit tests in [test_dem_terrain.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/tests/test_dem_terrain.py) (all passed).

