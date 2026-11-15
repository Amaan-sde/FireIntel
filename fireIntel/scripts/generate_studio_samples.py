"""
Generate Curated Global Demonstration Datasets for FIREINTEL Studio (/studio).
1. California Sierra Nevada & Northern California Hotspots (2024)
2. Greece Mediterranean Wildfire Corridor (August 2024)
3. Uttarakhand Ground Truth Specimen (Sampled directly from canonical master Parquet)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import duckdb

output_dir = Path("fireIntel/data/studio_samples")
output_dir.mkdir(parents=True, exist_ok=True)

# 1. California Sierra Nevada / Northern California Sample (~1,200 points)
np.random.seed(42)
n_cal = 1250
# California Park Fire / Sierra Nevada bounding box: Lat 39.2 to 40.5, Lon -122.2 to -121.2
cal_lats = np.random.normal(39.85, 0.28, n_cal)
cal_lons = np.random.normal(-121.65, 0.25, n_cal)
cal_frp = np.random.exponential(14.5, n_cal) + 1.2
cal_brightness = 300.0 + np.log1p(cal_frp) * 12.0 + np.random.normal(0, 8, n_cal)
cal_t31 = cal_brightness - np.random.uniform(5, 25, n_cal)

# Dates in July-August 2024 (Park Fire peak)
cal_days = np.random.randint(15, 31, n_cal)
cal_dates = [f"2024-07-{d:02d}" for d in cal_days]
cal_times = [f"{np.random.randint(0,24):02d}{np.random.randint(0,60):02d}" for _ in range(n_cal)]
cal_sensors = np.random.choice(["VIIRS", "MODIS"], size=n_cal, p=[0.75, 0.25])
cal_sats = ["SNPP" if s == "VIIRS" else np.random.choice(["Aqua", "Terra"]) for s in cal_sensors]
cal_conf = np.random.choice(["nominal", "high", "low"], size=n_cal, p=[0.7, 0.22, 0.08])
cal_dn = np.random.choice(["D", "N"], size=n_cal, p=[0.65, 0.35])

df_cal = pd.DataFrame({
    "latitude": np.round(cal_lats, 5),
    "longitude": np.round(cal_lons, 5),
    "brightness": np.round(cal_brightness, 2),
    "scan": np.round(np.random.uniform(0.35, 0.75, n_cal), 2),
    "track": np.round(np.random.uniform(0.35, 0.60, n_cal), 2),
    "acq_date": cal_dates,
    "acq_time": cal_times,
    "satellite": cal_sats,
    "sensor": cal_sensors,
    "confidence": cal_conf,
    "bright_t31": np.round(cal_t31, 2),
    "frp": np.round(cal_frp, 2),
    "daynight": cal_dn
})

df_cal.to_csv(output_dir / "california_sierra_2024.csv", index=False)
print(f"Created California demo: {len(df_cal)} rows in {output_dir / 'california_sierra_2024.csv'}")

# 2. Greece Mediterranean Corridor Sample (~950 points)
n_gr = 950
# Attica / Peloponnese region: Lat 37.8 to 38.6, Lon 22.5 to 24.2
gr_lats = np.random.normal(38.25, 0.22, n_gr)
gr_lons = np.random.normal(23.40, 0.35, n_gr)
gr_frp = np.random.exponential(11.2, n_gr) + 0.8
gr_brightness = 305.0 + np.log1p(gr_frp) * 10.0 + np.random.normal(0, 6, n_gr)
gr_t31 = gr_brightness - np.random.uniform(8, 22, n_gr)
gr_days = np.random.randint(5, 20, n_gr)
gr_dates = [f"2024-08-{d:02d}" for d in gr_days]
gr_times = [f"{np.random.randint(0,24):02d}{np.random.randint(0,60):02d}" for _ in range(n_gr)]
gr_sensors = np.random.choice(["VIIRS", "MODIS"], size=n_gr, p=[0.80, 0.20])
gr_sats = ["SNPP" if s == "VIIRS" else np.random.choice(["Aqua", "Terra"]) for s in gr_sensors]
gr_conf = np.random.choice(["nominal", "high", "low"], size=n_gr, p=[0.72, 0.20, 0.08])
gr_dn = np.random.choice(["D", "N"], size=n_gr, p=[0.60, 0.40])

df_gr = pd.DataFrame({
    "latitude": np.round(gr_lats, 5),
    "longitude": np.round(gr_lons, 5),
    "brightness": np.round(gr_brightness, 2),
    "scan": np.round(np.random.uniform(0.35, 0.75, n_gr), 2),
    "track": np.round(np.random.uniform(0.35, 0.60, n_gr), 2),
    "acq_date": gr_dates,
    "acq_time": gr_times,
    "satellite": gr_sats,
    "sensor": gr_sensors,
    "confidence": gr_conf,
    "bright_t31": np.round(gr_t31, 2),
    "frp": np.round(gr_frp, 2),
    "daynight": gr_dn
})
df_gr.to_csv(output_dir / "greece_mediterranean_2024.csv", index=False)
print(f"Created Greece demo: {len(df_gr)} rows in {output_dir / 'greece_mediterranean_2024.csv'}")

# 3. Uttarakhand Ground Truth Specimen with TARGET LABEL 'type' (0 = Veg Fire, 2 = Static Source)
parquet_path = "fireIntel/data/production/harmonised/uttarakhand_harmonised_fires.parquet"
if Path(parquet_path).exists():
    con = duckdb.connect()
    # Sample balanced set containing both Class 0 and Class 2
    query = f"""
        (SELECT latitude, longitude, brightness, scan, track, bright_t31, frp, sensor, satellite, daynight, confidence_class, type
         FROM read_parquet('{parquet_path}')
         WHERE type = 2
         LIMIT 200)
        UNION ALL
        (SELECT latitude, longitude, brightness, scan, track, bright_t31, frp, sensor, satellite, daynight, confidence_class, type
         FROM read_parquet('{parquet_path}')
         WHERE type = 0
         LIMIT 1300)
    """
    df_uk = con.execute(query).df()
    df_uk = df_uk.sample(frac=1.0, random_state=42).reset_index(drop=True)
    df_uk.to_csv(output_dir / "uttarakhand_ground_truth_specimen.csv", index=False)
    print(f"Created Uttarakhand ground truth specimen: {len(df_uk)} rows ({sum(df_uk['type']==0)} class 0, {sum(df_uk['type']==2)} class 2)")
