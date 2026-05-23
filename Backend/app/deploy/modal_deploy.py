"""Render a per-run Modal serve.py and shell out to `modal deploy`.

Designed to be invoked as a FastAPI background task. Writes `deployment.json`
into the run directory so the frontend can poll status.
"""
import logging
import os
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

from app import storage
from app.deploy.serve_template import render

log = logging.getLogger(__name__)

DEPLOY_TIMEOUT_SECONDS = 600  # first-time image build can take a minute or two


def _subprocess_env() -> dict[str, str]:
    """Make modal CLI safe to run from a non-TTY subprocess.

    Modal's CLI uses `rich` for live progress output. Without a real terminal
    (which is the case under `subprocess.run` with capture_output=True), rich
    can raise KeyboardInterrupt on Windows when it tries cursor operations.
    Disabling colour + interactive rendering avoids that.
    """
    env = os.environ.copy()
    env["TERM"] = "dumb"
    env["NO_COLOR"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUNBUFFERED"] = "1"
    # Tell modal to use less interactive output if it respects this.
    env.setdefault("MODAL_LOGLEVEL", "INFO")
    return env


def _popen_kwargs() -> dict:
    """On Windows, isolate the modal subprocess from the parent's Ctrl+C group."""
    if platform.system() == "Windows":
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {}


def _write_deployment(run_id: str, **fields) -> None:
    existing = storage.read_json(run_id, "deployment.json") or {}
    existing.update(fields)
    storage.write_json(run_id, "deployment.json", existing)


def deploy_run(run_id: str) -> dict:
    """Run modal deploy and persist the resulting URLs. Returns deployment dict."""
    run_dir = storage.run_dir(run_id)
    model_path = run_dir / "model.joblib"
    if not model_path.exists():
        err = "model.joblib missing - has the training run succeeded?"
        _write_deployment(run_id, status="failed", error=err, finished_at=_now())
        return {"status": "failed", "error": err}

    app_name = f"modelforge-{run_id}"
    serve_path = run_dir / "serve.py"
    serve_path.write_text(render(run_id), encoding="utf-8")

    _write_deployment(
        run_id,
        status="deploying",
        app_name=app_name,
        started_at=_now(),
        predict_url=None,
        schema_url=None,
        error=None,
    )

    cmd = [sys.executable, "-m", "modal", "deploy", "serve.py"]
    started = time.time()
    log.info("Deploying run %s to Modal app %s", run_id, app_name)

    try:
        proc = subprocess.run(
            cmd,
            cwd=run_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=DEPLOY_TIMEOUT_SECONDS,
            env=_subprocess_env(),
            **_popen_kwargs(),
        )
    except subprocess.TimeoutExpired:
        err = f"modal deploy timed out after {DEPLOY_TIMEOUT_SECONDS}s"
        log.exception(err)
        _write_deployment(run_id, status="failed", error=err, finished_at=_now())
        return {"status": "failed", "error": err}
    except FileNotFoundError:
        err = (
            "Could not invoke `modal` CLI from the backend Python. "
            "Make sure `pip install modal` was run in the same venv that runs uvicorn."
        )
        log.exception(err)
        _write_deployment(run_id, status="failed", error=err, finished_at=_now())
        return {"status": "failed", "error": err}

    combined = (proc.stdout or "") + "\n" + (proc.stderr or "")

    # Always persist the raw modal output so failures are debuggable.
    (run_dir / "modal_deploy.log").write_text(combined, encoding="utf-8")

    if proc.returncode != 0:
        # Modal often writes auth / build errors to stderr; surface a short version.
        err = _short_error(combined) or f"modal deploy returned {proc.returncode}"
        if "KeyboardInterrupt" in combined:
            err = (
                "Deploy was interrupted (KeyboardInterrupt). Most common cause: uvicorn's "
                "--reload watched storage/ and restarted mid-deploy. Restart uvicorn with "
                "`--reload-dir app` so only the source folder is watched. See "
                "storage/runs/{run_id}/modal_deploy.log for the full trace."
            ).format(run_id=run_id)
        log.error("modal deploy failed for %s: %s", run_id, err)
        _write_deployment(
            run_id,
            status="failed",
            error=err,
            log_tail=combined[-2000:],
            finished_at=_now(),
        )
        return {"status": "failed", "error": err}

    predict_url, schema_url, all_urls = _parse_urls(combined)
    if not predict_url:
        err = "modal deploy succeeded but no predict URL was found in the output."
        _write_deployment(
            run_id,
            status="failed",
            error=err,
            log_tail=combined[-2000:],
            finished_at=_now(),
        )
        return {"status": "failed", "error": err}

    elapsed = round(time.time() - started, 1)
    deployment = {
        "status": "succeeded",
        "app_name": app_name,
        "predict_url": predict_url,
        "schema_url": schema_url,
        "all_urls": all_urls,
        "elapsed_seconds": elapsed,
        "finished_at": _now(),
        "error": None,
    }
    _write_deployment(run_id, **deployment)
    log.info("Deployed run %s in %.1fs => %s", run_id, elapsed, predict_url)
    return deployment


def _parse_urls(text: str) -> tuple[str | None, str | None, list[str]]:
    """Extract .modal.run endpoint URLs from modal deploy output.

    Modal builds endpoint hostnames as `{ws}--{app}-{class}-{method}.modal.run`,
    so the *method* name appears as the final segment before `.modal.run`. We
    match on that suffix - matching anywhere in the URL would conflate
    `predictor-predict` with `predictor-schema`.

    Modal's CLI uses `rich` box-drawing to render the result tree and wraps
    long URLs across multiple lines. Mid-tree children use a `│   ` (vertical
    bar + 3 spaces) continuation prefix; the last child (`└──`) uses 4 spaces
    instead. Both wrap URLs like:

        │   https://workspace--app-predictor-schema.modal.ru
        │   n
            https://workspace--app-predictor-predict.modal.r
            un

    We strip both continuation styles before regex-scanning so the URLs
    survive as single tokens.
    """
    clean = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", text)
    # Join any tree-style continuation: newline followed by 4 chars that are
    # either the vertical-bar box character or spaces.
    unwrapped = re.sub(r"\n[│ ]{4}", "", clean)
    raw = re.findall(r"https://[A-Za-z0-9\-\.]+\.modal\.run[/\w\-]*", unwrapped)
    seen: set[str] = set()
    urls = [u for u in raw if not (u in seen or seen.add(u))]

    def _ends_with_method(url: str, method: str) -> bool:
        host = url.split("//", 1)[-1].split("/", 1)[0].lower()
        return host.endswith(f"-{method}.modal.run") or host.endswith(f"_{method}.modal.run")

    predict = next((u for u in urls if _ends_with_method(u, "predict")), None)
    schema = next((u for u in urls if _ends_with_method(u, "schema")), None)
    return predict, schema, urls


def _short_error(text: str) -> str | None:
    """Pick a one-line summary out of multi-line Modal CLI errors."""
    clean = re.sub(r"\x1b\[[0-9;]*[A-Za-z]", "", text)
    for line in reversed(clean.strip().splitlines()):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(("Error", "ValueError", "AuthError", "ConnectionError")):
            return stripped[:300]
    # Fall back to the last non-empty line.
    for line in reversed(clean.strip().splitlines()):
        stripped = line.strip()
        if stripped:
            return stripped[:300]
    return None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
