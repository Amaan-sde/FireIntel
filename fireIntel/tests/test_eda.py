"""Unit and integration tests for fireIntel.scripts.eda."""

from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd
import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import eda  # noqa: E402


def _make_processed_row(
    *,
    sensor: str,
    acq_date: str,
    acq_time: str,
    latitude: float,
    longitude: float,
    confidence: str,
    frp: float,
    brightness: float,
    daynight: str = "D",
    satellite: str | None = None,
) -> dict[str, object]:
    """Create a valid processed FIRMS observation row."""
    return {
        "latitude": latitude,
        "longitude": longitude,
        "brightness": brightness,
        "scan": 0.4 if sensor == "VIIRS" else 1.0,
        "track": 0.4 if sensor == "VIIRS" else 1.0,
        "acq_date": acq_date,
        "acq_time": acq_time,
        "satellite": satellite or ("SNPP" if sensor == "VIIRS" else "Aqua"),
        "instrument": "SNPP" if sensor == "VIIRS" else "MODIS",
        "confidence": confidence,
        "version": "2" if sensor == "VIIRS" else "61.03",
        "bright_t31": 295.0,
        "frp": frp,
        "daynight": daynight,
        "type": 0,
        "sensor": sensor,
        "acq_datetime": f"{acq_date} {acq_time[:2]}:{acq_time[2:]}:00+00:00",
    }


def _write_processed_fixture(processed_dir: Path) -> None:
    """Create minimal MODIS, VIIRS, and combined CSV fixtures including an overlap pair."""
    modis_rows = [
        _make_processed_row(
            sensor="MODIS",
            acq_date="2025-04-10",
            acq_time="0800",
            latitude=29.800,
            longitude=79.100,
            confidence="75",
            frp=18.5,
            brightness=325.0,
            daynight="D",
            satellite="Aqua",
        ),
        _make_processed_row(
            sensor="MODIS",
            acq_date="2025-05-12",
            acq_time="1945",
            latitude=30.500,
            longitude=78.600,
            confidence="25",
            frp=9.2,
            brightness=312.0,
            daynight="N",
            satellite="Terra",
        ),
    ]
    viirs_rows = [
        _make_processed_row(
            sensor="VIIRS",
            acq_date="2025-04-10",
            acq_time="0745",
            latitude=29.802,  # ~0.3 km from MODIS Aqua row, 15 min delta -> matches
            longitude=79.102,
            confidence="n",
            frp=4.2,
            brightness=332.0,
            daynight="D",
        ),
        _make_processed_row(
            sensor="VIIRS",
            acq_date="2025-04-11",
            acq_time="2015",
            latitude=29.820,
            longitude=79.120,
            confidence="h",
            frp=12.0,
            brightness=350.0,
            daynight="N",
        ),
        _make_processed_row(
            sensor="VIIRS",
            acq_date="2025-05-12",
            acq_time="0800",
            latitude=30.900,
            longitude=79.800,
            confidence="l",
            frp=2.1,
            brightness=318.0,
            daynight="D",
        ),
    ]
    combined_rows = sorted(
        [*modis_rows, *viirs_rows],
        key=lambda r: str(r["acq_datetime"]),
    )

    processed_dir.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(modis_rows).to_csv(processed_dir / "uttarakhand_modis.csv", index=False)
    pd.DataFrame(viirs_rows).to_csv(processed_dir / "uttarakhand_viirs.csv", index=False)
    pd.DataFrame(combined_rows).to_csv(processed_dir / "uttarakhand_fires.csv", index=False)


def test_load_all_datasets_detects_mismatched_counts(tmp_path: Path) -> None:
    _write_processed_fixture(tmp_path)
    combined_path = tmp_path / "uttarakhand_fires.csv"
    df = pd.read_csv(
        combined_path, dtype={"acq_time": str, "confidence": str, "version": str}
    )
    df.iloc[:-1].to_csv(combined_path, index=False)

    with pytest.raises(ValueError, match="!= MODIS"):
        eda.load_all_datasets(tmp_path)


def test_overlap_analysis_matches_exact_spatiotemporal_pair(tmp_path: Path) -> None:
    _write_processed_fixture(tmp_path)
    datasets = eda.load_all_datasets(tmp_path)
    config = eda.EDAConfig(
        processed_dir=tmp_path,
        reports_dir=tmp_path / "reports",
        overlap_distance_km=1.0,
        overlap_time_minutes=60,
    )
    overlap, overlap_df = eda.analyze_spatiotemporal_overlap(
        datasets["MODIS"], datasets["VIIRS"], config
    )
    prim = overlap["primary_threshold"]
    assert prim["candidate_cross_sensor_pairs"] == 1
    assert prim["modis_matched"] == 1
    assert prim["modis_only"] == 1
    assert prim["viirs_matched"] == 1
    assert prim["viirs_only"] == 2
    assert prim["aqua_matched"] == 1
    assert prim["terra_matched"] == 0
    assert (overlap_df["is_primary_threshold"]).sum() == 1


def test_run_eda_generates_all_required_files_and_plots(tmp_path: Path) -> None:
    processed_dir = tmp_path / "processed"
    reports_dir = tmp_path / "reports" / "eda"
    _write_processed_fixture(processed_dir)

    config = eda.EDAConfig(
        processed_dir=processed_dir,
        reports_dir=reports_dir,
        grid_step_deg=0.05,
        top_n_hotspots=10,
        overlap_distance_km=1.0,
        overlap_time_minutes=60,
    )
    logger = eda.configure_logging()
    outputs = eda.run_eda(config=config, logger=logger)

    assert outputs["overview"]["total_observations"] == 5
    assert outputs["overview"]["sensor_counts"] == {"MODIS": 2, "VIIRS": 3}

    # Confidence scales stay strictly separated.
    conf = outputs["sensor_comparison"]["confidence_separate_scales"]
    assert conf["MODIS"]["stats"]["median"] == 50.0
    assert conf["VIIRS"]["counts"] == {"l": 1, "n": 1, "h": 1}

    expected_files = [
        "EDA_REPORT.md",
        "dataset_summary.csv",
        "monthly_analysis.csv",
        "sensor_comparison.csv",
        "spatial_hotspots.csv",
        "overlap_analysis.csv",
        "eda_summary.json",
    ]
    for filename in expected_files:
        assert (reports_dir / filename).is_file(), f"Missing {filename}"

    assert len(outputs["plot_paths"]) == 8
    for plot_path in outputs["plot_paths"].values():
        assert plot_path.is_file()
        assert plot_path.stat().st_size > 0

    payload = json.loads((reports_dir / "eda_summary.json").read_text(encoding="utf-8"))
    assert payload["data_quality"]["missing_values_total"] == 0
    assert payload["overlap_analysis"]["primary_threshold"]["modis_matched"] == 1
