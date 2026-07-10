from lightgbm import LGBMClassifier
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

_RS = 42

# Sweep-phase templates: deliberately lean estimator counts so the comparison
# loop stays fast.  train.py re-fits the winner on the full training set after
# the sweep, so lowering this number here does not degrade final model quality.
CLASSIFIERS: list[tuple[str, object]] = [
    (
        "RandomForest",
        RandomForestClassifier(n_estimators=100, random_state=_RS, n_jobs=-1),
    ),
    (
        "ExtraTrees",
        ExtraTreesClassifier(n_estimators=100, random_state=_RS, n_jobs=-1),
    ),
    (
        "LightGBM",
        # Histogram-based gradient boosting: far faster than sklearn's
        # GradientBoosting on CPU and usually more accurate on tabular data.
        # verbose=-1 silences LightGBM's per-iteration chatter (and the benign
        # "no positive gain" warnings on small datasets).
        LGBMClassifier(
            n_estimators=200,
            learning_rate=0.05,
            num_leaves=31,
            random_state=_RS,
            n_jobs=-1,
            verbose=-1,
        ),
    ),
    (
        "LogisticRegression",
        Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=500, random_state=_RS, n_jobs=-1)),
        ]),
    ),
    (
        "KNN",
        Pipeline([
            ("scaler", StandardScaler()),
            ("model", KNeighborsClassifier(n_neighbors=5, n_jobs=-1)),
        ]),
    ),
]
