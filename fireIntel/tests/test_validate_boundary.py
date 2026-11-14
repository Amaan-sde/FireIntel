"""Unit and integration tests for fireIntel.scripts.validate_boundary."""

from __future__ import annotations

import json
from pathlib import Path
import sys

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Polygon

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import validate_boundary as vb  # noqa: E402


def _make_row(
    *,
    sensor: str,
    latitude: float,
    longitude: float,
    acq_date: str = "2025-04-15",
    acq_time: str = "0743",
    confidence: str = "n",
) -> dict[str, object]:
    """Create a valid processed FIRMS row."""
    return {
        "latitude": latitude,
        "longitude": longitude,
        "brightness": 330.0,
        "scan": 0.4,
        "track": 0.4,
        "acq_date": acq_date,
        "acq_time": acq_time,
        "satellite": "SNPP" if sensor == "VIIRS" else "Aqua",
        "instrument": "SNPP" if sensor == "VIIRS" else "MODIS",
        "confidence": confidence,
        "version": "2" if sensor == "VIIRS" else "61.03",
        "bright_t31": 295.0,
        "frp": 5.0,
        "daynight": "D",
        "type": 0,
        "sensor": sensor,
        "acq_datetime": f"{acq_date} {acq_time[:2]}:{acq_time[2:]}:00+00:00",
    }


def _write_boundary_geojson(path: Path, poly: Polygon, crs: str = "EPSG:4326") -> Path:
    """Write a single-feature GeoJSON boundary file."""
    gdf = gpd.GeoDataFrame(
        [
            {
                "shapeName": "Uttarakhand",
                "shapeISO": "IN-UT",
                "boundaryID": "TEST-UT",
                "source": "Test Source",
                "license": "CC-BY-4.0",
                "sourceURL": "https://example.org",
            }
        ],
        geometry=[poly],
        crs=crs,
    )
    gdf.to_file(path, driver="GeoJSON")
    return path


def test_load_and_validate_boundary_repairs_bowtie_polygon(tmp_path: Path) -> None:
    # Self-intersecting bowtie polygon is invalid in Shapely until repaired.
    bowtie = Polygon([(78.0, 29.0), (80.0, 31.0), (80.0, 29.0), (78.0, 31.0)])
    assert not bowtie.is_valid
    gj_path = _write_boundary_geojson(tmp_path / "bowtie.geojson", bowtie)

    gdf, union_geom, info = vb.load_and_validate_boundary(gj_path)
    assert len(gdf) == 1
    assert not info.originally_valid
    assert info.repair_applied
    assert info.valid_after_check
    assert union_geom.is_valid


def test_load_and_validate_boundary_reprojects_metric_crs(tmp_path: Path) -> None:
    box_4326 = Polygon([(78.0, 29.0), (80.0, 29.0), (80.0, 31.0), (78.0, 31.0)])
    gdf_utm = gpd.GeoDataFrame(
        [{"shapeName": "Uttarakhand", "shapeISO": "IN-UT"}],
        geometry=[box_4326],
        crs="EPSG:4326",
    ).to_crs("EPSG:32644")
    gj_path = tmp_path / "utm_boundary.geojson"
    gdf_utm.to_file(gj_path, driver="GeoJSON")

    reprojected_gdf, union_geom, info = vb.load_and_validate_boundary(gj_path)
    assert str(reprojected_gdf.crs) == "EPSG:4326"
    assert info.target_crs == "EPSG:4326"
    assert union_geom.is_valid
    min_lon, min_lat, max_lon, max_lat = info.bounds
    assert 77.99 < min_lon < 78.01
    assert 28.99 < min_lat < 29.01
    assert 79.99 < max_lon < 80.01
    assert 30.99 < max_lat < 31.01


def test_run_boundary_validation_end_to_end_preserves_inputs_and_columns(
    tmp_path: Path,
) -> None:
    processed_dir = tmp_path / "processed"
    validated_dir = processed_dir / "boundary_validated"
    reports_dir = tmp_path / "reports" / "boundary_validation"
    processed_dir.mkdir(parents=True)

    poly = Polygon([(78.0, 29.0), (80.0, 29.0), (80.0, 31.0), (78.0, 31.0)])
    gj_path = _write_boundary_geojson(tmp_path / "uk.geojson", poly)

    modis_rows = [
        _make_row(sensor="MODIS", latitude=30.0, longitude=79.0, acq_time="0849", confidence="78"),
        _make_row(sensor="MODIS", latitude=28.8, longitude=79.0, acq_time="0850", confidence="42"),
    ]
    viirs_rows = [
        _make_row(sensor="VIIRS", latitude=29.0, longitude=78.0, acq_time="0743", confidence="h"),  # exact corner
        _make_row(sensor="VIIRS", latitude=30.2, longitude=79.5, acq_time="0744", confidence="n"),
        _make_row(sensor="VIIRS", latitude=30.5, longitude=80.5, acq_time="0745", confidence="l"),  # outside
    ]
    combined_rows = sorted(
        [*modis_rows, *viirs_rows],
        key=lambda r: str(r["acq_datetime"]),
    )

    modis_in = processed_dir / "uttarakhand_modis.csv"
    viirs_in = processed_dir / "uttarakhand_viirs.csv"
    fires_in = processed_dir / "uttarakhand_fires.csv"
    pd.DataFrame(modis_rows).to_csv(modis_in, index=False)
    pd.DataFrame(viirs_rows).to_csv(viirs_in, index=False)
    pd.DataFrame(combined_rows).to_csv(fires_in, index=False)

    bytes_before = {p: p.read_bytes() for p in (modis_in, viirs_in, fires_in)}

    config = vb.BoundaryConfig(
        processed_dir=processed_dir,
        validated_dir=validated_dir,
        boundary_path=gj_path,
        metadata_path=tmp_path / "nonexistent_meta.json",
        reports_dir=reports_dir,
    )
    logger = vb.configure_logging()
    result = vb.run_boundary_validation(config=config, logger=logger)

    # Original processed files must remain unmodified.
    for path, raw_bytes in bytes_before.items():
        assert path.read_bytes() == raw_bytes

    assert result["stats"]["MODIS"]["inside_uttarakhand"] == 1
    assert result["stats"]["MODIS"]["outside_uttarakhand"] == 1
    assert result["stats"]["VIIRS"]["inside_uttarakhand"] == 2
    assert result["stats"]["VIIRS"]["outside_uttarakhand"] == 1
    assert result["stats"]["COMBINED"]["inside_uttarakhand"] == 3

    out_fires = pd.read_csv(
        validated_dir / "uttarakhand_fires_boundary.csv",
        dtype={"acq_time": str, "confidence": str, "version": str},
    )
    assert list(out_fires.columns) == list(vb.REQUIRED_COLUMNS)
    assert out_fires["acq_time"].tolist() == ["0743", "0744", "0849"]
    assert out_fires["confidence"].tolist() == ["h", "n", "78"]

    assert (reports_dir / "BOUNDARY_VALIDATION_REPORT.md").is_file()
    assert (reports_dir / "boundary_validation_stats.csv").is_file()
    assert (reports_dir / "boundary_validation_map.png").is_file()
    assert (reports_dir / "boundary_filtering_summary.png").is_file()
    summary = json.loads(
        (reports_dir / "boundary_validation_summary.json").read_text(encoding="utf-8")
    )
    assert summary["validation_stats"]["COMBINED"]["retained_pct"] == 60.0

