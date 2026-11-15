import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.ensemble import RandomForestClassifier

file_path = Path("fireIntel/data/incoming/harmonised/final_consolidated_master.xlsx")
print("Loading data for ML audit...")
df = pd.read_excel(file_path)

print(f"\n--- Checking Potential ML Target Candidates ---")
print("Total rows:", len(df))

# 1. Target candidate: type (0 vs 2)
print("\nCandidate 1: 'type' (0: vegetation, 2: static land)")
type_counts = df['type'].value_counts()
print(type_counts)
print(f"Majority class baseline accuracy: {type_counts.max() / len(df) * 100:.2f}%")

# 2. Target candidate: confidence_class ('n', 'l', 'h')
print("\nCandidate 2: 'confidence_class'")
conf_counts = df['confidence_class'].value_counts()
print(conf_counts)
print(f"Majority class baseline accuracy: {conf_counts.max() / len(df) * 100:.2f}%")

# 3. Target candidate: daynight ('D' vs 'N')
print("\nCandidate 3: 'daynight'")
dn_counts = df['daynight'].value_counts()
print(dn_counts)
print(f"Majority class baseline accuracy: {dn_counts.max() / len(df) * 100:.2f}%")

# 4. Target candidate: sensor ('VIIRS' vs 'MODIS')
print("\nCandidate 4: 'sensor'")
sens_counts = df['sensor'].value_counts()
print(sens_counts)
print(f"Majority class baseline accuracy: {sens_counts.max() / len(df) * 100:.2f}%")

# Let's train a lightweight Random Forest on a sample (e.g. 50k rows) for 'type' and 'confidence_class'
# to observe what accuracy is achieved and see if 99.17% appears anywhere.
features = ['latitude', 'longitude', 'brightness', 'scan', 'track', 'bright_t31', 'frp', 'month_sin', 'month_cos', 'hour_sin', 'hour_cos']

print("\n--- Training RF Probe on Target: 'type' ---")
X = df[features]
y = df['type']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
rf = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)
acc_type = accuracy_score(y_test, y_pred)
print(f"Random Forest Accuracy on 'type': {acc_type * 100:.4f}%")
print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred, digits=4))

# Check confidence_class
print("\n--- Training RF Probe on Target: 'confidence_class' ---")
y_conf = df['confidence_class']
X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_conf, test_size=0.2, random_state=42, stratify=y_conf)
rf_conf = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
rf_conf.fit(X_train_c, y_train_c)
y_pred_c = rf_conf.predict(X_test_c)
acc_conf = accuracy_score(y_test_c, y_pred_c)
print(f"Random Forest Accuracy on 'confidence_class': {acc_conf * 100:.4f}%")

print("\n--- Feature Importances for Target 'type' ---")
for f, imp in sorted(zip(features, rf.feature_importances_), key=lambda x: x[1], reverse=True):
    print(f"  {f:15s}: {imp:.4f}")

