"""
Mission Control routes providing verified operational telemetry.
"""

from fastapi import APIRouter, HTTPException
import json
from pathlib import Path
from fireIntel.api.db import DuckDBManager, SUMMARY_JSON, BOUNDARY_GEOJSON

router = APIRouter(prefix="/mission-control", tags=["Mission Control"])

@router.get("/telemetry")
def get_mission_control_telemetry():
    """Returns core verified operational telemetry for the Mission Control dashboard."""
    if not SUMMARY_JSON.exists():
        raise HTTPException(status_code=404, detail="Summary telemetry not found")
    with open(SUMMARY_JSON, "r") as f:
        data = json.load(f)
    return data

@router.get("/summary-stats")
def get_summary_stats():
    """Queries live DuckDB views for exact real-time aggregate validation."""
    query = """
        SELECT 
            count(*) as total_detections,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis_count,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs_count,
            round(count(CASE WHEN sensor = 'VIIRS' THEN 1 END)::FLOAT / count(CASE WHEN sensor = 'MODIS' THEN 1 END), 4) as detection_ratio,
            round(max(frp), 2) as max_frp,
            round(avg(frp), 2) as mean_frp,
            round(median(frp), 2) as median_frp
        FROM fires
    """
    df, elapsed_ms = DuckDBManager.query(query)
    record = df.to_dict(orient="records")[0]
    record["query_time_ms"] = round(elapsed_ms, 2)
    return record

@router.get("/boundary")
def get_uttarakhand_boundary():
    """Serves the official validated administrative boundary of Uttarakhand."""
    if not BOUNDARY_GEOJSON.exists():
        raise HTTPException(status_code=404, detail="Boundary GeoJSON not found")
    with open(BOUNDARY_GEOJSON, "r") as f:
        data = json.load(f)
    return data

