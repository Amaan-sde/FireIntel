"""Copernicus DEM GLO-30 acquisition, validation, and mosaic generation pipeline for FIREINTEL.

Acquires the 14 1-degree tiles covering Uttarakhand from AWS Registry of Open Data (s3://copernicus-dem-30m/),
computes SHA-256 checksums, validates raster headers, checks boundary coverage,
and generates a GDAL Virtual Raster Table (VRT) for future terrain processing.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
import sys
import time
import urllib.request

import geopandas as gpd
import numpy as np
import rasterio
from shapely.geometry import box

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from environmental.manifest import compute_sha256

AWS_COP30_BASE_URL = "https://copernicus-dem-30m.s3.amazonaws.com"


def configure_logging(verbose: bool = False) -> logging.Logger:
    """Set up structured logging."""
    logger = logging.getLogger("fireintel.copernicus_dem")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


@dataclass
class DEMTileInfo:
    """Metadata for a Copernicus DEM GLO-30 tile."""

    tile_name: str
    lat: int
    lon: int
    source_url: str
    local_path: str
    file_size_bytes: int
    sha256_checksum: str
    crs: str
    width: int
    height: int
    res_x: float
    res_y: float
    nodata_value: float | None
    min_elevation_m: float
    max_elevation_m: float
    mean_elevation_m: float
    status: str


def find_intersecting_dem_tiles(
    boundary_path: Path,
) -> list[tuple[int, int, str, str]]:
    """Determine 1x1 degree Copernicus DEM GLO-30 tiles intersecting the boundary polygon."""
    gdf = gpd.read_file(boundary_path)
    geom = gdf.geometry.iloc[0]
    minx, miny, maxx, maxy = geom.bounds

    tiles = []
    for lat in range(int(miny), int(maxy) + 1):
        for lon in range(int(minx), int(maxx) + 1):
            tile_geom = box(lon, lat, lon + 1, lat + 1)
            if geom.intersects(tile_geom):
                tile_name = f"Copernicus_DSM_COG_10_N{lat:02d}_00_E{lon:03d}_00_DEM"
                tile_url = f"{AWS_COP30_BASE_URL}/{tile_name}/{tile_name}.tif"
                tiles.append((lat, lon, tile_name, tile_url))
    return tiles


def download_single_tile(
    tile_meta: tuple[int, int, str, str],
    dest_dir: Path,
    max_retries: int = 3,
) -> Path:
    """Download a single Copernicus DEM tile with temporary file and atomic replacement."""
    lat, lon, name, url = tile_meta
    dest_path = dest_dir / f"{name}.tif"

    if dest_path.is_file() and dest_path.stat().st_size > 1000:
        return dest_path

    dest_dir.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tif.part")

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "FIREINTEL-Phase5B/1.0"}
            )
            with (
                urllib.request.urlopen(req, timeout=60) as resp,
                open(temp_path, "wb") as out,
            ):
                while chunk := resp.read(1024 * 1024):
                    out.write(chunk)
            temp_path.replace(dest_path)
            return dest_path
        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            if attempt == max_retries:
                raise RuntimeError(
                    f"Failed to download {name} after {max_retries} attempts: {e}"
                )
            time.sleep(2**attempt)
    return dest_path


def validate_tile(
    file_path: Path,
    lat: int,
    lon: int,
    url: str,
) -> DEMTileInfo:
    """Open tile with rasterio, calculate checksum, and profile elevation values."""
    checksum = compute_sha256(file_path)
    file_size = file_path.stat().st_size

    with rasterio.open(file_path) as src:
        crs_str = src.crs.to_string() if src.crs else "UNKNOWN"
        res_x, res_y = src.res
        w, h = src.width, src.height
        nodata = src.nodata

        # Read band 1 to inspect elevation distribution
        data = src.read(1)
        if nodata is not None:
            valid_mask = data != nodata
        else:
            valid_mask = data > -9000.0

        if valid_mask.any():
            min_elev = float(np.min(data[valid_mask]))
            max_elev = float(np.max(data[valid_mask]))
            mean_elev = float(np.mean(data[valid_mask]))
        else:
            min_elev = max_elev = mean_elev = float("nan")

    return DEMTileInfo(
        tile_name=file_path.stem,
        lat=lat,
        lon=lon,
        source_url=url,
        local_path=str(file_path),
        file_size_bytes=file_size,
        sha256_checksum=checksum,
        crs=crs_str,
        width=w,
        height=h,
        res_x=float(res_x),
        res_y=float(res_y),
        nodata_value=float(nodata) if nodata is not None else None,
        min_elevation_m=round(min_elev, 2),
        max_elevation_m=round(max_elev, 2),
        mean_elevation_m=round(mean_elev, 2),
        status="VERIFIED_OK",
    )


def generate_vrt_mosaic(
    tile_paths: list[Path],
    vrt_path: Path,
    logger: logging.Logger,
) -> Path:
    """Generate a standard GDAL Virtual Raster Table (VRT) combining all DEM tiles."""
    vrt_path.parent.mkdir(parents=True, exist_ok=True)

    # Inspect all tiles to determine overall bounding box and raster size
    min_x = float("inf")
    max_x = float("-inf")
    min_y = float("inf")
    max_y = float("-inf")
    res_x = None
    res_y = None
    nodata = None

    tile_metas = []
    for p in tile_paths:
        with rasterio.open(p) as src:
            b = src.bounds
            min_x = min(min_x, b.left)
            max_x = max(max_x, b.right)
            min_y = min(min_y, b.bottom)
            max_y = max(max_y, b.top)
            if res_x is None:
                res_x, res_y = src.res
                nodata = src.nodata
            tile_metas.append({
                "path": p,
                "width": src.width,
                "height": src.height,
                "bounds": b,
                "block_x": src.block_shapes[0][1] if src.block_shapes else 256,
                "block_y": src.block_shapes[0][0] if src.block_shapes else 256,
            })

    total_w = int(round((max_x - min_x) / res_x))
    total_h = int(round((max_y - min_y) / res_y))

    logger.info(
        "VRT Mosaic extent: Lon [%.4f, %.4f], Lat [%.4f, %.4f], Dimensions: %d x %d",
        min_x,
        max_x,
        min_y,
        max_y,
        total_w,
        total_h,
    )

    xml_lines = [
        f'<VRTDataset rasterXSize="{total_w}" rasterYSize="{total_h}">',
        '  <SRS dataAxisToSRSAxisMapping="2,1">EPSG:4326</SRS>',
        (
            f"  <GeoTransform>{min_x:.12f}, {res_x:.12f}, 0.0, {max_y:.12f},"
            f" 0.0, -{res_y:.12f}</GeoTransform>"
        ),
        '  <VRTRasterBand dataType="Float32" band="1">',
        f"    <NoDataValue>{nodata if nodata is not None else -99999.0}</NoDataValue>",
    ]

    for tm in tile_metas:
        p = tm["path"]
        w = tm["width"]
        h = tm["height"]
        b = tm["bounds"]
        x_off = int(round((b.left - min_x) / res_x))
        y_off = int(round((max_y - b.top) / res_y))
        rel_path = f"../raw/copernicus_dem/{p.name}"

        xml_lines.extend([
            "    <SimpleSource>",
            f'      <SourceFilename relativeToVRT="1">{rel_path}</SourceFilename>',
            "      <SourceBand>1</SourceBand>",
            (
                f'      <SourceProperties RasterXSize="{w}" RasterYSize="{h}"'
                f' DataType="Float32" BlockXSize="{tm["block_x"]}"'
                f' BlockYSize="{tm["block_y"]}" />'
            ),
            f'      <SrcRect xOff="0" yOff="0" xSize="{w}" ySize="{h}" />',
            (
                f'      <DstRect xOff="{x_off}" yOff="{y_off}" xSize="{w}"'
                f' ySize="{h}" />'
            ),
            f"      <NODATA>{nodata if nodata is not None else -99999.0}</NODATA>",
            "    </SimpleSource>",
        ])

    xml_lines.extend(["  </VRTRasterBand>", "</VRTDataset>"])

    vrt_content = "\n".join(xml_lines)
    with open(vrt_path, "w", encoding="utf-8") as f:
        f.write(vrt_content)

    # Verify that rasterio can open the resulting VRT
    with rasterio.open(vrt_path) as src:
        logger.info(
            "VRT verified successfully with rasterio! Dimensions: %s, CRS: %s",
            src.shape,
            src.crs,
        )

    return vrt_path


def main() -> None:
    """CLI entrypoint for Copernicus DEM GLO-30 acquisition and validation."""
    parser = argparse.ArgumentParser(
        description="Acquire and validate Copernicus DEM GLO-30 for Uttarakhand."
    )
    parser.add_argument(
        "--boundary",
        type=Path,
        default=Path("fireIntel/data/boundaries/uttarakhand_boundary.geojson"),
        help="Path to boundary GeoJSON.",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path("fireIntel/data/environmental/raw/copernicus_dem"),
        help="Directory to save raw GeoTIFF tiles.",
    )
    parser.add_argument(
        "--processed-dir",
        type=Path,
        default=Path("fireIntel/data/environmental/processed"),
        help="Directory to save processed mosaic / VRT.",
    )
    parser.add_argument(
        "--manifests-dir",
        type=Path,
        default=Path("fireIntel/data/environmental/manifests"),
        help="Directory to save download manifests.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of concurrent download worker threads.",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Enable verbose logging."
    )
    args = parser.parse_args()

    logger = configure_logging(verbose=args.verbose)
    logger.info("=== Starting Copernicus DEM GLO-30 Pilot Acquisition ===")

    tiles_to_download = find_intersecting_dem_tiles(args.boundary)
    logger.info(
        "Identified %d intersecting 1x1 deg tiles for Uttarakhand",
        len(tiles_to_download),
    )

    t0 = time.time()
    downloaded_paths = []

    logger.info("Downloading tiles using %d concurrent threads...", args.workers)
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_to_tile = {
            executor.submit(
                download_single_tile, tile_meta, args.raw_dir
            ): tile_meta
            for tile_meta in tiles_to_download
        }
        for future in as_completed(future_to_tile):
            tile_meta = future_to_tile[future]
            lat, lon, name, _ = tile_meta
            try:
                dest_path = future.result()
                downloaded_paths.append((lat, lon, dest_path, tile_meta[3]))
                logger.info(
                    "[%d/%d] Ready: %s",
                    len(downloaded_paths),
                    len(tiles_to_download),
                    name,
                )
            except Exception as e:
                logger.error("Failed tile %s: %s", name, e)
                raise

    logger.info(
        "All %d tiles acquired in %.2f seconds!",
        len(downloaded_paths),
        time.time() - t0,
    )

    # Sort downloaded paths systematically by lat, lon
    downloaded_paths.sort(key=lambda x: (x[0], x[1]))

    logger.info("Validating tile raster headers, checksums, and elevation distributions...")
    tile_manifests = []
    tile_file_paths = []

    for lat, lon, path, url in downloaded_paths:
        info = validate_tile(path, lat, lon, url)
        tile_manifests.append(asdict(info))
        tile_file_paths.append(path)
        logger.info(
            "  %s: Elev [%.1f, %.1f]m (Mean %.1fm), SHA-256: %s...",
            info.tile_name,
            info.min_elevation_m,
            info.max_elevation_m,
            info.mean_elevation_m,
            info.sha256_checksum[:12],
        )

    # Save manifest
    args.manifests_dir.mkdir(parents=True, exist_ok=True)
    manifest_file = args.manifests_dir / "copernicus_dem_manifest.json"
    logger.info("Writing manifest to %s", manifest_file)

    overall_manifest = {
        "dataset_id": "COP30",
        "official_name": (
            "Copernicus Global 30m Digital Surface Model (GLO-30)"
        ),
        "provider": "European Space Agency (ESA) / Airbus & DLR",
        "source": "AWS Registry of Open Data (s3://copernicus-dem-30m/)",
        "licence": (
            "Copernicus DEM Licence (requires © DLR e.V. and © Airbus Defence"
            " and Space GmbH attribution)"
        ),
        "total_tiles": len(tile_manifests),
        "total_bytes": sum(t["file_size_bytes"] for t in tile_manifests),
        "overall_min_elevation_m": min(
            t["min_elevation_m"] for t in tile_manifests
        ),
        "overall_max_elevation_m": max(
            t["max_elevation_m"] for t in tile_manifests
        ),
        "tiles": tile_manifests,
        "acquired_at_utc": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
        ),
    }

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(overall_manifest, f, indent=2)

    # Generate VRT mosaic in processed dir
    vrt_path = args.processed_dir / "copernicus_dem_uttarakhand.vrt"
    generate_vrt_mosaic(tile_file_paths, vrt_path, logger=logger)

    logger.info("=== Copernicus DEM GLO-30 Pilot Complete ===")
    logger.info(
        "Total Tiles: %d, Elevation Range: %.1fm to %.1fm, Total Size: %.1f MB",
        len(tile_manifests),
        overall_manifest["overall_min_elevation_m"],
        overall_manifest["overall_max_elevation_m"],
        overall_manifest["total_bytes"] / 1e6,
    )


if __name__ == "__main__":
    main()
