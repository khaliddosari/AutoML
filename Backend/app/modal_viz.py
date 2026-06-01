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

    # Liquid Glass palette - dark, transparent plots that float on the frosted-glass
    # surfaces of the redesigned frontend (cyan -> blue accent, off-white text).
    ACCENT = "#4fc3f7"       # cyan
    ACCENT_DARK = "#0288d1"  # deep ocean blue
    TEXT = "#e8e8ed"         # off-white (primary text)
    MUTED = "#9999a8"        # cool grey (labels, ticks)
    GRID = "#2a2a35"         # faint hairline grid / spines
    BRAND_CMAP = LinearSegmentedColormap.from_list(
        "namtheg_cyan", ["#0a1620", "#4fc3f7"]
    )

    y_test_arr = np.array(y_test)
    y_pred_arr = np.array(y_pred)

    fig, ax = plt.subplots(figsize=(6, 5))

    if problem_type == "classification":
        disp = ConfusionMatrixDisplay.from_predictions(
            y_test_arr, y_pred_arr, ax=ax, colorbar=False, cmap=BRAND_CMAP
        )
        # Force legible counts: dark text on bright (cyan) cells, off-white on dark.
        cm = disp.confusion_matrix
        vmax = cm.max() or 1
        if disp.text_ is not None:
            for i in range(cm.shape[0]):
                for j in range(cm.shape[1]):
                    t = disp.text_[i, j]
                    if t is not None:
                        t.set_color("#0a1620" if cm[i, j] >= 0.5 * vmax else "#e8e8ed")
        ax.set_title(f"Confusion Matrix - target: {target}")
    else:
        ax.scatter(y_test_arr, y_pred_arr, alpha=0.75, color=ACCENT, edgecolor=ACCENT_DARK, linewidth=0.4)
        lo = float(min(np.min(y_test_arr), np.min(y_pred_arr)))
        hi = float(max(np.max(y_test_arr), np.max(y_pred_arr)))
        ax.plot([lo, hi], [lo, hi], color=ACCENT, linestyle="--", linewidth=1.2)
        ax.grid(True, color=MUTED, linewidth=0.6, alpha=0.6)
        ax.set_axisbelow(True)
        ax.set_xlabel(f"Actual {target}")
        ax.set_ylabel(f"Predicted {target}")
        ax.set_title(f"Predicted vs Actual - target: {target}")

    # Transparent background + recolored text/ticks/spines for the dark UI.
    fig.patch.set_alpha(0.0)
    ax.patch.set_alpha(0.0)
    ax.title.set_color(TEXT)
    ax.xaxis.label.set_color(MUTED)
    ax.yaxis.label.set_color(MUTED)
    ax.tick_params(colors=MUTED)
    for spine in ax.spines.values():
        spine.set_color(GRID)

    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120, transparent=True)
    plt.close(fig)
    buf.seek(0)
    return buf.read()
