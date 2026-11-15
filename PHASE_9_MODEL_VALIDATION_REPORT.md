# FIREINTEL — PHASE 9 MACHINE LEARNING VALIDATION REPORT
**Project**: NASA Space Apps Challenge 2026 // Wildland Fire Intelligence for Uttarakhand, India  
**Phase**: Phase 9 — Harmonised Data Migration & ML Foundation Integration  
**Date**: November 15, 2026  
**Auditor**: Antigravity Autonomous Agent  
**Branch**: `migration/phase9-harmonised-data`  
**Status**: COMPLETE (Independent Empirical Audit Completed; Awaiting Approval to Migrate)

---

## 1. Executive Summary & Core Verdict

The project documentation and preliminary team spreadsheet reported a machine learning model (Random Forest / XGBoost) with **~99.17% accuracy**. In accordance with Phase 9 protocol, an independent empirical audit was conducted to verify what this metric represents, identify potential methodological flaws or data leakage, evaluate whether model binary artifacts exist in the repository, and establish scientific guidelines for production integration.

### Core Audit Verdicts

1. **Artifact Status: No Model Binary Files Exist in Repository or Incoming Workbook**
   - No serialized model binaries (`.pkl`, `.joblib`, `.onnx`, `.xgb`, `.h5`) were provided in `fireIntel/data/incoming/harmonised/` or anywhere in the repository.
   - The Excel workbook `final_consolidated_master.xlsx` contains only the feature matrix (510,299 rows); it contains zero model weights, zero confusion matrices, and zero evaluation tables.
   - Any client-side or backend inference will require either training an operational model on this feature matrix or receiving serialized weights from the modeling team.

2. **The "99.17% Accuracy" Claim is an Artifact of Severe Class Imbalance (Base Rate Fallacy)**
   - The target variable in the dataset is FIRMS hotspot `type`:
     - **Class 0 (Presumed Vegetation Fire)**: **507,387 samples (99.429%)**
     - **Class 2 (Static Land Source / Industrial / Flare)**: **2,912 samples (0.571%)**
   - A naive "Zero-Rule" dummy classifier that always predicts Class 0 achieves **99.43% accuracy** without learning any features whatsoever.
   - The reported **99.17% accuracy is actually LOWER than the baseline zero-rule majority classifier**.

3. **Classification Task Definition: Observation Categorization, NOT Wildfire Prediction**
   - 100% of the 510,299 records in this dataset are **positive NASA FIRMS thermal anomaly detections**.
   - There are **zero non-fire absence points (background samples)**.
   - Therefore, this model **CANNOT predict whether a fire will occur, cannot estimate future wildfire hazard, and cannot predict unburned risk areas**.
   - It is strictly a **Hotspot False-Positive Filter / Source Classifier** (distinguishing wild vegetation fires from static industrial heat anomalies).

4. **Severe Spatial Autocorrelation & Data Leakage**
   - Static industrial heat sources (e.g. brick kilns, factories, gas flares) operate at fixed, unchanging geographic coordinates.
   - In our empirical Random Forest probe, **Latitude (27.51%) and Longitude (38.75%) alone accounted for 66.26% of all feature importance**.
   - If trained with standard random $k$-fold cross-validation, the model simply memorizes the spatial coordinates of fixed factories rather than learning generalizable thermodynamic fire behavior.

---

## 2. Empirical Model Evaluation & Probe Results

An empirical Random Forest probe was executed directly on `final_consolidated_master.xlsx` using 80/20 stratified train/test splitting across the 11 continuous/cyclical features:
`['latitude', 'longitude', 'brightness', 'scan', 'track', 'bright_t31', 'frp', 'month_sin', 'month_cos', 'hour_sin', 'hour_cos']`.

### 2.1 Target: FIRMS Hotspot Type (`type` 0 vs 2)

#### Test Set Confusion Matrix ($N_{\text{test}} = 102,060$):
$$\begin{pmatrix} \text{True Class 0 (Vegetation)}: 101,450 & \text{False Class 2}: 28 \\ \text{False Class 0 (Missed Static)}: 388 & \text{True Class 2 (Detected Static)}: 194 \end{pmatrix}$$

#### Detailed Classification Metrics:
| Class | Label | Precision | Recall | F1-Score | Support |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **0** | Vegetation Fire | 0.9962 | 0.9997 | 0.9980 | 101,478 |
| **2** | Static Land Source | 0.8739 | **0.3333** | **0.4826** | 582 |
| **Overall** | **Accuracy: 99.59%** | Macro Avg: 0.9350 | Macro Recall: 0.6665 | Macro F1: 0.7403 | 102,060 |

#### Empirical Finding:
While overall accuracy is **99.59%**, the model **fails to detect 66.7% of all static industrial sources** (Recall = 33.3%). Evaluating this model on overall accuracy is scientifically misleading because 99.4% of all test instances belong to Class 0.

### 2.2 Feature Importance Hierarchy

| Rank | Feature | Importance | Interpretation & Scientific Assessment |
| :---: | :--- | :---: | :--- |
| **1** | `longitude` | **38.75%** | **Spatial Memorization**: Fixed coordinate clustering of industrial sites |
| **2** | `latitude` | **27.51%** | **Spatial Memorization**: Fixed coordinate clustering of industrial sites |
| **3** | `brightness` | 6.09% | Thermal radiance: industrial furnaces often have persistent high brightness |
| **4** | `frp` | 5.99% | Fire Radiative Power: industrial flares exhibit distinct power signatures |
| **5** | `bright_t31` | 4.65% | Background thermal channel (atmospheric attenuation proxy) |
| **6** | `month_sin` | 3.88% | Seasonality: wildfires peak in April/May; industrial sources operate year-round |
| **7** | `scan` | 3.46% | Geometric sensor scan angle |
| **8** | `month_cos` | 3.16% | Seasonality cosine component |
| **9** | `track` | 2.39% | Geometric sensor track angle |
| **10** | `hour_sin` | 2.35% | Diurnal timing: industrial sources operate continuously 24/7 |
| **11** | `hour_cos` | 1.78% | Diurnal timing cosine component |

**Spatial Memorization Total**: Latitude + Longitude = **66.26%**. The model relies predominantly on where the fire is located rather than the physical properties of the fire.

---

## 3. Scientific Recommendations for Production & UI Integration

1. **Accurate Terminology Across the Entire Application**:
   - Re-label any UI references from *"99.17% Fire Prediction Model"* to:  
     **"FIRMS Satellite Thermal Anomaly Classifier — 99.4% Baseline Accuracy (Vegetation vs Static Source)"** or **"Satellite Hotspot False-Positive Filter"**.
   - Display the true balanced metrics:
     - Vegetation Fire F1-Score: **0.998**
     - Static Land Source Detection: **Precision 87.4%, Recall 33.3%, F1 0.483**
     - Balanced Accuracy: **66.65%** (honest, scientifically defensible metric)

2. **Dual-Layer Architecture**:
   - **Layer 1: Empirical NASA Observations (Ground Truth)**: The 240,365 validated satellite fire observations from MODIS and VIIRS.
   - **Layer 2: Machine Learning Inference (Derived Intelligence)**: The classification of each hotspot as a wild vegetation fire or an industrial/static thermal anomaly, with a confidence score and static source probability.

3. **Roadmap to Genuine Wildfire Risk Prediction**:
   - Document in the Methodology route (`/methodology`) that genuine predictive fire risk modeling requires coupling FIRMS observations with negative absence sampling, ERA5-Land weather covariates, and Copernicus DEM terrain covariates.

