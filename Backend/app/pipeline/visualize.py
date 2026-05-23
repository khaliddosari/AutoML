import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from sklearn.metrics import ConfusionMatrixDisplay

from app import storage

# Brand palette - keep plots aligned with the frontend's purple identity
# (#38009d primary, #4f29b7 container, #e7ddff surface tint).
BRAND_PRIMARY = "#38009d"
BRAND_LIGHT = "#e7ddff"
BRAND_MID = "#4f29b7"
BRAND_CMAP = LinearSegmentedColormap.from_list("modelforge_purple", [BRAND_LIGHT, BRAND_PRIMARY])


def generate_visualization(run_id: str, target: str, problem_type: str) -> dict:
    y_test = np.load(storage.run_dir(run_id) / "y_test.npy", allow_pickle=True)
    y_pred = np.load(storage.run_dir(run_id) / "y_pred.npy", allow_pickle=True)

    fig, ax = plt.subplots(figsize=(6, 5))

    if problem_type == "classification":
        ConfusionMatrixDisplay.from_predictions(
            y_test, y_pred, ax=ax, colorbar=False, cmap=BRAND_CMAP
        )
        ax.set_title(f"Confusion Matrix - target: {target}", color=BRAND_PRIMARY)
        plot_kind = "confusion_matrix"
    else:
        ax.scatter(y_test, y_pred, alpha=0.65, color=BRAND_MID, edgecolor=BRAND_PRIMARY, linewidth=0.3)
        lo = float(min(np.min(y_test), np.min(y_pred)))
        hi = float(max(np.max(y_test), np.max(y_pred)))
        ax.plot([lo, hi], [lo, hi], color=BRAND_PRIMARY, linestyle="--", linewidth=1.2)
        ax.set_xlabel(f"Actual {target}")
        ax.set_ylabel(f"Predicted {target}")
        ax.set_title(f"Predicted vs Actual - target: {target}", color=BRAND_PRIMARY)
        plot_kind = "predicted_vs_actual"

    fig.tight_layout()
    out = storage.artifact_path(run_id, "plot.png")
    fig.savefig(out, dpi=120)
    plt.close(fig)

    info = {"plot_kind": plot_kind, "plot_path": str(out)}
    storage.write_json(run_id, "visualization.json", info)
    return info
