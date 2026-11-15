"""
Database connection manager for FIREINTEL API.
Leverages DuckDB for high-performance direct in-memory querying of Parquet datasets.
"""

from pathlib import Path
import os
import duckdb
import time
import threading

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Dataset Versioning Configuration: "harmonised" (Default) or "legacy_2025"
DATASET_VERSION = os.environ.get("FIREINTEL_DATASET_VERSION", "harmonised")

PROD_HARMONISED_DIR = DATA_DIR / "production" / "harmonised"
LEGACY_ARCHIVE_DIR = DATA_DIR / "archive" / "legacy_2025"

def get_parquet_paths(version: str = None):
    v = version or os.environ.get("FIREINTEL_DATASET_VERSION", "harmonised")
    if v == "legacy_2025":
        fires_p = LEGACY_ARCHIVE_DIR / "uttarakhand_fires_boundary.parquet"
        regional_p = None
        summary_j = LEGACY_ARCHIVE_DIR / "mission_control_summary.json"
    else:
        fires_p = PROD_HARMONISED_DIR / "uttarakhand_harmonised_fires.parquet"
        regional_p = PROD_HARMONISED_DIR / "regional_harmonised_fires.parquet"
        summary_j = PROD_HARMONISED_DIR / "mission_control_summary.json"
        # Fallback to legacy if harmonised not yet promoted
        if not fires_p.exists():
            fires_p = DATA_DIR / "processed" / "boundary_validated" / "uttarakhand_fires_boundary.parquet"
            summary_j = DATA_DIR / "processed" / "boundary_validated" / "mission_control_summary.json"
    return fires_p, regional_p, summary_j

FIRES_PARQUET, REGIONAL_PARQUET, SUMMARY_JSON = get_parquet_paths(DATASET_VERSION)
MASTER_GRID_PARQUET = DATA_DIR / "environmental" / "metadata" / "master_grid_005deg.parquet"
DEM_TERRAIN_PARQUET = DATA_DIR / "environmental" / "processed" / "dem_terrain_features_005deg.parquet"
BOUNDARY_GEOJSON = DATA_DIR / "boundaries" / "uttarakhand_boundary.geojson"

class DuckDBManager:
    _instance = None
    _connection = None
    _lock = threading.Lock()
    _active_version = DATASET_VERSION

    @classmethod
    def get_connection(cls) -> duckdb.DuckDBPyConnection:
        if cls._connection is None:
            with cls._lock:
                if cls._connection is None:
                    cls._connection = duckdb.connect(":memory:")
                    cls._init_views(cls._connection, cls._active_version)
        return cls._connection

    @classmethod
    def _init_views(cls, conn: duckdb.DuckDBPyConnection, version: str):
        fires_p, regional_p, _ = get_parquet_paths(version)
        if fires_p.exists():
            conn.execute(f"CREATE OR REPLACE VIEW fires AS SELECT * FROM '{fires_p}'")
        if regional_p and regional_p.exists():
            conn.execute(f"CREATE OR REPLACE VIEW fires_regional AS SELECT * FROM '{regional_p}'")
        else:
            conn.execute("DROP VIEW IF EXISTS fires_regional")
        if MASTER_GRID_PARQUET.exists():
            conn.execute(f"CREATE OR REPLACE VIEW master_grid AS SELECT * FROM '{MASTER_GRID_PARQUET}'")
        if DEM_TERRAIN_PARQUET.exists():
            conn.execute(f"CREATE OR REPLACE VIEW dem_terrain AS SELECT * FROM '{DEM_TERRAIN_PARQUET}'")

    @classmethod
    def set_dataset_version(cls, version: str) -> float:
        """Atomically switches dataset version ('harmonised' or 'legacy_2025') and returns switch duration in ms."""
        assert version in ("harmonised", "legacy_2025"), f"Unknown version: {version}"
        with cls._lock:
            conn = cls.get_connection()
            t0 = time.perf_counter()
            cls._init_views(conn, version)
            cls._active_version = version
            os.environ["FIREINTEL_DATASET_VERSION"] = version
            elapsed_ms = (time.perf_counter() - t0) * 1000
            return elapsed_ms

    @classmethod
    def get_active_version(cls) -> str:
        return cls._active_version

    @classmethod
    def query(cls, sql: str, params=None):
        conn = cls.get_connection()
        t0 = time.perf_counter()
        cursor = conn.cursor()
        try:
            if params:
                res = cursor.execute(sql, params)
            else:
                res = cursor.execute(sql)
            df = res.df()
        finally:
            cursor.close()
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return df, elapsed_ms

    @classmethod
    def benchmark_queries(cls):
        """Runs empirical query benchmarks for the transparency dashboard."""
        conn = cls.get_connection()
        benchmarks = []

        # Benchmark 1: Fire sensor aggregation
        t0 = time.perf_counter()
        conn.execute("SELECT sensor, count(*), avg(frp), max(frp) FROM fires GROUP BY sensor").df()
        t1 = time.perf_counter()
        fires_count = conn.execute("SELECT count(*) FROM fires").fetchone()[0]
        benchmarks.append({
            "query": "SELECT sensor, count(*), avg(frp), max(frp) FROM fires GROUP BY sensor",
            "dataset": f"fires view ({cls.get_active_version()}: {fires_count:,} rows)",
            "execution_ms": round((t1 - t0) * 1000, 2)
        })

        # Benchmark 2: Master grid scan
        t0 = time.perf_counter()
        conn.execute("SELECT count(*) FROM master_grid").df()
        t1 = time.perf_counter()
        benchmarks.append({
            "query": "SELECT count(*) FROM master_grid",
            "dataset": "master_grid_005deg.parquet (2,174 rows)",
            "execution_ms": round((t1 - t0) * 1000, 2)
        })

        # Benchmark 3: Master grid + DEM terrain join with filter
        t0 = time.perf_counter()
        conn.execute("""
            SELECT g.grid_cell_id, g.centroid_lat, g.centroid_lon, d.elevation_mean_m, d.slope_mean_deg
            FROM master_grid g
            JOIN dem_terrain d ON g.grid_cell_id = d.grid_cell_id
            WHERE d.slope_mean_deg > 20
        """).df()
        t1 = time.perf_counter()
        benchmarks.append({
            "query": "Grid + DEM JOIN ON grid_cell_id WHERE slope_mean_deg > 20",
            "dataset": "master_grid JOIN dem_terrain (2,174 cells, 1,291 matched)",
            "execution_ms": round((t1 - t0) * 1000, 2)
        })

        return benchmarks
