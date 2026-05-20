import json
import logging
import re

from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app import storage
from app.agent.tools import ALL_TOOLS
from app.config import settings

log = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are ModelForge's AutoML Reasoning Engine — a senior ML engineer
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
fabricate any numbers — only quote values that actually appeared in tool results.

When all six tools have run, return ONLY a JSON object with this exact shape (no
markdown fences, no extra prose):

{{
  "accuracy_score": <float, the score returned by train_model, rounded to 4 decimals>,
  "score_metric":   "<the score_metric string returned by train_model>",
  "problem_type":   "<regression or classification>",
  "plot_path":      "<plot_path returned by generate_visualization>",
  "justification":  "<3-5 sentences explaining why this model fits this data, what the score means in plain terms, and the main weakness or caveat. Reference actual numbers from the metrics.>"
}}

Hard rules:
- Never claim the model is 'production-ready'.
- Never invent metrics. If a tool errored, surface the error in justification.
- The justification must read for a data analyst, not a PhD. Confident, neutral tone.
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
        executor = _build_executor()
        result = executor.invoke({"run_id": run_id, "target": target})
        parsed = _extract_json(result.get("output", ""))

        metrics = storage.read_json(run_id, "metrics.json") or {}
        final = {
            "run_id": run_id,
            "status": "succeeded",
            "target": target,
            "problem_type": parsed.get("problem_type"),
            "accuracy_score": parsed.get("accuracy_score"),
            "score_metric": parsed.get("score_metric"),
            "plot_path": parsed.get("plot_path"),
            "justification": parsed.get("justification"),
            "model_name": metrics.get("model_name"),
            "extra": metrics.get("extra", {}),
        }
        storage.write_json(run_id, "result.json", final)
        storage.write_status(run_id, "succeeded")
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
