"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, RotateCcw, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResult, plotUrl, type RunResult, type FeatureImportance, type ModelScore } from "@/lib/api";

/* ─── Chart: horizontal bar ─────────────────────────────────────────────── */

function HBar({
  label,
  value,
  max,
  highlight,
  suffix = "%",
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  highlight?: boolean;
  suffix?: string;
  delay?: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 group">
      <span
        className={cn(
          "text-xs w-32 truncate text-right shrink-0 font-mono",
          highlight ? "text-brand-primary font-semibold" : "text-slate-500"
        )}
        title={label}
      >
        {label}
      </span>
      <div className="flex-1 bg-surface-elevated rounded-full h-2 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", highlight ? "bg-brand-primary" : "bg-slate-300")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
      <span
        className={cn(
          "text-xs w-14 shrink-0 font-mono tabular-nums",
          highlight ? "text-brand-primary font-semibold" : "text-slate-400"
        )}
      >
        {(value * (suffix === "%" ? 100 : 1)).toFixed(1)}{suffix}
      </span>
    </div>
  );
}

/* ─── Chart 1: Score card ───────────────────────────────────────────────── */

function ScoreChart({
  score,
  metric,
  trainScore,
  overfitGap,
  problemType,
}: {
  score: number;
  metric: string;
  trainScore?: number;
  overfitGap?: number;
  problemType?: string;
}) {
  const pct = Math.max(0, Math.min(100, score * 100));
  const scoreColor =
    pct >= 85 ? "text-emerald-600" : pct >= 65 ? "text-amber-600" : "text-red-500";
  const isRegression = metric === "r2";
  const isOverfit = (overfitGap ?? 0) > 0.12;

  const plainExplanation = isRegression
    ? pct >= 85
      ? `An R² of ${pct.toFixed(0)}% means the model explains ${pct.toFixed(0)}% of the variation in ${problemType === "regression" ? "the target value" : "your data"}. That's a strong fit.`
      : pct >= 60
      ? `An R² of ${pct.toFixed(0)}% means the model captures most of the pattern in the data, but there's still room to improve.`
      : `An R² of ${pct.toFixed(0)}% is below average. The model is struggling to capture the pattern — the data may need more informative features.`
    : pct >= 85
    ? `The model correctly predicted ${pct.toFixed(0)} out of every 100 examples it hadn't seen before. That's a strong result.`
    : pct >= 65
    ? `The model correctly predicted ${pct.toFixed(0)} out of every 100 new examples. Decent, but there's room to improve.`
    : `The model correctly predicted ${pct.toFixed(0)} out of every 100 new examples. This is below average — consider adding more data or better features.`;

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            How Accurate Is It?
          </p>
          <div className="flex items-end gap-2">
            <span className={cn("text-5xl font-bold tabular-nums leading-none", scoreColor)}>
              {pct.toFixed(1)}
            </span>
            <span className="text-xl text-slate-400 mb-0.5">%</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isRegression ? "R² on held-out test set" : "Accuracy on held-out test set"}
          </p>
        </div>

        {/* Train vs test */}
        {trainScore !== undefined && (
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400 mb-1">Train</p>
            <p className="text-sm font-semibold font-mono text-slate-600">
              {(trainScore * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Score bar */}
      <div>
        <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              pct >= 85 ? "bg-emerald-400" : pct >= 65 ? "bg-amber-400" : "bg-red-400"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-300 mt-1 font-mono">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Overfit warning */}
      {isOverfit && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Possible overfitting:</span> The model scored{" "}
            {((overfitGap ?? 0) * 100).toFixed(1)}% higher on training data than on new data.
            This means it may have memorised the training examples rather than learned the underlying pattern.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-surface-border pt-4">
        {plainExplanation}
      </p>
    </div>
  );
}

/* ─── Chart 2: Feature importance ──────────────────────────────────────── */

function FeatureImportanceChart({ features }: { features: FeatureImportance[] }) {
  const max = Math.max(...features.map((f) => f.importance));
  const top = features.slice(0, 8);

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          What Mattered Most?
        </p>
        <p className="text-sm font-semibold text-slate-800">Feature Importance</p>
      </div>

      <div className="space-y-2.5">
        {top.map((f, i) => (
          <HBar
            key={f.feature}
            label={f.feature}
            value={f.importance}
            max={max}
            highlight={i === 0}
            suffix="%"
            delay={i * 0.06}
          />
        ))}
      </div>

      <div className="flex items-start gap-2 bg-brand-light/60 border border-brand-border/50 rounded-xl px-3 py-2.5">
        <Info size={12} className="text-brand-primary mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          These are the columns from your data that had the biggest influence on predictions.
          The longer the bar, the more the model relied on that feature to make its decisions.
          Short bars mean the model mostly ignored that column.
        </p>
      </div>
    </div>
  );
}

/* ─── Chart 3: Model comparison ─────────────────────────────────────────── */

function ModelComparisonChart({
  models,
  winner,
  metric,
}: {
  models: ModelScore[];
  winner: string;
  metric: string;
}) {
  const isClassification = metric !== "r2";
  const sorted = [...models].sort((a, b) => b.cv_mean - a.cv_mean);
  const max = Math.max(...sorted.map((m) => m.cv_mean));

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          How Did All 5 Models Do?
        </p>
        <p className="text-sm font-semibold text-slate-800">Model Comparison</p>
      </div>

      <div className="space-y-2.5">
        {sorted.map((m, i) => (
          <HBar
            key={m.name}
            label={m.name}
            value={m.cv_mean}
            max={max}
            highlight={m.name === winner}
            suffix="%"
            delay={i * 0.07}
          />
        ))}
      </div>

      <div className="flex items-start gap-2 bg-brand-light/60 border border-brand-border/50 rounded-xl px-3 py-2.5">
        <Info size={12} className="text-brand-primary mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          We tested 5 different algorithms on your data. Each bar shows its average
          {isClassification ? " accuracy" : " R² score"} across 5 rounds of cross-validation —
          which is a more reliable measure than a single test run. The{" "}
          <span className="text-brand-primary font-semibold">{winner}</span> model was selected
          as the winner because it scored highest by this measure.
        </p>
      </div>
    </div>
  );
}

/* ─── Chart 4: Result plot ──────────────────────────────────────────────── */

function ResultPlot({
  runId,
  problemType,
}: {
  runId: string;
  problemType?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const isClassification = problemType === "classification";

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Prediction Results
        </p>
        <p className="text-sm font-semibold text-slate-800">
          {isClassification ? "Confusion Matrix" : "Predicted vs Actual"}
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-surface-elevated min-h-56 border border-surface-border">
        {!loaded && <div className="absolute inset-0 shimmer" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plotUrl(runId)}
          alt="Model result plot"
          className={cn(
            "w-full h-auto transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
        />
      </div>

      <div className="flex items-start gap-2 bg-brand-light/60 border border-brand-border/50 rounded-xl px-3 py-2.5">
        <Info size={12} className="text-brand-primary mt-0.5 shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          {isClassification
            ? "Each cell shows how often the model predicted a given category. The diagonal from top-left to bottom-right represents correct predictions — the brighter those cells, the better. Off-diagonal cells are mistakes."
            : "Each dot is one data point from the test set. The diagonal line is 'perfect prediction'. The closer the dots are to that line, the better the model. Dots far from the line are where the model struggled."}
        </p>
      </div>
    </div>
  );
}

/* ─── Main result page ──────────────────────────────────────────────────── */

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
        <Loader2 size={24} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!result || result.status === "failed") {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-red-500 text-sm">{result?.error ?? "No result found."}</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-brand-primary hover:underline cursor-pointer"
        >
          ← Start over
        </button>
      </div>
    );
  }

  const extra = result.extra ?? {};
  const features = extra.top_features ?? [];
  const models = extra.all_models ?? [];
  const trainScore = extra.train_accuracy ?? extra.train_r2;
  const overfitGap = extra.overfit_gap;
  const modelName = result.model_name ?? "Best Model";
  const score = result.accuracy_score ?? 0;
  const metric = result.score_metric ?? "score";

  return (
    <div className="flex-1 bg-surface px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Your model is ready
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Winner:{" "}
              <span className="text-brand-primary bg-brand-light px-2 py-0.5 rounded-lg border border-brand-border">
                {modelName}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 font-mono">
              run {runId}
              {result.target && (
                <> · predicting <span className="text-brand-primary">{result.target}</span></>
              )}
              {result.problem_type && (
                <> · <span className="capitalize">{result.problem_type}</span></>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0 card px-3 py-2"
          >
            <RotateCcw size={12} />
            New dataset
          </button>
        </motion.div>

        {/* Justification banner */}
        {result.justification && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card px-5 py-4 border-l-4 border-brand-primary"
          >
            <p className="text-xs font-semibold text-brand-primary uppercase tracking-wider mb-2">
              Why this model?
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{result.justification}</p>
          </motion.div>
        )}

        {/* Charts 2×2 grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          {/* Chart 1 */}
          <ScoreChart
            score={score}
            metric={metric}
            trainScore={trainScore}
            overfitGap={overfitGap}
            problemType={result.problem_type}
          />

          {/* Chart 2 */}
          {features.length > 0 && (
            <FeatureImportanceChart features={features} />
          )}

          {/* Chart 3 */}
          {models.length > 0 && (
            <ModelComparisonChart
              models={models}
              winner={modelName}
              metric={metric}
            />
          )}

          {/* Chart 4 */}
          <ResultPlot runId={runId} problemType={result.problem_type} />
        </motion.div>
      </div>
    </div>
  );
}
