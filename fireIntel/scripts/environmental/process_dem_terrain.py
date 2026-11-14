"""Copernicus DEM GLO-30 Terrain Processing Pipeline for Uttarakhand Master Grid.

Aggregates 30-meter digital elevation model features onto the master 0.05-degree analysis grid.
Calculates elevation statistics, slope, circular aspect, and Terrain Ruggedness Index (TRI)
using metric geodetic conversions and strict NoData masking.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
import sys
import time
from typing import Any

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.windows import from_bounds

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from environmental.config import EnvironmentalPaths
from environmental.manifest import compute_sha256


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Configure structured logging for terrain processing."""
    logger = logging.getLogger("fireintel.dem_terrain")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


@dataclass(frozen=True)
class TerrainProcessingSummary:
    """Summary metrics of the DEM terrain feature extraction."""

    total_grid_cells: int
    cells_processed: int
    cells_with_valid_dem: int
    cells_with_missing_dem: int
    elevation_min_overall_m: float
    elevation_max_overall_m: float
    elevation_mean_overall_m: float
    slope_mean_overall_deg: float
    slope_max_overall_deg: float
    tri_mean_overall_m: float
    tri_max_overall_m: float
    duration_seconds: float
    output_parquet: str
    output_csv: str
    vrt_source: str


def compute_cell_terrain_features(
    z: np.ndarray,
    valid_mask: np.ndarray,
    dx_meters: float,
    dy_meters: float,
) -> dict[str, float | int]:
    """Compute terrain statistics for a single cell given an elevation window with a 1-pixel margin.

    Args:
        z: 2D array of elevations in meters (shape: H+2, W+2) including 1-pixel buffer.
        valid_mask: 2D boolean array of valid non-nodata pixels.
        dx_meters: Local metric spacing between longitude pixels.
        dy_meters: Local metric spacing between latitude pixels.

    Returns:
        Dictionary of computed summary statistics for the interior cell.
    """
    center = z[1:-1, 1:-1]
    center_valid = valid_mask[1:-1, 1:-1]
    total_pixels = int(center.size)
    valid_pixels = int(np.count_nonzero(center_valid))
    nodata_pixels = total_pixels - valid_pixels

    if valid_pixels == 0:
        return {
            "elevation_mean_m": np.nan,
            "elevation_min_m": np.nan,
            "elevation_max_m": np.nan,
            "elevation_std_m": np.nan,
            "slope_mean_deg": np.nan,
            "slope_max_deg": np.nan,
            "aspect_mean_deg": np.nan,
            "aspect_sin_mean": np.nan,
            "aspect_cos_mean": np.nan,
            "terrain_roughness_tri_mean": np.nan,
            "terrain_roughness_tri_max": np.nan,
            "dem_pixel_count": total_pixels,
            "dem_valid_pixel_count": 0,
            "dem_nodata_count": nodata_pixels,
        }

    elev_valid = center[center_valid]
    elev_mean = float(np.mean(elev_valid))
    elev_min = float(np.min(elev_valid))
    elev_max = float(np.max(elev_valid))
    elev_std = float(np.std(elev_valid))

    # Kernel valid mask: center pixel and all 8 neighbors must be valid
    kernel_valid = (
        valid_mask[:-2, :-2] & valid_mask[:-2, 1:-1] & valid_mask[:-2, 2:] &
        valid_mask[1:-1, :-2] & valid_mask[1:-1, 1:-1] & valid_mask[1:-1, 2:] &
        valid_mask[2:, :-2] & valid_mask[2:, 1:-1] & valid_mask[2:, 2:]
    )

    if not np.any(kernel_valid):
        return {
            "elevation_mean_m": elev_mean,
            "elevation_min_m": elev_min,
            "elevation_max_m": elev_max,
            "elevation_std_m": elev_std,
            "slope_mean_deg": np.nan,
            "slope_max_deg": np.nan,
            "aspect_mean_deg": np.nan,
            "aspect_sin_mean": np.nan,
            "aspect_cos_mean": np.nan,
            "terrain_roughness_tri_mean": np.nan,
            "terrain_roughness_tri_max": np.nan,
            "dem_pixel_count": total_pixels,
            "dem_valid_pixel_count": valid_pixels,
            "dem_nodata_count": nodata_pixels,
        }

    # Horn's gradients (Horn, 1981): dz/dx and dz/dy
    # Note: Row index increases southward (downwards in image space)
    # Row 0 is North (higher lat), Row 2 is South (lower lat)
    dz_dx = ((z[:-2, 2:] + 2 * z[1:-1, 2:] + z[2:, 2:]) - (z[:-2, :-2] + 2 * z[1:-1, :-2] + z[2:, :-2])) / (8.0 * dx_meters)
    dz_dy = ((z[:-2, :-2] + 2 * z[:-2, 1:-1] + z[:-2, 2:]) - (z[2:, :-2] + 2 * z[2:, 1:-1] + z[2:, 2:])) / (8.0 * dy_meters)

    # Slope in radians and degrees
    slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    slope_deg = np.degrees(slope_rad)

    # Downslope aspect azimuth (measured clockwise from North in degrees)
    # Downslope vector is (-dz/dx, -dz/dy)
    aspect_rad = (np.arctan2(-dz_dx, -dz_dy) + 2.0 * np.pi) % (2.0 * np.pi)

    # Riley's Terrain Ruggedness Index (TRI - Riley et al., 1999)
    # Square root of sum of squared elevation differences to 8 neighbors
    tri = np.sqrt(
        (z[:-2, :-2] - center)**2 + (z[:-2, 1:-1] - center)**2 + (z[:-2, 2:] - center)**2 +
        (z[1:-1, :-2] - center)**2 + (z[1:-1, 2:] - center)**2 +
        (z[2:, :-2] - center)**2 + (z[2:, 1:-1] - center)**2 + (z[2:, 2:] - center)**2
    )

    slope_v = slope_deg[kernel_valid]
    tri_v = tri[kernel_valid]
    aspect_rad_v = aspect_rad[kernel_valid]

    slope_mean = float(np.mean(slope_v))
    slope_max = float(np.max(slope_v))
    tri_mean = float(np.mean(tri_v))
    tri_max = float(np.max(tri_v))

    # Circular mean of aspect via vector components
    sin_a = np.sin(aspect_rad_v)
    cos_a = np.cos(aspect_rad_v)
    mean_sin = float(np.mean(sin_a))
    mean_cos = float(np.mean(cos_a))
    circ_aspect = float((np.degrees(np.arctan2(mean_sin, mean_cos)) + 360.0) % 360.0)

    return {
        "elevation_mean_m": round(elev_mean, 2),
        "elevation_min_m": round(elev_min, 2),
        "elevation_max_m": round(elev_max, 2),
        "elevation_std_m": round(elev_std, 2),
        "slope_mean_deg": round(slope_mean, 2),
        "slope_max_deg": round(slope_max, 2),
        "aspect_mean_deg": round(circ_aspect, 2),
        "aspect_sin_mean": round(mean_sin, 4),
        "aspect_cos_mean": round(mean_cos, 4),
        "terrain_roughness_tri_mean": round(tri_mean, 2),
        "terrain_roughness_tri_max": round(tri_max, 2),
        "dem_pixel_count": total_pixels,
        "dem_valid_pixel_count": valid_pixels,
        "dem_nodata_count": nodata_pixels,
    }


def process_dem_terrain(
    grid_path: Path,
    vrt_path: Path,
    output_parquet: Path,
    output_csv: Path,
    manifest_path: Path,
    verbose: bool = False,
) -> TerrainProcessingSummary:
    """Extract terrain statistics for all master grid cells from the Copernicus DEM VRT.

    Preserves parent ERA5 cell identifiers and writes clean parquet and CSV feature tables.
    """
    logger = configure_logging(verbose)
    t0 = time.time()

    if not grid_path.is_file():
        raise FileNotFoundError(f"Master grid file not found at: {grid_path}")
    if not vrt_path.is_file():
        raise FileNotFoundError(f"DEM VRT mosaic not found at: {vrt_path}")

    logger.info("Loading master grid from: %s", grid_path)
    grid_gdf = gpd.read_parquet(grid_path)
    total_cells = len(grid_gdf)
    logger.info("Loaded %d master grid cells", total_cells)

    logger.info("Opening DEM VRT mosaic: %s", vrt_path)
    records: list[dict[str, Any]] = []

    with rasterio.open(vrt_path) as src:
        nodata = src.nodata if src.nodata is not None else -99999.0
        res_x_deg = src.transform[0]
        res_y_deg = -src.transform[4]
        vrt_bounds = src.bounds

        logger.info(
            "VRT raster dimensions: %dx%d, res=(%.6f, %.6f) deg, nodata=%s",
            src.width,
            src.height,
            res_x_deg,
            res_y_deg,
            nodata,
        )

        # Standard metric conversion parameters (WGS84 ellipsoid)
        dy_meters = res_y_deg * 111132.954

        for idx, row in grid_gdf.iterrows():
            if (idx + 1) % 500 == 0 or idx == total_cells - 1:
                logger.info("Processed %d / %d cells (%.1f%%)...", idx + 1, total_cells, 100.0 * (idx + 1) / total_cells)

            cell_geom = row.geometry
            minx, miny, maxx, maxy = cell_geom.bounds

            # 1-pixel buffer in degrees
            buf_minx = minx - res_x_deg
            buf_miny = miny - res_y_deg
            buf_maxx = maxx + res_x_deg
            buf_maxy = maxy + res_y_deg

            # Compute local metric spacing for longitude based on cell centroid latitude
            lat_centroid = row.centroid_lat
            dx_meters = res_x_deg * 111132.954 * np.cos(np.radians(lat_centroid))

            # Read buffered window
            win = from_bounds(buf_minx, buf_miny, buf_maxx, buf_maxy, src.transform)
            z_arr = src.read(1, window=win).astype(np.float64)

            # Valid mask: exclude nodata, nan, and unrealistic negative heights
            valid_mask = (z_arr != nodata) & (~np.isnan(z_arr)) & (z_arr > -500.0)

            stats = compute_cell_terrain_features(
                z=z_arr,
                valid_mask=valid_mask,
                dx_meters=dx_meters,
                dy_meters=dy_meters,
            )

            rec: dict[str, Any] = {
                "grid_cell_id": row.grid_cell_id,
                "grid_lat_sw": row.grid_lat_sw,
                "grid_lon_sw": row.grid_lon_sw,
                "centroid_lat": row.centroid_lat,
                "centroid_lon": row.centroid_lon,
                "centroid_inside": row.centroid_inside,
                "era5_parent_cell_id": row.era5_parent_cell_id,
                "era5_parent_lat": row.era5_parent_lat,
                "era5_parent_lon": row.era5_parent_lon,
                **stats,
                "spatial_resolution_prov": "copernicus_dem_glo30_zonal_005",
                "met_spatial_resolution_prov": "era5_land_parent_010",
            }
            records.append(rec)

    df_terrain = pd.DataFrame(records)

    # Create output directories
    output_parquet.parent.mkdir(parents=True, exist_ok=True)
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    # Save outputs
    logger.info("Saving terrain features to Parquet: %s", output_parquet)
    df_terrain.to_parquet(output_parquet, index=False, engine="pyarrow")

    logger.info("Saving terrain features to CSV: %s", output_csv)
    df_terrain.to_csv(output_csv, index=False)

    valid_cells = df_terrain["elevation_mean_m"].notna().sum()
    missing_cells = df_terrain["elevation_mean_m"].isna().sum()

    dt = time.time() - t0
    logger.info(
        "DEM processing complete in %.2f seconds. Valid cells: %d, Missing cells: %d",
        dt,
        valid_cells,
        missing_cells,
    )

    parquet_sha = compute_sha256(output_parquet)
    csv_sha = compute_sha256(output_csv)

    summary = TerrainProcessingSummary(
        total_grid_cells=total_cells,
        cells_processed=len(df_terrain),
        cells_with_valid_dem=int(valid_cells),
        cells_with_missing_dem=int(missing_cells),
        elevation_min_overall_m=float(df_terrain["elevation_min_m"].min()),
        elevation_max_overall_m=float(df_terrain["elevation_max_m"].max()),
        elevation_mean_overall_m=float(df_terrain["elevation_mean_m"].mean()),
        slope_mean_overall_deg=float(df_terrain["slope_mean_deg"].mean()),
        slope_max_overall_deg=float(df_terrain["slope_max_deg"].max()),
        tri_mean_overall_m=float(df_terrain["terrain_roughness_tri_mean"].mean()),
        tri_max_overall_m=float(df_terrain["terrain_roughness_tri_max"].max()),
        duration_seconds=round(dt, 2),
        output_parquet=str(output_parquet),
        output_csv=str(output_csv),
        vrt_source=str(vrt_path),
    )

    manifest_data = {
        "dataset_name": "copernicus_dem_glo30_terrain_features",
        "phase": "5B.2",
        "target_region": "Uttarakhand, India",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": asdict(summary),
        "checksums": {
            "parquet_sha256": parquet_sha,
            "csv_sha256": csv_sha,
        },
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    logger.info("Manifest saved to: %s", manifest_path)

    return summary


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Process Copernicus DEM GLO-30 terrain features for Master Grid.")
    parser.add_argument(
        "--grid-path",
        type=Path,
        default=Path("fireIntel/data/environmental/metadata/master_grid_005deg.parquet"),
        help="Path to master grid parquet file",
    )
    parser.add_argument(
        "--vrt-path",
        type=Path,
        default=Path("fireIntel/data/environmental/processed/copernicus_dem_uttarakhand.vrt"),
        help="Path to Copernicus DEM VRT mosaic",
    )
    parser.add_argument(
        "--output-parquet",
        type=Path,
        default=Path("fireIntel/data/environmental/processed/dem_terrain_features_005deg.parquet"),
        help="Output parquet path",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=Path("fireIntel/data/environmental/processed/dem_terrain_features_005deg.csv"),
        help="Output CSV path",
    )
    parser.add_argument(
        "--manifest-path",
        type=Path,
        default=Path("fireIntel/data/environmental/manifests/dem_terrain_manifest.json"),
        help="Path to write manifest JSON",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose debug logging")
    return parser.parse_args()


def main() -> None:
    """Entry point for DEM terrain processing script."""
    args = parse_args()
    summary = process_dem_terrain(
        grid_path=args.grid_path,
        vrt_path=args.vrt_path,
        output_parquet=args.output_parquet,
        output_csv=args.output_csv,
        manifest_path=args.manifest_path,
        verbose=args.verbose,
    )
    print("\n=== DEM Terrain Processing Summary ===")
    print(f"Total Master Grid Cells: {summary.total_grid_cells}")
    print(f"Cells with Valid DEM:    {summary.cells_with_valid_dem}")
    print(f"Cells Missing DEM:       {summary.cells_with_missing_dem}")
    print(f"Elevation Range:         [{summary.elevation_min_overall_m:.1f}m - {summary.elevation_max_overall_m:.1f}m]")
    print(f"Elevation Mean (State):  {summary.elevation_mean_overall_m:.1f}m")
    print(f"Slope (Mean / Max):      {summary.slope_mean_overall_deg:.2f}° / {summary.slope_max_overall_deg:.2f}°")
    print(f"TRI Roughness (Mean/Max):{summary.tri_mean_overall_m:.2f}m / {summary.tri_max_overall_m:.2f}m")
    print(f"Duration:                {summary.duration_seconds}s")
    print("=======================================\n")


if __name__ == "__main__":
    main()

