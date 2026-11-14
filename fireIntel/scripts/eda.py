#!/usr/bin/env python3
"""Comprehensive Exploratory Data Analysis (EDA) for preprocessed Uttarakhand FIRMS data."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import logging
import os
from pathlib import Path
import sys
import tempfile

# Ensure Matplotlib uses a writable config/cache directory in restricted environments.
if not os.environ.get("MPLCONFIGDIR"):
    os.environ["MPLCONFIGDIR"] = str(Path(tempfile.gettempdir()) / "fireintel_mplconfig")

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
import seaborn as sns

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"
REPORTS_DIR = PROJECT_ROOT / "reports" / "eda"

INPUT_FILES: dict[str, str] = {
    "COMBINED": "uttarakhand_fires.csv",
    "MODIS": "uttarakhand_modis.csv",
    "VIIRS": "uttarakhand_viirs.csv",
}

# Uttarakhand bounding box matching preprocessing configuration.
BBOX_MIN_LAT = 28.72
BBOX_MAX_LAT = 31.46
BBOX_MIN_LON = 77.57
BBOX_MAX_LON = 81.03

EARTH_RADIUS_KM = 6371.0

MONTH_NAMES: dict[int, str] = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}

SEASON_BY_MONTH: dict[int, str] = {
    12: "Winter (Dec-Feb)",
    1: "Winter (Dec-Feb)",
    2: "Winter (Dec-Feb)",
    3: "Pre-Monsoon (Mar-May)",
    4: "Pre-Monsoon (Mar-May)",
    5: "Pre-Monsoon (Mar-May)",
    6: "Monsoon (Jun-Sep)",
    7: "Monsoon (Jun-Sep)",
    8: "Monsoon (Jun-Sep)",
    9: "Monsoon (Jun-Sep)",
    10: "Post-Monsoon (Oct-Nov)",
    11: "Post-Monsoon (Oct-Nov)",
}

SEASON_ORDER: tuple[str, ...] = (
    "Winter (Dec-Feb)",
    "Pre-Monsoon (Mar-May)",
    "Monsoon (Jun-Sep)",
    "Post-Monsoon (Oct-Nov)",
)

LAT_BINS: tuple[float, ...] = (28.72, 29.50, 30.25, 31.46)
LAT_LABELS: tuple[str, ...] = (
    "South (28.72-29.50 N)",
    "Central (29.50-30.25 N)",
    "North (30.25-31.46 N)",
)
LON_BINS: tuple[float, ...] = (77.57, 78.75, 79.90, 81.03)
LON_LABELS: tuple[str, ...] = (
    "West (77.57-78.75 E)",
    "Central (78.75-79.90 E)",
    "East (79.90-81.03 E)",
)

SENSOR_PALETTE: dict[str, str] = {
    "MODIS": "#D95F02",
    "VIIRS": "#1B9E77",
}

REQUIRED_COLUMNS: tuple[str, ...] = (
    "latitude",
    "longitude",
    "brightness",
    "scan",
    "track",
    "acq_date",
    "acq_time",
    "satellite",
    "instrument",
    "confidence",
    "version",
    "bright_t31",
    "frp",
    "daynight",
    "type",
    "sensor",
    "acq_datetime",
)

OVERLAP_SENSITIVITY_GRID: tuple[tuple[float, int], ...] = (
    (0.5, 30),
    (1.0, 60),
    (1.0, 120),
    (1.5, 90),
    (2.0, 180),
    (2.0, 360),
)


@dataclass(frozen=True)
class EDAConfig:
    """Configurable parameters for reproducible EDA execution."""

    processed_dir: Path = PROCESSED_DATA_DIR
    reports_dir: Path = REPORTS_DIR
    combined_filename: str = INPUT_FILES["COMBINED"]
    modis_filename: str = INPUT_FILES["MODIS"]
    viirs_filename: str = INPUT_FILES["VIIRS"]
    grid_step_deg: float = 0.05
    fine_grid_step_deg: float = 0.01
    top_n_hotspots: int = 10
    overlap_distance_km: float = 1.0
    overlap_time_minutes: int = 60

    def validate(self) -> None:
        """Validate configurable numeric thresholds."""
        if self.grid_step_deg <= 0 or self.fine_grid_step_deg <= 0:
            raise ValueError("Grid step sizes must be positive.")
        if self.top_n_hotspots <= 0:
            raise ValueError("top_n_hotspots must be a positive integer.")
        if self.overlap_distance_km <= 0:
            raise ValueError("overlap_distance_km must be positive.")
        if self.overlap_time_minutes < 0:
            raise ValueError("overlap_time_minutes cannot be negative.")


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Configure structured console logging."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    return logging.getLogger("fireintel.eda")


def load_processed_csv(csv_path: Path) -> pd.DataFrame:
    """Load one processed FIRMS CSV read-only with preserved string fields."""
    if not csv_path.is_file():
        raise FileNotFoundError(f"Processed CSV not found: {csv_path}")

    df = pd.read_csv(
        csv_path,
        dtype={"acq_time": str, "confidence": str, "version": str, "sensor": str},
    )
    if df.empty:
        raise ValueError(f"Processed CSV is empty: {csv_path}")

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"{csv_path.name} missing required columns: {missing_cols}")

    df["acq_time"] = df["acq_time"].astype(str).str.strip().str.zfill(4)
    df["acq_datetime"] = pd.to_datetime(df["acq_datetime"], utc=True, errors="raise")
    df["acq_date_dt"] = pd.to_datetime(df["acq_date"], format="%Y-%m-%d", errors="raise")
    df["year"] = df["acq_datetime"].dt.year
    df["month"] = df["acq_datetime"].dt.month
    df["month_name"] = df["month"].map(MONTH_NAMES)
    df["season"] = df["month"].map(SEASON_BY_MONTH)
    df["lat_band"] = pd.cut(
        df["latitude"], bins=list(LAT_BINS), labels=list(LAT_LABELS), include_lowest=True
    )
    df["lon_band"] = pd.cut(
        df["longitude"], bins=list(LON_BINS), labels=list(LON_LABELS), include_lowest=True
    )
    return df


def load_all_datasets(
    processed_dir: Path,
    filenames: dict[str, str] | None = None,
) -> dict[str, pd.DataFrame]:
    """Load combined, MODIS, and VIIRS processed CSVs and verify count consistency."""
    file_map = filenames or INPUT_FILES
    datasets = {
        key: load_processed_csv(processed_dir / filename)
        for key, filename in file_map.items()
    }
    expected = len(datasets["MODIS"]) + len(datasets["VIIRS"])
    actual = len(datasets["COMBINED"])
    if actual != expected:
        raise ValueError(
            f"Combined row count ({actual}) != MODIS ({len(datasets['MODIS'])}) + "
            f"VIIRS ({len(datasets['VIIRS'])})"
        )
    return datasets


def _numeric_summary(series: pd.Series) -> dict[str, float]:
    """Compute descriptive summary statistics for a numeric series."""
    clean = pd.to_numeric(series, errors="coerce").dropna()
    return {
        "count": int(len(clean)),
        "min": round(float(clean.min()), 4),
        "q25": round(float(clean.quantile(0.25)), 4),
        "median": round(float(clean.median()), 4),
        "mean": round(float(clean.mean()), 4),
        "q75": round(float(clean.quantile(0.75)), 4),
        "p95": round(float(clean.quantile(0.95)), 4),
        "max": round(float(clean.max()), 4),
        "std": round(float(clean.std(ddof=1)), 4),
    }


def _unique_coord_count(df: pd.DataFrame, precision: int | None = None) -> int:
    """Count unique (latitude, longitude) pairs, optionally rounded."""
    coords = df[["latitude", "longitude"]]
    if precision is not None:
        coords = coords.round(precision)
    return int(len(coords.drop_duplicates()))


def _daynight_summary(df: pd.DataFrame) -> dict[str, object]:
    """Summarize daytime ('D') vs nighttime ('N') observation counts."""
    counts = df["daynight"].value_counts().to_dict()
    d_cnt = int(counts.get("D", 0))
    n_cnt = int(counts.get("N", 0))
    total = len(df)
    return {
        "D": d_cnt,
        "N": n_cnt,
        "day_pct": round(d_cnt / total * 100.0, 2) if total else 0.0,
        "night_pct": round(n_cnt / total * 100.0, 2) if total else 0.0,
    }


def _confidence_summary_for_sensor(df: pd.DataFrame, sensor: str) -> dict[str, object]:
    """Summarize confidence on the sensor's native scale without cross-sensor equating."""
    if sensor == "MODIS":
        conf_num = pd.to_numeric(df["confidence"], errors="raise")
        return {
            "scale": "numeric_0_to_100",
            "stats": _numeric_summary(conf_num),
            "firms_reference_bins": {
                "low_lt_30": int((conf_num < 30).sum()),
                "nominal_30_to_79": int(((conf_num >= 30) & (conf_num < 80)).sum()),
                "high_ge_80": int((conf_num >= 80).sum()),
            },
        }
    counts = {
        str(k): int(v)
        for k, v in df["confidence"]
        .value_counts()
        .reindex(["l", "n", "h"], fill_value=0)
        .items()
    }
    pcts = {
        k: round(v / len(df) * 100.0, 2) if len(df) else 0.0
        for k, v in counts.items()
    }
    return {
        "scale": "categorical_l_n_h",
        "counts": counts,
        "percentages": pcts,
    }


def analyze_dataset_overview(
    combined: pd.DataFrame,
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
) -> tuple[dict[str, object], pd.DataFrame]:
    """Step 1: Generate overall statistical dataset summary and tidy summary CSV."""
    total_obs = len(combined)
    modis_obs = len(modis)
    viirs_obs = len(viirs)

    min_date = combined["acq_date_dt"].min()
    max_date = combined["acq_date_dt"].max()
    calendar_days = int((max_date - min_date).days + 1)
    active_days = int(combined["acq_date"].nunique())

    missing_by_col = {
        name: {col: int(cnt) for col, cnt in frame[list(REQUIRED_COLUMNS)].isna().sum().items()}
        for name, frame in (("combined", combined), ("modis", modis), ("viirs", viirs))
    }

    overview = {
        "total_observations": total_obs,
        "sensor_counts": {"MODIS": modis_obs, "VIIRS": viirs_obs},
        "sensor_shares_pct": {
            "MODIS": round(modis_obs / total_obs * 100.0, 2),
            "VIIRS": round(viirs_obs / total_obs * 100.0, 2),
        },
        "date_coverage": {
            "utc_start": str(combined["acq_datetime"].min()),
            "utc_end": str(combined["acq_datetime"].max()),
            "date_start": min_date.strftime("%Y-%m-%d"),
            "date_end": max_date.strftime("%Y-%m-%d"),
            "calendar_span_days": calendar_days,
            "active_detection_days": active_days,
            "zero_detection_days": calendar_days - active_days,
            "mean_obs_per_calendar_day": round(total_obs / calendar_days, 2),
            "mean_obs_per_active_day": round(total_obs / active_days, 2),
        },
        "missing_values_total": {k: int(sum(v.values())) for k, v in missing_by_col.items()},
        "missing_values_by_column": missing_by_col,
        "unique_coordinates": {
            "exact_combined": _unique_coord_count(combined),
            "exact_modis": _unique_coord_count(modis),
            "exact_viirs": _unique_coord_count(viirs),
            "rounded_2dp_approx_1km_combined": _unique_coord_count(combined, precision=2),
            "rounded_1dp_approx_11km_combined": _unique_coord_count(combined, precision=1),
        },
        "coordinate_ranges": {
            "latitude": _numeric_summary(combined["latitude"]),
            "longitude": _numeric_summary(combined["longitude"]),
        },
        "brightness": {
            "combined": _numeric_summary(combined["brightness"]),
            "MODIS": _numeric_summary(modis["brightness"]),
            "VIIRS": _numeric_summary(viirs["brightness"]),
        },
        "bright_t31": {
            "combined": _numeric_summary(combined["bright_t31"]),
            "MODIS": _numeric_summary(modis["bright_t31"]),
            "VIIRS": _numeric_summary(viirs["bright_t31"]),
        },
        "frp": {
            "combined": _numeric_summary(combined["frp"]),
            "MODIS": _numeric_summary(modis["frp"]),
            "VIIRS": _numeric_summary(viirs["frp"]),
        },
        "day_night": {
            "combined": _daynight_summary(combined),
            "MODIS": _daynight_summary(modis),
            "VIIRS": _daynight_summary(viirs),
        },
        "confidence_separate": {
            "MODIS": _confidence_summary_for_sensor(modis, "MODIS"),
            "VIIRS": _confidence_summary_for_sensor(viirs, "VIIRS"),
        },
    }

    summary_rows = [
        ("total_observations", total_obs, "observations"),
        ("modis_observations", modis_obs, "observations"),
        ("viirs_observations", viirs_obs, "observations"),
        ("viirs_share_pct", overview["sensor_shares_pct"]["VIIRS"], "percent"),
        ("modis_share_pct", overview["sensor_shares_pct"]["MODIS"], "percent"),
        ("utc_start", overview["date_coverage"]["utc_start"], "timestamp"),
        ("utc_end", overview["date_coverage"]["utc_end"], "timestamp"),
        ("calendar_span_days", calendar_days, "days"),
        ("active_detection_days", active_days, "days"),
        ("zero_detection_days", calendar_days - active_days, "days"),
        ("mean_obs_per_calendar_day", overview["date_coverage"]["mean_obs_per_calendar_day"], "obs/day"),
        ("mean_obs_per_active_day", overview["date_coverage"]["mean_obs_per_active_day"], "obs/day"),
        ("missing_values_combined", overview["missing_values_total"]["combined"], "cells"),
        ("unique_exact_coordinates", overview["unique_coordinates"]["exact_combined"], "points"),
        ("unique_0_01deg_cells", overview["unique_coordinates"]["rounded_2dp_approx_1km_combined"], "cells"),
        ("latitude_min", overview["coordinate_ranges"]["latitude"]["min"], "deg_N"),
        ("latitude_max", overview["coordinate_ranges"]["latitude"]["max"], "deg_N"),
        ("longitude_min", overview["coordinate_ranges"]["longitude"]["min"], "deg_E"),
        ("longitude_max", overview["coordinate_ranges"]["longitude"]["max"], "deg_E"),
        ("brightness_median_combined", overview["brightness"]["combined"]["median"], "K"),
        ("brightness_mean_combined", overview["brightness"]["combined"]["mean"], "K"),
        ("frp_median_combined", overview["frp"]["combined"]["median"], "MW"),
        ("frp_mean_combined", overview["frp"]["combined"]["mean"], "MW"),
        ("frp_max_combined", overview["frp"]["combined"]["max"], "MW"),
        ("daytime_observations", overview["day_night"]["combined"]["D"], "observations"),
        ("nighttime_observations", overview["day_night"]["combined"]["N"], "observations"),
    ]
    summary_df = pd.DataFrame(summary_rows, columns=["metric", "value", "unit"])
    return overview, summary_df


def analyze_temporal(
    combined: pd.DataFrame,
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
) -> tuple[dict[str, object], pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Step 2: Monthly, daily, seasonal, yearly, day/night, and high-activity month analysis."""
    month_idx = pd.Index(range(1, 13), name="month")
    modis_m = modis.groupby("month").size().reindex(month_idx, fill_value=0)
    viirs_m = viirs.groupby("month").size().reindex(month_idx, fill_value=0)
    total_m = combined.groupby("month").size().reindex(month_idx, fill_value=0)

    monthly_df = pd.DataFrame(
        {
            "month": month_idx,
            "month_name": [MONTH_NAMES[m] for m in month_idx],
            "MODIS": modis_m.values,
            "VIIRS": viirs_m.values,
            "total_observations": total_m.values,
        }
    )
    monthly_df["share_pct"] = (monthly_df["total_observations"] / len(combined) * 100.0).round(2)
    monthly_df["modis_share_pct"] = np.where(
        monthly_df["total_observations"] > 0,
        (monthly_df["MODIS"] / monthly_df["total_observations"] * 100.0).round(2),
        0.0,
    )

    # Identify unusually high-activity months via IQR fence and robust z-score.
    q1 = float(monthly_df["total_observations"].quantile(0.25))
    q3 = float(monthly_df["total_observations"].quantile(0.75))
    iqr = q3 - q1
    iqr_upper = q3 + 1.5 * iqr
    monthly_mean = float(monthly_df["total_observations"].mean())
    monthly_std = float(monthly_df["total_observations"].std(ddof=1))
    monthly_df["z_score"] = (
        ((monthly_df["total_observations"] - monthly_mean) / monthly_std).round(2)
        if monthly_std > 0
        else 0.0
    )
    monthly_df["above_mean_plus_1sd"] = monthly_df["total_observations"] > (
        monthly_mean + monthly_std
    )
    monthly_df["above_iqr_fence"] = monthly_df["total_observations"] > iqr_upper

    # Daily calendar time series (including zero-count days).
    full_days = pd.date_range(
        combined["acq_date_dt"].min(), combined["acq_date_dt"].max(), freq="D"
    )
    daily_df = pd.DataFrame(
        {
            "date": full_days.strftime("%Y-%m-%d"),
            "MODIS": modis.groupby("acq_date_dt").size().reindex(full_days, fill_value=0).values,
            "VIIRS": viirs.groupby("acq_date_dt").size().reindex(full_days, fill_value=0).values,
            "total": combined.groupby("acq_date_dt").size().reindex(full_days, fill_value=0).values,
        }
    )
    daily_df["rolling_7d_total"] = daily_df["total"].rolling(7, min_periods=1).mean().round(2)
    top_days = (
        daily_df.sort_values(["total", "date"], ascending=[False, True])
        .head(10)
        .to_dict(orient="records")
    )

    # Seasonal breakdown.
    season_idx = pd.Index(SEASON_ORDER, name="season")
    seasonal_df = pd.DataFrame(
        {
            "season": season_idx,
            "MODIS": modis.groupby("season").size().reindex(season_idx, fill_value=0).values,
            "VIIRS": viirs.groupby("season").size().reindex(season_idx, fill_value=0).values,
            "total": combined.groupby("season").size().reindex(season_idx, fill_value=0).values,
        }
    )
    seasonal_df["share_pct"] = (seasonal_df["total"] / len(combined) * 100.0).round(2)

    # Yearly coverage check.
    years = sorted(int(y) for y in combined["year"].unique())
    yearly_counts = {
        int(y): int(cnt) for y, cnt in combined.groupby("year").size().items()
    }

    high_months = monthly_df.loc[
        monthly_df["above_mean_plus_1sd"] | monthly_df["above_iqr_fence"],
        ["month", "month_name", "total_observations", "share_pct", "z_score"],
    ].to_dict(orient="records")

    temporal_summary = {
        "years_present": years,
        "multi_year_available": len(years) > 1,
        "yearly_counts": yearly_counts,
        "monthly_mean": round(monthly_mean, 2),
        "monthly_std": round(monthly_std, 2),
        "monthly_median": round(float(monthly_df["total_observations"].median()), 2),
        "iqr_upper_threshold": round(iqr_upper, 2),
        "unusually_high_months": high_months,
        "peak_month": monthly_df.loc[monthly_df["total_observations"].idxmax()].to_dict(),
        "quietest_month": monthly_df.loc[monthly_df["total_observations"].idxmin()].to_dict(),
        "daily_stats": {
            "all_days_mean": round(float(daily_df["total"].mean()), 2),
            "all_days_median": round(float(daily_df["total"].median()), 2),
            "active_days_mean": round(
                float(daily_df.loc[daily_df["total"] > 0, "total"].mean()), 2
            ),
            "active_days_median": round(
                float(daily_df.loc[daily_df["total"] > 0, "total"].median()), 2
            ),
            "top_10_days": top_days,
        },
        "seasonal_summary": seasonal_df.to_dict(orient="records"),
        "day_night": {
            "combined": _daynight_summary(combined),
            "MODIS": _daynight_summary(modis),
            "VIIRS": _daynight_summary(viirs),
        },
    }
    return temporal_summary, monthly_df, daily_df, seasonal_df


def _assign_grid_cells(df: pd.DataFrame, step_deg: float) -> pd.DataFrame:
    """Assign each observation to its containing lat/lon grid cell."""
    binned = df.copy()
    binned["grid_lat"] = (np.floor(binned["latitude"] / step_deg) * step_deg).round(4)
    binned["grid_lon"] = (np.floor(binned["longitude"] / step_deg) * step_deg).round(4)
    return binned


def analyze_spatial(
    combined: pd.DataFrame,
    config: EDAConfig,
) -> tuple[dict[str, object], pd.DataFrame]:
    """Step 3: Spatial distribution, grid concentration, and top hotspot grid cells."""
    step = config.grid_step_deg
    binned = _assign_grid_cells(combined, step)

    grouped = (
        binned.groupby(["grid_lat", "grid_lon"], as_index=False)
        .agg(
            total_observations=("sensor", "size"),
            modis_observations=("sensor", lambda s: int((s == "MODIS").sum())),
            viirs_observations=("sensor", lambda s: int((s == "VIIRS").sum())),
            active_days=("acq_date", "nunique"),
            mean_frp=("frp", "mean"),
            max_frp=("frp", "max"),
            mean_brightness=("brightness", "mean"),
        )
        .sort_values(
            ["total_observations", "active_days", "grid_lat", "grid_lon"],
            ascending=[False, False, True, True],
        )
        .reset_index(drop=True)
    )
    grouped.insert(0, "rank", range(1, len(grouped) + 1))
    grouped["cell_center_lat"] = (grouped["grid_lat"] + step / 2.0).round(4)
    grouped["cell_center_lon"] = (grouped["grid_lon"] + step / 2.0).round(4)
    grouped["share_of_total_pct"] = (
        grouped["total_observations"] / len(combined) * 100.0
    ).round(2)
    grouped["mean_frp"] = grouped["mean_frp"].round(2)
    grouped["max_frp"] = grouped["max_frp"].round(2)
    grouped["mean_brightness"] = grouped["mean_brightness"].round(2)

    top_hotspots = grouped.head(config.top_n_hotspots).copy()
    fine_counts = (
        _assign_grid_cells(combined, config.fine_grid_step_deg)
        .groupby(["grid_lat", "grid_lon"])
        .size()
    )

    lat_bands = {
        str(k): int(v)
        for k, v in combined["lat_band"]
        .value_counts()
        .reindex(list(LAT_LABELS), fill_value=0)
        .items()
    }
    lon_bands = {
        str(k): int(v)
        for k, v in combined["lon_band"]
        .value_counts()
        .reindex(list(LON_LABELS), fill_value=0)
        .items()
    }

    spatial_summary = {
        "grid_step_deg": step,
        "active_grid_cells": int(len(grouped)),
        "cells_with_1_obs": int((grouped["total_observations"] == 1).sum()),
        "cells_with_ge_10_obs": int((grouped["total_observations"] >= 10).sum()),
        "cells_with_ge_50_obs": int((grouped["total_observations"] >= 50).sum()),
        "top_10_cells_share_pct": round(
            float(grouped.head(10)["total_observations"].sum() / len(combined) * 100.0), 2
        ),
        "top_20_cells_share_pct": round(
            float(grouped.head(20)["total_observations"].sum() / len(combined) * 100.0), 2
        ),
        "fine_grid_step_deg": config.fine_grid_step_deg,
        "fine_grid_active_cells": int(len(fine_counts)),
        "fine_grid_max_obs_per_cell": int(fine_counts.max()),
        "latitude_bands": lat_bands,
        "longitude_bands": lon_bands,
        "top_hotspots": top_hotspots.to_dict(orient="records"),
    }
    return spatial_summary, top_hotspots


def analyze_sensor_comparison(
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
    monthly_df: pd.DataFrame,
) -> tuple[dict[str, object], pd.DataFrame]:
    """Step 4: Detailed MODIS vs VIIRS comparison preserving separate confidence scales."""
    monthly_corr = float(monthly_df["MODIS"].corr(monthly_df["VIIRS"]))

    def _band_counts(frame: pd.DataFrame, col: str, labels: tuple[str, ...]) -> dict[str, int]:
        return {
            str(k): int(v)
            for k, v in frame[col].value_counts().reindex(list(labels), fill_value=0).items()
        }

    modis_lat = _band_counts(modis, "lat_band", LAT_LABELS)
    viirs_lat = _band_counts(viirs, "lat_band", LAT_LABELS)
    modis_lon = _band_counts(modis, "lon_band", LON_LABELS)
    viirs_lon = _band_counts(viirs, "lon_band", LON_LABELS)

    modis_conf = _confidence_summary_for_sensor(modis, "MODIS")
    viirs_conf = _confidence_summary_for_sensor(viirs, "VIIRS")

    comparison = {
        "counts": {
            "MODIS": int(len(modis)),
            "VIIRS": int(len(viirs)),
            "viirs_to_modis_ratio": round(len(viirs) / len(modis), 2),
        },
        "monthly_pearson_correlation": round(monthly_corr, 4),
        "satellites": {
            "MODIS": {str(k): int(v) for k, v in modis["satellite"].value_counts().items()},
            "VIIRS": {str(k): int(v) for k, v in viirs["satellite"].value_counts().items()},
        },
        "day_night": {
            "MODIS": _daynight_summary(modis),
            "VIIRS": _daynight_summary(viirs),
        },
        "brightness": {
            "MODIS": _numeric_summary(modis["brightness"]),
            "VIIRS": _numeric_summary(viirs["brightness"]),
        },
        "bright_t31": {
            "MODIS": _numeric_summary(modis["bright_t31"]),
            "VIIRS": _numeric_summary(viirs["bright_t31"]),
        },
        "frp": {
            "MODIS": _numeric_summary(modis["frp"]),
            "VIIRS": _numeric_summary(viirs["frp"]),
            "median_ratio_modis_to_viirs": round(
                float(modis["frp"].median() / viirs["frp"].median()), 2
            ),
        },
        "regional_frequency": {
            "latitude_bands": {"MODIS": modis_lat, "VIIRS": viirs_lat},
            "longitude_bands": {"MODIS": modis_lon, "VIIRS": viirs_lon},
        },
        "confidence_separate_scales": {
            "note": "MODIS numeric confidence (0-100) and VIIRS categorical confidence (l/n/h) are distinct retrieval scales and are never equated.",
            "MODIS": modis_conf,
            "VIIRS": viirs_conf,
        },
    }

    rows = [
        ("total_observations", int(len(modis)), int(len(viirs)), "observations"),
        ("daytime_pct", comparison["day_night"]["MODIS"]["day_pct"], comparison["day_night"]["VIIRS"]["day_pct"], "percent"),
        ("nighttime_pct", comparison["day_night"]["MODIS"]["night_pct"], comparison["day_night"]["VIIRS"]["night_pct"], "percent"),
        ("brightness_min", comparison["brightness"]["MODIS"]["min"], comparison["brightness"]["VIIRS"]["min"], "K"),
        ("brightness_median", comparison["brightness"]["MODIS"]["median"], comparison["brightness"]["VIIRS"]["median"], "K"),
        ("brightness_mean", comparison["brightness"]["MODIS"]["mean"], comparison["brightness"]["VIIRS"]["mean"], "K"),
        ("brightness_max", comparison["brightness"]["MODIS"]["max"], comparison["brightness"]["VIIRS"]["max"], "K"),
        ("bright_t31_median", comparison["bright_t31"]["MODIS"]["median"], comparison["bright_t31"]["VIIRS"]["median"], "K"),
        ("frp_median", comparison["frp"]["MODIS"]["median"], comparison["frp"]["VIIRS"]["median"], "MW"),
        ("frp_mean", comparison["frp"]["MODIS"]["mean"], comparison["frp"]["VIIRS"]["mean"], "MW"),
        ("frp_p95", comparison["frp"]["MODIS"]["p95"], comparison["frp"]["VIIRS"]["p95"], "MW"),
        ("frp_max", comparison["frp"]["MODIS"]["max"], comparison["frp"]["VIIRS"]["max"], "MW"),
        *[
            (f"lat_band_{label}", modis_lat[label], viirs_lat[label], "observations")
            for label in LAT_LABELS
        ],
        *[
            (f"lon_band_{label}", modis_lon[label], viirs_lon[label], "observations")
            for label in LON_LABELS
        ],
    ]
    comparison_df = pd.DataFrame(rows, columns=["metric", "MODIS", "VIIRS", "unit"])
    comparison_df["MODIS"] = comparison_df["MODIS"].astype(object)
    comparison_df["VIIRS"] = comparison_df["VIIRS"].astype(object)
    return comparison, comparison_df


def _coords_to_ecef_km(df: pd.DataFrame) -> np.ndarray:
    """Convert geographic (lat, lon) in degrees to 3D spherical Cartesian km."""
    lat_rad = np.radians(df["latitude"].to_numpy(dtype=np.float64))
    lon_rad = np.radians(df["longitude"].to_numpy(dtype=np.float64))
    cos_lat = np.cos(lat_rad)
    return np.column_stack(
        [
            EARTH_RADIUS_KM * cos_lat * np.cos(lon_rad),
            EARTH_RADIUS_KM * cos_lat * np.sin(lon_rad),
            EARTH_RADIUS_KM * np.sin(lat_rad),
        ]
    )


def _haversine_km(lat1: float, lon1: float, lat2: np.ndarray, lon2: np.ndarray) -> np.ndarray:
    """Compute exact spherical great-circle Haversine distance in kilometers."""
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    dphi = phi2 - phi1
    dlambda = np.radians(lon2) - np.radians(lon1)
    a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0) ** 2
    return 2.0 * EARTH_RADIUS_KM * np.arcsin(np.minimum(1.0, np.sqrt(a)))


def _evaluate_overlap_threshold(
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
    viirs_tree: cKDTree,
    modis_xyz: np.ndarray,
    modis_sec: np.ndarray,
    viirs_sec: np.ndarray,
    dist_km: float,
    time_minutes: int,
) -> dict[str, object]:
    """Evaluate cross-sensor MODIS-VIIRS proximity pairs for one spatial-temporal threshold."""
    chord_r = 2.0 * EARTH_RADIUS_KM * np.sin(dist_km / (2.0 * EARTH_RADIUS_KM))
    time_sec = time_minutes * 60
    candidates = viirs_tree.query_ball_point(modis_xyz, r=chord_r)

    modis_lats = modis["latitude"].to_numpy(dtype=np.float64)
    modis_lons = modis["longitude"].to_numpy(dtype=np.float64)
    viirs_lats = viirs["latitude"].to_numpy(dtype=np.float64)
    viirs_lons = viirs["longitude"].to_numpy(dtype=np.float64)

    matched_modis_idx: set[int] = set()
    matched_viirs_idx: set[int] = set()
    pair_distances_km: list[float] = []
    pair_time_deltas_min: list[float] = []

    for m_idx, v_indices in enumerate(candidates):
        if not v_indices:
            continue
        v_arr = np.asarray(v_indices, dtype=np.int64)
        dt_sec = np.abs(modis_sec[m_idx] - viirs_sec[v_arr])
        time_mask = dt_sec <= time_sec
        if not np.any(time_mask):
            continue

        v_time_ok = v_arr[time_mask]
        dists = _haversine_km(
            modis_lats[m_idx], modis_lons[m_idx], viirs_lats[v_time_ok], viirs_lons[v_time_ok]
        )
        dist_mask = dists <= dist_km
        if not np.any(dist_mask):
            continue

        matched_modis_idx.add(m_idx)
        for v_idx, d_km, dt_s in zip(
            v_time_ok[dist_mask], dists[dist_mask], dt_sec[time_mask][dist_mask]
        ):
            matched_viirs_idx.add(int(v_idx))
            pair_distances_km.append(float(d_km))
            pair_time_deltas_min.append(float(dt_s) / 60.0)

    n_modis = len(modis)
    n_viirs = len(viirs)
    m_matched = len(matched_modis_idx)
    v_matched = len(matched_viirs_idx)

    # Satellite breakdown (Aqua vs Terra) for MODIS matches.
    aqua_total = int((modis["satellite"] == "Aqua").sum())
    terra_total = int((modis["satellite"] == "Terra").sum())
    matched_sats = modis.iloc[sorted(matched_modis_idx)]["satellite"] if matched_modis_idx else pd.Series(dtype=str)
    aqua_matched = int((matched_sats == "Aqua").sum())
    terra_matched = int((matched_sats == "Terra").sum())

    return {
        "distance_threshold_km": dist_km,
        "time_threshold_minutes": time_minutes,
        "candidate_cross_sensor_pairs": len(pair_distances_km),
        "modis_total": n_modis,
        "modis_matched": m_matched,
        "modis_only": n_modis - m_matched,
        "modis_matched_pct": round(m_matched / n_modis * 100.0, 2) if n_modis else 0.0,
        "viirs_total": n_viirs,
        "viirs_matched": v_matched,
        "viirs_only": n_viirs - v_matched,
        "viirs_matched_pct": round(v_matched / n_viirs * 100.0, 2) if n_viirs else 0.0,
        "aqua_matched": aqua_matched,
        "aqua_matched_pct": round(aqua_matched / aqua_total * 100.0, 2) if aqua_total else 0.0,
        "terra_matched": terra_matched,
        "terra_matched_pct": round(terra_matched / terra_total * 100.0, 2) if terra_total else 0.0,
        "median_pair_distance_km": round(float(np.median(pair_distances_km)), 3)
        if pair_distances_km
        else None,
        "median_pair_time_delta_min": round(float(np.median(pair_time_deltas_min)), 2)
        if pair_time_deltas_min
        else None,
    }


def analyze_spatiotemporal_overlap(
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
    config: EDAConfig,
) -> tuple[dict[str, object], pd.DataFrame]:
    """Step 5: Analyse potential MODIS-VIIRS cross-sensor overlap without deduplicating."""
    modis_xyz = _coords_to_ecef_km(modis)
    viirs_xyz = _coords_to_ecef_km(viirs)
    viirs_tree = cKDTree(viirs_xyz)

    # Convert explicitly to integer epoch seconds so pandas 3.0 [us] vs [ns] units never skew math.
    modis_sec = modis["acq_datetime"].to_numpy(dtype="datetime64[s]").astype(np.int64)
    viirs_sec = viirs["acq_datetime"].to_numpy(dtype="datetime64[s]").astype(np.int64)

    primary = _evaluate_overlap_threshold(
        modis=modis,
        viirs=viirs,
        viirs_tree=viirs_tree,
        modis_xyz=modis_xyz,
        modis_sec=modis_sec,
        viirs_sec=viirs_sec,
        dist_km=config.overlap_distance_km,
        time_minutes=config.overlap_time_minutes,
    )

    thresholds = list(OVERLAP_SENSITIVITY_GRID)
    primary_pair = (config.overlap_distance_km, config.overlap_time_minutes)
    if primary_pair not in thresholds:
        thresholds.append(primary_pair)
        thresholds.sort()

    sensitivity_rows = [
        _evaluate_overlap_threshold(
            modis=modis,
            viirs=viirs,
            viirs_tree=viirs_tree,
            modis_xyz=modis_xyz,
            modis_sec=modis_sec,
            viirs_sec=viirs_sec,
            dist_km=d_km,
            time_minutes=t_min,
        )
        for d_km, t_min in thresholds
    ]
    overlap_df = pd.DataFrame(sensitivity_rows)
    overlap_df["is_primary_threshold"] = (
        (overlap_df["distance_threshold_km"] == config.overlap_distance_km)
        & (overlap_df["time_threshold_minutes"] == config.overlap_time_minutes)
    )

    summary = {
        "primary_threshold": primary,
        "sensitivity": sensitivity_rows,
        "methodology_and_limitations": [
            "Great-circle Haversine spatial proximity combined with absolute UTC acquisition time difference.",
            "MODIS Aqua (~13:30 local) orbits close to Suomi-NPP VIIRS (~13:30 local), whereas MODIS Terra (~10:30 local) is offset by ~3 hours and exhibits zero matches within +/-60 minutes.",
            "Because MODIS has ~1 km pixels and VIIRS has ~375 m pixels, one MODIS detection frequently overlaps multiple VIIRS pixels (many-to-one geometry).",
            "Spatial-temporal proximity alone does not confirm the same physical fire incident, nor does absence of a match imply false detection (cloud cover, swath edge, or fire duration between overpasses can prevent simultaneous detection).",
        ],
    }
    return summary, overlap_df


def analyze_data_quality(
    combined: pd.DataFrame,
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
) -> dict[str, object]:
    """Step 6: Audit data quality, integrity, duplicates, anomalies, and sensor quirks."""
    recomputed_ts = pd.to_datetime(
        combined["acq_date"].astype(str).str.strip()
        + " "
        + combined["acq_time"].astype(str).str.strip().str.zfill(4),
        format="%Y-%m-%d %H%M",
        utc=True,
        errors="coerce",
    )
    timestamp_mismatches = int((recomputed_ts != combined["acq_datetime"]).sum())

    bbox_outside = int(
        (
            ~combined["latitude"].between(BBOX_MIN_LAT, BBOX_MAX_LAT, inclusive="both")
            | ~combined["longitude"].between(BBOX_MIN_LON, BBOX_MAX_LON, inclusive="both")
        ).sum()
    )

    viirs_low_bright = int((viirs["brightness"] < 250.0).sum())
    viirs_bt_inversion = int((viirs["brightness"] < viirs["bright_t31"]).sum())
    modis_bt_inversion = int((modis["brightness"] < modis["bright_t31"]).sum())

    return {
        "missing_values_total": int(combined[list(REQUIRED_COLUMNS)].isna().sum().sum()),
        "invalid_coordinates": {
            "outside_global_lat_lon": int(
                (
                    ~combined["latitude"].between(-90.0, 90.0)
                    | ~combined["longitude"].between(-180.0, 180.0)
                ).sum()
            ),
            "zero_zero_coords": int(
                ((combined["latitude"] == 0.0) & (combined["longitude"] == 0.0)).sum()
            ),
            "outside_uttarakhand_bbox": bbox_outside,
        },
        "invalid_timestamps": {
            "nat_acq_datetime": int(combined["acq_datetime"].isna().sum()),
            "invalid_4digit_acq_time": int(
                (~combined["acq_time"].str.fullmatch(r"\d{4}")).sum()
            ),
            "acq_date_time_mismatch": timestamp_mismatches,
        },
        "duplicates": {
            "exact_full_row_duplicates": int(combined.duplicated().sum()),
            "same_sensor_coord_datetime": int(
                combined.duplicated(
                    subset=["sensor", "latitude", "longitude", "acq_datetime"]
                ).sum()
            ),
            "same_satellite_coord_date_time": int(
                combined.duplicated(
                    subset=["satellite", "latitude", "longitude", "acq_date", "acq_time"]
                ).sum()
            ),
        },
        "unexpected_values": {
            "non_positive_frp": int((combined["frp"] <= 0).sum()),
            "non_positive_scan_or_track": int(
                ((combined["scan"] <= 0) | (combined["track"] <= 0)).sum()
            ),
            "unexpected_daynight_codes": sorted(
                set(combined["daynight"].unique()) - {"D", "N"}
            ),
            "type_distribution_modis": {
                int(k): int(v) for k, v in modis["type"].value_counts().items()
            },
            "type_distribution_viirs": {
                int(k): int(v) for k, v in viirs["type"].value_counts().items()
            },
            "brightness_lt_250K_viirs": viirs_low_bright,
            "brightness_lt_bright_t31": {
                "MODIS": modis_bt_inversion,
                "VIIRS": viirs_bt_inversion,
            },
        },
        "sensor_specific_inconsistencies": {
            "viirs_instrument_column_values": sorted(viirs["instrument"].unique().tolist()),
            "modis_instrument_column_values": sorted(modis["instrument"].unique().tolist()),
            "confidence_schema_difference": "MODIS uses numeric 0-100; VIIRS uses categorical l/n/h.",
            "version_values": {
                "MODIS": sorted(modis["version"].unique().tolist()),
                "VIIRS": sorted(viirs["version"].unique().tolist()),
            },
            "scan_track_ranges": {
                "MODIS_scan": [float(modis["scan"].min()), float(modis["scan"].max())],
                "VIIRS_scan": [float(viirs["scan"].min()), float(viirs["scan"].max())],
                "MODIS_track": [float(modis["track"].min()), float(modis["track"].max())],
                "VIIRS_track": [float(viirs["track"].min()), float(viirs["track"].max())],
            },
        },
    }


def _save_figure(fig: plt.Figure, output_path: Path, logger: logging.Logger) -> Path:
    """Save chart at 300 DPI and close figure."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    logger.info("Saved chart: %s", output_path)
    return output_path


def generate_plots(
    combined: pd.DataFrame,
    modis: pd.DataFrame,
    viirs: pd.DataFrame,
    monthly_df: pd.DataFrame,
    daily_df: pd.DataFrame,
    seasonal_df: pd.DataFrame,
    top_hotspots: pd.DataFrame,
    overlap_df: pd.DataFrame,
    config: EDAConfig,
    logger: logging.Logger,
) -> dict[str, Path]:
    """Step 7: Generate all EDA visualizations using matplotlib and seaborn."""
    sns.set_theme(style="whitegrid", context="notebook")
    plots_dir = config.reports_dir / "plots"
    plot_paths: dict[str, Path] = {}

    # 1. Monthly detections & unusually high-activity months.
    monthly_long = monthly_df.melt(
        id_vars=["month", "month_name"],
        value_vars=["MODIS", "VIIRS"],
        var_name="sensor",
        value_name="observations",
    )
    fig, ax = plt.subplots(figsize=(11.5, 5.5))
    sns.barplot(
        data=monthly_long,
        x="month_name",
        y="observations",
        hue="sensor",
        palette=SENSOR_PALETTE,
        ax=ax,
    )
    ax.plot(
        range(len(monthly_df)),
        monthly_df["total_observations"],
        color="#1F2937",
        marker="o",
        linewidth=1.8,
        label="Combined Total",
    )
    high_idx = monthly_df.index[monthly_df["above_mean_plus_1sd"] | monthly_df["above_iqr_fence"]]
    for idx in high_idx:
        row = monthly_df.loc[idx]
        ax.annotate(
            f"High: {int(row['total_observations']):,}",
            xy=(idx, row["total_observations"]),
            xytext=(0, 10),
            textcoords="offset points",
            ha="center",
            fontsize=8.5,
            fontweight="bold",
            color="#B91C1C",
        )
    ax.set_ylim(0, max(int(monthly_df["total_observations"].max()), 1) * 1.15)
    ax.set_title("Monthly Thermal Fire Observations in Uttarakhand (MODIS vs VIIRS)")
    ax.set_xlabel("Month (UTC)")
    ax.set_ylabel("Satellite Observations")
    ax.legend(title="Series")
    plot_paths["monthly"] = _save_figure(
        fig, plots_dir / "01_monthly_detections_by_sensor.png", logger
    )

    # 2. Daily detection trends.
    daily_plot = daily_df.copy()
    daily_plot["date_dt"] = pd.to_datetime(daily_plot["date"])
    fig, axes = plt.subplots(2, 1, figsize=(12, 7.5), sharex=True)
    sns.lineplot(
        data=daily_plot,
        x="date_dt",
        y="total",
        color="#94A3B8",
        linewidth=1.0,
        alpha=0.8,
        label="Daily Total Observations",
        ax=axes[0],
    )
    sns.lineplot(
        data=daily_plot,
        x="date_dt",
        y="rolling_7d_total",
        color="#B91C1C",
        linewidth=2.0,
        label="7-Day Rolling Mean",
        ax=axes[0],
    )
    axes[0].set_title("Daily Satellite Fire Observation Trends (Uttarakhand)")
    axes[0].set_ylabel("Observations / Day")
    axes[0].legend()

    daily_sensor = daily_plot.melt(
        id_vars=["date_dt"],
        value_vars=["VIIRS", "MODIS"],
        var_name="sensor",
        value_name="observations",
    )
    sns.lineplot(
        data=daily_sensor,
        x="date_dt",
        y="observations",
        hue="sensor",
        palette=SENSOR_PALETTE,
        linewidth=1.3,
        ax=axes[1],
    )
    axes[1].set_title("Daily Observation Counts by Sensor")
    axes[1].set_xlabel("Date (UTC)")
    axes[1].set_ylabel("Observations / Day")
    axes[1].xaxis.set_major_locator(mdates.MonthLocator())
    axes[1].xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    plot_paths["daily"] = _save_figure(
        fig, plots_dir / "02_daily_detection_trends.png", logger
    )

    # 3. Seasonal & Day/Night distribution.
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.2))
    seasonal_long = seasonal_df.melt(
        id_vars=["season"],
        value_vars=["MODIS", "VIIRS"],
        var_name="sensor",
        value_name="observations",
    )
    sns.barplot(
        data=seasonal_long,
        x="season",
        y="observations",
        hue="sensor",
        palette=SENSOR_PALETTE,
        order=list(SEASON_ORDER),
        ax=axes[0],
    )
    axes[0].set_title("Seasonal Observation Distribution by Sensor")
    axes[0].set_xlabel("Season")
    axes[0].set_ylabel("Observations")
    axes[0].tick_params(axis="x", rotation=18)

    dn_df = combined.groupby(["sensor", "daynight"]).size().reset_index(name="observations")
    dn_df["period"] = dn_df["daynight"].map({"D": "Day (D)", "N": "Night (N)"})
    sns.barplot(
        data=dn_df,
        x="period",
        y="observations",
        hue="sensor",
        palette=SENSOR_PALETTE,
        ax=axes[1],
    )
    axes[1].set_title("Day vs Night Overpass Observations by Sensor")
    axes[1].set_xlabel("Overpass Period")
    axes[1].set_ylabel("Observations")
    plot_paths["seasonal_daynight"] = _save_figure(
        fig, plots_dir / "03_seasonal_and_daynight_distribution.png", logger
    )

    # 4. Geographic scatter + density heatmap with top 10 grid cells.
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.8))
    sns.scatterplot(
        data=combined.sort_values("sensor", ascending=False),
        x="longitude",
        y="latitude",
        hue="sensor",
        palette=SENSOR_PALETTE,
        alpha=0.35,
        s=10,
        linewidth=0,
        ax=axes[0],
    )
    axes[0].set_title("Geographic Scatter of Fire Observations (MODIS vs VIIRS)")
    axes[0].set_xlabel("Longitude (deg E)")
    axes[0].set_ylabel("Latitude (deg N)")

    hb = axes[1].hexbin(
        combined["longitude"],
        combined["latitude"],
        gridsize=45,
        bins="log",
        cmap="YlOrRd",
        mincnt=1,
    )
    fig.colorbar(hb, ax=axes[1], label="log10(Observations per Hexbin)")
    axes[1].scatter(
        top_hotspots["cell_center_lon"],
        top_hotspots["cell_center_lat"],
        s=75,
        facecolors="none",
        edgecolors="#1D4ED8",
        linewidths=1.8,
        label=f"Top {len(top_hotspots)} Density Cells ({config.grid_step_deg} deg)",
    )
    axes[1].set_title("Detection Density Heatmap (Observations, Not Fire Count)")
    axes[1].set_xlabel("Longitude (deg E)")
    axes[1].set_ylabel("Latitude (deg N)")
    axes[1].legend(loc="upper right")
    plot_paths["spatial_scatter_density"] = _save_figure(
        fig, plots_dir / "04_spatial_scatter_and_density.png", logger
    )

    # 5. Spatial distributions & regional sensor comparison.
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2))
    sns.kdeplot(
        data=combined,
        x="longitude",
        y="latitude",
        hue="sensor",
        palette=SENSOR_PALETTE,
        levels=5,
        thresh=0.1,
        warn_singular=False,
        ax=axes[0],
    )
    axes[0].set_title("Spatial KDE Contours by Sensor")
    axes[0].set_xlabel("Longitude (deg E)")
    axes[0].set_ylabel("Latitude (deg N)")

    lat_band_df = (
        combined.groupby(["lat_band", "sensor"], observed=False)
        .size()
        .reset_index(name="observations")
    )
    lat_band_df["sensor_share_pct"] = lat_band_df.groupby("sensor")["observations"].transform(
        lambda s: (s / s.sum() * 100.0).round(2) if s.sum() > 0 else 0.0
    )
    sns.barplot(
        data=lat_band_df,
        x="lat_band",
        y="sensor_share_pct",
        hue="sensor",
        palette=SENSOR_PALETTE,
        ax=axes[1],
    )
    axes[1].set_title("Regional Latitude Distribution (% Within Each Sensor)")
    axes[1].set_xlabel("Uttarakhand Latitude Band")
    axes[1].set_ylabel("Share of Sensor Observations (%)")
    axes[1].tick_params(axis="x", rotation=12)
    plot_paths["spatial_regions"] = _save_figure(
        fig, plots_dir / "05_spatial_distributions_by_sensor.png", logger
    )

    # 6. Sensor FRP & Brightness comparison.
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.2))
    sns.boxplot(
        data=combined,
        x="sensor",
        y="frp",
        hue="sensor",
        palette=SENSOR_PALETTE,
        legend=False,
        showfliers=True,
        flierprops={"marker": ".", "alpha": 0.25, "markersize": 3},
        ax=axes[0],
    )
    axes[0].set_yscale("log")
    axes[0].set_title("Fire Radiative Power (FRP) Comparison (Log Scale)")
    axes[0].set_xlabel("Sensor")
    axes[0].set_ylabel("FRP (MW, log scale)")

    sns.histplot(
        data=combined,
        x="brightness",
        hue="sensor",
        palette=SENSOR_PALETTE,
        stat="density",
        common_norm=False,
        bins=45,
        alpha=0.45,
        kde=True,
        ax=axes[1],
    )
    axes[1].set_xlim(285, 410)
    axes[1].set_title("Brightness Temperature Distribution (285-410 K)")
    axes[1].set_xlabel("Brightness Temperature (K)")
    axes[1].set_ylabel("Density")
    plot_paths["frp_brightness"] = _save_figure(
        fig, plots_dir / "06_sensor_frp_brightness_comparison.png", logger
    )

    # 7. Confidence distributions strictly separated.
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.0))
    modis_conf = pd.to_numeric(modis["confidence"], errors="raise")
    sns.histplot(
        x=modis_conf,
        bins=20,
        color=SENSOR_PALETTE["MODIS"],
        edgecolor="white",
        ax=axes[0],
    )
    axes[0].set_title("MODIS Confidence (Numeric 0-100 Scale)")
    axes[0].set_xlabel("MODIS Confidence (%)")
    axes[0].set_ylabel("Observations")

    viirs_conf_df = (
        viirs["confidence"]
        .value_counts()
        .reindex(["l", "n", "h"], fill_value=0)
        .rename_axis("confidence")
        .reset_index(name="observations")
    )
    sns.barplot(
        data=viirs_conf_df,
        x="confidence",
        y="observations",
        color=SENSOR_PALETTE["VIIRS"],
        ax=axes[1],
    )
    max_viirs = max(int(viirs_conf_df["observations"].max()), 1)
    axes[1].set_ylim(0, max_viirs * 1.12)
    axes[1].set_title("VIIRS Confidence (Categorical l / n / h Scale)")
    axes[1].set_xlabel("VIIRS Confidence Category (l=Low, n=Nominal, h=High)")
    axes[1].set_ylabel("Observations")
    for idx, row in viirs_conf_df.iterrows():
        axes[1].text(
            idx,
            row["observations"] + max_viirs * 0.02,
            f"{int(row['observations']):,}",
            ha="center",
            fontsize=9,
        )
    fig.suptitle(
        "Sensor Confidence Distributions (Algorithmically Distinct Scales — Not Equivalent)",
        y=1.02,
        fontsize=12,
    )
    plot_paths["confidence"] = _save_figure(
        fig, plots_dir / "07_sensor_confidence_distributions.png", logger
    )

    # 8. Cross-sensor spatial-temporal overlap analysis.
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2))
    prim = overlap_df.loc[overlap_df["is_primary_threshold"]].iloc[0]
    bar_df = pd.DataFrame(
        [
            {"group": "MODIS (All)", "category": "Matched", "pct": prim["modis_matched_pct"]},
            {"group": "MODIS (All)", "category": "Sensor-Only", "pct": round(100.0 - prim["modis_matched_pct"], 2)},
            {"group": "MODIS Aqua", "category": "Matched", "pct": prim["aqua_matched_pct"]},
            {"group": "MODIS Aqua", "category": "Sensor-Only", "pct": round(100.0 - prim["aqua_matched_pct"], 2)},
            {"group": "MODIS Terra", "category": "Matched", "pct": prim["terra_matched_pct"]},
            {"group": "MODIS Terra", "category": "Sensor-Only", "pct": round(100.0 - prim["terra_matched_pct"], 2)},
            {"group": "VIIRS (All)", "category": "Matched", "pct": prim["viirs_matched_pct"]},
            {"group": "VIIRS (All)", "category": "Sensor-Only", "pct": round(100.0 - prim["viirs_matched_pct"], 2)},
        ]
    )
    sns.barplot(
        data=bar_df,
        x="group",
        y="pct",
        hue="category",
        palette={"Matched": "#2563EB", "Sensor-Only": "#CBD5E1"},
        ax=axes[0],
    )
    axes[0].set_ylim(0, 110)
    axes[0].set_title(
        f"Cross-Sensor Proximity Share ({config.overlap_distance_km} km, +/-{config.overlap_time_minutes} min)"
    )
    axes[0].set_xlabel("Sensor / Satellite Group")
    axes[0].set_ylabel("Percentage of Observations (%)")
    axes[0].tick_params(axis="x", rotation=12)

    sens_plot = overlap_df.copy()
    sens_plot["threshold_label"] = (
        sens_plot["distance_threshold_km"].astype(str)
        + "km / "
        + sens_plot["time_threshold_minutes"].astype(str)
        + "m"
    )
    sens_long = sens_plot.melt(
        id_vars=["threshold_label"],
        value_vars=["modis_matched_pct", "viirs_matched_pct"],
        var_name="sensor_metric",
        value_name="matched_pct",
    )
    sens_long["sensor_metric"] = sens_long["sensor_metric"].map(
        {"modis_matched_pct": "MODIS Matched %", "viirs_matched_pct": "VIIRS Matched %"}
    )
    sns.lineplot(
        data=sens_long,
        x="threshold_label",
        y="matched_pct",
        hue="sensor_metric",
        marker="o",
        palette={"MODIS Matched %": SENSOR_PALETTE["MODIS"], "VIIRS Matched %": SENSOR_PALETTE["VIIRS"]},
        ax=axes[1],
    )
    axes[1].set_title("Overlap Sensitivity Across Distance / Time Thresholds")
    axes[1].set_xlabel("Spatial / Temporal Threshold")
    axes[1].set_ylabel("Matched Observations (%)")
    axes[1].tick_params(axis="x", rotation=20)
    plot_paths["overlap"] = _save_figure(
        fig, plots_dir / "08_cross_sensor_overlap_analysis.png", logger
    )

    return plot_paths


def save_csv_outputs(
    reports_dir: Path,
    dataset_summary_df: pd.DataFrame,
    monthly_df: pd.DataFrame,
    sensor_comp_df: pd.DataFrame,
    hotspots_df: pd.DataFrame,
    overlap_df: pd.DataFrame,
    full_payload: dict[str, object],
    logger: logging.Logger,
) -> dict[str, Path]:
    """Step 8: Persist all required CSV summaries and full JSON payload."""
    reports_dir.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, tuple[str, pd.DataFrame]] = {
        "dataset_summary": ("dataset_summary.csv", dataset_summary_df),
        "monthly_analysis": ("monthly_analysis.csv", monthly_df),
        "sensor_comparison": ("sensor_comparison.csv", sensor_comp_df),
        "spatial_hotspots": ("spatial_hotspots.csv", hotspots_df),
        "overlap_analysis": ("overlap_analysis.csv", overlap_df),
    }
    saved: dict[str, Path] = {}
    for key, (filename, frame) in outputs.items():
        path = reports_dir / filename
        frame.to_csv(path, index=False)
        saved[key] = path
        logger.info("Saved CSV summary: %s", path)

    json_path = reports_dir / "eda_summary.json"
    json_path.write_text(json.dumps(full_payload, indent=2), encoding="utf-8")
    saved["eda_summary_json"] = json_path
    logger.info("Saved full JSON summary: %s", json_path)
    return saved


def _df_to_markdown_table(df: pd.DataFrame) -> str:
    """Format DataFrame as a GitHub-flavored Markdown table."""
    headers = [str(c) for c in df.columns]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in df.itertuples(index=False, name=None):
        lines.append("| " + " | ".join(str(val) for val in row) + " |")
    return "\n".join(lines)


def generate_markdown_report(
    reports_dir: Path,
    overview: dict[str, object],
    temporal: dict[str, object],
    spatial: dict[str, object],
    sensor_comp: dict[str, object],
    overlap: dict[str, object],
    quality: dict[str, object],
    monthly_df: pd.DataFrame,
    seasonal_df: pd.DataFrame,
    hotspots_df: pd.DataFrame,
    sensor_comp_df: pd.DataFrame,
    overlap_df: pd.DataFrame,
    plot_paths: dict[str, Path],
    logger: logging.Logger,
) -> Path:
    """Step 8: Generate comprehensive Markdown EDA report."""
    report_path = reports_dir / "EDA_REPORT.md"
    rel = {k: f"plots/{p.name}" for k, p in plot_paths.items()}

    dc = overview["date_coverage"]
    uniq = overview["unique_coordinates"]
    dn = overview["day_night"]
    prim_ov = overlap["primary_threshold"]
    modis_conf = sensor_comp["confidence_separate"]["MODIS"] if "confidence_separate" in sensor_comp else overview["confidence_separate"]["MODIS"]
    viirs_conf = overview["confidence_separate"]["VIIRS"]

    high_months_text = ", ".join(
        f"{m['month_name']} ({m['total_observations']:,} obs, z={m['z_score']})"
        for m in temporal["unusually_high_months"]
    ) or "None exceeding mean + 1 SD / IQR upper fence"

    yearly_note = (
        f"Multi-year data present: `{temporal['yearly_counts']}`."
        if temporal["multi_year_available"]
        else f"Single calendar year available (`{temporal['years_present'][0]}`); multi-year trend analysis is not applicable."
    )

    modis_type2_count = quality["unexpected_values"]["type_distribution_modis"].get(2, 0)
    viirs_lt_250_count = quality["unexpected_values"]["brightness_lt_250K_viirs"]
    viirs_bt_inv_count = quality["unexpected_values"]["brightness_lt_bright_t31"]["VIIRS"]

    lines = [
        "# FIREINTEL — Exploratory Data Analysis Report (Uttarakhand)",
        "",
        "> **Core Analytical Disclaimer:** Every row in these datasets is a **satellite thermal anomaly observation** recorded during an orbital overpass, **not** a confirmed standalone wildfire incident. A single wildfire can generate multiple observations across consecutive days, adjacent 375 m VIIRS / 1 km MODIS pixels, or multiple satellites (`Aqua`, `Terra`, `SNPP`).",
        "",
        "---",
        "",
        "## 1. Dataset Characteristics & Overview",
        "",
        f"- **Total observations:** `{overview['total_observations']:,}` (`VIIRS`: `{overview['sensor_counts']['VIIRS']:,}` / `{overview['sensor_shares_pct']['VIIRS']}%`; `MODIS`: `{overview['sensor_counts']['MODIS']:,}` / `{overview['sensor_shares_pct']['MODIS']}%`)",
        f"- **Date coverage (UTC):** `{dc['utc_start']}` to `{dc['utc_end']}` (`{dc['active_detection_days']}` active detection days out of `{dc['calendar_span_days']}` calendar days; `{dc['zero_detection_days']}` zero-detection days)",
        f"- **Observation frequency:** `{dc['mean_obs_per_calendar_day']}` obs/calendar day (`{dc['mean_obs_per_active_day']}` obs/active day)",
        f"- **Missing values:** `{overview['missing_values_total']['combined']}` missing cells across all columns in combined, MODIS, and VIIRS files",
        f"- **Unique geographical coordinates:** `{uniq['exact_combined']:,}` exact `(latitude, longitude)` pairs (`MODIS`: `{uniq['exact_modis']:,}`, `VIIRS`: `{uniq['exact_viirs']:,}` — satellite pixel centroids shift per overpass); `{uniq['rounded_2dp_approx_1km_combined']:,}` unique `0.01°` (~1.1 km) cells",
        f"- **Spatial extent:** latitude `{overview['coordinate_ranges']['latitude']['min']}` to `{overview['coordinate_ranges']['latitude']['max']}` deg N; longitude `{overview['coordinate_ranges']['longitude']['min']}` to `{overview['coordinate_ranges']['longitude']['max']}` deg E",
        f"- **Brightness temperature (K):** min `{overview['brightness']['combined']['min']}`, median `{overview['brightness']['combined']['median']}`, mean `{overview['brightness']['combined']['mean']}`, max `{overview['brightness']['combined']['max']}`",
        f"- **Fire Radiative Power (FRP, MW):** min `{overview['frp']['combined']['min']}`, Q25 `{overview['frp']['combined']['q25']}`, median `{overview['frp']['combined']['median']}`, mean `{overview['frp']['combined']['mean']}`, P95 `{overview['frp']['combined']['p95']}`, max `{overview['frp']['combined']['max']}`",
        f"- **Day vs Night (`daynight`):** Day `D` = `{dn['combined']['D']:,}` (`{dn['combined']['day_pct']}%`), Night `N` = `{dn['combined']['N']:,}` (`{dn['combined']['night_pct']}%`)",
        "",
        "---",
        "",
        "## 2. Temporal Patterns",
        "",
        f"- **Yearly coverage:** {yearly_note}",
        f"- **Unusually high observation months** (exceeding monthly mean + 1 SD `{round(temporal['monthly_mean'] + temporal['monthly_std'], 1)}` or IQR upper fence `{temporal['iqr_upper_threshold']}`): **{high_months_text}**.",
        f"- **Peak vs quietest month:** Peak = `{temporal['peak_month']['month_name']}` (`{temporal['peak_month']['total_observations']:,}` obs, `{temporal['peak_month']['share_pct']}%`); Quietest = `{temporal['quietest_month']['month_name']}` (`{temporal['quietest_month']['total_observations']:,}` obs, `{temporal['quietest_month']['share_pct']}%`).",
        f"- **Daily single-day peak:** `{temporal['daily_stats']['top_10_days'][0]['date']}` with `{temporal['daily_stats']['top_10_days'][0]['total']:,}` observations (`VIIRS`: `{temporal['daily_stats']['top_10_days'][0]['VIIRS']:,}`, `MODIS`: `{temporal['daily_stats']['top_10_days'][0]['MODIS']:,}`).",
        "",
        "### Monthly Analysis",
        "",
        _df_to_markdown_table(monthly_df),
        "",
        f"![Monthly Fire Detections]({rel['monthly']})",
        "",
        f"![Daily Detection Trends]({rel['daily']})",
        "",
        "### Seasonal & Day/Night Distribution",
        "",
        "Seasons follow regional meteorological periods: **Winter** (Dec–Feb), **Pre-Monsoon** (Mar–May), **Monsoon** (Jun–Sep), and **Post-Monsoon** (Oct–Nov).",
        "",
        _df_to_markdown_table(seasonal_df),
        "",
        f"![Seasonal and Day/Night Distribution]({rel['seasonal_daynight']})",
        "",
        "---",
        "",
        "## 3. Geographical Hotspots & Spatial Analysis",
        "",
        "> **Spatial Interpretation Caution:** Grid observation density reflects how frequently thermal anomalies were detected by satellites over that area; it does **not** directly equal the number of distinct fires or burned area size.",
        "",
        f"- **Grid concentration (`{spatial['grid_step_deg']}°` cells, ~5.5 km):** `{spatial['active_grid_cells']:,}` active cells (`{spatial['cells_with_1_obs']}` with 1 observation; `{spatial['cells_with_ge_10_obs']}` with >= 10; `{spatial['cells_with_ge_50_obs']}` with >= 50).",
        f"- **Top-cell share:** Top 10 grid cells hold `{spatial['top_10_cells_share_pct']}%` of all detections; top 20 hold `{spatial['top_20_cells_share_pct']}%`.",
        f"- **Latitude bands:** `{spatial['latitude_bands']}`",
        f"- **Longitude bands:** `{spatial['longitude_bands']}`",
        "",
        f"### Top {len(hotspots_df)} Grid Cells by Observation Density (`{spatial['grid_step_deg']}° × {spatial['grid_step_deg']}°`)",
        "",
        _df_to_markdown_table(
            hotspots_df[
                [
                    "rank",
                    "cell_center_lat",
                    "cell_center_lon",
                    "total_observations",
                    "modis_observations",
                    "viirs_observations",
                    "active_days",
                    "share_of_total_pct",
                    "mean_frp",
                    "max_frp",
                ]
            ]
        ),
        "",
        f"![Geographic Scatter and Density Heatmap]({rel['spatial_scatter_density']})",
        "",
        f"![Spatial Distributions by Sensor]({rel['spatial_regions']})",
        "",
        "---",
        "",
        "## 4. MODIS vs VIIRS Sensor Comparison",
        "",
        f"- **Observation volume:** `VIIRS` (`{sensor_comp['counts']['VIIRS']:,}`) recorded `{sensor_comp['counts']['viirs_to_modis_ratio']}x` more detections than `MODIS` (`{sensor_comp['counts']['MODIS']:,}`), consistent with VIIRS's finer 375 m pixel resolution versus MODIS's 1 km pixel footprint.",
        f"- **Monthly trend correlation:** `r = {sensor_comp['monthly_pearson_correlation']}` between MODIS and VIIRS monthly observation counts.",
        f"- **Satellites:** `MODIS` = `{sensor_comp['satellites']['MODIS']}`; `VIIRS` = `{sensor_comp['satellites']['VIIRS']}`.",
        f"- **FRP contrast:** Median `MODIS` FRP (`{sensor_comp['frp']['MODIS']['median']} MW`) is `{sensor_comp['frp']['median_ratio_modis_to_viirs']}x` median `VIIRS` FRP (`{sensor_comp['frp']['VIIRS']['median']} MW`), reflecting larger MODIS pixel integration and higher minimum detectable fire intensity.",
        "",
        _df_to_markdown_table(sensor_comp_df),
        "",
        f"![FRP and Brightness Comparison]({rel['frp_brightness']})",
        "",
        "### Confidence Distributions (Strictly Separate Scales)",
        "",
        f"> **Non-Equivalence Warning:** {sensor_comp['confidence_separate_scales']['note']}",
        "",
        f"- **MODIS numeric confidence (0–100):** min `{modis_conf['stats']['min']}`, Q25 `{modis_conf['stats']['q25']}`, median `{modis_conf['stats']['median']}`, mean `{modis_conf['stats']['mean']}`, Q75 `{modis_conf['stats']['q75']}`, max `{modis_conf['stats']['max']}`; descriptive FIRMS ranges `<30` = `{modis_conf['firms_reference_bins']['low_lt_30']:,}`, `30–79` = `{modis_conf['firms_reference_bins']['nominal_30_to_79']:,}`, `>=80` = `{modis_conf['firms_reference_bins']['high_ge_80']:,}`.",
        f"- **VIIRS categorical confidence (`l`/`n`/`h`):** counts = `{viirs_conf['counts']}`, percentages = `{viirs_conf['percentages']}`.",
        "",
        f"![Sensor Confidence Distributions]({rel['confidence']})",
        "",
        "---",
        "",
        "## 5. Cross-Sensor Spatial-Temporal Overlap Analysis",
        "",
        f"Using great-circle Haversine distance `<= {prim_ov['distance_threshold_km']} km` and absolute UTC time difference `<= {prim_ov['time_threshold_minutes']} min` (without deleting or merging any rows):",
        "",
        f"- **Candidate cross-sensor pairs:** `{prim_ov['candidate_cross_sensor_pairs']:,}`",
        f"- **MODIS matched vs MODIS-only:** `{prim_ov['modis_matched']:,}` / `{prim_ov['modis_total']:,}` matched (`{prim_ov['modis_matched_pct']}%`), leaving `{prim_ov['modis_only']:,}` MODIS-only observations (`{round(100.0 - prim_ov['modis_matched_pct'], 2)}%`).",
        f"- **VIIRS matched vs VIIRS-only:** `{prim_ov['viirs_matched']:,}` / `{prim_ov['viirs_total']:,}` matched (`{prim_ov['viirs_matched_pct']}%`), leaving `{prim_ov['viirs_only']:,}` VIIRS-only observations (`{round(100.0 - prim_ov['viirs_matched_pct'], 2)}%`).",
        f"- **MODIS orbital timing split:** `Aqua` (`~13:30` local overpass, near Suomi-NPP) matched `{prim_ov['aqua_matched']:,}` (`{prim_ov['aqua_matched_pct']}%`), whereas `Terra` (`~10:30` local overpass) matched `{prim_ov['terra_matched']:,}` (`{prim_ov['terra_matched_pct']}%`) within `+/-{prim_ov['time_threshold_minutes']} min`.",
        f"- **Matched pair separation:** median distance `{prim_ov['median_pair_distance_km']} km`, median time delta `{prim_ov['median_pair_time_delta_min']} min`.",
        "",
        "### Overlap Threshold Sensitivity",
        "",
        _df_to_markdown_table(overlap_df),
        "",
        "**Overlap Methodology & Limitations:**",
        *[f"- {item}" for item in overlap["methodology_and_limitations"]],
        "",
        f"![Cross-Sensor Overlap Analysis]({rel['overlap']})",
        "",
        "---",
        "",
        "## 6. Data Quality Audit",
        "",
        f"- **Missing values:** `{quality['missing_values_total']}` missing cells across all columns.",
        f"- **Coordinate checks:** `{quality['invalid_coordinates']['outside_global_lat_lon']}` globally invalid coordinates, `{quality['invalid_coordinates']['zero_zero_coords']}` `(0, 0)` coordinates, `{quality['invalid_coordinates']['outside_uttarakhand_bbox']}` outside Uttarakhand bounding box.",
        f"- **Timestamp checks:** `{quality['invalid_timestamps']['nat_acq_datetime']}` `NaT` timestamps, `{quality['invalid_timestamps']['invalid_4digit_acq_time']}` malformed `acq_time` entries, `{quality['invalid_timestamps']['acq_date_time_mismatch']}` `acq_date`/`acq_time` vs `acq_datetime` mismatches.",
        f"- **Duplicate checks:** `{quality['duplicates']['exact_full_row_duplicates']}` exact full-row duplicates; `{quality['duplicates']['same_sensor_coord_datetime']}` same-`(sensor, lat, lon, acq_datetime)` duplicates.",
        f"- **Thermal & value checks:** `{quality['unexpected_values']['non_positive_frp']}` non-positive `frp` rows; `{quality['unexpected_values']['non_positive_scan_or_track']}` non-positive `scan`/`track` rows; unexpected `daynight` codes = `{quality['unexpected_values']['unexpected_daynight_codes']}`.",
        f"- **FIRMS `type` flag & physical channel quirks:** MODIS includes `{quality['unexpected_values']['type_distribution_modis']}` (`type=2` denotes static thermal/non-vegetation land sources in FIRMS C6.1: `{modis_type2_count}` rows); VIIRS has `{quality['unexpected_values']['type_distribution_viirs']}`, `{viirs_lt_250_count}` observations with `brightness < 250 K` (I-4 channel fold), and `{viirs_bt_inv_count}` VIIRS rows where `brightness < bright_t31`.",
        f"- **Sensor schema inconsistencies:** VIIRS raw `instrument` field holds `{quality['sensor_specific_inconsistencies']['viirs_instrument_column_values']}` rather than `['VIIRS']` (handled via the normalized `sensor` column); `version` uses `{quality['sensor_specific_inconsistencies']['version_values']}`; `confidence` uses incompatible numeric (`0–100`) vs categorical (`l`/`n`/`h`) schemas.",
        "",
        "---",
        "",
        "## 7. Limitations & Recommendations for Next Development Phase",
        "",
        "### Key Limitations",
        f"1. **Calendar window (`{', '.join(str(y) for y in temporal['years_present'])}`):** Inter-annual climate variability (e.g., drought vs wet years) cannot be modeled from a single year alone.",
        "2. **Observations != fire incidents:** Adjacent 375 m VIIRS and 1 km MODIS pixels from the same fire inflate raw point counts in persistently burning areas.",
        "3. **Missing environmental covariates:** FIRMS points alone lack land-cover, forest type, topography (slope/elevation), weather (temperature, RH, wind, VPD), and anthropogenic proximity.",
        f"4. **Non-vegetation & channel anomalies:** `{modis_type2_count}` MODIS detections are flagged `type=2` (static thermal land sources) and `{viirs_bt_inv_count}` VIIRS rows show `brightness < bright_t31` inversions.",
        "",
        "### Recommendations for Next Phase",
        "1. **Spatio-temporal fire event clustering:** Group raw detections into discrete wildfire episodes (e.g., ST-DBSCAN / space-time connected components) while retaining raw observations for auditability and computing episode duration, peak FRP, and growth rate.",
        "2. **Handle `type` & sensor quirks explicitly:** Flag or separate MODIS `type=2` static thermal anomalies before downstream forest fire risk modeling, and retain separate sensor-aware confidence handling rather than merging `0–100` and `l`/`n`/`h`.",
        "3. **Expand multi-year & environmental context:** Ingest additional years (e.g., 2015–2024) plus Uttarakhand elevation/slope, forest cover, and ERA5 meteorological features onto a uniform spatial-temporal grid before training predictive ML models.",
        "",
    ]

    report_path.write_text("\n".join(lines), encoding="utf-8")
    logger.info("Generated Markdown EDA report: %s", report_path)
    return report_path


def run_eda(config: EDAConfig, logger: logging.Logger) -> dict[str, object]:
    """Execute the complete EDA pipeline read-only on processed datasets."""
    config.validate()
    datasets = load_all_datasets(
        config.processed_dir,
        filenames={
            "COMBINED": config.combined_filename,
            "MODIS": config.modis_filename,
            "VIIRS": config.viirs_filename,
        },
    )
    combined = datasets["COMBINED"]
    modis = datasets["MODIS"]
    viirs = datasets["VIIRS"]

    logger.info(
        "Loaded processed datasets: combined=%d, MODIS=%d, VIIRS=%d",
        len(combined),
        len(modis),
        len(viirs),
    )

    overview, dataset_summary_df = analyze_dataset_overview(combined, modis, viirs)
    temporal, monthly_df, daily_df, seasonal_df = analyze_temporal(combined, modis, viirs)
    spatial, hotspots_df = analyze_spatial(combined, config)
    sensor_comp, sensor_comp_df = analyze_sensor_comparison(modis, viirs, monthly_df)
    overlap, overlap_df = analyze_spatiotemporal_overlap(modis, viirs, config)
    quality = analyze_data_quality(combined, modis, viirs)

    plot_paths = generate_plots(
        combined=combined,
        modis=modis,
        viirs=viirs,
        monthly_df=monthly_df,
        daily_df=daily_df,
        seasonal_df=seasonal_df,
        top_hotspots=hotspots_df,
        overlap_df=overlap_df,
        config=config,
        logger=logger,
    )

    full_payload = {
        "dataset_overview": overview,
        "temporal_analysis": temporal,
        "spatial_analysis": spatial,
        "sensor_comparison": sensor_comp,
        "overlap_analysis": overlap,
        "data_quality": quality,
    }
    saved_summaries = save_csv_outputs(
        reports_dir=config.reports_dir,
        dataset_summary_df=dataset_summary_df,
        monthly_df=monthly_df,
        sensor_comp_df=sensor_comp_df,
        hotspots_df=hotspots_df,
        overlap_df=overlap_df,
        full_payload=full_payload,
        logger=logger,
    )

    report_path = generate_markdown_report(
        reports_dir=config.reports_dir,
        overview=overview,
        temporal=temporal,
        spatial=spatial,
        sensor_comp=sensor_comp,
        overlap=overlap,
        quality=quality,
        monthly_df=monthly_df,
        seasonal_df=seasonal_df,
        hotspots_df=hotspots_df,
        sensor_comp_df=sensor_comp_df,
        overlap_df=overlap_df,
        plot_paths=plot_paths,
        logger=logger,
    )

    return {
        "overview": overview,
        "temporal": temporal,
        "spatial": spatial,
        "sensor_comparison": sensor_comp,
        "overlap": overlap,
        "data_quality": quality,
        "plot_paths": plot_paths,
        "summary_paths": saved_summaries,
        "report_path": report_path,
    }


def parse_args() -> argparse.Namespace:
    """Parse CLI configuration arguments."""
    parser = argparse.ArgumentParser(
        description="Run comprehensive EDA on processed Uttarakhand FIRMS datasets."
    )
    parser.add_argument("--processed-dir", type=Path, default=PROCESSED_DATA_DIR)
    parser.add_argument("--reports-dir", type=Path, default=REPORTS_DIR)
    parser.add_argument("--combined-file", default=INPUT_FILES["COMBINED"])
    parser.add_argument("--modis-file", default=INPUT_FILES["MODIS"])
    parser.add_argument("--viirs-file", default=INPUT_FILES["VIIRS"])
    parser.add_argument("--grid-step-deg", type=float, default=0.05)
    parser.add_argument("--top-n-hotspots", type=int, default=10)
    parser.add_argument("--overlap-distance-km", type=float, default=1.0)
    parser.add_argument("--overlap-time-minutes", type=int, default=60)
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


def main() -> None:
    """CLI entry point."""
    args = parse_args()
    logger = configure_logging(verbose=args.verbose)
    config = EDAConfig(
        processed_dir=args.processed_dir,
        reports_dir=args.reports_dir,
        combined_filename=args.combined_file,
        modis_filename=args.modis_file,
        viirs_filename=args.viirs_file,
        grid_step_deg=args.grid_step_deg,
        top_n_hotspots=args.top_n_hotspots,
        overlap_distance_km=args.overlap_distance_km,
        overlap_time_minutes=args.overlap_time_minutes,
    )

    try:
        run_eda(config=config, logger=logger)
    except (FileNotFoundError, ValueError, pd.errors.ParserError) as exc:
        logger.error("EDA failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
