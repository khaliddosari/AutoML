# AGENTS.md
## ModelForge - Agent Operating Manual

> **Source of truth:** [Docs/PRD.md](Docs/PRD.md). If anything in this file conflicts with the PRD, the PRD wins. Update the PRD first, then reflect changes here.

---

## 1. Mission & Scope

ModelForge is an LLM-orchestrated AutoML platform that ingests CSV datasets, trains two tiers of classical ML models (Regression, Classification - 5 candidates each), and uses Gemini to produce ranked, justified model recommendations.

Agents working in this repo MUST:
- Treat [Docs/PRD.md](Docs/PRD.md) as the canonical specification for product behavior, tiers, metrics, and constraints.
- Stay within v1 scope as defined in [Docs/PRD.md §10](Docs/PRD.md) - no deep learning, no time-series, no clustering, no text/image/audio.
- Defer to PRD §6 (Functional Requirements) for what to build, and §7 (Non-Functional Requirements) for how it must perform.

---

## 2. The Reasoning Agent Persona

The Gemini-backed reasoning agent is fully specified in [Docs/PRD.md §0](Docs/PRD.md). Summary for quick reference - **do not paraphrase into code; load from PRD**:

- Role: senior ML engineer reasoning over structured training results.
- Selects best model **per tier** based on provided metrics only - never on algorithm reputation.
- Produces: winner, 0–100 accuracy rating, 3–5 sentence justification, suggested diagrams.
- Tone: confident, technical, neutral.

**Hard constraints (from PRD §0):**
- Never fabricate metric values.
- Never recommend a model outside the tier's candidate list.
- Never claim a model is "production-ready."
- Output ONLY the JSON schema specified in the prompt - no prose, no markdown fences.

---

## 3. Tier Definitions

Authoritative tables live in [Docs/PRD.md §6.2](Docs/PRD.md). Agents must read from there when generating prompts, training code, or evaluation logic.

- **Tier 1 - Regression:** Linear, Ridge, Random Forest, XGBoost, SVR. Metrics: RMSE, MAE, R², MAPE.
- **Tier 2 - Classification:** Logistic, Decision Tree, Random Forest, XGBoost, KNN. Metrics: Accuracy, F1 (macro & weighted), Precision, Recall, ROC-AUC.

Diagrams per tier are listed in [Docs/PRD.md §6.5](Docs/PRD.md).

---

## 4. Tech Stack Boundaries

Full stack listed in [Docs/PRD.md §8](Docs/PRD.md). Agents MUST NOT introduce alternatives without updating the PRD first.

- **Frontend:** React 18 + TypeScript, Tailwind, shadcn/ui, Recharts/Plotly.js, Framer Motion - served by the Next.js app.
- **Backend (application layer):** Next.js (App Router) + TypeScript - API routes, server actions, auth, job dispatch. **No database** - run metadata, job state, and results are persisted as JSON artifacts in S3-compatible object storage (AWS S3 / Cloudflare R2; MinIO locally), keyed by a deterministic run ID (seed + dataset hash). **BullMQ + Redis** for async dispatch only (ephemeral queue state, not a source of truth).
- **ML worker (Python service):** Python 3.11+, FastAPI, **LangChain (Python)** as the orchestrator, Celery + Redis, scikit-learn, XGBoost, LightGBM, Pandas/NumPy, Matplotlib/Seaborn/Plotly, `langchain-openai` pointed at OpenRouter. Triggered by Next.js over an internal HTTP boundary; writes results back to object storage. **Current MVP slice (PRD §11a) lives under [`backend/`](backend/) and runs the Python worker standalone - Next.js is not wired in yet.**
- **LLM:** **OpenRouter** as the gateway; default model **`deepseek/deepseek-chat`** (swap to `deepseek/deepseek-r1` for heavier reasoning). Authenticated with `OPENROUTER_API_KEY`; configured via `base_url=https://openrouter.ai/api/v1` on `ChatOpenAI`. Prompt versioning under `prompts/v1/`, `prompts/v2/`, …
- **MLOps:** MLflow, DVC, GitHub Actions, Sentry.

Architectural rule: ML code (sklearn/XGBoost/LightGBM/Pandas) lives **only** in the Python worker. Next.js never imports or reimplements ML libraries - it calls the worker.

---

## 5. Data Handling & Privacy

Rules from [Docs/PRD.md §6.3 and §7](Docs/PRD.md):

- **Never** send full datasets to Gemini. Only schema, summary statistics, and metric tables leave the trusted boundary.
- Apply the **PII filter** (emails, phone numbers, IDs) before any LLM call.
- Encrypt datasets at rest.
- Token budget target: **< 50K tokens per dataset**; per-session Gemini cost target **< $0.50**.
- If a metric is missing, the reasoning agent must flag it explicitly - do not impute.

---

## 6. Output Contracts

- All Gemini responses are validated with **Pydantic** against the per-tier JSON schema (PRD §6.3).
- Winner records must include: model name, accuracy rating (0–100, normalized - see PRD §11 open question 4), 3–5 sentence justification, confidence band from CV variance, suggested diagrams.
- Exports defined in [Docs/PRD.md §6.6](Docs/PRD.md): PDF report, JSON results bundle, reproducibility manifest (seed, library versions, dataset hash).
- Reproducibility target: **same seed → same winner, 100%** (PRD §4).

---

## 7. Reliability & Performance Budgets

From [Docs/PRD.md §7](Docs/PRD.md) and §13 (Risks):

- Each tier completes in **≤ 10 min** on a 4 vCPU / 16 GB RAM worker.
- Async job queue with retry - **a single model failure must not kill the tier.**
- Per-model timeout enforced; progress streamed to the frontend.
- Datasets up to **1M rows / 200 columns** supported.
- Mandatory k-fold CV; warn the user when `n < 1000`.
- Confirm detected problem type with the user before training (mitigation for tier misdetection).

---

## 8. Skills

External skill packs live under [Skills/](Skills/). Agents should consult them before reinventing patterns covered there.

- **UI / UX design - [Skills/ui-ux-pro-max-skill-main/](Skills/ui-ux-pro-max-skill-main/):** authoritative reference for ModelForge's frontend look, feel, and interaction patterns. Use it whenever you are:
  - Designing or restyling React components (PRD §8 frontend stack: React 18 + TypeScript, Tailwind, shadcn/ui, Framer Motion).
  - Laying out screens for dataset upload, tier progress, winner cards, justification panels, or diagram galleries (PRD §6.1, §6.4, §6.5).
  - Producing micro-interactions, empty states, error states, or loading skeletons.
- Start from the skill's [CLAUDE.md](Skills/ui-ux-pro-max-skill-main/CLAUDE.md), [README.md](Skills/ui-ux-pro-max-skill-main/README.md), and [docs/](Skills/ui-ux-pro-max-skill-main/docs/) before writing UI code. Reuse its components in [src/](Skills/ui-ux-pro-max-skill-main/src/) rather than handcrafting equivalents.
- New skills added to [Skills/](Skills/) MUST be listed here with a one-line scope so agents know when to reach for them. Do not silently introduce a skill dependency without updating this block.
- Skill outputs are subordinate to [Docs/PRD.md](Docs/PRD.md). If a skill's pattern conflicts with the PRD, the PRD wins.

---

## 9. Working Agreements for Agents

When making changes in this repo:

1. **Read [Docs/PRD.md](Docs/PRD.md) first** - especially §0, §6, §7, and §10 - before proposing code.
2. **Stay in scope.** If a request implies out-of-scope work (PRD §10), surface it and ask before proceeding.
3. **Track open questions.** PRD §11 lists unresolved design decisions; do not silently resolve them - flag and ask.
4. **Respect milestones.** PRD §12 sequences M1 → M7; do not start downstream work that blocks on upstream phases unless explicitly authorized.
5. **Update the PRD when reality diverges.** If implementation forces a change to tiers, metrics, stack, or constraints, edit [Docs/PRD.md](Docs/PRD.md) in the same change set and bump its version line at the bottom.
6. **Never invent metrics or model behavior** in prompts, tests, or docs - pull from real training output.

---

_This file is a navigational layer over [Docs/PRD.md](Docs/PRD.md). It does not replace the PRD; it tells agents where to look and what rules are non-negotiable._
