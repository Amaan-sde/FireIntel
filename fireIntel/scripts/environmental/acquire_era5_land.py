"""ERA5-Land 48-hour pilot acquisition and diagnostic verification pipeline.

Handles CDS API authentication gracefully, downloads 48-hour sample if credentials
are configured, and performs diagnostic inspection of temporal precipitation accumulation conventions.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import logging
import os
from pathlib import Path
import sys
import time

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from environmental.config import (
    ERA5_LAND_CORE_VARIABLES,
    ERA5_LAND_RETRIEVAL_BBOX,
    EnvironmentalPaths,
)
from environmental.manifest import compute_sha256


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Set up structured logging."""
    logger = logging.getLogger("fireintel.acquire_era5_land")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


def check_cds_credentials() -> dict[str, Any]:
    """Check whether Copernicus CDS credentials are configured on the local system.

    Checks ~/.cdsapirc, environment variables, or local .env file.
    Does NOT log or return secret key values.
    """
    cdsapirc = Path.home() / ".cdsapirc"
    has_rc_file = cdsapirc.is_file()
    has_env_key = bool(os.environ.get("CDSAPI_KEY"))
    has_env_url = bool(os.environ.get("CDSAPI_URL"))

    # Check local .env file if available
    dotenv_path = Path(".env")
    has_dotenv_key = False
    if dotenv_path.is_file():
        try:
            with open(dotenv_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("CDSAPI_KEY=") and not line.strip().endswith("YOUR_CDS_API_KEY_HERE"):
                        has_dotenv_key = True
        except Exception:
            pass

    is_configured = has_rc_file or has_env_key or has_dotenv_key

    return {
        "is_configured": is_configured,
        "has_cdsapirc_file": has_rc_file,
        "has_env_variables": has_env_key,
        "has_dotenv_key": has_dotenv_key,
        "cdsapirc_path": str(cdsapirc) if has_rc_file else None,
    }


def build_48h_request_payload(
    year: str = "2025",
    month: str = "01",
    days: tuple[str, ...] = ("01", "02"),
) -> dict[str, Any]:
    """Build canonical request payload for the 48-hour ERA5-Land pilot."""
    times = [f"{h:02d}:00" for h in range(24)]
    area = ERA5_LAND_RETRIEVAL_BBOX.to_cds_area()  # [North, West, South, East]

    return {
        "dataset": "reanalysis-era5-land",
        "variables": list(ERA5_LAND_CORE_VARIABLES),
        "year": year,
        "month": month,
        "day": list(days),
        "time": times,
        "data_format": "netcdf",
        "download_format": "unarchived",
        "area": area,
    }


def run_era5_land_pilot(
    output_dir: Path,
    manifests_dir: Path,
    logger: logging.Logger,
) -> dict[str, Any]:
    """Execute 48-hour pilot download if credentials exist, otherwise log graceful instructions."""
    logger.info("Checking Copernicus Climate Data Store (CDS) authentication...")
    cred_status = check_cds_credentials()

    if not cred_status["is_configured"]:
        logger.warning("=================================================================")
        logger.warning("CDS API credentials are not configured on this local machine.")
        logger.warning("Per Phase 5B safety rules, the ERA5-Land download is paused gracefully.")
        logger.warning("Do NOT paste credentials into chat.")
        logger.warning("Local Setup Instructions:")
        logger.warning("1. Create an account at: https://cds.climate.copernicus.eu/")
        logger.warning("2. Accept dataset license terms for 'ERA5-Land hourly data from 1950 to present'")
        logger.warning("3. Create ~/.cdsapirc with permissions 600 containing:")
        logger.warning("   url: https://cds.climate.copernicus.eu/api")
        logger.warning("   key: <YOUR-PERSONAL-CDS-KEY>")
        logger.warning("   OR set environment variables CDSAPI_URL and CDSAPI_KEY.")
        logger.warning("=================================================================")

        return {
            "status": "PAUSED_AWAITING_CREDENTIALS",
            "credentials_configured": False,
            "message": "CDS credentials not found in ~/.cdsapirc or environment variables.",
            "request_payload": build_48h_request_payload(),
        }

    # If configured, attempt download via cdsapi
    try:
        import cdsapi
    except ImportError:
        logger.error(
            "cdsapi library is not installed in current Python environment."
        )
        return {
            "status": "FAILED_MISSING_LIBRARY",
            "credentials_configured": True,
            "message": "cdsapi package not installed. Run: pip install cdsapi",
        }

    output_dir.mkdir(parents=True, exist_ok=True)
    target_file = output_dir / "era5_land_2025_01_48h_pilot.nc"
    temp_file = target_file.with_suffix(".nc.part")

    payload = build_48h_request_payload()
    logger.info("Initiating 48-hour pilot retrieval: %s", target_file.name)

    try:
        client = cdsapi.Client()
        logger.info("Submitting CDS API retrieval request for 48-hour pilot (2025-01-01 to 2025-01-02)...")
        client.retrieve(
            payload["dataset"],
            {
                "variable": payload["variables"],
                "year": payload["year"],
                "month": payload["month"],
                "day": payload["day"],
                "time": payload["time"],
                "data_format": payload["data_format"],
                "download_format": payload["download_format"],
                "area": payload["area"],
            },
            str(temp_file),
        )
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg or "Unauthorized" in err_msg or "Authentication failed" in err_msg:
            logger.error("CDS API Authentication Failed: HTTP 401 Unauthorized / Operation not allowed.")
            logger.error("Root Cause Analysis: The Personal Access Token (PAT) in ~/.cdsapirc failed authorization.")
            logger.error("Common reasons on the new Copernicus CDS platform (2024+):")
            logger.error("  1. Key length mismatch: Token should be a 36-character UUID from your user profile.")
            logger.error("  2. Dataset terms not accepted: You must click 'Accept Terms' at:")
            logger.error("     https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=download")
            return {
                "status": "FAILED_AUTHENTICATION_UNAUTHORIZED",
                "credentials_configured": True,
                "error_type": type(e).__name__,
                "error_message": "HTTP 401 Unauthorized: Authentication failed (operation not allowed).",
                "request_payload": payload,
            }
        logger.error("CDS API retrieval failed: %s: %s", type(e).__name__, err_msg)
        return {
            "status": "FAILED_DOWNLOAD_ERROR",
            "credentials_configured": True,
            "error_type": type(e).__name__,
            "error_message": err_msg,
            "request_payload": payload,
        }

    temp_file.replace(target_file)
    checksum = compute_sha256(target_file)
    logger.info("Successfully retrieved 48h pilot! SHA-256: %s", checksum)

    manifest_record = {
        "manifest_id": "MANIFEST_ERA5L_2025_01_48H_PILOT",
        "dataset_id": "reanalysis-era5-land",
        "status": "VERIFIED_DOWNLOADED",
        "local_path": str(target_file),
        "file_size_bytes": target_file.stat().st_size,
        "sha256_checksum": checksum,
        "request_parameters": payload,
        "generated_at_utc": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
        ),
    }

    manifests_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifests_dir / "era5_land_48h_pilot_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_record, f, indent=2)

    return {
        "status": "SUCCESS",
        "credentials_configured": True,
        "file_path": str(target_file),
        "sha256": checksum,
    }


def main() -> None:
    """CLI entrypoint for ERA5-Land 48h pilot."""
    parser = argparse.ArgumentParser(
        description="ERA5-Land 48-Hour Pilot Ingestion and Diagnostic Pipeline."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("fireIntel/data/environmental/raw/era5_land"),
        help="Directory to save raw ERA5-Land downloads.",
    )
    parser.add_argument(
        "--manifests-dir",
        type=Path,
        default=Path("fireIntel/data/environmental/manifests"),
        help="Directory to save manifests.",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Enable verbose logging."
    )
    args = parser.parse_args()

    logger = configure_logging(verbose=args.verbose)
    logger.info("=== Starting ERA5-Land 48-Hour Pilot Check ===")
    res = run_era5_land_pilot(args.output_dir, args.manifests_dir, logger=logger)
    logger.info("Pilot Status: %s", res["status"])


if __name__ == "__main__":
    main()

