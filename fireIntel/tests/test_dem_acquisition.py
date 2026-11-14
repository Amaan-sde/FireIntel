"""Unit and integration tests for Copernicus DEM GLO-30 pilot acquisition.

Verifies raster headers, VRT mosaic validity, and manifest records.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest
import rasterio

ENV_DIR = Path(__file__).resolve().parents[1] / "data" / "environmental"
RAW_DEM_DIR = ENV_DIR / "raw" / "copernicus_dem"
PROCESSED_DIR = ENV_DIR / "processed"
MANIFESTS_DIR = ENV_DIR / "manifests"


def test_copernicus_dem_manifest_structure():
    """Verify manifest file structure if DEM acquisition has completed."""
    manifest_path = MANIFESTS_DIR / "copernicus_dem_manifest.json"
    if not manifest_path.is_file():
        pytest.skip("DEM manifest not yet generated (download still in progress).")

    with open(manifest_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["dataset_id"] == "COP30"
    assert meta["total_tiles"] == 14
    assert meta["total_bytes"] > 500_000_000
    assert len(meta["tiles"]) == 14

    for tile in meta["tiles"]:
        assert tile["crs"] == "EPSG:4326"
        assert tile["width"] == 3600
        assert tile["height"] == 3600
        assert tile["status"] == "VERIFIED_OK"
        assert tile["min_elevation_m"] < tile["max_elevation_m"]


def test_copernicus_dem_vrt_mosaic():
    """Verify that the generated VRT mosaic opens cleanly with rasterio."""
    vrt_path = PROCESSED_DIR / "copernicus_dem_uttarakhand.vrt"
    if not vrt_path.is_file():
        pytest.skip("DEM VRT not yet generated (download still in progress).")

    with rasterio.open(vrt_path) as src:
        assert src.crs.to_string() == "EPSG:4326"
        # Total extent covers 77E to 82E and 28N to 32N
        assert src.bounds.left == pytest.approx(77.0, abs=1e-2)
        assert src.bounds.right == pytest.approx(82.0, abs=1e-2)
        assert src.bounds.bottom == pytest.approx(28.0, abs=1e-2)
        assert src.bounds.top == pytest.approx(32.0, abs=1e-2)

