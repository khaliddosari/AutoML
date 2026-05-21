import json as _json
import logging
import urllib.error
import urllib.request

import joblib
import pandas as pd
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app import storage
from app.agent.orchestrator import run_agent
from app.config import settings
from app.deploy.modal_deploy import deploy_run
from app.schemas import StartRunRequest

logging.basicConfig(level=settings.log_level)
log = logging.getLogger("modelforge")

app = FastAPI(title="ModelForge Backend (MVP)", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "llm_configured": bool(settings.openrouter_api_key),
        "llm_provider": "openrouter",
        "llm_model": settings.openrouter_model,
    }


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are accepted.")
    run_id = storage.new_run_id()
    dest = storage.dataset_path(run_id)
    with dest.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
    try:
        df = pd.read_csv(dest, nrows=5)
    except Exception as e:
        raise HTTPException(400, f"Could not parse CSV: {e}")
    storage.write_status(run_id, "uploaded", filename=file.filename)
    return {
        "run_id": run_id,
        "filename": file.filename,
        "columns": df.columns.tolist(),
        "preview": df.to_dict(orient="records"),
    }


@app.get("/runs/{run_id}/preview")
def preview(run_id: str) -> dict:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    df = pd.read_csv(storage.dataset_path(run_id), nrows=20)
    return {
        "run_id": run_id,
        "n_columns": int(df.shape[1]),
        "columns": df.columns.tolist(),
        "preview": df.to_dict(orient="records"),
    }


@app.post("/runs/{run_id}/start")
def start_run(run_id: str, req: StartRunRequest, background: BackgroundTasks) -> dict:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    df = pd.read_csv(storage.dataset_path(run_id), nrows=1)
    if req.target not in df.columns:
        raise HTTPException(400, f"Target '{req.target}' not in columns: {df.columns.tolist()}")
    storage.write_status(run_id, "queued", target=req.target)
    background.add_task(run_agent, run_id, req.target)
    return {"run_id": run_id, "status": "queued", "target": req.target}


@app.get("/runs/{run_id}/status")
def status(run_id: str) -> dict:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    return {"run_id": run_id, **storage.read_status(run_id)}


@app.get("/runs/{run_id}/result")
def result(run_id: str) -> JSONResponse:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    result = storage.read_json(run_id, "result.json")
    if result is None:
        raise HTTPException(409, "Run has not produced a result yet.")
    return JSONResponse(result)


@app.get("/runs/{run_id}/plot")
def plot(run_id: str) -> FileResponse:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    path = storage.artifact_path(run_id, "plot.png")
    if not path.exists():
        raise HTTPException(404, "Plot not yet generated.")
    return FileResponse(path, media_type="image/png", filename="plot.png")


@app.post("/runs/{run_id}/deploy")
def deploy(run_id: str, background: BackgroundTasks) -> dict:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    if not storage.artifact_path(run_id, "model.joblib").exists():
        raise HTTPException(409, "No trained model to deploy — finish a successful run first.")

    existing = storage.read_json(run_id, "deployment.json") or {}
    if existing.get("status") == "deploying":
        return {"run_id": run_id, "status": "deploying", "message": "Deployment already in progress."}

    storage.write_json(
        run_id,
        "deployment.json",
        {"status": "deploying", "app_name": f"modelforge-{run_id}"},
    )
    background.add_task(deploy_run, run_id)
    return {"run_id": run_id, "status": "deploying"}


@app.get("/runs/{run_id}/deployment")
def deployment(run_id: str) -> dict:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    data = storage.read_json(run_id, "deployment.json")
    if data is None:
        return {"run_id": run_id, "status": "not_deployed"}
    return {"run_id": run_id, **data}


@app.get("/runs/{run_id}/model_schema")
def model_schema(run_id: str) -> dict:
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    bundle_path = storage.artifact_path(run_id, "model.joblib")
    if not bundle_path.exists():
        raise HTTPException(409, "No trained model — finish a successful run first.")
    bundle = joblib.load(bundle_path)

    # First engineered row gives a realistic baseline for the predict form.
    sample: dict = {}
    eng_path = storage.engineered_path(run_id)
    if eng_path.exists():
        row = pd.read_csv(eng_path, nrows=1)
        target = storage.read_status(run_id).get("target")
        for c in bundle["feature_cols"]:
            if c in row.columns:
                val = row.iloc[0][c]
                # Cast numpy scalars to plain JSON-safe types.
                if pd.isna(val):
                    sample[c] = None
                elif hasattr(val, "item"):
                    sample[c] = val.item()
                else:
                    sample[c] = val
        # paranoia: never leak the target column
        sample.pop(target, None)

    return {
        "run_id": run_id,
        "model_name": bundle.get("model_name"),
        "problem_type": bundle.get("problem_type"),
        "feature_cols": bundle["feature_cols"],
        "class_labels": bundle.get("class_labels"),
        "sample": sample,
    }


@app.post("/runs/{run_id}/predict")
async def predict(run_id: str, request: Request) -> dict:
    """Proxy a prediction request to the deployed Modal endpoint.

    Going through the backend avoids browser CORS issues with Modal."""
    if not storage.run_exists(run_id):
        raise HTTPException(404, "run_id not found")
    dep = storage.read_json(run_id, "deployment.json") or {}
    predict_url = dep.get("predict_url")
    if not predict_url or dep.get("status") != "succeeded":
        raise HTTPException(409, "Model is not deployed yet. Click 'Deploy to Modal' first.")

    payload = await request.body()
    req = urllib.request.Request(
        predict_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise HTTPException(e.code, f"Modal endpoint error: {detail[:500]}")
    except urllib.error.URLError as e:
        raise HTTPException(502, f"Could not reach Modal endpoint: {e.reason}")
    try:
        return _json.loads(body)
    except _json.JSONDecodeError:
        raise HTTPException(502, f"Modal returned non-JSON: {body[:500]}")
