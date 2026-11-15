"""
FIREINTEL Data Explorer & Export Engine
High-performance query and export endpoints for boundary-validated NASA FIRMS observations.
"""

from fastapi import APIRouter, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
import datetime
import math
import io
import json
import csv
from fireIntel.api.db import DuckDBManager

router = APIRouter(prefix="/data", tags=["Data Explorer & Export"])

# Whitelist of safe columns for sorting
ALLOWED_SORT_FIELDS = {
    "acq_datetime": "acq_datetime",
    "acq_date": "acq_date",
    "acq_time": "acq_time",
    "frp": "frp",
    "brightness": "brightness",
    "bright_t31": "bright_t31",
    "confidence": "confidence",
    "satellite": "satellite",
    "sensor": "sensor",
    "latitude": "latitude",
    "longitude": "longitude",
    "daynight": "daynight",
    "decoded_month": "decoded_month",
    "decoded_hour": "decoded_hour",
    "season": "season",
    "type": "type",
    "date_verified_2025": "date_verified_2025",
    "in_uttarakhand": "in_uttarakhand",
}

TYPE_DESCRIPTIONS = {
    0: "Presumed vegetation fire",
    1: "Active volcano",
    2: "Other static land source",
    3: "Offshore detection",
}

VIIRS_CONFIDENCE_MAP = {
    "l": "Low",
    "n": "Nominal",
    "h": "High",
}

def sanitize_csv_cell(val: Any) -> Any:
    """
    Guards against CSV Formula Injection (CWE-1236).
    If a cell value starts with '=', '+', '-', '@', '\\t', or '\\r', prepend a single quote.
    """
    if isinstance(val, str):
        if val and val[0] in ("=", "+", "-", "@", "\t", "\r"):
            return f"'{val}"
    return val

def validate_dates(start_date: Optional[str], end_date: Optional[str]):
    """Validates ISO date format YYYY-MM-DD and ensures start_date <= end_date."""
    d_start = None
    d_end = None

    if start_date:
        try:
            d_start = datetime.date.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid start_date format '{start_date}'. Expected YYYY-MM-DD."
            )

    if end_date:
        try:
            d_end = datetime.date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid end_date format '{end_date}'. Expected YYYY-MM-DD."
            )

    if d_start and d_end and d_start > d_end:
        raise HTTPException(
            status_code=400,
            detail=f"start_date ({start_date}) cannot be later than end_date ({end_date})."
        )

def build_filter_clause(
    sensor: Optional[str] = None,
    satellite: Optional[str] = None,
    daynight: Optional[str] = None,
    min_frp: Optional[float] = None,
    max_frp: Optional[float] = None,
    confidence_viirs: Optional[str] = None,
    min_confidence_modis: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    season: Optional[str] = None,
    hotspot_type: Optional[int] = None,
    verified_dates_only: Optional[bool] = None,
) -> tuple[str, list[Any], dict[str, Any]]:
    """
    Constructs parameterized WHERE clause for DuckDB querying with strict decoupling
    of MODIS numeric confidence and VIIRS categorical confidence, plus decoded seasonal
    and hotspot type filters.
    """
    validate_dates(start_date, end_date)

    if min_frp is not None and max_frp is not None and min_frp > max_frp:
        raise HTTPException(
            status_code=400,
            detail=f"min_frp ({min_frp}) cannot be greater than max_frp ({max_frp})."
        )

    if min_confidence_modis is not None and (min_confidence_modis < 0 or min_confidence_modis > 100):
        raise HTTPException(
            status_code=400,
            detail="min_confidence_modis must be between 0 and 100."
        )

    conditions = ["1=1"]
    params: list[Any] = []
    applied_filters: dict[str, Any] = {}

    # 1. Sensor Filter
    if sensor and sensor.upper() != "ALL":
        s_upper = sensor.upper()
        if s_upper not in ("MODIS", "VIIRS"):
            raise HTTPException(status_code=400, detail="sensor must be 'MODIS', 'VIIRS', or 'ALL'.")
        conditions.append("sensor = ?")
        params.append(s_upper)
        applied_filters["sensor"] = s_upper

    # 2. Satellite Platform Filter
    if satellite and satellite.upper() != "ALL":
        sat_clean = satellite.strip()
        conditions.append("LOWER(satellite) = LOWER(?)")
        params.append(sat_clean)
        applied_filters["satellite"] = sat_clean

    # 3. Day / Night Overpass Filter
    if daynight and daynight.upper() != "ALL":
        dn_upper = daynight.upper()
        if dn_upper not in ("D", "N"):
            raise HTTPException(status_code=400, detail="daynight must be 'D', 'N', or 'ALL'.")
        conditions.append("daynight = ?")
        params.append(dn_upper)
        applied_filters["daynight"] = dn_upper

    # 4. FRP Range Filters
    if min_frp is not None:
        conditions.append("frp >= ?")
        params.append(float(min_frp))
        applied_filters["min_frp"] = min_frp

    if max_frp is not None:
        conditions.append("frp <= ?")
        params.append(float(max_frp))
        applied_filters["max_frp"] = max_frp

    # 5. Sensor-Specific Confidence Filters
    if confidence_viirs:
        cats = [c.strip().lower() for c in confidence_viirs.split(",") if c.strip()]
        valid_cats = {"l", "n", "h"}
        for c in cats:
            if c not in valid_cats:
                raise HTTPException(status_code=400, detail=f"Invalid VIIRS confidence category '{c}'. Allowed: 'l', 'n', 'h'.")
        if cats:
            placeholders = ", ".join(["?"] * len(cats))
            conditions.append(f"(sensor != 'VIIRS' OR confidence IN ({placeholders}))")
            params.extend(cats)
            applied_filters["confidence_viirs"] = cats

    # MODIS numeric confidence: 0 to 100
    if min_confidence_modis is not None:
        conditions.append("(sensor != 'MODIS' OR TRY_CAST(confidence AS INT) >= ?)")
        params.append(int(min_confidence_modis))
        applied_filters["min_confidence_modis"] = min_confidence_modis

    # 6. Date Range Filters (Only matches verified records with dates)
    if start_date:
        conditions.append("acq_date >= ?")
        params.append(start_date)
        applied_filters["start_date"] = start_date

    if end_date:
        conditions.append("acq_date <= ?")
        params.append(end_date)
        applied_filters["end_date"] = end_date

    # 7. Calendar Month Filter (Decoded 1-12)
    if month and str(month).upper() != "ALL":
        m_list = [int(m.strip()) for m in str(month).split(",") if m.strip().isdigit()]
        if m_list:
            placeholders = ", ".join(["?"] * len(m_list))
            conditions.append(f"decoded_month IN ({placeholders})")
            params.extend(m_list)
            applied_filters["month"] = m_list

    # 8. Seasonal Regime Filter (Decoded phenological fire seasons)
    if season and season.upper() != "ALL":
        s_clean = season.strip().lower().replace("-", "_").replace(" ", "_")
        if s_clean in ("pre_monsoon", "pre_monsoon_peak", "peak_wildfire"):
            conditions.append("decoded_month IN (4, 5)")
            applied_filters["season"] = "Pre-Monsoon Peak (Apr-May)"
        elif s_clean in ("post_monsoon", "post_monsoon_agricultural"):
            conditions.append("decoded_month IN (10, 11)")
            applied_filters["season"] = "Post-Monsoon Agricultural (Oct-Nov)"
        elif s_clean in ("winter", "winter_biomass_burning"):
            conditions.append("decoded_month IN (12, 1, 2, 3)")
            applied_filters["season"] = "Winter Dry Season (Dec-Mar)"
        elif s_clean in ("monsoon", "monsoon_minimum"):
            conditions.append("decoded_month IN (6, 7, 8, 9)")
            applied_filters["season"] = "Monsoon Minimum (Jun-Sep)"
        else:
            conditions.append("LOWER(season) = LOWER(?)")
            params.append(season.strip())
            applied_filters["season"] = season.strip()

    # 9. Hotspot Type Filter (0: Vegetation, 2: Static Land Source)
    if hotspot_type is not None:
        conditions.append("type = ?")
        params.append(int(hotspot_type))
        applied_filters["hotspot_type"] = int(hotspot_type)

    # 10. Verified Dates Only Filter
    if verified_dates_only:
        conditions.append("date_verified_2025 = true")
        applied_filters["verified_dates_only"] = True

    # 11. Search Filter
    if search:
        search_term = f"%{search.strip().lower()}%"
        conditions.append("""(
            LOWER(satellite) LIKE ? OR 
            LOWER(sensor) LIKE ? OR 
            LOWER(confidence) LIKE ? OR
            LOWER(season) LIKE ? OR
            CAST(decoded_month AS VARCHAR) LIKE ?
        )""")
        params.extend([search_term] * 5)
        applied_filters["search"] = search.strip()

    where_clause = " AND ".join(conditions)
    return where_clause, params, applied_filters

@router.get("/summary")
def get_data_summary(
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' (240,365 obs) or 'regional' (510,299 obs)"),
    sensor: Optional[str] = Query(None, description="Sensor filter: 'MODIS', 'VIIRS', or 'ALL'"),
    satellite: Optional[str] = Query(None, description="Satellite: 'Terra', 'Aqua', 'SNPP'"),
    daynight: Optional[str] = Query(None, description="Overpass filter: 'D' (Day) or 'N' (Night)"),
    min_frp: Optional[float] = Query(None, ge=0, description="Minimum FRP in MW"),
    max_frp: Optional[float] = Query(None, ge=0, description="Maximum FRP in MW"),
    confidence_viirs: Optional[str] = Query(None, description="VIIRS confidence: 'l', 'n', 'h' (comma-separated allowed)"),
    min_confidence_modis: Optional[int] = Query(None, ge=0, le=100, description="MODIS min confidence 0-100"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    month: Optional[str] = Query(None, description="Decoded month 1-12"),
    season: Optional[str] = Query(None, description="Seasonal regime"),
    hotspot_type: Optional[int] = Query(None, description="Hotspot type: 0 (vegetation) or 2 (static)"),
    verified_dates_only: Optional[bool] = Query(None, description="Filter for 2025 verified dates only"),
    search: Optional[str] = Query(None, description="Text search filter"),
):
    """
    Returns empirical aggregate statistics and counts for the currently filtered observations.
    All calculations are executed in-memory directly from validated data via DuckDB.
    """
    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"
    total_base = 510299 if scope and scope.lower() == "regional" else 240365
    scope_label = "Regional Northern India (28°N–31°N, 77°E–81°E)" if scope and scope.lower() == "regional" else "Uttarakhand Boundary Validated (Survey of India Polygon)"

    where_clause, params, applied_filters = build_filter_clause(
        sensor=sensor,
        satellite=satellite,
        daynight=daynight,
        min_frp=min_frp,
        max_frp=max_frp,
        confidence_viirs=confidence_viirs,
        min_confidence_modis=min_confidence_modis,
        start_date=start_date,
        end_date=end_date,
        month=month,
        season=season,
        hotspot_type=hotspot_type,
        verified_dates_only=verified_dates_only,
        search=search,
    )
    applied_filters["scope"] = scope

    sql = f"""
        SELECT 
            count(*) as total_matching,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis_count,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs_count,
            count(CASE WHEN daynight = 'D' THEN 1 END) as day_count,
            count(CASE WHEN daynight = 'N' THEN 1 END) as night_count,
            count(CASE WHEN type = 0 THEN 1 END) as vegetation_count,
            count(CASE WHEN type = 2 THEN 1 END) as static_source_count,
            count(CASE WHEN date_verified_2025 = true THEN 1 END) as verified_2025_count,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp_mw,
            COALESCE(round(avg(frp), 2), 0.0) as avg_frp_mw,
            COALESCE(round(max(frp), 2), 0.0) as max_frp_mw,
            min(acq_date) as matched_start_date,
            max(acq_date) as matched_end_date
        FROM {table_name}
        WHERE {where_clause}
    """

    df, elapsed_ms = DuckDBManager.query(sql, params)
    row = df.to_dict(orient="records")[0]

    return {
        "status": "SUCCESS",
        "scope": scope,
        "total_matching": int(row["total_matching"]),
        "modis_count": int(row["modis_count"]),
        "viirs_count": int(row["viirs_count"]),
        "day_count": int(row["day_count"]),
        "night_count": int(row["night_count"]),
        "vegetation_fires_count": int(row["vegetation_count"]),
        "static_sources_count": int(row["static_source_count"]),
        "verified_2025_dates_count": int(row["verified_2025_count"]),
        "total_frp_mw": float(row["total_frp_mw"]),
        "avg_frp_mw": float(row["avg_frp_mw"]),
        "max_frp_mw": float(row["max_frp_mw"]),
        "date_range": {
            "start": str(row["matched_start_date"]) if row["matched_start_date"] is not None else None,
            "end": str(row["matched_end_date"]) if row["matched_end_date"] is not None else None,
        },
        "dataset_bounds": {
            "total_dataset_records": total_base,
            "region": scope_label,
            "spatial_envelope": "28.00°N to 31.00°N, 77.00°E to 81.00°E",
            "crs": "EPSG:4326 (WGS84)",
            "coverage_disclosure": "Restricted to bounding box 28°N–31°N, 77°E–81°E. Alpine areas north of 31°N truncated at source; does not claim complete Uttarakhand coverage.",
            "scientific_note": "Satellite thermal hotspot observations (not unique fire incidents). Unmatched dates are NULL."
        },
        "applied_filters": applied_filters,
        "query_execution_ms": round(elapsed_ms, 2),
    }

@router.get("/observations")
def get_observations(
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' (240,365 obs) or 'regional' (510,299 obs)"),
    sensor: Optional[str] = Query(None, description="Sensor filter: 'MODIS', 'VIIRS', or 'ALL'"),
    satellite: Optional[str] = Query(None, description="Satellite: 'Terra', 'Aqua', 'SNPP'"),
    daynight: Optional[str] = Query(None, description="Overpass filter: 'D' (Day) or 'N' (Night)"),
    min_frp: Optional[float] = Query(None, ge=0, description="Minimum FRP in MW"),
    max_frp: Optional[float] = Query(None, ge=0, description="Maximum FRP in MW"),
    confidence_viirs: Optional[str] = Query(None, description="VIIRS confidence: 'l', 'n', 'h'"),
    min_confidence_modis: Optional[int] = Query(None, ge=0, le=100, description="MODIS min confidence 0-100"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    month: Optional[str] = Query(None, description="Decoded month 1-12"),
    season: Optional[str] = Query(None, description="Seasonal regime"),
    hotspot_type: Optional[int] = Query(None, description="Hotspot type: 0 (vegetation) or 2 (static)"),
    verified_dates_only: Optional[bool] = Query(None, description="Filter for 2025 verified dates only"),
    search: Optional[str] = Query(None, description="Text search filter"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(25, ge=1, le=500, description="Page size (1 to 500)"),
    sort_by: str = Query("frp", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc|ASC|DESC)$", description="Sort direction ('asc' or 'desc')"),
):
    """
    Returns paginated, sorted observation records matching active filters.
    Includes rich provenance, sensor semantics, and human-readable classifications.
    """
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort_by field '{sort_by}'. Allowed fields: {list(ALLOWED_SORT_FIELDS.keys())}"
        )

    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"
    order_dir = sort_order.upper()
    order_col = ALLOWED_SORT_FIELDS[sort_by]

    if order_col == "acq_datetime":
        order_clause = f"acq_datetime {order_dir} NULLS LAST, decoded_month {order_dir}, frp DESC"
    else:
        order_clause = f"{order_col} {order_dir}"

    where_clause, params, applied_filters = build_filter_clause(
        sensor=sensor,
        satellite=satellite,
        daynight=daynight,
        min_frp=min_frp,
        max_frp=max_frp,
        confidence_viirs=confidence_viirs,
        min_confidence_modis=min_confidence_modis,
        start_date=start_date,
        end_date=end_date,
        month=month,
        season=season,
        hotspot_type=hotspot_type,
        verified_dates_only=verified_dates_only,
        search=search,
    )
    applied_filters["scope"] = scope

    # 1. Compute exact total count
    count_sql = f"SELECT count(*) as total FROM {table_name} WHERE {where_clause}"
    df_count, count_ms = DuckDBManager.query(count_sql, list(params))
    total_records = int(df_count.iloc[0]["total"])
    total_pages = math.ceil(total_records / page_size) if total_records > 0 else 1

    # 2. Paginated Query
    offset = (page - 1) * page_size
    query_params = list(params) + [page_size, offset]

    sql = f"""
        SELECT 
            ROW_NUMBER() OVER (ORDER BY {order_clause}, latitude ASC) as obs_id,
            latitude, longitude, brightness, scan, track, acq_date, acq_time,
            satellite, instrument, confidence, version, bright_t31, frp, daynight,
            type, sensor, decoded_month, decoded_hour, season, confidence_label,
            type_label, date_verified_2025, in_uttarakhand, coverage_note,
            strftime(acq_datetime, '%Y-%m-%dT%H:%M:%SZ') as acq_datetime_iso
        FROM {table_name}
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ? OFFSET ?
    """

    df, data_ms = DuckDBManager.query(sql, query_params)
    raw_records = df.to_dict(orient="records")

    enriched_records = []
    for r in raw_records:
        time_int = int(r.get("acq_time") or 0) if r.get("acq_time") else None
        time_str = f"{time_int:04d}" if time_int is not None else None
        acq_d = str(r["acq_date"]) if r.get("acq_date") else None
        acq_dt = str(r["acq_datetime_iso"]) if r.get("acq_datetime_iso") else None

        conf_raw = str(r.get("confidence") or "").strip()
        conf_cat = r.get("confidence_label") or "Nominal"

        det_type = int(r.get("type") or 0)
        det_desc = r.get("type_label") or TYPE_DESCRIPTIONS.get(det_type, "Presumed vegetation fire")

        enriched_records.append({
            "obs_id": int(r["obs_id"]),
            "latitude": round(float(r["latitude"]), 5),
            "longitude": round(float(r["longitude"]), 5),
            "acq_date": acq_d,
            "acq_time": time_str,
            "acq_datetime": acq_dt,
            "date_verified_2025": bool(r.get("date_verified_2025")),
            "decoded_month": int(r["decoded_month"]),
            "decoded_hour": int(r["decoded_hour"]),
            "season": str(r["season"]),
            "satellite": str(r["satellite"]),
            "instrument": str(r["instrument"]),
            "sensor": str(r["sensor"]),
            "frp": round(float(r["frp"]), 2),
            "brightness": round(float(r["brightness"]), 2),
            "bright_t31": round(float(r["bright_t31"]), 2) if r.get("bright_t31") is not None else None,
            "scan": round(float(r["scan"]), 2),
            "track": round(float(r["track"]), 2),
            "confidence": conf_raw,
            "confidence_category": conf_cat,
            "daynight": str(r["daynight"]),
            "type": det_type,
            "type_description": det_desc,
            "in_uttarakhand": bool(r.get("in_uttarakhand")),
            "coverage_note": str(r.get("coverage_note") or ""),
            "version": str(r.get("version") or "Harmonised-v1"),
        })

    return {
        "status": "SUCCESS",
        "scope": scope,
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
        "has_prev": page > 1,
        "sort_by": sort_by,
        "sort_order": order_dir.lower(),
        "applied_filters": applied_filters,
        "query_execution_ms": round(count_ms + data_ms, 2),
        "data": enriched_records,
    }

@router.get("/export")
def export_observations(
    format: str = Query(..., pattern="^(csv|json|geojson|CSV|JSON|GEOJSON)$", description="Export format: 'csv', 'json', or 'geojson'"),
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' (240,365 obs) or 'regional' (510,299 obs)"),
    sensor: Optional[str] = Query(None, description="Sensor filter: 'MODIS', 'VIIRS', or 'ALL'"),
    satellite: Optional[str] = Query(None, description="Satellite: 'Terra', 'Aqua', 'SNPP'"),
    daynight: Optional[str] = Query(None, description="Overpass filter: 'D' (Day) or 'N' (Night)"),
    min_frp: Optional[float] = Query(None, ge=0, description="Minimum FRP in MW"),
    max_frp: Optional[float] = Query(None, ge=0, description="Maximum FRP in MW"),
    confidence_viirs: Optional[str] = Query(None, description="VIIRS confidence: 'l', 'n', 'h'"),
    min_confidence_modis: Optional[int] = Query(None, ge=0, le=100, description="MODIS min confidence 0-100"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    month: Optional[str] = Query(None, description="Decoded month 1-12"),
    season: Optional[str] = Query(None, description="Seasonal regime"),
    hotspot_type: Optional[int] = Query(None, description="Hotspot type: 0 (vegetation) or 2 (static)"),
    verified_dates_only: Optional[bool] = Query(None, description="Filter for 2025 verified dates only"),
    search: Optional[str] = Query(None, description="Text search filter"),
    limit: int = Query(10000, le=50000, description="Max export records"),
):
    """
    Exports actual boundary-validated observation records in CSV, JSON, or GeoJSON format.
    Every export embeds authentic metadata, CRS documentation, provenance, and scientific notices.
    """
    fmt = format.lower()
    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"

    where_clause, params, applied_filters = build_filter_clause(
        sensor=sensor,
        satellite=satellite,
        daynight=daynight,
        min_frp=min_frp,
        max_frp=max_frp,
        confidence_viirs=confidence_viirs,
        min_confidence_modis=min_confidence_modis,
        start_date=start_date,
        end_date=end_date,
        month=month,
        season=season,
        hotspot_type=hotspot_type,
        verified_dates_only=verified_dates_only,
        search=search,
    )
    applied_filters["scope"] = scope

    sql = f"""
        SELECT 
            ROW_NUMBER() OVER (ORDER BY frp DESC, latitude ASC) as obs_id,
            latitude, longitude, brightness, scan, track, acq_date, acq_time,
            satellite, instrument, confidence, version, bright_t31, frp, daynight,
            type, sensor, decoded_month, decoded_hour, season, confidence_label,
            type_label, date_verified_2025, in_uttarakhand, coverage_note,
            strftime(acq_datetime, '%Y-%m-%dT%H:%M:%SZ') as acq_datetime_iso
        FROM {table_name}
        WHERE {where_clause}
        ORDER BY frp DESC, latitude ASC
        LIMIT ?
    """
    query_params = list(params) + [limit]
    df, elapsed_ms = DuckDBManager.query(sql, query_params)
    records = df.to_dict(orient="records")

    timestamp_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sensor_slug = (sensor or "all_sensors").lower()
    scope_slug = scope.lower()
    base_filename = f"fireintel_{scope_slug}_{sensor_slug}_{timestamp_iso[:10]}"

    # -------------------------------------------------------------------------
    # FORMAT A: CSV EXPORT WITH FORMULA INJECTION DEFENSE & METADATA HEADER
    # -------------------------------------------------------------------------
    if fmt == "csv":
        output = io.StringIO()
        output.write("# ==========================================================================\n")
        output.write("# FIREINTEL // NASA EARTH OBSERVATION DATA EXPLORER EXPORT\n")
        output.write(f"# Dataset: Harmonised Satellite Thermal Hotspot Observations (Phase 9)\n")
        output.write(f"# Scope: {scope.title()} ({'240,365' if scope_slug == 'uttarakhand' else '510,299'} observations)\n")
        output.write(f"# Export Generated: {timestamp_iso}\n")
        output.write(f"# Exported Records: {len(records)}\n")
        output.write(f"# Spatial Envelope: 28.0°N–31.0°N, 77.0°E–81.0°E (Alpine areas >31°N truncated at source)\n")
        output.write(f"# Applied Filters: {json.dumps(applied_filters)}\n")
        output.write("# Scientific Notice: Detections represent satellite radiometric pixel observations,\n")
        output.write("# not confirmed unique wildfire incident perimeters. FRP is measured in Megawatts (MW).\n")
        output.write("# Dates are verified only for 2025 raw matches; historical records retain NULL date.\n")
        output.write("# ==========================================================================\n")

        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        headers = [
            "obs_id",
            "latitude",
            "longitude",
            "in_uttarakhand",
            "decoded_month",
            "decoded_hour",
            "season",
            "acq_date",
            "acq_time",
            "acq_datetime",
            "date_verified_2025",
            "satellite",
            "instrument",
            "sensor",
            "frp_mw",
            "brightness_kelvin",
            "bright_t31_kelvin",
            "scan_km",
            "track_km",
            "confidence",
            "confidence_category",
            "daynight",
            "detection_type",
            "detection_description",
            "coverage_note",
            "version"
        ]
        writer.writerow(headers)

        for r in records:
            time_int = int(r.get("acq_time") or 0) if r.get("acq_time") else None
            time_str = f"{time_int:04d}" if time_int is not None else ""
            acq_d = str(r["acq_date"]) if r.get("acq_date") else ""
            acq_dt = str(r["acq_datetime_iso"]) if r.get("acq_datetime_iso") else ""

            conf_raw = str(r.get("confidence") or "").strip()
            conf_cat = r.get("confidence_label") or "Nominal"

            det_type = int(r.get("type") or 0)
            det_desc = r.get("type_label") or TYPE_DESCRIPTIONS.get(det_type, "Presumed vegetation fire")

            row_data = [
                r["obs_id"],
                round(float(r["latitude"]), 5),
                round(float(r["longitude"]), 5),
                bool(r.get("in_uttarakhand")),
                int(r["decoded_month"]),
                int(r["decoded_hour"]),
                sanitize_csv_cell(str(r["season"])),
                acq_d,
                time_str,
                acq_dt,
                bool(r.get("date_verified_2025")),
                sanitize_csv_cell(str(r["satellite"])),
                sanitize_csv_cell(str(r["instrument"])),
                sanitize_csv_cell(str(r["sensor"])),
                round(float(r["frp"]), 2),
                round(float(r["brightness"]), 2),
                round(float(r["bright_t31"]), 2) if r.get("bright_t31") is not None else "",
                round(float(r["scan"]), 2),
                round(float(r["track"]), 2),
                sanitize_csv_cell(conf_raw),
                sanitize_csv_cell(conf_cat),
                sanitize_csv_cell(str(r["daynight"])),
                det_type,
                sanitize_csv_cell(det_desc),
                sanitize_csv_cell(str(r.get("coverage_note") or "")),
                sanitize_csv_cell(str(r.get("version") or "Harmonised-v1")),
            ]
            writer.writerow(row_data)

        csv_content = output.getvalue()
        output.close()

        filename = f"{base_filename}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache",
            }
        )

    # -------------------------------------------------------------------------
    # FORMAT B: JSON EXPORT WITH EMBEDDED SCIENTIFIC METADATA MANIFEST
    # -------------------------------------------------------------------------
    elif fmt == "json":
        export_records = []
        for r in records:
            time_int = int(r.get("acq_time") or 0) if r.get("acq_time") else None
            time_str = f"{time_int:04d}" if time_int is not None else None
            acq_d = str(r["acq_date"]) if r.get("acq_date") else None
            acq_dt = str(r["acq_datetime_iso"]) if r.get("acq_datetime_iso") else None

            conf_raw = str(r.get("confidence") or "").strip()
            conf_cat = r.get("confidence_label") or "Nominal"

            det_type = int(r.get("type") or 0)
            det_desc = r.get("type_label") or TYPE_DESCRIPTIONS.get(det_type, "Presumed vegetation fire")

            export_records.append({
                "obs_id": int(r["obs_id"]),
                "latitude": round(float(r["latitude"]), 5),
                "longitude": round(float(r["longitude"]), 5),
                "in_uttarakhand": bool(r.get("in_uttarakhand")),
                "decoded_month": int(r["decoded_month"]),
                "decoded_hour": int(r["decoded_hour"]),
                "season": str(r["season"]),
                "acq_date": acq_d,
                "acq_time": time_str,
                "acq_datetime": acq_dt,
                "date_verified_2025": bool(r.get("date_verified_2025")),
                "satellite": str(r["satellite"]),
                "instrument": str(r["instrument"]),
                "sensor": str(r["sensor"]),
                "frp_mw": round(float(r["frp"]), 2),
                "brightness_kelvin": round(float(r["brightness"]), 2),
                "bright_t31_kelvin": round(float(r["bright_t31"]), 2) if r.get("bright_t31") is not None else None,
                "scan_km": round(float(r["scan"]), 2),
                "track_km": round(float(r["track"]), 2),
                "confidence": conf_raw,
                "confidence_category": conf_cat,
                "daynight": str(r["daynight"]),
                "detection_type": det_type,
                "detection_description": det_desc,
                "coverage_note": str(r.get("coverage_note") or ""),
                "version": str(r.get("version") or "Harmonised-v1"),
            })

        payload = {
            "metadata": {
                "dataset_name": "FIREINTEL Harmonised Satellite Hotspot Observations",
                "study_region": "Uttarakhand & Regional Northern India",
                "scope": scope,
                "export_timestamp": timestamp_iso,
                "record_count": len(export_records),
                "crs": "EPSG:4326 (WGS84)",
                "source_instruments": ["MODIS (Terra/Aqua)", "VIIRS (Suomi-NPP)"],
                "spatial_boundary": "Survey of India Administrative Boundary (Uttarakhand) + Regional Bounding Box [28N-31N, 77E-81E]",
                "applied_filters": applied_filters,
                "scientific_limitations": [
                    "Satellite detections are radiometric pixel observations, not confirmed unique wildfire incident perimeters.",
                    "FRP represents instantaneous Fire Radiative Power in Megawatts (MW), not total burned area.",
                    "Northern India bounding box [28N-31N, 77E-81E] truncates alpine fire observations in northern Uttarakhand above 31N.",
                    "Acquisition dates are verified only for 2025 matches; historical multi-year records retain NULL date."
                ]
            },
            "records": export_records,
        }

        filename = f"{base_filename}.json"
        return Response(
            content=json.dumps(payload, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache",
            }
        )

    # -------------------------------------------------------------------------
    # FORMAT C: GEOJSON FEATURECOLLECTION (EPSG:4326 / [lon, lat])
    # -------------------------------------------------------------------------
    elif fmt == "geojson":
        features = []
        for r in records:
            lon = round(float(r["longitude"]), 5)
            lat = round(float(r["latitude"]), 5)
            time_int = int(r.get("acq_time") or 0) if r.get("acq_time") else None
            time_str = f"{time_int:04d}" if time_int is not None else None
            acq_d = str(r["acq_date"]) if r.get("acq_date") else None
            acq_dt = str(r["acq_datetime_iso"]) if r.get("acq_datetime_iso") else None

            conf_raw = str(r.get("confidence") or "").strip()
            conf_cat = r.get("confidence_label") or "Nominal"

            det_type = int(r.get("type") or 0)
            det_desc = r.get("type_label") or TYPE_DESCRIPTIONS.get(det_type, "Presumed vegetation fire")

            features.append({
                "type": "Feature",
                "id": int(r["obs_id"]),
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],  # OGC RFC 7946 Standard: [longitude, latitude]
                },
                "properties": {
                    "obs_id": int(r["obs_id"]),
                    "latitude": lat,
                    "longitude": lon,
                    "in_uttarakhand": bool(r.get("in_uttarakhand")),
                    "decoded_month": int(r["decoded_month"]),
                    "decoded_hour": int(r["decoded_hour"]),
                    "season": str(r["season"]),
                    "acq_date": acq_d,
                    "acq_time": time_str,
                    "acq_datetime": acq_dt,
                    "date_verified_2025": bool(r.get("date_verified_2025")),
                    "satellite": str(r["satellite"]),
                    "instrument": str(r["instrument"]),
                    "sensor": str(r["sensor"]),
                    "frp_mw": round(float(r["frp"]), 2),
                    "brightness_kelvin": round(float(r["brightness"]), 2),
                    "bright_t31_kelvin": round(float(r["bright_t31"]), 2) if r.get("bright_t31") is not None else None,
                    "scan_km": round(float(r["scan"]), 2),
                    "track_km": round(float(r["track"]), 2),
                    "confidence": conf_raw,
                    "confidence_category": conf_cat,
                    "daynight": str(r["daynight"]),
                    "detection_type": det_type,
                    "detection_description": det_desc,
                    "coverage_note": str(r.get("coverage_note") or ""),
                    "version": str(r.get("version") or "Harmonised-v1"),
                }
            })

        geojson_payload = {
            "type": "FeatureCollection",
            "metadata": {
                "dataset_name": "FIREINTEL Harmonised Satellite Hotspot Observations",
                "crs": "urn:ogc:def:crs:OGC:1.3:CRS84",
                "export_timestamp": timestamp_iso,
                "scope": scope,
                "record_count": len(features),
                "region": "Uttarakhand & Regional Northern India",
                "applied_filters": applied_filters,
                "coordinate_convention": "[longitude, latitude] in EPSG:4326 (WGS84)",
                "scientific_notice": "Pixel observations != unique incidents. FRP in MW. Observations north of 31N truncated at source."
            },
            "features": features,
        }

        filename = f"{base_filename}.geojson"
        return Response(
            content=json.dumps(geojson_payload, indent=2),
            media_type="application/geo+json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache",
            }
        )
