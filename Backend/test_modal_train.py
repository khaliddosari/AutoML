"""Quick smoke-test: run training on Modal using the insurance CSV."""
import sys
import time

# Make sure app/ is importable
sys.path.insert(0, ".")

import pandas as pd

import modal
run_training = modal.Function.from_name("modelforge-train", "run_training")

CSV_PATH = "../Docs/insurance.csv"
TARGET   = "charges"           # regression target in the insurance dataset

print("Reading and preprocessing CSV …")
df = pd.read_csv(CSV_PATH)

# Minimal feature engineering: drop rows missing the target
df = df.dropna(subset=[TARGET]).reset_index(drop=True)
csv_bytes = df.to_csv(index=False).encode()

print(f"Dataset: {df.shape[0]} rows × {df.shape[1]} cols  |  target='{TARGET}'")
print("Sending to Modal (first run builds image, ~30s) …\n")

t0 = time.time()
result = run_training.remote(csv_bytes, TARGET, "regression")
elapsed = round(time.time() - t0, 1)

m = result["metrics"]
print(f"Done in {elapsed}s")
print(f"  Winner : {m['model_name']}")
print(f"  R²     : {m['score']:.4f}")
print(f"  RMSE   : {m['extra']['rmse']:.2f}")
print(f"  CV R²  : {m['extra']['cv_r2_mean']:.4f}")
print()
print("All models (by CV R²):")
for row in m["extra"]["all_models"]:
    print(f"  {row['name']:20s}  cv={row['cv_mean']:.4f} ± {row['cv_std']:.4f}")
print()
print(f"Top features: {[f['feature'] for f in m['extra']['top_features'][:3]]}")
print(f"Model bytes returned: {len(result['model_bytes']):,} bytes")
