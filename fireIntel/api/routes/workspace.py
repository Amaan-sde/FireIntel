"""
Terrain Intelligence Lab & Personal Geospatial Research Workspace Routes.
Supports custom bounding box, radius AOI, regional presets, comparative
spatial/temporal intelligence, and scientific research exports.
"""

from fastapi import APIRouter, Query, HTTPException, Body
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import math
from fireIntel.api.db import DuckDBManager

router = APIRouter(prefix="/workspace", tags=["Terrain Intelligence Lab"])

# Predefined Research Regions in Uttarakhand
RESEARCH_PRESETS = [
    {
        "id": "uttarakhand_state",
        "name": "Uttarakhand Study Area (Whole State)",
        "type": "state",
        "center": [79.25, 30.15],
        "bbox": [77.58, 28.71, 81.04, 31.46],
        "area_sqkm": 53483,
        "description": "Entire Survey of India boundary-validated Uttarakhand study area."
    },
    {
        "id": "nainital_division",
        "name": "Nainital Forest Division & Kumaon Lakes",
        "type": "district",
        "center": [79.46, 29.38],
        "radius_km": 25.0,
        "bbox": [79.20, 29.15, 79.70, 29.60],
        "area_sqkm": 1963,
        "description": "Dense moist-deciduous and oak-pine ecological transition zone with acute pre-monsoon fire vulnerability."
    },
    {
        "id": "corbett_tiger_reserve",
        "name": "Jim Corbett Reserve & Ramnagar Foothills",
        "type": "reserve",
        "center": [78.77, 29.53],
        "radius_km": 28.0,
        "bbox": [78.50, 29.30, 79.05, 29.75],
        "area_sqkm": 2463,
        "description": "Shivalik Sal forest belt with significant wildlife conservation value and early summer grass ignition risks."
    },
    {
        "id": "pauri_garhwal",
        "name": "Pauri Garhwal Pine Ridge",
        "type": "district",
        "center": [78.84, 29.87],
        "radius_km": 35.0,
        "bbox": [78.50, 29.60, 79.15, 30.15],
        "area_sqkm": 3848,
        "description": "Extensive chir pine (Pinus roxburghii) stands on steep south-facing slopes with extreme resinous fuel loads."
    },
    {
        "id": "dehradun_valley",
        "name": "Dehradun & Rajaji Valley Corridor",
        "type": "valley",
        "center": [78.03, 30.32],
        "radius_km": 25.0,
        "bbox": [77.70, 30.00, 78.35, 30.55],
        "area_sqkm": 1963,
        "description": "Inter-montane Doon Valley interface between urban settlements and protected Rajaji elephant corridors."
    },
    {
        "id": "chamoli_high_altitude",
        "name": "Chamoli High Altitude & Nanda Devi Buffer",
        "type": "alpine",
        "center": [79.33, 30.40],
        "radius_km": 40.0,
        "bbox": [79.00, 30.10, 80.00, 30.90],
        "area_sqkm": 5026,
        "description": "Subalpine birch-fir and timberline transition zone with low historical fire density but climate sensitivity."
    },
    {
        "id": "almora_ridge",
        "name": "Almora - Bageshwar Kumaon Mid-Hills",
        "type": "district",
        "center": [79.66, 29.60],
        "radius_km": 30.0,
        "bbox": [79.40, 29.40, 79.95, 29.85],
        "area_sqkm": 2827,
        "description": "Terraced agricultural valleys intermixed with chir pine community forests (Van Panchayats)."
    }
]

class SpatialAOI(BaseModel):
    mode: str = Field("preset", description="'preset', 'bbox', 'circle', or 'state'")
    preset_id: Optional[str] = "nainital_division"
    center_lat: Optional[float] = 29.38
    center_lon: Optional[float] = 79.46
    radius_km: Optional[float] = 25.0
    min_lat: Optional[float] = 29.15
    max_lat: Optional[float] = 29.60
    min_lon: Optional[float] = 79.20
    max_lon: Optional[float] = 79.70

class TemporalFilter(BaseModel):
    mode: str = Field("chronological", description="'chronological' (verified 2025 dates) or 'seasonal' (multi-year decoded months)")
    label: Optional[str] = "April 2025"
    start_date: Optional[str] = "2025-04-01"
    end_date: Optional[str] = "2025-04-30"
    start_month: Optional[int] = 4
    end_month: Optional[int] = 5
    season_id: Optional[str] = None

class WorkspaceCompareRequest(BaseModel):
    scope: str = Field("uttarakhand", description="'uttarakhand' or 'regional'")
    spatial_aoi: SpatialAOI
    baseline_temporal: TemporalFilter
    comparison_temporal: TemporalFilter
    sample_limit: Optional[int] = 400

def compute_aoi_area_sqkm(aoi: SpatialAOI) -> float:
    """Approximate the ground area of the selected AOI in square kilometers."""
    if aoi.mode == "state":
        return 53483.0
    if aoi.mode == "preset":
        found = next((p for p in RESEARCH_PRESETS if p["id"] == aoi.preset_id), None)
        if found:
            return float(found["area_sqkm"])
    if aoi.mode == "circle" and aoi.radius_km:
        return round(math.pi * (aoi.radius_km ** 2), 1)
    if aoi.mode == "bbox" and aoi.min_lat and aoi.max_lat and aoi.min_lon and aoi.max_lon:
        # 1 deg lat ~ 111 km, 1 deg lon at lat 30 ~ 96.5 km
        lat_dist = (aoi.max_lat - aoi.min_lat) * 111.0
        avg_lat_rad = math.radians((aoi.min_lat + aoi.max_lat) / 2.0)
        lon_dist = (aoi.max_lon - aoi.min_lon) * 111.0 * math.cos(avg_lat_rad)
        return round(abs(lat_dist * lon_dist), 1)
    return 1000.0

def build_spatial_clause(aoi: SpatialAOI) -> tuple[str, list]:
    conditions = []
    params = []

    if aoi.mode == "preset" and aoi.preset_id:
        found = next((p for p in RESEARCH_PRESETS if p["id"] == aoi.preset_id), None)
        if found and found.get("bbox"):
            bbox = found["bbox"]
            conditions.append("longitude >= ? AND longitude <= ? AND latitude >= ? AND latitude <= ?")
            params.extend([bbox[0], bbox[2], bbox[1], bbox[3]])
            return " AND ".join(conditions), params

    if aoi.mode == "circle" and aoi.center_lat is not None and aoi.center_lon is not None and aoi.radius_km:
        c_lat, c_lon, rad = aoi.center_lat, aoi.center_lon, aoi.radius_km
        # Haversine distance in km
        circle_expr = f"""
            (6371.0 * acos(
                least(1.0, greatest(-1.0,
                    cos(radians(?)) * cos(radians(latitude)) * 
                    cos(radians(longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(latitude))
                ))
            )) <= ?
        """
        conditions.append(circle_expr.strip())
        params.extend([c_lat, c_lon, c_lat, rad])
        return " AND ".join(conditions), params

    if aoi.mode == "bbox" and aoi.min_lat is not None and aoi.max_lat is not None and aoi.min_lon is not None and aoi.max_lon is not None:
        conditions.append("latitude >= ? AND latitude <= ? AND longitude >= ? AND longitude <= ?")
        params.extend([aoi.min_lat, aoi.max_lat, aoi.min_lon, aoi.max_lon])
        return " AND ".join(conditions), params

    # Default: inside Uttarakhand
    return "1=1", params

def build_temporal_clause(t: TemporalFilter) -> tuple[str, list]:
    conditions = []
    params = []

    if t.mode == "chronological":
        conditions.append("date_verified_2025 = true AND acq_date IS NOT NULL")
        if t.start_date:
            conditions.append("acq_date >= ?")
            params.append(t.start_date)
        if t.end_date:
            conditions.append("acq_date <= ?")
            params.append(t.end_date)
    else: # seasonal multi-year
        if t.start_month and t.end_month:
            if t.start_month <= t.end_month:
                conditions.append("decoded_month >= ? AND decoded_month <= ?")
                params.extend([t.start_month, t.end_month])
            else: # wrap around (e.g. Dec to Feb: 12, 1, 2)
                conditions.append("(decoded_month >= ? OR decoded_month <= ?)")
                params.extend([t.start_month, t.end_month])
        elif t.start_month:
            conditions.append("decoded_month = ?")
            params.append(t.start_month)

    return " AND ".join(conditions) if conditions else "1=1", params

def run_single_telemetry(table: str, spatial_sql: str, spatial_params: list, temp_sql: str, temp_params: list, sample_limit: int = 400):
    where_parts = []
    all_params = []

    if spatial_sql and spatial_sql != "1=1":
        where_parts.append(f"({spatial_sql})")
        all_params.extend(spatial_params)

    if temp_sql and temp_sql != "1=1":
        where_parts.append(f"({temp_sql})")
        all_params.extend(temp_params)

    where_str = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""

    summary_sql = f"""
        SELECT 
            count(*) as total_obs,
            count(CASE WHEN sensor = 'VIIRS' THEN 1 END) as viirs_count,
            count(CASE WHEN sensor = 'MODIS' THEN 1 END) as modis_count,
            count(CASE WHEN daynight = 'D' THEN 1 END) as day_count,
            count(CASE WHEN daynight = 'N' THEN 1 END) as night_count,
            count(CASE WHEN confidence_class = 'h' THEN 1 END) as high_conf_count,
            count(CASE WHEN confidence_class = 'n' THEN 1 END) as nominal_conf_count,
            count(CASE WHEN confidence_class = 'l' THEN 1 END) as low_conf_count,
            COALESCE(round(sum(frp), 2), 0.0) as total_frp_mw,
            COALESCE(round(avg(frp), 2), 0.0) as mean_frp,
            COALESCE(round(max(frp), 2), 0.0) as max_frp,
            min(latitude) as min_lat,
            max(latitude) as max_lat,
            min(longitude) as min_lon,
            max(longitude) as max_lon
        FROM {table}
        {where_str}
    """
    df, elapsed = DuckDBManager.query(summary_sql, all_params)
    row = df.to_dict(orient="records")[0]

    # Sample observation points for MapLibre rendering
    sample_sql = f"""
        SELECT 
            latitude, longitude, frp, brightness, sensor, satellite, daynight,
            confidence_class, decoded_month, decoded_hour, acq_date
        FROM {table}
        {where_str}
        ORDER BY frp DESC
        LIMIT {sample_limit}
    """
    df_pts, _ = DuckDBManager.query(sample_sql, all_params)
    pts = df_pts.to_dict(orient="records")

    features = []
    for p in pts:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(p["longitude"]), float(p["latitude"])]
            },
            "properties": {
                "frp": float(p["frp"]),
                "brightness": float(p["brightness"]),
                "sensor": str(p["sensor"]),
                "satellite": str(p["satellite"]),
                "daynight": str(p["daynight"]),
                "confidence": str(p["confidence_class"]),
                "month": int(p["decoded_month"]) if p["decoded_month"] is not None else None,
                "hour": int(p["decoded_hour"]) if p["decoded_hour"] is not None else None,
                "date": str(p["acq_date"]) if p["acq_date"] is not None else None
            }
        })

    geojson_collection = {
        "type": "FeatureCollection",
        "features": features
    }

    return {
        "total_obs": int(row["total_obs"]),
        "viirs_count": int(row["viirs_count"]),
        "modis_count": int(row["modis_count"]),
        "day_count": int(row["day_count"]),
        "night_count": int(row["night_count"]),
        "high_conf_count": int(row["high_conf_count"]),
        "nominal_conf_count": int(row["nominal_conf_count"]),
        "low_conf_count": int(row["low_conf_count"]),
        "total_frp_mw": float(row["total_frp_mw"]),
        "mean_frp": float(row["mean_frp"]),
        "max_frp": float(row["max_frp"]),
        "bbox": [
            float(row["min_lon"]) if row["min_lon"] is not None else 77.0,
            float(row["min_lat"]) if row["min_lat"] is not None else 28.0,
            float(row["max_lon"]) if row["max_lon"] is not None else 81.0,
            float(row["max_lat"]) if row["max_lat"] is not None else 31.0
        ],
        "geojson": geojson_collection
    }

@router.get("/presets")
def get_workspace_presets():
    """Returns curated geospatial research presets in Uttarakhand."""
    return {
        "status": "SUCCESS",
        "presets": RESEARCH_PRESETS
    }

@router.post("/compare")
def compare_workspace_regions(req: WorkspaceCompareRequest):
    """
    Executes empirical comparative spatial/temporal intelligence between
    a baseline period/AOI and a comparison period/AOI.
    """
    table = "fires_regional" if req.scope.lower() == "regional" else "fires"
    aoi_area = compute_aoi_area_sqkm(req.spatial_aoi)

    # 1. Build Spatial Clause
    spat_sql, spat_params = build_spatial_clause(req.spatial_aoi)

    # 2. Build Temporal Clauses
    base_t_sql, base_t_params = build_temporal_clause(req.baseline_temporal)
    comp_t_sql, comp_t_params = build_temporal_clause(req.comparison_temporal)

    # 3. Query Baseline
    b_data = run_single_telemetry(table, spat_sql, spat_params, base_t_sql, base_t_params, req.sample_limit or 400)

    # 4. Query Comparison
    c_data = run_single_telemetry(table, spat_sql, spat_params, comp_t_sql, comp_t_params, req.sample_limit or 400)

    # 5. Calculate Exact Differences with safe division
    diff_obs = c_data["total_obs"] - b_data["total_obs"]
    pct_obs = round((diff_obs / b_data["total_obs"] * 100.0), 1) if b_data["total_obs"] > 0 else (100.0 if c_data["total_obs"] > 0 else 0.0)

    diff_viirs = c_data["viirs_count"] - b_data["viirs_count"]
    pct_viirs = round((diff_viirs / b_data["viirs_count"] * 100.0), 1) if b_data["viirs_count"] > 0 else 0.0

    diff_modis = c_data["modis_count"] - b_data["modis_count"]
    pct_modis = round((diff_modis / b_data["modis_count"] * 100.0), 1) if b_data["modis_count"] > 0 else 0.0

    diff_frp_mean = round(c_data["mean_frp"] - b_data["mean_frp"], 2)
    diff_frp_total = round(c_data["total_frp_mw"] - b_data["total_frp_mw"], 1)

    base_density = round(b_data["total_obs"] / aoi_area, 3) if aoi_area > 0 else 0.0
    comp_density = round(c_data["total_obs"] / aoi_area, 3) if aoi_area > 0 else 0.0
    diff_density = round(comp_density - base_density, 3)

    # 6. Generate Deterministic Evidence-Based Findings (No AI Hallucinations)
    findings = []
    
    # Finding 1: Observation Volume & Spatial Shift
    if diff_obs > 0:
        findings.append({
            "type": "surge",
            "title": "Thermal Hotspot Volume Acceleration",
            "description": f"Thermal observations surged by +{diff_obs:,} detections (+{pct_obs}%) in the comparison period across the {aoi_area:,.0f} km² study area. Observation density increased from {base_density} to {comp_density} obs/km²."
        })
    elif diff_obs < 0:
        findings.append({
            "type": "quench",
            "title": "Thermal Anomaly Abatement",
            "description": f"Thermal observations declined by {abs(diff_obs):,} detections ({pct_obs}%) between baseline and comparison periods. Density eased by {diff_density} obs/km²."
        })
    else:
        findings.append({
            "type": "stable",
            "title": "Stable Thermal Observation Level",
            "description": f"Hotspot observations remained statistically constant at {b_data['total_obs']:,} across both periods."
        })

    # Finding 2: Radiometric Energy Release Dynamic
    if diff_frp_mean > 0.5:
        findings.append({
            "type": "energetic_rise",
            "title": "Elevated Radiant Heat Output",
            "description": f"Mean Fire Radiative Power (FRP) rose by +{diff_frp_mean} MW (from {b_data['mean_frp']} MW to {c_data['mean_frp']} MW), indicating higher instantaneous radiant heat release during satellite overpass."
        })
    elif diff_frp_mean < -0.5:
        findings.append({
            "type": "energetic_drop",
            "title": "Diminished Radiant Heat Output",
            "description": f"Mean FRP declined by {abs(diff_frp_mean)} MW (from {b_data['mean_frp']} MW to {c_data['mean_frp']} MW), indicating lower instantaneous combustion intensity."
        })

    # Finding 3: Multi-Sensor Resolution Footprint
    b_viirs_ratio = round((b_data["viirs_count"] / b_data["total_obs"] * 100), 1) if b_data["total_obs"] > 0 else 0.0
    c_viirs_ratio = round((c_data["viirs_count"] / c_data["total_obs"] * 100), 1) if c_data["total_obs"] > 0 else 0.0
    findings.append({
        "type": "sensor_footprint",
        "title": "Sensor Resolution & Footprint Sensitivity",
        "description": f"VIIRS 375m I-Band provided {c_viirs_ratio}% of total detections in the comparison period vs {b_viirs_ratio}% in baseline. VIIRS higher spatial resolution enables detection of smaller and cooler fires in rugged mountain terrain compared to MODIS 1km pixels."
    })

    return {
        "status": "SUCCESS",
        "scope": req.scope,
        "aoi": {
            "mode": req.spatial_aoi.mode,
            "area_sqkm": aoi_area,
            "center": [req.spatial_aoi.center_lon, req.spatial_aoi.center_lat] if req.spatial_aoi.center_lat else None,
            "radius_km": req.spatial_aoi.radius_km
        },
        "baseline": {
            "label": req.baseline_temporal.label or "Baseline Period",
            "mode": req.baseline_temporal.mode,
            "density_per_sqkm": base_density,
            "data": b_data
        },
        "comparison": {
            "label": req.comparison_temporal.label or "Comparison Period",
            "mode": req.comparison_temporal.mode,
            "density_per_sqkm": comp_density,
            "data": c_data
        },
        "deltas": {
            "abs_obs": diff_obs,
            "pct_obs": pct_obs,
            "abs_viirs": diff_viirs,
            "pct_viirs": pct_viirs,
            "abs_modis": diff_modis,
            "pct_modis": pct_modis,
            "abs_frp_mean": diff_frp_mean,
            "abs_frp_total": diff_frp_total,
            "abs_density": diff_density
        },
        "findings": findings,
        "scientific_disclosures": [
            "Satellite thermal anomalies do not equal individual wildfire incidents; multiple detections often trace a single moving fire perimeter.",
            "Fire Radiative Power (FRP) measures radiant heat release at the satellite overpass moment and does not prove crown fire severity without canopy structure data.",
            "Temporal date filtering is strictly executed against verified 2025 records; undated multi-year records are compared by decoded phenological month regimes."
        ]
    }

