import logging

import pandas as pd
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app import storage
from app.agent.orchestrator import run_agent
from app.config import settings
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
