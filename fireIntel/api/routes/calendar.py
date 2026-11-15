"""
Calendar and phenological burning activity routes for FIREINTEL.
Provides daily time-series, monthly aggregations, seasonal regimes,
and observation inspection over verified 2025 acquisitions and
multi-year phenological baselines via DuckDB.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from fireIntel.api.db import DuckDBManager
import datetime

router = APIRouter(prefix="/calendar", tags=["Burning Activity Calendar"])

@router.get("/summary")
def get_calendar_summary(
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' or 'regional'")
):
    """
    Returns calendar telemetry metadata including total verified 2025 observations,
    active burning days, peak activity dates, and seasonal distributions.
    """
    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"
    total_baseline = 510299 if scope and scope.lower() == "regional" else 240365
    verified_target = 11904 if scope and scope.lower() == "regional" else 7245

    sql = f"""
        SELECT 
            count(CASE WHEN date_verified_2025 = true THEN 1 END) as verified_2025_obs,
            count(distinct CASE WHEN date_verified_2025 = true THEN acq_date END) as active_days,
            count(*) as total_obs,
            count(CASE WHEN acq_date IS NULL THEN 1 END) as undated_obs,
            COALESCE(round(sum(CASE WHEN date_verified_2025 = true THEN frp END), 2), 0.0) as verified_2025_frp_mw,
            COALESCE(round(avg(CASE WHEN date_verified_2025 = true THEN frp END), 2), 0.0) as verified_2025_avg_frp,
            COALESCE(round(max(CASE WHEN date_verified_2025 = true THEN frp END), 2), 0.0) as verified_2025_max_frp
        FROM {table_name}
    """
    df, elapsed_ms = DuckDBManager.query(sql)
    row = df.to_dict(orient="records")[0]

    # Find peak fire day in 2025
    sql_peak = f"""
        SELECT 
            acq_date,
            count(*) as daily_obs,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp,
            COALESCE(round(max(frp), 2), 0.0) as max_frp
        FROM {table_name}
        WHERE date_verified_2025 = true AND acq_date IS NOT NULL
        GROUP BY acq_date
        ORDER BY daily_obs DESC
        LIMIT 1
    """
    df_peak, _ = DuckDBManager.query(sql_peak)
    peak_row = df_peak.to_dict(orient="records")[0] if not df_peak.empty else {}

    return {
        "status": "SUCCESS",
        "scope": scope,
        "query_latency_ms": round(elapsed_ms, 2),
        "total_baseline_observations": total_baseline,
        "verified_2025_observations": int(row["verified_2025_obs"]),
        "undated_historical_observations": int(row["undated_obs"]),
        "active_burning_days_2025": int(row["active_days"]),
        "verified_2025_frp_mw": float(row["verified_2025_frp_mw"]),
        "verified_2025_avg_frp": float(row["verified_2025_avg_frp"]),
        "verified_2025_max_frp": float(row["verified_2025_max_frp"]),
        "peak_day_2025": peak_row,
        "scientific_integrity_note": "Multi-year records without verified acquisition dates (498k regional, 233k UK) are kept NULL to prevent false temporal reconstruction."
    }

@router.get("/daily")
def get_daily_calendar(
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' or 'regional'"),
    year: int = Query(2025, description="Year to query (only 2025 contains verified daily dates)"),
    sensor: Optional[str] = Query(None, description="Sensor filter: 'VIIRS', 'MODIS', or 'ALL'"),
    daynight: Optional[str] = Query(None, description="Overpass filter: 'D' (Day) or 'N' (Night)"),
    min_frp: Optional[float] = Query(None, ge=0, description="Minimum FRP threshold"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Specific month filter 1-12"),
    season: Optional[str] = Query(None, description="Seasonal regime filter")
):
    """
    Returns daily fire activity for the requested year (2025).
    If a non-2025 year is requested, returns an empty calendar with an explicit scientific notice.
    """
    if year != 2025:
        return {
            "status": "EMPTY",
            "year": year,
            "scope": scope,
            "count": 0,
            "days": [],
            "scientific_notice": f"Chronological daily records are only available for 2025. Historical multi-year records have omitted acquisition years and are explored through the Multi-Year Phenological Matrix."
        }

    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"
    conditions = ["date_verified_2025 = true", "acq_date IS NOT NULL"]
    params = []

    if sensor and sensor.upper() != "ALL":
        conditions.append("sensor = ?")
        params.append(sensor.upper())

    if daynight and daynight.upper() != "ALL":
        conditions.append("daynight = ?")
        params.append(daynight.upper())

    if min_frp is not None and min_frp > 0:
        conditions.append("frp >= ?")
        params.append(float(min_frp))

    if month is not None:
        conditions.append("decoded_month = ?")
        params.append(int(month))

    if season and season.upper() != "ALL":
        s_clean = season.strip().lower().replace("-", "_").replace(" ", "_")
        if s_clean in ("pre_monsoon", "pre_monsoon_peak", "peak_wildfire"):
            conditions.append("decoded_month IN (4, 5)")
        elif s_clean in ("post_monsoon", "post_monsoon_agricultural"):
            conditions.append("decoded_month IN (10, 11)")
        elif s_clean in ("winter", "winter_biomass_burning"):
            conditions.append("decoded_month IN (12, 1, 2, 3)")
        elif s_clean in ("monsoon", "monsoon_minimum"):
            conditions.append("decoded_month IN (6, 7, 8, 9)")

    where_clause = " AND ".join(conditions)

    sql = f"""
        SELECT 
            acq_date,
            decoded_month as month,
            count(*) as total_obs,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs_count,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis_count,
            count(CASE WHEN daynight = 'D' THEN 1 END) as day_count,
            count(CASE WHEN daynight = 'N' THEN 1 END) as night_count,
            COALESCE(round(avg(frp), 2), 0.0) as mean_frp,
            COALESCE(round(max(frp), 2), 0.0) as max_frp,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp
        FROM {table_name}
        WHERE {where_clause}
        GROUP BY acq_date, decoded_month
        ORDER BY acq_date ASC
    """

    df, elapsed_ms = DuckDBManager.query(sql, params)
    date_dict = {row["acq_date"]: row for row in df.to_dict(orient="records")}

    # Build standard 365-day calendar sequence
    start_date = datetime.date(2025, 1, 1)
    full_calendar = []
    total_matching = 0

    for i in range(365):
        d = start_date + datetime.timedelta(days=i)
        if month is not None and d.month != month:
            continue
        d_str = d.strftime("%Y-%m-%d")
        rec = date_dict.get(d_str, None)

        if rec:
            tot = int(rec["total_obs"])
            total_matching += tot
            sev = 1 if tot <= 10 else 2 if tot <= 40 else 3 if tot <= 100 else 4 if tot <= 250 else 5
            full_calendar.append({
                "date": d_str,
                "day_of_year": i + 1,
                "month": d.month,
                "day": d.day,
                "weekday": d.strftime("%a"),
                "total_obs": tot,
                "viirs_count": int(rec["viirs_count"]),
                "modis_count": int(rec["modis_count"]),
                "day_count": int(rec["day_count"]),
                "night_count": int(rec["night_count"]),
                "mean_frp": float(rec["mean_frp"]),
                "max_frp": float(rec["max_frp"]),
                "total_frp": float(rec["total_frp"]),
                "severity_level": sev,
                "has_data": True
            })
        else:
            full_calendar.append({
                "date": d_str,
                "day_of_year": i + 1,
                "month": d.month,
                "day": d.day,
                "weekday": d.strftime("%a"),
                "total_obs": 0,
                "viirs_count": 0,
                "modis_count": 0,
                "day_count": 0,
                "night_count": 0,
                "mean_frp": 0.0,
                "max_frp": 0.0,
                "total_frp": 0.0,
                "severity_level": 0,
                "has_data": False
            })

    return {
        "status": "SUCCESS",
        "scope": scope,
        "year": year,
        "query_latency_ms": round(elapsed_ms, 2),
        "total_matching_observations": total_matching,
        "days_returned": len(full_calendar),
        "days": full_calendar
    }

@router.get("/phenology")
def get_calendar_phenology(
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' or 'regional'")
):
    """
    Returns monthly and seasonal distributions comparing the verified 2025 series
    against the complete multi-year phenological baseline (240k UK / 510k Regional).
    """
    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"

    sql_multi = f"""
        SELECT 
            decoded_month as month,
            count(*) as total_obs,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis,
            count(CASE WHEN daynight = 'D' THEN 1 END) as day_count,
            count(CASE WHEN daynight = 'N' THEN 1 END) as night_count,
            COALESCE(round(avg(frp), 2), 0.0) as mean_frp,
            COALESCE(round(max(frp), 2), 0.0) as max_frp,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp
        FROM {table_name}
        GROUP BY decoded_month
        ORDER BY decoded_month
    """
    df_multi, t_multi = DuckDBManager.query(sql_multi)

    sql_2025 = f"""
        SELECT 
            decoded_month as month,
            count(*) as total_obs,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis,
            count(CASE WHEN daynight = 'D' THEN 1 END) as day_count,
            count(CASE WHEN daynight = 'N' THEN 1 END) as night_count,
            COALESCE(round(avg(frp), 2), 0.0) as mean_frp,
            COALESCE(round(max(frp), 2), 0.0) as max_frp,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp
        FROM {table_name}
        WHERE date_verified_2025 = true
        GROUP BY decoded_month
        ORDER BY decoded_month
    """
    df_2025, t_2025 = DuckDBManager.query(sql_2025)

    return {
        "status": "SUCCESS",
        "scope": scope,
        "query_latency_ms": round(t_multi + t_2025, 2),
        "multi_year_monthly": df_multi.to_dict(orient="records"),
        "verified_2025_monthly": df_2025.to_dict(orient="records"),
        "scientific_integrity_note": "Multi-year records aggregate historical observations across seasons without fabricated annual timestamps."
    }

@router.get("/day-details")
def get_day_details(
    date: str = Query(..., description="Target date YYYY-MM-DD"),
    scope: str = Query("uttarakhand", description="Dataset scope: 'uttarakhand' or 'regional'"),
    limit: int = Query(50, le=500, description="Max observations to return")
):
    """
    Returns observation details and geospatial specimens for a specific calendar date.
    """
    table_name = "fires_regional" if scope and scope.lower() == "regional" else "fires"

    sql_summary = f"""
        SELECT 
            count(*) as total_obs,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs_count,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis_count,
            count(CASE WHEN daynight = 'D' THEN 1 END) as day_count,
            count(CASE WHEN daynight = 'N' THEN 1 END) as night_count,
            COALESCE(round(avg(frp), 2), 0.0) as mean_frp,
            COALESCE(round(max(frp), 2), 0.0) as max_frp,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp,
            min(latitude) as min_lat, max(latitude) as max_lat,
            min(longitude) as min_lon, max(longitude) as max_lon
        FROM {table_name}
        WHERE acq_date = ? AND date_verified_2025 = true
    """
    df_sum, _ = DuckDBManager.query(sql_summary, [date])
    summary = df_sum.to_dict(orient="records")[0]

    sql_records = f"""
        SELECT 
            latitude, longitude, brightness, scan, track, acq_date, acq_time,
            satellite, instrument, confidence, version, bright_t31, frp, daynight,
            type, sensor, decoded_month, decoded_hour, season, confidence_label,
            date_verified_2025
        FROM {table_name}
        WHERE acq_date = ? AND date_verified_2025 = true
        ORDER BY frp DESC
        LIMIT ?
    """
    df_rec, elapsed_ms = DuckDBManager.query(sql_records, [date, limit])

    return {
        "status": "SUCCESS",
        "date": date,
        "scope": scope,
        "query_latency_ms": round(elapsed_ms, 2),
        "summary": summary,
        "observations": df_rec.to_dict(orient="records")
    }

