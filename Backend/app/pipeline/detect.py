import pandas as pd
from pandas.api.types import is_numeric_dtype

from app import storage


def detect_problem_type(run_id: str, target: str) -> dict:
    df = pd.read_csv(storage.dataset_path(run_id))
    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found in dataset.")

    col = df[target].dropna()
    dtype = str(col.dtype)
    unique = int(col.nunique())
    n = int(len(col))

    if not is_numeric_dtype(col):
        problem_type = "classification"
        reason = (
            f"Target '{target}' is non-numeric (dtype={dtype}) with {unique} unique "
            f"values, so the problem is classification."
        )
    elif unique <= max(20, int(0.05 * n)):
        problem_type = "classification"
        reason = (
            f"Target '{target}' is numeric but only has {unique} unique values "
            f"out of {n} rows, indicating a small discrete label set. Treating as "
            f"classification."
        )
    else:
        problem_type = "regression"
        reason = (
            f"Target '{target}' is numeric (dtype={dtype}) with {unique} unique "
            f"values out of {n} rows, indicating a continuous target. Treating as "
            f"regression."
        )

    result = {
        "problem_type": problem_type,
        "reason": reason,
        "target": target,
        "target_dtype": dtype,
        "target_unique": unique,
    }
    storage.write_json(run_id, "detection.json", result)
    return result
