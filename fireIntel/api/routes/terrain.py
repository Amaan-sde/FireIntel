"""
Terrain and geomorphology routes querying master grid and Copernicus DEM features.
"""

from fastapi import APIRouter, HTTPException, Query
from fireIntel.api.db import DuckDBManager
from pathlib import Path
import json

router = APIRouter(prefix="/terrain", tags=["Terrain & Geomorphology"])

TERRAIN_GRID_JSON = Path(__file__).resolve().parent.parent.parent / "data" / "environmental" / "processed" / "terrain_grid_web.json"

@router.get("/geojson")
def get_terrain_grid_geojson():
    """Serves the 2,174-cell master analysis grid with pre-joined DEM zonal features."""
    if not TERRAIN_GRID_JSON.exists():
        raise HTTPException(status_code=404, detail="Terrain grid JSON not found")
    with open(TERRAIN_GRID_JSON, "r") as f:
        data = json.load(f)
    return data

@router.get("/cell/{cell_id}")
def get_cell_terrain_detail(cell_id: str):
    """Returns detailed 25 geomorphometric parameters for an individual master grid cell."""
    sql = """
        SELECT 
            g.grid_cell_id, g.centroid_lat, g.centroid_lon, g.era5_parent_cell_id,
            d.elevation_mean_m, d.elevation_min_m, d.elevation_max_m, d.elevation_std_m,
            d.slope_mean_deg, d.slope_max_deg, d.aspect_mean_deg, d.aspect_sin_mean, d.aspect_cos_mean,
            d.terrain_roughness_tri_mean, d.terrain_roughness_tri_max,
            d.dem_pixel_count, d.dem_valid_pixel_count, d.dem_nodata_count,
            d.spatial_resolution_prov, d.met_spatial_resolution_prov
        FROM master_grid g
        JOIN dem_terrain d ON g.grid_cell_id = d.grid_cell_id
        WHERE g.grid_cell_id = ?
    """
    df, elapsed_ms = DuckDBManager.query(sql, [cell_id])
    if len(df) == 0:
        raise HTTPException(status_code=404, detail=f"Grid cell '{cell_id}' not found")
    record = df.to_dict(orient="records")[0]
    record["query_execution_ms"] = round(elapsed_ms, 2)
    return record

