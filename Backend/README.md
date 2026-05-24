# ModelForge Backend (MVP Slice)

LangChain-orchestrated AutoML backend. See [../Docs/PRD.md](../Docs/PRD.md) for the full product spec and [../Docs/AGENTS.md](../Docs/AGENTS.md) for agent operating rules.

---
### For me
Backend:
cd "c:\Users\Khalid\Downloads\Coding Projects\AutoML\Backend"
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

Frontend:
cd "C:\Users\Khalid\Downloads\Coding Projects\AutoML\Frontend"
npm run dev

---

## What this slice does

End-to-end pipeline for a single CSV → single best model:

1. **Upload** - user POSTs a CSV; backend stores it and returns column list + preview.
2. **Target select** - user picks the target column.
3. **Agent run** - LangChain agent (DeepSeek via OpenRouter) drives a fixed tool sequence:
   1. `profile_dataset` - schema, dtypes, missing, uniques.
   2. `detect_problem_type` - inspects target → `regression` or `classification`.
   3. `run_eda` - numeric summary, target distribution, correlations.
   4. `feature_engineer` - drop high-missing & id-like cols, impute, encode categoricals.
   5. `train_model` - RandomForest (regressor or classifier) with 5-fold CV + 80/20 holdout.
   6. `generate_visualization` - predicted-vs-actual (regression) or confusion matrix (classification).
4. **Output** - accuracy score (R² for regression, accuracy for classification), one plot, and a 3–5 sentence justification.

This is the **M1–M2 vertical slice** from PRD §12, not the final v1. The full PRD still calls for 5 models per tier and richer Gemini reasoning.

## Run it

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # PowerShell:  .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # then edit and add your OPENROUTER_API_KEY
uvicorn app.main:app --reload --port 8000
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Health + LLM provider/model + whether OpenRouter is configured |
| `POST` | `/upload` (multipart `file`) | Upload CSV → returns `run_id`, columns, 5-row preview |
| `GET`  | `/runs/{run_id}/preview` | First 20 rows + column list |
| `POST` | `/runs/{run_id}/start` body `{"target": "..."}` | Kick off the agent in the background |
| `GET`  | `/runs/{run_id}/status` | Poll status: `uploaded` → `queued` → `running` → `succeeded`/`failed` |
| `GET`  | `/runs/{run_id}/result` | Final JSON: score, problem type, plot path, justification |
| `GET`  | `/runs/{run_id}/plot` | Returns the generated PNG |

### Example flow

```bash
curl -F file=@iris.csv http://localhost:8000/upload
# { "run_id": "abc123...", "columns": [...], "preview": [...] }

curl -X POST http://localhost:8000/runs/abc123.../start \
     -H "Content-Type: application/json" \
     -d '{"target":"species"}'

curl http://localhost:8000/runs/abc123.../status
curl http://localhost:8000/runs/abc123.../result
curl http://localhost:8000/runs/abc123.../plot -o plot.png
```

## Layout

```
backend/
  app/
    main.py                       FastAPI routes
    config.py                     env-driven settings
    schemas.py                    Pydantic models
    storage.py                    local filesystem object store (./storage/runs/<run_id>/)
    pipeline/
      profile.py                  schema profile
      detect.py                   problem-type detection from target
      eda.py                      EDA summary
      feature_engineering.py      drop / impute / encode
      train.py                    RandomForest + CV + holdout
      visualize.py                predicted-vs-actual or confusion matrix
    agent/
      tools.py                    @tool wrappers around each pipeline step
      orchestrator.py             LangChain tool-calling agent + system prompt
  requirements.txt
  .env.example
  README.md
```

## Per-run artifacts

Every run produces these files under `storage/runs/<run_id>/`:

- `dataset.csv` - original upload
- `engineered.csv` - after feature engineering
- `profile.json`, `detection.json`, `eda.json`, `feature_engineering.json`, `metrics.json`, `visualization.json`
- `plot.png` - the result graph
- `status.json` - current lifecycle state
- `result.json` - final agent output (score + justification + plot path)
- `y_test.npy`, `y_pred.npy` - held-out predictions for the plot

## Deploying inference to Modal (shared app)

The "Deploy" button on the result page uploads each trained model to a single
shared Modal app (`modelforge-inference`), instead of creating a brand new app
per run. This keeps Modal's free tier viable when many people use the project:

- One image build (cached after first deploy), not one per upload.
- One deployment slot used forever, not one per upload.
- Models live in a `modelforge-models` Modal Volume — uploading a new one is
  just a file copy, no `modal deploy` per run.

### One-time setup (do this once per workspace)

1. `pip install modal` and `modal token new` if you haven't already.
2. Add two lines to `Backend/.env`:

   ```
   MODAL_WORKSPACE=your-modal-username
   ```

   Find it by running `modal app list` — it's the workspace name shown at the
   top, or the prefix of any existing app URL (`{workspace}--…modal.run`).

3. Deploy the shared inference app **once**:

   ```bash
   modal deploy app/deploy/inference_app.py
   ```

   Modal builds the image (sklearn + pandas + fastapi pinned to the versions
   in `IMAGE_PIN`) and registers the `modelforge-inference` app. Subsequent
   user "Deploy" clicks just upload model files into the shared volume — no
   image build, no new app.

### When to re-deploy `inference_app.py`

Only when:
- You bump a pinned library version in `IMAGE_PIN` (must match the training
  environment so unpickled models load cleanly).
- You change the `Predictor` class (new endpoint, new preprocessing, etc.).

Per-user model updates don't need a re-deploy.

### URL shape

After deploy, prediction and schema endpoints look like:

```
https://{MODAL_WORKSPACE}--modelforge-inference-predictor-predict.modal.run/?run_id=<id>
https://{MODAL_WORKSPACE}--modelforge-inference-predictor-schema.modal.run/?run_id=<id>
```

The FastAPI backend proxies `/runs/<id>/predict` to these, so the frontend
never has to know the URL or worry about CORS.

## Notes & known gaps

- **No object storage yet.** Storage is local filesystem. The interface in `storage.py` is the seam to swap in S3/R2 later.
- **No PII filter yet** (PRD §6.3 / §7). Add before sending anything from the dataset itself to the LLM - currently only metric numbers and schema flow to OpenRouter.
- **Single model per type.** PRD calls for 5 candidates per tier; this slice ships RandomForest as the default to keep the loop end-to-end runnable.
- **In-process background tasks**, not Celery/BullMQ. Swap later when concurrency matters.
