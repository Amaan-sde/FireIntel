"""
Data preparation script for FIREINTEL frontend and API.
Converts boundary-validated fire CSV to Parquet and generates optimized summary JSON
with pre-indexed month and sensor attributes for instant WebGL filtering and reactive counts.
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np

def prepare_frontend_data(project_root: Path = None):
    if project_root is None:
        project_root = Path(__file__).resolve().parent.parent

    data_dir = project_root / "data"
    proc_dir = data_dir / "processed" / "boundary_validated"
    web_data_dir = project_root / "web" / "public" / "data"
    web_data_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Load boundary-validated fires
    fires_csv = proc_dir / "uttarakhand_fires_boundary.csv"
    if not fires_csv.exists():
        raise FileNotFoundError(f"Missing {fires_csv}")
    
    df_fires = pd.read_csv(fires_csv)
    print(f"Loaded {len(df_fires)} fire records from {fires_csv}")

    # Ensure acq_datetime is datetime
    df_fires["acq_datetime"] = pd.to_datetime(df_fires["acq_datetime"])
    df_fires["month"] = df_fires["acq_datetime"].dt.month
    df_fires["day_of_year"] = df_fires["acq_datetime"].dt.dayofyear
    
    # Save as Parquet
    fires_parquet = proc_dir / "uttarakhand_fires_boundary.parquet"
    df_fires.to_parquet(fires_parquet, index=False, engine="pyarrow")
    print(f"Exported Parquet: {fires_parquet} ({fires_parquet.stat().st_size / 1024:.1f} KB)")

    # 2. Compute Filter Matrix for instantaneous frontend count updates
    total_count = len(df_fires)
    modis_count = int((df_fires["sensor"] == "MODIS").sum())
    viirs_count = int((df_fires["sensor"] == "VIIRS").sum())
    
    # Monthly distribution by sensor
    month_names = {
        1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
    }

    monthly_matrix = {}
    for m in range(1, 13):
        m_df = df_fires[df_fires["month"] == m]
        m_modis = m_df[m_df["sensor"] == "MODIS"]
        m_viirs = m_df[m_df["sensor"] == "VIIRS"]
        monthly_matrix[str(m)] = {
            "month_num": m,
            "month_name": month_names[m],
            "total": len(m_df),
            "modis": len(m_modis),
            "viirs": len(m_viirs),
            "peak_frp": round(float(m_df["frp"].max()), 1) if len(m_df) > 0 else 0.0,
            "mean_frp": round(float(m_df["frp"].mean()), 2) if len(m_df) > 0 else 0.0,
        }

    monthly_series = [
        {"month_num": m, "month_name": month_names[m], "count": monthly_matrix[str(m)]["total"]}
        for m in range(1, 13)
    ]

    # Latitude bands
    s_mask = (df_fires["latitude"] >= 28.71) & (df_fires["latitude"] < 29.48)
    c_mask = (df_fires["latitude"] >= 29.48) & (df_fires["latitude"] < 30.25)
    n_mask = (df_fires["latitude"] >= 30.25) & (df_fires["latitude"] <= 31.46)
    
    lat_bands = [
        {"band": "South (28.71° - 29.48°N)", "code": "south", "count": int(s_mask.sum()), "pct": round(float(s_mask.sum() / total_count * 100), 2)},
        {"band": "Central (29.48° - 30.25°N)", "code": "central", "count": int(c_mask.sum()), "pct": round(float(c_mask.sum() / total_count * 100), 2)},
        {"band": "North (30.25° - 31.46°N)", "code": "north", "count": int(n_mask.sum()), "pct": round(float(n_mask.sum() / total_count * 100), 2)},
    ]

    # Load DEM terrain features if present
    dem_parquet = data_dir / "environmental" / "processed" / "dem_terrain_features_005deg.parquet"
    dem_summary = {}
    if dem_parquet.exists():
        df_dem = pd.read_parquet(dem_parquet)
        dem_summary = {
            "total_master_cells": len(df_dem),
            "elevation_raw_min_m": 129.0,
            "elevation_raw_max_m": 7804.0,
            "elevation_cell_mean_min_m": round(float(df_dem["elevation_mean_m"].min()), 1),
            "elevation_cell_mean_max_m": round(float(df_dem["elevation_mean_m"].max()), 1),
            "slope_mean_min_deg": round(float(df_dem["slope_mean_deg"].min()), 1),
            "slope_mean_max_deg": round(float(df_dem["slope_mean_deg"].max()), 1),
            "tri_mean_min_m": round(float(df_dem["terrain_roughness_tri_mean"].min()), 1),
            "tri_mean_max_m": round(float(df_dem["terrain_roughness_tri_mean"].max()), 1),
        }

    # Satellites & DayNight
    satellites = df_fires["satellite"].value_counts().to_dict()
    daynight = df_fires["daynight"].value_counts().to_dict()

    # Top extreme FRP events
    top_fires = df_fires.nlargest(60, "frp")[[
        "latitude", "longitude", "acq_date", "acq_time", "sensor", "satellite", 
        "frp", "brightness", "confidence", "daynight", "month"
    ]].to_dict(orient="records")

    summary_payload = {
        "metadata": {
            "title": "FIREINTEL Mission Control Telemetry",
            "study_period": "2025-01-01 to 2025-12-31",
            "region": "Uttarakhand, India",
            "boundary_area_km2": 53417.95,
            "generated_at": pd.Timestamp.now().isoformat(),
        },
        "overview": {
            "total_detections": total_count,
            "modis_detections": modis_count,
            "viirs_detections": viirs_count,
            "detection_ratio_viirs_modis": round(viirs_count / modis_count, 4),
            "peak_frp_mw": float(df_fires["frp"].max()),
            "mean_frp_mw": round(float(df_fires["frp"].mean()), 2),
            "median_frp_mw": round(float(df_fires["frp"].median()), 2),
            "peak_date": str(df_fires["acq_date"].value_counts().index[0]),
            "peak_date_detections": int(df_fires["acq_date"].value_counts().iloc[0]),
            "pre_monsoon_apr_may_detections": monthly_matrix["4"]["total"] + monthly_matrix["5"]["total"],
            "pre_monsoon_apr_may_pct": round((monthly_matrix["4"]["total"] + monthly_matrix["5"]["total"]) / total_count * 100, 2),
            "pre_monsoon_season_mar_jun_pct": round((monthly_matrix["3"]["total"] + monthly_matrix["4"]["total"] + monthly_matrix["5"]["total"] + monthly_matrix["6"]["total"]) / total_count * 100, 2),
            "winter_dec_detections": monthly_matrix["12"]["total"],
            "winter_dec_pct": round(monthly_matrix["12"]["total"] / total_count * 100, 2),
        },
        "monthly_matrix": monthly_matrix,
        "dem_summary": dem_summary,
        "satellites": satellites,
        "daynight": daynight,
        "monthly_series": monthly_series,
        "lat_bands": lat_bands,
        "recent_high_frp_alerts": top_fires
    }

    out_summary_proc = proc_dir / "mission_control_summary.json"
    out_summary_web = web_data_dir / "mission_control_summary.json"
    with open(out_summary_proc, "w") as f:
        json.dump(summary_payload, f, indent=2)
    with open(out_summary_web, "w") as f:
        json.dump(summary_payload, f, indent=2)
    print(f"Exported Mission Control summary JSON to {out_summary_web}")

    # Generate full verified GeoJSON containing ALL 7,541 boundary-validated observations
    # Sorted chronologically with integer month, day_of_year, scan footprint, and parsed confidence
    sorted_df = df_fires.sort_values("acq_datetime")
    features = []
    for idx, row in sorted_df.iterrows():
        conf_str = str(row["confidence"])
        conf_num = None
        if row["sensor"] == "MODIS":
            try:
                conf_num = int(conf_str)
            except (ValueError, TypeError):
                conf_num = None
        elif row["sensor"] == "VIIRS":
            # Map categorical confidence for comparative filtering if needed
            conf_num = {"l": 30, "n": 65, "h": 95}.get(conf_str.lower(), 50)

        features.append({
            "type": "Feature",
            "id": int(idx),
            "geometry": {
                "type": "Point",
                "coordinates": [round(float(row["longitude"]), 5), round(float(row["latitude"]), 5)]
            },
            "properties": {
                "id": int(idx),
                "sensor": str(row["sensor"]),
                "satellite": str(row["satellite"]),
                "frp": round(float(row["frp"]), 2),
                "brightness": round(float(row["brightness"]), 2),
                "bright_t31": round(float(row["bright_t31"]), 2) if pd.notna(row["bright_t31"]) else None,
                "scan": round(float(row["scan"]), 2) if pd.notna(row["scan"]) else None,
                "track": round(float(row["track"]), 2) if pd.notna(row["track"]) else None,
                "acq_date": str(row["acq_date"]),
                "acq_time": int(row["acq_time"]),
                "month": int(row["month"]),
                "day_of_year": int(row["day_of_year"]),
                "confidence": conf_str,
                "confidence_num": conf_num,
                "daynight": str(row["daynight"]),
            }
        })
    full_geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # Save to both sample_fires_for_web.json (for mission control compatibility) and uttarakhand_fires_2025.geojson
    for fname in ["sample_fires_for_web.json", "uttarakhand_fires_2025.geojson"]:
        out_proc = proc_dir / fname
        out_web = web_data_dir / fname
        with open(out_proc, "w") as f:
            json.dump(full_geojson, f)
        with open(out_web, "w") as f:
            json.dump(full_geojson, f)
        print(f"Exported {len(features)} fires to {out_web} ({out_web.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    prepare_frontend_data()
