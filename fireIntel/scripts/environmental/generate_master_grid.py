"""Master analysis grid generator for FIREINTEL.

Constructs the standardized 0.05-degree WGS 84 analysis grid over Uttarakhand,
calculates boundary overlap fractions in EPSG:32644 (UTM Zone 44N),
maps parent 0.1-degree ERA5-Land cells, and outputs standardized spatial catalogs.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import logging
import math
from pathlib import Path
import sys
import time

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import box, mapping

# Add scripts directory to path if needed
SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from environmental.config import EnvironmentalPaths, GridConfig
from environmental.transformations import get_parent_era5_node


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Set up structured logging."""
    logger = logging.getLogger("fireintel.master_grid")
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
class MasterGridSummary:
    """Summary statistics for the generated master analysis grid."""

    step_deg: float
    total_bounding_box_cells: int
    intersecting_cells: int
    centroid_inside_cells: int
    total_state_area_km2: float
    grid_area_coverage_km2: float
    area_fraction_mean: float
    unique_era5_parent_cells: int
    boundary_file: str
    geographic_crs: str
    metric_crs: str
    generated_at_utc: str


def build_master_grid(
    boundary_path: Path,
    grid_config: GridConfig = GridConfig(),
    logger: logging.Logger | None = None,
) -> tuple[gpd.GeoDataFrame, pd.DataFrame, MasterGridSummary]:
    """Generate the complete 0.05 deg Master Analysis Grid over Uttarakhand.

    Args:
        boundary_path: Path to Uttarakhand GeoJSON polygon.
        grid_config: Grid specification (default 0.05 deg, EPSG:4326 / EPSG:32644).
        logger: Optional logger instance.

    Returns:
        Tuple of (grid_gdf with geometries, era5_map_df, summary_metadata).
    """
    log = logger or logging.getLogger(__name__)
    log.info("Loading administrative boundary from %s", boundary_path)

    boundary_gdf = gpd.read_file(boundary_path)
    if boundary_gdf.empty:
        raise ValueError(f"Boundary file is empty: {boundary_path}")

    # Ensure EPSG:4326 for geographic bounding
    if boundary_gdf.crs != grid_config.geographic_crs:
        boundary_gdf = boundary_gdf.to_crs(grid_config.geographic_crs)

    geom_4326 = boundary_gdf.geometry.iloc[0]
    minx, miny, maxx, maxy = geom_4326.bounds
    log.info(
        "Boundary extent: Lon [%.4f, %.4f], Lat [%.4f, %.4f]",
        minx,
        maxx,
        miny,
        maxy,
    )

    # Reproject to planar metric CRS (EPSG:32644) for exact area calculation
    boundary_metric = boundary_gdf.to_crs(grid_config.metric_crs)
    geom_metric = boundary_metric.geometry.iloc[0]
    state_area_km2 = float(geom_metric.area / 1e6)
    log.info(
        "State planar area in %s: %.2f km²",
        grid_config.metric_crs,
        state_area_km2,
    )

    step = grid_config.step_deg
    lons = np.arange(math.floor(minx / step) * step, maxx + step * 0.001, step)
    lats = np.arange(math.floor(miny / step) * step, maxy + step * 0.001, step)
    total_bbox_cells = len(lons) * len(lats)
    log.info(
        "Candidate bounding box cells: %d (%d lats x %d lons)",
        total_bbox_cells,
        len(lats),
        len(lons),
    )

    records = []
    parent_map_records = []

    for sw_lat in lats:
        for sw_lon in lons:
            cell_box = box(sw_lon, sw_lat, sw_lon + step, sw_lat + step)
            if geom_4326.intersects(cell_box):
                centroid = cell_box.centroid
                centroid_in = bool(geom_4326.contains(centroid))
                sw_lat_r = round(float(sw_lat), 4)
                sw_lon_r = round(float(sw_lon), 4)
                c_lat_r = round(float(centroid.y), 4)
                c_lon_r = round(float(centroid.x), 4)

                cell_id = (
                    f"UT_{int(step*1000):03d}_{sw_lat_r:.4f}_{sw_lon_r:.4f}"
                )
                parent_lat, parent_lon = get_parent_era5_node(c_lat_r, c_lon_r)
                parent_id = f"ERA5L_{parent_lat:.4f}_{parent_lon:.4f}"

                records.append({
                    "grid_cell_id": cell_id,
                    "grid_lat_sw": sw_lat_r,
                    "grid_lon_sw": sw_lon_r,
                    "centroid_lat": c_lat_r,
                    "centroid_lon": c_lon_r,
                    "centroid_inside": centroid_in,
                    "era5_parent_cell_id": parent_id,
                    "era5_parent_lat": parent_lat,
                    "era5_parent_lon": parent_lon,
                    "geometry": cell_box,
                })

                parent_map_records.append({
                    "grid_cell_id": cell_id,
                    "grid_lat_sw": sw_lat_r,
                    "grid_lon_sw": sw_lon_r,
                    "era5_parent_cell_id": parent_id,
                    "era5_parent_lat": parent_lat,
                    "era5_parent_lon": parent_lon,
                })

    grid_gdf = gpd.GeoDataFrame(records, crs=grid_config.geographic_crs)
    log.info("Identified %d boundary-intersecting cells", len(grid_gdf))

    # Calculate exact intersection fractions in metric CRS
    log.info("Calculating boundary overlap fractions in %s...", grid_config.metric_crs)
    grid_metric = grid_gdf.to_crs(grid_config.metric_crs)
    cell_metric_areas = grid_metric.geometry.area
    intersections = grid_metric.geometry.intersection(geom_metric)
    overlap_fractions = (intersections.area / cell_metric_areas).clip(0.0, 1.0)
    grid_gdf["uttarakhand_area_fraction"] = overlap_fractions.round(4)
    grid_gdf["cell_area_km2"] = (cell_metric_areas / 1e6).round(3)

    era5_map_df = pd.DataFrame(parent_map_records)
    unique_parents = int(era5_map_df["era5_parent_cell_id"].nunique())

    grid_area_coverage = float(
        (
            grid_gdf["uttarakhand_area_fraction"] * grid_gdf["cell_area_km2"]
        ).sum()
    )

    summary = MasterGridSummary(
        step_deg=step,
        total_bounding_box_cells=total_bbox_cells,
        intersecting_cells=len(grid_gdf),
        centroid_inside_cells=int(grid_gdf["centroid_inside"].sum()),
        total_state_area_km2=state_area_km2,
        grid_area_coverage_km2=grid_area_coverage,
        area_fraction_mean=float(grid_gdf["uttarakhand_area_fraction"].mean()),
        unique_era5_parent_cells=unique_parents,
        boundary_file=str(boundary_path),
        geographic_crs=grid_config.geographic_crs,
        metric_crs=grid_config.metric_crs,
        generated_at_utc=pd.Timestamp.now(tz="UTC").isoformat(),
    )

    return grid_gdf, era5_map_df, summary


def save_master_grid(
    grid_gdf: gpd.GeoDataFrame,
    era5_map_df: pd.DataFrame,
    summary: MasterGridSummary,
    output_dir: Path,
    logger: logging.Logger | None = None,
) -> dict[str, Path]:
    """Save master grid spatial datasets and metadata."""
    log = logger or logging.getLogger(__name__)
    output_dir.mkdir(parents=True, exist_ok=True)

    parquet_path = output_dir / "master_grid_005deg.parquet"
    geojson_path = output_dir / "master_grid_005deg.geojson"
    map_csv_path = output_dir / "era5_to_master_grid_map.csv"
    meta_json_path = output_dir / "master_grid_metadata.json"

    log.info("Saving master grid parquet to %s", parquet_path)
    grid_gdf.to_parquet(parquet_path, index=False)

    log.info("Saving master grid geojson to %s", geojson_path)
    grid_gdf.to_file(geojson_path, driver="GeoJSON")

    log.info("Saving ERA5 parent mapping CSV to %s", map_csv_path)
    era5_map_df.to_csv(map_csv_path, index=False)

    log.info("Saving metadata JSON to %s", meta_json_path)
    with open(meta_json_path, "w", encoding="utf-8") as f:
        json.dump(asdict(summary), f, indent=2)

    return {
        "parquet": parquet_path,
        "geojson": geojson_path,
        "map_csv": map_csv_path,
        "metadata_json": meta_json_path,
    }


def main() -> None:
    """CLI entrypoint for master grid generation."""
    parser = argparse.ArgumentParser(
        description="Generate FIREINTEL Master 0.05-Degree Analysis Grid."
    )
    parser.add_argument(
        "--boundary",
        type=Path,
        default=Path("fireIntel/data/boundaries/uttarakhand_boundary.geojson"),
        help="Path to Uttarakhand administrative boundary GeoJSON.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("fireIntel/data/environmental/metadata"),
        help="Output directory for grid catalogs and metadata.",
    )
    parser.add_argument(
        "--step-deg",
        type=float,
        default=0.05,
        help="Grid resolution in degrees (default 0.05).",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Enable verbose debug logging."
    )
    args = parser.parse_args()

    logger = configure_logging(verbose=args.verbose)
    logger.info("=== Starting Master Grid Generation ===")

    grid_cfg = GridConfig(step_deg=args.step_deg)
    grid_gdf, era5_map_df, summary = build_master_grid(
        args.boundary, grid_config=grid_cfg, logger=logger
    )
    saved = save_master_grid(
        grid_gdf, era5_map_df, summary, args.output_dir, logger=logger
    )

    logger.info("=== Master Grid Generation Complete ===")
    logger.info(
        "Intersecting cells: %d, Centroids inside: %d, ERA5 parents: %d",
        summary.intersecting_cells,
        summary.centroid_inside_cells,
        summary.unique_era5_parent_cells,
    )
    for k, p in saved.items():
        logger.info("  %s: %s", k, p)


if __name__ == "__main__":
    main()

