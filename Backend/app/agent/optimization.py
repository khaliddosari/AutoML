import json
import logging
import re
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.config import settings
from app.pipeline.train import train_champion_with_params, _feature_importances, save_model_bundle
from app import storage

log = logging.getLogger(__name__)


def _get_llm():
    return ChatOpenAI(
        model=settings.openrouter_model,
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        temperature=0.2,
        default_headers={
            "HTTP-Referer": settings.openrouter_referer,
            "X-Title": settings.openrouter_app_title,
        },
    )


OPTIMIZER_PROMPT = """You are نَمذِج's AutoML Hyperparameter Fine-Tuning Agent.
Your goal is to optimize hyperparameters for the champion model '{champion_model}' to maximize prediction '{metric}'.
The task is {problem_type}.

Current best score achieved so far: {best_score}
Hyperparameters that achieved this best score: {best_params}

History of attempted runs:
{history}

Based on the run history, suggest a NEW set of hyperparameters to try.
Here are the valid hyperparameters you can suggest for the model '{champion_model}':
{allowed_params}

Suggest the parameters in standard JSON. Provide EXACTLY a JSON block. No markdown code fences, no extra text.
Return ONLY this JSON shape:
{{
  "parameters": {{
     "<param_name>": <value>,
     ...
  }},
  "reasoning": "<1-2 sentences explaining why this configuration will improve accuracy or prevent overfitting based on previous trial outcomes>",
  "stop_tuning": <true or false. Set to true if you believe no further improvements can be found or you have reached a plateau>
}}
"""

ALLOWED_PARAMS = {
    "RandomForest": "- n_estimators: integer between 10 and 300\n- min_samples_split: integer between 2 and 15\n- max_depth: integer between 3 and 25, or null",
    "ExtraTrees": "- n_estimators: integer between 10 and 300\n- max_depth: integer between 3 and 25, or null",
    "GradientBoosting": "- n_estimators: integer between 10 and 250\n- learning_rate: float between 0.01 and 0.3\n- max_depth: integer between 2 and 8",
    "LogisticRegression": "- C: float between 0.01 and 50.0",
    "Ridge": "- alpha: float between 0.01 and 50.0",
    "KNN": "- n_neighbors: integer between 2 and 20\n- weights: string, either 'uniform' or 'distance'"
}

JUSTIFICATION_PROMPT = """You are نَمذِج's AutoML Champion Architect.
You have just run an agentic fine-tuning optimization loop that searched for the best model configuration.
Please write an extremely brief, premium and punchy 1-2 sentence "Explainable AI Justification" for the results. Keep it as brief and high-impact as possible.

Champion Model: {champion_model}
Problem Type: {problem_type}
Target Column: {target}
Metric: {metric}
Starting Baseline Score: {baseline_score}
Best Optimized Score Reached: {best_score}
Optimal Hyperparameters Selected: {best_params}

Tuning Process History details:
{history}

In the justification, explain:
1. Why this champion model won and the benefit of the optimal hyperparameters selected by the نَمذِج reasoning engine.
2. A very brief, plain-english explanation of the performance improvement, including one key real-world caveat (e.g., sensitive to rare outliers).

Write in a neutral, confident, and extremely concise professional tone suitable for a data analyst or business leader. Keep it strictly to 1-2 sentences maximum.
Do not use markdown fences or mention 'agent', 'LangChain' directly-focus on 'نَمذِج reasoning engine' or 'agentic optimization'.
"""


def clean_json_text(text: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise
        return json.loads(match.group(0))


def run_fine_tuning_loop(run_id: str, target: str, problem_type: str, baseline_results: dict) -> dict:
    champion_model = baseline_results.get("model_name", "Best Model")
    metric = baseline_results.get("score_metric", "accuracy")
    extra = baseline_results.get("extra", {})

    # IMPORTANT: select by CV mean, not held-out test score. Reusing the same
    # 20% test set across N trials and picking the highest-scoring config is
    # textbook leakage - it biases the reported metric upward by selecting for
    # quirks of that specific split. CV mean keeps the held-out set genuinely
    # held out. We preserve the test score in extra["test_score"] as a sanity
    # check the user can still see.
    cv_key = "cv_accuracy_mean" if metric == "accuracy" else "cv_r2_mean"
    test_score = baseline_results.get("score", 0.0)
    baseline_score = extra.get(cv_key, test_score)
    extra["test_score"] = test_score
    baseline_results["extra"] = extra
    baseline_results["score"] = baseline_score
    baseline_results["accuracy_score"] = baseline_score

    # If the OPENROUTER key is not configured, fallback to standard results with a nice note
    if not settings.openrouter_api_key:
        log.warning("OPENROUTER_API_KEY not set. Skipping agentic fine-tuning loop.")
        return baseline_results

    try:
        llm = _get_llm()

        # Initial best = the baseline's CV mean. Trials must beat that on CV too.
        best_score = baseline_score
        best_test_score = test_score
        best_params = {}
        best_train_score = extra.get("train_accuracy" if metric == "accuracy" else "train_r2", baseline_score)

        history = [
            {"trial": 0, "parameters": "Baseline Settings", "score": baseline_score, "result": "Champion baseline (CV mean)"}
        ]
        
        max_loops = 3
        current_best_model_data = None
        
        allowed_params_text = ALLOWED_PARAMS.get(champion_model, "- No adjustable parameters available.")
        
        for i in range(1, max_loops + 1):
            history_text = "\n".join([
                f"- Trial {h['trial']}: Params={h['parameters']}, Score={h['score']:.4f} ({h['result']})"
                for h in history
            ])
            
            prompt_text = OPTIMIZER_PROMPT.format(
                champion_model=champion_model,
                metric=metric,
                problem_type=problem_type,
                best_score=best_score,
                best_params=json.dumps(best_params),
                history=history_text,
                allowed_params=allowed_params_text
            )
            
            response = llm.invoke(prompt_text)
            parsed = clean_json_text(response.content)
            
            suggested_params = parsed.get("parameters", {})
            reasoning = parsed.get("reasoning", "Exploring hyperparameters.")
            stop_tuning = parsed.get("stop_tuning", False)
            
            if not suggested_params or stop_tuning:
                log.info("Agent decided to stop fine-tuning.")
                break
                
            log.info("Tuning loop %d: Trying parameters %s for %s", i, suggested_params, champion_model)
            
            try:
                # Train model with suggested parameters
                trial_res = train_champion_with_params(
                    run_id=run_id,
                    target=target,
                    problem_type=problem_type,
                    model_name=champion_model,
                    params=suggested_params
                )

                # Compare on CV mean to keep the held-out test set unseen during
                # selection. test_score is logged for transparency only.
                score = trial_res["cv_mean"]
                trial_test = trial_res["test_score"]
                improvement = score - best_score

                if score > best_score:
                    best_score = score
                    best_test_score = trial_test
                    best_params = suggested_params
                    best_train_score = trial_res["train_score"]
                    current_best_model_data = trial_res
                    result_desc = (
                        f"New champion! CV +{improvement:.4f} "
                        f"(CV={score:.4f}, holdout={trial_test:.4f}). Reason: {reasoning}"
                    )
                else:
                    result_desc = (
                        f"No improvement (CV={score:.4f}, holdout={trial_test:.4f}). "
                        f"Reason: {reasoning}"
                    )
                history.append({"trial": i, "parameters": json.dumps(suggested_params), "score": score, "result": result_desc})
            except Exception as e:
                log.error("Trial %d failed: %s", i, e)
                history.append({"trial": i, "parameters": json.dumps(suggested_params), "score": best_score, "result": f"Error during training: {str(e)}"})
        
        # Now, run the justification chain
        history_summary = "\n".join([
            f"- Trial {h['trial']}: {h['parameters']} => Score: {h['score']:.4f} ({h['result']})"
            for h in history
        ])
        
        justification_prompt = JUSTIFICATION_PROMPT.format(
            champion_model=champion_model,
            problem_type=problem_type,
            target=target,
            metric=metric,
            baseline_score=baseline_score,
            best_score=best_score,
            best_params=json.dumps(best_params) if best_params else "Baseline parameters",
            history=history_summary
        )
        
        justification_res = llm.invoke(justification_prompt)
        justification = justification_res.content.strip()
        
        # Persist the tuning trial log regardless of whether a better model was
        # found — the UI shows it as a before/after card, and "we tried these and
        # none beat the baseline" is a real result worth surfacing.
        if len(history) > 1:
            extra_persist = baseline_results.get("extra", {})
            extra_persist["tuning_trials"] = history
            baseline_results["extra"] = extra_persist

        # If we successfully optimized and found a better model, update the metrics and assets!
        if current_best_model_data:
            import numpy as np
            best_model = current_best_model_data["model"]
            feature_cols = current_best_model_data["feature_cols"]
            preds = current_best_model_data["preds"]
            y_test = current_best_model_data["y_test"]
            
            # Save final best model outputs
            np.save(storage.run_dir(run_id) / "y_test.npy", np.asarray(y_test))
            np.save(storage.run_dir(run_id) / "y_pred.npy", preds)
            
            # Update metric dictionaries
            extra_metrics = baseline_results.get("extra", {})
            extra_metrics["top_features"] = _feature_importances(best_model, feature_cols)
            
            if metric == "accuracy":
                extra_metrics["train_accuracy"] = best_train_score
                extra_metrics["cv_accuracy_mean"] = current_best_model_data["cv_mean"]
                extra_metrics["f1_macro"] = current_best_model_data["f1_macro"]
            else:
                extra_metrics["train_r2"] = best_train_score
                extra_metrics["cv_r2_mean"] = current_best_model_data["cv_mean"]
                extra_metrics["rmse"] = current_best_model_data["rmse"]
                extra_metrics["mae"] = current_best_model_data["mae"]
            
            extra_metrics["overfit_gap"] = round(best_train_score - best_score, 4)
            # test_score = held-out accuracy of the winning config (CV-selected).
            # Kept as a sanity check: if it diverges sharply from cv_mean, the
            # CV folds are misleading and the model isn't generalizing.
            extra_metrics["test_score"] = best_test_score
            extra_metrics["tuning_trials"] = history
            
            # Generate new visualization with optimized model
            from app.pipeline import visualize
            visualize.generate_visualization(run_id, target, problem_type)
            
            final_metrics = {
                "model_name": champion_model,
                "score": best_score,
                "score_metric": metric,
                "extra": extra_metrics
            }
            storage.write_json(run_id, "metrics.json", final_metrics)

            # Overwrite the baseline bundle with the optimized winner so /deploy serves it.
            save_model_bundle(
                run_id,
                model=best_model,
                feature_cols=feature_cols,
                problem_type=problem_type,
                model_name=champion_model,
                class_labels=current_best_model_data.get("class_labels"),
            )
            
            # Update return dictionary
            baseline_results["score"] = best_score
            baseline_results["accuracy_score"] = best_score
            baseline_results["extra"] = extra_metrics
            
        baseline_results["justification"] = justification
        
    except Exception as ex:
        log.exception("Error in agentic fine-tuning loop")
        # In case of any error in LLM loop, fallback gracefully but append error context
        baseline_results["justification"] = (
            f"The champion model selected is {champion_model}. An error occurred during the autonomous fine-tuning loop: {str(ex)}. "
            "Please check API connectivity and credentials."
        )
        
    return baseline_results
