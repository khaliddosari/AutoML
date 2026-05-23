# Product Requirements Document (PRD)
## LLM-Orchestrated AutoML Pipeline

> **Working title:** _ModelForge_ - an LLM-driven AutoML tool that turns CSV uploads into ranked, justified ML models across two learning paradigms.

---

## 0. Persona
You are ModelForge's AutoML Reasoning Engine - a senior machine learning engineer with deep expertise in classical ML, model evaluation, and explainability. Your job is to reason over training results produced by the ModelForge pipeline and deliver clear, defensible model recommendations to users who may not have a formal ML background.
Your responsibilities:

Analyze structured dataset profiles (schema, statistics, target distribution) and per-model evaluation metrics.
Select the best-performing model in the given tier based on the metrics provided - not on prior reputation of the algorithm.
Produce a concise justification (3–5 sentences) explaining why the chosen model won, what about the data made it win, and what its likely weaknesses are.
Assign a normalized accuracy rating from 0–100 that reflects real-world reliability, not just the raw metric value.
Recommend the most informative diagrams to support the justification.

How you communicate:

Be precise. Use the actual numbers from the metrics table; never invent or round aggressively.
Be honest about uncertainty. If two models perform within noise of each other, say so and explain the tradeoff.
Be readable. Write for a data analyst, not a PhD. Avoid jargon unless you immediately define it.
Be brief. No filler, no hedging language ("it could be argued that…"), no apologies.

Hard constraints:

You only reason over the structured inputs provided in the prompt. You never assume facts about the dataset that aren't given.
You never fabricate metric values. If a value is missing, flag it explicitly.
You always return output in the JSON schema specified in the prompt - no prose outside the schema, no markdown code fences around the JSON.
You never recommend a model that wasn't in the candidate list for the tier.
You never claim the winning model is "production-ready" - only that it is the best of the five candidates for this dataset.

Tone: confident, technical, neutral. You are an evaluator, not a salesperson.

---

## 1. Overview

ModelForge is a web-based AutoML platform that automates the model selection workflow by combining classical ML training with an **LLM (DeepSeek via OpenRouter)** as the orchestration and reasoning layer. Users upload one or more CSV datasets, and the system:

1. Profiles the data and detects the problem type.
2. Runs **2 model tiers** - Regression and Classification - with **5 candidate models per tier**.
3. Selects the **best model per tier** based on tier-specific metrics.
4. Uses the LLM to generate an **accuracy rating, natural-language justification, and supporting diagrams** for each winner.

The product targets users who need fast, defensible model selection without writing ML pipelines from scratch - students, analysts, junior data scientists, and product teams prototyping AI features.

---

## 2. Problem Statement

Selecting the right ML model today still requires:

- **Domain expertise** to know which algorithms suit which data shape.
- **Engineering time** to set up training, evaluation, and visualization for each candidate.
- **Communication overhead** to justify model choices to stakeholders who don't read sklearn docs.

Existing AutoML tools (Auto-sklearn, H2O AutoML, Google Vertex AutoML) solve the training automation problem but ship results as raw metrics tables. They don't **explain** why a model won, and they don't bridge ML output to business reasoning.

**The gap:** users get a "best model" but no narrative, no confidence framing, and no decision-ready artifacts.

---

## 3. Context & Background

- **AutoML demand is rising** as organizations adopt ML faster than they can hire ML engineers.
- **LLMs can now reason about structured ML results** with high reliability when given metrics, dataset summaries, and visual context.
- **Saudi market alignment**: Vision 2030's data-driven government initiatives (Elm, SITE, NCGR) create demand for explainable AI tooling that non-ML staff can operate.
- **OpenRouter + DeepSeek specifically** is attractive because OpenRouter gives a single, swappable gateway across providers, and DeepSeek offers strong reasoning quality at a low per-token cost - keeping per-session LLM spend well under target.

This product sits at the intersection of **AutoML, LLM orchestration, and MLOps** - three trends compounding into a single workflow.

---

## 4. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Fast time-to-result | Upload → first model winner | < 10 min |
| Trustworthy justifications | User rating of LLM justification | ≥ 4 / 5 |
| Multi-dataset workflow | Datasets processed per session | ≥ 3 |
| Reproducibility | Re-run produces same winner | 100% (with same seed) |
| API cost efficiency | LLM tokens per dataset | < 50K |

---

## 5. Target Users

- **Data analysts** who can clean data but don't write training loops.
- **CS / DS students** learning model comparison.
- **Product managers** wanting quick ML feasibility prototypes.
- **Researchers** needing baseline comparisons before publishing.

---

## 6. Functional Requirements

### 6.1 Dataset Ingestion
- Multi-CSV upload (drag-and-drop, up to 10 files per session).
- Automatic schema detection (column types, missing values, cardinality).
- Data preview (first 100 rows).
- Target column selection per dataset.
- Optional: problem-type override (regression / classification).

### 6.2 Two-Tier Model System

#### Tier 1 - Regression (continuous targets)
| # | Model | Library |
|---|-------|---------|
| 1 | Linear Regression | scikit-learn |
| 2 | Ridge Regression | scikit-learn |
| 3 | Random Forest Regressor | scikit-learn |
| 4 | XGBoost Regressor | xgboost |
| 5 | Support Vector Regression (SVR) | scikit-learn |

**Metrics:** RMSE, MAE, R², MAPE.

#### Tier 2 - Classification (categorical targets)
| # | Model | Library |
|---|-------|---------|
| 1 | Logistic Regression | scikit-learn |
| 2 | Decision Tree Classifier | scikit-learn |
| 3 | Random Forest Classifier | scikit-learn |
| 4 | XGBoost Classifier | xgboost |
| 5 | K-Nearest Neighbors | scikit-learn |

**Metrics:** Accuracy, F1 (macro & weighted), Precision, Recall, ROC-AUC.

### 6.3 LLM Orchestration Layer
- **Provider:** **OpenRouter** as a single gateway across model providers. Default model **`deepseek/deepseek-chat`** (swap to `deepseek/deepseek-r1` for heavier reasoning). Authenticated via `OPENROUTER_API_KEY`; accessed through `langchain-openai`'s `ChatOpenAI` pointed at `https://openrouter.ai/api/v1`.
- **Orchestrator:** **LangChain** tool-calling agent. Each pipeline step (profile, detect, EDA, FE, train, visualize) is exposed as a `@tool`; the LLM decides invocation order within the prompt's constraints.
- **Prompt templates** per tier with structured JSON output schema, validated by Pydantic.
- **Input to the LLM:** dataset profile (column stats, target type, row count), per-model metrics, plot file references - never raw rows.
- **Output from the LLM:** chosen winner, accuracy rating (0–100), 3–5 sentence justification, suggested next steps. No prose outside the schema, no markdown fences.
- **Token budgeting:** dataset never sent in full - only schema, summary statistics, and metric tables.
- **Attribution headers:** every OpenRouter call sets `HTTP-Referer` and `X-Title` so usage is traceable on the OpenRouter dashboard.
- **PII filter** before any LLM call.

### 6.4 Best-Model Selection
For each tier, the system returns:
- Winning model name
- Accuracy rating (0–100, normalized across tier metrics)
- LLM-generated justification (why this model, what it captures, what its weaknesses are)
- Confidence band (based on cross-validation variance)

### 6.5 Supporting Diagrams
Auto-generated per tier:

**Regression:**
- Predicted vs Actual scatter
- Residual plot
- Feature importance (for tree models)

**Classification:**
- Confusion matrix
- ROC curve
- Precision-Recall curve
- Feature importance

**Cross-tier:**
- Model comparison bar chart
- Training time vs accuracy scatter

### 6.6 Export
- PDF report (winner + justification + diagrams per tier).
- JSON results bundle (for programmatic consumption).
- Reproducibility manifest (seed, library versions, dataset hash).

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Each tier completes in ≤ 10 min on a standard cloud worker (4 vCPU, 16 GB RAM). |
| **Scalability** | Support datasets up to 1M rows / 200 columns. |
| **Security** | Datasets encrypted at rest; only schema + summaries leave the trusted boundary to the LLM. |
| **Privacy** | PII detection (emails, phone numbers, IDs) masked before LLM prompts. |
| **Reliability** | Async job queue with retry; no single model failure should kill the tier. |
| **Cost** | Per-session LLM cost target < $0.50. |

---

## 8. Tech Stack

### Frontend
- **React 18 + TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Recharts** / **Plotly.js** - interactive charts
- **Framer Motion** - micro-interactions

### Backend (Application Layer)
- **Next.js (App Router) + TypeScript** - API routes, server actions, session/auth, request orchestration
- **No database.** Run metadata, job state, and results are persisted as JSON artifacts in object storage alongside the datasets and diagrams they describe. Each run is keyed by a deterministic run ID (seed + dataset hash).
- **BullMQ + Redis** - async job queue dispatched from Next.js API routes (Redis used for ephemeral queue state only, not as a source of truth).
- **Object storage** (S3-compatible - AWS S3 or Cloudflare R2) - datasets, generated diagrams, run manifests, metric JSON, PDF exports.
- Hosts the React frontend (same Next.js app serves UI + API)

### ML Worker (Python Service)
- **Python 3.11+**
- **FastAPI** - internal REST endpoints called by the Next.js backend
- **Celery + Redis** _or_ a BullMQ consumer bridge - executes training jobs queued by Next.js
- **scikit-learn** - regression + classification
- **XGBoost**, **LightGBM** - boosted trees
- **Pandas**, **NumPy** - data handling
- **Matplotlib**, **Seaborn**, **Plotly** - diagram generation
- **langchain-openai** (pointed at OpenRouter) - LLM client for DeepSeek
- Communicates with Next.js over an internal HTTP boundary; writes results back to object storage

### Infrastructure
- **Docker** + **Docker Compose** - local dev (Next.js, Python worker, Redis, MinIO for object-storage emulation)
- **AWS** (ECS / Fargate) or **GCP** (Cloud Run) - deployment, one service per container
- **Cloudflare** - CDN + edge

### LLM Layer
- **OpenRouter** as the LLM gateway - single API key, swappable model IDs.
- Default model: **DeepSeek via OpenRouter** (`deepseek/deepseek-chat` for fast tiers, `deepseek/deepseek-r1` available for heavier reasoning).
- Accessed through `langchain-openai`'s `ChatOpenAI` with `base_url=https://openrouter.ai/api/v1`.
- **Pydantic** - structured output validation
- Prompt versioning under `prompts/v1/`, `prompts/v2/`, etc.

### MLOps
- **MLflow** - experiment tracking per run
- **DVC** - dataset versioning
- **GitHub Actions** - CI/CD
- **Sentry** - error tracking

---

## 9. Skills Required to Build

| Area | Skill |
|------|-------|
| **Core ML** | scikit-learn pipelines, model evaluation, cross-validation, metric selection |
| **LLM Engineering** | Prompt design, structured JSON outputs, token budgeting, OpenRouter / OpenAI-compatible APIs |
| **Backend (App)** | Next.js (App Router), TypeScript, API routes, server actions, BullMQ, object-storage-backed persistence |
| **ML Worker** | Python, FastAPI, async patterns, Celery, internal REST design |
| **Frontend** | React 18, TypeScript, Tailwind, shadcn/ui, charting libraries |
| **Data Engineering** | CSV parsing at scale, schema inference, PII detection |
| **MLOps** | MLflow tracking, Docker, CI/CD, environment reproducibility |
| **Cloud** | AWS or GCP container deployment, object storage |
| **Visualization** | Matplotlib/Plotly for static diagrams, Recharts for interactive |
| **Security** | Encryption at rest, secret management, input sanitization |

---

## 10. Out of Scope (v1)

- Deep learning models (CNN, RNN, Transformer) - defer to v2.
- Time-series-specific tier (ARIMA, Prophet, LSTM) - defer to v2.
- Reinforcement learning - not a fit for static CSV input.
- Clustering / unsupervised tier - defer to v2.
- Text / image / audio data - tabular only in v1.
- Custom model upload by users.
- Multi-user real-time collaboration on a dataset.
- Fine-tuning any LLM.

---

## 11. Open Questions & Design Considerations

1. **Tier auto-selection vs. user choice** - should the system always run both tiers, or detect the appropriate one from the target column? _Recommendation:_ auto-detect with manual override.

2. **LLM cost management** - at what dataset size do we summarize more aggressively before prompting?

3. **Reproducibility vs speed** - fixed seeds make results comparable but slower (no parallel hyperparameter search).

4. **Confidence calibration** - the 0–100 accuracy rating should not just be the raw metric. Define a normalization function per tier (e.g., R² for regression, balanced accuracy for classification).

5. **Imbalanced classification handling** - should the classification tier auto-apply SMOTE / class weights, or surface this as a user choice?

---

## 11a. MVP Vertical Slice (current build target)

Before the full 5-models-per-tier v1, the team is building a single end-to-end slice to validate the LangChain → Python → output loop. This slice lives under `backend/` and:

- Uses **LangChain (Python)** inside the FastAPI ML worker as the orchestrator. Next.js is **not** part of this slice.
- Exposes upload → preview → start-run → status → result endpoints.
- Runs one agent that drives a fixed tool sequence: `profile_dataset` → `detect_problem_type` → `run_eda` → `feature_engineer` → `train_model` → `generate_visualization`.
- Ships **one model per problem type** (RandomForest) - not the full 5 candidates. Metric: R² for regression, accuracy for classification.
- Produces a single accuracy score + one plot (predicted-vs-actual or confusion matrix) + a 3–5 sentence LLM-written justification.
- Persists artifacts to local filesystem (`./storage/runs/<run_id>/`) behind the storage interface that will later swap to S3/R2.

Scope this slice **must not** expand into without a PRD update: multi-model tiers, PDF export, Next.js layer, full §6.5 diagram set, MLflow tracking.

---

## 12. Milestones (Suggested)

| Phase | Scope | Duration |
|-------|-------|----------|
| **M1** | Backend skeleton, CSV upload, dataset profiling | 2 weeks |
| **M2** | Regression tier end-to-end (5 models + diagrams) | 2 weeks |
| **M3** | Classification tier end-to-end (5 models + diagrams) | 2 weeks |
| **M4** | LLM integration + justification pipeline | 2 weeks |
| **M5** | Frontend MVP | 3 weeks |
| **M6** | MLflow tracking, PDF export, polish | 2 weeks |
| **M7** | Deployment + cost monitoring | 1 week |

**Total v1 estimate:** ~14 weeks for a solo builder, ~7 weeks for a team of three.

---

## 13. Risks

| Risk | Mitigation |
|------|------------|
| LLM cost spikes on large datasets | Aggressive summarization, token caps, per-user quotas |
| Long training times kill UX | Async queue + progress streaming + per-model timeout |
| Justifications hallucinate metrics | Pass numeric metrics into prompts as structured facts; validate JSON output schema |
| Model overfitting on small datasets | Mandatory k-fold CV; warn users when n < 1000 |
| Tier misdetection (regression vs classification) | Confirm detected problem type with user before training |

---

_Document version: 0.7 - §6.3 rewritten to explicitly document OpenRouter + DeepSeek + LangChain orchestrator; loosened backend dependency pins to resolvable ranges._
