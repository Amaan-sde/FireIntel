"""
Database connection manager for FIREINTEL API.
Leverages DuckDB for high-performance direct in-memory querying of Parquet datasets.
"""

from pathlib import Path
import duckdb
import time

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Parquet file paths
FIRES_PARQUET = DATA_DIR / "processed" / "boundary_validated" / "uttarakhand_fires_boundary.parquet"
MASTER_GRID_PARQUET = DATA_DIR / "environmental" / "metadata" / "master_grid_005deg.parquet"
DEM_TERRAIN_PARQUET = DATA_DIR / "environmental" / "processed" / "dem_terrain_features_005deg.parquet"
BOUNDARY_GEOJSON = DATA_DIR / "boundaries" / "uttarakhand_boundary.geojson"
SUMMARY_JSON = DATA_DIR / "processed" / "boundary_validated" / "mission_control_summary.json"

class DuckDBManager:
    _instance = None
    _connection = None

    @classmethod
    def get_connection(cls) -> duckdb.DuckDBPyConnection:
        if cls._connection is None:
            # Create an in-memory DuckDB connection
            cls._connection = duckdb.connect(":memory:")
            # Register views for clean querying
            if FIRES_PARQUET.exists():
                cls._connection.execute(f"CREATE VIEW fires AS SELECT * FROM '{FIRES_PARQUET}'")
            if MASTER_GRID_PARQUET.exists():
                cls._connection.execute(f"CREATE VIEW master_grid AS SELECT * FROM '{MASTER_GRID_PARQUET}'")
            if DEM_TERRAIN_PARQUET.exists():
                cls._connection.execute(f"CREATE VIEW dem_terrain AS SELECT * FROM '{DEM_TERRAIN_PARQUET}'")
        return cls._connection

    @classmethod
    def query(cls, sql: str, params=None):
        conn = cls.get_connection()
        t0 = time.perf_counter()
        if params:
            res = conn.execute(sql, params)
        else:
            res = conn.execute(sql)
        df = res.df()
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
        benchmarks.append({
            "query": "SELECT sensor, count(*), avg(frp), max(frp) FROM fires GROUP BY sensor",
            "dataset": "uttarakhand_fires_boundary.parquet (7,541 rows)",
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
