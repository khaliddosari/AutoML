from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

_RS = 42

# Each entry: (display_name, estimator_or_pipeline)
# Tree-based models need no scaling; linear/distance models are wrapped with StandardScaler.
CLASSIFIERS: list[tuple[str, object]] = [
    (
        "RandomForest",
        RandomForestClassifier(n_estimators=200, random_state=_RS, n_jobs=-1),
    ),
    (
        "ExtraTrees",
        ExtraTreesClassifier(n_estimators=200, random_state=_RS, n_jobs=-1),
    ),
    (
        "GradientBoosting",
        # n_iter_no_change + validation_fraction enable early stopping so the model
        # doesn't blindly run all 200 rounds on small datasets and overfit.
        GradientBoostingClassifier(
            n_estimators=200,
            n_iter_no_change=10,
            validation_fraction=0.1,
            tol=1e-4,
            random_state=_RS,
        ),
    ),
    (
        "LogisticRegression",
        Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=1000, random_state=_RS, n_jobs=-1)),
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
