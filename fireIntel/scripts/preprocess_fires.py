"""Preprocess NASA FIRMS MODIS and VIIRS fire detections for Uttarakhand."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import logging
from pathlib import Path
import sys

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
PROCESSED_DATA_DIR = PROJECT_ROOT / "data" / "processed"

# Default Uttarakhand bounding box (decimal degrees, inclusive).
MIN_LAT = 28.72
MAX_LAT = 31.46
MIN_LON = 77.57
MAX_LON = 81.03

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
)


@dataclass(frozen=True)
class BoundingBox:
    """Geographic bounding box in decimal degrees (inclusive)."""

    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

    def validate(self) -> None:
        """Verify bounding box coordinates are physically valid and ordered."""
        if not (-90.0 <= self.min_lat <= self.max_lat <= 90.0):
            raise ValueError(
                f"Invalid latitude bounds: [{self.min_lat}, {self.max_lat}]"
            )
        if not (-180.0 <= self.min_lon <= self.max_lon <= 180.0):
            raise ValueError(
                f"Invalid longitude bounds: [{self.min_lon}, {self.max_lon}]"
            )


@dataclass(frozen=True)
class SensorSource:
    """Configuration mapping a normalized sensor label to raw and processed paths."""

    name: str
    raw_path: Path
    output_filename: str


SENSOR_SOURCES: tuple[SensorSource, ...] = (
    SensorSource(
        name="MODIS",
        raw_path=RAW_DATA_DIR / "fire_archive_M-C61_843061.csv",
        output_filename="uttarakhand_modis.csv",
    ),
    SensorSource(
        name="VIIRS",
        raw_path=RAW_DATA_DIR / "fire_archive_SV-C2_843062.csv",
        output_filename="uttarakhand_viirs.csv",
    ),
)

COMBINED_OUTPUT_FILENAME = "uttarakhand_fires.csv"


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Configure console logger for preprocessing progress and statistics."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    return logging.getLogger("fireintel.preprocess")


def load_raw_firms_csv(csv_path: Path) -> pd.DataFrame:
    """Load a raw FIRMS CSV read-only while preserving acq_time, confidence, and version."""
    if not csv_path.is_file():
        raise FileNotFoundError(f"Raw FIRMS file not found: {csv_path}")

    # Preserve acq_time leading zeros, original confidence tokens, and version strings.
    df = pd.read_csv(
        csv_path,
        dtype={"acq_time": str, "confidence": str, "version": str},
    )

    if df.empty:
        raise ValueError(f"FIRMS CSV contains no rows: {csv_path}")

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"{csv_path.name} is missing required columns: {missing_cols}")

    if df["acq_time"].isna().any():
        raise ValueError(f"{csv_path.name} contains null values in acq_time")

    df["acq_time"] = df["acq_time"].str.strip().str.zfill(4)
    if not df["acq_time"].str.fullmatch(r"\d{4}").all():
        raise ValueError(f"{csv_path.name} contains invalid HHMM acq_time values")

    return df


def add_sensor_column(df: pd.DataFrame, sensor_name: str) -> pd.DataFrame:
    """Return a copy tagged with the normalized sensor name ('MODIS' or 'VIIRS')."""
    enriched = df.copy()
    enriched["sensor"] = sensor_name
    return enriched


def add_acq_datetime(df: pd.DataFrame) -> pd.DataFrame:
    """Build a UTC-aware acq_datetime column from acq_date and zero-padded acq_time."""
    enriched = df.copy()
    timestamp_str = (
        enriched["acq_date"].astype(str).str.strip()
        + " "
        + enriched["acq_time"].astype(str).str.strip().str.zfill(4)
    )
    enriched["acq_datetime"] = pd.to_datetime(
        timestamp_str,
        format="%Y-%m-%d %H%M",
        utc=True,
        errors="raise",
    )
    if enriched["acq_datetime"].isna().any():
        raise ValueError("Failed to parse one or more acq_datetime values")
    return enriched


def filter_by_bbox(df: pd.DataFrame, bbox: BoundingBox) -> pd.DataFrame:
    """Filter observations to those inside the inclusive Uttarakhand bounding box."""
    mask = (
        df["latitude"].between(bbox.min_lat, bbox.max_lat, inclusive="both")
        & df["longitude"].between(bbox.min_lon, bbox.max_lon, inclusive="both")
    )
    return df.loc[mask].copy()


def _summarize_confidence(confidence: pd.Series) -> str:
    """Format confidence distribution according to sensor scale without equating scales."""
    numeric_vals = pd.to_numeric(confidence, errors="coerce")
    if numeric_vals.notna().all():
        return (
            f"numeric (0-100 scale): min={int(numeric_vals.min())}, "
            f"median={numeric_vals.median():.1f}, max={int(numeric_vals.max())}"
        )
    counts = confidence.value_counts(dropna=False).to_dict()
    return f"categorical (native scale): {counts}"


def log_sensor_statistics(
    logger: logging.Logger,
    source: SensorSource,
    raw_df: pd.DataFrame,
    filtered_df: pd.DataFrame,
    bbox: BoundingBox,
) -> None:
    """Log detailed pre- and post-filtering statistics for a single sensor."""
    raw_count = len(raw_df)
    kept_count = len(filtered_df)
    excluded_count = raw_count - kept_count
    kept_pct = (kept_count / raw_count * 100.0) if raw_count else 0.0
    total_nulls = int(raw_df.isna().sum().sum())

    logger.info("=== Sensor Report: %s (%s) ===", source.name, source.raw_path.name)
    logger.info("Columns (%d): %s", len(raw_df.columns), list(raw_df.columns))
    logger.info(
        "Rows: raw=%d | filtered=%d (%.2f%% kept) | excluded=%d | raw_null_cells=%d",
        raw_count,
        kept_count,
        kept_pct,
        excluded_count,
        total_nulls,
    )
    logger.info(
        "Raw bounds: lat [%.5f, %.5f], lon [%.5f, %.5f]",
        raw_df["latitude"].min(),
        raw_df["latitude"].max(),
        raw_df["longitude"].min(),
        raw_df["longitude"].max(),
    )

    if filtered_df.empty:
        logger.warning(
            "No %s records remain inside bbox lat [%.4f, %.4f], lon [%.4f, %.4f]",
            source.name,
            bbox.min_lat,
            bbox.max_lat,
            bbox.min_lon,
            bbox.max_lon,
        )
        return

    logger.info(
        "Filtered bounds: lat [%.5f, %.5f], lon [%.5f, %.5f]",
        filtered_df["latitude"].min(),
        filtered_df["latitude"].max(),
        filtered_df["longitude"].min(),
        filtered_df["longitude"].max(),
    )
    logger.info(
        "UTC acq_datetime range: %s -> %s",
        filtered_df["acq_datetime"].min(),
        filtered_df["acq_datetime"].max(),
    )
    logger.info(
        "Satellites: %s | Instruments: %s",
        filtered_df["satellite"].value_counts().to_dict(),
        filtered_df["instrument"].value_counts().to_dict(),
    )
    logger.info(
        "Day/Night: %s | Type: %s",
        filtered_df["daynight"].value_counts().to_dict(),
        filtered_df["type"].value_counts().to_dict(),
    )
    logger.info(
        "Confidence (%s): %s",
        source.name,
        _summarize_confidence(filtered_df["confidence"]),
    )
    logger.info(
        "Brightness (K): min=%.2f, median=%.2f, max=%.2f | "
        "FRP (MW): min=%.2f, median=%.2f, max=%.2f",
        filtered_df["brightness"].min(),
        filtered_df["brightness"].median(),
        filtered_df["brightness"].max(),
        filtered_df["frp"].min(),
        filtered_df["frp"].median(),
        filtered_df["frp"].max(),
    )


def combine_datasets(
    sensor_frames: list[pd.DataFrame],
    original_columns: list[str],
) -> pd.DataFrame:
    """Combine filtered sensor datasets while preserving original columns plus new fields."""
    if not sensor_frames:
        raise ValueError("No sensor frames provided for combination")

    ordered_columns = [*original_columns, "sensor", "acq_datetime"]
    combined = pd.concat(sensor_frames, ignore_index=True)
    combined = combined[ordered_columns]
    return combined.sort_values("acq_datetime", kind="mergesort").reset_index(drop=True)


def save_processed_csv(
    df: pd.DataFrame, output_path: Path, logger: logging.Logger
) -> None:
    """Write a processed DataFrame to CSV without index."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info("Saved %d rows to %s", len(df), output_path)


def run_pipeline(
    sources: tuple[SensorSource, ...] = SENSOR_SOURCES,
    processed_dir: Path = PROCESSED_DATA_DIR,
    bbox: BoundingBox | None = None,
    logger: logging.Logger | None = None,
) -> dict[str, pd.DataFrame]:
    """Run the full preprocessing pipeline and return individual and combined DataFrames."""
    log = logger or logging.getLogger("fireintel.preprocess")
    active_bbox = bbox or BoundingBox(
        min_lat=MIN_LAT,
        max_lat=MAX_LAT,
        min_lon=MIN_LON,
        max_lon=MAX_LON,
    )
    active_bbox.validate()

    log.info(
        "Starting preprocessing with Uttarakhand bbox: "
        "lat [%.4f, %.4f], lon [%.4f, %.4f]",
        active_bbox.min_lat,
        active_bbox.max_lat,
        active_bbox.min_lon,
        active_bbox.max_lon,
    )

    processed_by_sensor: dict[str, pd.DataFrame] = {}
    original_columns: list[str] | None = None

    for source in sources:
        raw_df = load_raw_firms_csv(source.raw_path)
        if original_columns is None:
            original_columns = list(raw_df.columns)
        elif list(raw_df.columns) != original_columns:
            raise ValueError(
                f"Column schema mismatch in {source.raw_path.name}: "
                f"expected {original_columns}, got {list(raw_df.columns)}"
            )

        enriched_df = add_sensor_column(raw_df, source.name)
        enriched_df = add_acq_datetime(enriched_df)
        filtered_df = (
            filter_by_bbox(enriched_df, active_bbox)
            .sort_values("acq_datetime", kind="mergesort")
            .reset_index(drop=True)
        )

        log_sensor_statistics(log, source, raw_df, filtered_df, active_bbox)
        save_processed_csv(filtered_df, processed_dir / source.output_filename, log)
        processed_by_sensor[source.name] = filtered_df

    assert original_columns is not None
    combined_df = combine_datasets(list(processed_by_sensor.values()), original_columns)
    log.info("=== Combined Dataset Report ===")
    log.info(
        "Total rows: %d | Columns (%d): %s",
        len(combined_df),
        len(combined_df.columns),
        list(combined_df.columns),
    )
    log.info("Counts by sensor: %s", combined_df["sensor"].value_counts().to_dict())
    log.info(
        "UTC acq_datetime range: %s -> %s",
        combined_df["acq_datetime"].min(),
        combined_df["acq_datetime"].max(),
    )
    save_processed_csv(combined_df, processed_dir / COMBINED_OUTPUT_FILENAME, log)

    return {**processed_by_sensor, "COMBINED": combined_df}


def parse_args() -> argparse.Namespace:
    """Parse optional CLI configuration overrides."""
    parser = argparse.ArgumentParser(
        description="Preprocess NASA FIRMS MODIS and VIIRS fire detections for Uttarakhand."
    )
    parser.add_argument("--min-lat", type=float, default=MIN_LAT)
    parser.add_argument("--max-lat", type=float, default=MAX_LAT)
    parser.add_argument("--min-lon", type=float, default=MIN_LON)
    parser.add_argument("--max-lon", type=float, default=MAX_LON)
    parser.add_argument(
        "--processed-dir",
        type=Path,
        default=PROCESSED_DATA_DIR,
        help="Directory where processed CSV files will be written.",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    return parser.parse_args()


def main() -> None:
    """CLI entry point with structured error handling."""
    args = parse_args()
    logger = configure_logging(verbose=args.verbose)
    bbox = BoundingBox(
        min_lat=args.min_lat,
        max_lat=args.max_lat,
        min_lon=args.min_lon,
        max_lon=args.max_lon,
    )

    try:
        run_pipeline(processed_dir=args.processed_dir, bbox=bbox, logger=logger)
    except (FileNotFoundError, ValueError, pd.errors.ParserError) as exc:
        logger.error("Preprocessing failed: %s", exc)
        sys.exit(1)



if __name__ == "__main__":
    main()
