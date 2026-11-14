"""
Satellite fire detection routes for interactive querying.
"""

from fastapi import APIRouter, Query
from typing import Optional
from fireIntel.api.db import DuckDBManager

router = APIRouter(prefix="/fires", tags=["Satellite Fires"])

@router.get("/")
def get_fires(
    sensor: Optional[str] = Query(None, description="Sensor filter: 'MODIS' or 'VIIRS'"),
    daynight: Optional[str] = Query(None, description="Overpass filter: 'D' (Day) or 'N' (Night)"),
    min_frp: Optional[float] = Query(None, description="Minimum FRP threshold in MW"),
    confidence_viirs: Optional[str] = Query(None, description="VIIRS confidence: 'l', 'n', 'h'"),
    min_confidence_modis: Optional[int] = Query(None, description="MODIS min confidence 0-100"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(1000, le=10000, description="Max rows to return")
):
    """
    Queries boundary-validated satellite fire detections with decoupled confidence
    and sensor filters via DuckDB in-memory engine.
    """
    conditions = ["1=1"]
    params = []

    if sensor:
        conditions.append("sensor = ?")
        params.append(sensor.upper())

    if daynight:
        conditions.append("daynight = ?")
        params.append(daynight.upper())

    if min_frp is not None:
        conditions.append("frp >= ?")
        params.append(min_frp)

    if confidence_viirs:
        conditions.append("(sensor = 'VIIRS' AND confidence = ?)")
        params.append(confidence_viirs.lower())

    if min_confidence_modis is not None:
        conditions.append("(sensor = 'MODIS' AND TRY_CAST(confidence AS INT) >= ?)")
        params.append(min_confidence_modis)

    if start_date:
        conditions.append("acq_date >= ?")
        params.append(start_date)

    if end_date:
        conditions.append("acq_date <= ?")
        params.append(end_date)

    sql = f"""
        SELECT 
            latitude, longitude, brightness, scan, track, acq_date, acq_time,
            satellite, instrument, confidence, version, bright_t31, frp, daynight,
            type, sensor, acq_datetime
        FROM fires
        WHERE {" AND ".join(conditions)}
        ORDER BY acq_datetime ASC
        LIMIT ?
    """
    params.append(limit)

    df, elapsed_ms = DuckDBManager.query(sql, params)
    records = df.to_dict(orient="records")

    return {
        "count": len(records),
        "limit": limit,
        "query_execution_ms": round(elapsed_ms, 2),
        "data": records
    }

