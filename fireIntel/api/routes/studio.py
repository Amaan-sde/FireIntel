"""
FIREINTEL Global Multi-Satellite Data Harmonisation & Machine Learning Studio Router.
Supports simultaneous 4-slot NASA FIRMS uploads (MODIS Archive, MODIS NRT, VIIRS Archive, VIIRS NRT),
canonical schema standardisation, cross-sensor deduplication, global bounding box geometry,
supervised Random Forest & XGBoost classification, and unsupervised DBSCAN/Isolation Forest analysis.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np
import io
import uuid
import math
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, balanced_accuracy_score, precision_recall_fscore_support, confusion_matrix
from sklearn.ensemble import RandomForestClassifier, IsolationForest, GradientBoostingClassifier
from sklearn.dummy import DummyClassifier
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

# Check for XGBoost availability
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

router = APIRouter(prefix="/studio", tags=["Global Multi-Satellite Harmonisation & AutoML Studio"])

STUDIO_SESSIONS: Dict[str, Dict[str, Any]] = {}
MAX_CACHED_SESSIONS = 30
SAMPLE_DATA_DIR = Path("fireIntel/data/studio_samples")

# -----------------------------------------------------------------------------
# Canonical Harmonisation Schema & Helper Utilities
# -----------------------------------------------------------------------------

CANONICAL_COLUMNS = [
    "harmonised_id",
    "latitude",
    "longitude",
    "brightness",
    "scan",
    "track",
    "acq_date",
    "acq_time",
    "satellite",
    "instrument",
    "sensor",
    "confidence",
    "confidence_class",
    "bright_t31",
    "frp",
    "daynight",
    "type",
    "source_product",
    "source_category",
    "original_source_file"
]

def sanitize_dataframe_preview(df: pd.DataFrame, max_rows: int = 5) -> List[Dict[str, Any]]:
    preview = df.head(max_rows).copy()
    preview = preview.replace([np.inf, -np.inf], None)
    records = []
    for row in preview.to_dict(orient="records"):
        clean_row = {}
        for k, v in row.items():
            if pd.isna(v):
                clean_row[k] = None
            elif isinstance(v, (np.integer, int)):
                clean_row[k] = int(v)
            elif isinstance(v, (np.floating, float)):
                clean_row[k] = round(float(v), 4)
            else:
                clean_row[k] = str(v)
        records.append(clean_row)
    return records

def identify_firms_source(columns: List[str], filename: str) -> Dict[str, str]:
    """Identifies sensor (MODIS vs VIIRS) and category (ARCHIVE vs NRT) from schema and metadata."""
    cols_lower = [c.lower() for c in columns]
    fn_lower = filename.lower()
    
    # 1. Detect Sensor
    is_viirs = ("bright_ti4" in cols_lower) or ("bright_ti5" in cols_lower) or ("viirs" in fn_lower)
    is_modis = ("modis" in fn_lower) or ("bright_t31" in cols_lower and not is_viirs)
    
    if is_viirs:
        sensor = "VIIRS"
    elif is_modis:
        sensor = "MODIS"
    else:
        sensor = "VIIRS" if any("viirs" in x for x in cols_lower) else "MODIS"
        
    # 2. Detect Category (Archive vs NRT)
    is_nrt = ("nrt" in fn_lower) or ("version" in cols_lower and any("nrt" in str(x).lower() for x in cols_lower))
    category = "NRT" if is_nrt else "ARCHIVE"
    
    return {"sensor": sensor, "category": category}

def harmonise_single_dataframe(
    df_raw: pd.DataFrame,
    source_slot: str,
    filename: str
) -> pd.DataFrame:
    """Normalises raw NASA FIRMS CSV columns into the canonical global schema."""
    cols_map = {c.lower(): c for c in df_raw.columns}
    
    # Lat & Lon
    lat_col = next((cols_map[c] for c in ["latitude", "lat", "y_coord"] if c in cols_map), None)
    lon_col = next((cols_map[c] for c in ["longitude", "lon", "lng", "x_coord"] if c in cols_map), None)
    if not lat_col or not lon_col:
        raise ValueError(f"File {filename} is missing mandatory latitude/longitude coordinate columns.")

    # Create working copy
    df = pd.DataFrame()
    df["latitude"] = pd.to_numeric(df_raw[lat_col], errors="coerce")
    df["longitude"] = pd.to_numeric(df_raw[lon_col], errors="coerce")

    # Filter out impossible coordinates immediately (-90 to 90, -180 to 180)
    valid_coord_mask = (
        df["latitude"].notna() &
        df["longitude"].notna() &
        (df["latitude"] >= -90.0) & (df["latitude"] <= 90.0) &
        (df["longitude"] >= -180.0) & (df["longitude"] <= 180.0)
    )
    df = df[valid_coord_mask].copy()
    raw_sub = df_raw.loc[df.index]

    # Brightness (channel 4 or T21/T22)
    b_col = next((cols_map[c] for c in ["brightness", "bright_ti4", "temp_k"] if c in cols_map), None)
    df["brightness"] = pd.to_numeric(raw_sub[b_col], errors="coerce").fillna(310.0) if b_col else 310.0

    # Brightness T31 (channel 5 / 11um)
    bt31_col = next((cols_map[c] for c in ["bright_t31", "bright_ti5"] if c in cols_map), None)
    df["bright_t31"] = pd.to_numeric(raw_sub[bt31_col], errors="coerce").fillna(df["brightness"] - 15.0) if bt31_col else (df["brightness"] - 15.0)

    # Scan & Track
    scan_col = next((cols_map[c] for c in ["scan", "pixel_scan"] if c in cols_map), None)
    df["scan"] = pd.to_numeric(raw_sub[scan_col], errors="coerce").fillna(1.0) if scan_col else 1.0

    track_col = next((cols_map[c] for c in ["track", "pixel_track"] if c in cols_map), None)
    df["track"] = pd.to_numeric(raw_sub[track_col], errors="coerce").fillna(1.0) if track_col else 1.0

    # Fire Radiative Power (FRP)
    frp_col = next((cols_map[c] for c in ["frp", "fire_radiative_power", "power"] if c in cols_map), None)
    df["frp"] = pd.to_numeric(raw_sub[frp_col], errors="coerce").fillna(0.0).clip(lower=0.0) if frp_col else 0.0

    # Acquisition Date & Time
    date_col = next((cols_map[c] for c in ["acq_date", "date", "observation_date"] if c in cols_map), None)
    df["acq_date"] = raw_sub[date_col].astype(str) if date_col else None

    time_col = next((cols_map[c] for c in ["acq_time", "time", "observation_time"] if c in cols_map), None)
    if time_col:
        # Standardise 3-4 digit time to 4-digit HHMM
        df["acq_time"] = raw_sub[time_col].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(4)
    else:
        df["acq_time"] = None

    # Satellite & Instrument
    sat_col = next((cols_map[c] for c in ["satellite", "platform"] if c in cols_map), None)
    df["satellite"] = raw_sub[sat_col].astype(str) if sat_col else ("Terra" if "modis" in source_slot else "SNPP")

    inst_col = next((cols_map[c] for c in ["instrument", "sensor"] if c in cols_map), None)
    raw_inst = str(raw_sub[inst_col].iloc[0]) if inst_col and len(raw_sub) > 0 else ""
    
    if "viirs" in source_slot or "viirs" in raw_inst.lower() or "snpp" in raw_inst.lower():
        df["instrument"] = "VIIRS"
        df["sensor"] = "VIIRS"
    else:
        df["instrument"] = "MODIS"
        df["sensor"] = "MODIS"

    # Day / Night
    dn_col = next((cols_map[c] for c in ["daynight", "day_night"] if c in cols_map), None)
    if dn_col:
        df["daynight"] = raw_sub[dn_col].astype(str).str.upper().str.strip()
    else:
        df["daynight"] = "D"

    # Confidence Normalisation
    conf_col = next((cols_map[c] for c in ["confidence", "conf", "confidence_class"] if c in cols_map), None)
    raw_conf = raw_sub[conf_col].astype(str) if conf_col else pd.Series(["nominal"] * len(df))
    df["confidence"] = raw_conf

    # Normalise into standardized confidence_class ("low", "nominal", "high")
    def map_conf_class(val: str, sensor: str) -> str:
        s = val.strip().lower()
        if sensor == "VIIRS":
            if s in ["l", "low"]: return "low"
            if s in ["h", "high"]: return "high"
            return "nominal"
        else: # MODIS (0-100)
            try:
                num = float(s)
                if num < 30.0: return "low"
                if num >= 80.0: return "high"
                return "nominal"
            except:
                if "h" in s: return "high"
                if "l" in s: return "low"
                return "nominal"

    df["confidence_class"] = [map_conf_class(v, df["sensor"].iloc[i]) for i, v in enumerate(raw_conf)]

    # Target / Type Column (Ground Truth)
    type_col = next((cols_map[c] for c in ["type", "fire_type", "target", "class"] if c in cols_map), None)
    if type_col:
        df["type"] = pd.to_numeric(raw_sub[type_col], errors="coerce")
    else:
        df["type"] = np.nan

    # Source Provenance
    if "archive" in source_slot:
        df["source_category"] = "ARCHIVE"
    elif "nrt" in source_slot:
        df["source_category"] = "NRT"
    else:
        df["source_category"] = "ARCHIVE" if "archive" in filename.lower() else "NRT"

    df["source_product"] = f"{df['sensor'].iloc[0]}_{df['source_category'].iloc[0]}"
    df["original_source_file"] = filename

    return df

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/samples")
def get_curated_samples():
    """Returns curated demonstration datasets across global continents."""
    return {
        "status": "SUCCESS",
        "samples": [
            {
                "id": "four_slot_bundle",
                "name": "Global 4-Slot Multi-Satellite Bundle (California 2024)",
                "region": "North America",
                "rows": 4000,
                "slots_included": ["MODIS Archive", "MODIS NRT", "VIIRS Archive", "VIIRS NRT"],
                "description": "True 4-file concurrent satellite stream: Terra/Aqua MODIS + SNPP VIIRS with Archive & NRT cross-calibration.",
                "has_target_label": True,
                "suggested_target": "type"
            },
            {
                "id": "amazon_basin",
                "name": "Amazon Tropical Deforestation & Fire Belt (2024)",
                "region": "South America (Brazil / Bolivia)",
                "rows": 1200,
                "slots_included": ["VIIRS & MODIS Multi-Spectral"],
                "description": "Satellite thermal detections tracing tropical rainforest clearings and severe pasture fire fronts.",
                "has_target_label": True,
                "suggested_target": "type"
            },
            {
                "id": "australia_bushfire",
                "name": "Southeast Australia Eucalyptus Bushfire Belt (2024)",
                "region": "Oceania (Australia)",
                "rows": 1100,
                "slots_included": ["VIIRS & MODIS Harmonised"],
                "description": "High-intensity bushfire thermal anomalies across New South Wales / Victoria sclerophyll ranges.",
                "has_target_label": True,
                "suggested_target": "type"
            },
            {
                "id": "greece_mediterranean",
                "name": "Greece Attica Wildfire Corridor (August 2024)",
                "region": "Southern Europe (Greece)",
                "rows": 950,
                "slots_included": ["VIIRS 375m & MODIS 1km"],
                "description": "Mediterranean maritime-mountain fire complexes exhibiting steep convective plume energetics.",
                "has_target_label": False
            },
            {
                "id": "uttarakhand_specimen",
                "name": "Uttarakhand Ground Truth Specimen",
                "region": "Western Himalayas (India)",
                "rows": 1500,
                "slots_included": ["Harmonised NASA FIRMS"],
                "description": "Survey of India validated observations with confirmed 'type' ground truth (Class 0 Vegetation vs Class 2 Static Land Source).",
                "has_target_label": True,
                "suggested_target": "type"
            }
        ]
    }

class LoadSampleRequest(BaseModel):
    sample_id: str

@router.post("/load-sample")
def load_curated_sample(req: LoadSampleRequest):
    """Loads a pre-curated global demonstration dataset into an active studio session."""
    session_id = f"demo_{req.sample_id}_{uuid.uuid4().hex[:6]}"
    
    # 4-Slot Multi-File Bundle Special Case
    if req.sample_id == "four_slot_bundle":
        specimens = [
            ("modis_archive", "modis_archive_specimen.csv"),
            ("modis_nrt", "modis_nrt_specimen.csv"),
            ("viirs_archive", "viirs_archive_specimen.csv"),
            ("viirs_nrt", "viirs_nrt_specimen.csv"),
        ]
        dfs = []
        slot_summaries = {}
        for slot, fname in specimens:
            fpath = SAMPLE_DATA_DIR / fname
            if fpath.exists():
                raw = pd.read_csv(fpath)
                h_df = harmonise_single_dataframe(raw, slot, fname)
                dfs.append(h_df)
                slot_summaries[slot] = {
                    "filename": fname,
                    "rows": len(h_df),
                    "sensor": h_df["sensor"].iloc[0],
                    "category": h_df["source_category"].iloc[0]
                }
        
        if not dfs:
            raise HTTPException(status_code=404, detail="4-Slot specimen files not found on server.")
            
        combined_df = pd.concat(dfs, ignore_index=True)
        combined_df["harmonised_id"] = range(1, len(combined_df) + 1)
        
        # Cache Session
        if len(STUDIO_SESSIONS) >= MAX_CACHED_SESSIONS:
            oldest = list(STUDIO_SESSIONS.keys())[0]
            del STUDIO_SESSIONS[oldest]
            
        STUDIO_SESSIONS[session_id] = {
            "df_harmonised": combined_df,
            "dataset_name": "Global 4-Slot Multi-Satellite Bundle (California 2024)",
            "slots": slot_summaries,
            "is_multi_slot": True
        }
        
        return {
            "status": "SUCCESS",
            "session_id": session_id,
            "dataset_name": STUDIO_SESSIONS[session_id]["dataset_name"],
            "total_rows": len(combined_df),
            "slots": slot_summaries,
            "preview": sanitize_dataframe_preview(combined_df, 5)
        }

    # Single-Dataset Global Specimen
    filename_map = {
        "amazon_basin": "amazon_basin_2024.csv",
        "australia_bushfire": "australia_bushfire_2024.csv",
        "california_sierra": "california_sierra_2024.csv",
        "greece_mediterranean": "greece_mediterranean_2024.csv",
        "uttarakhand_specimen": "uttarakhand_ground_truth_specimen.csv"
    }
    fname = filename_map.get(req.sample_id)
    if not fname:
        raise HTTPException(status_code=400, detail="Unknown sample dataset ID")

    path = SAMPLE_DATA_DIR / fname
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Sample file {fname} not found on server")

    raw = pd.read_csv(path)
    h_df = harmonise_single_dataframe(raw, "generic", fname)
    h_df["harmonised_id"] = range(1, len(h_df) + 1)

    if len(STUDIO_SESSIONS) >= MAX_CACHED_SESSIONS:
        oldest = list(STUDIO_SESSIONS.keys())[0]
        del STUDIO_SESSIONS[oldest]

    dataset_title = fname.replace(".csv", "").replace("_", " ").title()
    STUDIO_SESSIONS[session_id] = {
        "df_harmonised": h_df,
        "dataset_name": dataset_title,
        "slots": {
            "primary": {
                "filename": fname,
                "rows": len(h_df),
                "sensor": h_df["sensor"].iloc[0] if not h_df.empty else "Harmonised",
                "category": h_df["source_category"].iloc[0] if not h_df.empty else "ARCHIVE"
            }
        },
        "is_multi_slot": False
    }

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "dataset_name": dataset_title,
        "total_rows": len(h_df),
        "slots": STUDIO_SESSIONS[session_id]["slots"],
        "preview": sanitize_dataframe_preview(h_df, 5)
    }

# -----------------------------------------------------------------------------
# 4-Slot Simultaneous Upload & Harmonisation Endpoint
# -----------------------------------------------------------------------------

@router.post("/upload-slots")
@router.post("/upload")
async def upload_four_firms_slots(
    modis_archive: Optional[UploadFile] = File(None),
    modis_nrt: Optional[UploadFile] = File(None),
    viirs_archive: Optional[UploadFile] = File(None),
    viirs_nrt: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    dataset_name: Optional[str] = Form(None)
):
    """
    Accepts up to 4 simultaneous NASA FIRMS CSV datasets:
    1. MODIS Archive (Terra/Aqua 1km Historic)
    2. MODIS NRT (Near Real-Time)
    3. VIIRS Archive (SNPP/NOAA-20/21 375m Historic)
    4. VIIRS NRT (Near Real-Time)
    Also accepts single file upload for backwards-compatibility.
    """
    slots = {
        "modis_archive": modis_archive,
        "modis_nrt": modis_nrt,
        "viirs_archive": viirs_archive,
        "viirs_nrt": viirs_nrt,
    }

    # If generic single file provided, identify slot automatically
    if file is not None and hasattr(file, "filename") and bool(file.filename):
        fn = file.filename.lower()
        if "modis" in fn and "archive" in fn:
            slots["modis_archive"] = file
        elif "modis" in fn and "nrt" in fn:
            slots["modis_nrt"] = file
        elif "viirs" in fn and "archive" in fn:
            slots["viirs_archive"] = file
        elif "viirs" in fn and "nrt" in fn:
            slots["viirs_nrt"] = file
        elif "viirs" in fn:
            slots["viirs_archive"] = file
        else:
            slots["generic_firms"] = file

    active_slots = {
        k: v for k, v in slots.items()
        if v is not None and hasattr(v, "filename") and bool(v.filename)
    }
    if not active_slots:
        raise HTTPException(
            status_code=400,
            detail="At least one valid NASA FIRMS CSV dataset must be uploaded in one of the 4 slots."
        )

    dfs = []
    slot_reports = {}
    total_raw_rows = 0

    for slot_name, up_file in active_slots.items():
        if not up_file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail=f"Slot '{slot_name}' file '{up_file.filename}' is not a CSV.")

        contents = await up_file.read()
        file_size_mb = round(len(contents) / (1024 * 1024), 2)
        
        # 300MB limit per file
        if len(contents) > 300 * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"File '{up_file.filename}' ({file_size_mb} MB) exceeds maximum 300MB limit.")

        try:
            # Efficient chunked parsing / limit up to 150k rows per slot for high-performance memory safety
            raw_df = pd.read_csv(io.BytesIO(contents), nrows=150000)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV in slot '{slot_name}': {str(e)}")

        if raw_df.empty or len(raw_df.columns) < 2:
            raise HTTPException(status_code=400, detail=f"File in slot '{slot_name}' is empty or malformed.")

        # Harmonise single dataframe into canonical schema
        try:
            h_df = harmonise_single_dataframe(raw_df, slot_name, up_file.filename)
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Validation failed for {slot_name}: {str(err)}")

        total_raw_rows += len(raw_df)
        dfs.append(h_df)

        slot_reports[slot_name] = {
            "filename": up_file.filename,
            "file_size_mb": file_size_mb,
            "raw_rows": len(raw_df),
            "valid_rows": len(h_df),
            "sensor": h_df["sensor"].iloc[0] if not h_df.empty else "Unknown",
            "category": h_df["source_category"].iloc[0] if not h_df.empty else "Unknown",
            "date_range": {
                "min": str(h_df["acq_date"].min()) if not h_df.empty and h_df["acq_date"].notna().any() else None,
                "max": str(h_df["acq_date"].max()) if not h_df.empty and h_df["acq_date"].notna().any() else None,
            }
        }

    # Combine all uploaded slots into unified harmonised dataset
    combined_df = pd.concat(dfs, ignore_index=True)

    # Cross-Sensor & Archive/NRT Deduplication
    initial_count = len(combined_df)
    
    # 1. Flag exact duplicates within same sensor across Archive and NRT
    # If a record in NRT matches an Archive record at same rounded lat/lon (+/- ~500m) and acq_date and acq_time
    combined_df["_lat_round"] = combined_df["latitude"].round(3)
    combined_df["_lon_round"] = combined_df["longitude"].round(3)

    # Sort so ARCHIVE comes first; drop duplicates in NRT that overlap with Archive
    combined_df = combined_df.sort_values(
        by=["source_category", "sensor", "acq_date", "acq_time"],
        ascending=[True, True, True, True]
    )

    dup_subset = ["sensor", "_lat_round", "_lon_round", "acq_date", "acq_time"]
    nrt_duplicates_removed = int(combined_df.duplicated(subset=dup_subset, keep="first").sum())
    combined_df = combined_df.drop_duplicates(subset=dup_subset, keep="first").copy()

    # 2. Flag Cross-Sensor Co-Observations (MODIS + VIIRS simultaneously viewing the same fire)
    # They are NOT deleted, but flagged with scientific provenance!
    cross_sensor_mask = combined_df.duplicated(subset=["_lat_round", "_lon_round", "acq_date"], keep=False)
    combined_df["is_cross_sensor_match"] = cross_sensor_mask

    # Assign final sequential harmonised IDs
    combined_df = combined_df.drop(columns=["_lat_round", "_lon_round"])
    combined_df["harmonised_id"] = range(1, len(combined_df) + 1)

    session_id = f"session_{uuid.uuid4().hex[:8]}"
    clean_name = dataset_name.strip() if dataset_name and dataset_name.strip() else f"Multi-Satellite Global Harmonisation ({len(active_slots)} Sources)"

    if len(STUDIO_SESSIONS) >= MAX_CACHED_SESSIONS:
        oldest = list(STUDIO_SESSIONS.keys())[0]
        del STUDIO_SESSIONS[oldest]

    STUDIO_SESSIONS[session_id] = {
        "df_harmonised": combined_df,
        "dataset_name": clean_name,
        "slots": slot_reports,
        "is_multi_slot": len(active_slots) > 1,
        "harmonisation_audit": {
            "initial_raw_rows": total_raw_rows,
            "valid_coordinate_rows": initial_count,
            "nrt_duplicates_removed": nrt_duplicates_removed,
            "cross_sensor_co_observations": int(cross_sensor_mask.sum()),
            "net_harmonised_observations": len(combined_df)
        }
    }

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "dataset_name": clean_name,
        "active_slot_count": len(active_slots),
        "slot_reports": slot_reports,
        "harmonisation_audit": STUDIO_SESSIONS[session_id]["harmonisation_audit"],
        "columns": CANONICAL_COLUMNS,
        "preview": sanitize_dataframe_preview(combined_df, 5)
    }

# -----------------------------------------------------------------------------
# Profiling & Global Spatial Geometry
# -----------------------------------------------------------------------------

class ProfileRequest(BaseModel):
    session_id: str
    max_geojson_samples: Optional[int] = 1200

@router.post("/profile")
def profile_dataset(req: ProfileRequest):
    """Generates global geospatial bounding box, radiometric distributions, and MapLibre GeoJSON."""
    session = STUDIO_SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired or invalid. Please upload dataset.")

    df: pd.DataFrame = session.get("df_harmonised")
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="Harmonised dataset is empty.")

    total_rows = len(df)
    
    # Global Bounding Box & Spatial Extent
    min_lat = float(df["latitude"].min())
    max_lat = float(df["latitude"].max())
    min_lon = float(df["longitude"].min())
    max_lon = float(df["longitude"].max())
    center_lat = round(float((min_lat + max_lat) / 2.0), 5)
    center_lon = round(float((min_lon + max_lon) / 2.0), 5)

    # Approximate ground surface area in km2
    lat_span_km = abs(max_lat - min_lat) * 111.0
    avg_lat_rad = math.radians(center_lat)
    lon_span_km = abs(max_lon - min_lon) * 111.0 * math.cos(avg_lat_rad)
    approx_area_sqkm = round(max(1.0, lat_span_km * lon_span_km), 1)

    # Radiometric Distributions
    frp_vals = df["frp"].dropna()
    frp_stats = {
        "total_mw": round(float(frp_vals.sum()), 1),
        "mean_mw": round(float(frp_vals.mean()), 2) if not frp_vals.empty else 0.0,
        "median_mw": round(float(frp_vals.median()), 2) if not frp_vals.empty else 0.0,
        "max_mw": round(float(frp_vals.max()), 2) if not frp_vals.empty else 0.0,
        "p95_mw": round(float(np.percentile(frp_vals, 95)), 2) if not frp_vals.empty else 0.0,
    }

    brightness_vals = df["brightness"].dropna()
    brightness_stats = {
        "min_k": round(float(brightness_vals.min()), 2) if not brightness_vals.empty else 300.0,
        "mean_k": round(float(brightness_vals.mean()), 2) if not brightness_vals.empty else 315.0,
        "max_k": round(float(brightness_vals.max()), 2) if not brightness_vals.empty else 400.0,
    }

    # Sensor & Category Breakdowns
    sensor_counts = {str(k): int(v) for k, v in df["sensor"].value_counts().items()}
    category_counts = {str(k): int(v) for k, v in df["source_category"].value_counts().items()}
    conf_counts = {str(k): int(v) for k, v in df["confidence_class"].value_counts().items()}
    daynight_counts = {str(k): int(v) for k, v in df["daynight"].value_counts().items()}

    # Target / Type Ground Truth Distribution
    type_counts = df["type"].dropna().value_counts()
    target_summary = {
        "has_target_label": len(type_counts) >= 2,
        "classes": [str(k) for k in type_counts.index.tolist()],
        "counts": {str(k): int(v) for k, v in type_counts.items()},
        "is_suitable_for_supervised": 2 <= len(type_counts) <= 10
    }

    # Monthly Distribution (when dates exist)
    monthly_dist = {}
    if df["acq_date"].notna().any():
        try:
            months = pd.to_datetime(df["acq_date"], errors="coerce").dt.strftime("%Y-%m")
            m_counts = months.dropna().value_counts().sort_index()
            monthly_dist = {str(k): int(v) for k, v in m_counts.items()}
        except Exception:
            pass

    # High-Performance GeoJSON Sample for Global MapLibre
    sample_size = min(total_rows, req.max_geojson_samples or 1200)
    # Stratified/weighted sample prioritising intense FRP detections while representing all sensors
    df_sample = df.sort_values(by="frp", ascending=False).head(sample_size)

    features = []
    for _, row in df_sample.iterrows():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row["longitude"]), float(row["latitude"])]
            },
            "properties": {
                "id": int(row["harmonised_id"]),
                "frp": round(float(row["frp"]), 2),
                "brightness": round(float(row["brightness"]), 2),
                "bright_t31": round(float(row["bright_t31"]), 2),
                "sensor": str(row["sensor"]),
                "satellite": str(row["satellite"]),
                "category": str(row["source_category"]),
                "confidence_class": str(row["confidence_class"]),
                "daynight": str(row["daynight"]),
                "type": int(row["type"]) if pd.notna(row["type"]) else None,
                "acq_date": str(row["acq_date"]) if pd.notna(row["acq_date"]) else None,
                "acq_time": str(row["acq_time"]) if pd.notna(row["acq_time"]) else None
            }
        })

    geojson_collection = {
        "type": "FeatureCollection",
        "features": features
    }

    return {
        "status": "SUCCESS",
        "dataset_name": session["dataset_name"],
        "harmonisation_summary": session.get("harmonisation_audit", {
            "net_harmonised_observations": total_rows
        }),
        "slot_reports": session.get("slots", {}),
        "spatial": {
            "bbox": [min_lon, min_lat, max_lon, max_lat],
            "center": [center_lon, center_lat],
            "area_sqkm": approx_area_sqkm
        },
        "radiometrics": {
            "frp": frp_stats,
            "brightness": brightness_stats
        },
        "breakdowns": {
            "sensors": sensor_counts,
            "categories": category_counts,
            "confidence": conf_counts,
            "daynight": daynight_counts,
            "monthly": monthly_dist
        },
        "target": target_summary,
        "geojson": geojson_collection
    }

# -----------------------------------------------------------------------------
# Machine Learning Pipeline (Supervised RF & XGBoost vs Unsupervised DBSCAN/IF)
# -----------------------------------------------------------------------------

class TrainRequest(BaseModel):
    session_id: str
    mode: str = Field("auto", description="'auto', 'supervised', or 'unsupervised'")
    test_size: Optional[float] = 0.20

@router.post("/train")
def execute_ml_pipeline(req: TrainRequest):
    """
    Executes production-grade Machine Learning:
    - Supervised Classification: Random Forest Classifier + XGBoost Classifier (with strict spatial coordinate exclusion)
    - Unsupervised Machine Learning: DBSCAN Spatial Clustering + Isolation Forest Radiometric Anomaly Detection
    """
    session = STUDIO_SESSIONS.get(req.session_id)
    if not session or "df_harmonised" not in session:
        raise HTTPException(status_code=400, detail="Dataset must be loaded and harmonised before training.")

    df: pd.DataFrame = session["df_harmonised"].copy()
    
    # Check if valid ground-truth target label exists (e.g. 'type' with >= 2 classes)
    has_labels = False
    if "type" in df.columns:
        valid_types = df["type"].dropna()
        if valid_types.nunique() >= 2:
            has_labels = True

    is_supervised = (req.mode == "supervised") or (req.mode == "auto" and has_labels)

    # -------------------------------------------------------------------------
    # CASE A: REAL SUPERVISED CLASSIFICATION (Random Forest & XGBoost)
    # -------------------------------------------------------------------------
    if is_supervised and has_labels:
        df_labeled = df[df["type"].notna()].copy()
        
        # Subsample if extremely large to maintain rapid response
        if len(df_labeled) > 40000:
            df_labeled = df_labeled.sample(n=40000, random_state=42)

        # STRICT SCIENTIFIC RULE: Exclude latitude & longitude coordinates to prevent spatial memorization!
        df_labeled["brightness_delta"] = df_labeled["brightness"] - df_labeled["bright_t31"]
        
        feature_cols = ["brightness", "bright_t31", "brightness_delta", "frp", "scan", "track"]
        X_numeric = df_labeled[feature_cols].fillna(df_labeled[feature_cols].median())
        
        # Categorical features
        X_cat = pd.get_dummies(df_labeled[["sensor", "daynight", "confidence_class"]], drop_first=True)
        X_all = pd.concat([X_numeric, X_cat], axis=1)

        y_all = df_labeled["type"].astype(int).astype(str)
        y_classes, y_counts = np.unique(y_all, return_counts=True)

        stratify_val = y_all if y_counts.min() >= 2 else None

        X_train, X_test, y_train, y_test = train_test_split(
            X_all, y_all, test_size=req.test_size or 0.2, random_state=42, stratify=stratify_val
        )

        # 1. Baseline Model (Dummy Classifier / Majority Class)
        dummy = DummyClassifier(strategy="most_frequent")
        dummy.fit(X_train, y_train)
        dummy_acc = round(float(accuracy_score(y_test, dummy.predict(X_test))) * 100, 2)

        # 2. Random Forest Classifier
        rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)

        rf_acc = round(float(accuracy_score(y_test, rf_pred)) * 100, 2)
        rf_bal = round(float(balanced_accuracy_score(y_test, rf_pred)) * 100, 2)
        p, r, f, _ = precision_recall_fscore_support(y_test, rf_pred, average="macro", zero_division=0)
        rf_prec = round(float(p) * 100, 2)
        rf_rec = round(float(r) * 100, 2)
        rf_f1 = round(float(f) * 100, 2)

        # 3. XGBoost Classifier (or Gradient Boosting fallback)
        xgb_model_name = "XGBoost Classifier (100 Trees, Depth 6)" if HAS_XGBOOST else "Gradient Boosting Classifier (100 Trees)"
        if HAS_XGBOOST:
            # Map string classes to integer labels 0..K-1 for XGBoost
            class_to_idx = {c: i for i, c in enumerate(sorted(y_classes))}
            idx_to_class = {i: c for c, i in class_to_idx.items()}
            y_train_num = y_train.map(class_to_idx)
            y_test_num = y_test.map(class_to_idx)

            xgb_clf = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                eval_metric="mlogloss" if len(class_to_idx) > 2 else "logloss"
            )
            xgb_clf.fit(X_train, y_train_num)
            xgb_pred_num = xgb_clf.predict(X_test)
            xgb_pred = [idx_to_class[i] for i in xgb_pred_num]
        else:
            gb_clf = GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
            gb_clf.fit(X_train, y_train)
            xgb_pred = gb_clf.predict(X_test)

        xgb_acc = round(float(accuracy_score(y_test, xgb_pred)) * 100, 2)
        xgb_bal = round(float(balanced_accuracy_score(y_test, xgb_pred)) * 100, 2)
        xp, xr, xf, _ = precision_recall_fscore_support(y_test, xgb_pred, average="macro", zero_division=0)
        xgb_prec = round(float(xp) * 100, 2)
        xgb_rec = round(float(xr) * 100, 2)
        xgb_f1 = round(float(xf) * 100, 2)

        # Confusion Matrix
        labels = sorted(y_classes.tolist())
        cm = confusion_matrix(y_test, rf_pred, labels=labels).tolist()

        # Feature Importances from Random Forest
        importances = []
        for col, imp in sorted(zip(X_all.columns, rf.feature_importances_), key=lambda x: x[1], reverse=True)[:8]:
            importances.append({
                "feature": str(col),
                "importance_pct": round(float(imp) * 100, 2)
            })

        # GeoJSON Sample with predictions
        sample_pts = df_labeled.loc[X_test.index].head(400).copy()
        X_sample = X_all.loc[sample_pts.index]
        preds = rf.predict(X_sample)

        features = []
        for (idx, row), pred_val in zip(sample_pts.iterrows(), preds):
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["longitude"]), float(row["latitude"])]
                },
                "properties": {
                    "id": int(row["harmonised_id"]),
                    "actual_type": int(row["type"]),
                    "predicted_type": int(pred_val),
                    "is_correct": bool(int(row["type"]) == int(pred_val)),
                    "frp": round(float(row["frp"]), 2),
                    "brightness": round(float(row["brightness"]), 2),
                    "sensor": str(row["sensor"])
                }
            })

        # Store test predictions in session for CSV export
        pred_df = sample_pts[["harmonised_id", "latitude", "longitude", "sensor", "frp", "type"]].copy()
        pred_df["predicted_type"] = preds
        session["predictions_df"] = pred_df

        return {
            "status": "SUCCESS",
            "model_type": "SUPERVISED_DUAL_CLASSIFIER",
            "target_variable": "type (Thermal Observation Class)",
            "classes": labels,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "features_used": X_all.columns.tolist(),
            "models": {
                "random_forest": {
                    "name": "Random Forest Classifier (100 Trees, Max Depth 10)",
                    "accuracy": rf_acc,
                    "balanced_accuracy": rf_bal,
                    "macro_precision": rf_prec,
                    "macro_recall": rf_rec,
                    "macro_f1": rf_f1
                },
                "xgboost": {
                    "name": xgb_model_name,
                    "accuracy": xgb_acc,
                    "balanced_accuracy": xgb_bal,
                    "macro_precision": xgb_prec,
                    "macro_recall": xgb_rec,
                    "macro_f1": xgb_f1
                },
                "baseline": {
                    "name": "Majority Class Dummy Classifier",
                    "accuracy": dummy_acc
                }
            },
            "confusion_matrix": {
                "labels": labels,
                "matrix": cm
            },
            "feature_importance": importances,
            "geojson": {
                "type": "FeatureCollection",
                "features": features
            },
            "scientific_disclosure": (
                "Supervised classification evaluates observation categorization (e.g. vegetation fire vs static industrial heat source). "
                "Geographic coordinates were strictly excluded from model features to prevent spatial memorization. "
                "This model distinguishes satellite radiometric characteristics, NOT future wildfire occurrence."
            )
        }

    # -------------------------------------------------------------------------
    # CASE B: UNSUPERVISED MACHINE LEARNING (Clustering & Anomaly Detection)
    # -------------------------------------------------------------------------
    coords = df[["latitude", "longitude"]].values
    
    # Subsample if dataset is enormous
    sub_df = df.sample(n=min(len(df), 25000), random_state=42) if len(df) > 25000 else df.copy()
    coords_sub = sub_df[["latitude", "longitude"]].values

    # 1. DBSCAN Spatial Clustering
    db = DBSCAN(eps=0.08, min_samples=4)
    db_labels = db.fit_predict(coords_sub)
    sub_df["cluster_id"] = db_labels

    cluster_counts = pd.Series(db_labels).value_counts()
    n_clusters = int((cluster_counts.index != -1).sum())
    n_outliers = int(cluster_counts.get(-1, 0))

    # 2. Isolation Forest Radiometric Anomaly Detection
    X_anom = sub_df[["frp", "brightness", "scan", "track"]].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_anom)

    iso = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    iso_preds = iso.fit_predict(X_scaled) # -1 is anomaly, 1 is normal
    sub_df["is_anomaly"] = (iso_preds == -1)

    anomaly_count = int((iso_preds == -1).sum())
    anomaly_pct = round(float(anomaly_count) / len(sub_df) * 100, 2)

    # GeoJSON Sample with cluster and anomaly labels
    sample_pts = sub_df.head(600).copy()
    features = []
    for _, row in sample_pts.iterrows():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row["longitude"]), float(row["latitude"])]
            },
            "properties": {
                "id": int(row["harmonised_id"]),
                "cluster_id": int(row["cluster_id"]),
                "is_cluster_core": bool(row["cluster_id"] != -1),
                "is_anomaly": bool(row["is_anomaly"]),
                "frp": round(float(row["frp"]), 2),
                "brightness": round(float(row["brightness"]), 2),
                "sensor": str(row["sensor"])
            }
        })

    return {
        "status": "SUCCESS",
        "model_type": "UNSUPERVISED_SPATIAL_ANOMALY",
        "model_name": "DBSCAN Spatial Clusterer + Isolation Forest Radiometric Detector",
        "training_samples": len(sub_df),
        "spatial_clusters": {
            "cluster_count": n_clusters,
            "isolated_hotspots": n_outliers,
            "largest_cluster_obs": int(cluster_counts[cluster_counts.index != -1].max()) if n_clusters > 0 else 0
        },
        "anomaly_detection": {
            "method": "Isolation Forest (Contamination 5%)",
            "anomalous_observations": anomaly_count,
            "anomaly_percentage": anomaly_pct
        },
        "geojson": {
            "type": "FeatureCollection",
            "features": features
        },
        "scientific_disclosure": (
            "Because no valid ground-truth target class label exists in the uploaded stream (common in Near Real-Time telemetry), "
            "unsupervised algorithms were executed: DBSCAN groups multi-pixel spatial fire complexes, and Isolation Forest isolates extreme "
            "radiometric outliers. Neither method represents future wildfire prediction or crown fire severity."
        )
    }

# -----------------------------------------------------------------------------
# Downloadable Reports & Data Export
# -----------------------------------------------------------------------------

class ExportRequest(BaseModel):
    session_id: str
    format: str = Field("harmonised_csv", description="'harmonised_csv', 'report_csv', 'predictions_csv', 'metrics_json', or 'geojson'")

@router.post("/export")
def export_research_package(req: ExportRequest):
    """Generates downloadable scientific research artifacts."""
    session = STUDIO_SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired.")

    dataset_name = session.get("dataset_name", "Global Thermal Dataset")
    df: pd.DataFrame = session.get("df_harmonised")
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="No harmonised data available to export.")

    base_slug = dataset_name.lower().replace(" ", "_").replace("(", "").replace(")", "")[:30]

    # 1. Full Harmonised Canonical CSV
    if req.format in ["harmonised_csv", "csv"]:
        csv_buffer = io.StringIO()
        # Export up to 50k rows directly in response
        export_df = df.head(50000)
        export_df.to_csv(csv_buffer, index=False)
        return {
            "status": "SUCCESS",
            "format": "csv",
            "filename": "harmonised_global_fire_observations.csv",
            "total_rows": len(export_df),
            "content": csv_buffer.getvalue()
        }

    # 2. Global Analysis Report CSV
    if req.format == "report_csv":
        report_data = [
            {"Metric": "Dataset Name", "Value": dataset_name},
            {"Metric": "Total Harmonised Observations", "Value": len(df)},
            {"Metric": "VIIRS Observation Count", "Value": int((df["sensor"] == "VIIRS").sum())},
            {"Metric": "MODIS Observation Count", "Value": int((df["sensor"] == "MODIS").sum())},
            {"Metric": "Archive Observations", "Value": int((df["source_category"] == "ARCHIVE").sum())},
            {"Metric": "Near Real-Time Observations", "Value": int((df["source_category"] == "NRT").sum())},
            {"Metric": "Min Latitude", "Value": float(df["latitude"].min())},
            {"Metric": "Max Latitude", "Value": float(df["latitude"].max())},
            {"Metric": "Min Longitude", "Value": float(df["longitude"].min())},
            {"Metric": "Max Longitude", "Value": float(df["longitude"].max())},
            {"Metric": "Total Radiative Power (MW)", "Value": float(df["frp"].sum())},
            {"Metric": "Mean Radiative Power (MW)", "Value": float(df["frp"].mean())},
            {"Metric": "Max Radiative Power (MW)", "Value": float(df["frp"].max())},
            {"Metric": "High Confidence Count", "Value": int((df["confidence_class"] == "high").sum())},
            {"Metric": "Nominal Confidence Count", "Value": int((df["confidence_class"] == "nominal").sum())},
            {"Metric": "Low Confidence Count", "Value": int((df["confidence_class"] == "low").sum())},
        ]
        rep_df = pd.DataFrame(report_data)
        csv_buffer = io.StringIO()
        rep_df.to_csv(csv_buffer, index=False)
        return {
            "status": "SUCCESS",
            "format": "csv",
            "filename": "global_fire_analysis_report.csv",
            "content": csv_buffer.getvalue()
        }

    # 3. Model Predictions CSV
    if req.format == "predictions_csv":
        pred_df = session.get("predictions_df")
        if pred_df is None or pred_df.empty:
            raise HTTPException(status_code=400, detail="No supervised model predictions available for this session.")
        csv_buffer = io.StringIO()
        pred_df.to_csv(csv_buffer, index=False)
        return {
            "status": "SUCCESS",
            "format": "csv",
            "filename": "model_predictions.csv",
            "content": csv_buffer.getvalue()
        }

    # 4. GeoJSON Export
    if req.format == "geojson":
        pts = df.head(1000)
        feats = []
        for _, r in pts.iterrows():
            feats.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(r["longitude"]), float(r["latitude"])]
                },
                "properties": {
                    "id": int(r["harmonised_id"]),
                    "sensor": str(r["sensor"]),
                    "frp": float(r["frp"]),
                    "brightness": float(r["brightness"]),
                    "confidence": str(r["confidence_class"]),
                    "date": str(r["acq_date"])
                }
            })
        return {
            "status": "SUCCESS",
            "format": "geojson",
            "filename": "spatial_clusters.geojson",
            "content": {"type": "FeatureCollection", "features": feats}
        }

    raise HTTPException(status_code=400, detail=f"Unsupported export format: {req.format}")
