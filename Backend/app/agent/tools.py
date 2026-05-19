import json

from langchain_core.tools import tool

from app import storage
from app.pipeline import detect, eda, feature_engineering, profile, train, visualize


def _dump(payload) -> str:
    return json.dumps(payload, default=str)


def _require_target(run_id: str, target: str) -> str:
    """Return target if provided; fall back to the value stored in status.json."""
    if target:
        return target
    stored = storage.read_status(run_id).get("target", "")
    if not stored:
        raise ValueError(f"'target' is required but was not provided and is not in run status for {run_id!r}")
    return stored


def _require_problem_type(run_id: str, problem_type: str) -> str:
    """Return problem_type if provided; fall back to detection result JSON."""
    if problem_type:
        return problem_type
    detection = storage.read_json(run_id, "detection.json") or {}
    stored = detection.get("problem_type", "")
    if not stored:
        raise ValueError(f"'problem_type' is required but was not provided and is not in detection result for {run_id!r}")
    return stored


@tool
def profile_dataset(run_id: str) -> str:
    """Profile the uploaded CSV: column names, dtypes, missing counts, uniques, samples.
    Returns a JSON string describing the schema. Call this first."""
    return _dump(profile.profile_dataset(run_id))


@tool
def detect_problem_type(run_id: str, target: str = "") -> str:
    """Inspect the target column and decide whether the task is 'regression' or
    'classification'. Returns a JSON string with the decision and the reason."""
    return _dump(detect.detect_problem_type(run_id, _require_target(run_id, target)))


@tool
def run_eda(run_id: str, target: str = "") -> str:
    """Run exploratory data analysis: numeric summary, target distribution, and
    correlations / class counts against the target. Returns a JSON string."""
    return _dump(eda.run_eda(run_id, _require_target(run_id, target)))


@tool
def feature_engineer(run_id: str, target: str = "") -> str:
    """Apply feature engineering: drop high-missing and id-like columns, impute
    missing values, encode categoricals. Writes the engineered CSV. Returns a
    JSON string describing what was done."""
    return _dump(feature_engineering.feature_engineer(run_id, _require_target(run_id, target)))


@tool
def train_model(run_id: str, target: str = "", problem_type: str = "") -> str:
    """Train a model on the engineered dataset. problem_type must be 'regression'
    or 'classification'. Returns a JSON string with the metrics, the score, the
    score metric name, and top feature importances."""
    return _dump(train.train_model(
        run_id,
        _require_target(run_id, target),
        _require_problem_type(run_id, problem_type),
    ))


@tool
def generate_visualization(run_id: str, target: str = "", problem_type: str = "") -> str:
    """Generate the result plot: predicted-vs-actual for regression, confusion
    matrix for classification. Returns a JSON string with the plot path."""
    return _dump(visualize.generate_visualization(
        run_id,
        _require_target(run_id, target),
        _require_problem_type(run_id, problem_type),
    ))


ALL_TOOLS = [
    profile_dataset,
    detect_problem_type,
    run_eda,
    feature_engineer,
    train_model,
    generate_visualization,
]
