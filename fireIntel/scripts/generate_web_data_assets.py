"""
FIREINTEL — Web Data Asset Generator
Generates optimized, high-fidelity web GeoJSON layers and syncs pre-rendered JSON summaries
from production/harmonised/ to web/public/data/ with complete backward compatibility.
"""

import json
import shutil
import pandas as pd
import numpy as np
from pathlib import Path

PROD_DIR = Path("fireIntel/data/production/harmonised")
WEB_DATA_DIR = Path("fireIntel/web/public/data")

def generate_web_assets():
    print("[WEB ASSET GENERATOR] Syncing production summaries to web/public/data/...")
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Sync mission_control_summary.json
    prod_summary = PROD_DIR / "mission_control_summary.json"
    web_summary = WEB_DATA_DIR / "mission_control_summary.json"
    shutil.copy2(prod_summary, web_summary)
    print(f"  Synced {web_summary} ({web_summary.stat().st_size:,} bytes)")

    # 2. Sync historical_analytics.json
    prod_analytics = PROD_DIR / "historical_analytics.json"
    web_analytics = WEB_DATA_DIR / "historical_analytics.json"
    shutil.copy2(prod_analytics, web_analytics)
    print(f"  Synced {web_analytics} ({web_analytics.stat().st_size:,} bytes)")

    # 3. Generate High-Fidelity Stratified Sample for Web Maps
    print("\n[WEB ASSET GENERATOR] Generating Stratified Web Vector Features...")
    uk_parquet = PROD_DIR / "uttarakhand_harmonised_fires.parquet"
    df_uk = pd.read_parquet(uk_parquet)
    print(f"  Loaded Uttarakhand production dataset: {len(df_uk):,} rows")

    # Take a representative stratified sample of 15,000 points:
    # Stratified across months (1-12) and sensors (VIIRS and MODIS)
    # Always include top 1,000 highest FRP observations
    top_frp_indices = set(df_uk.nlargest(1000, 'frp').index)

    # Sample remaining ~14,000 points proportionally across months
    remaining_indices = list(set(df_uk.index) - top_frp_indices)
    sample_size = min(14000, len(remaining_indices))
    
    # Stratified sampling by month
    sampled_remaining = df_uk.loc[remaining_indices].groupby('decoded_month', group_keys=False).apply(
        lambda x: x.sample(n=min(len(x), int(sample_size * len(x) / len(remaining_indices))), random_state=42)
    )

    combined_indices = sorted(list(top_frp_indices | set(sampled_remaining.index)))
    df_web = df_uk.loc[combined_indices].copy()
    print(f"  Created high-density stratified web sample: {len(df_web):,} observations")

    features = []
    for idx, (_, r) in enumerate(df_web.iterrows()):
        lon = round(float(r['longitude']), 5)
        lat = round(float(r['latitude']), 5)
        
        conf_cat = str(r['confidence_class']).lower()
        conf_num = 85 if conf_cat == 'h' else (65 if conf_cat == 'n' else 30)

        # Build feature properties
        props = {
            "id": idx,
            "sensor": str(r['sensor']),
            "satellite": str(r['satellite']),
            "frp": round(float(r['frp']), 2),
            "brightness": round(float(r['brightness']), 2),
            "bright_t31": round(float(r['bright_t31']), 2) if r.get('bright_t31') is not None else None,
            "scan": round(float(r['scan']), 2),
            "track": round(float(r['track']), 2),
            "month": int(r['decoded_month']),
            "decoded_month": int(r['decoded_month']),
            "decoded_hour": int(r['decoded_hour']),
            "season": str(r['season']),
            "day_of_year": int((r['decoded_month'] - 1) * 30 + 15), # representative mid-month day
            "confidence": conf_cat,
            "confidence_label": str(r['confidence_label']),
            "confidence_num": conf_num,
            "daynight": str(r['daynight']),
            "type": int(r['type']),
            "type_label": str(r['type_label']),
            "date_verified_2025": bool(r.get('date_verified_2025')),
            "acq_date": str(r['acq_date']) if not pd.isna(r.get('acq_date')) else None,
            "acq_time": str(r['acq_time']) if not pd.isna(r.get('acq_time')) else None,
            "coverage_note": str(r.get('coverage_note') or "")
        }

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": props
        })

    geojson_payload = {
        "type": "FeatureCollection",
        "metadata": {
            "dataset": "FIREINTEL Production Harmonised Satellite Hotspot Observations",
            "scope": "Uttarakhand Boundary-Validated Primary Baseline",
            "total_primary_observations": len(df_uk),
            "web_display_sample_features": len(features),
            "coverage_disclosure": "Restricted to 28°N–31°N, 77°E–81°E. Observations north of 31°N truncated at source; does not claim complete Uttarakhand coverage.",
            "scientific_notice": "Satellite thermal hotspot observations (not unique fire incidents). Unmatched dates are NULL."
        },
        "features": features
    }

    # Write both web sample files for complete client compatibility
    geojson_path = WEB_DATA_DIR / "uttarakhand_fires_2025.geojson"
    sample_json_path = WEB_DATA_DIR / "sample_fires_for_web.json"

    with open(geojson_path, "w") as f:
        json.dump(geojson_payload, f)
    print(f"  Saved: {geojson_path} ({geojson_path.stat().st_size:,} bytes)")

    with open(sample_json_path, "w") as f:
        json.dump(geojson_payload, f)
    print(f"  Saved: {sample_json_path} ({sample_json_path.stat().st_size:,} bytes)")

    print("\n[SUCCESS] Web Data Assets generated and synced successfully!")

if __name__ == "__main__":
    generate_web_assets()
