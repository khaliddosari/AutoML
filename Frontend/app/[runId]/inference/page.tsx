"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  getDeployment,
  getModelSchema,
  predict as predictApi,
  startDeploy,
  type Deployment,
  type ModelSchema,
  type PredictionResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/* ─── Deploy card ── */
function ModalDeployCard({
  runId,
  featureCols,
  deployment,
  setDeployment,
}: {
  runId: string;
  featureCols: string[];
  deployment: Deployment | null;
  setDeployment: (d: Deployment) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onDeploy = async () => {
    setError(null);
    setBusy(true);
    try {
      const d = await startDeploy(runId);
      setDeployment(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start deployment");
    } finally {
      setBusy(false);
    }
  };

  const sampleCurl = (url: string) => {
    const featuresObj = featureCols.reduce<Record<string, number>>((acc, c) => {
      acc[c] = 0;
      return acc;
    }, {});
    const payload = JSON.stringify({ features: featuresObj });
    return `curl -X POST "${url}" -H "Content-Type: application/json" -d '${payload}'`;
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const status = deployment?.status ?? "not_deployed";
  const isDeploying = status === "deploying" || busy;
  const isSuccess = status === "succeeded" && deployment?.predict_url;
  const isFailed = status === "failed";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 card-shadow text-left"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "26px" }}>cloud_upload</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-headline-md font-bold text-on-background">Deploy as API</h3>
            <p className="text-xs font-medium text-on-surface-variant mt-0.5">
              Push the winning model to <span className="font-mono font-bold">Modal</span> and get a live prediction endpoint.
            </p>
          </div>
        </div>

        {!isSuccess && (
          <button
            onClick={onDeploy}
            disabled={isDeploying}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shrink-0",
              isDeploying
                ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
                : "bg-primary text-on-primary hover:opacity-90 cursor-pointer"
            )}
          >
            {isDeploying ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: "18px" }}>sync</span>
                Deploying…
              </>
            ) : isFailed ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>refresh</span>
                Retry Deploy
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>rocket_launch</span>
                Deploy to Modal
              </>
            )}
          </button>
        )}
      </div>

      {isDeploying && !isSuccess && (
        <div className="mt-5 p-4 bg-surface-container rounded-lg border border-outline-variant">
          <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
            First-time builds package scikit-learn, pandas, numpy into a fresh container — this usually takes
            <strong className="text-on-surface font-bold"> 30–90 seconds</strong>. The page will update automatically.
          </p>
        </div>
      )}

      {isSuccess && deployment?.predict_url && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-success-green">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
            Live on Modal
            {deployment.elapsed_seconds !== undefined && (
              <span className="text-on-surface-variant font-mono ml-2">
                ({deployment.elapsed_seconds.toFixed(1)}s)
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
              Predict endpoint (POST)
            </label>
            <div className="mt-1.5 flex gap-2">
              <code className="flex-1 bg-surface-container px-3 py-2.5 rounded-lg text-xs font-mono break-all border border-outline-variant">
                {deployment.predict_url}
              </code>
              <button
                onClick={() => copy(deployment.predict_url!)}
                className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-purple-tint/40 transition-colors text-xs font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {deployment.schema_url && (
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                Schema endpoint (GET) — lists expected feature columns
              </label>
              <code className="block mt-1.5 bg-surface-container px-3 py-2.5 rounded-lg text-xs font-mono break-all border border-outline-variant">
                {deployment.schema_url}
              </code>
            </div>
          )}

          {featureCols.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                Example request
              </label>
              <div className="mt-1.5 flex gap-2 items-start">
                <pre className="flex-1 bg-surface-container px-3 py-2.5 rounded-lg text-[11px] font-mono whitespace-pre-wrap break-all border border-outline-variant max-h-32 overflow-auto">
                  {sampleCurl(deployment.predict_url)}
                </pre>
                <button
                  onClick={() => copy(sampleCurl(deployment.predict_url!))}
                  className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-purple-tint/40 transition-colors text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>content_copy</span>
                </button>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2 font-mono">
                Replace the zeros with real values. {featureCols.length} feature{featureCols.length === 1 ? "" : "s"} expected.
              </p>
            </div>
          )}

          <button
            onClick={onDeploy}
            disabled={busy}
            className="text-xs font-bold text-primary hover:bg-surface-purple-tint/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>refresh</span>
            Re-deploy (overwrites existing app)
          </button>
        </div>
      )}

      {(isFailed || error) && (
        <div className="mt-5 p-4 bg-error/5 border border-error/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: "18px" }}>error</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-error">Deployment failed</p>
              <p className="text-xs text-on-surface-variant mt-1 font-mono break-words">
                {error ?? deployment?.error ?? "Unknown error"}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

/* ─── Try the model card ── */
function TryModelCard({ runId, schema, deployed }: { runId: string; schema: ModelSchema | null; deployed: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schema) return;
    const initial: Record<string, string> = {};
    for (const c of schema.feature_cols) {
      const v = schema.sample[c];
      initial[c] = v === null || v === undefined ? "" : String(v);
    }
    setValues(initial);
    setJsonText(JSON.stringify({ features: schema.sample }, null, 2));
  }, [schema]);

  const onChange = (col: string, v: string) => {
    setValues((prev) => ({ ...prev, [col]: v }));
  };

  const resetToSample = () => {
    if (!schema) return;
    const initial: Record<string, string> = {};
    for (const c of schema.feature_cols) {
      const v = schema.sample[c];
      initial[c] = v === null || v === undefined ? "" : String(v);
    }
    setValues(initial);
    setError(null);
    setResult(null);
  };

  const runPredict = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let payload: Parameters<typeof predictApi>[1];
      if (mode === "json") {
        try {
          payload = JSON.parse(jsonText);
        } catch (e) {
          throw new Error("Invalid JSON: " + (e instanceof Error ? e.message : String(e)));
        }
      } else {
        const features: Record<string, number | string | null> = {};
        for (const c of schema?.feature_cols ?? []) {
          const raw = values[c];
          if (raw === "" || raw === undefined) {
            features[c] = null;
          } else if (!isNaN(Number(raw))) {
            features[c] = Number(raw);
          } else {
            features[c] = raw;
          }
        }
        payload = { features };
      }
      const res = await predictApi(runId, payload);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!deployed) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 card-shadow text-left opacity-60"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: "26px" }}>science</span>
          </div>
          <div>
            <h3 className="text-headline-md font-bold text-on-background">Try the Model</h3>
            <p className="text-xs font-medium text-on-surface-variant mt-0.5">
              Deploy the model to Modal first, then come back to send live prediction requests from here.
            </p>
          </div>
        </div>
      </motion.section>
    );
  }

  const isClassification = schema?.problem_type === "classification";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 card-shadow text-left"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-surface-purple-tint flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "26px" }}>science</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-headline-md font-bold text-on-background">Try the Model</h3>
            <p className="text-xs font-medium text-on-surface-variant mt-0.5">
              Send a live request to the deployed endpoint. Pre-filled with a sample row — tweak any value to see how it changes.
            </p>
          </div>
        </div>

        {schema && (
          <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 border border-outline-variant">
            <button
              onClick={() => setMode("form")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer",
                mode === "form" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              Form
            </button>
            <button
              onClick={() => setMode("json")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer",
                mode === "json" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              JSON
            </button>
          </div>
        )}
      </div>

      {!schema ? (
        <div className="mt-5 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: "16px" }}>sync</span>
          Loading model schema…
        </div>
      ) : (
        <>
          {mode === "form" ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
              {schema.feature_cols.map((c) => (
                <div key={c} className="flex flex-col">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono truncate" title={c}>
                    {c}
                  </label>
                  <input
                    type="text"
                    value={values[c] ?? ""}
                    onChange={(e) => onChange(c, e.target.value)}
                    className="mt-1 px-2.5 py-1.5 bg-surface-container rounded-md border border-outline-variant text-sm font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-surface-container rounded-md border border-outline-variant text-xs font-mono focus:outline-none focus:border-primary"
                spellCheck={false}
              />
              <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
                Use <code className="bg-surface-container px-1 py-0.5 rounded">{`{"features": {...}}`}</code> for a single row, or <code className="bg-surface-container px-1 py-0.5 rounded">{`{"rows": [[...], ...]}`}</code> for a batch.
              </p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              onClick={runPredict}
              disabled={busy}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all cursor-pointer",
                busy ? "bg-surface-container text-on-surface-variant cursor-not-allowed" : "bg-primary text-on-primary hover:opacity-90",
              )}
            >
              {busy ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: "18px" }}>sync</span>
                  Predicting…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>send</span>
                  Predict
                </>
              )}
            </button>

            {mode === "form" && (
              <button
                onClick={resetToSample}
                className="text-xs font-bold text-primary hover:bg-surface-purple-tint/40 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>restart_alt</span>
                Reset to sample
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error/5 border border-error/30 rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: "16px" }}>error</span>
              <p className="text-xs text-error font-mono break-words">{error}</p>
            </div>
          )}

          {result && !result.error && (
            <div className="mt-5 bg-surface-container rounded-lg border border-outline-variant p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-mono mb-3">Prediction Result</h4>
              {isClassification ? (
                <div className="space-y-3">
                  {(result.predicted_labels ?? result.predictions ?? []).map((label, i) => {
                    const probs = result.probabilities?.[i];
                    const top = probs ? Math.max(...probs) : null;
                    return (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="text-xs font-bold text-on-surface-variant font-mono">Predicted:</span>
                          <span className="text-2xl font-black text-primary font-mono">{String(label)}</span>
                          {top !== null && (
                            <span className="text-xs font-bold text-success-green font-mono">{(top * 100).toFixed(1)}% confidence</span>
                          )}
                        </div>
                        {probs && result.class_labels && (
                          <div className="space-y-1.5">
                            {result.class_labels.map((cls, j) => (
                              <div key={cls}>
                                <div className="flex justify-between text-[10px] font-mono font-bold mb-0.5">
                                  <span className="text-on-surface">{cls}</span>
                                  <span className="text-on-surface-variant">{(probs[j] * 100).toFixed(2)}%</span>
                                </div>
                                <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${probs[j] * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className={cn("h-full rounded-full", j === probs.indexOf(top!) ? "bg-primary" : "bg-outline")}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {(result.predictions ?? []).map((p, i) => (
                    <div key={i} className="flex items-baseline gap-3">
                      <span className="text-xs font-bold text-on-surface-variant font-mono">Predicted value:</span>
                      <span className="text-2xl font-black text-primary font-mono">
                        {typeof p === "number" ? p.toFixed(4) : String(p)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <details className="mt-4">
                <summary className="text-[10px] font-bold text-on-surface-variant cursor-pointer hover:text-primary font-mono uppercase tracking-wider">
                  Raw response
                </summary>
                <pre className="mt-2 bg-surface px-3 py-2 rounded text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto border border-outline-variant">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {result?.error && (
            <div className="mt-4 p-3 bg-error/5 border border-error/30 rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-error shrink-0" style={{ fontSize: "16px" }}>error</span>
              <p className="text-xs text-error font-mono break-words">{result.error}</p>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}

/* ─── Inference page ── */
export default function InferencePage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();

  const [schema, setSchema] = useState<ModelSchema | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial schema fetch — works as soon as model.joblib exists.
  useEffect(() => {
    getModelSchema(runId)
      .then((s) => {
        setSchema(s);
        setSchemaError(null);
      })
      .catch((e) => setSchemaError(e instanceof Error ? e.message : String(e)));
  }, [runId]);

  // Initial deployment fetch + auto-poll while deploying.
  useEffect(() => {
    getDeployment(runId).then(setDeployment).catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [runId]);

  useEffect(() => {
    if (deployment?.status !== "deploying") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const d = await getDeployment(runId);
        setDeployment(d);
      } catch {
        /* transient */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [deployment?.status, runId]);

  // Schema fetch failed — most likely the run hasn't finished yet.
  if (schemaError) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-surface select-none p-gutter">
        <span className="material-symbols-outlined text-outline" style={{ fontSize: "52px" }}>hourglass_empty</span>
        <h2 className="text-headline-md font-bold text-on-background">No model available yet</h2>
        <p className="text-sm text-on-surface-variant text-center max-w-md font-mono">
          Inference needs a trained model. Finish the training run for this dataset first, then come back here to deploy.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/${runId}/result`)}
            className="text-xs font-bold text-primary border border-outline-variant px-5 py-2.5 rounded-lg hover:bg-surface-purple-tint/40 transition-all"
          >
            ← Back to Analytics
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-xs font-bold text-on-surface-variant border border-outline-variant px-5 py-2.5 rounded-lg hover:bg-surface-container transition-all"
          >
            Start New Run
          </button>
        </div>
      </div>
    );
  }

  const deployed = deployment?.status === "succeeded" && !!deployment.predict_url;
  const featureCols = schema?.feature_cols ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-gutter relative select-none">
      <div className="max-w-[1280px] mx-auto w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left"
        >
          <div>
            <h1 className="text-headline-lg font-bold text-on-background mb-2">Inference</h1>
            <p className="text-body-md text-on-surface-variant">
              Deploy{" "}
              <strong className="text-primary font-bold">{schema?.model_name ?? "the winning model"}</strong>{" "}
              to Modal and call it live from this page.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
            {deployed ? (
              <span className="bg-surface-green-tint text-success-green border border-success-green/10 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>bolt</span>
                Endpoint Live
              </span>
            ) : (
              <span className="bg-surface-container text-on-surface-variant border border-outline-variant px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>cloud_off</span>
                Not Deployed
              </span>
            )}
            <button
              onClick={() => router.push(`/${runId}/result`)}
              className="text-xs font-bold text-on-surface-variant border border-outline-variant px-4 py-2 rounded-lg hover:bg-surface-container transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>insights</span>
              Analytics
            </button>
          </div>
        </motion.div>

        <ModalDeployCard
          runId={runId}
          featureCols={featureCols}
          deployment={deployment}
          setDeployment={setDeployment}
        />

        <TryModelCard runId={runId} schema={schema} deployed={deployed} />
      </div>
    </div>
  );
}
