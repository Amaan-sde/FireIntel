"""Unit tests for DEM terrain feature processing and spatial consistency."""

from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from environmental.process_dem_terrain import compute_cell_terrain_features


DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "environmental"
PROCESSED_PARQUET = DATA_DIR / "processed" / "dem_terrain_features_005deg.parquet"
PROCESSED_CSV = DATA_DIR / "processed" / "dem_terrain_features_005deg.csv"
MANIFEST_FILE = DATA_DIR / "manifests" / "dem_terrain_manifest.json"


def test_compute_cell_terrain_features_flat():
    """Verify that a completely flat surface produces zero slope, zero TRI, and valid elevation stats."""
    # 5x5 window (3x3 interior + 1-pixel buffer) with constant elevation 500m
    z = np.full((5, 5), 500.0, dtype=np.float64)
    valid_mask = np.ones((5, 5), dtype=bool)
    dx = 30.0
    dy = 30.0

    stats = compute_cell_terrain_features(z, valid_mask, dx, dy)

    assert stats["elevation_mean_m"] == 500.0
    assert stats["elevation_min_m"] == 500.0
    assert stats["elevation_max_m"] == 500.0
    assert stats["elevation_std_m"] == 0.0
    assert stats["slope_mean_deg"] == 0.0
    assert stats["slope_max_deg"] == 0.0
    assert stats["terrain_roughness_tri_mean"] == 0.0
    assert stats["dem_valid_pixel_count"] == 9
    assert stats["dem_nodata_count"] == 0


def test_compute_cell_terrain_features_sloping_north():
    """Verify that a surface sloping down to the North produces aspect = 0° and expected slope."""
    # Row 0 is North (higher lat), Row 2 is South (lower lat)
    # Elevation decreases going North (sloping down to North)
    # z values: Row 0 = 100, Row 1 = 110, Row 2 = 120, Row 3 = 130, Row 4 = 140
    rows = np.array([100.0, 110.0, 120.0, 130.0, 140.0])
    z = np.tile(rows[:, None], (1, 5))
    valid_mask = np.ones((5, 5), dtype=bool)
    dx = 30.0
    dy = 30.0

    stats = compute_cell_terrain_features(z, valid_mask, dx, dy)

    # dz/dy = -0.3333, dz/dx = 0 -> slope = arctan(0.3333) = 18.43 deg
    assert pytest.approx(stats["slope_mean_deg"], abs=0.1) == 18.43
    # Downslope aspect = 0 deg (North)
    assert pytest.approx(stats["aspect_mean_deg"], abs=0.5) == 0.0 or pytest.approx(stats["aspect_mean_deg"], abs=0.5) == 360.0
    assert stats["terrain_roughness_tri_mean"] > 0.0


def test_compute_cell_terrain_features_nodata_handling():
    """Verify that cells with all nodata pixels return NaNs and do NOT replace with zero."""
    z = np.full((5, 5), -99999.0, dtype=np.float64)
    valid_mask = np.zeros((5, 5), dtype=bool)
    dx = 30.0
    dy = 30.0

    stats = compute_cell_terrain_features(z, valid_mask, dx, dy)

    assert np.isnan(stats["elevation_mean_m"])
    assert np.isnan(stats["slope_mean_deg"])
    assert np.isnan(stats["aspect_mean_deg"])
    assert np.isnan(stats["terrain_roughness_tri_mean"])
    assert stats["dem_valid_pixel_count"] == 0
    assert stats["dem_nodata_count"] == 9


def test_dem_terrain_output_integrity():
    """Verify that the generated terrain features Parquet file is complete, valid, and uncorrupted."""
    assert PROCESSED_PARQUET.is_file(), f"Missing terrain parquet: {PROCESSED_PARQUET}"
    assert PROCESSED_CSV.is_file(), f"Missing terrain CSV: {PROCESSED_CSV}"
    assert MANIFEST_FILE.is_file(), f"Missing terrain manifest: {MANIFEST_FILE}"

    df = pd.read_parquet(PROCESSED_PARQUET)
    assert len(df) == 2174, f"Expected 2174 grid cells, got {len(df)}"

    required_cols = [
        "grid_cell_id",
        "grid_lat_sw",
        "grid_lon_sw",
        "centroid_lat",
        "centroid_lon",
        "centroid_inside",
        "era5_parent_cell_id",
        "era5_parent_lat",
        "era5_parent_lon",
        "elevation_mean_m",
        "elevation_min_m",
        "elevation_max_m",
        "elevation_std_m",
        "slope_mean_deg",
        "slope_max_deg",
        "aspect_mean_deg",
        "aspect_sin_mean",
        "aspect_cos_mean",
        "terrain_roughness_tri_mean",
        "terrain_roughness_tri_max",
        "dem_pixel_count",
        "dem_valid_pixel_count",
        "dem_nodata_count",
        "spatial_resolution_prov",
        "met_spatial_resolution_prov",
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing required column: {col}"

    # Verify zero missing values in terrain stats
    assert df["elevation_mean_m"].isna().sum() == 0
    assert df["slope_mean_deg"].isna().sum() == 0
    assert df["aspect_mean_deg"].isna().sum() == 0
    assert df["terrain_roughness_tri_mean"].isna().sum() == 0

    # Physical range checks
    assert df["elevation_min_m"].min() >= 120.0, "Elevation min below Uttarakhand minimum"
    assert df["elevation_max_m"].max() <= 7850.0, "Elevation max above Nanda Devi range"
    assert (df["elevation_min_m"] <= df["elevation_mean_m"]).all(), "Min elevation exceeds mean"
    assert (df["elevation_mean_m"] <= df["elevation_max_m"]).all(), "Mean elevation exceeds max"

    assert (df["slope_mean_deg"] >= 0.0).all()
    assert (df["slope_mean_deg"] <= 90.0).all()
    assert (df["slope_max_deg"] >= df["slope_mean_deg"]).all()

    assert (df["aspect_mean_deg"] >= 0.0).all()
    assert (df["aspect_mean_deg"] <= 360.0).all()

    assert (df["terrain_roughness_tri_mean"] >= 0.0).all()

