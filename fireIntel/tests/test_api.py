"""
Automated test suite for FIREINTEL FastAPI backend and DuckDB queries.
"""

from fastapi.testclient import TestClient
from fireIntel.api.main import app

client = TestClient(app)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["study_area"] == "Uttarakhand, India"

def test_mission_control_telemetry():
    response = client.get("/api/mission-control/telemetry")
    assert response.status_code == 200
    data = response.json()
    overview = data["overview"]
    assert overview["total_detections"] == 7541
    assert overview["modis_detections"] == 918
    assert overview["viirs_detections"] == 6623
    assert abs(overview["detection_ratio_viirs_modis"] - 7.2146) < 0.001
    assert overview["peak_frp_mw"] == 169.9
    assert overview["pre_monsoon_apr_may_pct"] == 38.23

def test_mission_control_summary_stats_duckdb():
    response = client.get("/api/mission-control/summary-stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_detections"] == 7541
    assert data["modis_count"] == 918
    assert data["viirs_count"] == 6623
    assert data["max_frp"] == 169.9
    assert data["query_time_ms"] > 0

def test_mission_control_boundary():
    response = client.get("/api/mission-control/boundary")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0

def test_fires_query_filtering():
    # Test sensor filter
    res_modis = client.get("/api/fires/?sensor=MODIS&limit=100")
    assert res_modis.status_code == 200
    data_modis = res_modis.json()
    assert data_modis["count"] == 100
    for row in data_modis["data"]:
        assert row["sensor"] == "MODIS"

    # Test daynight filter
    res_day = client.get("/api/fires/?daynight=D&limit=50")
    assert res_day.status_code == 200
    for row in res_day.json()["data"]:
        assert row["daynight"] == "D"

def test_benchmarks_endpoint():
    response = client.get("/api/benchmarks/")
    assert response.status_code == 200
    data = response.json()
    assert "benchmarks" in data
    assert len(data["benchmarks"]) == 3

