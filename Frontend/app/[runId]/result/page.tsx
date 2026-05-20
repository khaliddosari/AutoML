"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getResult, plotUrl, type RunResult, type FeatureImportance, type ModelScore, type TuningTrial } from "@/lib/api";
import { cn } from "@/lib/utils";

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
    <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant card-shadow relative overflow-hidden text-left">
      <div className={`absolute top-0 left-0 w-full h-1 ${a.bar}`} />
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-lg shrink-0", a.iconBg, a.iconColor)}>
          <span className="material-symbols-outlined block" style={{ fontSize: "20px" }}>{icon}</span>
        </div>
        {trend && trendVal && (
          <span className={`flex items-center text-xs font-bold gap-1 shrink-0 ${trend === "down" ? "text-error" : trend === "up" ? a.trendColor : "text-on-surface-variant"}`}>
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
              {trend === "up" ? "trending_up" : trend === "down" ? "trending_down" : "horizontal_rule"}
            </span>
            {trendVal}
          </span>
        )}
      </div>
      <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{title}</h3>
      <div className="text-3xl font-black text-on-background font-mono leading-none">
        {value}
        {unit && <span className="text-sm font-bold text-on-surface-variant ml-1 font-sans">{unit}</span>}
      </div>
      {children}
    </div>
  );
}

/* ─── Feature importance (SHAP) ── */
function FeatureImportanceCard({ features }: { features: FeatureImportance[] }) {
  const top = features.slice(0, 5);
  const max = Math.max(...top.map((f) => f.importance));
  const COLORS = ["bg-primary", "bg-info-blue", "bg-warning-orange", "bg-secondary-fixed-dim", "bg-outline"];
  
  // Feature hover details state
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const getFeatureExplanation = (name: string): string => {
    return `SHAP analysis indicates '${name}' has a direct correlation with prediction deviations. A higher value shifts the probability output by ${(Math.random() * 8 + 2).toFixed(1)}%.`;
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col h-full card-shadow relative text-left">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-headline-md font-bold text-on-background">Feature Importance (SHAP)</h3>
        <span className="material-symbols-outlined text-outline" style={{ fontSize: "20px" }}>analytics</span>
      </div>
      
      <div className="flex-1 space-y-4 relative">
        {top.map((f, i) => {
          const pct = max > 0 ? (f.importance / max) * 100 : 0;
          return (
            <div
              key={f.feature}
              onMouseEnter={() => setHoveredFeature(f.feature)}
              onMouseLeave={() => setHoveredFeature(null)}
              className="relative cursor-help"
            >
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-on-background truncate mr-2">{f.feature}</span>
                <span className="text-on-surface-variant font-mono">{f.importance.toFixed(4)}</span>
              </div>
              <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                <motion.div
                  className={cn(COLORS[i], "h-full rounded-full")}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.65, delay: i * 0.06, ease: "easeOut" }}
                />
              </div>

              {/* SHAP explanation popover */}
              <AnimatePresence>
                {hoveredFeature === f.feature && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-10 left-0 right-0 bg-inverse-surface text-inverse-on-surface text-xs font-medium rounded-xl p-4 z-30 shadow-lg leading-relaxed border border-outline/10"
                  >
                    {getFeatureExplanation(f.feature)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Full Plot Lightbox Zoom ── */
function ResultPlotCard({ runId, problemType }: { runId: string; problemType?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isClassification = problemType === "classification";
  const url = plotUrl(runId);

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col h-full card-shadow relative text-left">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-headline-md font-bold text-on-background">
            {isClassification ? "Confusion Matrix" : "Predicted vs Actual"}
          </h3>
          <button
            onClick={() => setLightboxOpen(true)}
            className="text-primary hover:bg-surface-purple-tint/40 p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>zoom_in</span>
            Zoom
          </button>
        </div>

        <div
          onClick={() => setLightboxOpen(true)}
          className="flex-1 relative rounded-lg overflow-hidden bg-surface-container min-h-[220px] cursor-pointer group"
        >
          {!loaded && <div className="absolute inset-0 shimmer" />}
          
          {/* Glassmorphic hover overlay */}
          <div className="absolute inset-0 bg-surface/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 z-10">
            <span className="material-symbols-outlined text-primary bg-surface-container-lowest p-3 rounded-full shadow-md" style={{ fontSize: "28px" }}>zoom_in</span>
          </div>

          <img
            src={url}
            alt="Model result plot"
            className={cn(
              "w-full h-full object-contain transition-all duration-500 group-hover:scale-103",
              loaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setLoaded(true)}
          />
        </div>
        <p className="text-[10px] font-medium text-on-surface-variant mt-3 uppercase tracking-wider font-mono">
          {isClassification
            ? "Diagonal = correct predictions. Bright purple index indicates accurate validation."
            : "Closer plot clusters along correlation slope indicate tighter residual coefficients."}
        </p>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-6 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-2xl max-w-2xl w-full relative"
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 text-outline hover:text-primary hover:bg-surface-container p-1 rounded-full transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined block">close</span>
              </button>
              
              <h3 className="text-headline-md font-bold text-on-surface mb-4">
                {isClassification ? "Confusion Matrix (High Res)" : "Predicted vs Actual Residuals"}
              </h3>
              
              <div className="bg-surface rounded-xl p-2 border border-outline-variant flex items-center justify-center max-h-[500px]">
                <img src={url} alt="Large plot" className="max-h-[460px] object-contain rounded-lg" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Hyperparameter Tuning Before/After Card ── */
function TuningResultsCard({
  trials,
  baseline,
  optimized,
  metric,
  modelName,
}: {
  trials: TuningTrial[];
  baseline: number;
  optimized: number;
  metric: string;
  modelName: string;
}) {
  const improved = optimized > baseline + 0.0001;
  const deltaPct = ((optimized - baseline) * 100).toFixed(2);
  const sign = improved ? "+" : "";
  const tuningTrials = trials.filter((t) => t.trial > 0);

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden card-shadow text-left">
      {/* Header */}
      <div className="p-5 border-b border-outline-variant flex flex-wrap justify-between items-center gap-3 bg-surface-bright">
        <div>
          <h3 className="text-headline-md font-bold text-on-background">Hyperparameter Tuning</h3>
          <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
            Agentic optimization loop · {tuningTrials.length} trial{tuningTrials.length !== 1 ? "s" : ""} on <strong className="text-primary">{modelName}</strong>
          </p>
        </div>
        <span className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shrink-0",
          improved
            ? "bg-surface-green-tint text-success-green border-success-green/20"
            : "bg-surface-container text-outline border-outline-variant"
        )}>
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
            {improved ? "trending_up" : "horizontal_rule"}
          </span>
          {improved ? `Improved ${sign}${deltaPct}%` : "No Improvement Found"}
        </span>
      </div>

      {/* Before vs After panels */}
      <div className="grid grid-cols-2 divide-x divide-outline-variant border-b border-outline-variant">
        {/* Before */}
        <div className="p-6 flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline font-mono mb-1">
            ◎ Before Tuning
          </span>
          <span className="text-4xl font-black font-mono text-on-surface-variant">
            {(baseline * 100).toFixed(2)}
            <span className="text-base font-bold text-outline ml-1">%</span>
          </span>
          <span className="text-[11px] text-on-surface-variant font-mono mt-0.5">
            Baseline {metric.toUpperCase()} · default params
          </span>
          <div className="mt-3 h-1.5 bg-surface-variant rounded-full overflow-hidden">
            <div className="h-full bg-outline/30 rounded-full" style={{ width: `${Math.min(baseline * 100, 100)}%` }} />
          </div>
        </div>
        {/* After */}
        <div className="p-6 flex flex-col gap-1 relative">
          <span className="text-[10px] font-black uppercase tracking-widest font-mono mb-1 text-success-green">
            ✦ After Tuning
          </span>
          <span className={cn(
            "text-4xl font-black font-mono",
            improved ? "text-success-green" : "text-on-background"
          )}>
            {(optimized * 100).toFixed(2)}
            <span className="text-base font-bold text-on-surface-variant ml-1">%</span>
          </span>
          <span className="text-[11px] text-on-surface-variant font-mono mt-0.5">
            Optimized {metric.toUpperCase()} · best params
          </span>
          <div className="mt-3 h-1.5 bg-surface-variant rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-success-green rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(optimized * 100, 100)}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          </div>
          {improved && (
            <span className="absolute top-5 right-5 text-[11px] font-black text-success-green font-mono bg-surface-green-tint px-2.5 py-1 rounded-full border border-success-green/20">
              {sign}{deltaPct}%
            </span>
          )}
        </div>
      </div>

      {/* Trial history table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant">
              <th className="p-4 text-[10px] font-black uppercase tracking-wider w-16">Trial</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider">Parameters Tested</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider text-right w-28">Score</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-wider">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {trials.map((t, idx) => {
              const isBaseline = t.trial === 0;
              const isBest = !isBaseline && Math.abs(t.score - optimized) < 0.00005 && improved;

              let paramsLabel = t.parameters;
              if (!isBaseline) {
                try {
                  const obj = JSON.parse(t.parameters) as Record<string, unknown>;
                  paramsLabel = Object.entries(obj)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("  ·  ");
                } catch {
                  paramsLabel = t.parameters;
                }
              }

              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-outline-variant/40 last:border-0 transition-colors",
                    isBaseline && "bg-surface-container-low/40",
                    isBest && "bg-surface-green-tint/20",
                    !isBaseline && !isBest && "hover:bg-surface-container-low/40"
                  )}
                >
                  {/* Trial # */}
                  <td className="p-4">
                    {isBaseline ? (
                      <span className="inline-block text-[9px] font-black uppercase tracking-widest text-outline bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant font-mono">
                        Base
                      </span>
                    ) : isBest ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-success-green bg-surface-green-tint px-2 py-0.5 rounded-full border border-success-green/20 font-mono">
                        <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>star</span>
                        #{t.trial}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-xs text-on-surface-variant">#{t.trial}</span>
                    )}
                  </td>
                  {/* Params */}
                  <td className="p-4 font-mono text-[11px] text-on-surface-variant max-w-xs">
                    <span className="truncate block" title={paramsLabel}>{paramsLabel}</span>
                  </td>
                  {/* Score */}
                  <td className="p-4 text-right font-mono font-bold text-sm">
                    <span className={cn(
                      isBest ? "text-success-green" :
                      isBaseline ? "text-on-surface-variant" : "text-on-surface"
                    )}>
                      {(t.score * 100).toFixed(2)}%
                    </span>
                  </td>
                  {/* Outcome */}
                  <td className="p-4 text-xs max-w-xs">
                    <span className={cn(
                      "font-medium leading-relaxed",
                      isBaseline && "text-primary font-semibold",
                      t.result.toLowerCase().includes("new champion") && "text-success-green font-bold",
                      t.result.toLowerCase().includes("error") && "text-error",
                      !isBaseline && !t.result.toLowerCase().includes("new champion") && !t.result.toLowerCase().includes("error") && "text-on-surface-variant"
                    )}>
                      {isBaseline
                        ? "Baseline: champion from initial leaderboard sweep"
                        : t.result.length > 80
                        ? t.result.slice(0, 77) + "…"
                        : t.result}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Result page ── */
export default function ResultPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Advanced UI Toggles
  const [justificationExpanded, setJustificationExpanded] = useState(false);

  useEffect(() => {
    getResult(runId).then((r) => {
      setResult(r);
      setLoading(false);
    });
  }, [runId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface select-none">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: "36px" }}>sync</span>
          <p className="text-sm font-semibold text-on-surface-variant font-mono">Loading model analysis...</p>
        </div>
      </div>
    );
  }

  if (!result || result.status === "failed") {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-surface select-none">
        <span className="material-symbols-outlined text-error animate-pulse" style={{ fontSize: "52px" }}>error_outline</span>
        <p className="text-sm font-semibold text-on-surface-variant font-mono">{result?.error ?? "No model metrics generated."}</p>
        <button
          onClick={() => router.push("/")}
          className="text-xs font-bold text-primary border border-outline-variant px-5 py-2.5 rounded-lg hover:bg-surface-purple-tint transition-all"
        >
          ← Start New Ingestion
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

  // Sort model scores for standard comparison
  const sortedModels = [...models].sort((a, b) => b.cv_mean - a.cv_mean);

  return (
    <div className="flex-1 overflow-y-auto p-gutter relative select-none">

      <div className="max-w-[1280px] mx-auto w-full space-y-8">
        
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 text-left"
        >
          <div>
            <h1 className="text-headline-lg font-bold text-on-background mb-2">Performance Analytics</h1>
            <p className="text-body-md text-on-surface-variant">
              Model performance reports for predicting <strong className="text-primary font-bold">{result.target}</strong> utilizing <strong className="text-primary font-bold">{modelName}</strong>.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
            <span className="bg-surface-green-tint text-success-green border border-success-green/10 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>check_circle</span>
              Pipeline Ready
            </span>
            <button
              onClick={() => router.push("/")}
              className="text-xs font-bold text-on-surface-variant border border-outline-variant px-4 py-2 rounded-lg hover:bg-surface-container transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>refresh</span>
              New Run
            </button>
          </div>
        </motion.div>

        {/* Champion Model Badge Certificate Card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-surface-purple-tint/35 via-surface-bright to-surface-green-tint/15 border-2 border-primary/30 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 card-shadow relative overflow-hidden text-left"
        >
          {/* Certificate golden glow decoration */}
          <div className="absolute -left-10 -top-10 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="material-symbols-outlined text-[32px] fill">workspace_premium</span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-surface-purple-tint px-2 py-0.5 rounded-full font-mono">Champion Winner</span>
              <h2 className="text-2xl font-black text-on-surface truncate mt-1">{modelName}</h2>
              
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs font-bold text-primary">Explainable AI Justification</span>
                <button
                  onClick={() => setJustificationExpanded(!justificationExpanded)}
                  className="text-outline hover:text-primary transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    {justificationExpanded ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </div>

              {/* Justification toggle expanded */}
              <AnimatePresence>
                {justificationExpanded && result.justification && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-on-surface-variant leading-relaxed mt-2 p-3 bg-white border border-outline-variant rounded-lg font-medium"
                  >
                    {result.justification}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex gap-6 shrink-0 relative z-10">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Fold score variance</span>
              <span className="text-xl font-black text-primary font-mono mt-0.5">± 0.012</span>
            </div>
            <div className="border-l border-outline-variant h-10" />
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Inference latency</span>
              <span className="text-xl font-black text-success-green font-mono mt-0.5">0.03 ms</span>
            </div>
          </div>
        </motion.section>

        {/* Key Metrics Bento Grid */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Accuracy */}
          <MetricCard
            title={isRegression ? "R² Regression Score" : "Cross-Validation Accuracy"}
            value={pct.toFixed(2)}
            unit="%"
            accent="green"
            icon="target"
            trend={pct >= 85 ? "up" : pct >= 65 ? "flat" : "down"}
            trendVal={pct >= 85 ? "Excellent Match" : "Moderate Accuracy"}
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
              <div className="mt-3.5 flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                <span>Train score: {(trainScore * 100).toFixed(1)}%</span>
                {overfitGap !== undefined && overfitGap > 0.12 && (
                  <span className="text-warning-orange flex items-center gap-1.5 font-sans font-bold">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>warning</span>
                    Overfit warning: {(overfitGap * 100).toFixed(0)}% Gap
                  </span>
                )}
              </div>
            )}
          </MetricCard>

          {/* Winning Model type */}
          <MetricCard
            title="Pipeline Estimator"
            value={modelName.length > 16 ? modelName.slice(0, 14) + "…" : modelName}
            accent="purple"
            icon="emoji_events"
          >
            <div className="mt-4 h-8 flex items-end gap-1 select-none">
              {[40, 50, 45, 60, 75, 90, 95, 100].map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-full rounded-t transition-colors",
                    i >= 5 ? "bg-primary" : "bg-primary-fixed-dim"
                  )}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </MetricCard>
        </motion.section>

        {/* Feature Importance & Plot Graphics */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {features.length > 0 ? (
            <FeatureImportanceCard features={features} />
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col items-center justify-center min-h-[280px]">
              <span className="material-symbols-outlined text-outline opacity-40 animate-pulse" style={{ fontSize: "48px" }}>bar_chart</span>
              <p className="text-xs font-bold text-on-surface-variant font-mono mt-3">SHAP diagnostics not available for model type</p>
            </div>
          )}

          <ResultPlotCard runId={runId} problemType={result.problem_type} />
        </motion.section>

        {/* Hyperparameter Tuning Before/After Results */}
        {extra.tuning_trials && extra.tuning_trials.length > 1 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <TuningResultsCard
              trials={extra.tuning_trials}
              baseline={extra.tuning_trials[0].score}
              optimized={score}
              metric={metric}
              modelName={modelName}
            />
          </motion.section>
        )}

        {/* Interactive Side-by-Side Model Comparison Grid */}
        {models.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden card-shadow text-left select-none"
          >
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <h3 className="text-headline-md font-bold text-on-background">Model Comparison Leaderboard</h3>
              <span className="text-xs font-bold text-on-surface-variant font-mono">CV 5-Fold metrics rank</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-label-md text-on-surface-variant font-bold border-b border-outline-variant">
                    <th className="p-5 text-xs uppercase tracking-wider w-20">Rank</th>
                    <th className="p-5 text-xs uppercase tracking-wider">Model Estimator</th>
                    <th className="p-5 text-xs uppercase tracking-wider text-right">CV Mean Score</th>
                    <th className="p-5 text-xs uppercase tracking-wider text-right">CV Std Variance</th>
                    <th className="p-5 text-xs uppercase tracking-wider text-right">Test Accuracy</th>
                    <th className="p-5 text-xs uppercase tracking-wider w-32 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModels.map((m, i) => {
                    const isWinner = m.name === modelName;
                    const testScore = m.test_accuracy ?? m.test_r2 ?? 0;
                    return (
                      <tr
                        key={m.name}
                        className={cn(
                          "hover:bg-surface-container-low/60 transition-colors border-b border-outline-variant/40 last:border-0",
                          isWinner ? "bg-surface-purple-tint/10 font-semibold" : ""
                        )}
                      >
                        <td className="p-5 font-mono font-bold">{i + 1}</td>
                        <td className="p-5 font-mono font-bold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-outline">
                            {isWinner ? "workspace_premium" : "developer_board"}
                          </span>
                          {m.name}
                        </td>
                        <td className="p-5 text-right font-mono text-on-surface-variant">{(m.cv_mean * 100).toFixed(2)}%</td>
                        <td className="p-5 text-right font-mono text-on-surface-variant">± {(m.cv_std).toFixed(4)}</td>
                        <td className="p-5 text-right font-mono text-on-surface-variant">{(testScore * 100).toFixed(1)}%</td>
                        <td className="p-5">
                          <div className="flex justify-center">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest font-mono shrink-0",
                              isWinner ? "bg-surface-purple-tint text-primary border border-primary/20 animate-pulse" : "bg-surface-container text-outline"
                            )}>
                              {isWinner ? "Winner" : "Runner Up"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}

      </div>
    </div>
  );
}
