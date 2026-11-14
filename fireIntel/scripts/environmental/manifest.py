"""Download manifest management and file integrity validation for FIREINTEL.

Provides SHA-256 hashing, manifest tracking, missing timestep detection,
and coordinate uniqueness validation.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
from typing import Any
import pandas as pd


def compute_sha256(file_path: Path) -> str:
    """Compute the SHA-256 checksum of a file in streaming chunks (64KB)."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


@dataclass
class DownloadRecord:
    """Record of an individual dataset acquisition file."""

    manifest_id: str
    dataset_id: str
    provider: str
    relative_path: str
    file_size_bytes: int
    sha256_checksum: str
    request_parameters: dict[str, Any]
    status: str  # e.g., 'VERIFIED_OK', 'PENDING', 'FAILED'
    generated_at_utc: str
    notes: str = ""


class ManifestManager:
    """Manages creation, loading, and verification of dataset download manifests."""

    def __init__(self, manifests_dir: Path) -> None:
        self.manifests_dir = manifests_dir
        self.manifests_dir.mkdir(parents=True, exist_ok=True)

    def record_download(self, record: DownloadRecord) -> Path:
        """Save a download manifest record to disk as JSON."""
        manifest_path = self.manifests_dir / f"{record.manifest_id}.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(asdict(record), f, indent=2)
        return manifest_path

    def verify_file(self, file_path: Path, expected_sha256: str) -> bool:
        """Verify that a local file exists and matches its expected SHA-256 checksum."""
        if not file_path.is_file():
            return False
        return compute_sha256(file_path) == expected_sha256


def check_temporal_completeness(
    timestamps: pd.DatetimeIndex | pd.Series,
    expected_start: str,
    expected_end: str,
    expected_freq: str = "1h",
) -> dict[str, Any]:
    """Check for missing or duplicate timesteps across an expected time range.

    Args:
        timestamps: Series or DatetimeIndex of timestamps.
        expected_start: ISO format start timestamp (e.g. '2025-01-01 00:00:00').
        expected_end: ISO format end timestamp (e.g. '2025-12-31 23:00:00').
        expected_freq: Expected frequency string (default: '1h').

    Returns:
        Dictionary with completeness status, expected count, actual count,
        missing count, duplicate count, and list of missing timestamps (truncated).
    """
    ts = pd.to_datetime(timestamps).tz_localize(None)
    expected_range = pd.date_range(
        start=expected_start, end=expected_end, freq=expected_freq
    )

    duplicate_count = int(ts.duplicated().sum())
    ts_unique = ts.drop_duplicates()

    missing = expected_range.difference(ts_unique)
    missing_count = len(missing)

    return {
        "is_complete": missing_count == 0 and duplicate_count == 0,
        "expected_timesteps": len(expected_range),
        "actual_timesteps": len(ts),
        "missing_timesteps_count": missing_count,
        "duplicate_timesteps_count": duplicate_count,
        "missing_sample": [str(t) for t in missing[:10]],
    }

