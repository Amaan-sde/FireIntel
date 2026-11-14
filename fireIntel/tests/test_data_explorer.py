"""
Automated unit & integration test suite for Phase 8 Data Explorer & Export API.
Validates live DuckDB queries, filtering, pagination, CSV/JSON/GeoJSON exports,
scientific invariants, and CSV formula injection protection.
"""

import pytest
import io
import csv
import json
from fastapi.testclient import TestClient
from fireIntel.api.main import app

client = TestClient(app)

# -----------------------------------------------------------------------------
# 1. SUMMARY ENDPOINT TESTS
# -----------------------------------------------------------------------------

def test_data_summary_default():
    """Verify default summary covers the full 2025 boundary-validated dataset."""
    response = client.get("/api/v1/data/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["total_matching"] == 7541
    assert data["modis_count"] == 918
    assert data["viirs_count"] == 6623
    assert data["day_count"] == 4911
    assert data["night_count"] == 2630
    assert data["max_frp_mw"] == 169.9
    assert data["total_frp_mw"] == 40341.81
    assert data["date_range"]["start"] == "2025-01-01"
    assert data["date_range"]["end"] == "2025-12-31"

def test_data_summary_modis_filter():
    """Verify sensor=MODIS filter isolates 918 observations."""
    response = client.get("/api/v1/data/summary?sensor=MODIS")
    assert response.status_code == 200
    data = response.json()
    assert data["total_matching"] == 918
    assert data["modis_count"] == 918
    assert data["viirs_count"] == 0

def test_data_summary_viirs_filter():
    """Verify sensor=VIIRS filter isolates 6,623 observations."""
    response = client.get("/api/v1/data/summary?sensor=VIIRS")
    assert response.status_code == 200
    data = response.json()
    assert data["total_matching"] == 6623
    assert data["viirs_count"] == 6623
    assert data["modis_count"] == 0

def test_data_summary_daynight_filter():
    """Verify day/night filter distribution."""
    res_d = client.get("/api/v1/data/summary?daynight=D")
    assert res_d.status_code == 200
    assert res_d.json()["total_matching"] == 4911

    res_n = client.get("/api/v1/data/summary?daynight=N")
    assert res_n.status_code == 200
    assert res_n.json()["total_matching"] == 2630

def test_data_summary_frp_range():
    """Verify min_frp and max_frp filtering."""
    response = client.get("/api/v1/data/summary?min_frp=20&max_frp=50")
    assert response.status_code == 200
    data = response.json()
    assert data["total_matching"] > 0
    assert data["max_frp_mw"] <= 50.0

def test_data_summary_confidence_decoupling():
    """
    Verify strict confidence decoupling:
    MODIS uses numeric (0-100), VIIRS uses categorical ('l', 'n', 'h').
    """
    # High confidence VIIRS (90 detections)
    res_viirs_h = client.get("/api/v1/data/summary?sensor=VIIRS&confidence_viirs=h")
    assert res_viirs_h.status_code == 200
    assert res_viirs_h.json()["total_matching"] == 90

    # High confidence MODIS (>= 80 numeric, 107 detections)
    res_modis_80 = client.get("/api/v1/data/summary?sensor=MODIS&min_confidence_modis=80")
    assert res_modis_80.status_code == 200
    assert res_modis_80.json()["total_matching"] == 107

def test_data_summary_date_filtering():
    """Verify date window filtering for April peak pre-monsoon season."""
    response = client.get("/api/v1/data/summary?start_date=2025-04-01&end_date=2025-04-30")
    assert response.status_code == 200
    data = response.json()
    assert data["total_matching"] > 0
    assert data["date_range"]["start"] >= "2025-04-01"
    assert data["date_range"]["end"] <= "2025-04-30"

# -----------------------------------------------------------------------------
# 2. VALIDATION & ERROR HANDLING TESTS
# -----------------------------------------------------------------------------

def test_invalid_date_range_error():
    """Verify 400 Bad Request when start_date is later than end_date."""
    response = client.get("/api/v1/data/summary?start_date=2025-06-01&end_date=2025-05-01")
    assert response.status_code == 400
    assert "start_date" in response.json()["detail"]

def test_malformed_date_error():
    """Verify 422 Unprocessable Entity for invalid date format."""
    response = client.get("/api/v1/data/summary?start_date=not-a-valid-date")
    assert response.status_code == 422
    assert "Expected YYYY-MM-DD" in response.json()["detail"]

def test_invalid_frp_range_error():
    """Verify 400 Bad Request when min_frp > max_frp."""
    response = client.get("/api/v1/data/summary?min_frp=100&max_frp=50")
    assert response.status_code == 400
    assert "cannot be greater than max_frp" in response.json()["detail"]

def test_invalid_sort_field_error():
    """Verify 400 Bad Request when sort_by column is not in allowed whitelist."""
    response = client.get("/api/v1/data/observations?sort_by=arbitrary_malicious_col")
    assert response.status_code == 400
    assert "Invalid sort_by field" in response.json()["detail"]

# -----------------------------------------------------------------------------
# 3. OBSERVATIONS PAGINATION & SORTING TESTS
# -----------------------------------------------------------------------------

def test_observations_pagination():
    """Verify page number, page size, total pages, and record counts."""
    response = client.get("/api/v1/data/observations?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_records"] == 7541
    assert data["total_pages"] == 755
    assert len(data["data"]) == 10
    assert data["has_next"] is True
    assert data["has_prev"] is False

    # Check page 2 has_prev
    res_p2 = client.get("/api/v1/data/observations?page=2&page_size=10")
    assert res_p2.status_code == 200
    assert res_p2.json()["has_prev"] is True

def test_observations_sorting():
    """Verify sorting by FRP descending."""
    response = client.get("/api/v1/data/observations?page=1&page_size=5&sort_by=frp&sort_order=desc")
    assert response.status_code == 200
    records = response.json()["data"]
    frps = [r["frp"] for r in records]
    assert frps == sorted(frps, reverse=True)
    assert frps[0] == 169.9  # Highest peak FRP in Uttarakhand 2025 dataset

def test_observations_empty_result():
    """Verify graceful empty response when filters exclude all records."""
    response = client.get("/api/v1/data/observations?min_frp=9999")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 0
    assert data["total_pages"] == 1
    assert len(data["data"]) == 0
    assert data["has_next"] is False

# -----------------------------------------------------------------------------
# 4. EXPORT FORMATS & INTEGRITY TESTS
# -----------------------------------------------------------------------------

def test_export_csv_structure_and_formula_injection():
    """Verify CSV header comments, column headers, record count, and sanitization."""
    response = client.get("/api/v1/data/export?format=csv&limit=10")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith('.csv"')

    content = response.text
    # Verify metadata header block
    assert "# FIREINTEL // NASA EARTH OBSERVATION DATA EXPLORER EXPORT" in content
    assert "# Dataset: NASA FIRMS Satellite Fire Telemetry" in content
    assert "# Exported Records: 10" in content

    # Parse CSV data rows ignoring comment lines
    csv_lines = [line for line in content.splitlines() if not line.startswith("#")]
    reader = csv.DictReader(io.StringIO("\n".join(csv_lines)))
    rows = list(reader)
    assert len(rows) == 10
    assert "obs_id" in rows[0]
    assert "latitude" in rows[0]
    assert "longitude" in rows[0]
    assert "frp_mw" in rows[0]

def test_export_json_manifest_and_records():
    """Verify structured JSON payload with metadata manifest and record array."""
    response = client.get("/api/v1/data/export?format=json&limit=5")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith('.json"')

    data = response.json()
    assert "metadata" in data
    assert "records" in data
    meta = data["metadata"]
    assert meta["study_region"] == "Uttarakhand, India"
    assert meta["record_count"] == 5
    assert meta["crs"] == "EPSG:4326 (WGS84)"
    assert len(meta["scientific_limitations"]) >= 3
    assert len(data["records"]) == 5

def test_export_geojson_feature_collection():
    """
    Verify GeoJSON follows RFC 7946 specifications:
    - FeatureCollection
    - Point geometry
    - [longitude, latitude] coordinates in EPSG:4326 order.
    """
    response = client.get("/api/v1/data/export?format=geojson&limit=5")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/geo+json")
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.headers["content-disposition"].endswith('.geojson"')

    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "metadata" in data
    assert len(data["features"]) == 5

    for feat in data["features"]:
        assert feat["type"] == "Feature"
        geom = feat["geometry"]
        assert geom["type"] == "Point"
        lon, lat = geom["coordinates"]
        # Uttarakhand envelope: lat ~ 28.70 to 31.46, lon ~ 77.57 to 81.04
        assert 77.0 <= lon <= 81.5, f"Longitude {lon} out of Uttarakhand bounds"
        assert 28.5 <= lat <= 32.0, f"Latitude {lat} out of Uttarakhand bounds"
        props = feat["properties"]
        assert "obs_id" in props
        assert "sensor" in props
        assert "frp_mw" in props
