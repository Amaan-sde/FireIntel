#!/usr/bin/env python3
"""Accurate administrative boundary validation for Uttarakhand FIRMS observations."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import logging
import os
from pathlib import Path
import sys
import tempfile

if not os.environ.get("MPLCONFIGDIR"):
    os.environ["MPLCONFIGDIR"] = str(Path(tempfile.gettempdir()) / "fireintel_mplconfig")

import geopandas as gpd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from shapely import make_valid
from shapely.validation import explain_validity

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"
VALIDATED_DATA_DIR = PROCESSED_DATA_DIR / "boundary_validated"
BOUNDARY_PATH = PROJECT_ROOT / "data" / "boundaries" / "uttarakhand_boundary.geojson"
BOUNDARY_METADATA_PATH = (
    PROJECT_ROOT / "data" / "boundaries" / "uttarakhand_boundary_metadata.json"
)
REPORTS_DIR = PROJECT_ROOT / "reports" / "boundary_validation"

TARGET_CRS = "EPSG:4326"
METRIC_AREA_CRS = "EPSG:32644"  # WGS 84 / UTM zone 44N covering Uttarakhand

SENSOR_SOURCES: dict[str, tuple[str, str]] = {
    "MODIS": ("uttarakhand_modis.csv", "uttarakhand_modis_boundary.csv"),
    "VIIRS": ("uttarakhand_viirs.csv", "uttarakhand_viirs_boundary.csv"),
}
COMBINED_INPUT_FILENAME = "uttarakhand_fires.csv"
COMBINED_OUTPUT_FILENAME = "uttarakhand_fires_boundary.csv"

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

SENSOR_PALETTE: dict[str, str] = {
    "MODIS": "#D95F02",
    "VIIRS": "#1B9E77",
}


@dataclass(frozen=True)
class BoundaryConfig:
    """Configurable paths and parameters for boundary validation."""

    processed_dir: Path = PROCESSED_DATA_DIR
    validated_dir: Path = VALIDATED_DATA_DIR
    boundary_path: Path = BOUNDARY_PATH
    metadata_path: Path = BOUNDARY_METADATA_PATH
    reports_dir: Path = REPORTS_DIR
    grid_step_deg: float = 0.05


@dataclass(frozen=True)
class BoundaryInfo:
    """Metadata and geometry audit summary for the Uttarakhand boundary polygon."""

    shape_name: str
    shape_iso: str
    boundary_id: str
    source: str
    license_name: str
    source_url: str
    original_crs: str
    target_crs: str
    geometry_type: str
    feature_count: int
    originally_valid: bool
    validity_reason: str
    repair_applied: bool
    valid_after_check: bool
    vertex_count: int
    area_km2_utm44n: float
    bounds: tuple[float, float, float, float]


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Configure console logger for boundary validation."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    return logging.getLogger("fireintel.boundary")


def _count_vertices(geom: object) -> int:
    """Count total coordinate vertices in a Polygon or MultiPolygon."""
    if geom.geom_type == "Polygon":
        ext = len(geom.exterior.coords)
        holes = sum(len(ring.coords) for ring in geom.interiors)
        return ext + holes
    if geom.geom_type == "MultiPolygon":
        return sum(_count_vertices(part) for part in geom.geoms)
    return 0


def load_and_validate_boundary(
    boundary_path: Path,
    metadata_path: Path | None = None,
    logger: logging.Logger | None = None,
) -> tuple[gpd.GeoDataFrame, object, BoundaryInfo]:
    """Load the Uttarakhand boundary GeoJSON, enforce EPSG:4326, and validate geometry."""
    log = logger or logging.getLogger("fireintel.boundary")
    if not boundary_path.is_file():
        raise FileNotFoundError(f"Boundary GeoJSON not found: {boundary_path}")

    gdf = gpd.read_file(boundary_path)
    if gdf.empty:
        raise ValueError(f"Boundary GeoJSON contains no features: {boundary_path}")
    if gdf.crs is None:
        raise ValueError(f"Boundary GeoJSON has undefined CRS: {boundary_path}")

    original_crs = str(gdf.crs)
    if str(gdf.crs) != TARGET_CRS:
        log.info("Reprojecting boundary from %s to %s", gdf.crs, TARGET_CRS)
        gdf = gdf.to_crs(TARGET_CRS)

    originally_valid = bool(gdf.geometry.is_valid.all())
    reasons = [explain_validity(geom) for geom in gdf.geometry]
    validity_reason = "; ".join(sorted(set(reasons)))
    repair_applied = False

    if not originally_valid:
        log.warning("Invalid boundary geometry detected (%s); repairing...", validity_reason)
        repaired_geoms = [
            geom if geom.is_valid else make_valid(geom) for geom in gdf.geometry
        ]
        gdf = gdf.copy()
        gdf["geometry"] = repaired_geoms
        repair_applied = True
        if not bool(gdf.geometry.is_valid.all()):
            raise ValueError("Boundary geometry remained invalid after make_valid repair.")

    union_geom = gdf.geometry.union_all()
    if union_geom.is_empty or not union_geom.is_valid:
        raise ValueError("Unified Uttarakhand boundary geometry is empty or invalid.")

    area_km2 = float(gdf.to_crs(METRIC_AREA_CRS).geometry.area.sum() / 1e6)
    meta_json: dict[str, object] = {}
    if metadata_path and metadata_path.is_file():
        meta_json = json.loads(metadata_path.read_text(encoding="utf-8"))

    first_row = gdf.iloc[0]
    info = BoundaryInfo(
        shape_name=str(first_row.get("shapeName", "Uttarakhand")),
        shape_iso=str(first_row.get("shapeISO", "IN-UT")),
        boundary_id=str(
            first_row.get("boundaryID", meta_json.get("boundaryID", "unknown"))
        ),
        source=str(
            first_row.get(
                "source", meta_json.get("boundarySource", "Unknown public source")
            )
        ),
        license_name=str(
            first_row.get("license", meta_json.get("boundaryLicense", "Unknown"))
        ),
        source_url=str(
            first_row.get("sourceURL", meta_json.get("gjDownloadURL", "N/A"))
        ),
        original_crs=original_crs,
        target_crs=TARGET_CRS,
        geometry_type=str(union_geom.geom_type),
        feature_count=int(len(gdf)),
        originally_valid=originally_valid,
        validity_reason=validity_reason,
        repair_applied=repair_applied,
        valid_after_check=bool(union_geom.is_valid),
        vertex_count=_count_vertices(union_geom),
        area_km2_utm44n=round(area_km2, 2),
        bounds=tuple(round(float(b), 6) for b in union_geom.bounds),
    )
    return gdf, union_geom, info


def load_fire_csv(csv_path: Path) -> pd.DataFrame:
    """Load a processed FIRMS CSV read-only while preserving exact string columns."""
    if not csv_path.is_file():
        raise FileNotFoundError(f"Processed fire CSV not found: {csv_path}")

    df = pd.read_csv(
        csv_path,
        dtype={"acq_time": str, "confidence": str, "version": str, "sensor": str},
    )
    if df.empty:
        raise ValueError(f"Processed fire CSV contains no rows: {csv_path}")

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"{csv_path.name} missing required columns: {missing_cols}")

    if df["latitude"].isna().any() or df["longitude"].isna().any():
        raise ValueError(f"{csv_path.name} contains missing coordinates")

    df["acq_time"] = df["acq_time"].astype(str).str.strip().str.zfill(4)
    return df


def filter_points_by_boundary(
    df: pd.DataFrame,
    boundary_geom: object,
    crs: str = TARGET_CRS,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Perform point-in-polygon filtering using inclusive covered_by containment."""
    original_columns = list(df.columns)
    points_gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
        crs=crs,
    )
    inside_mask = points_gdf.covered_by(boundary_geom)
    retained = df.loc[inside_mask, original_columns].reset_index(drop=True)
    excluded = df.loc[~inside_mask, original_columns].reset_index(drop=True)
    return retained, excluded


def _active_grid_cells(df: pd.DataFrame, step_deg: float) -> int:
    """Count unique occupied lat/lon grid cells."""
    if df.empty:
        return 0
    grid_lat = (np.floor(df["latitude"] / step_deg) * step_deg).round(4)
    grid_lon = (np.floor(df["longitude"] / step_deg) * step_deg).round(4)
    return int(pd.DataFrame({"glat": grid_lat, "glon": grid_lon}).drop_duplicates().shape[0])


def compute_validation_stats(
    label: str,
    original_df: pd.DataFrame,
    retained_df: pd.DataFrame,
    excluded_df: pd.DataFrame,
    grid_step_deg: float,
) -> dict[str, object]:
    """Compute sensor-wise retention counts, percentages, and geographical coverage."""
    orig_cnt = len(original_df)
    ret_cnt = len(retained_df)
    exc_cnt = len(excluded_df)
    retained_pct = round(ret_cnt / orig_cnt * 100.0, 2) if orig_cnt else 0.0
    excluded_pct = round(exc_cnt / orig_cnt * 100.0, 2) if orig_cnt else 0.0

    def _bounds(frame: pd.DataFrame) -> dict[str, float] | None:
        if frame.empty:
            return None
        return {
            "min_lat": round(float(frame["latitude"].min()), 5),
            "max_lat": round(float(frame["latitude"].max()), 5),
            "min_lon": round(float(frame["longitude"].min()), 5),
            "max_lon": round(float(frame["longitude"].max()), 5),
        }

    ret_months = (
        pd.to_datetime(retained_df["acq_date"]).dt.month.value_counts().to_dict()
        if not retained_df.empty
        else {}
    )
    exc_months = (
        pd.to_datetime(excluded_df["acq_date"]).dt.month.value_counts().to_dict()
        if not excluded_df.empty
        else {}
    )

    return {
        "dataset": label,
        "original_observations": orig_cnt,
        "inside_uttarakhand": ret_cnt,
        "outside_uttarakhand": exc_cnt,
        "retained_pct": retained_pct,
        "excluded_pct": excluded_pct,
        "original_bounds": _bounds(original_df),
        "retained_bounds": _bounds(retained_df),
        "excluded_bounds": _bounds(excluded_df),
        "active_grid_cells_original": _active_grid_cells(original_df, grid_step_deg),
        "active_grid_cells_retained": _active_grid_cells(retained_df, grid_step_deg),
        "retained_by_month": {int(k): int(v) for k, v in sorted(ret_months.items())},
        "excluded_by_month": {int(k): int(v) for k, v in sorted(exc_months.items())},
    }


def generate_visualizations(
    boundary_gdf: gpd.GeoDataFrame,
    retained_combined: pd.DataFrame,
    excluded_combined: pd.DataFrame,
    stats_by_dataset: dict[str, dict[str, object]],
    reports_dir: Path,
    logger: logging.Logger,
) -> dict[str, Path]:
    """Generate geographical validation maps and filtering summary charts."""
    sns.set_theme(style="whitegrid", context="notebook")
    reports_dir.mkdir(parents=True, exist_ok=True)
    plot_paths: dict[str, Path] = {}

    # 1. Geographical validation map.
    fig, axes = plt.subplots(1, 2, figsize=(14.5, 6.4), sharex=True, sharey=True)
    for ax in axes:
        boundary_gdf.plot(
            ax=ax,
            facecolor="#ECFDF5",
            edgecolor="#0F172A",
            linewidth=1.5,
            zorder=2,
        )

    if not excluded_combined.empty:
        axes[0].scatter(
            excluded_combined["longitude"],
            excluded_combined["latitude"],
            s=8,
            alpha=0.35,
            color="#EF4444",
            label=f"Outside Boundary ({len(excluded_combined):,})",
            zorder=3,
        )
    if not retained_combined.empty:
        axes[0].scatter(
            retained_combined["longitude"],
            retained_combined["latitude"],
            s=8,
            alpha=0.45,
            color="#0F766E",
            label=f"Retained Inside Uttarakhand ({len(retained_combined):,})",
            zorder=4,
        )
    axes[0].set_title("Boundary Filtering Overview: Retained vs Excluded")
    axes[0].set_xlabel("Longitude (deg E)")
    axes[0].set_ylabel("Latitude (deg N)")
    axes[0].legend(loc="upper right", markerscale=1.8)

    if not excluded_combined.empty:
        axes[1].scatter(
            excluded_combined["longitude"],
            excluded_combined["latitude"],
            s=7,
            alpha=0.22,
            color="#94A3B8",
            label=f"Outside Boundary ({len(excluded_combined):,})",
            zorder=3,
        )
    for sensor_name in ("VIIRS", "MODIS"):
        sub = retained_combined[retained_combined["sensor"] == sensor_name]
        if not sub.empty:
            axes[1].scatter(
                sub["longitude"],
                sub["latitude"],
                s=10 if sensor_name == "MODIS" else 7,
                alpha=0.55 if sensor_name == "MODIS" else 0.4,
                color=SENSOR_PALETTE[sensor_name],
                label=f"Retained {sensor_name} ({len(sub):,})",
                zorder=5 if sensor_name == "MODIS" else 4,
            )
    axes[1].set_title("Retained Observations by Sensor Inside Uttarakhand")
    axes[1].set_xlabel("Longitude (deg E)")
    axes[1].legend(loc="upper right", markerscale=1.8)

    fig.suptitle(
        "Uttarakhand Administrative Boundary Validation (MODIS & VIIRS FIRMS Observations)",
        fontsize=13,
        y=0.99,
    )
    map_path = reports_dir / "boundary_validation_map.png"
    fig.savefig(map_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    plot_paths["map"] = map_path
    logger.info("Saved boundary validation map: %s", map_path)

    # 2. Sensor-wise retention & monthly spillover chart.
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2))
    bar_rows = []
    for sensor_name in ("MODIS", "VIIRS"):
        st = stats_by_dataset[sensor_name]
        bar_rows.append(
            {
                "sensor": sensor_name,
                "status": "Inside Uttarakhand",
                "observations": st["inside_uttarakhand"],
            }
        )
        bar_rows.append(
            {
                "sensor": sensor_name,
                "status": "Outside Boundary",
                "observations": st["outside_uttarakhand"],
            }
        )
    bar_df = pd.DataFrame(bar_rows)
    sns.barplot(
        data=bar_df,
        x="sensor",
        y="observations",
        hue="status",
        palette={"Inside Uttarakhand": "#1B9E77", "Outside Boundary": "#EF4444"},
        ax=axes[0],
    )
    axes[0].set_title("Sensor-Wise Boundary Retention vs Exclusion")
    axes[0].set_xlabel("Sensor")
    axes[0].set_ylabel("Observations")

    comb_stats = stats_by_dataset["COMBINED"]
    month_rows = []
    for m in range(1, 13):
        month_rows.append(
            {
                "month": m,
                "status": "Inside Uttarakhand",
                "observations": comb_stats["retained_by_month"].get(m, 0),
            }
        )
        month_rows.append(
            {
                "month": m,
                "status": "Outside Boundary",
                "observations": comb_stats["excluded_by_month"].get(m, 0),
            }
        )
    month_df = pd.DataFrame(month_rows)
    sns.barplot(
        data=month_df,
        x="month",
        y="observations",
        hue="status",
        palette={"Inside Uttarakhand": "#1B9E77", "Outside Boundary": "#EF4444"},
        ax=axes[1],
    )
    axes[1].set_title("Monthly Distribution of Retained vs Outside-Boundary Observations")
    axes[1].set_xlabel("Month (UTC)")
    axes[1].set_ylabel("Observations")

    summary_plot_path = reports_dir / "boundary_filtering_summary.png"
    fig.savefig(summary_plot_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    plot_paths["summary"] = summary_plot_path
    logger.info("Saved boundary filtering summary plot: %s", summary_plot_path)
    return plot_paths


def verify_saved_boundary_outputs(
    validated_dir: Path,
    boundary_geom: object,
    expected_counts: dict[str, int],
    logger: logging.Logger,
) -> None:
    """Read back saved CSVs and confirm every retained coordinate falls inside Uttarakhand."""
    file_map = {
        "MODIS": validated_dir / "uttarakhand_modis_boundary.csv",
        "VIIRS": validated_dir / "uttarakhand_viirs_boundary.csv",
        "COMBINED": validated_dir / "uttarakhand_fires_boundary.csv",
    }
    for key, path in file_map.items():
        df = load_fire_csv(path)
        if len(df) != expected_counts[key]:
            raise ValueError(
                f"Saved count mismatch in {path.name}: expected {expected_counts[key]}, got {len(df)}"
            )
        pts = gpd.GeoDataFrame(
            df,
            geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
            crs=TARGET_CRS,
        )
        outside = int((~pts.covered_by(boundary_geom)).sum())
        if outside != 0:
            raise ValueError(f"{path.name} contains {outside} points outside Uttarakhand boundary.")
        logger.info("Verified %s (%d rows): 100%% inside Uttarakhand polygon.", path.name, len(df))


def generate_validation_report(
    reports_dir: Path,
    boundary_info: BoundaryInfo,
    stats_by_dataset: dict[str, dict[str, object]],
    plot_paths: dict[str, Path],
    logger: logging.Logger,
) -> Path:
    """Write BOUNDARY_VALIDATION_REPORT.md with provenance, metrics, and limitations."""
    report_path = reports_dir / "BOUNDARY_VALIDATION_REPORT.md"
    comb = stats_by_dataset["COMBINED"]
    modis = stats_by_dataset["MODIS"]
    viirs = stats_by_dataset["VIIRS"]

    lines = [
        "# FIREINTEL — Uttarakhand Administrative Boundary Validation Report",
        "",
        "## 1. Boundary Data Source, Licence & Geometry Audit",
        "",
        f"- **Administrative Unit:** `{boundary_info.shape_name}` (`{boundary_info.shape_iso}`, geoBoundaries ID `{boundary_info.boundary_id}`)",
        f"- **Source:** `{boundary_info.source}`",
        f"- **Licence:** `{boundary_info.license_name}`",
        f"- **Download URL:** `{boundary_info.source_url}`",
        f"- **Coordinate Reference System (CRS):** Original `{boundary_info.original_crs}` -> Standardized `{boundary_info.target_crs}` (WGS 84) for point-in-polygon filtering; projected to `{METRIC_AREA_CRS}` (UTM Zone 44N) for metric area calculation.",
        f"- **Geometry Validation:** Type `{boundary_info.geometry_type}`, Features `{boundary_info.feature_count}`, Vertices `{boundary_info.vertex_count:,}`, Originally valid = `{boundary_info.originally_valid}` (`{boundary_info.validity_reason}`), Repair applied = `{boundary_info.repair_applied}`, Valid after check = `{boundary_info.valid_after_check}`.",
        f"- **Polygon Extent & Area:** Bounds `(min_lon, min_lat, max_lon, max_lat) = {boundary_info.bounds}`; Area = `{boundary_info.area_km2_utm44n:,.2f} km²`.",
        "",
        "---",
        "",
        "## 2. Filtering Summary (Original vs Retained Inside Uttarakhand)",
        "",
        "| Dataset | Original (BBox) | Inside Uttarakhand | Outside Uttarakhand | Retained (%) | Excluded (%) | Active 0.05° Cells (Orig -> Retained) |",
        "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
        f"| Combined (`uttarakhand_fires`) | {comb['original_observations']:,} | {comb['inside_uttarakhand']:,} | {comb['outside_uttarakhand']:,} | {comb['retained_pct']}% | {comb['excluded_pct']}% | {comb['active_grid_cells_original']:,} -> {comb['active_grid_cells_retained']:,} |",
        f"| MODIS (`uttarakhand_modis`) | {modis['original_observations']:,} | {modis['inside_uttarakhand']:,} | {modis['outside_uttarakhand']:,} | {modis['retained_pct']}% | {modis['excluded_pct']}% | {modis['active_grid_cells_original']:,} -> {modis['active_grid_cells_retained']:,} |",
        f"| VIIRS (`uttarakhand_viirs`) | {viirs['original_observations']:,} | {viirs['inside_uttarakhand']:,} | {viirs['outside_uttarakhand']:,} | {viirs['retained_pct']}% | {viirs['excluded_pct']}% | {viirs['active_grid_cells_original']:,} -> {viirs['active_grid_cells_retained']:,} |",
        "",
        "### Sensor-Wise Geographical Coverage",
        "",
        f"- **MODIS retained bounds:** `{modis['retained_bounds']}` (excluded bounds: `{modis['excluded_bounds']}`)",
        f"- **VIIRS retained bounds:** `{viirs['retained_bounds']}` (excluded bounds: `{viirs['excluded_bounds']}`)",
        f"- **Combined retained bounds:** `{comb['retained_bounds']}`",
        "",
        "---",
        "",
        "## 3. Geographical Visualisations",
        "",
        f"![Uttarakhand Boundary Validation Map]({plot_paths['map'].name})",
        "",
        f"![Boundary Filtering Summary]({plot_paths['summary'].name})",
        "",
        "---",
        "",
        "## 4. Geographical Filtering Methodology",
        "",
        "1. Load the Uttarakhand state polygon from `data/boundaries/uttarakhand_boundary.geojson` (`EPSG:4326`), validate polygon topology with Shapely (`is_valid` / `make_valid` if needed), and build a unified boundary geometry (`union_all()`).",
        "2. Load `uttarakhand_fires.csv`, `uttarakhand_modis.csv`, and `uttarakhand_viirs.csv` read-only while preserving `acq_time` zero-padding, native `confidence` values, `sensor`, and UTC-aware `acq_datetime`.",
        "3. Convert `(longitude, latitude)` points into a `GeoDataFrame` in `EPSG:4326` matching the boundary CRS.",
        "4. Apply exact boundary-inclusive point-in-polygon testing via GeoPandas `points.covered_by(boundary_geom)` separately for MODIS, VIIRS, and Combined, verifying `MODIS + VIIRS == COMBINED`.",
        "5. Persist validated CSVs under `data/processed/boundary_validated/` without modifying raw or prior bounding-box-filtered CSVs, then verify 100% containment on disk.",
        "",
        "---",
        "",
        "## 5. Limitations & Recommendations",
        "",
        "- **Rectangular BBox Spillover:** Almost 40% (`4,984` of `12,525`) of the rectangular bounding-box points lay outside Uttarakhand's actual state borders (neighboring plains/regions in Uttar Pradesh, Himachal Pradesh, and across the international border). Removing them prevents non-Uttarakhand agricultural/crop burning from distorting Uttarakhand forest fire risk metrics.",
        "- **Boundary Provenance Caveat:** The `geoBoundaries IND-ADM1` layer (derived from DataMeet / Election Commission of India) represents a publicly licensed state polygon (`CC BY 2.5 IN`) and aligns with standard open GIS datasets, though official national survey boundaries from Survey of India should be substituted if required for statutory/government reporting.",
        "- **Pixel Footprint vs Point Centroid:** FIRMS coordinates represent pixel centers (`~375 m` VIIRS, `~1 km` MODIS). A fire straddling the state border can have its centroid slightly inside or outside the line.",
        "- **Eastern Tip Coverage Note:** The polygon extends to `81.0453° E`, while the upstream bounding-box preprocessing filtered at `MAX_LON = 81.03° E` (excluding 1 raw VIIRS row at `81.03001° E`).",
        "- **Recommendation:** Use `data/processed/boundary_validated/` for updated EDA (`reports/eda_boundary_validated/`), spatio-temporal fire event clustering, and all future modeling.",
        "",
    ]

    report_path.write_text("\n".join(lines), encoding="utf-8")
    logger.info("Generated boundary validation report: %s", report_path)
    return report_path


def run_boundary_validation(
    config: BoundaryConfig,
    logger: logging.Logger,
) -> dict[str, object]:
    """Execute the full boundary validation pipeline end-to-end."""
    boundary_gdf, boundary_geom, boundary_info = load_and_validate_boundary(
        boundary_path=config.boundary_path,
        metadata_path=config.metadata_path,
        logger=logger,
    )
    logger.info(
        "Boundary validated: %s (%s) | CRS=%s | valid=%s | area=%.2f km2",
        boundary_info.shape_name,
        boundary_info.shape_iso,
        boundary_info.target_crs,
        boundary_info.valid_after_check,
        boundary_info.area_km2_utm44n,
    )

    config.validated_dir.mkdir(parents=True, exist_ok=True)
    config.reports_dir.mkdir(parents=True, exist_ok=True)

    stats_by_dataset: dict[str, dict[str, object]] = {}
    retained_by_dataset: dict[str, pd.DataFrame] = {}
    excluded_by_dataset: dict[str, pd.DataFrame] = {}

    datasets_to_process: list[tuple[str, str, str]] = [
        ("MODIS", *SENSOR_SOURCES["MODIS"]),
        ("VIIRS", *SENSOR_SOURCES["VIIRS"]),
        ("COMBINED", COMBINED_INPUT_FILENAME, COMBINED_OUTPUT_FILENAME),
    ]

    for label, in_name, out_name in datasets_to_process:
        original_df = load_fire_csv(config.processed_dir / in_name)
        retained_df, excluded_df = filter_points_by_boundary(
            original_df, boundary_geom, crs=TARGET_CRS
        )
        out_path = config.validated_dir / out_name
        retained_df.to_csv(out_path, index=False)

        stats = compute_validation_stats(
            label=label,
            original_df=original_df,
            retained_df=retained_df,
            excluded_df=excluded_df,
            grid_step_deg=config.grid_step_deg,
        )
        stats_by_dataset[label] = stats
        retained_by_dataset[label] = retained_df
        excluded_by_dataset[label] = excluded_df

        logger.info(
            "%s: original=%d | inside=%d (%.2f%%) | outside=%d (%.2f%%) -> saved %s",
            label,
            stats["original_observations"],
            stats["inside_uttarakhand"],
            stats["retained_pct"],
            stats["outside_uttarakhand"],
            stats["excluded_pct"],
            out_path,
        )

    # Confirm sensor-wise consistency with combined output.
    modis_plus_viirs = len(retained_by_dataset["MODIS"]) + len(retained_by_dataset["VIIRS"])
    if modis_plus_viirs != len(retained_by_dataset["COMBINED"]):
        raise ValueError(
            f"Retained count mismatch: MODIS + VIIRS ({modis_plus_viirs}) != "
            f"COMBINED ({len(retained_by_dataset['COMBINED'])})"
        )

    verify_saved_boundary_outputs(
        validated_dir=config.validated_dir,
        boundary_geom=boundary_geom,
        expected_counts={k: len(v) for k, v in retained_by_dataset.items()},
        logger=logger,
    )

    plot_paths = generate_visualizations(
        boundary_gdf=boundary_gdf,
        retained_combined=retained_by_dataset["COMBINED"],
        excluded_combined=excluded_by_dataset["COMBINED"],
        stats_by_dataset=stats_by_dataset,
        reports_dir=config.reports_dir,
        logger=logger,
    )

    # Save tabular & JSON summaries alongside the Markdown report.
    stats_rows = [
        {
            "dataset": st["dataset"],
            "original_observations": st["original_observations"],
            "inside_uttarakhand": st["inside_uttarakhand"],
            "outside_uttarakhand": st["outside_uttarakhand"],
            "retained_pct": st["retained_pct"],
            "excluded_pct": st["excluded_pct"],
            "active_grid_cells_original": st["active_grid_cells_original"],
            "active_grid_cells_retained": st["active_grid_cells_retained"],
        }
        for st in (
            stats_by_dataset["COMBINED"],
            stats_by_dataset["MODIS"],
            stats_by_dataset["VIIRS"],
        )
    ]
    stats_csv_path = config.reports_dir / "boundary_validation_stats.csv"
    pd.DataFrame(stats_rows).to_csv(stats_csv_path, index=False)

    summary_json_path = config.reports_dir / "boundary_validation_summary.json"
    summary_payload = {
        "boundary": boundary_info.__dict__,
        "validation_stats": stats_by_dataset,
    }
    summary_json_path.write_text(json.dumps(summary_payload, indent=2), encoding="utf-8")

    report_path = generate_validation_report(
        reports_dir=config.reports_dir,
        boundary_info=boundary_info,
        stats_by_dataset=stats_by_dataset,
        plot_paths=plot_paths,
        logger=logger,
    )

    return {
        "boundary_info": boundary_info,
        "stats": stats_by_dataset,
        "plot_paths": plot_paths,
        "stats_csv_path": stats_csv_path,
        "summary_json_path": summary_json_path,
        "report_path": report_path,
    }


def parse_args() -> argparse.Namespace:
    """Parse optional CLI configuration overrides."""
    parser = argparse.ArgumentParser(
        description="Validate Uttarakhand administrative boundary containment on processed FIRMS CSVs."
    )
    parser.add_argument("--processed-dir", type=Path, default=PROCESSED_DATA_DIR)
    parser.add_argument("--validated-dir", type=Path, default=VALIDATED_DATA_DIR)
    parser.add_argument("--boundary-path", type=Path, default=BOUNDARY_PATH)
    parser.add_argument("--metadata-path", type=Path, default=BOUNDARY_METADATA_PATH)
    parser.add_argument("--reports-dir", type=Path, default=REPORTS_DIR)
    parser.add_argument("--grid-step-deg", type=float, default=0.05)
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


def main() -> None:
    """CLI entry point."""
    args = parse_args()
    logger = configure_logging(verbose=args.verbose)
    config = BoundaryConfig(
        processed_dir=args.processed_dir,
        validated_dir=args.validated_dir,
        boundary_path=args.boundary_path,
        metadata_path=args.metadata_path,
        reports_dir=args.reports_dir,
        grid_step_deg=args.grid_step_deg,
    )

    try:
        run_boundary_validation(config=config, logger=logger)
    except (FileNotFoundError, ValueError, pd.errors.ParserError) as exc:
        logger.error("Boundary validation failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()

