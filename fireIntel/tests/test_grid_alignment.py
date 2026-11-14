"""Unit tests for spatial grid alignment between Master 0.05° Grid and ERA5-Land 0.1° Nodes."""

from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
import pytest

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "environmental"
MASTER_GRID_PARQUET = DATA_DIR / "metadata" / "master_grid_005deg.parquet"
ERA5_MAP_CSV = DATA_DIR / "metadata" / "era5_to_master_grid_map.csv"
DEM_TERRAIN_PARQUET = DATA_DIR / "processed" / "dem_terrain_features_005deg.parquet"


def test_master_grid_era5_alignment():
    """Verify that every 0.05° master grid cell maps to a valid parent 0.1° ERA5 node."""
    assert MASTER_GRID_PARQUET.is_file()
    assert ERA5_MAP_CSV.is_file()

    grid = pd.read_parquet(MASTER_GRID_PARQUET)
    era5_map = pd.read_csv(ERA5_MAP_CSV)

    assert len(grid) == 2174
    assert len(era5_map) == 2174

    # Check cell ID match
    assert (grid["grid_cell_id"] == era5_map["grid_cell_id"]).all()

    # Check parent ERA5 cell format: ERA5L_{LAT}_{LON}
    for cell_id in grid["era5_parent_cell_id"]:
        assert cell_id.startswith("ERA5L_"), f"Invalid parent ERA5 cell ID format: {cell_id}"

    # Verify parent latitude and longitude are multiples of 0.1 deg
    for lat in grid["era5_parent_lat"]:
        assert round(lat * 10) == pytest.approx(lat * 10, abs=1e-5), f"ERA5 parent lat not on 0.1 grid: {lat}"
    for lon in grid["era5_parent_lon"]:
        assert round(lon * 10) == pytest.approx(lon * 10, abs=1e-5), f"ERA5 parent lon not on 0.1 grid: {lon}"

    # Verify unique parent count (581 parent cells for Uttarakhand)
    unique_parents = grid["era5_parent_cell_id"].nunique()
    assert unique_parents == 581, f"Expected 581 unique parent nodes, got {unique_parents}"


def test_terrain_features_grid_alignment():
    """Verify that DEM terrain features table aligns 1:1 with Master Grid and preserves parent IDs."""
    assert DEM_TERRAIN_PARQUET.is_file()

    grid = pd.read_parquet(MASTER_GRID_PARQUET)
    dem = pd.read_parquet(DEM_TERRAIN_PARQUET)

    assert len(dem) == len(grid) == 2174

    # 1:1 matching of cell IDs
    assert (dem["grid_cell_id"] == grid["grid_cell_id"]).all()
    assert (dem["centroid_lat"] == grid["centroid_lat"]).all()
    assert (dem["centroid_lon"] == grid["centroid_lon"]).all()
    assert (dem["era5_parent_cell_id"] == grid["era5_parent_cell_id"]).all()

    # Check spatial provenance tags
    assert (dem["spatial_resolution_prov"] == "copernicus_dem_glo30_zonal_005").all()
    assert (dem["met_spatial_resolution_prov"] == "era5_land_parent_010").all()

