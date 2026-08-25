import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any

from app.config import settings

log = logging.getLogger(__name__)

_storage_volume = None


def _get_volume():
    global _storage_volume
    if _storage_volume is None and str(settings.storage_dir) == "/storage":
        try:
            import modal
            _storage_volume = modal.Volume.from_name("modelforge-storage", create_if_missing=True)
        except Exception:
            pass
    return _storage_volume


def sync_reload() -> None:
    vol = _get_volume()
    if vol:
        try:
            vol.reload()
        except Exception:
            pass


def sync_commit() -> None:
    vol = _get_volume()
    if vol:
        try:
            vol.commit()
        except Exception:
            pass


def new_run_id() -> str:
    return uuid.uuid4().hex[:12]


def run_dir(run_id: str) -> Path:
    p = settings.storage_dir / "runs" / run_id
    p.mkdir(parents=True, exist_ok=True)
    return p


def dataset_path(run_id: str) -> Path:
    p = run_dir(run_id) / "dataset.csv"
    if not p.exists():
        sync_reload()
    return p


def engineered_path(run_id: str) -> Path:
    p = run_dir(run_id) / "engineered.csv"
    if not p.exists():
        sync_reload()
    return p


def artifact_path(run_id: str, name: str) -> Path:
    p = run_dir(run_id) / name
    if not p.exists():
        sync_reload()
    return p


def write_json(run_id: str, name: str, payload: Any) -> Path:
    path = run_dir(run_id) / name
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    sync_commit()
    return path


def read_json(run_id: str, name: str) -> Any:
    path = artifact_path(run_id, name)
    if not path.exists():
        sync_reload()
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
    p = settings.storage_dir / "runs" / run_id
    if p.exists():
        return True
    sync_reload()
    return p.exists()
