import json
import uuid
from pathlib import Path
from typing import Any

from app.config import settings


def new_run_id() -> str:
    return uuid.uuid4().hex[:12]


def run_dir(run_id: str) -> Path:
    p = settings.storage_dir / "runs" / run_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def dataset_path(run_id: str) -> Path:
    return run_dir(run_id) / "dataset.csv"


def engineered_path(run_id: str) -> Path:
    return run_dir(run_id) / "engineered.csv"


def artifact_path(run_id: str, name: str) -> Path:
    return run_dir(run_id) / name


def write_json(run_id: str, name: str, payload: Any) -> Path:
    path = artifact_path(run_id, name)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return path


def read_json(run_id: str, name: str) -> Any:
    path = artifact_path(run_id, name)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_status(run_id: str, status: str, **extra) -> None:
    current = read_json(run_id, "status.json") or {}
    current.update({"status": status, **extra})
    write_json(run_id, "status.json", current)


def read_status(run_id: str) -> dict:
    return read_json(run_id, "status.json") or {"status": "unknown"}


def run_exists(run_id: str) -> bool:
    return (settings.storage_dir / "runs" / run_id).exists()
