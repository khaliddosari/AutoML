"""Template for the per-run Modal serve.py.

`render()` substitutes the run_id and pinned package versions into the literal
template so the generated file is a complete, standalone Modal app that can be
deployed with `modal deploy serve.py`.
"""
from importlib.metadata import version


SERVE_TEMPLATE = '''"""Modal serving app for ModelForge run {run_id}.

Auto-generated. Do not edit by hand — rerun the Deploy button to regenerate.
"""
import modal


image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "scikit-learn=={sklearn_version}",
        "pandas=={pandas_version}",
        "numpy=={numpy_version}",
        "scipy=={scipy_version}",
        "joblib=={joblib_version}",
        "fastapi[standard]",
    )
    .add_local_file("model.joblib", "/model/model.joblib")
)

app = modal.App("modelforge-{run_id}", image=image)


@app.cls(min_containers=0, scaledown_window=300)
class Predictor:
    @modal.enter()
    def load(self):
        import joblib
        bundle = joblib.load("/model/model.joblib")
        # `model` is a Pipeline(imputer -> ... -> estimator); imputation happens
        # inside .predict() so we no longer need a separate imputer object.
        self.model = bundle["model"]
        self.feature_cols = bundle["feature_cols"]
        self.problem_type = bundle["problem_type"]
        self.model_name = bundle.get("model_name", "model")
        self.class_labels = bundle.get("class_labels")

    @modal.fastapi_endpoint(method="POST", docs=True)
    def predict(self, payload: dict):
        import pandas as pd

        if "features" in payload and isinstance(payload["features"], dict):
            row = {{c: payload["features"].get(c) for c in self.feature_cols}}
            df = pd.DataFrame([row], columns=self.feature_cols)
        elif "rows" in payload and isinstance(payload["rows"], list):
            try:
                df = pd.DataFrame(payload["rows"], columns=self.feature_cols)
            except Exception as e:
                return {{
                    "error": (
                        "Each row must have "
                        + str(len(self.feature_cols))
                        + " values in the order returned by /schema. "
                        + str(e)
                    )
                }}
        else:
            return {{
                "error": (
                    "Provide either 'features' (object of column->value) or "
                    "'rows' (array of arrays). Call /schema for the expected columns."
                )
            }}

        try:
            preds = self.model.predict(df)
            preds_list = preds.tolist() if hasattr(preds, "tolist") else list(preds)
            result = {{"predictions": preds_list, "model": self.model_name}}

            if self.problem_type == "classification":
                if self.class_labels:
                    result["predicted_labels"] = [
                        self.class_labels[int(p)] if 0 <= int(p) < len(self.class_labels) else None
                        for p in preds_list
                    ]
                if hasattr(self.model, "predict_proba"):
                    probs = self.model.predict_proba(df)
                    result["probabilities"] = probs.tolist()
                    if self.class_labels:
                        result["class_labels"] = list(self.class_labels)
            return result
        except Exception as e:
            return {{"error": "Prediction failed: " + str(e)}}

    @modal.fastapi_endpoint(method="GET", docs=True)
    def schema(self):
        return {{
            "run_id": "{run_id}",
            "model_name": self.model_name,
            "problem_type": self.problem_type,
            "feature_cols": self.feature_cols,
            "class_labels": list(self.class_labels) if self.class_labels else None,
            "example_features": {{
                "features": {{c: 0 for c in self.feature_cols}}
            }},
            "example_rows": {{
                "rows": [[0 for _ in self.feature_cols]]
            }},
        }}
'''


def render(run_id: str) -> str:
    return SERVE_TEMPLATE.format(
        run_id=run_id,
        sklearn_version=version("scikit-learn"),
        pandas_version=version("pandas"),
        numpy_version=version("numpy"),
        scipy_version=version("scipy"),
        joblib_version=version("joblib"),
    )
