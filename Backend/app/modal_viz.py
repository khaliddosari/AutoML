"""Modal function for offloading plot generation to the cloud.

Call generate_plot.remote(...) from visualize.py to run this on Modal
instead of blocking the local FastAPI process.
"""
import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "matplotlib>=3.9,<4.0",
        "numpy>=1.26,<3.0",
        "scikit-learn>=1.5,<2.0",
    )
)

app = modal.App("modelforge-viz", image=image)


@app.function(image=image)
def generate_plot(
    y_test: list,
    y_pred: list,
    problem_type: str,
    target: str,
) -> bytes:
    """Generate a result plot and return it as PNG bytes.

    Accepts plain Python lists so the data is JSON-serialisable over
    the Modal wire - the caller converts numpy arrays with .tolist().
    """
    import io

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    from matplotlib.colors import LinearSegmentedColormap
    from sklearn.metrics import ConfusionMatrixDisplay

    # Brand palette matching the frontend's purple identity.
    BRAND_PRIMARY = "#38009d"
    BRAND_LIGHT = "#e7ddff"
    BRAND_MID = "#4f29b7"
    BRAND_CMAP = LinearSegmentedColormap.from_list("modelforge_purple", [BRAND_LIGHT, BRAND_PRIMARY])

    y_test_arr = np.array(y_test)
    y_pred_arr = np.array(y_pred)

    fig, ax = plt.subplots(figsize=(6, 5))

    if problem_type == "classification":
        ConfusionMatrixDisplay.from_predictions(
            y_test_arr, y_pred_arr, ax=ax, colorbar=False, cmap=BRAND_CMAP
        )
        ax.set_title(f"Confusion Matrix - target: {target}", color=BRAND_PRIMARY)
    else:
        ax.scatter(y_test_arr, y_pred_arr, alpha=0.65, color=BRAND_MID, edgecolor=BRAND_PRIMARY, linewidth=0.3)
        lo = float(min(np.min(y_test_arr), np.min(y_pred_arr)))
        hi = float(max(np.max(y_test_arr), np.max(y_pred_arr)))
        ax.plot([lo, hi], [lo, hi], color=BRAND_PRIMARY, linestyle="--", linewidth=1.2)
        ax.set_xlabel(f"Actual {target}")
        ax.set_ylabel(f"Predicted {target}")
        ax.set_title(f"Predicted vs Actual - target: {target}", color=BRAND_PRIMARY)

    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    buf.seek(0)
    return buf.read()
