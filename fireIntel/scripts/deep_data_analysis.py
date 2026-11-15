import pandas as pd
import numpy as np
import json
import geopandas as gpd
from shapely.geometry import Point, shape
from pathlib import Path

file_path = Path("fireIntel/data/incoming/harmonised/final_consolidated_master.xlsx")
boundary_path = Path("fireIntel/data/boundaries/uttarakhand_boundary.geojson")

print("Loading dataset...")
df = pd.read_excel(file_path)
print(f"Loaded {len(df):,} rows.")

# 1. Geographic Bounds & Uttarakhand Spatial Intersection
print("\n--- 1. Geospatial Analysis ---")
min_lat, max_lat = df['latitude'].min(), df['latitude'].max()
min_lon, max_lon = df['longitude'].min(), df['longitude'].max()
print(f"Latitude range:  [{min_lat:.4f}, {max_lat:.4f}]")
print(f"Longitude range: [{min_lon:.4f}, {max_lon:.4f}]")

# Load Uttarakhand boundary
with open(boundary_path) as f:
    uk_geojson = json.load(f)
uk_polygon = shape(uk_geojson['features'][0]['geometry'])

# Check bounding box filter first (for fast filtering)
uk_minx, uk_miny, uk_maxx, uk_maxy = uk_polygon.bounds
print(f"Uttarakhand polygon bounds: Lon [{uk_minx:.4f}, {uk_maxx:.4f}], Lat [{uk_miny:.4f}, {uk_maxy:.4f}]")

# 2. Temporal Analysis: Cyclical Decoding
print("\n--- 2. Temporal Cyclical Decoding ---")
month_rad = np.arctan2(df['month_sin'], df['month_cos'])
month_rad = np.where(month_rad < 0, month_rad + 2*np.pi, month_rad)
df['decoded_month'] = np.round(month_rad / (2 * np.pi / 12)).astype(int)
df['decoded_month'] = df['decoded_month'].replace(0, 12)

print("Decoded Months distribution:")
month_counts = df['decoded_month'].value_counts().sort_index().to_dict()
for m, count in month_counts.items():
    print(f"  Month {m:2d}: {count:,} ({count/len(df)*100:.2f}%)")

# Decoded Hour
hour_rad = np.arctan2(df['hour_sin'], df['hour_cos'])
hour_rad = np.where(hour_rad < 0, hour_rad + 2*np.pi, hour_rad)
df['decoded_hour'] = np.round(hour_rad / (2 * np.pi / 24)).astype(int)
df['decoded_hour'] = df['decoded_hour'].replace(24, 0)

bbox_mask = (df['latitude'] >= uk_miny) & (df['latitude'] <= uk_maxy) & (df['longitude'] >= uk_minx) & (df['longitude'] <= uk_maxx)
df_bbox = df[bbox_mask].copy()
print(f"Rows within Uttarakhand Bounding Box: {len(df_bbox):,} ({len(df_bbox)/len(df)*100:.2f}%)")
print(f"Rows OUTSIDE Uttarakhand Bounding Box: {len(df) - len(df_bbox):,} ({(len(df)-len(df_bbox))/len(df)*100:.2f}%)")

gdf_bbox = gpd.GeoDataFrame(
    df_bbox,
    geometry=gpd.points_from_xy(df_bbox['longitude'], df_bbox['latitude']),
    crs="EPSG:4326"
)
inside_mask = gdf_bbox.geometry.within(uk_polygon)
uk_exact_count = inside_mask.sum()
print(f"Rows strictly INSIDE Uttarakhand Boundary Polygon: {uk_exact_count:,} ({uk_exact_count/len(df)*100:.2f}%)")
print(f"Rows OUTSIDE Uttarakhand Polygon: {len(df) - uk_exact_count:,} ({(len(df)-uk_exact_count)/len(df)*100:.2f}%)")

print("\nDecoded Hours distribution (top 10):")
print(df['decoded_hour'].value_counts().sort_index())

# Check Day/Night correlation with decoded hour
print("\nDay/Night vs Decoded Hour cross-tab:")
print(pd.crosstab(df['decoded_hour'], df['daynight']))

# 3. Sensor & Satellite breakdown
print("\n--- 3. Sensor & Satellite Breakdown ---")
print(pd.crosstab(df['sensor'], df['satellite']))

# 4. Confidence Class breakdown by Sensor
print("\n--- 4. Confidence Class Breakdown by Sensor ---")
print(pd.crosstab(df['sensor'], df['confidence_class'], normalize='index') * 100)
print(pd.crosstab(df['sensor'], df['confidence_class']))

# 5. Type column breakdown
print("\n--- 5. Type Breakdown ---")
print(df['type'].value_counts())
print(pd.crosstab(df['type'], df['sensor']))

# 6. FRP & Brightness Statistics
print("\n--- 6. FRP & Brightness Statistics ---")
print("All Data FRP:")
print(df['frp'].describe(percentiles=[0.25, 0.5, 0.75, 0.9, 0.95, 0.99]))

print("\nMODIS FRP:")
print(df[df['sensor'] == 'MODIS']['frp'].describe(percentiles=[0.5, 0.95, 0.99]))

print("\nVIIRS FRP:")
print(df[df['sensor'] == 'VIIRS']['frp'].describe(percentiles=[0.5, 0.95, 0.99]))

# 7. Comparison with existing production dataset (7,541 rows)
print("\n--- 7. Comparison with Existing Production Dataset ---")
prod_path = Path("fireIntel/data/processed/boundary_validated/uttarakhand_fires_boundary.parquet")
df_prod = pd.read_parquet(prod_path)
print(f"Existing Production Dataset rows: {len(df_prod):,}")
print(f"Existing Production Columns: {list(df_prod.columns)}")
print(f"Existing Production Date Range: {df_prod['acq_date'].min()} to {df_prod['acq_date'].max()}")
print(f"Existing Production Sensors: {df_prod['sensor'].value_counts().to_dict()}")

# Inside Uttarakhand subset statistics
df_uk = gdf_bbox[inside_mask].copy()
print(f"\nIncoming dataset subset INSIDE Uttarakhand: {len(df_uk):,} rows")
print(f"  Sensors in UK: {df_uk['sensor'].value_counts().to_dict()}")
print(f"  Satellites in UK: {df_uk['satellite'].value_counts().to_dict()}")
print(f"  Confidence in UK: {df_uk['confidence_class'].value_counts().to_dict()}")
print(f"  Type in UK: {df_uk['type'].value_counts().to_dict()}")
print(f"  Decoded Months in UK: {df_uk['decoded_month'].value_counts().sort_index().to_dict()}")

# Save detailed deep analysis summary
results = {
    "total_rows": len(df),
    "latitude_bounds": [float(min_lat), float(max_lat)],
    "longitude_bounds": [float(min_lon), float(max_lon)],
    "rows_in_uk_bbox": int(len(df_bbox)),
    "rows_in_uk_polygon": int(uk_exact_count),
    "rows_outside_uk_polygon": int(len(df) - uk_exact_count),
    "sensors": {k: int(v) for k, v in df['sensor'].value_counts().items()},
    "satellites": {k: int(v) for k, v in df['satellite'].value_counts().items()},
    "confidence_classes": {k: int(v) for k, v in df['confidence_class'].value_counts().items()},
    "types": {int(k): int(v) for k, v in df['type'].value_counts().items()},
    "uk_sensors": {k: int(v) for k, v in df_uk['sensor'].value_counts().items()},
    "uk_confidence": {k: int(v) for k, v in df_uk['confidence_class'].value_counts().items()},
    "uk_months": {int(k): int(v) for k, v in df_uk['decoded_month'].value_counts().items()},
    "frp_stats": {
        "min": float(df['frp'].min()),
        "max": float(df['frp'].max()),
        "mean": float(df['frp'].mean()),
        "median": float(df['frp'].median()),
        "p95": float(df['frp'].quantile(0.95)),
        "p99": float(df['frp'].quantile(0.99))
    }
}

with open("fireIntel/data/incoming/harmonised/deep_analysis_summary.json", "w") as f:
    json.dump(results, f, indent=2)

print("\nDeep analysis script finished successfully!")

