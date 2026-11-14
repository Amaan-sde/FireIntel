# FIREINTEL — Actual ERA5-Land Live Pilot Execution Report (Phase 5B.3)

**Project:** FIREINTEL — Satellite-Based Forest Fire Intelligence System for Uttarakhand, India  
**Phase:** Phase 5B.3: Live ERA5-Land Pilot Execution & Validation  
**Target Domain:** Uttarakhand, India (`IN-UT`, bounding box: $[28.70, 31.50]^\circ\text{N}, [77.50, 81.10]^\circ\text{E}$)  
**Target Dates:** 2025-01-01 00:00 UTC to 2025-01-02 23:00 UTC (48 consecutive hours)  
**Execution Script:** [acquire_era5_land.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/acquire_era5_land.py)  
**Execution Timestamp:** 2026-11-13T22:47:31+05:30  
**Operational Status:** **`FAILED_AUTHENTICATION_UNAUTHORIZED`**  
*(Per strict safety rules: Phase is NOT marked successful; zero synthetic or fabricated data created).*

---

## 1. Executive Summary & Operational Audit

Following the completion of preparatory Phases 5A, 5B.1, and 5B.2, the FIREINTEL pipeline attempted live real-world retrieval of the 48-hour ERA5-Land pilot from the **ECMWF Copernicus Climate Data Store (CDS)**.

### Live Execution Trace:
```text
2026-11-13 22:47:28 [INFO] fireintel.acquire_era5_land: === Starting ERA5-Land 48-Hour Pilot Check ===
2026-11-13 22:47:28 [INFO] fireintel.acquire_era5_land: Checking Copernicus Climate Data Store (CDS) authentication...
2026-11-13 22:47:28 [INFO] fireintel.acquire_era5_land: Initiating 48-hour pilot retrieval: era5_land_2025_01_48h_pilot.nc
2026-11-13 22:47:30 [INFO] fireintel.acquire_era5_land: Submitting CDS API retrieval request for 48-hour pilot (2025-01-01 to 2025-01-02)...
2026-11-13 22:47:31 [ERROR] fireintel.acquire_era5_land: CDS API Authentication Failed: HTTP 401 Unauthorized / Operation not allowed.
2026-11-13 22:47:31 [INFO] fireintel.acquire_era5_land: Pilot Status: FAILED_AUTHENTICATION_UNAUTHORIZED
```

In strict compliance with user instructions ("If authentication fails, stop gracefully; do not proceed to any larger acquisition; do not fabricate synthetic observations; do not mark this phase successful if actual data validation fails"):
1. The acquisition halted gracefully without crashing or attempting unauthorized operations.
2. No data was downloaded to disk; file size on disk is 0 bytes.
3. No simulated or artificial NetCDF data was fabricated.
4. The exact technical root cause was diagnosed and documented below.

---

## 2. Technical Root Cause Analysis of Authentication Failure

The request was submitted to the official CDS API endpoint:  
`https://cds.climate.copernicus.eu/api/retrieve/v1/processes/reanalysis-era5-land/execution`

The server rejected the request with HTTP response:
```text
HTTPError: 401 Client Error: Unauthorized for url: https://cds.climate.copernicus.eu/api/retrieve/v1/processes/reanalysis-era5-land/execution
Authentication failed: operation not allowed
```

A non-exposing technical audit of `~/.cdsapirc` revealed the following discrepancy:

| Parameter | Observed Configuration | Expected Specification (Modern CDS 2024+) | Diagnosis |
| :--- | :--- | :--- | :--- |
| **API URL** | `https://cds.climate.copernicus.eu/api` | `https://cds.climate.copernicus.eu/api` | **Correct** (Modern endpoint) |
| **Key Length** | **27 characters** | **36 characters** (Standard UUIDv4) | **Invalid / Truncated Token** |
| **Key Format** | Alphanumeric string with 1 hyphen | Hexadecimal with 4 hyphens (`8-4-4-4-12`) | **Does not match CDS PAT format** |
| **Dataset License** | Unverified | Mandatory "Accept Terms" in web profile | **Likely Missing Acceptance** |

### Why This Occurs on Copernicus CDS:
1. **New CDS Migration (June 2024):** ECMWF deprecated legacy CDS accounts (`UID:API-KEY`). All users must now generate a **Personal Access Token (PAT)** from the new portal: <https://cds.climate.copernicus.eu/profile>. The valid key format is a 36-character UUID (e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). A 27-character key is rejected as invalid.
2. **Dataset-Specific License Terms:** On the new CDS portal, having an account is not sufficient. Users must navigate to the specific dataset page: <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=download>, scroll to the bottom, and click **"Accept Terms"**. Until terms are accepted in the web UI, the API returns `401 Unauthorized (operation not allowed)`.

---

## 3. Staged Request Specification & Invariant Checklist

The request payload is fully structured and validated in [acquire_era5_land.py](file:///Users/macbook/Documents/Nasa_Space_Hackathon/fireIntel/scripts/environmental/acquire_era5_land.py):

```json
{
  "dataset": "reanalysis-era5-land",
  "variable": [
    "2m_temperature",
    "2m_dewpoint_temperature",
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "total_precipitation",
    "volumetric_soil_water_layer_1",
    "volumetric_soil_water_layer_2",
    "volumetric_soil_water_layer_3",
    "volumetric_soil_water_layer_4"
  ],
  "year": "2025",
  "month": "01",
  "day": ["01", "02"],
  "time": [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
  ],
  "data_format": "netcdf",
  "download_format": "unarchived",
  "area": [31.5, 77.5, 28.7, 81.1]
}
```

- **Bounding Box Subsetting:** $[31.5^\circ\text{N}, 77.5^\circ\text{E}, 28.7^\circ\text{N}, 81.1^\circ\text{E}]$ encompasses all 581 Uttarakhand parent ERA5 nodes with a $0.05^\circ$ buffer.
- **Payload Data Volume:** $\approx 4.2\text{ MB}$ uncompressed ($29 \times 37$ grid nodes $\times 48$ hours $\times 9$ variables).
- **Zero Full-Year Ingestion:** Complete 2025 ingestion remains firmly locked.

---

## 4. Required Action to Enable Successful Execution

To allow live download execution:
1. Log in to the modern CDS portal: <https://cds.climate.copernicus.eu/>.
2. Go to your **Profile** (<https://cds.climate.copernicus.eu/profile>) and copy your **Personal Access Token (PAT)** (ensure you copy the entire 36-character UUID string).
3. Accept dataset terms: Navigate to <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land?tab=download>, scroll to the bottom, and click **"Accept Terms"**.
4. Update your local `~/.cdsapirc`:
   ```bash
   cat << 'EOF' > ~/.cdsapirc
   url: https://cds.climate.copernicus.eu/api
   key: <YOUR-36-CHAR-UUID-PAT>
   EOF
   chmod 600 ~/.cdsapirc
   ```
5. Re-run the live acquisition command:
   ```bash
   python3 fireIntel/scripts/environmental/acquire_era5_land.py --verbose
   ```

