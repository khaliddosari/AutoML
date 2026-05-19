import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import ConfusionMatrixDisplay

from app import storage


def generate_visualization(run_id: str, target: str, problem_type: str) -> dict:
    y_test = np.load(storage.run_dir(run_id) / "y_test.npy", allow_pickle=True)
    y_pred = np.load(storage.run_dir(run_id) / "y_pred.npy", allow_pickle=True)

    fig, ax = plt.subplots(figsize=(6, 5))

    if problem_type == "classification":
        ConfusionMatrixDisplay.from_predictions(y_test, y_pred, ax=ax, colorbar=False)
        ax.set_title(f"Confusion Matrix — target: {target}")
        plot_kind = "confusion_matrix"
    else:
        ax.scatter(y_test, y_pred, alpha=0.6, edgecolor="k", linewidth=0.3)
        lo = float(min(np.min(y_test), np.min(y_pred)))
        hi = float(max(np.max(y_test), np.max(y_pred)))
        ax.plot([lo, hi], [lo, hi], "r--", linewidth=1)
        ax.set_xlabel(f"Actual {target}")
        ax.set_ylabel(f"Predicted {target}")
        ax.set_title(f"Predicted vs Actual — target: {target}")
        plot_kind = "predicted_vs_actual"

    fig.tight_layout()
    out = storage.artifact_path(run_id, "plot.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)

    info = {"plot_kind": plot_kind, "plot_path": str(out)}
    storage.write_json(run_id, "visualization.json", info)
    return info
