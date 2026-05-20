from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

_RS = 42

# Each entry: (display_name, estimator_or_pipeline)
# Tree-based models need no scaling; linear/distance models are wrapped with StandardScaler.
REGRESSORS: list[tuple[str, object]] = [
    (
        "RandomForest",
        RandomForestRegressor(n_estimators=200, random_state=_RS, n_jobs=-1),
    ),
    (
        "ExtraTrees",
        ExtraTreesRegressor(n_estimators=200, random_state=_RS, n_jobs=-1),
    ),
    (
        "GradientBoosting",
        # n_iter_no_change + validation_fraction enable early stopping so the model
        # doesn't blindly run all 200 rounds on small datasets and overfit.
        GradientBoostingRegressor(
            n_estimators=200,
            n_iter_no_change=10,
            validation_fraction=0.1,
            tol=1e-4,
            random_state=_RS,
        ),
    ),
    (
        "Ridge",
        Pipeline([
            ("scaler", StandardScaler()),
            ("model", Ridge()),
        ]),
    ),
    (
        "KNN",
        Pipeline([
            ("scaler", StandardScaler()),
            ("model", KNeighborsRegressor(n_neighbors=5, n_jobs=-1)),
        ]),
    ),
]
