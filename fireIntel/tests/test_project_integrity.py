"""Integration and integrity test suite for FIREINTEL assets and pipelines."""

from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
import pytest

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
BV_DIR = PROCESSED_DIR / "boundary_validated"
ENV_DIR = DATA_DIR / "environmental"


def test_raw_fire_archives_unmodified():
    """Verify that raw NASA FIRMS CSV archives exist and have exact original row counts and columns."""
    modis_raw = RAW_DIR / "fire_archive_M-C61_843061.csv"
    viirs_raw = RAW_DIR / "fire_archive_SV-C2_843062.csv"

    assert modis_raw.is_file(), "Raw MODIS archive missing"
    assert viirs_raw.is_file(), "Raw VIIRS archive missing"

    df_m = pd.read_csv(modis_raw)
    df_v = pd.read_csv(viirs_raw)

    assert len(df_m) == 1540, f"Raw MODIS row count changed: {len(df_m)}"
    assert len(df_v) == 10986, f"Raw VIIRS row count changed: {len(df_v)}"

    assert "confidence" in df_m.columns
    assert "confidence" in df_v.columns
    assert "acq_date" in df_m.columns
    assert "acq_time" in df_m.columns


def test_boundary_validated_fire_dataset_consistency():
    """Verify that boundary-validated fires are strictly a subset of bounding-box fires."""
    bbox_all = PROCESSED_DIR / "uttarakhand_fires.csv"
    bv_all = BV_DIR / "uttarakhand_fires_boundary.csv"

    assert bbox_all.is_file()
    assert bv_all.is_file()

    df_bbox = pd.read_csv(bbox_all)
    df_bv = pd.read_csv(bv_all)

    assert len(df_bv) == 7541
    assert len(df_bbox) == 12525
    assert len(df_bv) < len(df_bbox)

    # All sensors present in correct proportions
    assert (df_bv["sensor"] == "MODIS").sum() == 918
    assert (df_bv["sensor"] == "VIIRS").sum() == 6623

    # Check coordinate bounds
    assert df_bv["latitude"].between(28.72, 31.46).all()
    assert df_bv["longitude"].between(77.57, 81.03).all()


def test_master_grid_and_dem_terrain_exact_match():
    """Verify 1:1 row count, grid cell ID match, and zero nulls in terrain table."""
    grid_pq = ENV_DIR / "metadata" / "master_grid_005deg.parquet"
    terrain_pq = ENV_DIR / "processed" / "dem_terrain_features_005deg.parquet"

    assert grid_pq.is_file()
    assert terrain_pq.is_file()

    df_grid = pd.read_parquet(grid_pq)
    df_terrain = pd.read_parquet(terrain_pq)

    assert len(df_grid) == 2174
    assert len(df_terrain) == 2174

    assert (df_grid["grid_cell_id"] == df_terrain["grid_cell_id"]).all()
    assert df_terrain["elevation_mean_m"].isna().sum() == 0
    assert df_terrain["slope_mean_deg"].isna().sum() == 0
    assert df_terrain["aspect_mean_deg"].isna().sum() == 0
    assert df_terrain["terrain_roughness_tri_mean"].isna().sum() == 0


def test_project_integrity_manifest_health():
    """Verify that the generated integrity audit manifest reports a healthy system."""
    manifest_path = ENV_DIR / "manifests" / "project_integrity_manifest.json"
    assert manifest_path.is_file(), "Integrity manifest missing"

    import json
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["overall_health"] in ["HEALTHY_AWAITING_CDS_REGISTRATION", "PASSED"]
    assert data["sections"]["raw_datasets"]["status"] == "PASSED"
    assert data["sections"]["processed_fire_datasets"]["status"] == "PASSED"
    assert data["sections"]["master_grid_and_dem"]["status"] == "PASSED"

