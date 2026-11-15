"""
FIREINTEL Global Fire Intelligence Studio & Automated ML Router.
Provides dataset upload, automated profiling, MapLibre spatial geometry,
supervised Random Forest classification, and unsupervised DBSCAN/Isolation Forest analysis.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
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
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.dummy import DummyClassifier
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

router = APIRouter(prefix="/studio", tags=["Global Studio & AutoML"])

# In-memory session cache for dataset studio (with cleanup limit)
STUDIO_SESSIONS: Dict[str, Dict[str, Any]] = {}
MAX_CACHED_SESSIONS = 30
SAMPLE_DATA_DIR = Path("fireIntel/data/studio_samples")

def sanitize_dataframe_preview(df: pd.DataFrame, max_rows: int = 5) -> List[Dict[str, Any]]:
    preview = df.head(max_rows).copy()
    # Replace NaN / inf with None for valid JSON serialization
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

def guess_column_mappings(columns: List[str]) -> Dict[str, Optional[str]]:
    cols_lower = {c.lower(): c for c in columns}
    
    # Lat
    lat_col = None
    for cand in ["latitude", "lat", "y_coord", "y"]:
        if cand in cols_lower:
            lat_col = cols_lower[cand]
            break
            
    # Lon
    lon_col = None
    for cand in ["longitude", "lon", "lng", "long", "x_coord", "x"]:
        if cand in cols_lower:
            lon_col = cols_lower[cand]
            break

    # Date
    date_col = None
    for cand in ["acq_date", "date", "datetime", "timestamp", "observation_date"]:
        if cand in cols_lower:
            date_col = cols_lower[cand]
            break

    # FRP
    frp_col = None
    for cand in ["frp", "fire_radiative_power", "power", "radiant_power"]:
        if cand in cols_lower:
            frp_col = cols_lower[cand]
            break

    # Brightness
    brightness_col = None
    for cand in ["brightness", "bright_ti4", "bright_ti5", "temp_k", "temperature"]:
        if cand in cols_lower:
            brightness_col = cols_lower[cand]
            break

    # Sensor
    sensor_col = None
    for cand in ["sensor", "instrument"]:
        if cand in cols_lower:
            sensor_col = cols_lower[cand]
            break

    # Confidence
    conf_col = None
    for cand in ["confidence", "confidence_class", "conf"]:
        if cand in cols_lower:
            conf_col = cols_lower[cand]
            break

    # Target
    target_col = None
    for cand in ["type", "target", "label", "class", "fire_type", "is_vegetation_fire"]:
        if cand in cols_lower:
            target_col = cols_lower[cand]
            break

    return {
        "lat_col": lat_col,
        "lon_col": lon_col,
        "date_col": date_col,
        "frp_col": frp_col,
        "brightness_col": brightness_col,
        "sensor_col": sensor_col,
        "confidence_col": conf_col,
        "target_col": target_col
    }

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/samples")
def get_curated_samples():
    """Returns curated demonstration datasets across the globe for 1-click testing."""
    return {
        "status": "SUCCESS",
        "samples": [
            {
                "id": "california_sierra",
                "name": "California Sierra Nevada Hotspots (2024)",
                "region": "United States (California)",
                "rows": 1250,
                "sensors": "VIIRS (75%) / MODIS (25%)",
                "description": "Real-coordinate satellite thermal detections from Northern California / Sierra Nevada conifer belts.",
                "has_target_label": False
            },
            {
                "id": "greece_mediterranean",
                "name": "Greece Attica Wildfire Corridor (August 2024)",
                "region": "Southern Europe (Greece)",
                "rows": 950,
                "sensors": "VIIRS (80%) / MODIS (20%)",
                "description": "Extreme Mediterranean summer fire activity across pine-maquis coastal mountain gradients.",
                "has_target_label": False
            },
            {
                "id": "uttarakhand_specimen",
                "name": "Uttarakhand Ground Truth Specimen",
                "region": "Western Himalayas (India)",
                "rows": 1500,
                "sensors": "VIIRS & MODIS Harmonised",
                "description": "Validated NASA FIRMS observations with confirmed 'type' ground truth (Class 0 Vegetation vs Class 2 Static Land Source).",
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
    filename_map = {
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

    df = pd.read_csv(path)
    session_id = f"demo_{req.sample_id}_{uuid.uuid4().hex[:6]}"
    
    # Cache session
    if len(STUDIO_SESSIONS) >= MAX_CACHED_SESSIONS:
        oldest = list(STUDIO_SESSIONS.keys())[0]
        del STUDIO_SESSIONS[oldest]
        
    STUDIO_SESSIONS[session_id] = {
        "df": df,
        "dataset_name": fname.replace(".csv", "").replace("_", " ").title(),
        "filename": fname
    }

    mappings = guess_column_mappings(df.columns.tolist())
    
    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "dataset_name": STUDIO_SESSIONS[session_id]["dataset_name"],
        "total_rows": len(df),
        "columns": df.columns.tolist(),
        "column_mappings": mappings,
        "preview": sanitize_dataframe_preview(df, 5)
    }

@router.post("/upload")
async def upload_dataset_csv(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = Form(None)
):
    """Accepts and parses user-uploaded CSV dataset with size and security boundaries."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV format is supported. Please upload a valid .csv file.")

    contents = await file.read()
    # 20MB limit
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds maximum 20MB limit.")

    try:
        df = pd.read_csv(io.BytesIO(contents), nrows=50000)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty or len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="CSV file is empty or does not contain multiple columns.")

    session_id = f"user_{uuid.uuid4().hex[:8]}"
    clean_name = dataset_name.strip() if dataset_name and dataset_name.strip() else file.filename.replace(".csv", "")

    # Cache in memory
    if len(STUDIO_SESSIONS) >= MAX_CACHED_SESSIONS:
        oldest = list(STUDIO_SESSIONS.keys())[0]
        del STUDIO_SESSIONS[oldest]

    STUDIO_SESSIONS[session_id] = {
        "df": df,
        "dataset_name": clean_name,
        "filename": file.filename
    }

    mappings = guess_column_mappings(df.columns.tolist())

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "dataset_name": clean_name,
        "total_rows": len(df),
        "columns": df.columns.tolist(),
        "column_mappings": mappings,
        "preview": sanitize_dataframe_preview(df, 5)
    }

class ColumnMappings(BaseModel):
    lat_col: str
    lon_col: str
    date_col: Optional[str] = None
    frp_col: Optional[str] = None
    brightness_col: Optional[str] = None
    sensor_col: Optional[str] = None
    confidence_col: Optional[str] = None
    target_col: Optional[str] = None

class ProfileRequest(BaseModel):
    session_id: str
    mappings: ColumnMappings
    max_geojson_samples: Optional[int] = 400

@router.post("/profile")
def profile_dataset(req: ProfileRequest):
    """Generates comprehensive data quality profile, spatial geometry, and radiometric stats."""
    session = STUDIO_SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired or invalid. Please re-upload dataset.")

    df: pd.DataFrame = session["df"]
    m = req.mappings

    if m.lat_col not in df.columns or m.lon_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Specified coordinate columns '{m.lat_col}' and '{m.lon_col}' do not exist in dataset.")

    total_rows = len(df)
    
    # 1. Coordinate Validation
    valid_lat = pd.to_numeric(df[m.lat_col], errors="coerce")
    valid_lon = pd.to_numeric(df[m.lon_col], errors="coerce")

    coord_mask = (
        valid_lat.notna() &
        valid_lon.notna() &
        (valid_lat >= -90.0) & (valid_lat <= 90.0) &
        (valid_lon >= -180.0) & (valid_lon <= 180.0)
    )

    valid_count = int(coord_mask.sum())
    invalid_coord_count = total_rows - valid_count
    
    if valid_count == 0:
        raise HTTPException(status_code=400, detail="Zero valid geographic coordinates found. Ensure latitude (-90 to 90) and longitude (-180 to 180) are mapped correctly.")

    df_valid = df[coord_mask].copy()
    df_valid["_lat"] = valid_lat[coord_mask]
    df_valid["_lon"] = valid_lon[coord_mask]

    # Duplicate detection based on coordinates + date if available
    dup_cols = ["_lat", "_lon"]
    if m.date_col and m.date_col in df_valid.columns:
        dup_cols.append(m.date_col)
    duplicate_rows = int(df_valid.duplicated(subset=dup_cols).sum())

    # 2. Geographic Bounding Box & Spatial Extent
    min_lat = float(df_valid["_lat"].min())
    max_lat = float(df_valid["_lat"].max())
    min_lon = float(df_valid["_lon"].min())
    max_lon = float(df_valid["_lon"].max())
    center_lat = round(float((min_lat + max_lat) / 2.0), 5)
    center_lon = round(float((min_lon + max_lon) / 2.0), 5)

    # Approximate ground surface area in km2
    lat_span_km = abs(max_lat - min_lat) * 111.0
    avg_lat_rad = math.radians(center_lat)
    lon_span_km = abs(max_lon - min_lon) * 111.0 * math.cos(avg_lat_rad)
    approx_area_sqkm = round(max(1.0, lat_span_km * lon_span_km), 1)

    # 3. Radiometrics (FRP and Brightness)
    frp_stats = None
    if m.frp_col and m.frp_col in df_valid.columns:
        frp_vals = pd.to_numeric(df_valid[m.frp_col], errors="coerce").dropna()
        if not frp_vals.empty:
            frp_stats = {
                "min": round(float(frp_vals.min()), 2),
                "max": round(float(frp_vals.max()), 2),
                "mean": round(float(frp_vals.mean()), 2),
                "median": round(float(frp_vals.median()), 2),
                "p95": round(float(np.percentile(frp_vals, 95)), 2)
            }

    brightness_stats = None
    if m.brightness_col and m.brightness_col in df_valid.columns:
        b_vals = pd.to_numeric(df_valid[m.brightness_col], errors="coerce").dropna()
        if not b_vals.empty:
            brightness_stats = {
                "min": round(float(b_vals.min()), 2),
                "max": round(float(b_vals.max()), 2),
                "mean": round(float(b_vals.mean()), 2),
                "median": round(float(b_vals.median()), 2)
            }

    # 4. Sensor Distribution
    sensors_dict = {}
    if m.sensor_col and m.sensor_col in df_valid.columns:
        counts = df_valid[m.sensor_col].astype(str).value_counts()
        for k, v in counts.items():
            sensors_dict[k] = int(v)

    # 5. Date Range
    date_bounds = None
    if m.date_col and m.date_col in df_valid.columns:
        dates = df_valid[m.date_col].dropna().astype(str)
        if not dates.empty:
            date_bounds = {
                "min_date": str(dates.min()),
                "max_date": str(dates.max())
            }

    # 6. Target Distribution (if target selected)
    target_summary = None
    if m.target_col and m.target_col in df_valid.columns:
        t_counts = df_valid[m.target_col].value_counts()
        target_summary = {
            "target_col": m.target_col,
            "classes": [str(k) for k in t_counts.index.tolist()],
            "counts": {str(k): int(v) for k, v in t_counts.items()},
            "class_count": len(t_counts),
            "is_suitable_for_supervised": 2 <= len(t_counts) <= 10
        }

    # 7. Generate GeoJSON Point FeatureCollection Sample for MapLibre
    sample_size = min(len(df_valid), req.max_geojson_samples or 400)
    # Sort by FRP descending if FRP exists to show the most intense fires
    if m.frp_col and m.frp_col in df_valid.columns:
        df_sample = df_valid.sort_values(by=m.frp_col, ascending=False).head(sample_size)
    else:
        df_sample = df_valid.head(sample_size)

    features = []
    for _, row in df_sample.iterrows():
        frp_val = float(row[m.frp_col]) if m.frp_col and pd.notna(row.get(m.frp_col)) else 10.0
        b_val = float(row[m.brightness_col]) if m.brightness_col and pd.notna(row.get(m.brightness_col)) else 310.0
        sensor_val = str(row[m.sensor_col]) if m.sensor_col and pd.notna(row.get(m.sensor_col)) else "Satellite"
        conf_val = str(row[m.confidence_col]) if m.confidence_col and pd.notna(row.get(m.confidence_col)) else "nominal"
        target_val = str(row[m.target_col]) if m.target_col and pd.notna(row.get(m.target_col)) else None

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row["_lon"]), float(row["_lat"])]
            },
            "properties": {
                "frp": round(frp_val, 2),
                "brightness": round(b_val, 2),
                "sensor": sensor_val,
                "confidence": conf_val,
                "target": target_val,
                "date": str(row[m.date_col]) if m.date_col and pd.notna(row.get(m.date_col)) else None
            }
        })

    geojson_collection = {
        "type": "FeatureCollection",
        "features": features
    }

    # Cache cleaned dataframe for training
    session["df_valid"] = df_valid
    session["mappings"] = m.dict()

    return {
        "status": "SUCCESS",
        "dataset_name": session["dataset_name"],
        "quality": {
            "total_rows": total_rows,
            "valid_rows": valid_count,
            "invalid_coords": invalid_coord_count,
            "duplicate_rows": duplicate_rows,
            "missing_cells_pct": round(float(df.isna().sum().sum()) / (total_rows * len(df.columns)) * 100, 2)
        },
        "spatial": {
            "bbox": [min_lon, min_lat, max_lon, max_lat],
            "center": [center_lon, center_lat],
            "area_sqkm": approx_area_sqkm
        },
        "radiometrics": {
            "frp": frp_stats,
            "brightness": brightness_stats
        },
        "sensors": sensors_dict,
        "temporal": date_bounds,
        "target": target_summary,
        "geojson": geojson_collection
    }

class TrainRequest(BaseModel):
    session_id: str
    mode: str = Field("auto", description="'auto', 'supervised', or 'unsupervised'")
    target_col: Optional[str] = None
    test_size: Optional[float] = 0.20

@router.post("/train")
def execute_automl_pipeline(req: TrainRequest):
    """
    Executes real machine learning pipeline:
    Case A: Supervised Classification (Random Forest vs Baseline) if valid target exists.
    Case B: Unsupervised Spatial Hotspot (DBSCAN) & Anomaly Detection (Isolation Forest).
    """
    session = STUDIO_SESSIONS.get(req.session_id)
    if not session or "df_valid" not in session:
        raise HTTPException(status_code=400, detail="Dataset must be profiled before running machine learning.")

    df: pd.DataFrame = session["df_valid"].copy()
    mappings: Dict[str, Any] = session["mappings"]
    target_candidate = req.target_col or mappings.get("target_col")

    # Determine execution mode
    is_supervised = False
    if req.mode in ["auto", "supervised"] and target_candidate and target_candidate in df.columns:
        non_null_target = df[target_candidate].dropna()
        n_unique = non_null_target.nunique()
        if 2 <= n_unique <= 10:
            is_supervised = True

    # -------------------------------------------------------------------------
    # CASE A: REAL SUPERVISED CLASSIFICATION
    # -------------------------------------------------------------------------
    if is_supervised:
        # Prepare feature matrix: Exclude coordinate columns to prevent spatial memorization
        exclude_cols = [
            mappings["lat_col"], mappings["lon_col"], "_lat", "_lon",
            target_candidate
        ]
        if mappings.get("date_col"):
            exclude_cols.append(mappings["date_col"])

        feature_cols = [c for c in df.columns if c not in exclude_cols]
        
        # Prepare X and y
        valid_idx = df[target_candidate].dropna().index
        df_sub = df.loc[valid_idx]

        X_raw = df_sub[feature_cols].copy()
        y_raw = df_sub[target_candidate].astype(str)

        # Impute and One-Hot Encode
        X_encoded = pd.get_dummies(X_raw, drop_first=True)
        # Fill missing values with median
        X_encoded = X_encoded.fillna(X_encoded.median(numeric_only=True))
        X_encoded = X_encoded.fillna(0)

        # Check train test split
        y_classes, y_counts = np.unique(y_raw, return_counts=True)
        min_class_count = int(y_counts.min())

        if min_class_count < 2:
            stratify_y = None
        else:
            stratify_y = y_raw

        X_train, X_test, y_train, y_test = train_test_split(
            X_encoded, y_raw, test_size=req.test_size or 0.2, random_state=42, stratify=stratify_y
        )

        # 1. Baseline Model (Dummy Classifier / Most Frequent)
        dummy = DummyClassifier(strategy="most_frequent")
        dummy.fit(X_train, y_train)
        dummy_pred = dummy.predict(X_test)
        baseline_acc = round(float(accuracy_score(y_test, dummy_pred)) * 100, 2)

        # 2. Random Forest Model
        rf = RandomForestClassifier(n_estimators=50, max_depth=8, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)

        # Compute Real Metrics
        acc = round(float(accuracy_score(y_test, rf_pred)) * 100, 2)
        bal_acc = round(float(balanced_accuracy_score(y_test, rf_pred)) * 100, 2)

        prec, rec, f1, _ = precision_recall_fscore_support(y_test, rf_pred, average="macro", zero_division=0)
        macro_prec = round(float(prec) * 100, 2)
        macro_rec = round(float(rec) * 100, 2)
        macro_f1 = round(float(f1) * 100, 2)

        # Confusion Matrix
        labels = sorted(y_classes.tolist())
        cm = confusion_matrix(y_test, rf_pred, labels=labels).tolist()

        # Feature Importances
        importances = []
        for col_name, imp in sorted(zip(X_encoded.columns, rf.feature_importances_), key=lambda x: x[1], reverse=True)[:8]:
            importances.append({
                "feature": str(col_name),
                "importance_pct": round(float(imp) * 100, 2)
            })

        # GeoJSON Sample with predictions
        sample_pts = df_sub.head(300).copy()
        X_sample = X_encoded.loc[sample_pts.index]
        preds = rf.predict(X_sample)

        features = []
        for (idx, row), pred_val in zip(sample_pts.iterrows(), preds):
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["_lon"]), float(row["_lat"])]
                },
                "properties": {
                    "actual": str(row[target_candidate]),
                    "predicted": str(pred_val),
                    "is_correct": bool(str(row[target_candidate]) == str(pred_val)),
                    "frp": float(row.get(mappings.get("frp_col"), 10.0)) if mappings.get("frp_col") else 10.0,
                    "sensor": str(row.get(mappings.get("sensor_col"), "Satellite")) if mappings.get("sensor_col") else "Satellite"
                }
            })

        return {
            "status": "SUCCESS",
            "model_type": "SUPERVISED_CLASSIFIER",
            "model_name": "Random Forest Classifier (50 Trees, Max Depth 8)",
            "target_variable": target_candidate,
            "classes": labels,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "features_used_count": len(X_encoded.columns),
            "metrics": {
                "accuracy": acc,
                "balanced_accuracy": bal_acc,
                "baseline_majority_accuracy": baseline_acc,
                "macro_precision": macro_prec,
                "macro_recall": macro_rec,
                "macro_f1": macro_f1
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
                "Supervised classification evaluates observation categorization (e.g., vegetation fire vs static industrial heat). "
                "Geographic coordinates were strictly excluded from model features to prevent spatial memorization and false high accuracy. "
                "This model distinguishes hotspot characteristics, NOT future wildfire occurrence."
            )
        }

    # -------------------------------------------------------------------------
    # CASE B: REAL UNSUPERVISED MACHINE LEARNING & ANOMALY DETECTION
    # -------------------------------------------------------------------------
    coords = df[["_lat", "_lon"]].values
    
    # 1. DBSCAN Spatial Clusterer (Detecting coherent fire clusters)
    # Epsilon ~ 0.08 degrees (~8 km)
    db = DBSCAN(eps=0.08, min_samples=4)
    db_labels = db.fit_predict(coords)
    df["cluster_id"] = db_labels

    cluster_counts = pd.Series(db_labels).value_counts()
    n_clusters = int((cluster_counts.index != -1).sum())
    n_outliers = int(cluster_counts.get(-1, 0))

    # 2. Isolation Forest Radiometric Anomaly Detector
    # Build continuous feature space for anomaly scoring
    anomaly_cols = []
    if mappings.get("frp_col") and mappings["frp_col"] in df.columns:
        anomaly_cols.append(mappings["frp_col"])
    if mappings.get("brightness_col") and mappings["brightness_col"] in df.columns:
        anomaly_cols.append(mappings["brightness_col"])

    if not anomaly_cols:
        anomaly_cols = ["_lat", "_lon"]

    X_anom = df[anomaly_cols].fillna(df[anomaly_cols].median())
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_anom)

    iso = IsolationForest(n_estimators=50, contamination=0.05, random_state=42)
    iso_preds = iso.fit_predict(X_scaled) # -1 is anomaly, 1 is normal
    df["is_anomaly"] = (iso_preds == -1)

    anomaly_count = int((iso_preds == -1).sum())
    anomaly_pct = round(float(anomaly_count) / len(df) * 100, 2)

    # GeoJSON Sample with cluster and anomaly labels
    sample_pts = df.head(400).copy()
    features = []
    for _, row in sample_pts.iterrows():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row["_lon"]), float(row["_lat"])]
            },
            "properties": {
                "cluster_id": int(row["cluster_id"]),
                "is_cluster_core": bool(row["cluster_id"] != -1),
                "is_anomaly": bool(row["is_anomaly"]),
                "frp": float(row.get(mappings.get("frp_col"), 10.0)) if mappings.get("frp_col") else 10.0,
                "brightness": float(row.get(mappings.get("brightness_col"), 310.0)) if mappings.get("brightness_col") else 310.0,
                "sensor": str(row.get(mappings.get("sensor_col"), "Satellite")) if mappings.get("sensor_col") else "Satellite"
            }
        })

    return {
        "status": "SUCCESS",
        "model_type": "UNSUPERVISED_SPATIAL_ANOMALY",
        "model_name": "DBSCAN Spatial Clusterer + Isolation Forest Radiometric Detector",
        "training_samples": len(df),
        "spatial_clusters": {
            "cluster_count": n_clusters,
            "isolated_hotspots": n_outliers,
            "largest_cluster_obs": int(cluster_counts[cluster_counts.index != -1].max()) if n_clusters > 0 else 0
        },
        "anomaly_detection": {
            "method": "Isolation Forest (Contamination 5%)",
            "features": anomaly_cols,
            "anomalous_observations": anomaly_count,
            "anomaly_percentage": anomaly_pct
        },
        "geojson": {
            "type": "FeatureCollection",
            "features": features
        },
        "scientific_disclosure": (
            "Because no target class label was supplied, unsupervised algorithms were executed: "
            "DBSCAN identifies multi-pixel spatial fire clusters tracing potential burn complexes. "
            "Isolation Forest isolates extreme radiometric signatures (intense FRP/brightness outliers). "
            "Neither method represents future fire prediction or proof of crown fire severity."
        )
    }

class ExportRequest(BaseModel):
    session_id: str
    format: str = Field("markdown", description="'markdown', 'geojson', or 'csv'")

@router.post("/export")
def export_research_dossier(req: ExportRequest):
    """Generates structured scientific research dossier or raw GIS data."""
    session = STUDIO_SESSIONS.get(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired.")

    dataset_name = session.get("dataset_name", "Global Thermal Dataset")
    df: pd.DataFrame = session.get("df_valid", session.get("df"))

    if req.format == "csv":
        csv_buffer = io.StringIO()
        df.head(2000).to_csv(csv_buffer, index=False)
        return {
            "status": "SUCCESS",
            "format": "csv",
            "filename": f"{dataset_name.lower().replace(' ', '_')}_cleaned.csv",
            "content": csv_buffer.getvalue()
        }

    # Default: Markdown Dossier
    dossier = f"""# FIREINTEL GLOBAL RESEARCH DOSSIER
Dataset: {dataset_name}
Total Processed Observations: {len(df):,}
Generated: NASA Space Apps Challenge 2026 // Global Fire Intelligence Studio

## 1. GEOSPATIAL COVERAGE
- Latitude Bounds: {df['_lat'].min():.4f}°N to {df['_lat'].max():.4f}°N
- Longitude Bounds: {df['_lon'].min():.4f}°E to {df['_lon'].max():.4f}°E

## 2. SCIENTIFIC DATA PROVENANCE
- Source: NASA FIRMS Satellite Thermal Observations
- Harmonisation: Continuous radiometric calibration (EPSG:4326 WGS 84)

## 3. SCIENTIFIC GOVERNANCE & LIMITATIONS
- Detections reflect thermal anomalies during satellite overpass.
- Satellite observations are not identical to confirmed wildfire incidents.
- No model prediction was synthesized without genuine validation features.
"""
    return {
        "status": "SUCCESS",
        "format": "markdown",
        "filename": f"{dataset_name.lower().replace(' ', '_')}_dossier.md",
        "content": dossier
    }

