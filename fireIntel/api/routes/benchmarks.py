"""
Performance benchmarking route providing transparent empirical query metrics.
"""

from fastapi import APIRouter
from fireIntel.api.db import DuckDBManager

router = APIRouter(prefix="/benchmarks", tags=["Performance Telemetry"])

@router.get("/")
def get_query_benchmarks():
    """Runs live query benchmarks against DuckDB Parquet datasets and returns latency metrics."""
    benchmarks = DuckDBManager.benchmark_queries()
    return {
        "engine": "DuckDB Spatial (In-Memory Parquet)",
        "hardware_platform": "Apple Silicon (arm64)",
        "benchmarks": benchmarks
    }

