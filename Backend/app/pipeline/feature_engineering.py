import pandas as pd
from pandas.api.types import is_numeric_dtype

from app import storage


HIGH_MISSING_THRESHOLD = 0.5
ONE_HOT_MAX_CARDINALITY = 10


def feature_engineer(run_id: str, target: str) -> dict:
    df = pd.read_csv(storage.dataset_path(run_id))
    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found.")

    dropped: list[str] = []
    encoded: list[str] = []

    # 1. Drop columns with too many missing values (excluding target).
    for c in list(df.columns):
        if c == target:
            continue
        if df[c].isna().mean() > HIGH_MISSING_THRESHOLD:
            df = df.drop(columns=[c])
            dropped.append(f"{c} (>{int(HIGH_MISSING_THRESHOLD*100)}% missing)")

    # 2. Drop rows where target is missing (must precede ID-like check so n is correct).
    df = df.dropna(subset=[target]).reset_index(drop=True)
    n = len(df)

    # 3. Drop ID-like columns (>=95% unique values, any dtype).
    for c in list(df.columns):
        if c == target:
            continue
        if df[c].nunique(dropna=True) >= 0.95 * n:
            df = df.drop(columns=[c])
            dropped.append(f"{c} (id-like)")

    # 4. Encode categorical features (done on full dataset for consistent dummy columns).
    feature_cols = [c for c in df.columns if c != target]
    for c in feature_cols:
        if is_numeric_dtype(df[c]):
            continue
        cardinality = df[c].nunique()
        if cardinality <= ONE_HOT_MAX_CARDINALITY:
            dummies = pd.get_dummies(df[c], prefix=c, drop_first=True, dtype=int)
            df = pd.concat([df.drop(columns=[c]), dummies], axis=1)
            encoded.append(f"{c} (one-hot, {cardinality} levels)")
        else:
            df[c], _ = pd.factorize(df[c])
            encoded.append(f"{c} (label-encoded, {cardinality} levels)")

    df.to_csv(storage.engineered_path(run_id), index=False)
    report = {
        "dropped_columns": dropped,
        "encoded_columns": encoded,
        "final_feature_count": int(df.shape[1] - 1),
        "final_row_count": int(len(df)),
    }
    storage.write_json(run_id, "feature_engineering.json", report)
    return report
