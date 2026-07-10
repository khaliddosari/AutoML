from lightgbm import LGBMRegressor
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

_RS = 42

# Sweep-phase templates: deliberately lean estimator counts so the comparison
# loop stays fast.  train.py re-fits the winner on the full training set after
# the sweep, so lowering this number here does not degrade final model quality.
REGRESSORS: list[tuple[str, object]] = [
    (
        "RandomForest",
        RandomForestRegressor(n_estimators=100, random_state=_RS, n_jobs=-1),
    ),
    (
        "ExtraTrees",
        ExtraTreesRegressor(n_estimators=100, random_state=_RS, n_jobs=-1),
    ),
    (
        "LightGBM",
        # Histogram-based gradient boosting: far faster than sklearn's
        # GradientBoosting on CPU and usually more accurate on tabular data.
        # verbose=-1 silences LightGBM's per-iteration chatter (and the benign
        # "no positive gain" warnings on small datasets).
        LGBMRegressor(
            n_estimators=200,
            learning_rate=0.05,
            num_leaves=31,
            random_state=_RS,
            n_jobs=-1,
            verbose=-1,
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
