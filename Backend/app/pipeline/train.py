import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.neighbors import KNeighborsRegressor

from app import storage
from app.pipeline.models.classifiers import CLASSIFIERS
from app.pipeline.models.regressors import REGRESSORS

RANDOM_STATE = 42


def _inner_estimator(model):
    """Return the final estimator whether the model is a Pipeline or a plain estimator."""
    if isinstance(model, Pipeline):
        return model.steps[-1][1]
    return model


def _feature_importances(model, columns: list[str]) -> list[dict]:
    """Extract top-10 feature importances from tree or linear models."""
    est = _inner_estimator(model)
    if hasattr(est, "feature_importances_"):
        imps = np.array(est.feature_importances_)
    elif hasattr(est, "coef_"):
        coef = np.array(est.coef_)
        imps = np.abs(coef[0] if coef.ndim > 1 else coef)
    else:
        return []
    pairs = sorted(zip(columns, imps.tolist()), key=lambda kv: kv[1], reverse=True)[:10]
    return [{"feature": f, "importance": round(float(i), 4)} for f, i in pairs]


def train_model(run_id: str, target: str, problem_type: str) -> dict:
    df = pd.read_csv(storage.engineered_path(run_id))
    if target not in df.columns:
        raise ValueError(f"Target '{target}' missing from engineered dataset.")

    X = df.drop(columns=[target])
    y = df[target]
    feature_cols = X.columns.tolist()

    if problem_type == "classification":
        if not np.issubdtype(y.dtype, np.number):
            y, _ = pd.factorize(y)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE,
            stratify=y if len(np.unique(y)) > 1 else None,
        )
        imputer = SimpleImputer(strategy="median")
        X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=feature_cols)
        X_test = pd.DataFrame(imputer.transform(X_test), columns=feature_cols)

        # CV fold count bounded by smallest class size to avoid stratification errors.
        min_class_count = int(np.bincount(y_train.astype(int)).min())
        n_splits = max(2, min(5, min_class_count))

        # Evaluate all candidates. Select by CV mean (not raw test score) to avoid
        # test-set shopping bias. Each candidate is cloned so module-level templates
        # are never mutated and concurrent runs don't corrupt each other.
        all_scores: list[dict] = []
        best_name, best_model, best_cv_mean = None, None, -1.0

        for name, template in CLASSIFIERS:
            fitted = clone(template)
            fitted.fit(X_train, y_train)
            test_acc = float(accuracy_score(y_test, fitted.predict(X_test)))
            cv = cross_val_score(clone(fitted), X_train, y_train, cv=n_splits, scoring="accuracy", n_jobs=-1)
            all_scores.append({
                "name": name,
                "test_accuracy": round(test_acc, 4),
                "cv_mean": round(float(cv.mean()), 4),
                "cv_std": round(float(cv.std()), 4),
            })
            if cv.mean() > best_cv_mean:
                best_cv_mean = float(cv.mean())
                best_name = name
                best_model = fitted

        preds = best_model.predict(X_test)
        best_test_acc = float(accuracy_score(y_test, preds))
        train_acc = float(accuracy_score(y_train, best_model.predict(X_train)))
        f1m = float(f1_score(y_test, preds, average="macro", zero_division=0))

        metrics = {
            "model_name": best_name,
            "score": best_test_acc,
            "score_metric": "accuracy",
            "extra": {
                "train_accuracy": train_acc,
                "overfit_gap": round(train_acc - best_test_acc, 4),
                "f1_macro": f1m,
                "cv_accuracy_mean": round(best_cv_mean, 4),
                "n_classes": int(len(np.unique(y))),
                "test_size": int(len(y_test)),
                "all_models": sorted(all_scores, key=lambda x: x["cv_mean"], reverse=True),
            },
        }
        np.save(storage.run_dir(run_id) / "y_test.npy", y_test)
        np.save(storage.run_dir(run_id) / "y_pred.npy", preds)

    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE,
        )
        imputer = SimpleImputer(strategy="median")
        X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=feature_cols)
        X_test = pd.DataFrame(imputer.transform(X_test), columns=feature_cols)

        # Cap CV folds by training set size to avoid degenerate folds on tiny datasets.
        n_splits = max(2, min(5, len(X_train) // 10))

        all_scores: list[dict] = []
        best_name, best_model, best_cv_mean = None, None, float("-inf")

        for name, template in REGRESSORS:
            fitted = clone(template)
            fitted.fit(X_train, y_train)
            test_r2 = float(r2_score(y_test, fitted.predict(X_test)))
            cv = cross_val_score(clone(fitted), X_train, y_train, cv=n_splits, scoring="r2", n_jobs=-1)
            all_scores.append({
                "name": name,
                "test_r2": round(test_r2, 4),
                "cv_mean": round(float(cv.mean()), 4),
                "cv_std": round(float(cv.std()), 4),
            })
            if cv.mean() > best_cv_mean:
                best_cv_mean = float(cv.mean())
                best_name = name
                best_model = fitted

        preds = best_model.predict(X_test)
        best_test_r2 = float(r2_score(y_test, preds))
        train_r2 = float(r2_score(y_train, best_model.predict(X_train)))
        rmse = float(root_mean_squared_error(y_test, preds))
        mae = float(mean_absolute_error(y_test, preds))

        metrics = {
            "model_name": best_name,
            "score": best_test_r2,
            "score_metric": "r2",
            "extra": {
                "train_r2": train_r2,
                "overfit_gap": round(train_r2 - best_test_r2, 4),
                "rmse": rmse,
                "mae": mae,
                "cv_r2_mean": round(best_cv_mean, 4),
                "test_size": int(len(y_test)),
                "all_models": sorted(all_scores, key=lambda x: x["cv_mean"], reverse=True),
            },
        }
        np.save(storage.run_dir(run_id) / "y_test.npy", np.asarray(y_test))
        np.save(storage.run_dir(run_id) / "y_pred.npy", preds)

    metrics["extra"]["top_features"] = _feature_importances(best_model, feature_cols)
    storage.write_json(run_id, "metrics.json", metrics)
    return metrics


def get_classifier(model_name: str, params: dict):
    rs = 42
    if model_name == "RandomForest":
        return RandomForestClassifier(
            n_estimators=int(params.get("n_estimators", 200)),
            max_depth=params.get("max_depth", None),
            min_samples_split=int(params.get("min_samples_split", 2)),
            random_state=rs,
            n_jobs=-1
        )
    elif model_name == "ExtraTrees":
        return ExtraTreesClassifier(
            n_estimators=int(params.get("n_estimators", 200)),
            max_depth=params.get("max_depth", None),
            random_state=rs,
            n_jobs=-1
        )
    elif model_name == "GradientBoosting":
        return GradientBoostingClassifier(
            n_estimators=int(params.get("n_estimators", 200)),
            learning_rate=float(params.get("learning_rate", 0.1)),
            max_depth=int(params.get("max_depth", 3)),
            n_iter_no_change=10,
            validation_fraction=0.1,
            tol=1e-4,
            random_state=rs
        )
    elif model_name == "LogisticRegression":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(
                C=float(params.get("C", 1.0)),
                max_iter=1000,
                random_state=rs,
                n_jobs=-1
            ))
        ])
    elif model_name == "KNN":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("model", KNeighborsClassifier(
                n_neighbors=int(params.get("n_neighbors", 5)),
                weights=params.get("weights", "uniform"),
                n_jobs=-1
            ))
        ])
    else:
        raise ValueError(f"Unknown classifier model_name: {model_name}")


def get_regressor(model_name: str, params: dict):
    rs = 42
    if model_name == "RandomForest":
        return RandomForestRegressor(
            n_estimators=int(params.get("n_estimators", 200)),
            max_depth=params.get("max_depth", None),
            min_samples_split=int(params.get("min_samples_split", 2)),
            random_state=rs,
            n_jobs=-1
        )
    elif model_name == "ExtraTrees":
        return ExtraTreesRegressor(
            n_estimators=int(params.get("n_estimators", 200)),
            max_depth=params.get("max_depth", None),
            random_state=rs,
            n_jobs=-1
        )
    elif model_name == "GradientBoosting":
        return GradientBoostingRegressor(
            n_estimators=int(params.get("n_estimators", 200)),
            learning_rate=float(params.get("learning_rate", 0.1)),
            max_depth=int(params.get("max_depth", 3)),
            n_iter_no_change=10,
            validation_fraction=0.1,
            tol=1e-4,
            random_state=rs
        )
    elif model_name == "Ridge":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("model", Ridge(alpha=float(params.get("alpha", 1.0))))
        ])
    elif model_name == "KNN":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("model", KNeighborsRegressor(
                n_neighbors=int(params.get("n_neighbors", 5)),
                weights=params.get("weights", "uniform"),
                n_jobs=-1
            ))
        ])
    else:
        raise ValueError(f"Unknown regressor model_name: {model_name}")


def train_champion_with_params(run_id: str, target: str, problem_type: str, model_name: str, params: dict) -> dict:
    df = pd.read_csv(storage.engineered_path(run_id))
    if target not in df.columns:
        raise ValueError(f"Target '{target}' missing from engineered dataset.")

    X = df.drop(columns=[target])
    y = df[target]
    feature_cols = X.columns.tolist()

    if problem_type == "classification":
        if not np.issubdtype(y.dtype, np.number):
            y, _ = pd.factorize(y)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE,
            stratify=y if len(np.unique(y)) > 1 else None,
        )
        imputer = SimpleImputer(strategy="median")
        X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=feature_cols)
        X_test = pd.DataFrame(imputer.transform(X_test), columns=feature_cols)

        min_class_count = int(np.bincount(y_train.astype(int)).min())
        n_splits = max(2, min(5, min_class_count))

        model = get_classifier(model_name, params)
        model.fit(X_train, y_train)
        test_acc = float(accuracy_score(y_test, model.predict(X_test)))
        cv = cross_val_score(clone(model), X_train, y_train, cv=n_splits, scoring="accuracy", n_jobs=-1)
        cv_mean = float(cv.mean())
        cv_std = float(cv.std())

        return {
            "cv_mean": round(cv_mean, 4),
            "cv_std": round(cv_std, 4),
            "test_score": round(test_acc, 4),
            "model": model,
            "feature_cols": feature_cols,
            "y_test": y_test,
            "preds": model.predict(X_test),
            "train_score": float(accuracy_score(y_train, model.predict(X_train))),
            "f1_macro": float(f1_score(y_test, model.predict(X_test), average="macro", zero_division=0)),
            "n_classes": int(len(np.unique(y))),
            "test_size": int(len(y_test))
        }
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=RANDOM_STATE,
        )
        imputer = SimpleImputer(strategy="median")
        X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=feature_cols)
        X_test = pd.DataFrame(imputer.transform(X_test), columns=feature_cols)

        n_splits = max(2, min(5, len(X_train) // 10))

        model = get_regressor(model_name, params)
        model.fit(X_train, y_train)
        test_r2 = float(r2_score(y_test, model.predict(X_test)))
        cv = cross_val_score(clone(model), X_train, y_train, cv=n_splits, scoring="r2", n_jobs=-1)
        cv_mean = float(cv.mean())
        cv_std = float(cv.std())

        return {
            "cv_mean": round(cv_mean, 4),
            "cv_std": round(cv_std, 4),
            "test_score": round(test_r2, 4),
            "model": model,
            "feature_cols": feature_cols,
            "y_test": y_test,
            "preds": model.predict(X_test),
            "train_score": float(r2_score(y_train, model.predict(X_train))),
            "rmse": float(root_mean_squared_error(y_test, model.predict(X_test))),
            "mae": float(mean_absolute_error(y_test, model.predict(X_test))),
            "test_size": int(len(y_test))
        }
