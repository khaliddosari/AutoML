"""Modal function for offloading model training to the cloud.

Runs with 8 CPUs so sklearn's n_jobs=-1 parallelism is far more effective
than on a typical local machine. All logic is self-contained — no imports
from the local `app` package — because this executes inside a Modal container.
"""
import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    # libgomp1 provides the OpenMP runtime LightGBM links against at import time.
    .apt_install("libgomp1")
    .pip_install(
        "scikit-learn>=1.5,<2.0",
        "lightgbm>=4.1,<5.0",
        "pandas>=2.2,<3.0",
        "numpy>=1.26,<3.0",
        "joblib>=1.3,<2.0",
    )
)

app = modal.App("modelforge-train", image=image)


@app.function(image=image, cpu=8)
def run_training(csv_bytes: bytes, target: str, problem_type: str) -> dict:
    """Train all candidate models and return metrics + serialised artifacts.

    Returns:
        metrics      – same schema as train.py local output
        y_test       – list (JSON-safe numpy array)
        y_pred       – list (JSON-safe numpy array)
        model_bytes  – joblib-serialised model bundle as raw bytes
        class_labels – list of original class names or None
        feature_cols – list of feature column names
    """
    import io

    import joblib
    import numpy as np
    import pandas as pd
    from lightgbm import LGBMClassifier, LGBMRegressor
    from pandas.api.types import is_numeric_dtype
    from sklearn.base import clone
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import (
        ExtraTreesClassifier,
        ExtraTreesRegressor,
        RandomForestClassifier,
        RandomForestRegressor,
    )
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression, Ridge
    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        mean_absolute_error,
        r2_score,
        root_mean_squared_error,
    )
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

    RANDOM_STATE = 42
    ONE_HOT_MAX_CARDINALITY = 10

    # ── model catalogues (mirrors classifiers.py / regressors.py) ────────────
    CLASSIFIERS = [
        ("RandomForest",       RandomForestClassifier(n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1)),
        ("ExtraTrees",         ExtraTreesClassifier(n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1)),
        ("LightGBM",           LGBMClassifier(n_estimators=200, learning_rate=0.05, num_leaves=31, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1)),
        ("LogisticRegression", Pipeline([("scaler", StandardScaler()), ("model", LogisticRegression(max_iter=500, random_state=RANDOM_STATE, n_jobs=-1))])),
        ("KNN",                Pipeline([("scaler", StandardScaler()), ("model", KNeighborsClassifier(n_neighbors=5, n_jobs=-1))])),
    ]
    REGRESSORS = [
        ("RandomForest",     RandomForestRegressor(n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1)),
        ("ExtraTrees",       ExtraTreesRegressor(n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1)),
        ("LightGBM",         LGBMRegressor(n_estimators=200, learning_rate=0.05, num_leaves=31, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1)),
        ("Ridge",            Pipeline([("scaler", StandardScaler()), ("model", Ridge())])),
        ("KNN",              Pipeline([("scaler", StandardScaler()), ("model", KNeighborsRegressor(n_neighbors=5, n_jobs=-1))])),
    ]

    # ── helpers ───────────────────────────────────────────────────────────────
    def _build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
        numeric_cols, one_hot_cols, ordinal_cols = [], [], []
        for c in X.columns:
            if is_numeric_dtype(X[c]):
                numeric_cols.append(c)
            elif X[c].nunique(dropna=True) <= ONE_HOT_MAX_CARDINALITY:
                one_hot_cols.append(c)
            else:
                ordinal_cols.append(c)
        transformers = []
        if numeric_cols:
            transformers.append(("num", SimpleImputer(strategy="median"), numeric_cols))
        if one_hot_cols:
            transformers.append(("cat_low", Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False, drop="if_binary")),
            ]), one_hot_cols))
        if ordinal_cols:
            transformers.append(("cat_high", Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
            ]), ordinal_cols))
        return ColumnTransformer(transformers, remainder="drop")

    def _wrap(X: pd.DataFrame, template):
        pre = _build_preprocessor(X)
        if isinstance(template, Pipeline):
            return Pipeline([("preprocessor", pre)] + list(template.steps))
        return Pipeline([("preprocessor", pre), ("model", template)])

    def _inner(model):
        while isinstance(model, Pipeline):
            model = model.steps[-1][1]
        return model

    def _importances(model, columns: list) -> list:
        est = _inner(model)
        if hasattr(est, "feature_importances_"):
            imps = np.array(est.feature_importances_)
        elif hasattr(est, "coef_"):
            coef = np.array(est.coef_)
            imps = np.abs(coef[0] if coef.ndim > 1 else coef)
        else:
            return []
        expanded = list(columns)
        if isinstance(model, Pipeline):
            try:
                expanded = list(model[:-1].get_feature_names_out())
            except Exception:
                pass
        if len(expanded) != len(imps):
            expanded = [f"feature_{i}" for i in range(len(imps))]
        pairs = sorted(zip(expanded, imps.tolist()), key=lambda kv: kv[1], reverse=True)[:10]
        return [{"feature": f, "importance": round(float(i), 4)} for f, i in pairs]

    # ── load engineered CSV ───────────────────────────────────────────────────
    df = pd.read_csv(io.BytesIO(csv_bytes))
    X = df.drop(columns=[target])
    y = df[target]
    feature_cols = X.columns.tolist()
    class_labels = None

    # ── train ─────────────────────────────────────────────────────────────────
    if problem_type == "classification":
        if not np.issubdtype(y.dtype, np.number):
            y, labels = pd.factorize(y)
            class_labels = labels.tolist()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE,
            stratify=y if len(np.unique(y)) > 1 else None,
        )
        min_class_count = int(np.bincount(y_train.astype(int)).min())
        n_splits = max(2, min(5, min_class_count))

        all_scores, best_name, best_template, best_cv = [], None, None, -1.0
        for name, template in CLASSIFIERS:
            pipe = _wrap(X_train, clone(template))
            cv = cross_val_score(pipe, X_train, y_train, cv=n_splits, scoring="accuracy", n_jobs=-1)
            all_scores.append({"name": name, "cv_mean": round(float(cv.mean()), 4), "cv_std": round(float(cv.std()), 4)})
            if cv.mean() > best_cv:
                best_cv, best_name, best_template = float(cv.mean()), name, template

        best_model = _wrap(X_train, clone(best_template))
        best_model.fit(X_train, y_train)
        preds = best_model.predict(X_test)
        train_acc = float(accuracy_score(y_train, best_model.predict(X_train)))
        test_acc = float(accuracy_score(y_test, preds))

        metrics = {
            "model_name": best_name,
            "score": test_acc,
            "score_metric": "accuracy",
            "extra": {
                "train_accuracy": train_acc,
                "overfit_gap": round(train_acc - test_acc, 4),
                "f1_macro": float(f1_score(y_test, preds, average="macro", zero_division=0)),
                "cv_accuracy_mean": round(best_cv, 4),
                "n_classes": int(len(np.unique(y))),
                "test_size": int(len(y_test)),
                "all_models": sorted(all_scores, key=lambda x: x["cv_mean"], reverse=True),
            },
        }
        y_test_out = np.array(y_test)

    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE,
        )
        n_splits = max(2, min(5, len(X_train) // 10))

        all_scores, best_name, best_template, best_cv = [], None, None, float("-inf")
        for name, template in REGRESSORS:
            pipe = _wrap(X_train, clone(template))
            cv = cross_val_score(pipe, X_train, y_train, cv=n_splits, scoring="r2", n_jobs=-1)
            all_scores.append({"name": name, "cv_mean": round(float(cv.mean()), 4), "cv_std": round(float(cv.std()), 4)})
            if cv.mean() > best_cv:
                best_cv, best_name, best_template = float(cv.mean()), name, template

        best_model = _wrap(X_train, clone(best_template))
        best_model.fit(X_train, y_train)
        preds = best_model.predict(X_test)
        train_r2 = float(r2_score(y_train, best_model.predict(X_train)))
        test_r2 = float(r2_score(y_test, preds))

        metrics = {
            "model_name": best_name,
            "score": test_r2,
            "score_metric": "r2",
            "extra": {
                "train_r2": train_r2,
                "overfit_gap": round(train_r2 - test_r2, 4),
                "rmse": float(root_mean_squared_error(y_test, preds)),
                "mae": float(mean_absolute_error(y_test, preds)),
                "cv_r2_mean": round(best_cv, 4),
                "test_size": int(len(y_test)),
                "all_models": sorted(all_scores, key=lambda x: x["cv_mean"], reverse=True),
            },
        }
        y_test_out = np.asarray(y_test)

    metrics["extra"]["top_features"] = _importances(best_model, feature_cols)

    # ── serialise model ───────────────────────────────────────────────────────
    bundle = {
        "model": best_model,
        "feature_cols": feature_cols,
        "problem_type": problem_type,
        "model_name": best_name,
        "class_labels": class_labels,
    }
    buf = io.BytesIO()
    joblib.dump(bundle, buf)

    return {
        "metrics": metrics,
        "y_test": y_test_out.tolist(),
        "y_pred": preds.tolist(),
        "model_bytes": buf.getvalue(),
        "class_labels": class_labels,
        "feature_cols": feature_cols,
    }
