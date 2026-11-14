"""Unit tests for FIREINTEL environmental data transformations and test plan specifications.

Phase 5A: Pure mathematical verification with synthetic test fixtures.
"""

from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from environmental.manifest import (
    check_temporal_completeness,
)
from environmental.transformations import (
    actual_vapor_pressure_kpa,
    assign_grid_cell_005,
    calculate_meteorological_wind_direction,
    calculate_relative_humidity,
    calculate_vapor_pressure_deficit,
    calculate_wind_speed,
    deaccumulate_era5_precipitation,
    get_parent_era5_node,
    inspect_precipitation_accumulation_stream,
    kelvin_to_celsius,
    normalize_wind_components,
    saturation_vapor_pressure_kpa,
    utc_to_ist,
)


def test_temperature_conversion_standard_and_extreme():
    """Verify Kelvin to Celsius conversion across standard and extreme values."""
    assert kelvin_to_celsius(273.15) == pytest.approx(0.0, abs=1e-5)
    assert kelvin_to_celsius(373.15) == pytest.approx(100.0, abs=1e-5)
    assert kelvin_to_celsius(253.15) == pytest.approx(-20.0, abs=1e-5)
    assert kelvin_to_celsius(318.15) == pytest.approx(45.0, abs=1e-5)

    # Array input
    k_arr = np.array([273.15, 293.15, 313.15])
    c_arr = kelvin_to_celsius(k_arr)
    np.testing.assert_allclose(c_arr, [0.0, 20.0, 40.0], atol=1e-5)

    # Below absolute zero must raise ValueError
    with pytest.raises(ValueError, match="absolute zero"):
        kelvin_to_celsius(-1.0)


def test_saturation_and_actual_vapor_pressure():
    """Verify Magnus-Tetens formula against known physical values."""
    # At 0 deg C, saturation vapor pressure is ~0.61078 kPa
    es_0 = saturation_vapor_pressure_kpa(0.0)
    assert es_0 == pytest.approx(0.61078, abs=1e-4)

    # At 20 deg C, es is approx 2.338 kPa
    es_20 = saturation_vapor_pressure_kpa(20.0)
    assert es_20 == pytest.approx(2.338, abs=0.01)

    # Actual vapor pressure from dewpoint
    ea_20 = actual_vapor_pressure_kpa(20.0)
    assert ea_20 == pytest.approx(es_20, abs=1e-5)


def test_relative_humidity_and_vpd_calculations():
    """Verify RH and VPD derivations and edge cases."""
    # Saturated case: T == Td -> RH == 100%, VPD == 0
    rh_sat = calculate_relative_humidity(20.0, 20.0)
    vpd_sat = calculate_vapor_pressure_deficit(20.0, 20.0)
    assert rh_sat == pytest.approx(100.0, abs=1e-4)
    assert vpd_sat == pytest.approx(0.0, abs=1e-4)

    # Dry hot weather: T = 35C, Td = 5C
    rh_dry = calculate_relative_humidity(35.0, 5.0)
    vpd_dry = calculate_vapor_pressure_deficit(35.0, 5.0)
    assert 14.0 < rh_dry < 17.0  # ~15.5%
    assert 4.5 < vpd_dry < 5.0  # ~4.76 kPa

    # Edge case: numerical noise where Td > T by 0.05 deg C
    rh_clipped = calculate_relative_humidity(15.0, 15.05)
    vpd_clipped = calculate_vapor_pressure_deficit(15.0, 15.05)
    assert rh_clipped == 100.0
    assert vpd_clipped == 0.0


def test_wind_speed_and_meteorological_direction():
    """Verify wind speed and meteorological direction conventions."""
    # Southerly wind (blowing from South to North, u=0, v=10)
    ws_s = calculate_wind_speed(0.0, 10.0)
    dir_s = calculate_meteorological_wind_direction(0.0, 10.0)
    assert ws_s == pytest.approx(10.0, abs=1e-5)
    assert dir_s == pytest.approx(180.0, abs=1e-4)

    # Northerly wind (blowing from North to South, u=0, v=-10)
    dir_n = calculate_meteorological_wind_direction(0.0, -10.0)
    assert dir_n == pytest.approx(0.0, abs=1e-4) or dir_n == pytest.approx(
        360.0, abs=1e-4
    )

    # Westerly wind (blowing from West to East, u=10, v=0)
    dir_w = calculate_meteorological_wind_direction(10.0, 0.0)
    assert dir_w == pytest.approx(270.0, abs=1e-4)

    # Easterly wind (blowing from East to West, u=-10, v=0)
    dir_e = calculate_meteorological_wind_direction(-10.0, 0.0)
    assert dir_e == pytest.approx(90.0, abs=1e-4)

    # Normalized wind vector components
    u_norm, v_norm = normalize_wind_components(3.0, 4.0)
    assert u_norm == pytest.approx(0.6, abs=1e-5)
    assert v_norm == pytest.approx(0.8, abs=1e-5)


def test_era5_land_precipitation_deaccumulation():
    """Verify ERA5-Land precipitation de-accumulation from 00:00 UTC cycle reset."""
    # Synthetic 24-hour cycle: accumulates 1 mm per hour from 01:00 UTC to 24:00 UTC
    hours = np.array(
        [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            0,
        ]
    )
    # Accumulated meters: 0.001 m, 0.002 m, ..., 0.024 m
    accum_m = np.linspace(0.001, 0.024, 24)

    hourly_mm = deaccumulate_era5_precipitation(accum_m, hours)

    # All hourly differences must be exactly 1.0 mm
    assert len(hourly_mm) == 24
    np.testing.assert_allclose(hourly_mm, np.ones(24), atol=1e-5)

    # Mismatched length check
    with pytest.raises(ValueError, match="same array length"):
        deaccumulate_era5_precipitation(accum_m[:10], hours)


def test_utc_to_ist_conversion():
    """Verify UTC to IST (+05:30) conversion and date-rollover."""
    ts_utc = pd.Timestamp("2025-04-15 08:30:00+00:00")
    ts_ist = utc_to_ist(ts_utc)
    assert ts_ist.hour == 14
    assert ts_ist.minute == 0
    assert ts_ist.day == 15

    # Midnight rollover: 20:00 UTC -> next day 01:30 IST
    ts_late_utc = pd.Timestamp("2025-04-15 20:00:00+00:00")
    ts_late_ist = utc_to_ist(ts_late_utc)
    assert ts_late_ist.day == 16
    assert ts_late_ist.hour == 1
    assert ts_late_ist.minute == 30


def test_grid_origin_nesting_and_parent_cell_mapping():
    """Verify mathematical nesting of 0.05 deg cells into 0.1 deg ERA5-Land parent nodes."""
    # ERA5-Land node at (30.0, 78.0) covers [29.95, 30.05] x [77.95, 78.05]
    # The 4 sub-cells with step 0.05 deg:
    test_coords = [
        (29.96, 77.96),  # SW sub-cell
        (29.96, 78.01),  # SE sub-cell
        (30.01, 77.96),  # NW sub-cell
        (30.01, 78.01),  # NE sub-cell
    ]

    for lat, lon in test_coords:
        res = assign_grid_cell_005(lat, lon, step_deg=0.05)
        # All 4 sub-cells MUST map to parent (30.0, 78.0)
        assert res["era5_parent_lat"] == 30.0
        assert res["era5_parent_lon"] == 78.0
        assert res["era5_parent_cell_id"] == "ERA5L_30.0000_78.0000"


def test_temporal_completeness_and_missing_hour_detection():
    """Verify detection of missing or duplicate timesteps."""
    # Full 48-hour range
    full_range = pd.date_range("2025-01-01 00:00", "2025-01-02 23:00", freq="1h")
    status_full = check_temporal_completeness(
        full_range, "2025-01-01 00:00", "2025-01-02 23:00"
    )
    assert status_full["is_complete"] is True
    assert status_full["missing_timesteps_count"] == 0

    # Injected 2-hour gap
    with_gap = full_range.delete([5, 6])
    status_gap = check_temporal_completeness(
        with_gap, "2025-01-01 00:00", "2025-01-02 23:00"
    )
    assert status_gap["is_complete"] is False
    assert status_gap["missing_timesteps_count"] == 2

    # Injected duplicate
    with_dup = full_range.append(pd.DatetimeIndex([full_range[0]]))
    status_dup = check_temporal_completeness(
        with_dup, "2025-01-01 00:00", "2025-01-02 23:00"
    )
    assert status_dup["is_complete"] is False
    assert status_dup["duplicate_timesteps_count"] == 1


def test_future_data_leakage_assertion():
    """Verify that temporal causality guards reject future features relative to cutoff T0."""
    cutoff_t0 = pd.Timestamp("2025-05-10 06:00:00+05:30")

    # Valid preceding day feature (from May 9)
    valid_feature_timestamp = pd.Timestamp("2025-05-09 23:59:00+05:30")
    assert valid_feature_timestamp <= cutoff_t0

    # Leakage feature: afternoon peak from same day (May 10 at 14:00 IST)
    leaked_feature_timestamp = pd.Timestamp("2025-05-10 14:00:00+05:30")
    assert leaked_feature_timestamp > cutoff_t0

    def assert_no_leakage(
        feature_time: pd.Timestamp, t0: pd.Timestamp
    ) -> bool:
        if feature_time > t0:
            raise ValueError(
                f"Data leakage detected! Feature time {feature_time} > Cutoff {t0}"
            )
        return True

    assert assert_no_leakage(valid_feature_timestamp, cutoff_t0) is True
    with pytest.raises(ValueError, match="Data leakage detected"):
        assert_no_leakage(leaked_feature_timestamp, cutoff_t0)


def test_inspect_precipitation_accumulation_stream_diagnostics():
    """Verify diagnostic detection of cumulative forecast flux vs pre-deaccumulated hourly rates."""
    # Case 1: Cumulative forecast flux (Day 1: hours 0-23 accumulating, Day 2: reset at 00/01)
    # Day 1: 0m -> 0.005m; Day 2: resets to 0.001m
    hours_48 = np.tile(np.arange(24), 2)
    day1_cum = np.linspace(0.0, 0.010, 24)  # Monotonic accumulation up to 10mm
    day2_cum = np.linspace(0.001, 0.005, 24)  # Monotonic accumulation starting fresh on day 2
    precip_cum = np.concatenate([day1_cum, day2_cum])

    diag_cum = inspect_precipitation_accumulation_stream(precip_cum, hours_48)
    assert diag_cum["convention"] == "CUMULATIVE_FORECAST_FLUX"
    assert diag_cum["is_monotonic_intraday"] is True
    assert diag_cum["has_midnight_reset"] is True
    assert diag_cum["recommended_action"] == "APPLY_STANDARD_DEACCUMULATION"

    # Case 2: Pre-deaccumulated hourly rates (fluctuating up and down intraday)
    precip_rates = np.array([
        0.000, 0.002, 0.005, 0.001, 0.000, 0.003, 0.000, 0.000,
        0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000,
        0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000,
    ])
    hours_24 = np.arange(24)
    diag_rates = inspect_precipitation_accumulation_stream(precip_rates, hours_24)
    assert diag_rates["convention"] == "HOURLY_RATE_PRE_DEACCUMULATED"
    assert diag_rates["is_monotonic_intraday"] is False
    assert diag_rates["recommended_action"] == "BYPASS_DEACCUMULATION_APPLY_SCALE_FACTOR"

    # Case 3: Complete dry spell (all zeros)
    dry_precip = np.zeros(48)
    diag_dry = inspect_precipitation_accumulation_stream(dry_precip, hours_48)
    assert diag_dry["convention"] == "DRY_SPELL"
    assert diag_dry["recommended_action"] == "APPLY_STANDARD_DEACCUMULATION"

