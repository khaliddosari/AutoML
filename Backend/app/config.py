from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "deepseek/deepseek-v4-flash"
    openrouter_referer: str = "http://localhost:8000"
    openrouter_app_title: str = "ModelForge"

    storage_dir: Path = Path("./storage")
    log_level: str = "INFO"

    # Modal workspace username (visible in `modal app list` output). Used to
    # construct shared-inference endpoint URLs without shelling out. Set via
    # MODAL_WORKSPACE in .env. If unset, deploys fail with a clear error.
    modal_workspace: str = ""
    # Name of the deployed shared inference app — must match the `modal.App`
    # name in app/deploy/inference_app.py.
    modal_inference_app: str = "modelforge-inference"
    # Modal Volume that holds per-run model bundles. Created on first upload.
    modal_models_volume: str = "modelforge-models"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
