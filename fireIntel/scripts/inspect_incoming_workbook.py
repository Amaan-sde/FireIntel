"""
FIREINTEL — Automated Incoming Excel Workbook Inspector
Inspects all worksheets in fireIntel/data/incoming/harmonised/*.xlsx
Extracts sheet names, dimensions, columns, data types, missing values,
duplicates, formulas, and model evaluation metrics.
"""

import os
import glob
import json
import openpyxl
import pandas as pd
from pathlib import Path

INCOMING_DIR = Path("fireIntel/data/incoming/harmonised")

def inspect_all_workbooks():
    xlsx_files = list(INCOMING_DIR.glob("*.xlsx")) + list(INCOMING_DIR.glob("*.xls"))
    if not xlsx_files:
        print(f"No Excel files found in {INCOMING_DIR}")
        return None

    for file_path in xlsx_files:
        print(f"\n=======================================================")
        print(f"AUDITING WORKBOOK: {file_path.name}")
        print(f"File Size: {file_path.stat().st_size:,} bytes")
        print(f"=======================================================")

        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=False)
        wb_data = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        sheet_names = wb.sheetnames
        print(f"Total Worksheets Found: {len(sheet_names)}")
        print(f"Sheet List: {sheet_names}\n")

        workbook_audit = {
            "filename": file_path.name,
            "size_bytes": file_path.stat().st_size,
            "sheets_count": len(sheet_names),
            "sheets": {}
        }

        for name in sheet_names:
            print(f"--- SHEET: '{name}' ---")
            try:
                # Read with pandas for statistical analysis
                df = pd.read_excel(file_path, sheet_name=name)
                row_count = len(df)
                col_count = len(df.columns)
                print(f"  Rows: {row_count:,} | Columns: {col_count}")
                print(f"  Column Names: {list(df.columns)}")
                
                # Missing value statistics
                missing_counts = df.isnull().sum().to_dict()
                non_zero_missing = {k: int(v) for k, v in missing_counts.items() if v > 0}
                
                # Check duplicates
                dup_count = int(df.duplicated().sum())

                # Inspect potential ML evaluation / model performance keywords
                ml_keywords = ["accuracy", "precision", "recall", "f1", "auc", "roc", "confusion", "xgboost", "random forest", "rf", "xgb", "99.17", "target"]
                text_dump = df.to_string().lower()
                matched_keywords = [kw for kw in ml_keywords if kw in text_dump or any(kw in str(c).lower() for c in df.columns)]

                sheet_info = {
                    "rows": row_count,
                    "columns_count": col_count,
                    "columns": list(df.columns),
                    "dtypes": {str(k): str(v) for k, v in df.dtypes.items()},
                    "missing_values": non_zero_missing,
                    "duplicate_rows": dup_count,
                    "matched_ml_keywords": matched_keywords,
                    "head_sample": df.head(3).to_dict(orient="records") if row_count > 0 else []
                }
                workbook_audit["sheets"][name] = sheet_info

                if matched_keywords:
                    print(f"  [!] Matched ML Evaluation Keywords: {matched_keywords}")

            except Exception as e:
                print(f"  [ERROR] Could not parse sheet '{name}': {e}")
                workbook_audit["sheets"][name] = {"error": str(e)}

        out_json_path = INCOMING_DIR / f"{file_path.stem}_audit.json"
        with open(out_json_path, "w") as out_fp:
            json.dump(workbook_audit, out_fp, indent=2, default=str)
        print(f"\nAudit saved to {out_json_path}")

if __name__ == "__main__":
    inspect_all_workbooks()

