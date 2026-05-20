"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getResult, plotUrl, type RunResult, type FeatureImportance, type ModelScore } from "@/lib/api";

/* ─── Metric card ── */

function MetricCard({
  title,
  value,
  unit,
  accent,
  icon,
  trend,
  trendVal,
  children,
}: {
  title: string;
  value: string;
  unit?: string;
  accent: "green" | "blue" | "purple";
  icon: string;
  trend?: "up" | "down" | "flat";
  trendVal?: string;
  children?: React.ReactNode;
}) {
  const accentMap = {
    green: { bar: "bg-success-green", iconBg: "bg-surface-green-tint", iconColor: "text-success-green", trendColor: "text-success-green" },
    blue: { bar: "bg-info-blue", iconBg: "bg-surface-container", iconColor: "text-info-blue", trendColor: "text-info-blue" },
    purple: { bar: "bg-primary", iconBg: "bg-surface-purple-tint", iconColor: "text-primary", trendColor: "text-primary" },
  };
  const a = accentMap[accent];

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 ghost-border ambient-shadow relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${a.bar}`} />
      <div className="flex justify-between items-start mb-4">
        <div className={`${a.iconBg} p-2 rounded-lg ${a.iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {trend && trendVal && (
          <span className={`flex items-center text-label-md gap-1 ${trend === "down" ? "text-error" : trend === "up" ? a.trendColor : "text-on-surface-variant"}`}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              {trend === "up" ? "trending_up" : trend === "down" ? "trending_down" : "horizontal_rule"}
            </span>
            {trendVal}
          </span>
        )}
      </div>
      <h3 className="text-label-md text-on-surface-variant mb-1">{title}</h3>
      <div className="text-headline-xl text-on-background">
        {value}
        {unit && <span className="text-body-lg text-on-surface-variant ml-1">{unit}</span>}
      </div>
      {children}
    </div>
  );
}

/* ─── Feature importance ── */

function FeatureImportanceCard({ features }: { features: FeatureImportance[] }) {
  const top = features.slice(0, 5);
  const max = Math.max(...top.map((f) => f.importance));
  const COLORS = ["bg-primary", "bg-info-blue", "bg-warning-orange", "bg-secondary-fixed-dim", "bg-outline"];

  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-headline-md text-on-background">Feature Importance (SHAP)</h3>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>
      <div className="flex-1 space-y-4">
        {top.map((f, i) => {
          const pct = max > 0 ? (f.importance / max) * 100 : 0;
          return (
            <div key={f.feature}>
              <div className="flex justify-between text-label-md mb-1">
                <span className="text-on-background truncate mr-2">{f.feature}</span>
                <span className="text-on-surface-variant shrink-0">{f.importance.toFixed(3)}</span>
              </div>
              <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                <motion.div
                  className={`${COLORS[i]} h-full rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.65, delay: i * 0.06, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Model comparison ── */

function ModelComparisonCard({ models, winner }: { models: ModelScore[]; winner: string }) {
  const sorted = [...models].sort((a, b) => b.cv_mean - a.cv_mean);
  const max = Math.max(...sorted.map((m) => m.cv_mean));

  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-headline-md text-on-background">Model Comparison (5-fold CV)</h3>
        <span className="text-label-sm text-on-surface-variant">All models ranked</span>
      </div>
      <div className="flex-1 space-y-4">
        {sorted.map((m, i) => {
          const pct = max > 0 ? (m.cv_mean / max) * 100 : 0;
          const isWinner = m.name === winner;
          return (
            <div key={m.name}>
              <div className="flex justify-between text-label-md mb-1">
                <span className={`truncate mr-2 ${isWinner ? "text-primary font-bold" : "text-on-background"}`}>
                  {m.name}
                  {isWinner && (
                    <span className="ml-1.5 text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">winner</span>
                  )}
                </span>
                <span className="text-on-surface-variant shrink-0">{(m.cv_mean * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                <motion.div
                  className={isWinner ? "bg-primary h-full rounded-full" : "bg-outline h-full rounded-full"}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.65, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Result plot ── */

function ResultPlotCard({ runId, problemType }: { runId: string; problemType?: string }) {
  const [loaded, setLoaded] = useState(false);
  const isClassification = problemType === "classification";

  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-headline-md text-on-background">
          {isClassification ? "Confusion Matrix" : "Predicted vs Actual"}
        </h3>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-container text-on-surface-variant rounded text-label-sm capitalize">
          {problemType ?? "classification"}
        </span>
      </div>
      <div className="flex-1 relative rounded-lg overflow-hidden bg-surface-container min-h-[200px]">
        {!loaded && <div className="absolute inset-0 shimmer" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plotUrl(runId)}
          alt="Model result plot"
          className={`w-full h-full object-contain transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <p className="text-label-sm text-on-surface-variant mt-3">
        {isClassification
          ? "Diagonal = correct predictions. Brighter diagonal → better model."
          : "Dots close to the diagonal line = accurate predictions."}
      </p>
    </div>
  );
}

/* ─── Result page ── */

export default function ResultPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResult(runId).then((r) => { setResult(r); setLoading(false); });
  }, [runId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: "32px" }}>sync</span>
          <p className="text-label-md text-on-surface-variant">Loading results…</p>
        </div>
      </div>
    );
  }

  if (!result || result.status === "failed") {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <span className="material-symbols-outlined text-error" style={{ fontSize: "48px" }}>error_outline</span>
        <p className="text-body-md text-on-surface-variant">{result?.error ?? "No result found."}</p>
        <button
          onClick={() => router.push("/")}
          className="text-label-md text-primary border border-outline-variant px-4 py-2 rounded hover:bg-surface-purple-tint transition-colors"
        >
          ← Start over
        </button>
      </div>
    );
  }

  const extra = result.extra ?? {};
  const features: FeatureImportance[] = extra.top_features ?? [];
  const models: ModelScore[] = extra.all_models ?? [];
  const trainScore: number | undefined = extra.train_accuracy ?? extra.train_r2;
  const overfitGap: number | undefined = extra.overfit_gap;
  const modelName = result.model_name ?? "Best Model";
  const score = result.accuracy_score ?? 0;
  const metric = result.score_metric ?? "score";
  const pct = Math.max(0, Math.min(100, score * 100));
  const isRegression = metric === "r2";

  return (
    <div className="flex-1 overflow-y-auto p-gutter">
      <div className="max-w-[1280px] mx-auto w-full space-y-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-end gap-4"
        >
          <div>
            <h1 className="text-headline-xl text-on-background mb-2">Performance Analytics</h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl">
              Detailed evaluation metrics for{" "}
              <span className="text-primary font-semibold">{modelName}</span>
              {result.target && (
                <> · predicting <span className="text-primary">{result.target}</span></>
              )}
              {result.problem_type && (
                <> · <span className="capitalize">{result.problem_type}</span></>
              )}
            </p>
            {result.justification && (
              <p className="text-label-sm text-on-surface-variant mt-2 max-w-2xl line-clamp-2">
                <span className="font-semibold text-primary mr-1">Why this model:</span>
                {result.justification}
              </p>
            )}
          </div>
          <div className="flex gap-3 shrink-0">
            <span className="bg-surface-green-tint text-success-green px-3 py-1 rounded-full text-label-sm flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
              Status: Ready
            </span>
            <button
              onClick={() => router.push("/")}
              className="text-label-md text-on-surface-variant border border-outline-variant px-4 py-2 rounded hover:bg-surface-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>refresh</span>
              New dataset
            </button>
          </div>
        </motion.div>

        {/* Key Metrics Bento */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Accuracy */}
          <MetricCard
            title={isRegression ? "R² Score" : "Overall Accuracy"}
            value={pct.toFixed(1)}
            unit="%"
            accent="green"
            icon="target"
            trend={pct >= 85 ? "up" : pct >= 65 ? "flat" : "down"}
            trendVal={pct >= 85 ? "Excellent" : pct >= 65 ? "Good" : "Low"}
          >
            <div className="mt-4 w-full bg-surface-variant h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-success-green h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
            {trainScore !== undefined && (
              <div className="mt-2 flex justify-between text-label-sm text-on-surface-variant">
                <span>Train: {(trainScore * 100).toFixed(1)}%</span>
                {overfitGap !== undefined && overfitGap > 0.12 && (
                  <span className="text-warning-orange flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>warning</span>
                    Overfit gap: {(overfitGap * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </MetricCard>

          {/* Model score as F1 proxy */}
          <MetricCard
            title="CV Mean Score"
            value={score.toFixed(3)}
            accent="blue"
            icon="balance"
            trend="flat"
            trendVal="0.0%"
          >
            <div className="mt-4 flex gap-1">
              {[100, 80, 60, 40, 20].map((op, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 bg-info-blue rounded-full"
                  style={{ opacity: op / 100 }}
                />
              ))}
            </div>
          </MetricCard>

          {/* Model name card */}
          <MetricCard
            title="Winning Model"
            value={modelName.length > 16 ? modelName.slice(0, 14) + "…" : modelName}
            accent="purple"
            icon="emoji_events"
          >
            <div className="mt-4 h-8 flex items-end gap-1">
              {[40, 50, 45, 60, 75, 90, 95, 100].map((h, i) => (
                <div
                  key={i}
                  className={`w-full rounded-t ${i >= 5 ? "bg-primary" : "bg-primary-fixed-dim"}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </MetricCard>
        </motion.section>

        {/* Analysis Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {features.length > 0 ? (
            <FeatureImportanceCard features={features} />
          ) : (
            <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 flex flex-col items-center justify-center min-h-[280px]">
              <span className="material-symbols-outlined text-outline opacity-40" style={{ fontSize: "48px" }}>bar_chart</span>
              <p className="text-label-md text-on-surface-variant mt-3">Feature importance not available</p>
            </div>
          )}

          <ResultPlotCard runId={runId} problemType={result.problem_type} />
        </motion.section>

        {/* Model Comparison */}
        {models.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <ModelComparisonCard models={models} winner={modelName} />
          </motion.section>
        )}
      </div>
    </div>
  );
}
