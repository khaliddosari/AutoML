import json
import logging
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


def remove_em_dashes(text: str) -> str:
    if not text:
        return text
    # Replace em dash (—) and en dash (–) with a standard hyphen
    return text.replace("—", "-").replace("–", "-")


# NOTE: The old LLM-driven hyperparameter search (OPTIMIZER_SYSTEM/USER_PROMPT +
# ALLOWED_PARAMS + clean_json_text) has been replaced by a parallel grid search
# (see run_fine_tuning_loop). The LLM is now used only for the closing
# justification below, removing the per-trial sequential LLM round-trips.

JUSTIFICATION_SYSTEM_PROMPT = """You are نَمذِج's AutoML Champion Architect.
You have just run an agentic fine-tuning optimization loop that searched for the best model configuration.
Please write an extremely brief, premium and punchy 1-2 sentence "Explainable AI Justification" for the results. Keep it as brief and high-impact as possible.

In the justification, explain:
1. Why this champion model won and the benefit of the optimal hyperparameters selected by the نَمذِج reasoning engine.
2. A very brief, plain-english explanation of the performance improvement, including one key real-world caveat (e.g., sensitive to rare outliers).

Write in a neutral, confident, and extremely concise professional tone suitable for a data analyst or business leader. Keep it strictly to 1-2 sentences maximum.
Do not use markdown fences or mention 'agent', 'LangChain' directly-focus on 'نَمذِج reasoning engine' or 'agentic optimization'.

CRITICAL RULE: Do NOT use an em dash (—) or en dash (–) anywhere in the output. If you need to separate clauses, use commas, semicolons, or regular hyphens.
"""

JUSTIFICATION_USER_PROMPT = """Champion Model: {champion_model}
Problem Type: {problem_type}
Target Column: {target}
Metric: {metric}
Starting Baseline Score: {baseline_score}
Best Optimized Score Reached: {best_score}
Optimal Hyperparameters Selected: {best_params}

Tuning Process History details:
{history}
"""


def get_grid_candidates(model_name: str) -> list[dict]:
    if model_name == "RandomForest":
        return [
            {"n_estimators": 50, "min_samples_split": 2, "max_depth": 10},
            {"n_estimators": 100, "min_samples_split": 2, "max_depth": 15},
            {"n_estimators": 150, "min_samples_split": 5, "max_depth": 12},
            {"n_estimators": 200, "min_samples_split": 5, "max_depth": None},
            {"n_estimators": 250, "min_samples_split": 10, "max_depth": 8},
        ]
    elif model_name == "ExtraTrees":
        return [
            {"n_estimators": 50, "max_depth": 10},
            {"n_estimators": 100, "max_depth": 15},
            {"n_estimators": 150, "max_depth": 12},
            {"n_estimators": 200, "max_depth": None},
            {"n_estimators": 250, "max_depth": 8},
        ]
    elif model_name == "LightGBM":
        return [
            {"n_estimators": 100, "learning_rate": 0.05, "num_leaves": 31},
            {"n_estimators": 200, "learning_rate": 0.05, "num_leaves": 31},
            {"n_estimators": 300, "learning_rate": 0.03, "num_leaves": 63},
            {"n_estimators": 200, "learning_rate": 0.1, "num_leaves": 15},
            {"n_estimators": 400, "learning_rate": 0.02, "num_leaves": 31},
        ]
    elif model_name == "LogisticRegression":
        return [
            {"C": 0.01},
            {"C": 0.1},
            {"C": 1.0},
            {"C": 10.0},
            {"C": 50.0},
        ]
    elif model_name == "Ridge":
        return [
            {"alpha": 0.01},
            {"alpha": 0.1},
            {"alpha": 1.0},
            {"alpha": 10.0},
            {"alpha": 50.0},
        ]
    elif model_name == "KNN":
        return [
            {"n_neighbors": 3, "weights": "distance"},
            {"n_neighbors": 5, "weights": "uniform"},
            {"n_neighbors": 5, "weights": "distance"},
            {"n_neighbors": 7, "weights": "distance"},
            {"n_neighbors": 15, "weights": "distance"},
        ]
    return []


def run_fine_tuning_loop(
    run_id: str,
    target: str,
    problem_type: str,
    baseline_results: dict,
    df=None,
) -> dict:
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

    # If the OPENROUTER key is not configured, fallback to standard results with a static justification
    if not settings.openrouter_api_key:
        log.warning("OPENROUTER_API_KEY not set. Skipping agentic fine-tuning loop.")
        baseline_results["justification"] = (
            f"{champion_model} achieved the strongest cross-validation performance "
            f"({baseline_score:.4f} {metric}) among all candidates and was selected as champion."
        )
        return baseline_results

    # Lean harder on already-strong baselines: if the winning candidate is
    # already performing well, skip the entire tuning search (and its retrains +
    # LLM justification round-trip) rather than grinding for marginal gains.
    # Thresholds are intentionally lower than the old 0.97/0.95 so more good
    # baselines short-circuit here.
    EXCELLENT_THRESHOLD = 0.90 if metric == "accuracy" else 0.85
    if baseline_score >= EXCELLENT_THRESHOLD:
        log.info("Skipping tuning — baseline %s=%.4f is already excellent.", metric, baseline_score)
        try:
            llm = _get_llm()
            messages = [
                ("system", JUSTIFICATION_SYSTEM_PROMPT),
                ("human", JUSTIFICATION_USER_PROMPT.format(
                    champion_model=champion_model,
                    problem_type=problem_type,
                    target=target,
                    metric=metric,
                    baseline_score=baseline_score,
                    best_score=baseline_score,
                    best_params="Baseline parameters",
                    history="- Trial 0: Baseline Settings => Score: {:.4f} (Excellent baseline, no tuning required)".format(baseline_score)
                ))
            ]
            justification_res = llm.invoke(messages)
            baseline_results["justification"] = remove_em_dashes(justification_res.content.strip())
        except Exception:
            baseline_results["justification"] = (
                f"The champion model {champion_model} achieved an excellent baseline score of {baseline_score:.4f} with no further tuning required."
            )
        baseline_results["extra"]["tuning_trials"] = [
            {"trial": 0, "parameters": "Baseline Settings", "score": baseline_score, "result": "Excellent baseline — tuning skipped"}
        ]
        return baseline_results

    try:
        llm = _get_llm()

        best_score = baseline_score
        best_test_score = test_score
        best_params = {}
        best_train_score = extra.get("train_accuracy" if metric == "accuracy" else "train_r2", baseline_score)

        history = [
            {"trial": 0, "parameters": "Baseline Settings", "score": baseline_score, "result": "Champion baseline (CV mean)"}
        ]

        current_best_model_data = None

        # Parallel grid search for ALL dataset sizes. The old large-dataset path
        # ran up to 3 *sequential* LLM round-trips (3-8s each) interleaved with
        # blocking retrains - the single biggest source of tuning latency. We now
        # evaluate a fixed grid of well-chosen configs concurrently, so wall time
        # is ~one trial instead of N, and the LLM is reserved for the single
        # closing justification call. Row sampling (train._maybe_sample) keeps each
        # concurrent retrain tractable even on large uploads.
        from concurrent.futures import ThreadPoolExecutor, as_completed
        candidates = get_grid_candidates(champion_model)
        # Cap concurrency: each estimator already fans out internally (n_jobs=-1),
        # so unbounded workers would oversubscribe cores. A small pool keeps the
        # parallelism win without thrashing on constrained hosts.
        max_workers = min(len(candidates), 4) or 1
        log.info("Running %d grid trials in parallel (max_workers=%d).", len(candidates), max_workers)
        futures_map = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for idx, params in enumerate(candidates, 1):
                f = executor.submit(
                    train_champion_with_params,
                    run_id, target, problem_type, champion_model, params, df
                )
                futures_map[f] = (idx, params)
            for future in as_completed(futures_map):
                idx, suggested_params = futures_map[future]
                param_desc = ", ".join(f"{k}={v}" for k, v in suggested_params.items())
                try:
                    trial_res = future.result()
                    score = trial_res["cv_mean"]
                    improvement = score - best_score
                    if score > best_score:
                        best_score = score
                        best_test_score = trial_res["test_score"]
                        best_params = suggested_params
                        best_train_score = trial_res["train_score"]
                        current_best_model_data = trial_res
                        result_desc = f"New champion! CV +{improvement:.4f} | {param_desc}"
                    else:
                        result_desc = f"No improvement (CV={score:.4f}) | {param_desc}"
                    history.append({"trial": idx, "parameters": json.dumps(suggested_params), "score": score, "result": result_desc})
                except Exception as e:
                    log.error("Parallel grid trial %d failed: %s", idx, e)
                    history.append({"trial": idx, "parameters": json.dumps(suggested_params), "score": best_score, "result": f"Error: {str(e)[:40]}"})
        history.sort(key=lambda h: h["trial"])

        # Now, run the justification chain
        history_summary = "\n".join([
            f"- Trial {h['trial']}: {h['parameters']} => Score: {h['score']:.4f} ({h['result']})"
            for h in history
        ])
        
        messages = [
            ("system", JUSTIFICATION_SYSTEM_PROMPT),
            ("human", JUSTIFICATION_USER_PROMPT.format(
                champion_model=champion_model,
                problem_type=problem_type,
                target=target,
                metric=metric,
                baseline_score=baseline_score,
                best_score=best_score,
                best_params=json.dumps(best_params) if best_params else "Baseline parameters",
                history=history_summary
            ))
        ]
        
        justification_res = llm.invoke(messages)
        justification = remove_em_dashes(justification_res.content.strip())
        
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
