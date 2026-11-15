"""
Satellite fire detection routes for interactive querying.
"""

from fastapi import APIRouter, Query
from typing import Optional
from fireIntel.api.db import DuckDBManager

router = APIRouter(prefix="/fires", tags=["Satellite Fires"])

@router.get("/")
def get_fires(
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' or 'regional'"),
    sensor: Optional[str] = Query(None, description="Sensor filter: 'MODIS' or 'VIIRS'"),
    daynight: Optional[str] = Query(None, description="Overpass filter: 'D' (Day) or 'N' (Night)"),
    min_frp: Optional[float] = Query(None, description="Minimum FRP threshold in MW"),
    confidence_viirs: Optional[str] = Query(None, description="VIIRS confidence: 'l', 'n', 'h'"),
    min_confidence_modis: Optional[int] = Query(None, description="MODIS min confidence 0-100"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Decoded month 1-12"),
    season: Optional[str] = Query(None, description="Seasonal regime"),
    limit: int = Query(1000, le=10000, description="Max rows to return")
):
    """
    Queries boundary-validated satellite fire detections with decoupled confidence
    and sensor filters via DuckDB in-memory engine.
    """
    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"
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

    if month:
        conditions.append("decoded_month = ?")
        params.append(month)

    if season:
        conditions.append("LOWER(season) = LOWER(?)")
        params.append(season.strip())

    sql = f"""
        SELECT 
            latitude, longitude, brightness, scan, track, acq_date, acq_time,
            satellite, instrument, confidence, version, bright_t31, frp, daynight,
            type, sensor, decoded_month, decoded_hour, season, confidence_label,
            type_label, date_verified_2025, in_uttarakhand, coverage_note,
            strftime(acq_datetime, '%Y-%m-%dT%H:%M:%SZ') as acq_datetime
        FROM {table_name}
        WHERE {" AND ".join(conditions)}
        ORDER BY acq_datetime ASC NULLS LAST, decoded_month ASC, frp DESC
        LIMIT ?
    """
    params.append(limit)

    df, elapsed_ms = DuckDBManager.query(sql, params)
    records = df.to_dict(orient="records")

    return {
        "count": len(records),
        "limit": limit,
        "scope": scope,
        "query_execution_ms": round(elapsed_ms, 2),
        "data": records
    }

