# Namtheg: LangChain-Orchestrated AutoML 🛠️

Namtheg is a premium, end-to-end agentic AutoML platform. It automates the entire machine learning pipeline—from raw CSV upload, profiling, target selection, and feature engineering to model training, evaluation plotting, and instant serverless API deployment.

Driven by a **LangChain agentic brain (DeepSeek via OpenRouter)** and equipped with tailored Python execution tools, Namtheg makes training and deploying custom ML models a seamless, single-click experience.

---

## 🏗️ Architecture & Monorepo Layout

This repository is structured as a modern monorepo separating frontend UI from backend execution:

```
├── Backend/                 # Python FastAPI Backend
│   ├── app/
│   │   ├── agent/           # LangChain Tool-calling Orchestrator & System Prompts
│   │   ├── pipeline/        # Core pipeline steps (Profiling, Feature Engineering, Training, Visualization)
│   │   ├── deploy/          # Modal serverless deployment logic
│   │   ├── storage.py       # Local file-based run manager
│   │   └── main.py          # FastAPI application routes
│   ├── requirements.txt     # Backend Python dependencies
│   └── .env.example         # Example local backend environment variables
│
├── Frontend/                # Next.js 15 Frontend
│   ├── app/                 # Next.js App Router (Upload, Preview, Running, Result, Inference UI)
│   ├── components/          # Reusable UI component library (TailwindCSS + Framer Motion)
│   ├── lib/                 # Frontend API client library
│   ├── package.json         # Node.js dependencies and scripts
│   ├── vercel.json          # Vercel build config (set Root Directory to Frontend)
│   └── .env.local.example   # Example local frontend environment variables
│
├── Docs/                    # Product specs and agent rules
│   ├── PRD.md               # Product Requirements Document
│   ├── DEPLOYMENT.md        # Vercel + Render + Modal deployment guide
│   └── AGENTS.md            # Agent Operational guidelines
│
├── render.yaml              # Render Blueprint config (backend only)
└── insurance.csv            # Sample dataset for demonstration
```

---

## 🧠 LangChain AutoML Pipeline Flow

When you select a target column and click **Start AutoML**, Namtheg kicks off a stateful LangChain agent that executes the following specialized tools sequentially:

1. **`profile_dataset`**: Inspects schemas, missing values, distinct values, and data types.
2. **`detect_problem_type`**: Auto-detects whether the task is `regression` or `classification` based on the target column cardinality and datatype.
3. **`run_eda`**: Computes descriptive statistics, target distribution characteristics, and feature-target correlations.
4. **`feature_engineer`**: Dynamically drops high-missing or high-cardinality ID columns, imputes missing values (median/mode), and encodes categorical columns.
5. **`train_model`**: Trains a Random Forest (Regressor or Classifier) with a 5-fold Cross-Validation + 80/20 holdout split.
6. **`generate_visualization`**: Generates a Predicted-vs-Actual scatter plot (regression) or Confusion Matrix heatmap (classification).
7. **Justification**: DeepSeek reviews all metrics and writes a highly structured 3-5 sentence analysis explaining model performance.

---

## 🚀 Local Quickstart

### 1. Prerequisites
- **Python 3.10+** installed
- **Node.js 18+** installed

---

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd Backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure your environment variables:
   ```bash
   copy .env.example .env
   ```
   Open `.env` and fill in:
   - `OPENROUTER_API_KEY`: Get one from [OpenRouter](https://openrouter.ai/).
   - `MODAL_WORKSPACE`: Your Modal username.

5. Start the backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set up local environment variables:
   ```bash
   copy .env.local.example .env.local
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with the UI.

---

## 🌐 Deploying to Production

Namtheg is fully ready for multi-tier production deployment:

Full instructions live in **[Docs/DEPLOYMENT.md](Docs/DEPLOYMENT.md)**. In short:

### 1. FastAPI backend on Render
A pre-configured **Render Blueprint** (`render.yaml`) is located in the root. When pushed to GitHub and connected to Render:
- It provisions the FastAPI backend as a free web service.
- Environment variables (`OPENROUTER_API_KEY`, `MODAL_TOKEN_ID`, etc.) are securely requested during setup.

### 2. Next.js frontend on Vercel
Import the repo at [vercel.com/new](https://vercel.com/new), **set the Root Directory to `Frontend`**, and add `BACKEND_URL` (your Render backend's public URL) plus `NEXT_PUBLIC_SITE_URL`. The frontend proxies the browser's calls to the backend through its own `/api/backend/*` rewrite, so there is no CORS setup.

> **Why not both on Render?** Render's 750 free instance-hours are pooled *per workspace*, not per service. Two always-on free services burn ~1,460 h/month, exhausting the pool around day 15 — at which point Render suspends *every* free service until the 1st. Splitting the frontend onto Vercel keeps the backend under the cap all month. Don't add a second `plan: free` service to `render.yaml`.

### 3. Serverless Predictors on Modal
When a user clicks "Deploy to Modal" on their successfully trained model:
- The backend leverages **Modal** serverless volumes (`namtheg-models`) and the shared app (`namtheg-inference`).
- **Zero-cold-start uploads**: The model is saved directly to a mounted persistent volume rather than redeploying containers.
- Interactive serverless prediction endpoints are served dynamically!

#### One-Time Modal Setup:
Ensure you deploy the core serverless inference wrapper once to your Modal space:
```bash
cd Backend
pip install modal
modal token new
modal deploy app/deploy/inference_app.py
```

---

## 📄 License

Copyright (c) 2026 Khalid. **All Rights Reserved.** See [LICENSE](LICENSE).

This project is source-available for viewing only. No use, copying, modification, or distribution is permitted without prior written permission from the copyright holder.
