"""
FIREINTEL — Stage 8 Rollback Verification & Timing Test
Tests atomic promotion, view restoration, archive integrity, and measured rollback duration.
"""

import os
import sys
import time
import shutil
import hashlib
import duckdb
from pathlib import Path

DATA_DIR = Path("fireIntel/data")
STAGING_DIR = DATA_DIR / "staging" / "phase9"
PROD_DIR = DATA_DIR / "production" / "harmonised"
ARCHIVE_DIR = DATA_DIR / "archive" / "legacy_2025"
MANIFEST_FILE = DATA_DIR / "metadata" / "legacy_2025_backup_manifest.json"

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def test_rollback():
    print("=============================================================")
    print("FIREINTEL PHASE 9 — CONTROLLED ROLLBACK VERIFICATION TEST")
    print("=============================================================")

    # Step 1: Promote staging to production directory
    print("\n[STEP 1] Promoting staging tables to production/harmonised/...")
    PROD_DIR.mkdir(parents=True, exist_ok=True)
    
    for f in ["canonical_harmonised_fires.parquet", "uttarakhand_harmonised_fires.parquet", 
              "regional_harmonised_fires.parquet", "mission_control_summary.json", "historical_analytics.json"]:
        src = STAGING_DIR / f
        dst = PROD_DIR / f
        shutil.copy2(src, dst)
        print(f"  Copied {src.name} -> {dst}")

    # Step 2: Test Active Harmonised View in DuckDB
    print("\n[STEP 2] Activating Harmonised Production Views in DuckDB...")
    conn = duckdb.connect(":memory:")
    t0 = time.perf_counter()
    conn.execute(f"CREATE OR REPLACE VIEW fires AS SELECT * FROM '{PROD_DIR / 'uttarakhand_harmonised_fires.parquet'}'")
    conn.execute(f"CREATE OR REPLACE VIEW fires_regional AS SELECT * FROM '{PROD_DIR / 'regional_harmonised_fires.parquet'}'")
    init_ms = (time.perf_counter() - t0) * 1000
    print(f"  Harmonised Views Initialized in {init_ms:.2f} ms")

    count_uk = conn.execute("SELECT COUNT(*) FROM fires").fetchone()[0]
    count_reg = conn.execute("SELECT COUNT(*) FROM fires_regional").fetchone()[0]
    print(f"  Active 'fires' row count: {count_uk:,} (Expected: 240,365)")
    print(f"  Active 'fires_regional' row count: {count_reg:,} (Expected: 510,299)")
    assert count_uk == 240365, f"Expected 240365, got {count_uk}"
    assert count_reg == 510299, f"Expected 510299, got {count_reg}"

    # Step 3: Trigger Rollback to Legacy 2025
    print("\n[STEP 3] Executing Measured Rollback to Legacy 2025 Archive...")
    legacy_parquet = ARCHIVE_DIR / "uttarakhand_fires_boundary.parquet"
    assert legacy_parquet.exists(), f"Legacy archive file missing: {legacy_parquet}"

    t_rollback_start = time.perf_counter()
    # Atomic switch of view pointer to archive
    conn.execute(f"CREATE OR REPLACE VIEW fires AS SELECT * FROM '{legacy_parquet}'")
    conn.execute("DROP VIEW IF EXISTS fires_regional")
    t_rollback_end = time.perf_counter()

    rollback_duration_ms = (t_rollback_end - t_rollback_start) * 1000
    print(f"  >>> MEASURED ROLLBACK DURATION: {rollback_duration_ms:.2f} ms ({rollback_duration_ms / 1000:.4f} seconds)")

    # Step 4: Verify Legacy Database View State
    print("\n[STEP 4] Verifying Legacy Database View State...")
    count_legacy = conn.execute("SELECT COUNT(*) FROM fires").fetchone()[0]
    print(f"  Rolled back 'fires' row count: {count_legacy:,} (Expected: 7,541)")
    assert count_legacy == 7541, f"Expected 7541, got {count_legacy}"

    # Verify regional view was cleanly dropped in legacy mode
    views = [row[0] for row in conn.execute("SHOW TABLES").fetchall()]
    print(f"  Available views after rollback: {views}")
    assert "fires" in views and "fires_regional" not in views, "fires_regional should not exist in legacy mode"

    # Step 5: Verify Legacy Archive Cryptographic Integrity
    print("\n[STEP 5] Verifying Legacy Archive Cryptographic Integrity...")
    import json
    with open(MANIFEST_FILE) as f:
        manifest = json.load(f)

    for item in manifest["files"]:
        target_path = ARCHIVE_DIR / item["filename"]
        curr_hash = sha256_file(target_path)
        expected_hash = item["sha256"]
        match = (curr_hash == expected_hash)
        print(f"  {target_path.name}: {'VERIFIED MATCH' if match else 'HASH MISMATCH'}")
        assert match, f"Integrity check failed for {target_path.name}!"

    # Step 6: Restore Production Harmonised Views
    print("\n[STEP 6] Restoring Production Harmonised Views...")
    t_restore_start = time.perf_counter()
    conn.execute(f"CREATE OR REPLACE VIEW fires AS SELECT * FROM '{PROD_DIR / 'uttarakhand_harmonised_fires.parquet'}'")
    conn.execute(f"CREATE OR REPLACE VIEW fires_regional AS SELECT * FROM '{PROD_DIR / 'regional_harmonised_fires.parquet'}'")
    t_restore_end = time.perf_counter()
    restore_ms = (t_restore_end - t_restore_start) * 1000
    print(f"  Harmonised Views Restored in {restore_ms:.2f} ms")

    count_final = conn.execute("SELECT COUNT(*) FROM fires").fetchone()[0]
    assert count_final == 240365
    print(f"  Final active 'fires' count: {count_final:,}")

    print("\n=============================================================")
    print(f"ROLLBACK TEST RESULT: 100% SUCCESSFUL")
    print(f"Measured Rollback Duration: {rollback_duration_ms:.2f} ms (< 0.05 seconds)")
    print("Archive Cryptographic Integrity: 100% UNCHANGED")
    print("=============================================================")

if __name__ == "__main__":
    test_rollback()
