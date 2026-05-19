import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)

from app import storage

RANDOM_STATE = 42


def train_model(run_id: str, target: str, problem_type: str) -> dict:
    df = pd.read_csv(storage.engineered_path(run_id))
    if target not in df.columns:
        raise ValueError(f"Target '{target}' missing from engineered dataset.")

    X = df.drop(columns=[target])
    y = df[target]

    if problem_type == "classification":
        if not np.issubdtype(y.dtype, np.number):
            y, _ = pd.factorize(y)
        model = RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE, n_jobs=-1)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y if len(np.unique(y)) > 1 else None
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        acc = float(accuracy_score(y_test, preds))
        f1m = float(f1_score(y_test, preds, average="macro", zero_division=0))
        cv = cross_val_score(model, X, y, cv=min(5, len(np.unique(y))), scoring="accuracy", n_jobs=-1)
        metrics = {
            "model_name": "RandomForestClassifier",
            "score": acc,
            "score_metric": "accuracy",
            "extra": {
                "f1_macro": f1m,
                "cv_accuracy_mean": float(cv.mean()),
                "cv_accuracy_std": float(cv.std()),
                "n_classes": int(len(np.unique(y))),
                "test_size": int(len(y_test)),
            },
        }
        np.save(storage.run_dir(run_id) / "y_test.npy", y_test)
        np.save(storage.run_dir(run_id) / "y_pred.npy", preds)
    else:
        model = RandomForestRegressor(n_estimators=200, random_state=RANDOM_STATE, n_jobs=-1)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        r2 = float(r2_score(y_test, preds))
        rmse = float(root_mean_squared_error(y_test, preds))
        mae = float(mean_absolute_error(y_test, preds))
        cv = cross_val_score(model, X, y, cv=5, scoring="r2", n_jobs=-1)
        metrics = {
            "model_name": "RandomForestRegressor",
            "score": r2,
            "score_metric": "r2",
            "extra": {
                "rmse": rmse,
                "mae": mae,
                "cv_r2_mean": float(cv.mean()),
                "cv_r2_std": float(cv.std()),
                "test_size": int(len(y_test)),
            },
        }
        np.save(storage.run_dir(run_id) / "y_test.npy", np.asarray(y_test))
        np.save(storage.run_dir(run_id) / "y_pred.npy", preds)

    # Feature importances for downstream visualization / justification.
    importances = sorted(
        zip(X.columns.tolist(), model.feature_importances_.tolist()),
        key=lambda kv: kv[1],
        reverse=True,
    )[:10]
    metrics["extra"]["top_features"] = [
        {"feature": f, "importance": round(float(i), 4)} for f, i in importances
    ]

    storage.write_json(run_id, "metrics.json", metrics)
    return metrics
