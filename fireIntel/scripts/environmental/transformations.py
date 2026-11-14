"""Pure mathematical and thermodynamic transformations for FIREINTEL environmental data.

Implements Kelvin conversion, Magnus-Tetens saturation vapor pressure,
relative humidity, vapor pressure deficit, wind vector decomposition,
ERA5-Land precipitation de-accumulation, and spatiotemporal coordinate mapping.
"""

from __future__ import annotations

import math
import numpy as np
import pandas as pd

# Physical and thermodynamic constants
KELVIN_ZERO_CELSIUS: float = 273.15
MAGNUS_A_KPA: float = 0.61078  # Alduchov & Eskridge (1996) / Murray (1967)
MAGNUS_B: float = 17.27
MAGNUS_C_DEG: float = 237.3


def kelvin_to_celsius(
    kelvin: float | np.ndarray,
) -> float | np.ndarray:
    """Convert absolute temperature in Kelvin to degrees Celsius.

    Raises:
        ValueError: If input temperature is below absolute zero (0 K).
    """
    arr = np.asarray(kelvin)
    if np.any(arr < 0.0):
        raise ValueError(
            "Temperature cannot be below absolute zero (0.0 Kelvin)."
        )
    result = arr - KELVIN_ZERO_CELSIUS
    return float(result) if np.ndim(kelvin) == 0 else result


def saturation_vapor_pressure_kpa(
    temp_c: float | np.ndarray,
) -> float | np.ndarray:
    """Compute saturation vapor pressure over liquid water in kPa via Magnus-Tetens.

    Formula: e_s(T) = a * exp(b * T / (T + c))
    """
    t = np.asarray(temp_c, dtype=np.float64)
    es = MAGNUS_A_KPA * np.exp((MAGNUS_B * t) / (t + MAGNUS_C_DEG))
    return float(es) if np.ndim(temp_c) == 0 else es


def actual_vapor_pressure_kpa(
    dewpoint_c: float | np.ndarray,
) -> float | np.ndarray:
    """Compute actual vapor pressure in kPa from dewpoint temperature in Celsius.

    Formula: e_a(Td) = e_s(Td) = a * exp(b * Td / (Td + c))
    """
    return saturation_vapor_pressure_kpa(dewpoint_c)


def calculate_relative_humidity(
    temp_c: float | np.ndarray,
    dewpoint_c: float | np.ndarray,
) -> float | np.ndarray:
    """Calculate Relative Humidity (0 - 100%) from temperature and dewpoint in Celsius.

    Clamps output between 0.0% and 100.0% to guard against numerical noise.
    """
    t = np.asarray(temp_c, dtype=np.float64)
    td = np.asarray(dewpoint_c, dtype=np.float64)

    es = saturation_vapor_pressure_kpa(t)
    ea = saturation_vapor_pressure_kpa(td)

    # In nature ea <= es. Floating point noise or numerical artifacts may yield Td > T
    ratio = ea / np.maximum(es, 1e-7)
    rh = np.clip(100.0 * ratio, 0.0, 100.0)
    return float(rh) if np.ndim(temp_c) == 0 and np.ndim(dewpoint_c) == 0 else rh


def calculate_vapor_pressure_deficit(
    temp_c: float | np.ndarray,
    dewpoint_c: float | np.ndarray,
) -> float | np.ndarray:
    """Calculate Vapor Pressure Deficit (VPD) in kPa.

    Formula: VPD = e_s(T) - e_a(Td)
    """
    t = np.asarray(temp_c, dtype=np.float64)
    td = np.asarray(dewpoint_c, dtype=np.float64)

    es = saturation_vapor_pressure_kpa(t)
    ea = saturation_vapor_pressure_kpa(td)

    vpd = np.maximum(0.0, es - ea)
    return (
        float(vpd) if np.ndim(temp_c) == 0 and np.ndim(dewpoint_c) == 0 else vpd
    )


def calculate_wind_speed(
    u10: float | np.ndarray,
    v10: float | np.ndarray,
) -> float | np.ndarray:
    """Calculate horizontal wind speed in m/s from orthogonal u (eastward) and v (northward) components."""
    u = np.asarray(u10, dtype=np.float64)
    v = np.asarray(v10, dtype=np.float64)
    ws = np.sqrt(u**2 + v**2)
    return float(ws) if np.ndim(u10) == 0 and np.ndim(v10) == 0 else ws


def calculate_meteorological_wind_direction(
    u10: float | np.ndarray,
    v10: float | np.ndarray,
) -> float | np.ndarray:
    """Calculate meteorological wind direction in degrees [0, 360).

    Direction FROM which the wind is blowing, measured clockwise from North:
    - 0 deg (or 360 deg): Northerly (blowing from North toward South)
    - 90 deg: Easterly (blowing from East toward West)
    - 180 deg: Southerly (blowing from South toward North)
    - 270 deg: Westerly (blowing from West toward East)

    Formula: (270 - atan2(v, u) * 180 / pi) % 360
    """
    u = np.asarray(u10, dtype=np.float64)
    v = np.asarray(v10, dtype=np.float64)

    # Meteorological direction
    rad = np.arctan2(v, u)
    deg = (270.0 - np.degrees(rad)) % 360.0
    return float(deg) if np.ndim(u10) == 0 and np.ndim(v10) == 0 else deg


def normalize_wind_components(
    u10: float | np.ndarray,
    v10: float | np.ndarray,
) -> tuple[float | np.ndarray, float | np.ndarray]:
    """Normalize wind vector to unit components [-1, 1] for continuous machine learning inputs."""
    ws = calculate_wind_speed(u10, v10)
    eps = 1e-5
    u_norm = np.asarray(u10) / np.maximum(ws, eps)
    v_norm = np.asarray(v10) / np.maximum(ws, eps)
    if np.ndim(u10) == 0:
        return float(u_norm), float(v_norm)
    return u_norm, v_norm


def deaccumulate_era5_precipitation(
    precip_m: np.ndarray,
    hours_utc: np.ndarray,
) -> np.ndarray:
    """De-accumulate continuous ERA5-Land precipitation into hourly increments in mm.

    In ERA5-Land, total_precipitation accumulates from 00:00 UTC cycle start and resets
    at 00:00 UTC of the next day.

    Args:
        precip_m: 1D array of accumulated precipitation in metres.
        hours_utc: 1D array of UTC hours (0 to 23).

    Returns:
        1D array of hourly precipitation in millimetres (mm/hr).
    """
    p = np.asarray(precip_m, dtype=np.float64)
    h = np.asarray(hours_utc, dtype=np.int32)

    if len(p) != len(h):
        raise ValueError(
            "precip_m and hours_utc must have the same array length."
        )

    hourly_mm = np.zeros_like(p)
    for i in range(len(p)):
        hour = h[i]
        val = p[i]
        if hour == 1 or i == 0:
            # First hour of cycle starts from 00:00
            diff = val
        else:
            diff = val - p[i - 1]

        # Numerical guard: small precision underflows (< 1e-7) clamped to 0.0
        hourly_mm[i] = max(0.0, diff) * 1000.0

    return hourly_mm


def inspect_precipitation_accumulation_stream(
    precip_m: np.ndarray,
    hours_utc: np.ndarray,
    epsilon: float = 1e-7,
) -> dict[str, Any]:
    """Inspect a multi-hour precipitation sequence to empirically diagnose accumulation convention.

    Differentiates between ECMWF cumulative forecast flux (accumulated from 00:00 UTC)
    and pre-deaccumulated hourly precipitation rates to prevent double-differencing errors.

    Args:
        precip_m: 1D array of precipitation values in metres.
        hours_utc: 1D array of corresponding UTC hours (0 to 23).
        epsilon: Numerical precision tolerance for monotonicity check.

    Returns:
        Dictionary containing monotonicity checks, reset metrics, convention classification,
        and recommended pipeline action.
    """
    p = np.asarray(precip_m, dtype=np.float64)
    h = np.asarray(hours_utc, dtype=np.int32)

    if len(p) != len(h):
        raise ValueError("precip_m and hours_utc must have the same array length.")
    if len(p) < 2:
        raise ValueError("Sequence must contain at least 2 consecutive hours for accumulation diagnosis.")

    total_rain_observed = float(np.max(p))
    if total_rain_observed <= epsilon:
        return {
            "status": "DIAGNOSIS_COMPLETE",
            "convention": "DRY_SPELL",
            "is_monotonic_intraday": True,
            "has_midnight_reset": False,
            "total_max_precip_m": 0.0,
            "intraday_drops_count": 0,
            "recommended_action": "APPLY_STANDARD_DEACCUMULATION",
            "justification": "All observed hours are zero/near-zero (dry spell). Standard de-accumulation produces safe zeros.",
        }

    intraday_drops = 0
    cycle_resets = 0
    cycles_detected = 0

    for i in range(1, len(p)):
        prev_h = h[i - 1]
        curr_h = h[i]
        diff = p[i] - p[i - 1]

        # Check if this step is within the same diurnal cycle (consecutive ascending hour)
        if curr_h > prev_h:
            if diff < -epsilon:
                intraday_drops += 1
        else:
            # Cycle boundary transition (e.g., hour 23 -> hour 0 or 1)
            cycles_detected += 1
            if p[i] < p[i - 1] - epsilon:
                cycle_resets += 1

    is_monotonic_intraday = intraday_drops == 0

    if is_monotonic_intraday and (cycle_resets > 0 or cycles_detected == 0):
        convention = "CUMULATIVE_FORECAST_FLUX"
        recommended_action = "APPLY_STANDARD_DEACCUMULATION"
        justification = (
            "Precipitation increases monotonically within each diurnal cycle and resets at cycle boundaries. "
            "Confirms native ECMWF cumulative flux format requiring backward de-accumulation."
        )
    elif not is_monotonic_intraday:
        convention = "HOURLY_RATE_PRE_DEACCUMULATED"
        recommended_action = "BYPASS_DEACCUMULATION_APPLY_SCALE_FACTOR"
        justification = (
            f"Observed {intraday_drops} intraday negative step(s). Data stream is already delivered as hourly rates. "
            "Applying backward de-accumulation would cause double-differencing and corrupt the rainfall signal."
        )
    else:
        convention = "ANOMALOUS_CONVENTION"
        recommended_action = "HALT_FOR_MANUAL_REVIEW"
        justification = "Data exhibits non-standard accumulation behavior. Requires manual expert review."

    return {
        "status": "DIAGNOSIS_COMPLETE",
        "convention": convention,
        "is_monotonic_intraday": is_monotonic_intraday,
        "has_midnight_reset": cycle_resets > 0,
        "total_max_precip_m": round(total_rain_observed, 7),
        "intraday_drops_count": intraday_drops,
        "cycle_resets_count": cycle_resets,
        "cycles_detected_count": cycles_detected,
        "recommended_action": recommended_action,
        "justification": justification,
    }


def utc_to_ist(
    dt_series: pd.Series | pd.Timestamp,
) -> pd.Series | pd.Timestamp:
    """Convert UTC-aware datetime(s) to India Standard Time (IST, UTC+05:30)."""
    offset = pd.Timedelta(hours=5, minutes=30)
    if isinstance(dt_series, pd.Timestamp):
        if dt_series.tzinfo is None:
            # Assume UTC if naive
            dt_series = dt_series.tz_localize("UTC")
        return dt_series.tz_convert("Asia/Kolkata")
    # For Series
    if dt_series.dt.tz is None:
        return dt_series.dt.tz_localize("UTC").dt.tz_convert("Asia/Kolkata")
    return dt_series.dt.tz_convert("Asia/Kolkata")


def get_parent_era5_node(
    centroid_lat: float,
    centroid_lon: float,
) -> tuple[float, float]:
    """Find parent 0.1 deg ERA5-Land grid node (cell center) for a 0.05 deg cell centroid.

    Mathematical rule:
    ERA5-Land grid nodes are at exact multiples of 0.1 deg (... 29.9, 30.0, 30.1 ...).
    For any centroid (lat, lon), the closest ERA5-Land node is round(lat, 1) and round(lon, 1).
    """
    parent_lat = round(centroid_lat, 1)
    parent_lon = round(centroid_lon, 1)
    return parent_lat, parent_lon


def assign_grid_cell_005(
    lat: float,
    lon: float,
    step_deg: float = 0.05,
) -> dict[str, float | str]:
    """Assign point coordinates to containing 0.05 deg Master Grid Cell and its parent ERA5-Land node."""
    sw_lat = round(math.floor(lat / step_deg) * step_deg, 4)
    sw_lon = round(math.floor(lon / step_deg) * step_deg, 4)
    centroid_lat = round(sw_lat + (step_deg / 2.0), 4)
    centroid_lon = round(sw_lon + (step_deg / 2.0), 4)
    parent_lat, parent_lon = get_parent_era5_node(centroid_lat, centroid_lon)

    cell_id = f"UT_{int(step_deg*1000):03d}_{sw_lat:.4f}_{sw_lon:.4f}"
    era5_parent_id = f"ERA5L_{parent_lat:.4f}_{parent_lon:.4f}"

    return {
        "grid_cell_id": cell_id,
        "grid_lat_sw": sw_lat,
        "grid_lon_sw": sw_lon,
        "centroid_lat": centroid_lat,
        "centroid_lon": centroid_lon,
        "era5_parent_cell_id": era5_parent_id,
        "era5_parent_lat": parent_lat,
        "era5_parent_lon": parent_lon,
    }

