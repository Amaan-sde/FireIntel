# FIREINTEL — Copernicus DEM GLO-30 Pilot Acquisition Report (Phase 5B.1)

**Phase:** Phase 5B.1: Controlled Real-World Environmental Data Acquisition (Pilot)  
**Target Domain:** Uttarakhand, India (`IN-UT`, `53,417.95 km²` in `EPSG:32644`)  
**Data Product:** Copernicus Global 30m Digital Surface Model (`COP30` / `GLO-30`)  
**Provider:** European Space Agency (ESA) / Airbus Defence and Space & German Aerospace Center (DLR)  
**Access Mechanism:** AWS Registry of Open Data (<https://registry.opendata.aws/copernicus-dem/>, public S3 bucket `copernicus-dem-30m.s3.amazonaws.com`)  
**Licence:** Copernicus DEM Licence (requires attribution to `© DLR e.V.` and `© Airbus Defence and Space GmbH`)  
**Execution Script:** [acquire_copernicus_dem.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/acquire_copernicus_dem.py)  
**Manifest:** [copernicus_dem_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/copernicus_dem_manifest.json)  
**Processed Mosaic VRT:** [copernicus_dem_uttarakhand.vrt](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt)

---

## 1. Executive Summary

In Phase 5B.1, FIREINTEL acquired and verified the complete set of **14 1-degree tiles of the Copernicus DEM GLO-30** covering Uttarakhand, India.

All 14 tiles (~580.6 MB total) were downloaded directly from the official AWS Registry of Open Data repository in **`340.50 seconds`**, verified with `rasterio`, checked for SHA-256 cryptographic integrity, and indexed into a standard GDAL Virtual Raster Table (VRT).

### Verified Key Topographic Findings:
- **Territorial Vertical Range:** Minimum elevation of **`129.29 m`** (southern Terai-Bhabhar foothill plains along the border with Uttar Pradesh) to maximum elevation of **`7,804.02 m`** (Nanda Devi summit massif, officially 7,816m, captured in tile `N30_00_E079_00`).
- **Data Completeness:** 100% gap-free coverage across the state boundary; zero missing tiles.
- **NoData Discipline:** Nodata values (-99999.0) are preserved without arbitrary zero replacement.

---

## 2. Acquired Tile Inventory & Exact Verification Metrics

Directly verified from [copernicus_dem_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/copernicus_dem_manifest.json):

| # | Tile Identifier | Dimensions | Size (MB) | Min Elev (m) | Max Elev (m) | Mean Elev (m) | SHA-256 Checksum (Prefix) | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `Copernicus_DSM_COG_10_N28_00_E079_00_DEM` | 3600 × 3600 | 41.7 | 147.29 | 254.45 | 179.33 | `7d6ca026e3cf...` | VERIFIED_OK |
| 2 | `Copernicus_DSM_COG_10_N28_00_E080_00_DEM` | 3600 × 3600 | 42.8 | 129.29 | 1991.95 | 240.45 | `ff7adfc1be43...` | VERIFIED_OK |
| 3 | `Copernicus_DSM_COG_10_N29_00_E077_00_DEM` | 3600 × 3600 | 41.1 | 202.29 | 319.69 | 244.86 | `2c81234e2e5f...` | VERIFIED_OK |
| 4 | `Copernicus_DSM_COG_10_N29_00_E078_00_DEM` | 3600 × 3600 | 42.5 | 196.96 | 2692.61 | 444.84 | `e212c69bd247...` | VERIFIED_OK |
| 5 | `Copernicus_DSM_COG_10_N29_00_E079_00_DEM` | 3600 × 3600 | 43.7 | 196.67 | 2765.32 | 1109.68 | `bda510488100...` | VERIFIED_OK |
| 6 | `Copernicus_DSM_COG_10_N29_00_E080_00_DEM` | 3600 × 3600 | 44.1 | 220.00 | 6771.50 | 1661.00 | `1ccf105a872a...` | VERIFIED_OK |
| 7 | `Copernicus_DSM_COG_10_N30_00_E077_00_DEM` | 3600 × 3600 | 42.8 | 254.80 | 3633.70 | 908.00 | `bb17a71886c3...` | VERIFIED_OK |
| 8 | `Copernicus_DSM_COG_10_N30_00_E078_00_DEM` | 3600 × 3600 | 43.3 | 301.40 | 6697.80 | 1946.80 | `1666bc434ca7...` | VERIFIED_OK |
| 9 | `Copernicus_DSM_COG_10_N30_00_E079_00_DEM` | 3600 × 3600 | 41.7 | 626.00 | **7804.02** | 3594.14 | `b24a393f1e17...` | VERIFIED_OK |
| 10 | `Copernicus_DSM_COG_10_N30_00_E080_00_DEM` | 3600 × 3600 | 39.2 | 1067.00 | 7095.40 | 4577.15 | `b093ff5d40d7...` | VERIFIED_OK |
| 11 | `Copernicus_DSM_COG_10_N30_00_E081_00_DEM` | 3600 × 3600 | 35.6 | 2315.90 | 7645.59 | 4902.38 | `1183336a0e28...` | VERIFIED_OK |
| 12 | `Copernicus_DSM_COG_10_N31_00_E077_00_DEM` | 3600 × 3600 | 42.5 | 573.90 | 6191.44 | 2654.36 | `6ee70595fcc9...` | VERIFIED_OK |
| 13 | `Copernicus_DSM_COG_10_N31_00_E078_00_DEM` | 3600 × 3600 | 40.6 | 1104.63 | 6739.85 | 4339.18 | `82eb7a2d68fe...` | VERIFIED_OK |
| 14 | `Copernicus_DSM_COG_10_N31_00_E079_00_DEM` | 3600 × 3600 | 39.0 | 3135.32 | 6919.84 | 4674.94 | `e0c615d87b9b...` | VERIFIED_OK |
| **Total** | **14 Tiles** | **3600 × 3600 ea** | **580.6 MB** | **129.29 m** | **7804.02 m** | — | — | **ALL VERIFIED** |

---

## 3. Data Integrity & Verification Standards

1. **Storage Tiering:**
   - Raw immutable GeoTIFFs: stored under `fireIntel/data/environmental/raw/copernicus_dem/`.
   - Processed virtual mosaic: generated as `fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt`.
2. **Checksum Tracking:**
   - Full SHA-256 cryptographic checksums are recorded for every tile in [copernicus_dem_manifest.json](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/data/environmental/manifests/copernicus_dem_manifest.json).
3. **NoData Value Handling:**
   - In accordance with Phase 5B rules, **no missing elevation values are silently replaced with zero**. Valid pixel masks are strictly enforced when computing zonal cell statistics.
4. **Resolution & Projection Integrity:**
   - Horizontal CRS: `EPSG:4326` (WGS 84 2D geographic).
   - Pixel spacing: `1 arc-second` (`0.000277777778°` / ~30 m).
   - Vertical datum: `EGM2008` orthometric height.

---

## 4. Virtual Raster Table (VRT) Verification

The pipeline assembled a standard **GDAL Virtual Raster Table (VRT)** at:
`fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt`

- **Global Raster Extent:** Longitude `[76.9999°E, 81.9999°E]`, Latitude `[28.0001°N, 32.0001°N]`.
- **Global Grid Dimensions:** `18,000 × 14,400` pixels (`259,200,000` pixels total).
- **Verification:** Verified with `rasterio.open()`. The virtual mosaic seamlessly covers all `2,174` Master Grid cells without seam artifacts or nodata gaps inside Uttarakhand.
