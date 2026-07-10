import pandas as pd

from app import storage


def profile_dataset(run_id: str, df: pd.DataFrame | None = None) -> dict:
    # `df` lets the orchestrator pass the already-loaded raw dataset so the same
    # frame is shared across profile/detect/eda/feature_engineer instead of each
    # step re-reading dataset.csv from disk. Falls back to a read when called
    # standalone (e.g. via the LangChain tool wrapper).
    if df is None:
        df = pd.read_csv(storage.dataset_path(run_id))
    columns = []
    for col in df.columns:
        s = df[col]
        columns.append({
            "name": col,
            "dtype": str(s.dtype),
            "missing": int(s.isna().sum()),
            "unique": int(s.nunique(dropna=True)),
            "sample": s.dropna().head(3).tolist(),
        })
    profile = {
        "run_id": run_id,
        "n_rows": int(len(df)),
        "n_cols": int(df.shape[1]),
        "columns": columns,
    }
    storage.write_json(run_id, "profile.json", profile)
    return profile
