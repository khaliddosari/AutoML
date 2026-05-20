const BASE = "/api/backend";

export interface UploadResponse {
  run_id: string;
  filename: string;
  columns: string[];
  preview: Record<string, unknown>[];
}

export interface RunStatus {
  run_id: string;
  status: "uploaded" | "queued" | "running" | "succeeded" | "failed";
  target?: string;
  error?: string;
}

export interface ModelScore {
  name: string;
  test_accuracy?: number;
  test_r2?: number;
  cv_mean: number;
  cv_std: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ResultExtra {
  train_accuracy?: number;
  train_r2?: number;
  overfit_gap?: number;
  f1_macro?: number;
  cv_accuracy_mean?: number;
  cv_r2_mean?: number;
  rmse?: number;
  mae?: number;
  n_classes?: number;
  test_size?: number;
  all_models?: ModelScore[];
  top_features?: FeatureImportance[];
}

export interface RunResult {
  run_id: string;
  status: string;
  target?: string;
  problem_type?: "regression" | "classification";
  accuracy_score?: number;
  score_metric?: string;
  plot_path?: string;
  justification?: string;
  model_name?: string;
  extra?: ResultExtra;
  error?: string;
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startRun(runId: string, target: string): Promise<RunStatus> {
  const res = await fetch(`${BASE}/runs/${runId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStatus(runId: string): Promise<RunStatus> {
  const res = await fetch(`${BASE}/runs/${runId}/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getResult(runId: string): Promise<RunResult> {
  const res = await fetch(`${BASE}/runs/${runId}/result`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function plotUrl(runId: string): string {
  return `${BASE}/runs/${runId}/plot`;
}

export interface Deployment {
  run_id: string;
  status: "not_deployed" | "deploying" | "succeeded" | "failed";
  app_name?: string;
  predict_url?: string | null;
  schema_url?: string | null;
  all_urls?: string[];
  error?: string | null;
  started_at?: string;
  finished_at?: string;
  elapsed_seconds?: number;
}

export async function startDeploy(runId: string): Promise<Deployment> {
  const res = await fetch(`${BASE}/runs/${runId}/deploy`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDeployment(runId: string): Promise<Deployment> {
  const res = await fetch(`${BASE}/runs/${runId}/deployment`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface ModelSchema {
  run_id: string;
  model_name?: string;
  problem_type?: "regression" | "classification";
  feature_cols: string[];
  class_labels?: string[] | null;
  sample: Record<string, number | string | null>;
}

export interface PredictionResponse {
  predictions?: (number | string)[];
  predicted_labels?: (string | null)[];
  probabilities?: number[][];
  class_labels?: string[];
  model?: string;
  error?: string;
}

export async function getModelSchema(runId: string): Promise<ModelSchema> {
  const res = await fetch(`${BASE}/runs/${runId}/model_schema`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function predict(
  runId: string,
  payload: { features: Record<string, number | string | null> } | { rows: (number | string | null)[][] },
): Promise<PredictionResponse> {
  const res = await fetch(`${BASE}/runs/${runId}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
