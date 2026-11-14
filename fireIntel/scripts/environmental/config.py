"""Configuration and metadata schemas for FIREINTEL environmental data pipelines.

Phase 5A: Architecture, Scaffolding, and Specification.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class BoundingBox:
    """Bounding box in EPSG:4326 geographic coordinates."""

    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

    def to_cds_area(self) -> list[float]:
        """Convert to CDS API area convention [North, West, South, East]."""
        return [self.max_lat, self.min_lon, self.min_lat, self.max_lon]


# Verified Uttarakhand Bounding Box from Boundary Polygon
UTTARAKHAND_BBOX = BoundingBox(
    min_lon=77.57230026174163,
    min_lat=28.722894906447042,
    max_lon=81.04528735631932,
    max_lat=31.456126767118253,
)

# Buffered Bounding Box for regional ERA5-Land retrieval
ERA5_LAND_RETRIEVAL_BBOX = BoundingBox(
    min_lon=77.5,
    min_lat=28.7,
    max_lon=81.1,
    max_lat=31.5,
)


@dataclass(frozen=True)
class GridConfig:
    """Master analysis grid configuration."""

    step_deg: float = 0.05
    origin_lon: float = 77.55
    origin_lat: float = 28.70
    geographic_crs: str = "EPSG:4326"
    metric_crs: str = "EPSG:32644"  # UTM Zone 44N


@dataclass(frozen=True)
class EnvironmentalPaths:
    """Standardized directory paths for environmental data tiers."""

    base_dir: Path = field(
        default_factory=lambda: Path("fireIntel/data/environmental")
    )
    raw_dir: Path = field(
        default_factory=lambda: Path("fireIntel/data/environmental/raw")
    )
    intermediate_dir: Path = field(
        default_factory=lambda: Path("fireIntel/data/environmental/intermediate")
    )
    processed_dir: Path = field(
        default_factory=lambda: Path("fireIntel/data/environmental/processed")
    )
    metadata_dir: Path = field(
        default_factory=lambda: Path("fireIntel/data/environmental/metadata")
    )
    manifests_dir: Path = field(
        default_factory=lambda: Path("fireIntel/data/environmental/manifests")
    )
    boundary_file: Path = field(
        default_factory=lambda: Path(
            "fireIntel/data/boundaries/uttarakhand_boundary.geojson"
        )
    )


# Standard core variables for ERA5-Land download requests
ERA5_LAND_CORE_VARIABLES: tuple[str, ...] = (
    "2m_temperature",
    "2m_dewpoint_temperature",
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "total_precipitation",
    "volumetric_soil_water_layer_1",
    "volumetric_soil_water_layer_2",
    "volumetric_soil_water_layer_3",
    "volumetric_soil_water_layer_4",
)

# MODIS Vegetation Index layers requested via AppEEARS
MODIS_VI_LAYERS: tuple[str, ...] = (
    "_250m_16_days_NDVI",
    "_250m_16_days_EVI",
    "_250m_16_days_VI_Quality",
    "_250m_16_days_pixel_reliability",
    "_250m_16_days_composite_day_of_the_year",
)

