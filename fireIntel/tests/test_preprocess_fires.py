"""Unit and integration tests for fireIntel.scripts.preprocess_fires."""

from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import preprocess_fires as pf  # noqa: E402


def _make_sample_row(**overrides: object) -> dict[str, object]:
    """Build a valid FIRMS row dictionary with sensible Uttarakhand defaults."""
    row: dict[str, object] = {
        "latitude": 30.0,
        "longitude": 79.5,
        "brightness": 320.5,
        "scan": 0.4,
        "track": 0.4,
        "acq_date": "2025-04-15",
        "acq_time": "0743",
        "satellite": "SNPP",
        "instrument": "SNPP",
        "confidence": "n",
        "version": "2",
        "bright_t31": 295.0,
        "frp": 5.5,
        "daynight": "D",
        "type": 0,
    }
    row.update(overrides)
    return row


def _write_csv(path: Path, rows: list[dict[str, object]]) -> Path:
    """Write row dicts directly to CSV."""
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def test_bounding_box_validate_rejects_invalid_bounds() -> None:
    pf.BoundingBox(28.72, 31.46, 77.57, 81.03).validate()

    with pytest.raises(ValueError, match="latitude"):
        pf.BoundingBox(32.0, 31.0, 77.57, 81.03).validate()

    with pytest.raises(ValueError, match="longitude"):
        pf.BoundingBox(28.72, 31.46, 82.0, 81.03).validate()

    with pytest.raises(ValueError, match="latitude"):
        pf.BoundingBox(-95.0, 31.46, 77.57, 81.03).validate()


def test_load_raw_firms_csv_preserves_acq_time_confidence_and_version(
    tmp_path: Path,
) -> None:
    csv_path = _write_csv(
        tmp_path / "sample.csv",
        [
            _make_sample_row(acq_time="0045", confidence="28", version="61.03"),
            _make_sample_row(acq_time="743", confidence="n", version="2"),
        ],
    )

    df = pf.load_raw_firms_csv(csv_path)
    assert df["acq_time"].tolist() == ["0045", "0743"]
    assert df["confidence"].tolist() == ["28", "n"]
    assert df["version"].tolist() == ["61.03", "2"]


def test_load_raw_firms_csv_error_cases(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        pf.load_raw_firms_csv(tmp_path / "missing.csv")

    empty_path = tmp_path / "empty.csv"
    pd.DataFrame(columns=pf.REQUIRED_COLUMNS).to_csv(empty_path, index=False)
    with pytest.raises(ValueError, match="no rows"):
        pf.load_raw_firms_csv(empty_path)

    missing_col_row = _make_sample_row()
    del missing_col_row["frp"]
    missing_col_path = _write_csv(tmp_path / "missing_col.csv", [missing_col_row])
    with pytest.raises(ValueError, match="missing required columns"):
        pf.load_raw_firms_csv(missing_col_path)

    bad_time_path = _write_csv(
        tmp_path / "bad_time.csv",
        [_make_sample_row(acq_time="abcd")],
    )
    with pytest.raises(ValueError, match="invalid HHMM"):
        pf.load_raw_firms_csv(bad_time_path)


def test_add_sensor_column_and_acq_datetime_are_non_mutating_and_utc() -> None:
    raw_df = pd.DataFrame([_make_sample_row(acq_date="2025-01-05", acq_time="0035")])
    tagged = pf.add_sensor_column(raw_df, "MODIS")
    with_dt = pf.add_acq_datetime(tagged)

    assert "sensor" not in raw_df.columns
    assert "acq_datetime" not in tagged.columns
    assert with_dt["sensor"].iloc[0] == "MODIS"
    assert str(with_dt["acq_datetime"].dtype) == "datetime64[us, UTC]" or (
        getattr(with_dt["acq_datetime"].dt.tz, "zone", None) == "UTC"
        or str(with_dt["acq_datetime"].dt.tz) == "UTC"
    )
    assert with_dt["acq_datetime"].iloc[0] == pd.Timestamp("2025-01-05 00:35:00+00:00")


def test_filter_by_bbox_is_inclusive_and_keeps_nearby_points() -> None:
    bbox = pf.BoundingBox(min_lat=28.72, max_lat=31.46, min_lon=77.57, max_lon=81.03)
    df = pd.DataFrame(
        [
            _make_sample_row(latitude=28.72, longitude=77.57),  # exact min boundary
            _make_sample_row(latitude=31.46, longitude=81.03),  # exact max boundary
            _make_sample_row(latitude=30.00001, longitude=79.50001),  # close pair 1
            _make_sample_row(latitude=30.00001, longitude=79.50001),  # close pair 2 (exact dup)
            _make_sample_row(latitude=30.0, longitude=81.03001),  # outside east
            _make_sample_row(latitude=28.71999, longitude=79.5),  # outside south
        ]
    )

    filtered = pf.filter_by_bbox(df, bbox)
    assert len(filtered) == 4


def test_run_pipeline_end_to_end_preserves_raw_and_schemas(tmp_path: Path) -> None:
    raw_dir = tmp_path / "raw"
    processed_dir = tmp_path / "processed"
    raw_dir.mkdir()

    modis_path = _write_csv(
        raw_dir / "modis.csv",
        [
            _make_sample_row(
                latitude=29.5,
                longitude=79.0,
                acq_date="2025-03-10",
                acq_time="0849",
                satellite="Aqua",
                instrument="MODIS",
                confidence="83",
                version="61.03",
            ),
            _make_sample_row(
                latitude=28.5,  # outside bbox
                longitude=79.0,
                acq_date="2025-03-11",
                acq_time="0900",
                satellite="Terra",
                instrument="MODIS",
                confidence="40",
                version="61.03",
            ),
        ],
    )
    viirs_path = _write_csv(
        raw_dir / "viirs.csv",
        [
            _make_sample_row(
                latitude=30.1,
                longitude=80.2,
                acq_date="2025-03-10",
                acq_time="0743",
                satellite="SNPP",
                instrument="SNPP",
                confidence="h",
                version="2",
            ),
            _make_sample_row(
                latitude=30.1,
                longitude=81.03001,  # outside bbox
                acq_date="2025-03-10",
                acq_time="0743",
                satellite="SNPP",
                instrument="SNPP",
                confidence="l",
                version="2",
            ),
        ],
    )

    modis_bytes_before = modis_path.read_bytes()
    viirs_bytes_before = viirs_path.read_bytes()

    sources = (
        pf.SensorSource("MODIS", modis_path, "uttarakhand_modis.csv"),
        pf.SensorSource("VIIRS", viirs_path, "uttarakhand_viirs.csv"),
    )
    results = pf.run_pipeline(sources=sources, processed_dir=processed_dir)

    assert modis_path.read_bytes() == modis_bytes_before
    assert viirs_path.read_bytes() == viirs_bytes_before

    assert len(results["MODIS"]) == 1
    assert len(results["VIIRS"]) == 1
    assert len(results["COMBINED"]) == 2

    combined_csv = pd.read_csv(
        processed_dir / "uttarakhand_fires.csv",
        dtype={"acq_time": str, "confidence": str, "version": str},
    )
    assert list(combined_csv.columns) == [*pf.REQUIRED_COLUMNS, "sensor", "acq_datetime"]
    assert combined_csv["sensor"].tolist() == ["VIIRS", "MODIS"]
    assert combined_csv["acq_time"].tolist() == ["0743", "0849"]
    assert combined_csv["confidence"].tolist() == ["h", "83"]
    assert combined_csv["version"].tolist() == ["2", "61.03"]
    assert (processed_dir / "uttarakhand_modis.csv").is_file()
    assert (processed_dir / "uttarakhand_viirs.csv").is_file()

