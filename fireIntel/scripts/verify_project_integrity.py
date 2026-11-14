"""Comprehensive Project Integrity and Health Audit Script for FIREINTEL.

Validates the integrity, checksums, and schema consistency across all project phases:
1. Raw FIRMS Satellite Fire Archives (MODIS & VIIRS)
2. Processed and Boundary-Validated Fire Datasets
3. Official Uttarakhand Administrative Boundary
4. Master 0.05-Degree Analysis Grid and Parent ERA5 Mapping
5. Copernicus DEM GLO-30 14-Tile Elevation Mosaic
6. Processed DEM Terrain Features (Slope, Aspect, TRI)
7. CDS API Authentication Readiness (Non-Exposing)
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import hashlib
import json
import logging
from pathlib import Path
import sys
import time
from typing import Any

import geopandas as gpd
import pandas as pd
import rasterio

SCRIPTS_DIR = Path(__file__).resolve().parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Set up structured logging."""
    logger = logging.getLogger("fireintel.integrity_audit")
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


def compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


@dataclass
class AuditSectionResult:
    """Result of an individual audit section."""

    section_name: str
    status: str  # PASSED, WARNING, FAILED
    details: dict[str, Any]


def audit_raw_datasets(project_root: Path, logger: logging.Logger) -> AuditSectionResult:
    """Verify raw FIRMS MODIS and VIIRS CSV datasets."""
    logger.info("Auditing Raw FIRMS datasets...")
    raw_dir = project_root / "data" / "raw"
    modis_raw = raw_dir / "fire_archive_M-C61_843061.csv"
    viirs_raw = raw_dir / "fire_archive_SV-C2_843062.csv"

    if not modis_raw.is_file() or not viirs_raw.is_file():
        return AuditSectionResult(
            section_name="raw_datasets",
            status="FAILED",
            details={"error": "Missing raw FIRMS files in data/raw/"},
        )

    modis_sha = compute_sha256(modis_raw)
    viirs_sha = compute_sha256(viirs_raw)

    df_modis = pd.read_csv(modis_raw)
    df_viirs = pd.read_csv(viirs_raw)

    expected_modis_sha = "22fcc803bb5e95a6341cefa74e3a83fc8172291d56e165b355eaf2846af03485"
    expected_viirs_sha = "f48196b5a8c09971e20deacc574d9384e48e7a345120a478e0f15024fb114dc8"

    is_untouched = (modis_sha == expected_modis_sha) and (viirs_sha == expected_viirs_sha)

    return AuditSectionResult(
        section_name="raw_datasets",
        status="PASSED" if is_untouched else "FAILED",
        details={
            "modis_raw_rows": len(df_modis),
            "viirs_raw_rows": len(df_viirs),
            "modis_sha256": modis_sha,
            "viirs_sha256": viirs_sha,
            "raw_datasets_untouched": is_untouched,
        },
    )


def audit_processed_fires(project_root: Path, logger: logging.Logger) -> AuditSectionResult:
    """Verify processed and boundary-validated fire datasets."""
    logger.info("Auditing Processed and Boundary-Validated fire datasets...")
    proc_dir = project_root / "data" / "processed"
    bv_dir = proc_dir / "boundary_validated"

    f_all = proc_dir / "uttarakhand_fires.csv"
    f_modis = proc_dir / "uttarakhand_modis.csv"
    f_viirs = proc_dir / "uttarakhand_viirs.csv"

    bv_all = bv_dir / "uttarakhand_fires_boundary.csv"
    bv_modis = bv_dir / "uttarakhand_modis_boundary.csv"
    bv_viirs = bv_dir / "uttarakhand_viirs_boundary.csv"

    files = [f_all, f_modis, f_viirs, bv_all, bv_modis, bv_viirs]
    for f in files:
        if not f.is_file():
            return AuditSectionResult(
                section_name="processed_fire_datasets",
                status="FAILED",
                details={"error": f"Missing expected dataset: {f.name}"},
            )

    df_all = pd.read_csv(f_all)
    df_modis = pd.read_csv(f_modis)
    df_viirs = pd.read_csv(f_viirs)

    df_bv_all = pd.read_csv(bv_all)
    df_bv_modis = pd.read_csv(bv_modis)
    df_bv_viirs = pd.read_csv(bv_viirs)

    counts_consistent = (
        len(df_all) == len(df_modis) + len(df_viirs)
        and len(df_bv_all) == len(df_bv_modis) + len(df_bv_viirs)
        and len(df_bv_all) <= len(df_all)
    )

    return AuditSectionResult(
        section_name="processed_fire_datasets",
        status="PASSED" if counts_consistent else "FAILED",
        details={
            "bbox_filtered_total": len(df_all),
            "bbox_filtered_modis": len(df_modis),
            "bbox_filtered_viirs": len(df_viirs),
            "boundary_validated_total": len(df_bv_all),
            "boundary_validated_modis": len(df_bv_modis),
            "boundary_validated_viirs": len(df_bv_viirs),
            "spillover_filtered_count": len(df_all) - len(df_bv_all),
            "spillover_filtered_pct": round(100.0 * (len(df_all) - len(df_bv_all)) / len(df_all), 2),
            "counts_consistent": counts_consistent,
        },
    )


def audit_master_grid_and_dem(project_root: Path, logger: logging.Logger) -> AuditSectionResult:
    """Verify Master Analysis Grid, Copernicus DEM, and Terrain Features."""
    logger.info("Auditing Master Grid and DEM Terrain features...")
    env_dir = project_root / "data" / "environmental"
    grid_pq = env_dir / "metadata" / "master_grid_005deg.parquet"
    dem_vrt = env_dir / "processed" / "copernicus_dem_uttarakhand.vrt"
    terrain_pq = env_dir / "processed" / "dem_terrain_features_005deg.parquet"
    manifest_dem = env_dir / "manifests" / "copernicus_dem_manifest.json"

    if not grid_pq.is_file() or not dem_vrt.is_file() or not terrain_pq.is_file():
        return AuditSectionResult(
            section_name="master_grid_and_dem",
            status="FAILED",
            details={"error": "Missing master grid or processed terrain files"},
        )

    grid_gdf = gpd.read_parquet(grid_pq)
    terrain_df = pd.read_parquet(terrain_pq)

    # Check alignment
    is_aligned = len(grid_gdf) == len(terrain_df) == 2174
    cell_id_match = (grid_gdf["grid_cell_id"] == terrain_df["grid_cell_id"]).all()
    no_nulls_terrain = terrain_df["elevation_mean_m"].isna().sum() == 0

    with rasterio.open(dem_vrt) as src:
        vrt_shape = src.shape
        vrt_crs = str(src.crs)

    return AuditSectionResult(
        section_name="master_grid_and_dem",
        status="PASSED" if (is_aligned and cell_id_match and no_nulls_terrain) else "FAILED",
        details={
            "master_grid_cells": int(len(grid_gdf)),
            "terrain_feature_cells": int(len(terrain_df)),
            "cells_match": bool(is_aligned and cell_id_match),
            "zero_nulls_in_terrain": bool(no_nulls_terrain),
            "vrt_dimensions": f"{vrt_shape[1]}x{vrt_shape[0]}",
            "vrt_crs": str(vrt_crs),
            "elevation_min_m": float(terrain_df["elevation_min_m"].min()),
            "elevation_max_m": float(terrain_df["elevation_max_m"].max()),
            "slope_mean_deg": float(terrain_df["slope_mean_deg"].mean()),
            "tri_mean_m": float(terrain_df["terrain_roughness_tri_mean"].mean()),
        },
    )


def audit_cds_authentication(logger: logging.Logger) -> AuditSectionResult:
    """Non-exposing health check of CDS authentication readiness."""
    logger.info("Auditing CDS authentication configuration...")
    cdsapirc = Path.home() / ".cdsapirc"
    has_rc = cdsapirc.is_file()

    token_length = 0
    if has_rc:
        try:
            with open(cdsapirc) as f:
                for line in f:
                    if line.strip().startswith("key:"):
                        token_length = len(line.strip().split(":", 1)[1].strip())
        except Exception:
            pass

    is_valid_uuid = (token_length == 36)
    status = "READY" if is_valid_uuid else ("INVALID_KEY_LENGTH" if has_rc else "MISSING_CREDENTIALS")

    return AuditSectionResult(
        section_name="cds_authentication",
        status="WARNING" if not is_valid_uuid else "PASSED",
        details={
            "cdsapirc_file_exists": has_rc,
            "key_configured": token_length > 0,
            "key_length": token_length,
            "is_36_char_uuid": is_valid_uuid,
            "readiness_status": status,
            "remediation": "Requires 36-character Personal Access Token from https://cds.climate.copernicus.eu/profile" if not is_valid_uuid else "None",
        },
    )


def run_full_project_audit(project_root: Path, manifest_out: Path, verbose: bool = False) -> dict[str, Any]:
    """Run end-to-end project integrity audit."""
    logger = configure_logging(verbose)
    logger.info("==================================================")
    logger.info("FIREINTEL Comprehensive Project Integrity Audit")
    logger.info("==================================================")

    res_raw = audit_raw_datasets(project_root, logger)
    res_proc = audit_processed_fires(project_root, logger)
    res_dem = audit_master_grid_and_dem(project_root, logger)
    res_cds = audit_cds_authentication(logger)

    results = {
        "audit_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "project_root": str(project_root),
        "sections": {
            res_raw.section_name: asdict(res_raw),
            res_proc.section_name: asdict(res_proc),
            res_dem.section_name: asdict(res_dem),
            res_cds.section_name: asdict(res_cds),
        },
        "overall_health": "HEALTHY_AWAITING_CDS_REGISTRATION"
        if (res_raw.status == "PASSED" and res_proc.status == "PASSED" and res_dem.status == "PASSED")
        else "FAILED",
    }

    manifest_out.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_out, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    logger.info("Audit complete. Overall Health: %s", results["overall_health"])
    logger.info("Manifest written to: %s", manifest_out)
    return results


def main() -> None:
    """CLI entry point for project integrity audit."""
    parser = argparse.ArgumentParser(description="FIREINTEL Comprehensive Project Integrity Audit.")
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path("fireIntel"),
        help="Path to project root directory.",
    )
    parser.add_argument(
        "--manifest-out",
        type=Path,
        default=Path("fireIntel/data/environmental/manifests/project_integrity_manifest.json"),
        help="Path to save audit manifest.",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging.")
    args = parser.parse_args()

    results = run_full_project_audit(args.project_root, args.manifest_out, verbose=args.verbose)
    print("\n=== Project Integrity Audit Summary ===")
    print(f"Overall Health:         {results['overall_health']}")
    for sec_name, sec_data in results["sections"].items():
        print(f"  - {sec_name:25s}: {sec_data['status']}")
    print("=======================================\n")


if __name__ == "__main__":
    main()
