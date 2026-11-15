"""
FIREINTEL — Unambiguous 2025 Date Matcher & Verifier
Matches incoming harmonised records against 2025 raw FIRMS archives with strict uniqueness guarantees.
Only matches with a 1-to-1 unambiguous signature are given a verified date.
All other records retain NULL dates.
"""

import pandas as pd
import numpy as np
from pathlib import Path

SOURCE_FILE = Path("fireIntel/data/incoming/harmonised/final_consolidated_master.xlsx")
MODIS_RAW = Path("fireIntel/data/raw/fire_archive_M-C61_843061.csv")
VIIRS_RAW = Path("fireIntel/data/raw/fire_archive_SV-C2_843062.csv")

def test_unambiguous_matching():
    print("Loading raw archives...")
    modis_df = pd.read_csv(MODIS_RAW)
    viirs_df = pd.read_csv(VIIRS_RAW)
    print(f"Raw 2025 MODIS rows: {len(modis_df):,}")
    print(f"Raw 2025 VIIRS rows: {len(viirs_df):,}")

    print("Loading incoming dataset...")
    df = pd.read_excel(SOURCE_FILE)
    print(f"Incoming rows: {len(df):,}")

    # 1. MODIS Matching
    print("\n--- Matching MODIS ---")
    incoming_modis = df[df['sensor'] == 'MODIS'].copy()
    print(f"Incoming MODIS count: {len(incoming_modis):,}")

    # Build signature for MODIS raw: lat, lon, scan, track, brightness, daynight, satellite
    modis_df['sig'] = (
        modis_df['latitude'].round(4).astype(str) + "_" +
        modis_df['longitude'].round(4).astype(str) + "_" +
        modis_df['scan'].round(2).astype(str) + "_" +
        modis_df['track'].round(2).astype(str) + "_" +
        modis_df['brightness'].round(1).astype(str) + "_" +
        modis_df['daynight'].str.upper() + "_" +
        modis_df['satellite'].str.strip()
    )

    incoming_modis['sig'] = (
        incoming_modis['latitude'].round(4).astype(str) + "_" +
        incoming_modis['longitude'].round(4).astype(str) + "_" +
        incoming_modis['scan'].round(2).astype(str) + "_" +
        incoming_modis['track'].round(2).astype(str) + "_" +
        incoming_modis['brightness'].round(1).astype(str) + "_" +
        incoming_modis['daynight'].str.upper() + "_" +
        incoming_modis['satellite'].str.strip()
    )

    # Check for duplicates in raw signatures
    raw_sig_counts = modis_df['sig'].value_counts()
    unique_raw_sigs = set(raw_sig_counts[raw_sig_counts == 1].index)
    print(f"Unique MODIS raw signatures: {len(unique_raw_sigs):,} of {len(modis_df):,}")

    # Filter incoming matches that match uniquely
    modis_map = modis_df[modis_df['sig'].isin(unique_raw_sigs)].set_index('sig')[['acq_date', 'acq_time']].to_dict(orient='index')
    
    # Check incoming signature uniqueness
    inc_sig_counts = incoming_modis['sig'].value_counts()
    unique_inc_sigs = set(inc_sig_counts[inc_sig_counts == 1].index)

    modis_matched = 0
    for sig in incoming_modis['sig']:
        if sig in unique_raw_sigs and sig in unique_inc_sigs:
            modis_matched += 1

    print(f"Unambiguous 1-to-1 MODIS matches: {modis_matched:,}")

    # 2. VIIRS Matching
    print("\n--- Matching VIIRS ---")
    incoming_viirs = df[df['sensor'] == 'VIIRS'].copy()
    print(f"Incoming VIIRS count: {len(incoming_viirs):,}")

    viirs_df['sig'] = (
        viirs_df['latitude'].round(4).astype(str) + "_" +
        viirs_df['longitude'].round(4).astype(str) + "_" +
        viirs_df['scan'].round(2).astype(str) + "_" +
        viirs_df['track'].round(2).astype(str) + "_" +
        viirs_df['bright_t31'].round(1).astype(str) + "_" +
        viirs_df['daynight'].str.upper()
    )

    incoming_viirs['sig'] = (
        incoming_viirs['latitude'].round(4).astype(str) + "_" +
        incoming_viirs['longitude'].round(4).astype(str) + "_" +
        incoming_viirs['scan'].round(2).astype(str) + "_" +
        incoming_viirs['track'].round(2).astype(str) + "_" +
        incoming_viirs['bright_t31'].round(1).astype(str) + "_" +
        incoming_viirs['daynight'].str.upper()
    )

    v_raw_sig_counts = viirs_df['sig'].value_counts()
    unique_v_raw_sigs = set(v_raw_sig_counts[v_raw_sig_counts == 1].index)
    print(f"Unique VIIRS raw signatures: {len(unique_v_raw_sigs):,} of {len(viirs_df):,}")

    v_inc_sig_counts = incoming_viirs['sig'].value_counts()
    unique_v_inc_sigs = set(v_inc_sig_counts[v_inc_sig_counts == 1].index)

    viirs_matched = 0
    for sig in incoming_viirs['sig']:
        if sig in unique_v_raw_sigs and sig in unique_v_inc_sigs:
            viirs_matched += 1

    print(f"Unambiguous 1-to-1 VIIRS matches: {viirs_matched:,}")
    print(f"\nTotal unambiguous 2025 recovered dates: {modis_matched + viirs_matched:,}")
    print(f"Total remaining multi-year historical records with NULL dates: {len(df) - (modis_matched + viirs_matched):,}")

if __name__ == "__main__":
    test_unambiguous_matching()

