"""Unit and integration tests for FIREINTEL Master 0.05-Degree Analysis Grid.

Verifies grid dimension, schema, unique identifiers, boundary intersection fractions,
and ERA5-Land parent cell mapping.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

import geopandas as gpd
import pandas as pd
import pytest

METADATA_DIR = Path(__file__).resolve().parents[1] / "data" / "environmental" / "metadata"


def test_master_grid_parquet_schema_and_counts():
    """Verify master grid parquet file schema, cell counts, and value bounds."""
    parquet_path = METADATA_DIR / "master_grid_005deg.parquet"
    assert parquet_path.is_file(), f"Missing file: {parquet_path}"

    df = pd.read_parquet(parquet_path)
    # Exactly 2,174 intersecting cells
    assert len(df) == 2174

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
        "uttarakhand_area_fraction",
        "cell_area_km2",
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing required column: {col}"

    # Unique identifiers
    assert df["grid_cell_id"].nunique() == 2174

    # Centroid inside count must be exactly 2,000
    assert int(df["centroid_inside"].sum()) == 2000

    # Overlap fraction bounds
    assert float(df["uttarakhand_area_fraction"].min()) >= 0.0
    assert float(df["uttarakhand_area_fraction"].max()) <= 1.0

    # Interior cells with fraction == 1.0
    interior_cells = df[df["uttarakhand_area_fraction"] == 1.0]
    assert len(interior_cells) >= 1700


def test_era5_to_master_grid_mapping_consistency():
    """Verify that every 0.05 deg cell maps to its mathematical parent 0.1 deg ERA5 node."""
    csv_path = METADATA_DIR / "era5_to_master_grid_map.csv"
    assert csv_path.is_file(), f"Missing file: {csv_path}"

    df = pd.read_csv(csv_path)
    assert len(df) == 2174

    # Number of unique parent nodes should be 581
    assert df["era5_parent_cell_id"].nunique() == 581

    # Verify mathematical nearest-centroid rule for every single row
    for _, row in df.iterrows():
        c_lat = row["grid_lat_sw"] + 0.025
        c_lon = row["grid_lon_sw"] + 0.025
        expected_parent_lat = round(c_lat, 1)
        expected_parent_lon = round(c_lon, 1)

        assert pytest.approx(row["era5_parent_lat"], abs=1e-4) == expected_parent_lat
        assert pytest.approx(row["era5_parent_lon"], abs=1e-4) == expected_parent_lon


def test_master_grid_metadata_json_consistency():
    """Verify master grid metadata JSON against official boundary area."""
    json_path = METADATA_DIR / "master_grid_metadata.json"
    assert json_path.is_file(), f"Missing file: {json_path}"

    with open(json_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["intersecting_cells"] == 2174
    assert meta["centroid_inside_cells"] == 2000
    assert meta["unique_era5_parent_cells"] == 581
    assert meta["step_deg"] == 0.05
    assert meta["geographic_crs"] == "EPSG:4326"
    assert meta["metric_crs"] == "EPSG:32644"

    # Effective grid area coverage must match state area within 0.1 km2
    diff_area = abs(meta["grid_area_coverage_km2"] - meta["total_state_area_km2"])
    assert diff_area < 0.1

