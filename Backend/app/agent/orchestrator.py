import json
import logging
import re

import pandas as pd

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app import storage
from app.agent.tools import ALL_TOOLS
from app.config import settings

log = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are نَمذِج's AutoML Reasoning Engine - a senior ML engineer
orchestrating a fixed pipeline of tools to deliver a ranked, justified model for a
user-supplied CSV. The user has already uploaded the dataset and selected a target
column. You must drive the pipeline by calling the provided tools in this exact order:

  1. profile_dataset(run_id)
  2. detect_problem_type(run_id, target)             -> reads problem_type
  3. run_eda(run_id, target)
  4. feature_engineer(run_id, target)
  5. train_model(run_id, target, problem_type)       -> reads score and score_metric
  6. generate_visualization(run_id, target, problem_type)

After every tool returns, briefly note the key facts from its JSON output. Do not
fabricate any numbers - only quote values that actually appeared in tool results.

When all six tools have run, return ONLY a JSON object with this exact shape (no
markdown fences, no extra prose):

{{
  "accuracy_score": <float, the score returned by train_model, rounded to 4 decimals>,
  "score_metric":   "<the score_metric string returned by train_model>",
  "problem_type":   "<regression or classification>",
  "plot_path":      "<plot_path returned by generate_visualization>",
  "justification":  "<1-2 sentences explaining why this model fits this data, what the score means in plain terms, and the main weakness or caveat. Keep it extremely brief, direct, and high-impact.>"
}}

Hard rules:
- Never claim the model is 'production-ready'.
- Never invent metrics. If a tool errored, surface the error in justification.
- The justification must read for a data analyst, not a PhD. Confident, neutral tone, and extremely brief (1-2 sentences).
"""

USER_PROMPT = """run_id: {run_id}
target: {target}

Drive the pipeline now and return the final JSON."""


def _extract_json(text: str) -> dict:
    if not text:
        raise ValueError("Empty agent output.")
    # Strip code fences if the model adds them despite instructions.
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise
        return json.loads(match.group(0))


def _build_executor() -> AgentExecutor:
    if not settings.openrouter_api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. Add it to backend/.env to enable the agent."
        )
    llm = ChatOpenAI(
        model=settings.openrouter_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=0.2,
        default_headers={
            "HTTP-Referer": settings.openrouter_referer,
            "X-Title": settings.openrouter_app_title,
        },
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", USER_PROMPT),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_tool_calling_agent(llm, ALL_TOOLS, prompt)
    return AgentExecutor(agent=agent, tools=ALL_TOOLS, verbose=False, max_iterations=12)


def run_agent(run_id: str, target: str) -> dict:
    storage.write_status(run_id, "running", target=target)
    try:
        log.info("Starting direct Python orchestration pipeline for run %s", run_id)

        # Load the raw dataset ONCE and thread the same in-memory frame through
        # every step that reads it (profile -> detect -> EDA -> feature_engineer),
        # instead of each step re-parsing dataset.csv from disk. These steps only
        # read the frame, so sharing one object is safe.
        raw_df = pd.read_csv(storage.dataset_path(run_id))

        # Step 1: profile_dataset(run_id)
        from app.pipeline import profile
        log.info("Direct pipeline: profiling dataset...")
        profile.profile_dataset(run_id, df=raw_df)

        # Step 2: detect_problem_type(run_id, target) -> reads problem_type
        from app.pipeline import detect
        log.info("Direct pipeline: detecting problem type...")
        detection = detect.detect_problem_type(run_id, target, df=raw_df)
        problem_type = detection.get("problem_type", "classification")

        # Step 3: run_eda(run_id, target)
        from app.pipeline import eda
        log.info("Direct pipeline: running EDA...")
        eda.run_eda(run_id, target, df=raw_df)

        # Step 4: feature_engineer(run_id, target) -> writes engineered.csv
        from app.pipeline import feature_engineering
        log.info("Direct pipeline: engineering features...")
        feature_engineering.feature_engineer(run_id, target, df=raw_df)

        # Load the engineered frame ONCE here, then hand the same object to
        # train_model AND every tuning trial, so the CV sweep and the fine-tuning
        # loop never re-read engineered.csv (previously 1 read in train + one per
        # tuning trial).
        engineered_df = pd.read_csv(storage.engineered_path(run_id))

        # Step 5: train_model(run_id, target, problem_type) -> reads score and score_metric
        from app.pipeline import train
        log.info("Direct pipeline: training model candidates...")
        metrics = train.train_model(run_id, target, problem_type, df=engineered_df)
        accuracy_score = metrics.get("score", 0.0)
        score_metric = metrics.get("score_metric", "accuracy")

        # Step 6: generate_visualization(run_id, target, problem_type)
        from app.pipeline import visualize
        log.info("Direct pipeline: generating plots...")
        viz_info = visualize.generate_visualization(run_id, target, problem_type)
        plot_path = viz_info.get("plot_path", "")

        # Trigger dynamic hyperparameter scanning and agentic justification loop!
        from app.agent.optimization import run_fine_tuning_loop
        log.info("Direct pipeline: running optimization fine-tuning loop...")
        optimized = run_fine_tuning_loop(
            run_id=run_id,
            target=target,
            problem_type=problem_type,
            baseline_results={
                "model_name": metrics.get("model_name"),
                "score": accuracy_score,
                "score_metric": score_metric,
                "extra": metrics.get("extra", {}),
            },
            df=engineered_df,
        )

        final = {
            "run_id": run_id,
            "status": "succeeded",
            "target": target,
            "problem_type": problem_type,
            "accuracy_score": optimized.get("score"),
            "score_metric": score_metric,
            "plot_path": plot_path,
            "justification": (
                (optimized.get("justification") or "").replace("—", "-").replace("–", "-")
                or f"{optimized.get('model_name', 'The champion model')} achieved the strongest "
                   f"cross-validation performance ({optimized.get('score', 0):.4f} {score_metric}) "
                   f"among all candidates and was selected as champion."
            ),
            "model_name": optimized.get("model_name"),
            "extra": optimized.get("extra", {}),
        }
        storage.write_json(run_id, "result.json", final)
        storage.write_status(run_id, "succeeded")
        log.info("Direct pipeline orchestration completed successfully for run %s!", run_id)
        return final
    except Exception as e:
        log.exception("Agent run failed for %s", run_id)
        err = {
            "run_id": run_id,
            "status": "failed",
            "target": target,
            "error": str(e),
        }
        storage.write_json(run_id, "result.json", err)
        storage.write_status(run_id, "failed", error=str(e))
        return err
