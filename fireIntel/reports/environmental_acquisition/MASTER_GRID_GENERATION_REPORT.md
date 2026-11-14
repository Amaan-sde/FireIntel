# FIREINTEL — Master Grid Generation Report (Phase 5B.1)

**Phase:** Phase 5B.1: Controlled Real-World Environmental Data Acquisition (Pilot)  
**Target Domain:** Uttarakhand, India (`IN-UT`, `53,417.95 km²` in `EPSG:32644`)  
**Specification Reference:** [PHASE_5A_ACQUISITION_ARCHITECTURE.md](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/reports/environmental_acquisition/PHASE_5A_ACQUISITION_ARCHITECTURE.md)  
**Execution Script:** [generate_master_grid.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/generate_master_grid.py)  
**Generated Outputs:**
- [master_grid_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.parquet)
- [master_grid_005deg.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.geojson)
- [era5_to_master_grid_map.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/era5_to_master_grid_map.csv)
- [master_grid_metadata.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_metadata.json)

---

## 1. Executive Summary

In Phase 5B.1, FIREINTEL successfully constructed the **Master `0.05°` Analysis Grid** across Uttarakhand, India. The grid establishes a uniform, reproducible spatial framework linking satellite fire detections ([uttarakhand_fires_boundary.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.csv)) with continuous environmental variables (ERA5-Land reanalysis, MODIS/VIIRS vegetation composites, and Copernicus DEM topography).

The generator executed in **`3.0 seconds`** on the official boundary [uttarakhand_boundary.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/boundaries/uttarakhand_boundary.geojson), generating:
- **`2,174` total boundary-intersecting cells** (covering the state and border zones).
- **`2,000` centroid-inside cells** (strictly interior to Uttarakhand).
- **`581` unique parent ERA5-Land `0.1°` grid nodes** mapped via nearest-centroid geometry.
- **`53,417.97 km²` effective area coverage** ($\sum \text{cell\_area} \times \text{area\_fraction}$), matching the official boundary polygon planar area (`53,417.95 km²` in `EPSG:32644`) within **`0.02 km²` (0.00004% difference)**.

---

## 2. Geometric & Mathematical Specifications

### 2.1 Grid Origin & Indexing Convention
Following FIREINTEL's Phase 2/3 EDA convention in [eda.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/eda.py):
- **South-West Cell Corner (Cell Origin):**
  $$\text{grid\_lat\_sw} = \text{floor}(\text{latitude} / 0.05) \times 0.05$$
  $$\text{grid\_lon\_sw} = \text{floor}(\text{longitude} / 0.05) \times 0.05$$
- **Cell Centroid:**
  $$\text{centroid\_lat} = \text{grid\_lat\_sw} + 0.025, \quad \text{centroid\_lon} = \text{grid\_lon\_sw} + 0.025$$
- **Canonical Cell Identifier (`grid_cell_id`):**
  `UT_005_{grid_lat_sw:.4f}_{grid_lon_sw:.4f}` (e.g., `UT_005_28.7000_78.8500`).
  This format guarantees stable, immutable string primary keys across future modeling tables.

### 2.2 Parent ERA5-Land Cell Nesting
In ECMWF / Copernicus CDS `reanalysis-era5-land`, coordinates are **grid nodes (cell centers)** at exact multiples of `0.1°` (e.g. `29.9, 30.0, 30.1`). Each `0.1°` node represents a cell spanning $\pm 0.05°$ around its center.

For every Master Grid cell $c$ with centroid $(\text{lat}_c, \text{lon}_c)$:
$$\text{parent\_lat} = \text{round}(\text{centroid\_lat}, 1), \quad \text{parent\_lon} = \text{round}(\text{centroid\_lon}, 1)$$
$$\text{era5\_parent\_cell\_id} = \text{ERA5L\_\{\text{parent\_lat}:.4f\}\_\{\text{parent\_lon}:.4f\}}$$

**Nesting Invariant:** Exactly four `0.05°` cells nest cleanly beneath each `0.1°` ERA5-Land node (e.g., sub-cells with SW corners `(29.95, 77.95)`, `(29.95, 78.00)`, `(30.00, 77.95)`, `(30.00, 78.00)` all map to parent node `(30.0, 78.0)`).

### 2.3 Boundary Overlap Fractions in Metric CRS (`EPSG:32644`)
To prevent distortion caused by unprojected degree-based calculations, the intersection between each cell box and the state polygon was evaluated in **`EPSG:32644` (WGS 84 / UTM Zone 44N)**:
$$\text{uttarakhand\_area\_fraction} = \frac{\text{Area}(\text{cell} \cap \text{state\_polygon})}{\text{Area}(\text{cell})}$$
- **Interior cells:** Fraction = `1.0000` (`1,732` cells are 100% inside Uttarakhand).
- **Border cells:** Fraction ranges between `0.0001` and `0.9999` (`442` border cells).
- **Mean area fraction:** `0.9203` (92.03% of cell area across all 2,174 cells is within Uttarakhand).

---

## 3. Metadata Catalog Summary

Extracted directly from [master_grid_metadata.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_metadata.json):

| Metric | Measured Value | Unit / Format |
| :--- | :---: | :--- |
| **Grid Step** | `0.05` | Degrees WGS 84 |
| **Nominal Cell Resolution at 30°N** | `5.57 × 4.82` | km (lat × lon) |
| **Candidate Bounding Box Cells** | `3,920` | `56` lats × `70` lons (`28.70°–31.45°N`, `77.55°–81.00°E`) |
| **Boundary-Intersecting Cells** | **`2,174`** | Complete analysis universe |
| **Centroid-Inside Cells** | **`2,000`** | Cells with center inside polygon |
| **Total Official State Area** | `53,417.95` | $\text{km}^2$ (`EPSG:32644`) |
| **Grid Effective Area Coverage** | `53,417.97` | $\text{km}^2$ ($\sum \text{area} \times \text{fraction}$) |
| **Unique ERA5-Land Parents** | `581` | Unique `0.1°` parent nodes |
| **Geographic CRS** | `EPSG:4326` | 2D WGS 84 |
| **Planar Metric CRS** | `EPSG:32644` | UTM Zone 44N |

---

## 4. Generated File Manifest & Verification

1. [master_grid_005deg.parquet](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.parquet) (`2,174` rows, `10` columns, ~120 KB): High-performance binary format for downstream joins.
2. [master_grid_005deg.geojson](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_005deg.geojson) (`2,174` Polygon features, ~1.4 MB): Direct GIS visualization format for QGIS/web maps.
3. [era5_to_master_grid_map.csv](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/era5_to_master_grid_map.csv) (`2,174` rows, `6` columns): Lightweight lookup mapping `grid_cell_id` to `era5_parent_cell_id`.
4. [master_grid_metadata.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/metadata/master_grid_metadata.json): Machine-readable execution and audit summary.

