import openpyxl
import pandas as pd
import numpy as np
from pathlib import Path
import json

file_path = Path("fireIntel/data/incoming/harmonised/final_consolidated_master.xlsx")

print("Checking workbook structure...")
wb = openpyxl.load_workbook(file_path, read_only=True)
print("Sheet names:", wb.sheetnames)
for name in wb.sheetnames:
    s = wb[name]
    print(f"Sheet '{name}' state: {s.sheet_state}")
wb.close()

print("\nReading first 10 rows with pandas...")
df_head = pd.read_excel(file_path, nrows=10)
print("Columns count:", len(df_head.columns))
print("Columns:", list(df_head.columns))
print("\nFirst row sample:")
print(df_head.iloc[0].to_dict())

print("\nReading complete file into pandas (this may take a few moments for 42MB)...")
df = pd.read_excel(file_path)
print(f"Total Rows: {len(df):,}")
print(f"Total Columns: {len(df.columns)}")
print(f"Memory usage: {df.memory_usage().sum() / (1024*1024):.2f} MB")

summary = {
    "file_name": file_path.name,
    "file_size_mb": file_path.stat().st_size / (1024*1024),
    "total_rows": len(df),
    "total_columns": len(df.columns),
    "columns": list(df.columns),
    "dtypes": {c: str(df[c].dtype) for c in df.columns},
    "null_counts": {c: int(df[c].isnull().sum()) for c in df.columns},
    "duplicate_rows": int(df.duplicated().sum()),
}

# Column-specific deep dive
print("\n--- Summary Analysis ---")
for col in df.columns:
    nulls = df[col].isnull().sum()
    n_unique = df[col].nunique()
    print(f"Column '{col}': dtype={df[col].dtype}, nulls={nulls} ({nulls/len(df)*100:.2f}%), unique={n_unique}")
    if n_unique <= 20:
        val_counts = df[col].value_counts(dropna=False).head(10).to_dict()
        print(f"   Value counts: {val_counts}")

with open("fireIntel/data/incoming/harmonised/audit_results.json", "w") as f:
    json.dump(summary, f, indent=2, default=str)

print("\nBasic audit complete. Saved to fireIntel/data/incoming/harmonised/audit_results.json")

